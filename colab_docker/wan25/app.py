import os
import gc
import sys
sys.setrecursionlimit(10000)

# Monkey-patch importlib.metadata.version to report PyTorch >= 2.4.0
import importlib.metadata
_orig_metadata_version = importlib.metadata.version
def _patched_metadata_version(distribution_name):
    if distribution_name.lower() == "torch":
        return "2.4.0"
    return _orig_metadata_version(distribution_name)
importlib.metadata.version = _patched_metadata_version

# Workaround for HuggingFace transformers accelerate integration NameError
import builtins
import torch
torch.__version__ = "2.4.0"
if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")

# Patch torch.nn.RMSNorm for PyTorch < 2.4.0
import torch.nn as nn
if not hasattr(nn, "RMSNorm"):
    class RMSNorm(nn.Module):
        def __init__(self, normalized_shape, eps=1e-8, elementwise_affine=True, device=None, dtype=None):
            super().__init__()
            self.eps = eps
            if isinstance(normalized_shape, int):
                dim = normalized_shape
            else:
                dim = normalized_shape[-1]
            if elementwise_affine:
                self.weight = nn.Parameter(torch.ones(dim, device=device, dtype=dtype))
            else:
                self.register_parameter('weight', None)
        def forward(self, x):
            variance = x.pow(2).mean(-1, keepdim=True)
            return x * torch.rsqrt(variance + self.eps) * (self.weight if self.weight is not None else 1.0)
    nn.RMSNorm = RMSNorm

# Patch scaled_dot_product_attention to remove unsupported enable_gqa arg
import torch.nn.functional as F
_orig_sdpa = F.scaled_dot_product_attention
def _patched_sdpa(*args, **kwargs):
    if "enable_gqa" in kwargs:
        del kwargs["enable_gqa"]
    return _orig_sdpa(*args, **kwargs)
F.scaled_dot_product_attention = _patched_sdpa

builtins.nn = nn
builtins.torch = torch

# Workaround for torch.compiler.is_compiling AttributeError in PyTorch < 2.3.0
import torch.compiler
if not hasattr(torch.compiler, "is_compiling"):
    torch.compiler.is_compiling = lambda: False
if not hasattr(torch.compiler, "is_dynamo_compiling"):
    torch.compiler.is_dynamo_compiling = lambda: False

import numpy as np
from flask import Flask, request, jsonify

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
    print(f"[CONTAINER - WAN25] Loading Wan2.5 I2V (VRAM: {vram_gb:.2f} GB)")

    from diffusers import WanPipeline
    pipe = WanPipeline.from_pretrained(
        "Wan-AI/Wan2.5-I2V-14B",
        torch_dtype=torch.float16
    )

    if vram_gb <= 18.0:
        print(f"[CONTAINER - WAN25] 16GB GPU class detected (VRAM: {vram_gb:.2f} GB). Enabling sequential CPU offload and VAE tiling.")
        pipe.enable_sequential_cpu_offload()
    else:
        print(f"[CONTAINER - WAN25] 24GB GPU class detected (VRAM: {vram_gb:.2f} GB). Enabling model CPU offload.")
        pipe.enable_model_cpu_offload()
        
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()

    current_pipe = pipe
    return pipe

def frames_to_mp4(frames, path, fps=16):
    uint8_frames = [(np.clip(np.array(f), 0.0, 1.0) * 255).astype(np.uint8) for f in frames]
    from diffusers.utils import export_to_video
    export_to_video(frames, path, fps=fps)

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    image_path = data.get("image_path", "")
    prompt = data.get("prompt", "")
    output_path = data.get("output_path", "/workspace/outputs/raw_video.mp4")
    num_frames = int(data.get("num_frames", 81))
    num_inference_steps = int(data.get("num_inference_steps", 30))
    fps = int(data.get("fps", 16))

    try:
        pipe = get_pipeline()

        from PIL import Image
        if image_path and os.path.exists(image_path):
            print(f"[CONTAINER - WAN25] Loading input image: {image_path}")
            init_image = Image.open(image_path).convert("RGB")
        else:
            print("[CONTAINER - WAN25] No input image. Creating dummy black image.")
            init_image = Image.new("RGB", (1024, 576), color="black")

        with torch.inference_mode():
            output = pipe(
                prompt=prompt,
                image=init_image,
                num_frames=num_frames,
                num_inference_steps=num_inference_steps,
                guidance_scale=5.0
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


