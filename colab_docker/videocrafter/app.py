"""
VideoCrafter Flask wrapper for AI-Publisher.
Supports Text-to-Video and Image-to-Video generation via VideoCrafter2 / Text2Video-1024.

Endpoints:
  POST /generate          T2V: { prompt, num_frames?, fps?, width?, height? }
  POST /generate-i2v       I2V: { image_path, prompt, num_frames?, fps? }
  GET  /health
"""
import os, gc, sys, subprocess, torch, time

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

from flask import Flask, request, jsonify, send_file

app = Flask(__name__)

MODEL = None
MODEL_DIR = "/app/videocrafter"
CHECKPOINT_DIR = "/app/checkpoints"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_videocrafter_model(model_name="VideoCrafter/VideoCrafter2", resolution="512"):
    """Load VideoCrafter model on demand."""
    global MODEL
    if MODEL is not None:
        return MODEL

    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"[VideoCrafter] Loading {model_name} (VRAM: {vram_gb:.1f} GB)")

    if not os.path.exists(MODEL_DIR):
        print("[VideoCrafter] ERROR: VideoCrafter repo not found at build time. Check Dockerfile.")
        raise FileNotFoundError(f"VideoCrafter repo not found: {MODEL_DIR}")

    # Build arguments for inference
    sys.path.insert(0, MODEL_DIR)
    from lvdm.datasets.utils import load_content
    from lvdm.models.diffusion import LatentVideoDiffusion
    from lvdm.models.pipeline import VideoPipeline

    # Load model
    model = LatentVideoDiffusion.from_pretrained(model_name)
    model.to(DEVICE)
    model.eval()

    pipeline = VideoPipeline(vdm=model)

    MODEL = {"pipeline": pipeline, "model_name": model_name}
    print(f"[VideoCrafter] Model '{model_name}' ready on {DEVICE}")
    return MODEL

def run_inference(pipeline, prompt, image_path=None, num_frames=16, fps=8, width=512, height=512):
    """Run VideoCrafter inference."""
    gen_kwargs = {
        "prompt": prompt,
        "num_frames": num_frames,
        "fps": fps,
        "height": height,
        "width": width,
        "ddim_steps": 50,
        "guidance_scale": 7.5,
    }
    if image_path:
        gen_kwargs["cond_img"] = image_path

    with torch.no_grad():
        with torch.cuda.amp.autocast(enabled=DEVICE == "cuda"):
            if image_path:
                output = pipeline.generate_i2v(**gen_kwargs)
            else:
                output = pipeline.generate_t2v(**gen_kwargs)

    return output


@app.route("/health", methods=["GET"])
def health():
    status = "ready" if MODEL is not None else "loading"
    return jsonify({"status": status, "model": "videocrafter"}), 200


@app.route("/generate", methods=["POST"])
def generate():
    """Text-to-Video generation."""
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "").strip()
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    num_frames = int(data.get("num_frames", 16))
    fps = int(data.get("fps", 8))
    width = int(data.get("width", 512))
    height = int(data.get("height", 512))
    output_path = data.get("output_path", "/content/output_videocrafter.mp4")

    if num_frames > 32:
        return jsonify({"error": "num_frames max 32 for VideoCrafter"}), 400

    try:
        model_data = get_videocrafter_model()
        pipeline = model_data["pipeline"]

        print(f"[VideoCrafter] T2V: frames={num_frames}, fps={fps}, size={width}x{height}")
        frames = run_inference(
            pipeline, prompt,
            num_frames=num_frames, fps=fps, width=width, height=height
        )

        # Save as video via ffmpeg
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        tmp_npy = output_path.replace(".mp4", ".npy")
        import numpy as np
        np.save(tmp_npy, frames)

        ffmpeg_cmd = [
            "/usr/bin/ffmpeg", "-y", "-f", "rawvideo", "-vcodec", "rawvideo",
            "-pix_fmt", "rgb24", "-s", f"{width}x{height}",
            "-r", str(fps), "-i", tmp_npy,
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", output_path
        ]
        subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
        os.remove(tmp_npy)

        flush_memory()
        print(f"[VideoCrafter] Output: {output_path}")
        return send_file(output_path, mimetype="video/mp4")

    except torch.cuda.OutOfMemoryError:
        flush_memory()
        return jsonify({"error": "GPU OOM — reduce num_frames or resolution"}), 500
    except Exception as e:
        flush_memory()
        return jsonify({"error": str(e)}), 500


@app.route("/generate-i2v", methods=["POST"])
def generate_i2v():
    """Image-to-Video generation."""
    data = request.get_json(force=True) or {}
    image_path = data.get("image_path", "").strip()
    prompt = data.get("prompt", "").strip()
    if not image_path:
        return jsonify({"error": "image_path is required"}), 400
    if not os.path.exists(image_path):
        return jsonify({"error": f"image not found: {image_path}"}), 404

    num_frames = int(data.get("num_frames", 16))
    fps = int(data.get("fps", 8))
    output_path = data.get("output_path", "/content/output_videocrafter_i2v.mp4")

    if num_frames > 32:
        return jsonify({"error": "num_frames max 32 for VideoCrafter"}), 400

    try:
        model_data = get_videocrafter_model()
        pipeline = model_data["pipeline"]

        print(f"[VideoCrafter] I2V: frames={num_frames}, fps={fps}")
        frames = run_inference(
            pipeline, prompt, image_path=image_path,
            num_frames=num_frames, fps=fps
        )

        # Save via ffmpeg
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        import numpy as np
        tmp_npy = output_path.replace(".mp4", ".npy")
        np.save(tmp_npy, frames)
        h, w = frames.shape[2], frames.shape[3]

        subprocess.run([
            "/usr/bin/ffmpeg", "-y", "-f", "rawvideo", "-vcodec", "rawvideo",
            "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
            "-r", str(fps), "-i", tmp_npy,
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", output_path
        ], check=True, capture_output=True)
        os.remove(tmp_npy)

        flush_memory()
        return send_file(output_path, mimetype="video/mp4")

    except torch.cuda.OutOfMemoryError:
        flush_memory()
        return jsonify({"error": "GPU OOM — reduce num_frames"}), 500
    except Exception as e:
        flush_memory()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
