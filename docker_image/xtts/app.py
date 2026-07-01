import os
import sys
import gc
import base64
import torch
import numpy as np
from flask import Flask, request, jsonify
import scipy.io.wavfile as wavfile
import soundfile as sf

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")

# Monkey patch transformers for coqui-tts compatibility
try:
    import transformers
    import transformers.utils.import_utils as imp_utils

    class ModuleProxy:
        def __init__(self, wrapped):
            self._wrapped = wrapped
        def __getattr__(self, name):
            try:
                return getattr(self._wrapped, name)
            except AttributeError:
                if name.startswith('is_') and name.endswith('_available'):
                    return lambda *args, **kwargs: False
                if 'greater_or_equal' in name:
                    return lambda *args, **kwargs: True
                raise AttributeError(f"module '{self._wrapped.__name__}' has no attribute '{name}'")

    proxy = ModuleProxy(imp_utils)
    sys.modules['transformers.utils.import_utils'] = proxy
    transformers.utils.import_utils = proxy

    import transformers.pytorch_utils as pyt_utils
    if not hasattr(pyt_utils, 'isin_mps_friendly'):
        pyt_utils.isin_mps_friendly = lambda *args, **kwargs: False
except Exception as patch_e:
    print(f"[CONTAINER] Transformers monkey patch failed: {patch_e}")

app = Flask(__name__)

# Lazy loaded TTS model
TTS_MODEL = None

def load_tts_model():
    global TTS_MODEL
    if TTS_MODEL is None:
        from TTS.api import TTS
        print("[CONTAINER] Loading XTTS-v2 model...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        TTS_MODEL = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    return TTS_MODEL

def stretch_audio_to_duration(input_path, output_path, target_duration_sec):
    try:
        import pyrubberband
        y, sr = sf.read(input_path)
        current_duration = len(y) / sr
        if current_duration < 0.05:
            return
        speed_factor = current_duration / target_duration_sec
        speed_factor = max(0.5, min(2.0, speed_factor))
        print(f"[CONTAINER] pyrubberband: {current_duration:.2f}s -> {target_duration_sec:.2f}s (speed: {speed_factor:.3f}x)")
        stretched = pyrubberband.time_stretch(y, sr, speed_factor)
        sf.write(output_path, stretched, sr)
    except Exception as e:
        print(f"[CONTAINER] pyrubberband stretching failed: {e}")

def generate_tts_openai(text, output_path, voice="alloy"):
    from openai import OpenAI
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is missing")
    client = OpenAI(api_key=api_key)
    response = client.audio.speech.create(model="tts-1", voice=voice, input=text)
    response.stream_to_file(output_path)

def generate_tts_edge(text, output_path, voice="tr-TR-EmelNeural"):
    import subprocess
    cmd = ["edge-tts", "--text", text, "--voice", voice, "--write-media", output_path]
    subprocess.run(cmd, check=True, capture_output=True)

@app.route("/synthesize", methods=["POST"])
def synthesize():
    data = request.get_json(force=True) or {}
    text = data.get("text", "")
    output_path = data.get("output_path", "/workspace/outputs/speech.wav")
    provider = data.get("provider", "xtts")
    target_duration_sec = data.get("target_duration_sec")
    speaker_wav = data.get("speaker_wav", "/workspace/outputs/karakter.wav")
    voice = data.get("voice", "")
    language = data.get("language", "tr")
    ref_audio_b64 = data.get("reference_audio_base64", "")

    if not text:
        return jsonify({"error": "text is required"}), 400

    XTTS_VOICE_MAP = {
        "tr": "Claribel Dervla",
        "en": "Amy Campbell",
        "de": "Joachim Beckedrath",
        "fr": "Naomi McDunn",
        "ar": "Leila Ahmed",
    }
    EDGE_VOICE_MAP = {
        "tr": "tr-TR-EmelNeural",
        "en": "en-US-AriaNeural",
        "de": "de-DE-KatjaNeural",
        "fr": "fr-FR-DeniseNeural",
        "ar": "ar-SA-ZariyamNeural",
    }

    try:
        if provider == "openai":
            generate_tts_openai(text, output_path, voice=voice or "alloy")
        elif provider == "xtts":
            model = load_tts_model()
            temp_ref_path = None
            
            if ref_audio_b64:
                import tempfile
                temp_ref = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
                clean_b64 = ref_audio_b64.split("base64,")[-1]
                temp_ref.write(base64.b64decode(clean_b64))
                temp_ref.close()
                speaker_wav = temp_ref.name
                temp_ref_path = temp_ref.name

            lang_code = language if language in XTTS_VOICE_MAP else "tr"
            
            if speaker_wav and os.path.exists(speaker_wav):
                print(f"[CONTAINER] Cloning from reference: {speaker_wav}")
                model.tts_to_file(text=text, speaker_wav=speaker_wav, language=lang_code, file_path=output_path)
            else:
                default_voice = voice or XTTS_VOICE_MAP.get(lang_code, "Claribel Dervla")
                print(f"[CONTAINER] Using default speaker voice: {default_voice}")
                model.tts_to_file(text=text, speaker=default_voice, language=lang_code, file_path=output_path)

            if temp_ref_path and os.path.exists(temp_ref_path):
                os.unlink(temp_ref_path)
        else:
            # edge tts
            edge_voice = voice or EDGE_VOICE_MAP.get(language, "tr-TR-EmelNeural")
            generate_tts_edge(text, output_path, voice=edge_voice)

        if target_duration_sec:
            target_duration_sec = float(target_duration_sec)
            stretch_audio_to_duration(output_path, output_path, target_duration_sec)

        return jsonify({"status": "success", "output_path": output_path}), 200

    except Exception as e:
        # Fallback to Edge-TTS on failure
        try:
            print(f"[CONTAINER] Sentez hatası, Edge-TTS fallback deneniyor: {e}")
            edge_voice = voice or EDGE_VOICE_MAP.get(language, "tr-TR-EmelNeural")
            generate_tts_edge(text, output_path, voice=edge_voice)
            if target_duration_sec:
                stretch_audio_to_duration(output_path, output_path, float(target_duration_sec))
            return jsonify({"status": "success", "output_path": output_path, "note": "fallback_applied"}), 200
        except Exception as fallback_e:
            return jsonify({"status": "error", "message": str(fallback_e)}), 500

@app.route("/preload", methods=["POST"])
def preload():
    """Pre-load XTTS model into VRAM to avoid cold start latency."""
    try:
        model = load_tts_model()
        flush_memory()
        return jsonify({"status": "ok", "model_loaded": model is not None})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

