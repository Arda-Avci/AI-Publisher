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

# ── 1. VİDEO ÜRETİMİ (CogVideoX-5b - Premium 6sn) ───────────────────────────────
def generate_video_image_5b_lazy(prompt: str, image_path: str, task_id: str = None, video_model: str = "CogVideoX-5b-I2V") -> list:
    """
    CogVideoX Image-to-Video ile görselden video üretir. (2b veya 5b)
    """
    from diffusers import CogVideoXImageToVideoPipeline
    from diffusers.utils import load_image
    import inspect
    
    model_name = "THUDM/CogVideoX-5b-I2V"
    if video_model == "CogVideoX-2b-I2V":
        model_name = "THUDM/CogVideoX-2b-I2V"
        
    flush_memory()
    print(f"🎬 Görselden Video motoru ({model_name}) belleğe yükleniyor...")
    pipe = CogVideoXImageToVideoPipeline.from_pretrained(
        model_name,
        torch_dtype=torch.float16
    )
    
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"💾 Tespit Edilen GPU VRAM: {vram_gb:.2f} GB")
    
    if vram_gb >= 18.0:
        print("⚡ Güçlü GPU algılandı. Model tamamen GPU'ya (.to cuda) yükleniyor (Maksimum Hız)...")
        pipe.to("cuda")
        pipe.vae.enable_tiling() # VAE decoding OOM önleme
    else:
        print("🐢 Bellek koruması için CPU Offloading ve VAE Tiling etkinleştiriliyor...")
        pipe.enable_model_cpu_offload()
        pipe.vae.enable_tiling()

    # Callback kurulumu: CogVideoX adımlarını CLI/SSE progress'e yansıtma
    import time as _time
    inference_start_time = _time.time()
    sig = inspect.signature(pipe.__call__)
    callback_kwargs = {}
    if task_id:
        def callback_old(step, timestep, latents):
            pct = 15 + int((step / 30) * 15)
            elapsed = _time.time() - inference_start_time
            steps_done = step + 1
            steps_left = 30 - steps_done
            eta_sec = int((elapsed / steps_done) * steps_left) if steps_done > 0 else 520
            _update_task(task_id, stagePercent=pct, message=f"Video üretiliyor (CogVideoX-5b)... Adım {step}/30", etaSeconds=eta_sec)
            time.sleep(0.01) # GIL'i serbest bırakır
            
        def callback_new(pipe_obj, step, timestep, callback_kwargs_param):
            pct = 15 + int((step / 30) * 15)
            elapsed = _time.time() - inference_start_time
            steps_done = step + 1
            steps_left = 30 - steps_done
            eta_sec = int((elapsed / steps_done) * steps_left) if steps_done > 0 else 520
            _update_task(task_id, stagePercent=pct, message=f"Video üretiliyor (CogVideoX-5b)... Adım {step}/30", etaSeconds=eta_sec)
            time.sleep(0.01) # GIL'i serbest bırakır
            return callback_kwargs_param

        if "callback_on_step_end" in sig.parameters:
            callback_kwargs["callback_on_step_end"] = callback_new
        elif "callback" in sig.parameters:
            callback_kwargs["callback"] = callback_old
            callback_kwargs["callback_steps"] = 1

    print("🎬 Görselden Video üretimi başlatıldı...")
    try:
        init_image = load_image(image_path)
        with torch.inference_mode():
            output = pipe(
                prompt=prompt,
                image=init_image,
                num_frames=49,           # 6 saniye @8fps
                num_inference_steps=30,
                **callback_kwargs
            )
        frames = output.frames[0]
    except torch.cuda.OutOfMemoryError as exc:
        print(f"❌ GPU OOM: {exc}")
        if 'pipe' in locals():
            del pipe
        flush_memory()
        raise RuntimeError("GPU OOM hatası oluştu.") from exc
    except Exception as exc:
        print(f"❌ Video üretim hatası: {exc}")
        if 'pipe' in locals():
            del pipe
        flush_memory()
        raise
    finally:
        if 'pipe' in locals():
            del pipe
        flush_memory()
    return frames

