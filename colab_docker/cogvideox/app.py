import os
import gc
import torch
import numpy as np
from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

current_model_name = None
current_pipe = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_pipeline(video_model, is_i2v):
    global current_model_name, current_pipe
    model_key = f"{video_model}_{'i2v' if is_i2v else 't2v'}"
    
    if current_model_name == model_key and current_pipe is not None:
        return current_pipe
        
    if current_pipe is not None:
        del current_pipe
        flush_memory()
        
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"[CONTAINER] Loading model {video_model} (VRAM: {vram_gb:.2f} GB)")
    
    if is_i2v:
        if "wan" in video_model.lower():
            from diffusers import WanPipeline
            pipe = WanPipeline.from_pretrained("Wan-AI/Wan2.1-I2V-14B-480P", torch_dtype=torch.bfloat16)
        elif "ltx" in video_model.lower():
            from diffusers import LTXImageToVideoPipeline
            pipe = LTXImageToVideoPipeline.from_pretrained("Lightricks/LTX-Video", torch_dtype=torch.bfloat16)
        elif "hunyuan" in video_model.lower():
            from diffusers import HunyuanVideoPipeline
            pipe = HunyuanVideoPipeline.from_pretrained("hunyuanvideo-community/HunyuanVideo", torch_dtype=torch.bfloat16)
        else:
            from diffusers import CogVideoXImageToVideoPipeline
            model_name = "THUDM/CogVideoX-2b-I2V" if "2b" in video_model.lower() else "THUDM/CogVideoX-5b-I2V"
            pipe = CogVideoXImageToVideoPipeline.from_pretrained(model_name, torch_dtype=torch.float16)
    else:
        if "wan" in video_model.lower():
            from diffusers import WanPipeline
            pipe = WanPipeline.from_pretrained("Wan-AI/Wan2.1-T2V-1.3B", torch_dtype=torch.bfloat16)
        elif "ltx" in video_model.lower():
            from diffusers import LTXPipeline
            pipe = LTXPipeline.from_pretrained("Lightricks/LTX-Video", torch_dtype=torch.bfloat16)
        elif "hunyuan" in video_model.lower():
            from diffusers import HunyuanVideoPipeline
            pipe = HunyuanVideoPipeline.from_pretrained("hunyuanvideo-community/HunyuanVideo", torch_dtype=torch.bfloat16)
        else:
            from diffusers import CogVideoXPipeline
            model_name = "THUDM/CogVideoX-2b" if "2b" in video_model.lower() else "THUDM/CogVideoX-5b"
            pipe = CogVideoXPipeline.from_pretrained(model_name, torch_dtype=torch.float16)

    if vram_gb >= 18.0:
        pipe.to("cuda")
    else:
        pipe.enable_model_cpu_offload()
        
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()
        
    current_model_name = model_key
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
        'ffmpeg', '-y',
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
    video_model = data.get("video_model", "CogVideoX-5b")
    output_path = data.get("output_path", "/workspace/outputs/raw_video.mp4")
    num_frames = int(data.get("num_frames", 49))
    num_inference_steps = int(data.get("num_inference_steps", 30))

    is_i2v = bool(image_path and os.path.exists(image_path))
    
    try:
        pipe = get_pipeline(video_model, is_i2v)
        
        with torch.inference_mode():
            if is_i2v:
                from diffusers.utils import load_image
                init_image = load_image(image_path)
                if "wan" in video_model.lower():
                    output = pipe(prompt=prompt, image=init_image, num_frames=81, num_inference_steps=30)
                elif "ltx" in video_model.lower():
                    output = pipe(image=init_image, prompt=prompt, num_frames=65, num_inference_steps=25)
                elif "hunyuan" in video_model.lower():
                    output = pipe(prompt=prompt, num_frames=65, num_inference_steps=25)
                else:
                    output = pipe(prompt=prompt, image=init_image, num_frames=num_frames, num_inference_steps=num_inference_steps)
            else:
                if "wan" in video_model.lower():
                    output = pipe(prompt=prompt, num_frames=81, num_inference_steps=30)
                elif "ltx" in video_model.lower():
                    output = pipe(prompt=prompt, num_frames=65, num_inference_steps=25)
                elif "hunyuan" in video_model.lower():
                    output = pipe(prompt=prompt, num_frames=65, num_inference_steps=25)
                else:
                    output = pipe(prompt=prompt, num_frames=num_frames, num_inference_steps=num_inference_steps)

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

@app.route("/preload", methods=["POST"])
def preload():
    """Pre-load model into VRAM to avoid cold start latency."""
    try:
        pipe = get_pipeline()
        vram_cleanup()
        return jsonify({"status": "ok", "model_loaded": pipe is not None})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


