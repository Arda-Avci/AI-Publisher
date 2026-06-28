import os, gc, torch, subprocess
import numpy as np
from flask import Flask, request, jsonify, send_file
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
    print(f"[DynamiCrafter] Loading model (VRAM: {vram_gb:.2f} GB)")

    from diffusers import DynamiCrafterPipeline
    pipe = DynamiCrafterPipeline.from_pretrained(
        "DynamiCrafter/dynamicrafter_512_interp_512",
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
    w = w + (w % 2)
    h = h + (h % 2)
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
        raise RuntimeError(f'FFmpeg failed: {proc.stderr.decode(errors="replace")}')

@app.route("/preload", methods=["POST"])
def preload():
    try:
        get_pipeline()
        return jsonify({"status": "success", "message": "DynamiCrafter loaded"}), 200
    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    image_path = data.get("image_path", "")
    prompt = data.get("prompt", "")
    output_path = data.get("output_path", "/workspace/outputs/output.mp4")
    num_frames = int(data.get("num_frames", 16))
    steps = int(data.get("num_inference_steps", 25))
    fps = int(data.get("fps", 8))

    if not image_path or not prompt:
        return jsonify({"error": "image_path and prompt required"}), 400
    if not os.path.exists(image_path):
        return jsonify({"error": f"image not found: {image_path}"}), 404

    # Make sure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        pipe = get_pipeline()
        cond_image = Image.open(image_path).convert("RGB")
        with torch.inference_mode():
            output = pipe(
                prompt=prompt,
                image=cond_image,
                num_frames=num_frames,
                num_inference_steps=steps,
            )
            frames = output.frames[0]
        frames_to_mp4(frames, output_path, fps=fps)
        if os.path.exists(output_path):
            return send_file(output_path, mimetype="video/mp4")
        return jsonify({"status": "success", "output_path": output_path}), 200
    except torch.cuda.OutOfMemoryError as exc:
        flush_memory()
        return jsonify({"status": "error", "message": "GPU OOM", "error": str(exc)}), 500
    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    status = "healthy" if current_pipe is not None else "starting"
    return jsonify({"status": status, "model": "dynamicrafter"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

