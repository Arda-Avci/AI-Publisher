import os
import gc
import torch
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

    if vram_gb >= 18.0:
        pipe.to("cuda")
    else:
        pipe.enable_model_cpu_offload()
        if vram_gb < 20.0:
            print("[CONTAINER - WAN25] VRAM < 20GB, enabling sequential CPU offload")
            pipe.enable_sequential_cpu_offload()

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
        vram_cleanup()
        return jsonify({"status": "ok", "model_loaded": pipe is not None})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


