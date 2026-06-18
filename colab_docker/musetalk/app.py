"""
MuseTalk Gerçek Entegrasyon - Flask API
=======================================
Gerçek MuseTalk inference pipeline'ını kullanır.
Model yüklenemezse 503 döner, mock kullanılmaz.
"""

import os
import gc
import sys
import subprocess
import traceback

import torch
from flask import Flask, request, jsonify, send_file

app = Flask(__name__)

MUSETALK_DIR = "/app/MuseTalk"
sys.path.insert(0, MUSETALK_DIR)

MODEL_LOADED = False
MODEL_ERROR = None


def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()


def load_musetalk_model():
    """Gerçek MuseTalk modelini yükler. Başarısız olursa hata döner."""
    global MODEL_LOADED, MODEL_ERROR

    if MODEL_LOADED:
        return True
    if MODEL_ERROR:
        return False

    try:
        print("[CONTAINER] MuseTalk modeli yükleniyor...")

        if not os.path.exists(MUSETALK_DIR):
            raise FileNotFoundError(f"MuseTalk dizini bulunamadı: {MUSETALK_DIR}")

        # MuseTalk bağımlılıklarını kontrol et
        try:
            import omegaconf
            import einops
        except ImportError as e:
            raise ImportError(f"Eksik bağımlılık: {e}. Dockerfile'da doğru kurulduğundan emin olun.")

        # MuseTalk model ağırlıklarını kontrol et
        models_dir = os.path.join(MUSETALK_DIR, "models")
        if not os.path.exists(models_dir):
            os.makedirs(models_dir, exist_ok=True)
            print("[CONTAINER] Model ağırlıkları indiriliyor...")
            try:
                from huggingface_hub import snapshot_download
                snapshot_download(
                    "TencentGameMate/MuseTalk",
                    local_dir=models_dir,
                    ignore_patterns=["*.git*", "docs/*", "*.md"],
                )
            except Exception as dl_err:
                raise RuntimeError(
                    f"MuseTalk model ağırlıkları indirilemedi: {dl_err}. "
                    "Manuel olarak /app/MuseTalk/models/ dizinine koyun."
                )

        # MuseTalk inference pipeline'ını yükle
        try:
            from musetalk.utils.utils import load_all_model
            load_all_model()
            print("[CONTAINER] MuseTalk modelleri başarıyla yüklendi (load_all_model).")
        except ImportError:
            print("[CONTAINER] load_all_model bulunamadı, alternatif yükleme deneniyor...")
            try:
                # Eski versiyon uyumluluğu
                sys.path.insert(0, os.path.join(MUSETALK_DIR, "musetalk"))
                from muse import MuseTalk as MT
                MT()
                print("[CONTAINER] MuseTalk alternatif yükleme başarılı.")
            except Exception as alt_err:
                raise RuntimeError(
                    f"MuseTalk modeli yüklenemedi: {alt_err}. "
                    f"Repo yapısı değişmiş olabilir. Dizin içeriği: {os.listdir(MUSETALK_DIR)}"
                )

        MODEL_LOADED = True
        print("[CONTAINER] MuseTalk hazır.")
        return True

    except Exception as e:
        MODEL_ERROR = str(e)
        print(f"[CONTAINER] MuseTalk yükleme hatası: {e}")
        traceback.print_exc()
        return False


@app.route("/health", methods=["GET"])
def health():
    if MODEL_LOADED:
        return jsonify({"status": "healthy", "model": "musetalk", "loaded": True}), 200
    elif MODEL_ERROR:
        return jsonify({"status": "degraded", "model": "musetalk", "loaded": False, "error": MODEL_ERROR}), 200
    else:
        return jsonify({"status": "starting", "model": "musetalk", "loaded": False}), 200


@app.route("/preload", methods=["POST"])
def preload():
    if load_musetalk_model():
        return jsonify({"status": "success", "message": "MuseTalk model loaded"}), 200
    else:
        return jsonify({"status": "error", "message": MODEL_ERROR or "Model loading failed"}), 503


@app.route("/generate", methods=["POST"])
def generate():
    try:
        if not MODEL_LOADED and not load_musetalk_model():
            return jsonify({
                "error": "MuseTalk modeli yüklenemedi",
                "details": MODEL_ERROR,
                "hint": "Model ağırlıkları /app/MuseTalk/models/ dizininde olmalı"
            }), 503

        if "face" not in request.files or "audio" not in request.files:
            return jsonify({"error": "face (image/video) and audio (wav) fields are required"}), 400

        face_file = request.files["face"]
        audio_file = request.files["audio"]
        bbox = request.form.get("bbox", "")

        face_path = "/tmp/mt_face_input"
        audio_path = "/tmp/mt_audio_input.wav"
        output_path = "/tmp/mt_output.mp4"

        face_ext = face_file.filename.rsplit(".", 1)[-1] if "." in (face_file.filename or "") else "jpg"
        face_path = f"{face_path}.{face_ext}"
        face_file.save(face_path)
        audio_file.save(audio_path)

        try:
            # MuseTalk inference pipeline'ını çalıştır
            # Standart MuseTalk inference.py mantığını takip eder
            cmd = [
                sys.executable, "-u", "inference.py",
                "--face", face_path,
                "--audio", audio_path,
                "--result_dir", "/tmp/musetalk_results",
            ]
            if bbox and len(bbox.split(",")) == 4:
                cmd.extend(["--bbox_shift", bbox.split(",")[0]])

            result = subprocess.run(
                cmd,
                cwd=MUSETALK_DIR,
                capture_output=True,
                text=True,
                timeout=300,
            )

            if result.returncode != 0:
                return jsonify({
                    "error": "MuseTalk inference başarısız",
                    "details": result.stderr[-2000:] if result.stderr else "Bilinmeyen hata",
                    "stdout": result.stdout[-1000:] if result.stdout else "",
                }), 500

            # Çıktı dosyasını bul
            results_dir = "/tmp/musetalk_results"
            if os.path.exists(results_dir):
                output_files = sorted(
                    [os.path.join(results_dir, f) for f in os.listdir(results_dir) if f.endswith(".mp4")],
                    key=os.path.getmtime,
                    reverse=True,
                )
                if output_files:
                    return send_file(output_files[0], mimetype="video/mp4")

            return jsonify({"error": "Çıktı dosyası oluşturulamadı", "stdout": result.stdout[-1000:]}), 500

        finally:
            for p in [face_path, audio_path]:
                if os.path.exists(p):
                    try:
                        os.remove(p)
                    except OSError:
                        pass
            flush_memory()

    except subprocess.TimeoutExpired:
        return jsonify({"error": "MuseTalk inference zaman aşımı (300s)"}), 500
    except Exception as e:
        flush_memory()
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
