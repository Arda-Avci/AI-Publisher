import os, gc, torch, subprocess, sys
import numpy as np
from flask import Flask, request, jsonify, send_file

if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")

app = Flask(__name__)
MODEL = None
MODEL_DIR = "/app/geneface"

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_model():
    global MODEL
    if MODEL is not None:
        return MODEL
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"[GeneFace++] Loading model (VRAM: {vram_gb:.2f} GB)")

    if not os.path.exists(MODEL_DIR):
        print("[GeneFace++] GeneFace++ repo not found, attempting clone...")
        subprocess.run(
            ["git", "clone", "--depth", "1", "https://github.com/yerfor/GeneFacePlusPlus.git", MODEL_DIR],
            check=True, capture_output=True
        )
    sys.path.insert(0, MODEL_DIR)

    from utils.commons import run_model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    audio2motion = torch.jit.load(os.path.join(MODEL_DIR, "checkpoints", "audio2motion.pt"))
    motion2video = torch.jit.load(os.path.join(MODEL_DIR, "checkpoints", "motion2video.pt"))
    if device == "cuda":
        audio2motion = audio2motion.cuda()
        motion2video = motion2video.cuda()
    MODEL = {"audio2motion": audio2motion, "motion2video": motion2video, "device": device}
    print("[GeneFace++] Model ready.")
    return MODEL

@app.route("/preload", methods=["POST"])
def preload():
    try:
        get_model()
        return jsonify({"status": "success", "message": "GeneFace++ loaded"}), 200
    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    face_path = data.get("face_image_path", "")
    audio_path = data.get("audio_path", "")
    output_path = data.get("output_path", "/workspace/outputs/output.mp4")

    if not face_path or not audio_path:
        return jsonify({"error": "face_image_path and audio_path required"}), 400
    if not os.path.exists(face_path):
        return jsonify({"error": f"face_image not found: {face_path}"}), 404
    if not os.path.exists(audio_path):
        return jsonify({"error": f"audio not found: {audio_path}"}), 404

    try:
        model = get_model()
        from utils.commons import run_model
        result = run_model(
            audio2motion=model["audio2motion"],
            motion2video=model["motion2video"],
            source_image=face_path,
            audio_path=audio_path,
            output_path=output_path,
            device=model["device"]
        )
        flush_memory()
        if os.path.exists(output_path):
            return send_file(output_path, mimetype="video/mp4")
        return jsonify({"error": "Output not generated"}), 500
    except torch.cuda.OutOfMemoryError as exc:
        flush_memory()
        return jsonify({"status": "error", "message": "GPU OOM", "error": str(exc)}), 500
    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    status = "healthy" if MODEL is not None else "starting"
    return jsonify({"status": status, "model": "geneface"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

