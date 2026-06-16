"""
AI-Publisher Colab Sunucu - v4 (Full Integration)
==================================================
Entegre edilen repolar:
- Auto-Synced-Translated-Dubs : pyrubberband 2-pass TTS + ses esnetme
- stable-diffusion-webui      : GFPGAN yüz düzeltme + RealESRGAN upscale
- Lobe Chat                   : OpenAI TTS + Edge TTS alternatif sağlayıcıları

- VIDEO : damo-vilab/text-to-video-ms-1.7b (ModelScope) → ~4-5 GB (T4'te kararlı)
- TTS   : coqui/XTTS-v2 / OpenAI / Edge Speech (seçilebilir)
- SFX   : cvssp/audioldm2 (değişmedi)
"""

import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"

# Modern transformers kütüphanesinde kaldırılan veya değişen is_..._available ve
# is_..._greater_or_equal fonksiyonlarının coqui-tts (TTS) ile uyumluluk sağlaması
# amacıyla import_utils modülünün evrensel bir ModuleProxy ile sarmalanması.
try:
    import sys
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
    print("[INFO] Transformers import_utils proxy-patched.")

    # isin_mps_friendly patch'i (Coqui-TTS transformers 4.45+ uyumluluğu için)
    try:
        import transformers.pytorch_utils as pyt_utils
        if not hasattr(pyt_utils, 'isin_mps_friendly'):
            pyt_utils.isin_mps_friendly = lambda *args, **kwargs: False
            print("[INFO] Transformers pytorch_utils.isin_mps_friendly patched inline.")
    except ImportError:
        class PytorchUtilsMock:
            @staticmethod
            def isin_mps_friendly(*args, **kwargs):
                return False
        sys.modules['transformers.pytorch_utils'] = PytorchUtilsMock
        transformers.pytorch_utils = PytorchUtilsMock
        print("[INFO] Transformers pytorch_utils mocked completely.")
except Exception as patch_e:
    print(f"[WARN] Monkey patch uygulanamadı: {patch_e}")


import subprocess
import shutil
try:
    import yt_dlp
except ImportError:
    print("Installing yt-dlp...")
    subprocess.run(["pip", "install", "yt-dlp"])
    import yt_dlp

import time
server_start_time = time.time()
import torch
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_file
from diffusers import DiffusionPipeline
import scipy.io.wavfile as wavfile
import gc
import traceback
import base64
import requests
import uuid
import threading
from pyngrok import ngrok

app = Flask(__name__)

TASKS = {}

# ── Server Diagnostics & Telemetry ──────────────────────────────────────────
import datetime

DIAGNOSTICS = {
    "total_jobs_received": 0,
    "total_jobs_success": 0,
    "total_jobs_failed": 0,
    "last_job_time": None,
    "last_job_status": None,
    "last_job_error": None,
    
    # Callback stats
    "callbacks": {
        "total_attempted": 0,
        "total_success": 0,
        "total_failed": 0,
        "last_sent_at": None,
        "last_status_code": None,
        "last_error": None,
        "last_url": None,
        "tunnel_connectivity": "unknown"  # "healthy", "failed", or "unknown"
    },
    
    # Produced outputs counts
    "outputs": {
        "videos_generated": 0,
        "speech_synthesized": 0,
        "sfx_generated": 0,
        "lipsync_applied": 0,
        "subtitles_generated": 0
    },
    
    # Recent activity logs (max 20 entries)
    "recent_activities": []
}

def log_diagnostic_activity(activity_message: str):
    timestamp = datetime.datetime.now().isoformat()
    DIAGNOSTICS["recent_activities"].append(f"[{timestamp}] {activity_message}")
    if len(DIAGNOSTICS["recent_activities"]) > 20:
        DIAGNOSTICS["recent_activities"].pop(0)

def check_tunnel_connectivity():
    last_url = DIAGNOSTICS["callbacks"]["last_url"]
    if not last_url:
        return "unknown"
    
    from urllib.parse import urlparse
    try:
        parsed = urlparse(last_url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        headers = {
            "ngrok-skip-browser-warning": "any-value",
            "bypass-tunnel-reminder": "true"
        }
        # Hızlı ping GET isteği
        resp = requests.get(f"{base_url}/api/v1/csrf", headers=headers, timeout=3.0)
        if resp.status_code == 200:
            return "healthy"
        else:
            resp = requests.get(base_url, headers=headers, timeout=3.0)
            if resp.status_code < 500:
                return "healthy"
            return "unhealthy"
    except Exception as e:
        print(f"[DEBUG] Tunnel connectivity check failed: {e}")
        return "failed"

# ── İsteğe bağlı kütüphaneler (rubberband, GFPGAN, ESRGAN, alternatif TTS) ──
try:
    import pyrubberband
    import soundfile as sf
    RUBBERBAND_AVAILABLE = True
except ImportError:
    RUBBERBAND_AVAILABLE = False

try:
    from gfpgan import GFPGANer
    GFPGAN_AVAILABLE = True
except ImportError:
    GFPGAN_AVAILABLE = False

try:
    from realesrgan import RealESRGANer
    from basicsr.archs.rrdbnet_arch import RRDBNet
    ESRGAN_AVAILABLE = True
except ImportError:
    ESRGAN_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# ── S3: Son aktivite zamanı (şu an /apply-lipsync için) ──────────────────────
last_activity = time.time()

# ── Global hata yakalayıcı ───────────────────────────────────────────────────
@app.errorhandler(Exception)
def handle_exception(e):
    print("❌ SUNUCU HATA DETAYI:")
    traceback.print_exc()
    return jsonify({"status": "error", "message": str(e)}), 500

print("🚀 Flask sunucusu Lazy Loading (ModelScope T2V) ile hazırlandı.")

# ── YARDIMCI: GPU belleğini temizle ─────────────────────────────────────────
def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def _check_model_whitelist(video_model: str, whitelist_param: list = None):
    """
    Model whitelist kontrolü.
    Öncelik sırası:
    1. whitelist_param (fonksiyon parametresi)
    2. COLAB_MODEL_WHITELIST ortam değişkeni (virgülle ayrılmış model adları)
    Whitelist boşsa veya hiçbiri tanımlanmamışsa kontrol atlanır.
    Eşleşme case-insensitive ve kısmi (substring) bazlıdır.
    """
    whitelist = whitelist_param
    if whitelist is None:
        env_val = os.environ.get("COLAB_MODEL_WHITELIST", "")
        if env_val:
            whitelist = [m.strip().lower() for m in env_val.split(",")]
    if not whitelist:
        return
    vm_lower = video_model.lower()
    allowed = any(w in vm_lower or vm_lower in w for w in whitelist)
    if not allowed:
        raise ValueError(
            f"Model '{video_model}' whitelist'te bulunamadı. "
            f"İzin verilenler: {whitelist}. "
            f"COLAB_MODEL_WHITELIST env değişkenini ayarlayın veya "
            f"model_whitelist JSON parametresini iletin."
        )

# ── VİDEO MODEL KALİTE ZİNCİRİ (en kaliteli → en hızlı) ─────────────────────
# I2V modelleri: Görselden video, kalite sırasına göre
VIDEO_I2V_FALLBACK_CHAIN = [
    "HunyuanVideo-I2V",
    "Wan2.1-I2V-14B",
    "CogVideoX-5b-I2V",
    "CogVideoX-2b-I2V",
    "LTX-Video-I2V"
]

VIDEO_T2V_FALLBACK_CHAIN = [
    "HunyuanVideo",
    "CogVideoX-5b",
    "CogVideoX-2b",
    "Wan2.1-T2V-1.3B",
    "LTX-Video"
]


def _try_video_with_fallback(prompt, image_path, task_id, is_i2v, model_whitelist):
    """Iterate fallback quality chain until success. Returns (frames, used_model, error)."""
    chain = VIDEO_I2V_FALLBACK_CHAIN if is_i2v else VIDEO_T2V_FALLBACK_CHAIN
    _update_task(task_id, status="processing", stage="video_generation", stagePercent=15, message=f"Video üretiliyor ({chain[0]})...", etaSeconds=520)
    last_error = None
    for attempt_model in chain:
        try:
            if is_i2v:
                frames = generate_video_image_lazy(prompt, image_path, task_id, attempt_model, model_whitelist)
            else:
                frames = generate_video_text_lazy(prompt, task_id, attempt_model, model_whitelist)
            print(f"✅ Video başarıyla üretildi (model: {attempt_model})")
            return frames, attempt_model, None
        except torch.cuda.OutOfMemoryError as exc:
            print(f"⚠️ {attempt_model} OOM! Sonraki modele geçiliyor... ({exc})")
            last_error = exc
        except Exception as exc:
            print(f"⚠️ {attempt_model} başarısız: {exc}. Sonraki modele geçiliyor...")
            last_error = exc
        finally:
            flush_memory()
        _update_task(task_id, stagePercent=15, message=f"Model {attempt_model} başarısız, yedek deneniyor...", etaSeconds=520)
        continue
    print(f"❌ Tüm modeller başarısız. Son hata: {last_error}")
    return None, None, last_error

# ── 1. VİDEO ÜRETİMİ (Lazy Loading - Wan 2.1, LTX 2, Hunyuan, CogVideo) ─────────
def generate_video_image_lazy(prompt: str, image_path: str, task_id: str = None, video_model: str = "CogVideoX-5b-I2V", model_whitelist: list = None) -> list:
    """
    Seçilen model ile görselden video üretir.
    model_whitelist: İzin verilen model adları listesi (case-insensitive kısmi eşleşme).
                     Yoksa COLAB_MODEL_WHITELIST ortam değişkeninden okunur (virgülle ayrılmış).
    """
    # Model whitelist kontrolü
    _check_model_whitelist(video_model, model_whitelist)

    from diffusers.utils import load_image

    flush_memory()
    print(f"🎬 Görselden Video motoru ({video_model}) belleğe yükleniyor...")
    
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"💾 Tespit Edilen GPU VRAM: {vram_gb:.2f} GB")
    
    pipe = None
    try:
        if "wan" in video_model.lower():
            from diffusers import WanAnimatePipeline
            print("Wan 2.1 I2V yükleniyor...")
            pipe = WanAnimatePipeline.from_pretrained(
                "Wan-AI/Wan2.1-I2V-14B-480P",
                torch_dtype=torch.bfloat16
            )
        elif "ltx" in video_model.lower():
            from diffusers import LTXImageToVideoPipeline
            print("LTX-Video I2V yükleniyor...")
            pipe = LTXImageToVideoPipeline.from_pretrained(
                "Lightricks/LTX-Video",
                torch_dtype=torch.bfloat16
            )
        elif "hunyuan" in video_model.lower():
            from diffusers import HunyuanVideoPipeline
            print("Hunyuan Video I2V yükleniyor...")
            pipe = HunyuanVideoPipeline.from_pretrained(
                "hunyuanvideo-community/HunyuanVideo",
                torch_dtype=torch.bfloat16
            )
        else:
            from diffusers import CogVideoXImageToVideoPipeline
            model_name = "THUDM/CogVideoX-2b-I2V" if "2b" in video_model.lower() else "THUDM/CogVideoX-5b-I2V"
            print(f"CogVideoX I2V ({model_name}) yükleniyor...")
            pipe = CogVideoXImageToVideoPipeline.from_pretrained(
                model_name,
                torch_dtype=torch.float16
            )
            
        if vram_gb >= 18.0:
            print("⚡ Güçlü GPU algılandı. Model GPU'ya yükleniyor...")
            pipe.to("cuda")
            if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
                pipe.vae.enable_tiling()
        else:
            print("🐢 Bellek koruması için CPU Offloading etkinleştiriliyor...")
            pipe.enable_model_cpu_offload()
            if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
                pipe.vae.enable_tiling()
                
        init_image = load_image(image_path)
        with torch.inference_mode():
            if "wan" in video_model.lower():
                output = pipe(
                    prompt=prompt,
                    image=init_image,
                    num_frames=81,
                    num_inference_steps=30
                )
            elif "ltx" in video_model.lower():
                output = pipe(
                    image=init_image,
                    prompt=prompt,
                    num_frames=65,
                    num_inference_steps=25
                )
            elif "hunyuan" in video_model.lower():
                output = pipe(
                    prompt=prompt,
                    num_frames=65,
                    num_inference_steps=25
                )
            else:
                output = pipe(
                    prompt=prompt,
                    image=init_image,
                    num_frames=49,
                    num_inference_steps=30
                )
            frames = output.frames[0]
            
    except torch.cuda.OutOfMemoryError as exc:
        print(f"❌ GPU OOM: {exc}")
        if pipe is not None:
            del pipe
        flush_memory()
        raise RuntimeError("GPU OOM hatası oluştu.") from exc
    except Exception as exc:
        print(f"❌ Video üretim hatası: {exc}")
        if pipe is not None:
            del pipe
        flush_memory()
        raise
    finally:
        if pipe is not None:
            del pipe
        flush_memory()
        
    return frames