def generate_video_text_5b_lazy(prompt: str, task_id: str = None, video_model: str = "CogVideoX-5b") -> list:
    """
    CogVideoX Text-to-Video ile metinden video üretir. (2b veya 5b)
    """
    from diffusers import CogVideoXPipeline
    import inspect
    
    model_name = "THUDM/CogVideoX-5b"
    if video_model == "CogVideoX-2b":
        model_name = "THUDM/CogVideoX-2b"
        
    flush_memory()
    print(f"🎬 Metinden Video motoru ({model_name}) belleğe yükleniyor...")
    pipe = CogVideoXPipeline.from_pretrained(
        model_name,
        torch_dtype=torch.float16
    )
    
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"💾 Tespit Edilen GPU VRAM: {vram_gb:.2f} GB")
    
    if vram_gb >= 18.0:
        print("⚡ Güçlü GPU algılandı. Model tamamen GPU'ya (.to cuda) yükleniyor (Maksimum Hız)...")
        pipe.to("cuda")
        pipe.vae.enable_tiling() # VAE decoding OOM önleme
    else:
        print("🐢 Bellek koruması için CPU Offloading ve VAE Tiling etkinleştiriliyor...")
        pipe.enable_model_cpu_offload()
        pipe.vae.enable_tiling()

    # Callback kurulumu: CogVideoX adımlarını CLI/SSE progress'e yansıtma
    import time as _time
    inference_start_time = _time.time()
    sig = inspect.signature(pipe.__call__)
    callback_kwargs = {}
    if task_id:
        def callback_old(step, timestep, latents):
            pct = 15 + int((step / 30) * 15)
            elapsed = _time.time() - inference_start_time
            steps_done = step + 1
            steps_left = 30 - steps_done
            eta_sec = int((elapsed / steps_done) * steps_left) if steps_done > 0 else 520
            _update_task(task_id, stagePercent=pct, message=f"Video üretiliyor (CogVideoX-5b)... Adım {step}/30", etaSeconds=eta_sec)
            time.sleep(0.01) # GIL'i serbest bırakır
            
        def callback_new(pipe_obj, step, timestep, callback_kwargs_param):
            pct = 15 + int((step / 30) * 15)
            elapsed = _time.time() - inference_start_time
            steps_done = step + 1
            steps_left = 30 - steps_done
            eta_sec = int((elapsed / steps_done) * steps_left) if steps_done > 0 else 520
            _update_task(task_id, stagePercent=pct, message=f"Video üretiliyor (CogVideoX-5b)... Adım {step}/30", etaSeconds=eta_sec)
            time.sleep(0.01) # GIL'i serbest bırakır
            return callback_kwargs_param

        if "callback_on_step_end" in sig.parameters:
            callback_kwargs["callback_on_step_end"] = callback_new
        elif "callback" in sig.parameters:
            callback_kwargs["callback"] = callback_old
            callback_kwargs["callback_steps"] = 1

    print("🎬 Metinden Video üretimi başlatıldı...")
    try:
        with torch.inference_mode():
            output = pipe(
                prompt=prompt,
                num_frames=49,           # 6 saniye @8fps
                num_inference_steps=30,
                **callback_kwargs
            )
        frames = output.frames[0]
    except torch.cuda.OutOfMemoryError as exc:
        print(f"❌ GPU OOM: {exc}")
        if 'pipe' in locals():
            del pipe
        flush_memory()
        raise RuntimeError("GPU OOM hatası oluştu.") from exc
    except Exception as exc:
        print(f"❌ Video üretim hatası: {exc}")
        if 'pipe' in locals():
            del pipe
        flush_memory()
        raise
    finally:
        if 'pipe' in locals():
            del pipe
        flush_memory()
    return frames

# ── 2. TTS ───────────────────────────────────────────────────────────────────
_tts_model = None

def get_tts():
    global _tts_model
    if _tts_model is None:
        from TTS.api import TTS
        print("🎙️ XTTS modeli belleğe yükleniyor...")
        _tts_model = TTS(
            model_name="tts_models/multilingual/multi-dataset/xtts_v2",
            gpu=True
        )
    return _tts_model

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


