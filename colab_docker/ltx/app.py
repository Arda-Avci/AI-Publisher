import os
import sys
sys.setrecursionlimit(10000)
import gc
import torch
import torch.nn.functional as F
_orig_sdpa = F.scaled_dot_product_attention
def _patched_sdpa(query, key, value, attn_mask=None, dropout_p=0.0, is_causal=False, scale=None, **kwargs):
    kwargs.pop('enable_gqa', None)
    if query.ndim == 4 and query.size(1) != key.size(1):
        r = query.size(1) // key.size(1)
        key = key.repeat_interleave(r, dim=1)
        value = value.repeat_interleave(r, dim=1)
    return _orig_sdpa(query, key, value, attn_mask=attn_mask, dropout_p=dropout_p, is_causal=is_causal, scale=scale, **kwargs)
F.scaled_dot_product_attention = _patched_sdpa

import torch.nn as nn
if not hasattr(nn, "RMSNorm"):
    class RMSNorm(nn.Module):
        def __init__(self, normalized_shape, eps=1e-5, elementwise_affine=True, device=None, dtype=None):
            super().__init__()
            if isinstance(normalized_shape, int):
                normalized_shape = (normalized_shape,)
            self.normalized_shape = tuple(normalized_shape)
            self.eps = eps
            self.elementwise_affine = elementwise_affine
            if self.elementwise_affine:
                self.weight = nn.Parameter(torch.ones(self.normalized_shape, device=device, dtype=dtype))
            else:
                self.register_parameter("weight", None)

        def forward(self, x):
            dims = tuple(range(-len(self.normalized_shape), 0))
            variance = x.pow(2).mean(dims, keepdim=True)
            x_normed = x * torch.rsqrt(variance + self.eps)
            if self.elementwise_affine:
                return self.weight * x_normed
            return x_normed
            
    nn.RMSNorm = RMSNorm



import numpy as np
from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

current_model_type = None
current_pipe = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_pipeline(is_i2v):
    global current_model_type, current_pipe
    model_type = "i2v" if is_i2v else "t2v"
    
    if current_model_type == model_type and current_pipe is not None:
        return current_pipe
        
    if current_pipe is not None:
        del current_pipe
        flush_memory()
        
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"[CONTAINER - LTX] Loading LTX-Video {model_type} (VRAM: {vram_gb:.2f} GB)")
    
    if is_i2v:
        from diffusers import LTXImageToVideoPipeline
        pipe = LTXImageToVideoPipeline.from_pretrained(
            "Lightricks/LTX-Video", 
            torch_dtype=torch.bfloat16
        )
    else:
        from diffusers import LTXPipeline
        pipe = LTXPipeline.from_pretrained(
            "Lightricks/LTX-Video", 
            torch_dtype=torch.bfloat16
        )

    if vram_gb >= 18.0:
        pipe.to("cuda")
    else:
        pipe.enable_model_cpu_offload()
        
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()
        
    current_model_type = model_type
    current_pipe = pipe
    return pipe

def frames_to_mp4(frames, path, fps=8):
    frame_arr = []
    for f in frames:
        f_np = np.array(f)
        if f_np.dtype in [np.float16, np.float32, np.float64]:
            if f_np.max() <= 1.0:
                f_np = (np.clip(f_np, 0.0, 1.0) * 255).astype(np.uint8)
            else:
                f_np = f_np.astype(np.uint8)
        elif f_np.dtype != np.uint8:
            f_np = f_np.astype(np.uint8)
        frame_arr.append(f_np)
    frames_arr = np.stack(frame_arr)
    h, w = frames_arr.shape[1:3]
    cmd = [
        '/usr/bin/ffmpeg', '-y',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', f'{w}x{h}',
        '-pix_fmt', 'rgb24',
        '-r', str(fps),
        '-i', '-',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'medium',
        '-crf', '18',
        '-movflags', '+faststart',
        path
    ]
    proc = subprocess.run(cmd, input=frames_arr.tobytes(), capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f'FFmpeg encoding failed: {proc.stderr.decode(errors="replace")}')

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    image_path = data.get("image_path", "")
    output_path = data.get("output_path", "/workspace/outputs/raw_video.mp4")
    
    is_i2v = bool(image_path and os.path.exists(image_path))
    
    try:
        pipe = get_pipeline(is_i2v)
        
        with torch.inference_mode():
            if is_i2v:
                from diffusers.utils import load_image
                init_image = load_image(image_path)
                output = pipe(
                    image=init_image, 
                    prompt=prompt, 
                    num_frames=65, 
                    num_inference_steps=25
                )
            else:
                output = pipe(
                    prompt=prompt, 
                    num_frames=65, 
                    num_inference_steps=25
                )
            frames = output.frames[0]
            
        frames_to_mp4(frames, output_path, fps=8)
        return jsonify({"status": "success", "output_path": output_path}), 200
        
    except torch.cuda.OutOfMemoryError as exc:
        flush_memory()
        return jsonify({"status": "error", "message": "GPU Out Of Memory", "error": str(exc)}), 500
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print("[CONTAINER - LTX] Exception during generate:")
        print(tb)
        flush_memory()
        return jsonify({"status": "error", "message": str(e), "traceback": tb}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route("/preload", methods=["POST"])
def preload():
    """Pre-load model into VRAM to avoid cold start latency."""
    try:
        pipe = get_pipeline(is_i2v=False)
        flush_memory()
        return jsonify({"status": "ok", "model_loaded": pipe is not None})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


