import os
import gc
import sys
import torch
import numpy as np
from flask import Flask, request, jsonify
from PIL import Image

# Monkey-patch for transformers v5+ compatibility
import importlib.metadata
_orig_metadata_version = importlib.metadata.version
def _patched_metadata_version(distribution_name):
    if distribution_name.lower() == "torch":
        return "2.4.0"
    return _orig_metadata_version(distribution_name)
importlib.metadata.version = _patched_metadata_version

import builtins
torch.__version__ = "2.4.0"
if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")

import torch.nn as nn
if not hasattr(nn, "RMSNorm"):
    class RMSNorm(nn.Module):
        def __init__(self, normalized_shape, eps=1e-8, elementwise_affine=True, device=None, dtype=None):
            super().__init__()
            self.eps = eps
            dim = normalized_shape if isinstance(normalized_shape, int) else normalized_shape[-1]
            if elementwise_affine:
                self.weight = nn.Parameter(torch.ones(dim, device=device, dtype=dtype))
            else:
                self.register_parameter('weight', None)
        def forward(self, x):
            variance = x.pow(2).mean(-1, keepdim=True)
            return x * torch.rsqrt(variance + self.eps) * (self.weight if self.weight is not None else 1.0)
    nn.RMSNorm = RMSNorm

import torch.nn.functional as F
_orig_sdpa = F.scaled_dot_product_attention
def _patched_sdpa(*args, **kwargs):
    if "enable_gqa" in kwargs:
        del kwargs["enable_gqa"]
    return _orig_sdpa(*args, **kwargs)
F.scaled_dot_product_attention = _patched_sdpa

builtins.nn = nn
builtins.torch = torch

import torch.compiler
if not hasattr(torch.compiler, "is_compiling"):
    torch.compiler.is_compiling = lambda: False
if not hasattr(torch.compiler, "is_dynamo_compiling"):
    torch.compiler.is_dynamo_compiling = lambda: False

import torch.amp
if not hasattr(torch.amp, "GradScaler"):
    try:
        from torch.cuda.amp import GradScaler
        torch.amp.GradScaler = GradScaler
    except ImportError:
        pass

app = Flask(__name__)

current_pipe = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_pipeline():
    global current_pipe
    if current_pipe is not None:
        return current_pipe
        
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"[CONTAINER - SVD] Loading Stable Video Diffusion XT (VRAM: {vram_gb:.2f} GB)")
    
    from diffusers import StableVideoDiffusionPipeline
    pipe = StableVideoDiffusionPipeline.from_pretrained(
        "stabilityai/stable-video-diffusion-img2vid-xt",
        torch_dtype=torch.float16,
        variant="fp16"
    )
    
    if vram_gb >= 18.0:
        pipe.to("cuda")
    else:
        pipe.enable_model_cpu_offload()
        
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()
        
    current_pipe = pipe
    return pipe

def frames_to_mp4(frames, path, fps=7):
    from diffusers.utils import export_to_video
    export_to_video(frames, path, fps=fps)

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    image_path = data.get("image_path", "")
    output_path = data.get("output_path", "/workspace/outputs/raw_video.mp4")
    num_frames = int(data.get("num_frames", 25))
    num_inference_steps = int(data.get("num_inference_steps", 25))
    fps = int(data.get("fps", 7))
    
    try:
        pipe = get_pipeline()
        
        # Load and prepare image
        if image_path and os.path.exists(image_path):
            print(f"[CONTAINER - SVD] Loading input image: {image_path}")
            init_image = Image.open(image_path).convert("RGB")
        else:
            print("[CONTAINER - SVD] No input image or file not found. Creating a dummy black image.")
            # 1024x576 black image as fallback
            init_image = Image.new("RGB", (1024, 576), color="black")
            
        init_image = init_image.resize((1024, 576))
        
        with torch.inference_mode():
            generator = torch.manual_seed(42)
            output = pipe(
                init_image,
                num_frames=num_frames,
                num_inference_steps=num_inference_steps,
                decode_chunk_size=8,
                generator=generator
            )
            frames = output.frames[0]
            
        frames_to_mp4(frames, output_path, fps=fps)
        return jsonify({"status": "success", "output_path": output_path}), 200
        
    except torch.cuda.OutOfMemoryError as exc:
        flush_memory()
        return jsonify({"status": "error", "message": "GPU Out Of Memory", "error": str(exc)}), 500
    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route("/preload", methods=["POST"])
def preload():
    """Pre-load model into VRAM to avoid cold start latency."""
    try:
        pipe = get_pipeline()
        flush_memory()
        return jsonify({"status": "ok", "model_loaded": pipe is not None})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