def synthesize_speech(text, output_path, provider="xtts", target_duration_sec=None, **kwargs):
    """
    Çoklu TTS sağlayıcı desteği ile konuşma sentezler + 2-pass rubberband.
    provider: "xtts" (varsayılan), "openai", "edge"
    """
    if provider == "xtts":
        tts = get_tts()
        speaker_wav = kwargs.get("speaker_wav", "/content/karakter.wav")
        speaker = kwargs.get("speaker", "Claribel Dervla")
        language = kwargs.get("language", "tr")

        if os.path.exists(speaker_wav):
            tts.tts_to_file(text=text, speaker_wav=speaker_wav, language=language, file_path=output_path)
        else:
            tts.tts_to_file(text=text, speaker=speaker, language=language, file_path=output_path)

    elif provider == "openai":
        generate_tts_openai(text, output_path, voice=kwargs.get("voice", "alloy"))

    elif provider == "edge":
        generate_tts_edge(text, output_path, voice=kwargs.get("voice", "tr-TR-EmelNeural"))

    else:
        raise ValueError(f"Bilinmeyen TTS sağlayıcısı: {provider}")

    # 2-pass: Hedef süre varsa rubberband ile esnet
    if target_duration_sec and RUBBERBAND_AVAILABLE:
        stretch_audio_to_duration(output_path, output_path, target_duration_sec)

    return output_path


# ── 3. SFX ───────────────────────────────────────────────────────────────────
def generate_sfx_lazy(prompt: str):
    from diffusers import AudioLDM2Pipeline
    flush_memory()

    print("🔊 Ses efekti motoru belleğe yükleniyor...")
    sfx_pipe = AudioLDM2Pipeline.from_pretrained(
        "cvssp/audioldm2",
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True,
    )
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


def apply_lipsync_internal(video_path: str, audio_path: str) -> dict:
    """
    Wav2Lip inference — yüz bulunamazsa veya başka hata olursa
    skipped=True, original_path ile orijinal video kullanılır.
    """
    model = load_wav2lip()
    if not model:
        return {"success": False, "skipped": True, "error": "Wav2Lip modeli yüklenemedi"}

    output_path = video_path.replace('.mp4', '_lipsync.mp4')
    try:
        from Wav2Lip import inference as _w2l_inference
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

# ── 5. ALTYAZI ÜRETİMİ (faster-whisper) ──────────────────────────────────────
_whisper_model = None

