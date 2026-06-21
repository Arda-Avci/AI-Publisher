import os
import gc
import torch
import numpy as np
from flask import Flask, request, jsonify
import imageio

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
    uint8_frames = [(np.clip(np.array(f), 0.0, 1.0) * 255).astype(np.uint8) for f in frames]
    imageio.mimwrite(path, uint8_frames, fps=fps, codec='libx264', pixelformat='yuv420p', output_params=['-movflags', '+faststart', '-preset', 'medium', '-crf', '18'])

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    image_path = data.get("image_path", "")
    output_path = data.get("output_path", "/content/raw_video.mp4")
    
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
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
