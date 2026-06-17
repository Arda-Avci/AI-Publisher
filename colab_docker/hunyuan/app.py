import os
import gc
import torch
import numpy as np
from flask import Flask, request, jsonify
import imageio

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
    print(f"[CONTAINER - HUNYUAN] Loading HunyuanVideo (VRAM: {vram_gb:.2f} GB)")
    
    from diffusers import HunyuanVideoPipeline
    pipe = HunyuanVideoPipeline.from_pretrained(
        "hunyuanvideo-community/HunyuanVideo", 
        torch_dtype=torch.bfloat16
    )

    if vram_gb >= 18.0:
        pipe.to("cuda")
    else:
        pipe.enable_model_cpu_offload()
        
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()
        
    current_pipe = pipe
    return pipe

def frames_to_mp4(frames, path, fps=8):
    uint8_frames = [(np.clip(np.array(f), 0.0, 1.0) * 255).astype(np.uint8) for f in frames]
    imageio.mimwrite(path, uint8_frames, fps=fps, quality=8)

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    output_path = data.get("output_path", "/content/raw_video.mp4")
    
    try:
        pipe = get_pipeline()
        
        with torch.inference_mode():
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
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