def generate_subtitles_whisper(audio_path: str, output_srt: str, language: str = "tr") -> str | None:
    """
    MPT'den uyarlanan faster-whisper altyazı üretici.
    Ses dosyasını analiz eder, kelime zamanlı .srt üretir.
    Model: 'small' (~238MB) — T4'te ~5sn/dakika ses işler.
    faster-whisper kurulu değilse sessizce None döner.
    """
    global _whisper_model
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("⚠️ faster-whisper kurulu değil, altyazı atlanıyor. pip install faster-whisper")
        return None

    if _whisper_model is None:
        print("📝 Whisper modeli (small) belleğe yükleniyor...")
        _whisper_model = WhisperModel(
            "small",
            device="cuda" if torch.cuda.is_available() else "cpu",
            compute_type="float16" if torch.cuda.is_available() else "int8",
        )

    print("📝 Altyazı üretiliyor (faster-whisper)...")
    segments, info = _whisper_model.transcribe(
        audio_path,
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
        language=language,
    )
    print(f"📝 Algılanan dil: '{info.language}' (güven: {info.language_probability:.2f})")

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
        lines.append(f"{_fmt(seg.start)} --> {_fmt(seg.end)}")
        lines.append(seg.text.strip())
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

    # 1. Video
    _update_task(task_id, status="processing", stage="video_generation", stagePercent=15, message=f"Video üretiliyor ({video_model})...", etaSeconds=520)
    try:
        # Görselden video için model seçimi
        i2v_model = "CogVideoX-5b-I2V"
        if "2b" in video_model.lower():
            i2v_model = "CogVideoX-2b-I2V"
            
        if image_path and os.path.exists(image_path):
            print(f"Using CogVideoX-I2V ({i2v_model}) with init_image: {image_path}")
            frames = generate_video_image_5b_lazy(final_prompt, image_path, task_id, i2v_model)
        else:
            print(f"Using CogVideoX Text-to-Video ({video_model})...")
            frames = generate_video_text_5b_lazy(final_prompt, task_id, video_model)
    except Exception as exc:
        TASKS[task_id] = {"status": "error", "message": str(exc)}
        return

    frames_to_mp4(frames, RAW_VIDEO_PATH, fps=8)
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

    _update_task(task_id, stagePercent=55, message="Altyazı hazır, dudak senkroni uygulanıyor...", etaSeconds=60)

    # 4. S3 — Wav2Lip lip-sync
    out_path = RAW_VIDEO_PATH
    if apply_lipsync and speech_text:
        print("👄 Wav2Lip uygulanıyor...")
        lipsync_result = apply_lipsync_internal(RAW_VIDEO_PATH, AUDIO_PATH)
        if lipsync_result.get("success"):
            out_path = lipsync_result["output_path"]
            print(f"✅ Wav2Lip tamam: {out_path}")
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
    
    try:
        # Mevcut üretim adımlarını tetikle
        _generate_media_worker(task_id, data)
        
        # Görev başarılı bittiyse dosyaları oku ve Node.js'e gönder
        if TASKS.get(task_id, {}).get("status") == "success" and callback_url:
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
            response = requests.post(callback_url, data=payload, files=files, headers=bypass_headers, timeout=120)
            print(f"📩 Node.js Sunucu Yanıtı: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Otonom callback hatası: {e}")
        if callback_url:
            try:
                bypass_headers = {
                    "ngrok-skip-browser-warning": "any-value",
                    "bypass-tunnel-reminder": "true"
                }
                requests.post(callback_url, data={
                    "task_id": task_id,
                    "job_id": job_id,
                    "scene_number": scene_number,
                    "status": "error",
                    "message": str(e)
                }, headers=bypass_headers, timeout=10)
            except Exception as cb_err:
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

    # 3. Coqui TTS (coqui-tts)
    try:
        from TTS.api import TTS
        report["tts"] = {"status": "ok"}
    except Exception as e:
        report["tts"] = {"status": "error", "message": str(e)}
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
    print("🎨 Kapak resimleri için Stable Diffusion (DreamShaper 8) belleğe yükleniyor...")
    pipe = DiffusionPipeline.from_pretrained(
        "Lykon/dreamshaper-8",
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True
    )
    pipe.to("cuda")
    
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
            try:
                bypass_headers = {
                    "ngrok-skip-browser-warning": "any-value",
                    "bypass-tunnel-reminder": "true"
                }
                response = requests.post(callback_url, data=payload, files=files, headers=bypass_headers, timeout=60)
                print(f"📩 Kapak callback yanıtı: {response.status_code}")
            except Exception as e:
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

# ── HEALTH CHECK ──────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health_check():
    gpu_total_gb = 0.0
    gpu_used_gb = 0.0
    gpu_pct = 0.0
    
    if torch.cuda.is_available():
        try:
            device = torch.cuda.current_device()
            gpu_total_gb = torch.cuda.get_device_properties(device).total_memory / (1024**3)
            gpu_used_gb = torch.cuda.memory_allocated(device) / (1024**3)
            gpu_pct = (gpu_used_gb / gpu_total_gb) * 100 if gpu_total_gb > 0 else 0.0
        except Exception:
            pass
            
    uptime_seconds = int(time.time() - server_start_time)
    
    return jsonify({
        "status": "healthy",
        "memory": {
            "gpu_total_gb": gpu_total_gb,
            "gpu_used_gb": gpu_used_gb
        },
        "gpu_utilization": {
            "gpu_pct": gpu_pct
        },
        "runtime": {
            "uptime_seconds": uptime_seconds
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