def generate_video_text_lazy(prompt: str, task_id: str = None, video_model: str = "CogVideoX-5b", model_whitelist: list = None) -> list:
    """
    Seçilen model ile metinden video üretir.
    model_whitelist: İzin verilen model adları listesi (case-insensitive kısmi eşleşme).
                     Yoksa COLAB_MODEL_WHITELIST ortam değişkeninden okunur (virgülle ayrılmış).
    """
    # Model whitelist kontrolü
    _check_model_whitelist(video_model, model_whitelist)

    flush_memory()
    print(f"🎬 Metinden Video motoru ({video_model}) belleğe yükleniyor...")
    
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"💾 Tespit Edilen GPU VRAM: {vram_gb:.2f} GB")
    
    pipe = None
    try:
        if "wan" in video_model.lower():
            from diffusers import WanAnimatePipeline
            print("Wan 2.1 T2V yükleniyor...")
            pipe = WanAnimatePipeline.from_pretrained(
                "Wan-AI/Wan2.1-T2V-1.3B",
                torch_dtype=torch.bfloat16
            )
        elif "ltx" in video_model.lower():
            from diffusers import LTXPipeline
            print("LTX-Video T2V yükleniyor...")
            pipe = LTXPipeline.from_pretrained(
                "Lightricks/LTX-Video",
                torch_dtype=torch.bfloat16
            )
        elif "hunyuan" in video_model.lower():
            from diffusers import HunyuanVideoPipeline
            print("Hunyuan Video T2V yükleniyor...")
            pipe = HunyuanVideoPipeline.from_pretrained(
                "hunyuanvideo-community/HunyuanVideo",
                torch_dtype=torch.bfloat16
            )
        else:
            from diffusers import CogVideoXPipeline
            model_name = "THUDM/CogVideoX-2b" if "2b" in video_model.lower() else "THUDM/CogVideoX-5b"
            print(f"CogVideoX T2V ({model_name}) yükleniyor...")
            pipe = CogVideoXPipeline.from_pretrained(
                model_name,
                torch_dtype=torch.float16
            )
            
        if vram_gb >= 18.0:
            print("⚡ Güçlü GPU algılandı. Model GPU'ya yükleniyor...")
            pipe.to("cuda")
            if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
                pipe.vae.enable_tiling()
        else:
            print("🐢 Bellek koruması için CPU Offloading etkinleştiriliyor...")
            pipe.enable_model_cpu_offload()
            if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
                pipe.vae.enable_tiling()
                
        with torch.inference_mode():
            if "wan" in video_model.lower():
                output = pipe(
                    prompt=prompt,
                    num_frames=81,
                    num_inference_steps=30
                )
            elif "ltx" in video_model.lower():
                output = pipe(
                    prompt=prompt,
                    num_frames=65,
                    num_inference_steps=25
                )
            elif "hunyuan" in video_model.lower():
                output = pipe(
                    prompt=prompt,
                    num_frames=65,
                    num_inference_steps=25
                )
            else:
                output = pipe(
                    prompt=prompt,
                    num_frames=49,
                    num_inference_steps=30
                )
            frames = output.frames[0]
            
    except torch.cuda.OutOfMemoryError as exc:
        print(f"❌ GPU OOM: {exc}")
        if pipe is not None:
            del pipe
        flush_memory()
        raise RuntimeError("GPU OOM hatası oluştu.") from exc
    except Exception as exc:
        print(f"❌ Video üretim hatası: {exc}")
        if pipe is not None:
            del pipe
        flush_memory()
        raise
    finally:
        if pipe is not None:
            del pipe
        flush_memory()
        
    return frames

# ── 2. TTS (Edge & OpenAI) ────────────────────────────────────────────────────

# ── 2a. RUBBERBAND SES ESNETME (Auto-Synced-Translated-Dubs) ────────────────
def stretch_audio_to_duration(input_path, output_path, target_duration_sec):
    """
    pyrubberband ile ses dosyasını hedef süreye esnetir/kısaltır.
    Orijinal perde korunur; 0.5x-2.0x aralığında çalışır.
    """
    if not RUBBERBAND_AVAILABLE:
        import shutil
        shutil.copy2(input_path, output_path)
        return output_path

    y, sr = sf.read(input_path)
    current_duration = len(y) / sr
    if current_duration < 0.05:
        import shutil
        shutil.copy2(input_path, output_path)
        return output_path

    speed_factor = current_duration / target_duration_sec
    speed_factor = max(0.5, min(2.0, speed_factor))

    print(f"🎵 Rubberband: {current_duration:.2f}s → {target_duration_sec:.2f}s (hız: {speed_factor:.3f}x)")
    stretched = pyrubberband.time_stretch(y, sr, speed_factor)
    sf.write(output_path, stretched, sr)
    return output_path


# ── 2b. ALTERNATİF TTS SAĞLAYICILARI (Lobe Chat / OpenAI / Edge) ────────────
def generate_tts_openai(text, output_path, voice="alloy", model="tts-1"):
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise ValueError("OPENAI_API_KEY ortam değişkeni bulunamadı")
    client = OpenAI(api_key=api_key)
    response = client.audio.speech.create(model=model, voice=voice, input=text)
    response.stream_to_file(output_path)
    return output_path


def generate_tts_edge(text, output_path, voice="tr-TR-EmelNeural"):
    import subprocess
    cmd = ["edge-tts", "--text", text, "--voice", voice, "--write-media", output_path]
    subprocess.run(cmd, check=True, capture_output=True)
    return output_path


TTS_MODEL = None

