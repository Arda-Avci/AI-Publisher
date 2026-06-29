import os
import gc
import base64
import torch
import numpy as np
import soundfile as sf

if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")

import librosa
from flask import Flask, request, jsonify

app = Flask(__name__)

F5_PIPELINE = None
AVAILABLE_VOICES = {}

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_pipeline():
    global F5_PIPELINE
    if F5_PIPELINE is not None:
        return F5_PIPELINE

    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"[CONTAINER - F5TTS] Loading F5-TTS model (VRAM: {vram_gb:.2f} GB)")

    from f5_tts.model import DiT
    from f5_tts.infer import InferenceSession

    device = "cuda" if torch.cuda.is_available() and vram_gb >= 3.5 else "cpu"
    if device == "cpu":
        print("[CONTAINER - F5TTS] VRAM < 3.5GB, falling back to CPU")

    model_cfg = dict(dim=1024, depth=22, heads=16, ff_mult=4, text_dim=512, conv_layers=4)
    model = DiT(**model_cfg)

    session = InferenceSession(model, device=device)
    F5_PIPELINE = session
    return session

@app.route("/synthesize", methods=["POST"])
def synthesize():
    data = request.get_json(force=True) or {}
    text = data.get("text", "")
    reference_audio_b64 = data.get("reference_audio", "")
    output_path = data.get("output_path", "/workspace/outputs/f5tts_speech.wav")

    if not text:
        return jsonify({"error": "text is required"}), 400

    try:
        session = get_pipeline()

        ref_audio = None
        ref_text = data.get("reference_text", "")

        if reference_audio_b64:
            try:
                b64_data = reference_audio_b64
                if "," in b64_data:
                    b64_data = b64_data.split(",")[1]
                audio_bytes = base64.b64decode(b64_data)
                ref_path = "/tmp/f5tts_ref_audio.wav"
                with open(ref_path, "wb") as f:
                    f.write(audio_bytes)
                ref_audio, sr = librosa.load(ref_path, sr=24000)
                os.remove(ref_path)
            except Exception as e:
                print(f"[CONTAINER - F5TTS] Reference audio decode failed: {e}")

        if ref_audio is None:
            ref_audio = np.zeros(int(24000 * 2), dtype=np.float32)
            ref_text = ""

        with torch.inference_mode():
            audio = session.synthesize(
                text=text,
                reference_audio=ref_audio,
                reference_text=ref_text,
                speed=1.0,
                nfe_step=32,
                cfg_scale=2.0
            )

        sf.write(output_path, audio, 24000)
        return jsonify({"status": "success", "output_path": output_path}), 200

    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/voices", methods=["GET"])
def voices():
    return jsonify({
        "voices": [
            {"id": "default", "name": "Default (zero-shot)", "languages": ["tr", "en", "de", "fr", "es", "zh", "ja", "ko"]}
        ]
    }), 200

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route("/preload", methods=["POST"])
def preload():
    """Pre-load model into VRAM to avoid cold start latency."""
    try:
        pipe = get_pipeline()
        flush_memory()
        return jsonify({"status": "ok", "model_loaded": pipe is not None})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


