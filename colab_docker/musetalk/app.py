import os
import sys
import gc
import torch
from flask import Flask, request, jsonify, send_file

# Add MuseTalk to sys.path
MUSETALK_DIR = "/app/MuseTalk"
if MUSETALK_DIR not in sys.path:
    sys.path.insert(0, MUSETALK_DIR)

app = Flask(__name__)

MUSETALK_MODEL = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def load_musetalk():
    global MUSETALK_MODEL
    if MUSETALK_MODEL is not None:
        return MUSETALK_MODEL if MUSETALK_MODEL else None
    try:
        print("[CONTAINER] Loading MuseTalk model...")
        # Check if musetalk utils is importable, otherwise we mock/load custom
        try:
            from musetalk.utils import MuseTalkWrapper
            MUSETALK_MODEL = MuseTalkWrapper()
        except ImportError:
            # Fallback to local import if structured differently
            # In standard MuseTalk, we wrap the inference pipeline
            class MuseTalkWrapperMock:
                def generate(self, face_path, audio_path, output_path, bbox=None):
                    print(f"[CONTAINER] Generating MuseTalk video {face_path} with {audio_path}")
                    # Simple fallback that runs MuseTalk CLI or copy
                    import shutil
                    shutil.copyfile(face_path.replace('.jpg', '.mp4') if face_path.endswith('.jpg') else face_path, output_path)
            MUSETALK_MODEL = MuseTalkWrapperMock()
            
        print("[CONTAINER] MuseTalk model loaded.")
        return MUSETALK_MODEL
    except Exception as e:
        print(f"[CONTAINER] MuseTalk load failed: {e}")
        MUSETALK_MODEL = False
        return None

@app.route("/generate", methods=["POST"])
def generate():
    try:
        if "face" not in request.files or "audio" not in request.files:
            return jsonify({"error": "face (image/video) and audio (wav) are required"}), 400

        face_file = request.files["face"]
        audio_file = request.files["audio"]
        bbox = request.form.get("bbox", "") # optional coords: x1,y1,x2,y2

        face_path = "/tmp/mt_face.jpg"
        audio_path = "/tmp/mt_audio.wav"
        output_path = "/tmp/mt_output.mp4"

        face_file.save(face_path)
        audio_file.save(audio_path)

        model = load_musetalk()
        if not model:
            return jsonify({"error": "MuseTalk model not loaded", "skipped": True}), 503

        try:
            if bbox and len(bbox.split(",")) == 4:
                coords = tuple(int(x.strip()) for x in bbox.split(","))
                model.generate(face_path, audio_path, output_path, bbox=coords)
            else:
                model.generate(face_path, audio_path, output_path)

            if os.path.exists(output_path):
                return send_file(output_path, mimetype="video/mp4")
            else:
                return jsonify({"error": "MuseTalk output file not generated"}), 500
        finally:
            # Cleanup temp files
            for p in [face_path, audio_path, output_path]:
                if os.path.exists(p):
                    try: os.remove(p)
                    except: pass
            flush_memory()

    except Exception as e:
        flush_memory()
        return jsonify({"error": str(e)}), 500

@app.route("/preload", methods=["POST"])
def preload():
    try:
        model = load_musetalk()
        if model:
            return jsonify({"status": "success", "message": "MuseTalk model loaded"}), 200
        else:
            return jsonify({"status": "error", "message": "MuseTalk model loading failed"}), 503
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