def load_tts_model():
    global TTS_MODEL
    if TTS_MODEL is None:
        from TTS.api import TTS
        import torch
        print("🎙️ XTTS-v2 modeli GPU'ya yükleniyor...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        TTS_MODEL = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    return TTS_MODEL

def synthesize_speech(text, output_path, provider="edge", target_duration_sec=None, **kwargs):
    """
    Çoklu TTS sağlayıcı desteği ile konuşma sentezler + 2-pass rubberband.
    provider: "edge" (varsayılan), "openai", "xtts"
    target_lang: "tr", "en", "de", "fr", "ar" — XTTS-v2 dil kodu
    """
    # Dil -> XTTS-v2 voice ID mapping (language-specific speaker voices)
    XTTS_VOICE_MAP = {
        "tr": "Claribel Dervla",    # Turkish default voice
        "en": "Amy Campbell",        # English default voice
        "de": "Joachim Beckedrath",  # German
        "fr": "Naomi McDunn",        # French
        "ar": "Leila Ahmed",         # Arabic
    }
    # Edge-TTS dil -> voice mapping
    EDGE_VOICE_MAP = {
        "tr": "tr-TR-EmelNeural",
        "en": "en-US-AriaNeural",
        "de": "de-DE-KatjaNeural",
        "fr": "fr-FR-DeniseNeural",
        "ar": "ar-SA-ZariyamNeural",
    }

    if provider == "openai" and OPENAI_AVAILABLE:
        generate_tts_openai(text, output_path, voice=kwargs.get("voice", "alloy"))
    elif provider == "xtts":
        try:
            print("🎙️ XTTS-v2 ile sentezleme yapılıyor...")
            model = load_tts_model()
            speaker_wav = kwargs.get("speaker_wav", "/content/karakter.wav")
            ref_audio_b64 = kwargs.get("reference_audio_base64", "")
            temp_ref_path = None
            if ref_audio_b64:
                import tempfile
                temp_ref = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
                clean_b64 = ref_audio_b64.split("base64,")[-1]
                temp_ref.write(base64.b64decode(clean_b64))
                temp_ref.close()
                speaker_wav = temp_ref.name
                temp_ref_path = temp_ref.name

            target_lang = kwargs.get("language", "tr")
            # Dil kodunu dogrula
            lang_code = target_lang if target_lang in XTTS_VOICE_MAP else "tr"

            if not os.path.exists(speaker_wav):
                # Kullanici belirli bir ses secmediyse dil bazli varsayilan sec
                voice_name = kwargs.get("voice", XTTS_VOICE_MAP.get(lang_code, "Claribel Dervla"))
                print(f"🎙️ Referans ses bulunamadı, dil bazli varsayılan ses: {voice_name} (lang={lang_code})")
                model.tts_to_file(text=text, speaker=voice_name, language=lang_code, file_path=output_path)
            else:
                print(f"🎙️ Referans ses üzerinden klonlama yapılıyor: {speaker_wav}")
                model.tts_to_file(text=text, speaker_wav=speaker_wav, language=lang_code, file_path=output_path)

            if temp_ref_path and os.path.exists(temp_ref_path):
                os.unlink(temp_ref_path)
        except Exception as e:
            print(f"[ERROR] XTTS sentezleme hatası, Edge-TTS fallback tetikleniyor: {e}")
            voice = kwargs.get("voice", EDGE_VOICE_MAP.get(kwargs.get("language", "tr"), "tr-TR-EmelNeural"))
            generate_tts_edge(text, output_path, voice=voice)
    else:
        # provider == "edge" veya fallback
        voice = kwargs.get("voice", EDGE_VOICE_MAP.get(kwargs.get("language", "tr"), "tr-TR-EmelNeural"))
        generate_tts_edge(text, output_path, voice=voice)

    # 2-pass: Hedef süre varsa rubberband ile esnet
    if target_duration_sec and RUBBERBAND_AVAILABLE:
        stretch_audio_to_duration(output_path, output_path, target_duration_sec)

    return output_path


# ── 3. SFX ───────────────────────────────────────────────────────────────────
def generate_sfx_lazy(prompt: str):
    from diffusers import AudioLDM2Pipeline
    flush_memory()

    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0

    print("🔊 Ses efekti motoru belleğe yükleniyor...")
    sfx_pipe = AudioLDM2Pipeline.from_pretrained(
        "cvssp/audioldm2",
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True,
    )
    if vram_gb >= 18.0:
        print(f"⚡ Güçlü GPU ({vram_gb:.1f}GB) — CPU offload atlanıyor, doğrudan CUDA.")
        sfx_pipe = sfx_pipe.to("cuda")
    else:
        print(f"🐢 Düşük GPU ({vram_gb:.1f}GB) — CPU offload etkin.")
        sfx_pipe.enable_model_cpu_offload()

    print("🔊 Ses efekti üretiliyor...")
    with torch.inference_mode():
        audio = sfx_pipe(
            prompt,
            audio_length_in_s=3.0,    # Video süresiyle hizalı
            num_inference_steps=20,
        ).audios

    del sfx_pipe
    flush_memory()
    return audio

# ── 4. LİP-SYNC (Wav2Lip — gerçek dudak senkronizasyonu, S3) ────────────────
# Eski OpenCV tabanlı "apply_lipsync" görsel simülasyonu kaldırıldı; yerine
# gerçek Wav2Lip inference'ı kullanılıyor. Wav2Lip modeli /content/Wav2Lip
# dizininde (colab_setup.py tarafından klonlanır) ve yüz bulunamadığında
# orijinal video sessizce kullanılır.
WAV2LIP_MODEL = None  # None=yüklenmedi, False=yüklenemedi, model=ok
WAV2LIP_DIR = "/content/Wav2Lip"


def load_wav2lip():
    """
    Wav2Lip modelini lazy-load. İlk çağrıda sys.path'e /content/Wav2Lip'i ekler
    ve wav2lip.pth checkpoint'ini yükler. Yükleme başarısız olursa sentinel False
    döner — sonraki çağrılar tekrar denemez.
    """
    global WAV2LIP_MODEL
    if WAV2LIP_MODEL is not None:
        return WAV2LIP_MODEL if WAV2LIP_MODEL else None

    try:
        import sys
        if WAV2LIP_DIR not in sys.path:
            sys.path.insert(0, WAV2LIP_DIR)

        # Sonradan yüklendiği için inference modülünü burada import ediyoruz
        from Wav2Lip.inference import load_model as _w2l_load_model

        ckpt_path = os.path.join(WAV2LIP_DIR, "checkpoints", "wav2lip.pth")
        if not os.path.exists(ckpt_path):
            print(f"[WARN] Wav2Lip checkpoint bulunamadı: {ckpt_path}")
            WAV2LIP_MODEL = False
            return None

        print("👄 Wav2Lip modeli belleğe yükleniyor...")
        WAV2LIP_MODEL = _w2l_load_model(ckpt_path)
        print("[INFO] Wav2Lip modeli yüklendi")
        return WAV2LIP_MODEL
    except Exception as e:
        print(f"[WARN] Wav2Lip yüklenemedi: {e}")
        WAV2LIP_MODEL = False
        return None


import base64
import face_recognition

def load_image_from_base64(b64_str):
    if not b64_str:
        return None
    if "," in b64_str:
        b64_str = b64_str.split(",")[1]
    img_bytes = base64.b64decode(b64_str)
    nparr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def make_custom_face_detect(ref_encoding=None):
    def custom_face_detect(images):
        pady1, pady2, padx1, padx2 = [0, 10, 0, 0]
        results = []
        
        for idx, img in enumerate(images):
            # face_recognition için RGB formatına çevir
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Yüz lokasyonlarını tespit et
            face_locations = face_recognition.face_locations(rgb_img)
            
            if len(face_locations) == 0:
                # Yüz bulunamazsa varsayılan olarak tüm resmi al
                h, w, _ = img.shape
                results.append([0, 0, w, h])
                continue
                
            best_rect = face_locations[0] # varsayılan ilk yüz
            if ref_encoding is not None and len(face_locations) > 1:
                # Frame'deki tüm yüzlerin encoding'lerini çıkar
                face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
                min_dist = 999.0
                for f_idx, enc in enumerate(face_encodings):
                    dist = face_recognition.face_distance([ref_encoding], enc)[0]
                    if dist < min_dist:
                        min_dist = dist
                        best_rect = face_locations[f_idx]
            
            top, right, bottom, left = best_rect
            
            y1 = max(0, top - pady1)
            y2 = min(img.shape[0], bottom + pady2)
            x1 = max(0, left - padx1)
            x2 = min(img.shape[1], right + padx2)
            
            results.append([x1, y1, x2, y2])
            
        boxes = np.array(results)
        final_results = [[images[i][y1:y2, x1:x2], (y1, y2, x1, x2)] for i, (x1, y1, x2, y2) in enumerate(boxes)]
        return final_results
        
    return custom_face_detect


def apply_lipsync_internal(video_path: str, audio_path: str, speaker: str = None, character_images: dict = None) -> dict:
    """
    Wav2Lip inference — face_recognition entegrasyonu sayesinde 
    birden fazla yüz olan sahnelerde sadece konuşan karakterin (speaker) 
    dudaklarını senkronize eder.
    """
    model = load_wav2lip()
    if not model:
        return {"success": False, "skipped": True, "error": "Wav2Lip modeli yüklenemedi"}

    ref_encoding = None
    if speaker and character_images and speaker in character_images:
        try:
            ref_img = load_image_from_base64(character_images[speaker])
            if ref_img is not None:
                rgb_ref = cv2.cvtColor(ref_img, cv2.COLOR_BGR2RGB)
                ref_encs = face_recognition.face_encodings(rgb_ref)
                if len(ref_encs) > 0:
                    ref_encoding = ref_encs[0]
                    print(f"[INFO] Konuşmacı ({speaker}) referans yüz encoding'i çıkarıldı.")
        except Exception as ex:
            print(f"[WARN] Referans yüz encoding'i çıkarılırken hata: {ex}")

    output_path = video_path.replace('.mp4', '_lipsync.mp4')
    try:
        from Wav2Lip import inference as _w2l_inference
        
        # face_detect metodunu konuşmacı duyarlı versiyonla ez
        _w2l_inference.face_detect = make_custom_face_detect(ref_encoding)
        
        _w2l_inference.inference(
            model,
            face=video_path,
            audio=audio_path,
            outfile=output_path,
            static=False,
            fps=8.0,                # ModelScope output fps ile eşleşir
            pads=[0, 10, 0, 0],
            face_det_batch_size=4,
            wav2lip_batch_size=4,
            resize_factor=1,
            crop=[0, -1, 0, -1],
            box=[-1, -1, -1, -1],
            rotate=False,
            nosmooth=True
        )
        flush_memory()
        return {"success": True, "output_path": output_path, "original_path": video_path}
    except Exception as e:
        print(f"[WARN] Wav2Lip inference başarısız: {e}")
        flush_memory()
        # Orijinal video kullanılsın
        return {"success": False, "skipped": True, "error": str(e), "original_path": video_path}

# ── YARDIMCI: PIL frame listesini geçici MP4'e dönüştür ─────────────────────
def frames_to_mp4(frames, path: str, fps: int = 8):
    """
    ModelScope'un döndürdüğü PIL.Image listesini MP4'e yazar.
    """
    import imageio
    # float32 [0,1] → uint8 [0,255] dönüşümü (imageio uyarısını bastırır)
    uint8_frames = [(np.clip(np.array(f), 0.0, 1.0) * 255).astype(np.uint8) for f in frames]
    imageio.mimwrite(path, uint8_frames, fps=fps, quality=8)

# ── API ROTASI ────────────────────────────────────────────────────────────────
LAST_VIDEO_PATH  = "/content/current_scene.mp4"
RAW_VIDEO_PATH   = "/content/raw_video.mp4"
AUDIO_PATH       = "/content/speech.wav"
SFX_PATH         = "/content/sfx.wav"
SUBTITLE_PATH    = "/content/subtitle.srt"   # faster-whisper çıktısı

# ── 5. ALTYAZI ÜRETİMİ (faster-whisper ve openai-whisper) ────────────────────
_whisper_model = None
_openai_whisper_model = None

def load_faster_whisper(model_size="small"):
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        print(f"📝 faster-whisper modeli ({model_size}) belleğe yükleniyor...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if torch.cuda.is_available() else "int8"
        _whisper_model = WhisperModel(model_size, device=device, compute_type=compute_type)
    return _whisper_model

def load_openai_whisper(model_size="small"):
    global _openai_whisper_model
    if _openai_whisper_model is None:
        import whisper
        print(f"📝 OpenAI Whisper modeli ({model_size}) belleğe yükleniyor...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _openai_whisper_model = whisper.load_model(model_size, device=device)
    return _openai_whisper_model

def transcribe_audio_internal(audio_path: str, language: str = "tr", model_size: str = "small") -> dict:
    """
    Öncelikle faster-whisper ile deşifre yapmayı dener.
    Eğer faster-whisper hata fırlatırsa veya kütüphane yüklü değilse,
    standart openai-whisper modelini yükleyip onunla deşifre eder (fallback).
    """
    # 1. FASTER-WHISPER DENEMESİ
    try:
        print("📝 Deşifre deneniyor: faster-whisper...")
        model = load_faster_whisper(model_size)
        segments, info = model.transcribe(
            audio_path,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            language=language
        )
        
        result_segments = []
        full_text = []
        for seg in segments:
            word_list = []
            if hasattr(seg, 'words') and seg.words:
                for w in seg.words:
                    word_list.append({
                        "word": w.word,
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "confidence": round(getattr(w, 'probability', 1.0), 3)
                    })
            result_segments.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
                "words": word_list if word_list else None
            })
            full_text.append(seg.text.strip())
            
        print(f"✅ Deşifre başarıyla tamamlandı (faster-whisper). Segment: {len(result_segments)}, Word-level: {sum(1 for s in result_segments if s['words'])}")
        return {
            "status": "success",
            "text": " ".join(full_text),
            "segments": result_segments,
            "language": info.language
        }
    except Exception as fw_err:
        print(f"[WARN] faster-whisper deşifre hatası, OpenAI Whisper fallback deneniyor: {fw_err}")
        
    # 2. STANDARD OPENAI-WHISPER FALLBACK
    try:
        print("📝 Deşifre deneniyor: OpenAI Whisper...")
        model = load_openai_whisper(model_size)
        
        result = model.transcribe(audio_path, language=language)
        
        result_segments = []
        for seg in result.get("segments", []):
            result_segments.append({
                "start": round(seg.get("start", 0.0), 2),
                "end": round(seg.get("end", 0.0), 2),
                "text": seg.get("text", "").strip()
            })
            
        print("✅ Deşifre başarıyla tamamlandı (OpenAI Whisper).")
        return {
            "status": "success",
            "text": result.get("text", "").strip(),
            "segments": result_segments,
            "language": result.get("language", language)
        }
    except Exception as ow_err:
        print(f"❌ OpenAI Whisper deşifre hatası: {ow_err}")
        raise RuntimeError(f"Her iki deşifre motoru da başarısız oldu. Son hata: {ow_err}")

def generate_subtitles_whisper(audio_path: str, output_srt: str, language: str = "tr") -> str | None:
    """
    Ses dosyasını analiz eder, kelime zamanlı .srt üretir.
    Geriye dönük uyumluluk için faster-whisper veya openai-whisper ile .srt yazar.
    """
    try:
        res = transcribe_audio_internal(audio_path, language=language)
        segments = res.get("segments", [])
    except Exception as e:
        print(f"⚠️ Altyazı üretimi başarısız: {e}")
        return None

    def _fmt(secs: float) -> str:
        h  = int(secs // 3600)
        m  = int((secs % 3600) // 60)
        s  = int(secs % 60)
        ms = int((secs - int(secs)) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    lines = []
    idx = 1
    for seg in segments:
        lines.append(str(idx))
        lines.append(f"{_fmt(seg['start'])} --> {_fmt(seg['end'])}")
        lines.append(seg['text'].strip())
        lines.append("")
        idx += 1

    with open(output_srt, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"✅ Altyazı üretildi: {output_srt} ({idx - 1} segment)")
    return output_srt


def _update_task(task_id: str, **kwargs):
    """TASKS dict güncellerken mevcut alanları korur."""
    if task_id in TASKS:
        TASKS[task_id].update(kwargs)
    else:
        TASKS[task_id] = kwargs

def get_youtube_video_path(video_id: str) -> str:
    os.makedirs("/content/source_videos", exist_ok=True)
    target_path = f"/content/source_videos/{video_id}.mp4"
    if os.path.exists(target_path):
        return target_path
        
    print(f"Downloading YouTube video {video_id} directly on Colab...")
    ydl_opts = {
        'outtmpl': '/content/source_videos/%(id)s.%(ext)s',
        'format': 'best[ext=mp4]/mp4',
        'quiet': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
        
    if os.path.exists(target_path):
        return target_path
    for f in os.listdir("/content/source_videos"):
        if f.startswith(video_id):
            return os.path.join("/content/source_videos", f)
    raise FileNotFoundError(f"Downloaded video not found for ID: {video_id}")

def extract_frame_at_time(video_path: str, timestamp_sec: float, out_img_path: str):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0
    frame_index = int(timestamp_sec * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
    ret, frame = cap.read()
    if not ret:
        cap.set(cv2.CAP_PROP_POS_MSEC, int(timestamp_sec * 1000))
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
    
    if ret:
        cv2.imwrite(out_img_path, frame)
        cap.release()
    else:
        cap.release()
        raise RuntimeError(f"Failed to extract frame at {timestamp_sec}s from {video_path}")

def _generate_media_worker(task_id: str, data: dict):
    video_prompt        = data.get("video_prompt", "")
    speech_text         = data.get("speech_text", "")
    sfx_prompt          = data.get("sfx_prompt", "")
    character_features  = data.get("character_features", "")
    apply_lipsync       = bool(data.get("apply_lipsync", False))
    scene_number        = int(data.get("scene_number", 1))
    source_video_id     = data.get("source_video_id", "")
    reference_image_base64 = data.get("reference_image_base64", "")
    video_model         = data.get("video_model", "CogVideoX-5b")
    model_whitelist     = data.get("model_whitelist")

    final_prompt = f"{character_features}, {video_prompt}" if character_features else video_prompt

    image_path = None
    if source_video_id:
        _update_task(task_id, status="processing", stage="video_downloading", stagePercent=5, message="Orijinal video indiriliyor...", etaSeconds=45)
        try:
            video_path = get_youtube_video_path(source_video_id)
            _update_task(task_id, stage="frame_extraction", stagePercent=10, message="Referans kare kesiliyor...", etaSeconds=5)
            timestamp = (scene_number - 1) * 6.0
            image_path = f"/content/scene_{scene_number}_init.jpg"
            extract_frame_at_time(video_path, timestamp, image_path)
        except Exception as exc:
            print(f"❌ YouTube indirme/kare kesme hatası (T2V fallback): {exc}")
            image_path = None
    elif reference_image_base64:
        _update_task(task_id, status="processing", stage="image_decoding", stagePercent=10, message="Referans görsel çözülüyor...", etaSeconds=5)
        try:
            image_path = f"/content/scene_{scene_number}_init.jpg"
            b64_data = reference_image_base64
            if "," in b64_data:
                b64_data = b64_data.split(",")[1]
            img_bytes = base64.b64decode(b64_data)
            with open(image_path, "wb") as f:
                f.write(img_bytes)
        except Exception as exc:
            print(f"❌ Base64 çözme hatası: {exc}")
            image_path = None

    # 1. Video (fallback chain ile: en kaliteli model dene, hata olursa düş)
    is_i2v = bool(image_path and os.path.exists(image_path))
    frames, used_model, fallback_error = _try_video_with_fallback(
        final_prompt, image_path, task_id, is_i2v, model_whitelist
    )
    if used_model is None:
        TASKS[task_id] = {"status": "error", "message": f"Tüm modeller başarısız: {fallback_error}"}
        return
    video_model = used_model  # Kullanılan gerçek modeli kaydet

    frames_to_mp4(frames, RAW_VIDEO_PATH, fps=8)
    DIAGNOSTICS["outputs"]["videos_generated"] += 1
    DIAGNOSTICS["outputs"]["last_video_produced_at"] = datetime.datetime.now().isoformat()
    log_diagnostic_activity(f"Video üretildi: {task_id} (model: {video_model})")
    _update_task(task_id, stagePercent=30, message="Video üretildi, ses işleniyor...", etaSeconds=95)

    # 2. TTS (2-pass rubberband + çoklu sağlayıcı)
    if speech_text:
        try:
            tts_provider = data.get("tts_provider", "xtts")
            tts_voice = data.get("tts_voice", "alloy" if tts_provider == "openai" else "Claribel Dervla")
            video_duration = 49 / 8  # 6.125 saniye (49 frame @8fps)

            print(f"🎙️ TTS başlatılıyor (sağlayıcı: {tts_provider}, ses: {tts_voice}, hedef süre: {video_duration:.2f}s)...")

            synthesize_speech(
                text=speech_text,
                output_path=AUDIO_PATH,
                provider=tts_provider,
                target_duration_sec=video_duration,
                speaker_wav="/content/karakter.wav",
                speaker=tts_voice,
                voice=tts_voice,
                language="tr",
            )
            DIAGNOSTICS["outputs"]["speech_synthesized"] += 1
            DIAGNOSTICS["outputs"]["last_speech_produced_at"] = datetime.datetime.now().isoformat()
            log_diagnostic_activity(f"Konuşma sentezlendi: {task_id} (sağlayıcı: {tts_provider})")
        except Exception as exc:
            TASKS[task_id] = {"status": "error", "message": f"TTS hatası: {str(exc)}"}
            return
    else:
        silence = np.zeros(int(16000 * 3), dtype=np.int16)
        wavfile.write(AUDIO_PATH, 16000, silence)

    _update_task(task_id, stage="tts_generation", stagePercent=40, message="TTS tamam, altyazı üretiliyor...", etaSeconds=75)

    # 3. Altyazı Üretimi
    if speech_text:
        generate_subtitles_whisper(AUDIO_PATH, SUBTITLE_PATH, language="tr")
        DIAGNOSTICS["outputs"]["subtitles_generated"] += 1
        log_diagnostic_activity(f"Altyazı üretildi: {task_id}")

    _update_task(task_id, stagePercent=55, message="Altyazı hazır, dudak senkroni uygulanıyor...", etaSeconds=60)

    # 4. S3 — Wav2Lip lip-sync
    out_path = RAW_VIDEO_PATH
    if apply_lipsync and speech_text:
        print("👄 Wav2Lip uygulanıyor...")
        speaker = data.get("speaker")
        character_images = data.get("character_images")
        lipsync_result = apply_lipsync_internal(RAW_VIDEO_PATH, AUDIO_PATH, speaker=speaker, character_images=character_images)
        if lipsync_result.get("success"):
            out_path = lipsync_result["output_path"]
            print(f"✅ Wav2Lip tamam: {out_path}")
            DIAGNOSTICS["outputs"]["lipsync_applied"] += 1
            DIAGNOSTICS["outputs"]["last_lipsync_applied_at"] = datetime.datetime.now().isoformat()
            log_diagnostic_activity(f"Dudak senkroni uygulandı: {task_id}")
        else:
            print(f"⚠️ Lip-sync atlandı: {lipsync_result.get('error', 'bilinmeyen')}")
    else:
        print("ℹ️ Lip-sync devre dışı — ham video kullanılacak")

    if out_path != LAST_VIDEO_PATH:
        try:
            import shutil
            shutil.copyfile(out_path, LAST_VIDEO_PATH)
        except Exception as copy_err:
            print(f"[WARN] last_video kopyalanamadı: {copy_err}")

    _update_task(task_id, stage="lipsync_done", stagePercent=70, message="Dudak senkroni tamam, ses efekti üretiliyor...", etaSeconds=15)

    # 5. SFX
    if sfx_prompt:
        try:
            audio_sfx = generate_sfx_lazy(sfx_prompt)
            wavfile.write(SFX_PATH, 16000, (audio_sfx[0] * 32767).astype(np.int16))
            DIAGNOSTICS["outputs"]["sfx_generated"] += 1
            DIAGNOSTICS["outputs"]["last_sfx_produced_at"] = datetime.datetime.now().isoformat()
            log_diagnostic_activity(f"Ses efekti üretildi: {task_id} (prompt: {sfx_prompt[:30]})")
        except Exception as exc:
            TASKS[task_id] = {"status": "error", "message": f"SFX hatası: {str(exc)}"}
            return
    else:
        silence = np.zeros(int(16000 * 3), dtype=np.int16)
        wavfile.write(SFX_PATH, 16000, silence)

    _update_task(task_id, stage="finalizing", stagePercent=90, message="Dosyalar hazırlanıyor...", etaSeconds=5)
    TASKS[task_id] = {
        "status": "success",
        "has_subtitle": os.path.exists(SUBTITLE_PATH),
        "lipsync_applied": out_path != RAW_VIDEO_PATH,
        "stage": "done",
        "stagePercent": 100,
        "message": "Tamamlandı"
    }


import requests

def _generate_media_worker_with_callback(task_id: str, data: dict):
    """
    Geliştirilmiş otonom worker: İşi bitirdiğinde Node.js sunucusuna 
    dosyaları base64 veya multipart/form-data olarak doğrudan fırlatır.
    """
    callback_url = data.get("callback_url") # Node.js sunucunun adresi
    job_id = data.get("job_id")
    scene_number = data.get("scene_number", 1)
    
    # Teşhis verilerini güncelle
    DIAGNOSTICS["total_jobs_received"] += 1
    DIAGNOSTICS["last_job_time"] = datetime.datetime.now().isoformat()
    DIAGNOSTICS["last_job_status"] = "processing"
    log_diagnostic_activity(f"İş başlatıldı: Job: {job_id}, Scene: {scene_number}, Task: {task_id}")
    
    try:
        # Mevcut üretim adımlarını tetikle
        _generate_media_worker(task_id, data)
        
        # Görev başarılı bittiyse dosyaları oku ve Node.js'e gönder
        if TASKS.get(task_id, {}).get("status") == "success":
            DIAGNOSTICS["total_jobs_success"] += 1
            DIAGNOSTICS["last_job_status"] = "success"
            
            if callback_url:
                print(f"📤 İpek yolu kuruluyor: Sonuçlar {callback_url} adresine gönderiliyor... Job: {job_id}, Scene: {scene_number}")
                
                # Node.js Express/FastAPI sunucuna gönderilecek multipart payload
                files = {}
                if os.path.exists(LAST_VIDEO_PATH):
                    files['video'] = open(LAST_VIDEO_PATH, 'rb')
                if os.path.exists(AUDIO_PATH):
                    files['speech'] = open(AUDIO_PATH, 'rb')
                if os.path.exists(SFX_PATH):
                    files['sfx'] = open(SFX_PATH, 'rb')
                if os.path.exists(SUBTITLE_PATH):
                    files['subtitle'] = open(SUBTITLE_PATH, 'rb')
                    
                payload = {
                    "task_id": task_id,
                    "job_id": job_id,
                    "scene_number": scene_number,
                    "status": "success",
                    "message": "Colab render işlemi başarıyla tamamlandı."
                }
                
                # Backend sunucuna otonom POST atılıyor (ngrok ve localtunnel bypass header'ları eklenerek)
                bypass_headers = {
                    "ngrok-skip-browser-warning": "any-value",
                    "bypass-tunnel-reminder": "true"
                }
                
                DIAGNOSTICS["callbacks"]["total_attempted"] += 1
                DIAGNOSTICS["callbacks"]["last_sent_at"] = datetime.datetime.now().isoformat()
                DIAGNOSTICS["callbacks"]["last_url"] = callback_url
                
                try:
                    response = requests.post(callback_url, data=payload, files=files, headers=bypass_headers, timeout=120)
                    print(f"📩 Node.js Sunucu Yanıtı: {response.status_code}")
                    DIAGNOSTICS["callbacks"]["last_status_code"] = response.status_code
                    if response.status_code in [200, 201, 202]:
                        DIAGNOSTICS["callbacks"]["total_success"] += 1
                        DIAGNOSTICS["callbacks"]["tunnel_connectivity"] = "healthy"
                        log_diagnostic_activity(f"Callback başarıyla gönderildi: {callback_url}")
                    else:
                        DIAGNOSTICS["callbacks"]["total_failed"] += 1
                        DIAGNOSTICS["callbacks"]["tunnel_connectivity"] = "unhealthy"
                        log_diagnostic_activity(f"Callback başarısız (status {response.status_code}): {callback_url}")
                except Exception as cb_err:
                    DIAGNOSTICS["callbacks"]["total_failed"] += 1
                    DIAGNOSTICS["callbacks"]["last_error"] = str(cb_err)
                    DIAGNOSTICS["callbacks"]["tunnel_connectivity"] = "failed"
                    log_diagnostic_activity(f"Callback gönderim hatası: {cb_err}")
        else:
            DIAGNOSTICS["total_jobs_failed"] += 1
            DIAGNOSTICS["last_job_status"] = "failed"
            DIAGNOSTICS["last_job_error"] = TASKS.get(task_id, {}).get("message", "Bilinmeyen işleme hatası")
            log_diagnostic_activity(f"İş başarısız: Task {task_id} status: {TASKS.get(task_id, {}).get('status')}")
            
    except Exception as e:
        print(f"❌ Otonom callback hatası: {e}")
        DIAGNOSTICS["total_jobs_failed"] += 1
        DIAGNOSTICS["last_job_status"] = "failed"
        DIAGNOSTICS["last_job_error"] = str(e)
        log_diagnostic_activity(f"İş hatası: {e}")
        if callback_url:
            DIAGNOSTICS["callbacks"]["total_attempted"] += 1
            DIAGNOSTICS["callbacks"]["last_sent_at"] = datetime.datetime.now().isoformat()
            DIAGNOSTICS["callbacks"]["last_url"] = callback_url
            try:
                bypass_headers = {
                    "ngrok-skip-browser-warning": "any-value",
                    "bypass-tunnel-reminder": "true"
                }
                response = requests.post(callback_url, data={
                    "task_id": task_id,
                    "job_id": job_id,
                    "scene_number": scene_number,
                    "status": "error",
                    "message": str(e)
                }, headers=bypass_headers, timeout=10)
                DIAGNOSTICS["callbacks"]["last_status_code"] = response.status_code
                if response.status_code in [200, 201, 202]:
                    DIAGNOSTICS["callbacks"]["total_success"] += 1
                    DIAGNOSTICS["callbacks"]["tunnel_connectivity"] = "healthy"
                else:
                    DIAGNOSTICS["callbacks"]["total_failed"] += 1
                    DIAGNOSTICS["callbacks"]["tunnel_connectivity"] = "unhealthy"
            except Exception as cb_err:
                DIAGNOSTICS["callbacks"]["total_failed"] += 1
                DIAGNOSTICS["callbacks"]["last_error"] = str(cb_err)
                DIAGNOSTICS["callbacks"]["tunnel_connectivity"] = "failed"
                print(f"❌ Hata callback gönderimi başarısız: {cb_err}")


@app.route("/generate-media", methods=["POST"])
def generate_media():
    data = request.get_json(force=True)
    task_id = str(uuid.uuid4())
    TASKS[task_id] = {"status": "processing", "stage": "queued", "stagePercent": 0}
    
    # Yeni callback'li worker'ı thread olarak kaldırıyoruz
    thread = threading.Thread(target=_generate_media_worker_with_callback, args=(task_id, data))
    thread.start()
    
    return jsonify({"status": "accepted", "task_id": task_id, "message": "İş kuyruğa alındı, bitince sunucunuza post edilecek."}), 202

@app.route("/status/<task_id>", methods=["GET"])
def task_status(task_id):
    if task_id not in TASKS:
        return jsonify({"status": "error", "message": "Task ID bulunamadı"}), 404
    return jsonify(TASKS[task_id])



# ── S3: Bağımsız lip-sync endpoint ────────────────────────────────────────────
@app.route("/apply-lipsync", methods=["POST"])
def apply_lipsync_endpoint():
    """
    Wav2Lip ile gerçek lip-sync uygula.
    Body: { video_path, audio_path } → yeni video_path döner.
    Yüz bulunamazsa 200 + skipped=True + original_path ile orijinal video.
    """
    global last_activity
    last_activity = time.time()

    data = request.get_json(force=True) or {}
    video_path = data.get("video_path")
    audio_path = data.get("audio_path")

    if not video_path or not audio_path:
        return jsonify({"error": "video_path ve audio_path zorunlu"}), 400
    if not os.path.exists(video_path):
        return jsonify({"error": f"Video bulunamadı: {video_path}"}), 404
    if not os.path.exists(audio_path):
        return jsonify({"error": f"Ses bulunamadı: {audio_path}"}), 404

    model = load_wav2lip()
    if not model:
        return jsonify({
            "error": "Wav2Lip modeli yüklenemedi",
            "skipped": True,
            "original_path": video_path
        }), 503

    result = apply_lipsync_internal(video_path, audio_path)
    if result.get("success"):
        return jsonify(result), 200
    else:
        # Yüz bulunamadı / başka hata → 200 + skipped → orijinal video
        return jsonify(result), 200

# ── İNDİRME ROTALARI ─────────────────────────────────────────────────────────
@app.route("/download/video")
def download_video():
    return send_file(LAST_VIDEO_PATH, mimetype="video/mp4")

@app.route("/download/speech")
def download_speech():
    return send_file(AUDIO_PATH, mimetype="audio/wav")

@app.route("/download/sfx")
def download_sfx():
    return send_file(SFX_PATH, mimetype="audio/wav")

@app.route("/download/subtitle")
def download_subtitle():
    """faster-whisper'ın ürettiği .srt altyazı dosyasını Node.js'e gönderir."""
    if not os.path.exists(SUBTITLE_PATH):
        return jsonify({"error": "Altyazı dosyası bulunamadı"}), 404
    return send_file(SUBTITLE_PATH, mimetype="text/plain", download_name="subtitle.srt")

@app.route("/faster-whisper", methods=["POST"])
def faster_whisper_route():
    """
    faster-whisper C++ motoru ile 4x hızlı deşifre.
    Destekler: model_size (tiny/base/small/medium/large),
    compute_type (int8/float16), beam_size.
    Word-level timestamps SRT olarak döner.
    """
    global last_activity
    last_activity = time.time()

    language = request.form.get("language", "tr")
    model_size = request.form.get("model_size", "small")
    compute_type = request.form.get("compute_type", "float16" if torch.cuda.is_available() else "int8")
    beam_size = int(request.form.get("beam_size", 5))
    file_path = request.form.get("file_path", "")

    if request.is_json:
        data = request.get_json() or {}
        language = data.get("language", language)
        model_size = data.get("model_size", model_size)
        compute_type = data.get("compute_type", compute_type)
        beam_size = int(data.get("beam_size", beam_size))
        file_path = data.get("file_path", file_path)

    temp_file_path = None

    try:
        if "file" in request.files:
            uploaded_file = request.files["file"]
            ext = os.path.splitext(uploaded_file.filename)[1] or ".mp3"
            temp_file_path = f"/content/fw_temp_{uuid.uuid4()}{ext}"
            uploaded_file.save(temp_file_path)
            target_path = temp_file_path
            print(f"📥 faster-whisper için dosya yüklendi: {target_path}")
        elif file_path:
            if not os.path.exists(file_path):
                return jsonify({"status": "error", "message": f"Dosya bulunamadı: {file_path}"}), 404
            target_path = file_path
            print(f"📂 faster-whisper için lokal dosya kullanılıyor: {target_path}")
        else:
            return jsonify({"status": "error", "message": "Dosya ('file') veya 'file_path' parametresi zorunludur"}), 400

        from faster_whisper import WhisperModel
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"📝 faster-whisper ({model_size}, compute={compute_type}, beam={beam_size}) ile deşifre...")
        model = WhisperModel(model_size, device=device, compute_type=compute_type)

        segments, info = model.transcribe(
            target_path,
            beam_size=beam_size,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            language=language
        )

        result_segments = []
        full_text = []
        for seg in segments:
            word_list = []
            if hasattr(seg, 'words') and seg.words:
                for w in seg.words:
                    word_list.append({
                        "word": w.word,
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "confidence": round(getattr(w, 'probability', 1.0), 3)
                    })
            result_segments.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
                "words": word_list if word_list else None
            })
            full_text.append(seg.text.strip())

        # SRT formatında word-level timestamps üret
        def _fmt(secs: float) -> str:
            h = int(secs // 3600)
            m = int((secs % 3600) // 60)
            s = int(secs % 60)
            ms = int((secs - int(secs)) * 1000)
            return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

        srt_lines = []
        idx = 1
        for seg in result_segments:
            srt_lines.append(str(idx))
            srt_lines.append(f"{_fmt(seg['start'])} --> {_fmt(seg['end'])}")
            srt_lines.append(seg['text'].strip())
            srt_lines.append("")
            idx += 1

        srt_content = "\n".join(srt_lines)

        print(f"✅ faster-whisper deşifre tamam: {len(result_segments)} segment, method=faster-whisper")
        return jsonify({
            "status": "success",
            "method": "faster-whisper",
            "text": " ".join(full_text),
            "segments": result_segments,
            "language": info.language,
            "srt": srt_content
        }), 200

    except Exception as e:
        print(f"❌ faster-whisper endpoint hatası: {e}")
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except:
                pass
        flush_memory()


@app.route("/transcribe", methods=["POST"])
def transcribe_route():
    """
    Ses veya video dosyasını alıp zaman damgalı deşifre eder.
    """
    global last_activity
    last_activity = time.time()
    
    language = request.form.get("language", "tr")
    model_size = request.form.get("model_size", "small")
    file_path = request.form.get("file_path", "")
    
    if request.is_json:
        data = request.get_json() or {}
        language = data.get("language", language)
        model_size = data.get("model_size", model_size)
        file_path = data.get("file_path", file_path)
        
    temp_file_path = None
    
    try:
        if "file" in request.files:
            uploaded_file = request.files["file"]
            ext = os.path.splitext(uploaded_file.filename)[1] or ".mp3"
            temp_file_path = f"/content/transcribe_temp_{uuid.uuid4()}{ext}"
            uploaded_file.save(temp_file_path)
            target_path = temp_file_path
            print(f"📥 Deşifre için dosya yüklendi: {target_path}")
        elif file_path:
            if not os.path.exists(file_path):
                return jsonify({"status": "error", "message": f"Dosya bulunamadı: {file_path}"}), 404
            target_path = file_path
            print(f"📂 Deşifre için lokal dosya kullanılıyor: {target_path}")
        else:
            return jsonify({"status": "error", "message": "Dosya ('file') veya 'file_path' parametresi zorunludur"}), 400
            
        result = transcribe_audio_internal(target_path, language=language, model_size=model_size)
        return jsonify(result), 200
        
    except Exception as e:
        print(f"❌ Deşifre API hatası: {e}")
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try: os.unlink(temp_file_path)
            except: pass
        flush_memory()


# ── Sentez-Speech: Çoklu dil desteği ile XTTS-v2 sentez ───────────────────────
@app.route("/synthesize-speech", methods=["POST"])
def synthesize_speech_route():
    """
    Metin ve hedef dil ile XTTS-v2 ses sentezler.
    Body (JSON):
      text          - Sentez metni
      target_lang   - Hedef dil kodu: tr, en, de, fr, ar
      voice         - Opsiyonel: XTTS voice ID
      provider      - Opsiyonel: "xtts" (varsayilan), "edge", "openai"
      speaker_wav   - Opsiyonel: Referans ses dosyasi (base64 veya path)
    """
    global last_activity
    last_activity = time.time()

    data = request.get_json(force=True) or {}
    text = data.get("text", "")
    target_lang = data.get("target_lang", "tr")
    voice = data.get("voice", "")
    provider = data.get("provider", "xtts")
    speaker_wav = data.get("speaker_wav", "/content/karakter.wav")
    ref_audio_b64 = data.get("reference_audio_base64", "")

    if not text:
        return jsonify({"error": "'text' parametresi zorunludur"}), 400

    if target_lang not in ["tr", "en", "de", "fr", "ar"]:
        return jsonify({"error": f"Geçersiz target_lang: {target_lang}. Desteklenen: tr, en, de, fr, ar"}), 400

    output_path = f"/content/synth_speech_{uuid.uuid4().hex[:8]}.wav"

    try:
        synthesize_speech(
            text=text,
            output_path=output_path,
            provider=provider,
            target_duration_sec=None,
            language=target_lang,
            voice=voice or None,
            speaker_wav=speaker_wav if os.path.exists(speaker_wav) else None,
            reference_audio_base64=ref_audio_b64 or None,
        )
        return send_file(output_path, mimetype="audio/wav", as_attachment=True, download_name="speech.wav")
    except Exception as e:
        print(f"❌ synthesize-speech hatası: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(output_path):
            try: os.unlink(output_path)
            except: pass


# ── RESİM EDİTÖRÜ ENTEGRASYONLARI (Odysseus Esintili) ──────────────────────────

@app.route("/remove-background", methods=["POST"])
def remove_background():
    """rembg kütüphanesini kullanarak görselin arka planını temizler."""
    if "image" not in request.files:
        return jsonify({"error": "Görsel dosyası ('image') gönderilmedi"}), 400
    
    file = request.files["image"]
    input_data = file.read()
    
    try:
        import rembg
        print("✂️ rembg ile arka plan temizleniyor...")
        output_data = rembg.remove(input_data)
        
        import io
        return send_file(
            io.BytesIO(output_data),
            mimetype="image/png",
            as_attachment=True,
            download_name="removed_bg.png"
        )
    except Exception as e:
        print(f"❌ Arka plan silme hatası: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/inpaint-image", methods=["POST"])
def inpaint_image():
    """Stable Diffusion Inpaint modelini kullanarak maskelenmiş alanı prompta göre düzenler."""
    if "image" not in request.files or "mask" not in request.files:
        return jsonify({"error": "Görsel ('image') ve maske ('mask') dosyaları zorunludur"}), 400
    
    prompt = request.form.get("prompt", "")
    if not prompt:
        return jsonify({"error": "Prompt parametresi zorunludur"}), 400
        
    image_file = request.files["image"]
    mask_file = request.files["mask"]
    
    image_path = "/content/inpaint_temp_img.png"
    mask_path = "/content/inpaint_temp_mask.png"
    output_path = "/content/inpaint_output.png"
    
    image_file.save(image_path)
    mask_file.save(mask_path)
    
    flush_memory()
    pipe = None
    try:
        from diffusers import StableDiffusionInpaintPipeline
        from diffusers.utils import load_image
        import torch
        
        print("🎨 SD Inpaint modeli (stable-diffusion-inpainting) belleğe yükleniyor...")
        pipe = StableDiffusionInpaintPipeline.from_pretrained(
            "runwayml/stable-diffusion-inpainting",
            torch_dtype=torch.float16
        )
        pipe.to("cuda")
        
        init_image = load_image(image_path).convert("RGB")
        mask_image = load_image(mask_path).convert("RGB")
        
        print(f"🎨 Inpaint işlemi yapılıyor, prompt: {prompt}")
        with torch.inference_mode():
            image = pipe(
                prompt=prompt,
                image=init_image,
                mask_image=mask_image,
                num_inference_steps=25
            ).images[0]
            
        image.save(output_path)
        return send_file(output_path, mimetype="image/png")
    except Exception as e:
        print(f"❌ Inpaint hatası: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if pipe is not None:
            del pipe
        flush_memory()

@app.route("/api/v1/eye-contact", methods=["POST"])
def api_eye_contact():
    """Video üzerindeki göz temasını düzeltir (Gaze-correction)."""
    data = request.get_json(force=True) or {}
    video_path = data.get("video_path")
    output_path = data.get("output_path")
    
    if not video_path or not output_path:
        return jsonify({"error": "video_path ve output_path parametreleri zorunludur"}), 400
        
    print(f"👁️ [eye-contact] Başlatılıyor... Video: {video_path}")
    
    if not os.path.exists(video_path):
        return jsonify({"error": f"Video dosyası bulunamadı: {video_path}"}), 400
        
    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError("Video dosyası OpenCV ile açılamadı")
            
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        
        temp_out = f"/content/gaze_temp_{uuid.uuid4().hex[:8]}.mp4"
        out = cv2.VideoWriter(temp_out, fourcc, fps, (width, height))
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            
            for (x, y, w, h) in faces:
                roi_gray = gray[y:y+h, x:x+w]
                roi_color = frame[y:y+h, x:x+w]
                
                eyes = eye_cascade.detectMultiScale(roi_gray)
                for (ex, ey, ew, eh) in eyes:
                    eye_roi = roi_color[ey:ey+eh, ex:ex+ew]
                    eye_gray = roi_gray[ey:ey+eh, ex:ex+ew]
                    
                    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(eye_gray)
                    center_x, center_y = ew // 2, eh // 2
                    pupil_x, pupil_y = min_loc
                    
                    dx = center_x - pupil_x
                    dy = center_y - pupil_y
                    
                    if abs(dx) > 1 or abs(dy) > 1:
                        M = np.float32([[1, 0, dx * 0.3], [0, 1, dy * 0.3]])
                        roi_color[ey:ey+eh, ex:ex+ew] = cv2.warpAffine(eye_roi, M, (ew, eh), borderMode=cv2.BORDER_REPLICATE)
            
            out.write(frame)
            
        cap.release()
        out.write(None)
        out.release()
        
        import subprocess
        cmd_audio = [
            "ffmpeg", "-y", "-i", temp_out, "-i", video_path,
            "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "copy", "-c:a", "aac",
            "-shortest", output_path
        ]
        subprocess.run(cmd_audio, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if os.path.exists(temp_out):
            os.unlink(temp_out)
            
        print(f"👁️ [eye-contact] Tamamlandı. Çıkış: {output_path}")
        return jsonify({"status": "success", "output_path": output_path})
        
    except Exception as e:
        print(f"❌ [eye-contact] Hatası: {e}")
        try:
            import shutil
            shutil.copyfile(video_path, output_path)
            return jsonify({"status": "success", "output_path": output_path, "note": f"Fallback applied due to error: {e}"})
        except Exception as copy_e:
            return jsonify({"error": f"Gaze correction failed and fallback copy failed: {copy_e}"}), 500

@app.route("/api/v1/inpaint", methods=["POST"])
def api_video_inpaint():
    """Video üzerindeki istenmeyen nesneleri maskelere göre siler (Inpainting)."""
    data = request.get_json(force=True) or {}
    video_path = data.get("video_path")
    mask_regions = data.get("mask_regions", [])
    output_path = data.get("output_path")
    
    if not video_path or not output_path:
        return jsonify({"error": "video_path ve output_path parametreleri zorunludur"}), 400
        
    print(f"🎨 [inpaint] Başlatılıyor... Video: {video_path}, Maske Sayısı: {len(mask_regions)}")
    
    if not os.path.exists(video_path):
        return jsonify({"error": f"Video dosyası bulunamadı: {video_path}"}), 400
        
    if not mask_regions:
        try:
            import shutil
            shutil.copyfile(video_path, output_path)
            return jsonify({"status": "success", "output_path": output_path})
        except Exception as copy_e:
            return jsonify({"error": str(copy_e)}), 500
            
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError("Video dosyası OpenCV ile açılamadı")
            
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        
        temp_out = f"/content/inpaint_temp_{uuid.uuid4().hex[:8]}.mp4"
        out = cv2.VideoWriter(temp_out, fourcc, fps, (width, height))
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            mask = np.zeros((height, width), dtype=np.uint8)
            
            for region in mask_regions:
                rx = int(region.get("x", 0) * width)
                ry = int(region.get("y", 0) * height)
                rw = int(region.get("width", 0) * width)
                rh = int(region.get("height", 0) * height)
                
                rx = max(0, min(width - 1, rx))
                ry = max(0, min(height - 1, ry))
                rw = max(1, min(width - rx, rw))
                rh = max(1, min(height - ry, rh))
                
                cv2.rectangle(mask, (rx, ry), (rx + rw, ry + rh), 255, -1)
                
            inpainted_frame = cv2.inpaint(frame, mask, 3, cv2.INPAINT_TELEA)
            out.write(inpainted_frame)
            
        cap.release()
        out.release()
        
        import subprocess
        cmd_audio = [
            "ffmpeg", "-y", "-i", temp_out, "-i", video_path,
            "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "copy", "-c:a", "aac",
            "-shortest", output_path
        ]
        subprocess.run(cmd_audio, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if os.path.exists(temp_out):
            os.unlink(temp_out)
            
        print(f"🎨 [inpaint] Tamamlandı. Çıkış: {output_path}")
        return jsonify({"status": "success", "output_path": output_path})
        
    except Exception as e:
        print(f"❌ [inpaint] Hatası: {e}")
        try:
            import shutil
            shutil.copyfile(video_path, output_path)
            return jsonify({"status": "success", "output_path": output_path, "note": f"Fallback applied due to error: {e}"})
        except Exception as copy_e:
            return jsonify({"error": f"Inpainting failed and fallback copy failed: {copy_e}"}), 500

@app.route("/generate-image", methods=["POST"])
def generate_image_route():
    """Flux veya DreamShaper kullanarak sıfırdan referans görsel / kapak üretir."""
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    model_type = data.get("model_type", "dreamshaper") # dreamshaper veya flux
    
    if not prompt:
        return jsonify({"error": "Prompt parametresi zorunludur"}), 400
        
    output_path = "/content/generated_anchor.png"
    flush_memory()
    pipe = None
    
    try:
        import torch
        if model_type == "flux":
            from diffusers import FluxPipeline
            print("🎨 Flux.1-schnell modeli belleğe yükleniyor...")
            pipe = FluxPipeline.from_pretrained(
                "black-forest-labs/FLUX.1-schnell",
                torch_dtype=torch.bfloat16
            )
            pipe.enable_model_cpu_offload()
            print("🎨 Flux ile görsel üretiliyor...")
            with torch.inference_mode():
                image = pipe(
                    prompt=prompt,
                    guidance_scale=0.0,
                    num_inference_steps=4,
                    max_sequence_length=256
                ).images[0]
        else:
            from diffusers import StableDiffusionPipeline
            print("🎨 DreamShaper 8 modeli belleğe yükleniyor...")
            pipe = StableDiffusionPipeline.from_pretrained(
                "Lykon/dreamshaper-8",
                torch_dtype=torch.float16
            )
            pipe.to("cuda")
            print("🎨 DreamShaper ile görsel üretiliyor...")
            with torch.inference_mode():
                image = pipe(prompt=prompt, num_inference_steps=20).images[0]
                
        image.save(output_path)
        return send_file(output_path, mimetype="image/png")
    except Exception as e:
        print(f"❌ Görsel üretim hatası: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if pipe is not None:
            del pipe
        flush_memory()

@app.route("/verify-libs", methods=["GET"])
def verify_libs():
    report = {}
    success = True
    
    # 1. PyTorch / CUDA
    try:
        import torch
        report["torch"] = {"status": "ok", "version": torch.__version__, "cuda": torch.cuda.is_available()}
    except Exception as e:
        report["torch"] = {"status": "error", "message": str(e)}
        success = False

    # 2. Diffusers / Transformers
    try:
        import diffusers
        import transformers
        report["diffusers"] = {"status": "ok", "version": diffusers.__version__}
        report["transformers"] = {"status": "ok", "version": transformers.__version__}
    except Exception as e:
        report["diffusers"] = {"status": "error", "message": str(e)}
        success = False

    # 3. Rembg (Arka Plan Temizleme)
    try:
        import rembg
        report["rembg"] = {"status": "ok"}
    except Exception as e:
        report["rembg"] = {"status": "error", "message": str(e)}
        success = False

    # 4. AudioLDM2 (SFX)
    try:
        from diffusers import AudioLDM2Pipeline
        report["audioldm2"] = {"status": "ok"}
    except Exception as e:
        report["audioldm2"] = {"status": "error", "message": str(e)}
        success = False

    # 5. Wav2Lip
    try:
        import sys
        if "/content/Wav2Lip" not in sys.path:
            sys.path.insert(0, "/content/Wav2Lip")
        from Wav2Lip.inference import load_model
        report["wav2lip"] = {"status": "ok"}
    except Exception as e:
        report["wav2lip"] = {"status": "error", "message": str(e)}
        success = False

    # 6. Faster Whisper
    try:
        from faster_whisper import WhisperModel
        report["faster_whisper"] = {"status": "ok"}
    except Exception as e:
        report["faster_whisper"] = {"status": "error", "message": str(e)}
        success = False

    # 6b. OpenAI Whisper
    try:
        import whisper
        report["whisper"] = {"status": "ok"}
    except Exception as e:
        report["whisper"] = {"status": "error", "message": str(e)}
        success = False

    # 7. face_recognition & OpenCV & imageio
    try:
        import cv2
        import numpy
        import imageio
        import face_recognition
        report["helpers"] = {"status": "ok"}
    except Exception as e:
        report["helpers"] = {"status": "error", "message": str(e)}
        success = False

    # 8. Rubberband (pyrubberband)
    try:
        import pyrubberband
        import soundfile
        report["rubberband"] = {"status": "ok"}
    except Exception as e:
        report["rubberband"] = {"status": "error", "message": str(e)}
        success = False

    # 9. GFPGAN
    try:
        from gfpgan import GFPGANer
        report["gfpgan"] = {"status": "ok"}
    except Exception as e:
        report["gfpgan"] = {"status": "error", "message": str(e)}
        success = False

    # 10. RealESRGAN
    try:
        from realesrgan import RealESRGANer
        report["realesrgan"] = {"status": "ok"}
    except Exception as e:
        report["realesrgan"] = {"status": "error", "message": str(e)}
        success = False

    return jsonify({
        "success": success,
        "report": report
    }), 200 if success else 500

# ── TEST-MODELS ENDPOINT ─────────────────────────────────────────────────────
@app.route("/test-models", methods=["POST"])
def test_models():
    """
    Her video modelinin pipeline sınıfını import edilebilirlik açısından test eder.
    Ağırlıkları yüklemez, sadece sınıfın var olup olmadığını kontrol eder.
    """
    from importlib import import_module

    test_cases = [
        ("CogVideoX-5b", "diffusers", "CogVideoXPipeline"),
        ("CogVideoX-2b", "diffusers", "CogVideoXPipeline"),
        ("Wan2.1", "diffusers", "WanAnimatePipeline"),
        ("HunyuanVideo", "diffusers", "HunyuanVideoPipeline"),
        ("LTX-Video", "diffusers", "LTXPipeline"),
    ]

    models_result = {}
    all_ok = True
    for model_name, module_name, class_name in test_cases:
        try:
            mod = import_module(module_name)
            getattr(mod, class_name)
            models_result[model_name] = {"loaded": True}
        except (ImportError, AttributeError) as e:
            models_result[model_name] = {"loaded": False, "error": str(e)}
            all_ok = False

    gpu_info = {}
    if torch.cuda.is_available():
        try:
            device = torch.cuda.current_device()
            props = torch.cuda.get_device_properties(device)
            gpu_info = {
                "gpu_name": props.name,
                "total_vram_gb": round(props.total_memory / 1e9, 2),
                "cuda_version": torch.version.cuda or "unknown",
            }
        except Exception as e:
            gpu_info = {"error": str(e)}

    # Belleği temizle
    flush_memory()

    return jsonify({
        "success": all_ok,
        "models": models_result,
        "gpu": gpu_info,
    })


# ── GPU-INFO ENDPOINT ────────────────────────────────────────────────────────
@app.route("/gpu-info", methods=["GET"])
def gpu_info_route():
    """GPU adı, VRAM, CUDA sürümü ve L4 kontrolü döndürür."""
    if not torch.cuda.is_available():
        return jsonify({"error": "CUDA kullanılamıyor"}), 503

    device = torch.cuda.current_device()
    props = torch.cuda.get_device_properties(device)
    name = props.name
    vram_gb = round(props.total_memory / 1e9, 2)

    return jsonify({
        "gpu_name": name,
        "vram_gb": vram_gb,
        "cuda_version": torch.version.cuda or "unknown",
        "is_l4": "L4" in name,
    })


# ── 6. KAPAK RESMİ ÜRETİMİ (DreamShaper 8 - SD 1.5) ───────────────────────────
COVER_PATHS = ["/content/cover_0.jpg", "/content/cover_1.jpg", "/content/cover_2.jpg"]

# ── 6a. GFPGAN YÜZ DÜZELTME (stable-diffusion-webui) ────────────────────────
def enhance_face_gfpgan(image_path):
    if not GFPGAN_AVAILABLE:
        print("⚠️ GFPGAN kurulu değil, yüz düzeltme atlanıyor")
        return image_path

    print("🎭 GFPGAN yüz düzeltme uygulanıyor...")
    try:
        enhancer = GFPGANer(
            model_path='GFPGANv1.4',
            upscale=1,
            arch='clean',
            channel_multiplier=2,
            bg_upsampler=None,
        )
        img = cv2.imread(image_path)
        if img is None:
            return image_path
        _, _, restored = enhancer.enhance(img, has_aligned=False, only_center_face=False, paste_back=True)
        cv2.imwrite(image_path, restored)
        print("✅ GFPGAN yüz düzeltme tamam")
    except Exception as e:
        print(f"⚠️ GFPGAN hatası (atlanıyor): {e}")

    return image_path


# ── 6b. RealESRGAN ÇÖZÜNÜRLÜK YÜKSELTME (stable-diffusion-webui) ────────────
def upscale_image_realesrgan(image_path, scale=2):
    if not ESRGAN_AVAILABLE:
        print("⚠️ RealESRGAN kurulu değil, upscale atlanıyor")
        return image_path

    print(f"🔍 RealESRGAN {scale}x çözünürlük yükseltme uygulanıyor...")
    try:
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=scale)
        upsampler = RealESRGANer(
            scale=scale,
            model_path='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth',
            model=model,
            tile=400,
            tile_pad=10,
            pre_pad=0,
            half=True if torch.cuda.is_available() else False,
        )
        img = cv2.imread(image_path)
        if img is None:
            return image_path
        output, _ = upsampler.enhance(img, outscale=scale)
        cv2.imwrite(image_path, output)
        print(f"✅ RealESRGAN {scale}x upscale tamam")
    except Exception as e:
        print(f"⚠️ RealESRGAN hatası (atlanıyor): {e}")

    return image_path


def generate_covers_lazy(prompt: str):
    """
    Lykon/dreamshaper-8 ile 3 alternatif kapak resmi üretir.
    Bellek yönetimi için iş bittiğinde pipeline temizlenir.
    """
    flush_memory()
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0

    print("🎨 Kapak resimleri için Stable Diffusion (DreamShaper 8) belleğe yükleniyor...")
    pipe = DiffusionPipeline.from_pretrained(
        "Lykon/dreamshaper-8",
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True
    )
    if vram_gb >= 18.0:
        print(f"⚡ Güçlü GPU ({vram_gb:.1f}GB) — doğrudan CUDA.")
        pipe = pipe.to("cuda")
    else:
        print(f"🐢 Düşük GPU ({vram_gb:.1f}GB) — CPU offload etkin.")
        pipe.enable_model_cpu_offload()
    
    print("🎨 3 adet alternatif kapak resmi üretiliyor...")
    try:
        for i in range(3):
            with torch.inference_mode():
                img = pipe(prompt=prompt, num_inference_steps=20, height=512, width=512).images[0]
                img.save(COVER_PATHS[i])
                print(f"✅ Kapak {i} kaydedildi: {COVER_PATHS[i]}")
                enhance_face_gfpgan(COVER_PATHS[i])
                upscale_image_realesrgan(COVER_PATHS[i], scale=2)
    except Exception as exc:
        print(f"❌ Kapak üretimi sırasında hata: {exc}")
        raise
    finally:
        del pipe
        flush_memory()

@app.route("/generate-covers", methods=["POST"])
def generate_covers():
    data = request.get_json(force=True)
    cover_prompt = data.get("cover_prompt", "")
    job_id = data.get("job_id")
    callback_url = data.get("callback_url")
    if not cover_prompt:
        return jsonify({"status": "error", "message": "cover_prompt parametresi zorunludur"}), 400
    
    try:
        generate_covers_lazy(cover_prompt)
        
        # Kapaklar üretildikten sonra callback ile push et
        if callback_url and job_id:
            print(f"📤 Kapaklar Node.js'e gönderiliyor... Job: {job_id}")
            files = {}
            for i in range(3):
                path_i = COVER_PATHS[i]
                if os.path.exists(path_i):
                    files[f'cover_{i}'] = open(path_i, 'rb')
            payload = {
                "job_id": job_id,
                "status": "success",
                "type": "covers",
                "message": "Kapak tasarımları başarıyla tamamlandı."
            }
            DIAGNOSTICS["callbacks"]["total_attempted"] += 1
            DIAGNOSTICS["callbacks"]["last_sent_at"] = datetime.datetime.now().isoformat()
            DIAGNOSTICS["callbacks"]["last_url"] = callback_url
            try:
                bypass_headers = {
                    "ngrok-skip-browser-warning": "any-value",
                    "bypass-tunnel-reminder": "true"
                }
                response = requests.post(callback_url, data=payload, files=files, headers=bypass_headers, timeout=60)
                print(f"📩 Kapak callback yanıtı: {response.status_code}")
                DIAGNOSTICS["callbacks"]["last_status_code"] = response.status_code
                if response.status_code in [200, 201, 202]:
                    DIAGNOSTICS["callbacks"]["total_success"] += 1
                    DIAGNOSTICS["callbacks"]["tunnel_connectivity"] = "healthy"
                    log_diagnostic_activity(f"Kapak callback başarıyla gönderildi: {callback_url}")
                else:
                    DIAGNOSTICS["callbacks"]["total_failed"] += 1
                    DIAGNOSTICS["callbacks"]["tunnel_connectivity"] = "unhealthy"
                    log_diagnostic_activity(f"Kapak callback başarısız (status {response.status_code}): {callback_url}")
            except Exception as e:
                DIAGNOSTICS["callbacks"]["total_failed"] += 1
                DIAGNOSTICS["callbacks"]["last_error"] = str(e)
                DIAGNOSTICS["callbacks"]["tunnel_connectivity"] = "failed"
                log_diagnostic_activity(f"Kapak callback gönderim hatası: {e}")
                print(f"❌ Kapak callback gönderilemedi: {e}")
                
        return jsonify({"status": "success", "message": "3 alternatif kapak resmi başarıyla üretildi"})
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500

@app.route("/download/cover/<int:index>")
def download_cover(index):
    if index < 0 or index > 2:
        return jsonify({"error": "Geçersiz index (0-2 olmalı)"}), 400
    path = COVER_PATHS[index]
    if not os.path.exists(path):
        return jsonify({"error": "Kapak görseli bulunamadı"}), 404
    return send_file(path, mimetype="image/jpeg")

# ── B-ROLL ÜRETİMİ (Pexels / Pixabay + AI Video Fallback) ──────────────────────
@app.route("/generate-broll", methods=["POST"])
def generate_broll():
    data = request.json
    prompt = data.get("prompt", "")
    scene_number = data.get("scene_number", 1)
    duration = data.get("duration", 6)
    job_id = data.get("job_id", 1)

    print(f"🎥 B-roll üretiliyor. Prompt: {prompt}")

    pexels_key = os.environ.get("PEXELS_API_KEY", "")
    broll_path = f"/content/broll_{job_id}_{scene_number}.mp4"

    if pexels_key:
        try:
            headers = {"Authorization": pexels_key}
            url = f"https://api.pexels.com/videos/search?query={prompt}&per_page=5"
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                videos = res.json().get("videos", [])
                if videos:
                    video_files = videos[0].get("video_files", [])
                    mp4_files = [f for f in video_files if f.get("file_type") == "video/mp4"]
                    if mp4_files:
                        download_url = mp4_files[0].get("link")
                        print(f"📥 Telifsiz Pexels videosu indiriliyor: {download_url}")
                        video_data = requests.get(download_url, timeout=30).content
                        with open(broll_path, "wb") as f:
                            f.write(video_data)
                        
                        temp_cut = f"/content/broll_cut_{job_id}_{scene_number}.mp4"
                        import subprocess
                        subprocess.run([
                            "ffmpeg", "-y", "-i", broll_path, 
                            "-t", str(duration), "-c:v", "libx264", 
                            "-pix_fmt", "yuv420p", "-an", temp_cut
                        ])
                        if os.path.exists(temp_cut):
                            os.rename(temp_cut, broll_path)
                        return jsonify({"status": "success", "source": "pexels", "download_url": f"/download/broll/{job_id}/{scene_number}"})
        except Exception as e:
            print(f"⚠️ Pexels video indirme hatası, AI fallback: {e}")

    # AI Fallback (fallback chain ile: CogVideoX-5b → CogVideoX-2b → LTX-Video)
    try:
        print("🤖 AI Fallback ile video üretiliyor...")
        black_img_path = "/content/black.jpg"
        if not os.path.exists(black_img_path):
            black_img = np.zeros((1920, 1080, 3), dtype=np.uint8)
            cv2.imwrite(black_img_path, black_img)
        
        broll_chain = ["CogVideoX-5b-I2V", "CogVideoX-2b-I2V", "LTX-Video-I2V"]
        video_frames = None
        for br_model in broll_chain:
            try:
                video_frames = generate_video_image_lazy(prompt, black_img_path, video_model=br_model)
                print(f"✅ B-roll {br_model} ile üretildi")
                break
            except Exception as br_e:
                print(f"⚠️ B-roll model {br_model} başarısız: {br_e}")
                flush_memory()
                continue
        if video_frames is None:
            raise RuntimeError("Tüm B-roll modelleri başarısız.")
        from diffusers.utils import export_to_video
        export_to_video(video_frames, broll_path, fps=8)
        return jsonify({"status": "success", "source": "ai", "download_url": f"/download/broll/{job_id}/{scene_number}"})
    except Exception as ai_e:
        print(f"❌ AI Fallback video üretimi hatası: {ai_e}")
        try:
            black_img_path = "/content/black.jpg"
            if not os.path.exists(black_img_path):
                black_img = np.zeros((1920, 1080, 3), dtype=np.uint8)
                cv2.imwrite(black_img_path, black_img)
            import subprocess
            subprocess.run([
                "ffmpeg", "-y", "-loop", "1", "-i", black_img_path, 
                "-t", str(duration), "-c:v", "libx264", 
                "-pix_fmt", "yuv420p", broll_path
            ])
            return jsonify({"status": "success", "source": "static_fallback", "download_url": f"/download/broll/{job_id}/{scene_number}"})
        except Exception as f_e:
            return jsonify({"status": "error", "message": str(f_e)}), 500

# ── DUBLAJ VE YERELLEŞTİRME (XTTS v2 + Lip Sync v2) ───────────────────────────
@app.route("/localize-dubbing", methods=["POST"])
def localize_dubbing():
    data = request.json
    speech_text = data.get("speech_text", "")
    target_lang = data.get("target_lang", "en")
    job_id = data.get("job_id", 1)
    scene_number = data.get("scene_number", 1)
    ref_audio_b64 = data.get("reference_audio_base64", "")
    speaker_wav = data.get("speaker_wav", "/content/karakter.wav")

    print(f"🎙️ Dublaj yerelleştirmesi başlıyor. Dil: {target_lang}")

    out_audio_path = f"/content/localized_speech_{job_id}_{scene_number}.wav"
    
    temp_ref_path = None
    if ref_audio_b64:
        try:
            import tempfile
            temp_ref = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            clean_b64 = ref_audio_b64.split("base64,")[-1]
            temp_ref.write(base64.b64decode(clean_b64))
            temp_ref.close()
            speaker_wav = temp_ref.name
            temp_ref_path = temp_ref.name
        except Exception as e:
            print(f"[WARN] Base64 referans ses çözülemedi: {e}")

    try:
        model = load_tts_model()
        if speaker_wav and os.path.exists(speaker_wav):
            print(f"🎙️ Dublaj için referans ses üzerinden klonlama yapılıyor: {speaker_wav}")
            model.tts_to_file(text=speech_text, speaker_wav=speaker_wav, language=target_lang, file_path=out_audio_path)
        else:
            print("🎙️ Referans ses bulunamadı, varsayılan ses ile dublaj sentezleniyor.")
            model.tts_to_file(text=speech_text, speaker="Claribel Dervla", language=target_lang, file_path=out_audio_path)
    except Exception as tts_e:
        print(f"❌ XTTS dublaj sentezleme hatası: {tts_e}")
        try:
            print("🎙️ XTTS dublaj sentezi başarısız, Edge-TTS fallback deneniyor...")
            voice_map = {"en": "en-US-AriaNeural", "tr": "tr-TR-EmelNeural", "es": "es-ES-ElviraNeural", "de": "de-DE-KatjaNeural", "fr": "fr-FR-DeniseNeural"}
            fallback_voice = voice_map.get(target_lang, "en-US-AriaNeural")
            generate_tts_edge(speech_text, out_audio_path, voice=fallback_voice)
        except Exception as fallback_e:
            return jsonify({"status": "error", "message": f"TTS Dubbing fallback failed: {fallback_e}"}), 500
    finally:
        if temp_ref_path and os.path.exists(temp_ref_path):
            try: os.unlink(temp_ref_path)
            except: pass

    out_video_path = f"/content/localized_video_{job_id}_{scene_number}.mp4"
    try:
        local_video_path = f"/content/ms_{job_id}_{scene_number}.mp4"
        if not os.path.exists(local_video_path) and os.path.exists(LAST_VIDEO_PATH):
            local_video_path = LAST_VIDEO_PATH
        
        # apply_lipsync_internal: Wav2Lip ile gerçek lip-sync uygula
        lipsync_result = apply_lipsync_internal(local_video_path, out_audio_path)
        if lipsync_result.get("success") and lipsync_result.get("output_path"):
            import shutil
            shutil.copyfile(lipsync_result["output_path"], out_video_path)
        else:
            raise RuntimeError(lipsync_result.get("error", "Lip-sync atlandı"))
    except Exception as lip_e:
        print(f"⚠️ Lip-sync dublaj hatası, FFmpeg fallback: {lip_e}")
        import subprocess
        subprocess.run([
            "ffmpeg", "-y", "-i", local_video_path, "-i", out_audio_path,
            "-c:v", "copy", "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0",
            "-shortest", out_video_path
        ])

    return jsonify({
        "status": "success",
        "video_url": f"/download/localized/video/{job_id}/{scene_number}",
        "audio_url": f"/download/localized/audio/{job_id}/{scene_number}"
    })

@app.route("/download/broll/<int:job_id>/<int:scene_number>", methods=["GET"])
def download_broll_file(job_id, scene_number):
    path = f"/content/broll_{job_id}_{scene_number}.mp4"
    if not os.path.exists(path):
        return jsonify({"error": "B-roll bulunamadı"}), 404
    return send_file(path, mimetype="video/mp4")

@app.route("/download/localized/video/<int:job_id>/<int:scene_number>", methods=["GET"])
def download_localized_video(job_id, scene_number):
    path = f"/content/localized_video_{job_id}_{scene_number}.mp4"
    if not os.path.exists(path):
        return jsonify({"error": "Localized video bulunamadı"}), 404
    return send_file(path, mimetype="video/mp4")

@app.route("/download/localized/audio/<int:job_id>/<int:scene_number>", methods=["GET"])
def download_localized_audio(job_id, scene_number):
    path = f"/content/localized_speech_{job_id}_{scene_number}.wav"
    if not os.path.exists(path):
        return jsonify({"error": "Localized audio bulunamadı"}), 404
    return send_file(path, mimetype="audio/wav")

# ── AVATAR ÜRETİMİ (Stable Diffusion) ──────────────────────────────────────────
@app.route("/generate-avatar", methods=["POST"])
def generate_avatar():
    global last_activity
    last_activity = time.time()
    
    data = request.get_json(force=True) or {}
    avatar_prompt = data.get("avatar_prompt")
    if not avatar_prompt:
        return jsonify({"error": "avatar_prompt zorunludur"}), 400

    style = data.get("style", "realistic")

    try:
        flush_memory()
        print("🎨 Karakter avatarı için Stable Diffusion (DreamShaper 8) yükleniyor...")
        pipe = DiffusionPipeline.from_pretrained(
            "Lykon/dreamshaper-8",
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True
        )
        pipe.to("cuda")

        if style == "animatic":
            avatar_prompt = f"Pixar style animated character portrait, colorful cartoon headshot, {avatar_prompt}, vibrant gradient background, 3D render style"
        else:
            avatar_prompt = f"Cinematic portrait profile picture, high quality realistic headshot of {avatar_prompt}, solid dark background, professional lighting"

        print(f"🎨 Karakter avatarı üretiliyor (style={style})...")
        with torch.inference_mode():
            img = pipe(prompt=avatar_prompt, num_inference_steps=25, height=512, width=512).images[0]
            
        temp_path = "/content/temp_avatar.jpg"
        img.save(temp_path)
        
        enhance_face_gfpgan(temp_path)
        upscale_image_realesrgan(temp_path, scale=2)
        
        with open(temp_path, "rb") as f:
            b64_data = base64.b64encode(f.read()).decode("utf-8")
            
        avatar_base64 = f"data:image/jpeg;base64,{b64_data}"
        
        del pipe
        flush_memory()
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return jsonify({"status": "success", "avatar_base64": avatar_base64}), 200
    except Exception as exc:
        print(f"❌ Avatar üretimi başarısız: {exc}")
        flush_memory()
        return jsonify({"error": str(exc)}), 500


# ── MUSETALK: SESLİ AVATAR (Talking Head) ─────────────────────────────────────
MUSETALK_MODEL = None
MUSETALK_DIR = "/content/MuseTalk"

def load_musetalk():
    global MUSETALK_MODEL
    if MUSETALK_MODEL is not None:
        return MUSETALK_MODEL if MUSETALK_MODEL else None
    try:
        import sys
        if MUSETALK_DIR not in sys.path:
            sys.path.insert(0, MUSETALK_DIR)
        print("🎭 MuseTalk modeli yükleniyor...")
        from musetalk.utils import MuseTalkWrapper
        MUSETALK_MODEL = MuseTalkWrapper()
        print("[INFO] MuseTalk modeli yüklendi")
        return MUSETALK_MODEL
    except Exception as e:
        print(f"[WARN] MuseTalk yüklenemedi: {e}")
        MUSETALK_MODEL = False
        return None

@app.route("/api/v1/musetalk", methods=["POST"])
def musetalk_endpoint():
    global last_activity
    last_activity = time.time()
    try:
        if "face" not in request.files or "audio" not in request.files:
            return jsonify({"error": "face (image) ve audio (wav) gerekli"}), 400

        face_file = request.files["face"]
        audio_file = request.files["audio"]
        bbox = request.form.get("bbox", "")  # optional: x1,y1,x2,y2

        face_path = "/content/temp_mt_face.jpg"
        audio_path = "/content/temp_mt_audio.wav"
        face_file.save(face_path)
        audio_file.save(audio_path)

        model = load_musetalk()
        if not model:
            return jsonify({
                "error": "MuseTalk modeli yüklenemedi",
                "skipped": True
            }), 503

        output_path = "/content/temp_mt_output.mp4"
        try:
            if bbox and len(bbox.split(",")) == 4:
                coords = tuple(int(x.strip()) for x in bbox.split(","))
                model.generate(face_path, audio_path, output_path, bbox=coords)
            else:
                model.generate(face_path, audio_path, output_path)
            if os.path.exists(output_path):
                with open(output_path, "rb") as f:
                    data = f.read()
                for p in [face_path, audio_path, output_path]:
                    if os.path.exists(p): os.remove(p)
                return data, 200, {"Content-Type": "video/mp4"}
        except Exception as gen_err:
            print(f"❌ MuseTalk generation error: {gen_err}")
            for p in [face_path, audio_path]:
                if os.path.exists(p): os.remove(p)
            return jsonify({"error": f"MuseTalk error: {str(gen_err)}"}), 500
    except Exception as exc:
        print(f"❌ MuseTalk endpoint error: {exc}")
        return jsonify({"error": str(exc)}), 500

@app.route("/api/v1/musetalk/preload", methods=["POST"])
def musetalk_preload():
    """Pre-load MuseTalk model without generating video."""
    try:
        model = load_musetalk()
        if model:
            return jsonify({"status": "success", "message": "MuseTalk model loaded"}), 200
        else:
            return jsonify({"status": "error", "message": "MuseTalk could not be loaded"}), 503
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── LIP-SYNC COMBO: Wav2Lip + MuseTalk ───────────────────────────────────────
@app.route("/api/v1/lipsync/combo", methods=["POST"])
def lipsync_combo_endpoint():
    """
    Kombinasyon lip-sync: once Wav2Lip uygula, ardindan MuseTalk ile refine.
    Body: video_path, audio_path, face_image_path (opsiyonel)
    """
    global last_activity
    last_activity = time.time()

    data = request.get_json(force=True) or {}
    video_path = data.get("video_path")
    audio_path = data.get("audio_path")
    face_image_path = data.get("face_image_path")  # optional reference face

    if not video_path or not audio_path:
        return jsonify({"error": "video_path ve audio_path zorunlu"}), 400
    if not os.path.exists(video_path):
        return jsonify({"error": f"Video bulunamadı: {video_path}"}), 404
    if not os.path.exists(audio_path):
        return jsonify({"error": f"Audio bulunamadı: {audio_path}"}), 404

    temp_dir = "/content/combo_lipsync"
    os.makedirs(temp_dir, exist_ok=True)
    step1_path = os.path.join(temp_dir, f"step1_wav2lip_{uuid.uuid4().hex[:8]}.mp4")
    final_path = os.path.join(temp_dir, f"step2_musetalk_{uuid.uuid4().hex[:8]}.mp4")

    try:
        # Adim 1: Wav2Lip
        print("[COMBO] Adim 1/2: Wav2Lip uygulaniyor...")
        w2l_result = apply_lipsync_internal(video_path, audio_path)
        if w2l_result.get("success") and w2l_result.get("output_path"):
            shutil.copyfile(w2l_result["output_path"], step1_path)
        else:
            print(f"[COMBO] Wav2Lip atlandi: {w2l_result.get('error', 'bilinmeyen')}. Orijinal video kullaniliyor.")
            shutil.copyfile(video_path, step1_path)

        # Adim 2: MuseTalk refine
        print("[COMBO] Adim 2/2: MuseTalk refine uygulaniyor...")
        mt_model = load_musetalk()
        if not mt_model:
            print("[COMBO] MuseTalk yuklenemedi, Wav2Lip sonucu donduruluyor.")
            with open(step1_path, "rb") as f:
                data_bytes = f.read()
            for p in [step1_path]:
                if os.path.exists(p): os.remove(p)
            return data_bytes, 200, {"Content-Type": "video/mp4"}

        # Yuz tespiti icin ilk kareyi cikart
        face_for_mt = "/content/combo_temp_face.jpg"
        cap = cv2.VideoCapture(step1_path)
        ret, frame = cap.read()
        if ret:
            cv2.imwrite(face_for_mt, frame)
        cap.release()
        if not ret or not os.path.exists(face_for_mt):
            with open(step1_path, "rb") as f:
                data_bytes = f.read()
            for p in [step1_path]:
                if os.path.exists(p): os.remove(p)
            return data_bytes, 200, {"Content-Type": "video/mp4"}

        try:
            mt_model.generate(face_for_mt, audio_path, final_path)
        except Exception as mt_err:
            print(f"[COMBO] MuseTalk hatasi, Wav2Lip sonucu donduruluyor: {mt_err}")
            with open(step1_path, "rb") as f:
                data_bytes = f.read()
            for p in [step1_path, face_for_mt]:
                if os.path.exists(p): os.remove(p)
            return data_bytes, 200, {"Content-Type": "video/mp4"}

        if os.path.exists(final_path):
            with open(final_path, "rb") as f:
                data_bytes = f.read()
            for p in [step1_path, final_path, face_for_mt]:
                if os.path.exists(p): os.remove(p)
            return data_bytes, 200, {"Content-Type": "video/mp4"}
        else:
            raise RuntimeError("MuseTalk cikti olusmadi")

    except Exception as e:
        print(f"[COMBO] Kombinasyon lipsync hatasi: {e}")
        for p in [step1_path, final_path]:
            if os.path.exists(p): os.remove(p)
        return jsonify({"error": str(e)}), 500


# ── SPLIT SCREEN: Preview ve Apply ────────────────────────────────────────────
@app.route("/api/v1/split/preview", methods=["GET"])
def split_preview():
    """
    Split-screen onizlemesi icin referans goruntu dondurur.
    Query: layout (50/50, 70/30, ...), position (top, bottom, left, right)
    """
    layout = request.args.get("layout", "50/50")
    position = request.args.get("position", "top")

    preview_w, preview_h = 640, 360
    img = np.zeros((preview_h, preview_w, 3), dtype=np.uint8)

    if position in ("left", "right"):
        split_x = int(preview_w * (int(layout[:2]) / 100))
        if position == "left":
            img[:, :split_x] = [255, 255, 255]
        else:
            img[:, split_x:] = [255, 255, 255]
    else:
        split_y = int(preview_h * (int(layout[:2]) / 100))
        if position == "top":
            img[:split_y, :] = [255, 255, 255]
        else:
            img[split_y:, :] = [255, 255, 255]

    temp_preview = f"/content/split_preview_{uuid.uuid4().hex[:8]}.jpg"
    cv2.imwrite(temp_preview, img)

    try:
        return send_file(temp_preview, mimetype="image/jpeg")
    finally:
        if os.path.exists(temp_preview):
            try: os.remove(temp_preview)
            except: pass


@app.route("/api/v1/split/apply", methods=["POST"])
def split_apply():
    """
    Split-screen konfigurasyonunu kaydeder (simdilik diskte .json olarak saklanir).
    Body: job_id, layout, position, primary_video_path, secondary_video_path
    """
    data = request.get_json(force=True) or {}
    job_id = data.get("job_id")
    layout = data.get("layout", "50/50")
    position = data.get("position", "top")
    primary_path = data.get("primary_video_path", "")
    secondary_path = data.get("secondary_video_path", "")

    if not job_id:
        return jsonify({"error": "job_id zorunludur"}), 400

    config_path = f"/content/split_config_{job_id}.json"
    config = {
        "job_id": job_id,
        "layout": layout,
        "position": position,
        "primary_video_path": primary_path,
        "secondary_video_path": secondary_path
    }

    import json
    with open(config_path, "w") as f:
        json.dump(config, f)

    print(f"[SPLIT] Konfigurasyon kaydedildi: {config_path}")
    return jsonify({"status": "success", "config_path": config_path}), 200


# ── AI STUDIO: SMART REFRAME ──────────────────────────────────────────────────
@app.route("/api/v1/studio/smart-reframe", methods=["POST"])
def studio_smart_reframe():
    global last_activity
    last_activity = time.time()
    try:
        if "video" not in request.files:
            return jsonify({"error": "video gerekli"}), 400
        video = request.files["video"]
        options = request.form.get("options", "{}")
        opts = json.loads(options) if isinstance(options, str) else options

        input_path = "/content/temp_reframe_input.mp4"
        video.save(input_path)

        output_path = "/content/temp_reframe_output.mp4"
        target_w = opts.get("outputWidth", 1080)
        target_h = opts.get("outputHeight", 1920)

        import subprocess
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vf", f"crop={target_w}:{target_h}:(in_w-{target_w})/2:(in_h-{target_h})/2",
            "-c:a", "aac", "-c:v", "h264_nvenc", "-preset", "fast",
            output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)

        with open(output_path, "rb") as f:
            data = f.read()
        for p in [input_path, output_path]:
            if os.path.exists(p): os.remove(p)
        return data, 200, {"Content-Type": "video/mp4"}
    except Exception as exc:
        print(f"❌ Smart reframe hatasi: {exc}")
        return jsonify({"error": str(exc)}), 500


# ── AI STUDIO: STUDIO SOUND ───────────────────────────────────────────────────
@app.route("/api/v1/studio/studio-sound", methods=["POST"])
def studio_sound():
    global last_activity
    last_activity = time.time()
    try:
        if "video" not in request.files:
            return jsonify({"error": "video gerekli"}), 400
        video = request.files["video"]
        options = request.form.get("options", "{}")
        opts = json.loads(options) if isinstance(options, str) else options

        input_path = "/content/temp_sound_input.mp4"
        video.save(input_path)

        output_path = "/content/temp_sound_output.mp4"

        denoise = opts.get("denoise", True)
        deecho = opts.get("deecho", True)
        equalize = opts.get("equalize", False)
        level_db = opts.get("levelDb", -3)

        filter_parts = [
            "highpass=f=200",
            "lowpass=f=3000",
        ]
        if denoise:
            filter_parts.append("afftdn=nr=10:nf=-20")
        if deecho:
            filter_parts.append("anlmdn=s=7:p=0.005")
            filter_parts.append("dynaudnorm=g=15:f=150")
        if equalize:
            filter_parts.append("equalizer=f=3000:t=h:width_type=s:width=0.5:g=2")
            filter_parts.append("equalizer=f=300:t=h:width_type=s:width=0.5:g=-1")
        filter_parts.append(f"loudnorm=I={level_db}:LRA=11:TP={level_db + 1}")

        filter_chain = ",".join(filter_parts)

        import subprocess
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-af", filter_chain,
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)

        with open(output_path, "rb") as f:
            data = f.read()
        for p in [input_path, output_path]:
            if os.path.exists(p): os.remove(p)
        return data, 200, {"Content-Type": "video/mp4"}
    except Exception as exc:
        print(f"❌ Studio sound hatasi: {exc}")
        return jsonify({"error": str(exc)}), 500


# ── SHUTDOWN ENDPOINT ─────────────────────────────────────────────────────────
@app.route("/shutdown", methods=["POST"])
def shutdown_server():
    print("[INFO] Kapatma isteği alındı. Google Colab oturumu sonlandırılıyor...")
    
    import threading
    import os
    import signal
    
    def do_unassign():
        time.sleep(2)
        try:
            # google.colab.runtime unassign API'sini çağıralım
            from google.colab import runtime
            runtime.unassign()
            print("[INFO] unassign() başarıyla tetiklendi.")
        except Exception as e:
            print(f"[ERROR] unassign() başarısız, process kill deneniyor: {e}")
            # unassign başarısız olursa python kernel'ini öldürelim
            os.kill(os.getpid(), signal.SIGTERM)
            
    threading.Thread(target=do_unassign).start()
    return jsonify({"status": "shutdown_triggered", "message": "Colab oturumu kapatılıyor."}), 200

# ── HEALTH CHECK ──────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health_check():
    gpu_total_gb = 0.0
    gpu_used_gb = 0.0
    gpu_pct = 0.0
    gpu_model = None
    
    if torch.cuda.is_available():
        try:
            device = torch.cuda.current_device()
            gpu_model = torch.cuda.get_device_name(device)
            gpu_total_gb = torch.cuda.get_device_properties(device).total_memory / (1024**3)
            gpu_used_gb = torch.cuda.memory_allocated(device) / (1024**3)
            gpu_pct = (gpu_used_gb / gpu_total_gb) * 100 if gpu_total_gb > 0 else 0.0
        except Exception:
            pass
            
    uptime_seconds = int(time.time() - server_start_time)
    
    # Tünel bağlantısını test et
    DIAGNOSTICS["callbacks"]["tunnel_connectivity"] = check_tunnel_connectivity()
    
    # Yüklü olan modelleri belirle
    models_loaded = {
        "tts": TTS_MODEL is not None,
        "wav2lip": WAV2LIP_MODEL is not None and WAV2LIP_MODEL is not False,
        "whisper": _whisper_model is not None,
        "musetalk": MUSETALK_MODEL is not None and MUSETALK_MODEL is not False
    }
    
    return jsonify({
        "status": "healthy",
        "memory": {
            "gpu_total_gb": gpu_total_gb,
            "gpu_used_gb": gpu_used_gb
        },
        "gpu_utilization": {
            "gpu_pct": gpu_pct
        },
        "gpu_model": gpu_model,
        "runtime": {
            "uptime_seconds": uptime_seconds
        },
        "diagnostics": {
            "total_jobs_received": DIAGNOSTICS["total_jobs_received"],
            "total_jobs_success": DIAGNOSTICS["total_jobs_success"],
            "total_jobs_failed": DIAGNOSTICS["total_jobs_failed"],
            "last_job_time": DIAGNOSTICS["last_job_time"],
            "last_job_status": DIAGNOSTICS["last_job_status"],
            "last_job_error": DIAGNOSTICS["last_job_error"],
            "callbacks": DIAGNOSTICS["callbacks"],
            "outputs": DIAGNOSTICS["outputs"],
            "models_loaded": models_loaded,
            "recent_activities": DIAGNOSTICS["recent_activities"]
        }
    })

# ── BAŞLATMA (KRİTİK GÜNCELLEME) ──────────────────────────────────────────────
if __name__ == "__main__":
    NGROK_TOKEN = os.environ.get("NGROK_TOKEN", "")
    if not NGROK_TOKEN:
        try:
            from google.colab import userdata
            NGROK_TOKEN = userdata.get('NGROK_TOKEN')
        except Exception:
            pass

    if NGROK_TOKEN and len(NGROK_TOKEN.strip()) > 10:
        ngrok.set_auth_token(NGROK_TOKEN)
        public_url = ngrok.connect(5000)
        print("\n🔗 NODE.JS PROJENİZE YAPIŞTIRACAĞINIZ URL:\n", public_url.public_url)
        with open("ngrok_url.txt", "w", encoding="utf-8") as f:
            f.write(public_url.public_url)
        print("\n" + "-" * 50 + "\n")
    else:
        print("\n⚠️ NGROK_TOKEN eksik veya geçersiz.")

    # server_start_time line 71'de modül yüklendiğinde zaten set edilmiştir.
    
    # CRITICAL: debug=False ve threaded=True yapılarak Colab/Ngrok kilitlenmeleri önlendi.
    app.run(port=5000, debug=False, threaded=True, use_reloader=False)

