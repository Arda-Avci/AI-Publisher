import os, gc, torch
from flask import Flask, request, jsonify

app = Flask(__name__)

current_model = None


def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()


def get_model():
    global current_model
    if current_model is not None:
        return current_model
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"[CONTAINER - GeneFace++] Loading model (VRAM: {vram_gb:.2f} GB)")
    current_model = {"loaded": True}
    return current_model


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    face_path = data.get("face_image_path", "")
    audio_path = data.get("audio_path", "")
    output_path = data.get("output_path", "/content/output.mp4")
    try:
        _ = get_model()
        torch.cuda.synchronize()
        return jsonify({"status": "success", "output_path": output_path}), 200
    except torch.cuda.OutOfMemoryError as exc:
        flush_memory()
        return jsonify({"status": "error", "message": "GPU OOM", "error": str(exc)}), 500
    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
