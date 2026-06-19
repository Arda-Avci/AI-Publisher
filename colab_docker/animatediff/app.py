import os
import gc
import torch
import numpy as np
from flask import Flask, request, jsonify
from PIL import Image

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
    print(f"[CONTAINER - AnimateDiff] Loading AnimateDiff (VRAM: {vram_gb:.2f} GB)")

    from diffusers import AnimateDiffPipeline, MotionAdapter, DDIMScheduler
    from diffusers.utils import export_to_gif

    adapter = MotionAdapter.from_pretrained(
        "guoyww/animatediff-motion-adapter-v1-5-2",
        torch_dtype=torch.float16
    )

    pipe = AnimateDiffPipeline.from_pretrained(
        "frankjoshua/toonyou_beta6",
        motion_adapter=adapter,
        torch_dtype=torch.float16,
    )
    pipe.scheduler = DDIMScheduler.from_pretrained(
        "frankjoshua/toonyou_beta6",
        subfolder="scheduler",
        clip_sample=False,
        timestep_spacing="linspace",
        beta_schedule="linear",
        steps_offset=1,
    )

    if vram_gb >= 18.0:
        pipe.to("cuda")
    else:
        pipe.enable_model_cpu_offload()

    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()
    if hasattr(pipe, "enable_vae_slicing"):
        pipe.enable_vae_slicing()

    current_pipe = pipe
    return pipe

def frames_to_mp4(frames, path, fps=8):
    from diffusers.utils import export_to_video
    export_to_video(frames, path, fps=fps)

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    negative_prompt = data.get("negative_prompt", "bad quality, distorted, ugly, deformed, blurry")
    image_path = data.get("image_path", "")
    output_path = data.get("output_path", "/content/raw_video.mp4")
    num_frames = int(data.get("num_frames", 16))
    num_inference_steps = int(data.get("num_inference_steps", 25))
    guidance_scale = float(data.get("guidance_scale", 7.5))
    fps = int(data.get("fps", 8))
    width = int(data.get("width", 512))
    height = int(data.get("height", 512))

    try:
        pipe = get_pipeline()

        generator = torch.manual_seed(42)

        with torch.inference_mode():
            output = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                num_frames=num_frames,
                guidance_scale=guidance_scale,
                num_inference_steps=num_inference_steps,
                width=width,
                height=height,
                generator=generator,
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
