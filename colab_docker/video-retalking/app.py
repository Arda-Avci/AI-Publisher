import os
import gc
import sys
import traceback

import torch
from flask import Flask, request, jsonify, send_file

app = Flask(__name__)

VIDEO_RETALKING_DIR = "/app/video-retalking"
sys.path.insert(0, VIDEO_RETALKING_DIR)

MODEL_LOADED = False
MODEL_ERROR = None


def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()


def load_video_retalking_model():
    global MODEL_LOADED, MODEL_ERROR

    if MODEL_LOADED:
        return True
    if MODEL_ERROR:
        return False

    try:
        print("[CONTAINER] Video-ReTalking modeli yükleniyor...")

        if not os.path.exists(VIDEO_RETALKING_DIR):
            raise FileNotFoundError(f"Video-ReTalking dizini bulunamadı: {VIDEO_RETALKING_DIR}")

        try:
            from inference import load_models
            load_models()
            print("[CONTAINER] Video-ReTalking modelleri başarıyla yüklendi.")
        except ImportError:
            print("[CONTAINER] inference.load_models bulunamadı, alternatif deneniyor...")
            try:
                sys.path.insert(0, os.path.join(VIDEO_RETALKING_DIR, "video_retalking"))
                from video_retalking import VideoReTalking
                VideoReTalking()
                print("[CONTAINER] Video-ReTalking alternatif yükleme başarılı.")
            except Exception as alt_err:
                raise RuntimeError(
                    f"Video-ReTalking modeli yüklenemedi: {alt_err}. "
                    f"Dizin içeriği: {os.listdir(VIDEO_RETALKING_DIR)}"
                )

        MODEL_LOADED = True
        print("[CONTAINER] Video-ReTalking hazır.")
        return True

    except Exception as e:
        MODEL_ERROR = str(e)
        print(f"[CONTAINER] Video-ReTalking yükleme hatası: {e}")
        traceback.print_exc()
        return False


@app.route("/health", methods=["GET"])
def health():
    if MODEL_LOADED:
        return jsonify({"status": "healthy", "model": "video-retalking", "loaded": True}), 200
    elif MODEL_ERROR:
        return jsonify({"status": "degraded", "model": "video-retalking", "loaded": False, "error": MODEL_ERROR}), 200
    else:
        return jsonify({"status": "starting", "model": "video-retalking", "loaded": False}), 200


@app.route("/preload", methods=["POST"])
def preload():
    if load_video_retalking_model():
        return jsonify({"status": "success", "message": "Video-ReTalking model loaded"}), 200
    else:
        return jsonify({"status": "error", "message": MODEL_ERROR or "Model loading failed"}), 503


@app.route("/generate", methods=["POST"])
def generate():
    try:
        if not MODEL_LOADED and not load_video_retalking_model():
            return jsonify({
                "error": "Video-ReTalking modeli yüklenemedi",
                "details": MODEL_ERROR,
            }), 503

        data = request.get_json(force=True) or {}
        video_path = data.get("video_path")
        audio_path = data.get("audio_path")
        output_path = data.get("output_path", "/tmp/video_retalking_output.mp4")

        if not video_path or not audio_path:
            return jsonify({"error": "video_path and audio_path are required"}), 400

        if not os.path.exists(video_path):
            return jsonify({"error": f"Video path not found: {video_path}"}), 404
        if not os.path.exists(audio_path):
            return jsonify({"error": f"Audio path not found: {audio_path}"}), 404

        try:
            from inference import inference
            inference(video_path, audio_path, output_path)
            flush_memory()

            if os.path.exists(output_path):
                return send_file(output_path, mimetype="video/mp4")
            else:
                return jsonify({"error": "Çıktı dosyası oluşturulamadı"}), 500

        except Exception as infer_err:
            flush_memory()
            return jsonify({
                "error": str(infer_err),
                "traceback": traceback.format_exc(),
                "original_path": video_path,
            }), 500

    except Exception as e:
        flush_memory()
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
