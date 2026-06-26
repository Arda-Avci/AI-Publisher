import os, gc, torch, subprocess, sys
import numpy as np
from flask import Flask, request, jsonify, send_file

app = Flask(__name__)

MODEL = None
MODEL_DIR = "/app/sadtalker"
CHECKPOINT_DIR = "/app/checkpoints"

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
    print(f"[SadTalker] Loading model (VRAM: {vram_gb:.2f} GB)")

    if not os.path.exists(MODEL_DIR):
        print("[SadTalker] Cloning SadTalker repo...")
        subprocess.run(
            ["git", "clone", "https://github.com/OpenTalker/SadTalker.git", MODEL_DIR],
            check=True, capture_output=True
        )
    sys.path.insert(0, MODEL_DIR)

    if not os.path.exists(CHECKPOINT_DIR) or not os.listdir(CHECKPOINT_DIR):
        print("[SadTalker] Checkpoints not found. Downloading checkpoints from Hugging Face Space...")
        os.makedirs(CHECKPOINT_DIR, exist_ok=True)
        try:
            from huggingface_hub import snapshot_download
            snapshot_download(
                repo_id="vinthony/SadTalker",
                repo_type="space",
                allow_patterns=["checkpoints/**/*"],
                local_dir="/app"
            )
            print("[SadTalker] Checkpoints download complete.")
            # Ensure mapping files are correctly extracted or linked if needed
            for filename in os.listdir(CHECKPOINT_DIR):
                if "mapping_00229" in filename and filename.endswith(".tar"):
                    src_file = os.path.join(CHECKPOINT_DIR, filename)
                    dst_file = os.path.join(CHECKPOINT_DIR, "mapping_00229.pth")
                    if not os.path.exists(dst_file):
                        try:
                            import tarfile
                            with tarfile.open(src_file) as tar:
                                tar.extractall(path=CHECKPOINT_DIR)
                        except Exception:
                            try:
                                os.symlink(src_file, dst_file)
                            except Exception:
                                pass
                if "mapping_00109" in filename and filename.endswith(".tar"):
                    src_file = os.path.join(CHECKPOINT_DIR, filename)
                    dst_file = os.path.join(CHECKPOINT_DIR, "mapping_00109.pth")
                    if not os.path.exists(dst_file):
                        try:
                            import tarfile
                            with tarfile.open(src_file) as tar:
                                tar.extractall(path=CHECKPOINT_DIR)
                        except Exception:
                            try:
                                os.symlink(src_file, dst_file)
                            except Exception:
                                pass
        except Exception as e:
            print(f"[SadTalker - ERROR] Failed to download checkpoints: {e}")

    from src.test_audio2coeff import Audio2Coeff
    from src.facerender.animate import AnimateFromCoeff
    from src.generate_batch import get_data
    from src.utils.init_path import init_path
    from src.generate_facerender_batch import get_facerender

    sadtalker_paths = init_path("checkpoints", CHECKPOINT_DIR, "config", MODEL_DIR, None)
    audio2coeff = Audio2Coeff(sadtalker_paths["audio2coeff"])
    animate = AnimateFromCoeff(sadtalker_paths["free_view_checkpoint"])
    MODEL = {"audio2coeff": audio2coeff, "animate": animate, "paths": sadtalker_paths}
    print("[SadTalker] Model ready.")
    return MODEL

@app.route("/preload", methods=["POST"])
def preload():
    try:
        get_model()
        return jsonify({"status": "success", "message": "SadTalker model loaded"}), 200
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
        from src.generate_batch import get_data
        from src.generate_facerender_batch import get_facerender

        batch = get_data(face_path, audio_path, model["paths"])
        result = get_facerender(model["animate"], batch["coeff"], output_path)
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
    return jsonify({"status": status, "model": "sadtalker"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

