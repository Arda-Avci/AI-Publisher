"""
AI-Publisher Colab Sunucu - v3 (ModelScope T2V)
================================================
CogVideoX-2b, Colab ücretsiz T4 GPU'sunun 12.67GB RAM sınırını
inference sırasında aşıyor. Bu nedenle:

- VIDEO : damo-vilab/text-to-video-ms-1.7b (ModelScope)
          → Inference RAM: ~4-5 GB (T4'te kararlı)
- TTS   : coqui/XTTS-v2 (değişmedi)
- SFX   : cvssp/audioldm2 (değişmedi)
"""

import os
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"

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
from pyngrok import ngrok
import uuid
import threading
import base64

app = Flask(__name__)

TASKS = {}

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
def generate_video_image_5b_lazy(prompt: str, image_path: str) -> list:
    """
    THUDM/CogVideoX-5b-I2V ile görselden video üretir.
    Çıktı: frame listesi (PIL.Image)
    """
    from diffusers import CogVideoXImageToVideoPipeline
    from diffusers.utils import load_image
    
    flush_memory()
    print("🎬 Görselden Video motoru (CogVideoX-5b-I2V) belleğe yükleniyor...")
    pipe = CogVideoXImageToVideoPipeline.from_pretrained(
        "THUDM/CogVideoX-5b-I2V",
        torch_dtype=torch.float16
    )
    pipe.enable_model_cpu_offload()   # GPU RAM tasarrufu
    pipe.vae.enable_tiling()          # Büyük VAE decode bölme

    print("🎬 Görselden Video üretimi başlatıldı...")
    try:
        init_image = load_image(image_path)
        with torch.inference_mode():
            output = pipe(
                prompt=prompt,
                image=init_image,
                num_frames=49,           # 6 saniye @8fps
                num_inference_steps=30,
            )
        frames = output.frames[0]
    except torch.cuda.OutOfMemoryError as exc:
        print(f"❌ GPU OOM: {exc}")
        del pipe
        flush_memory()
        raise RuntimeError("GPU OOM hatası oluştu.") from exc
    except Exception as exc:
        print(f"❌ Video üretim hatası: {exc}")
        del pipe
        flush_memory()
        raise
    finally:
        del pipe
        flush_memory()
    return frames

def generate_video_text_5b_lazy(prompt: str) -> list:
    """
    THUDM/CogVideoX-5b ile metinden video üretir.
    Çıktı: frame listesi (PIL.Image)
    """
    from diffusers import CogVideoXPipeline
    
    flush_memory()
    print("🎬 Metinden Video motoru (CogVideoX-5b) belleğe yükleniyor...")
    pipe = CogVideoXPipeline.from_pretrained(
        "THUDM/CogVideoX-5b",
        torch_dtype=torch.float16
    )
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_tiling()

    print("🎬 Metinden Video üretimi başlatıldı...")
    try:
        with torch.inference_mode():
            output = pipe(
                prompt=prompt,
                num_frames=49,           # 6 saniye @8fps
                num_inference_steps=30,
            )
        frames = output.frames[0]
    except torch.cuda.OutOfMemoryError as exc:
        print(f"❌ GPU OOM: {exc}")
        del pipe
        flush_memory()
        raise RuntimeError("GPU OOM hatası oluştu.") from exc
    except Exception as exc:
        print(f"❌ Video üretim hatası: {exc}")
        del pipe
        flush_memory()
        raise
    finally:
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

    final_prompt = f"{character_features}, {video_prompt}" if character_features else video_prompt

    image_path = None
    if source_video_id:
        _update_task(task_id, status="processing", stage="video_downloading", stagePercent=5, message="Orijinal video indiriliyor...")
        try:
            video_path = get_youtube_video_path(source_video_id)
            _update_task(task_id, stage="frame_extraction", stagePercent=10, message="Referans kare kesiliyor...")
            timestamp = (scene_number - 1) * 6.0
            image_path = f"/content/scene_{scene_number}_init.jpg"
            extract_frame_at_time(video_path, timestamp, image_path)
        except Exception as exc:
            print(f"❌ YouTube indirme/kare kesme hatası (T2V fallback): {exc}")
            image_path = None
    elif reference_image_base64:
        _update_task(task_id, status="processing", stage="image_decoding", stagePercent=10, message="Referans görsel çözülüyor...")
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
    _update_task(task_id, status="processing", stage="video_generation", stagePercent=15, message="Video üretiliyor (CogVideoX-5b)...")
    try:
        if image_path and os.path.exists(image_path):
            print(f"Using CogVideoX-5b-I2V with init_image: {image_path}")
            frames = generate_video_image_5b_lazy(final_prompt, image_path)
        else:
            print("Using CogVideoX-5b Text-to-Video...")
            frames = generate_video_text_5b_lazy(final_prompt)
    except Exception as exc:
        TASKS[task_id] = {"status": "error", "message": str(exc)}
        return

    frames_to_mp4(frames, RAW_VIDEO_PATH, fps=8)
    _update_task(task_id, stagePercent=30, message="Video üretildi, ses işleniyor...")

    # 2. TTS
    if speech_text:
        try:
            tts = get_tts()
            speaker_wav_path = "/content/karakter.wav"
            if os.path.exists(speaker_wav_path):
                print("🎙️ Ses klonlama modu aktif (karakter.wav bulundu)")
                tts.tts_to_file(
                    text=speech_text,
                    speaker_wav=speaker_wav_path,
                    language="tr",
                    file_path=AUDIO_PATH,
                )
            else:
                print("🎙️ Yerleşik ses modu (karakter.wav bulunamadı, varsayılan kullanılıyor)")
                tts.tts_to_file(
                    text=speech_text,
                    speaker="Claribel Dervla",
                    language="tr",
                    file_path=AUDIO_PATH,
                )
        except Exception as exc:
            TASKS[task_id] = {"status": "error", "message": f"TTS hatası: {str(exc)}"}
            return
    else:
        silence = np.zeros(int(16000 * 3), dtype=np.int16)
        wavfile.write(AUDIO_PATH, 16000, silence)

    _update_task(task_id, stage="tts_generation", stagePercent=40, message="TTS tamam, altyazı üretiliyor...")

    # 3. Altyazı Üretimi
    if speech_text:
        generate_subtitles_whisper(AUDIO_PATH, SUBTITLE_PATH, language="tr")

    _update_task(task_id, stagePercent=55, message="Altyazı hazır, dudak senkroni uygulanıyor...")

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

    _update_task(task_id, stage="lipsync_done", stagePercent=70, message="Dudak senkroni tamam, ses efekti üretiliyor...")

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

    _update_task(task_id, stage="finalizing", stagePercent=90, message="Dosyalar hazırlanıyor...")
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
    
    try:
        # Mevcut üretim adımlarını tetikle
        _generate_media_worker(task_id, data)
        
        # Görev başarılı bittiyse dosyaları oku ve Node.js'e gönder
        if TASKS.get(task_id, {}).get("status") == "success" and callback_url:
            print(f"📤 İpek yolu kuruluyor: Sonuçlar {callback_url} adresine gönderiliyor...")
            
            # Node.js Express/FastAPI sunucuna gönderilecek multipart payload
            files = {}
            if os.path.exists(LAST_VIDEO_PATH):
                files['video'] = open(LAST_VIDEO_PATH, 'rb')
            if os.path.exists(AUDIO_PATH):
                files['speech'] = open(AUDIO_PATH, 'rb')
            if os.path.exists(SUBTITLE_PATH):
                files['subtitle'] = open(SUBTITLE_PATH, 'rb')
                
            payload = {
                "task_id": task_id,
                "status": "success",
                "message": "Colab render işlemi başarıyla tamamlandı."
            }
            
            # Backend sunucuna otonom POST atılıyor
            response = requests.post(callback_url, data=payload, files=files, timeout=120)
            print(f"📩 Node.js Sunucu Yanıtı: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Otonom callback hatası: {e}")
        if callback_url:
            requests.post(callback_url, json={"task_id": task_id, "status": "error", "message": str(e)})


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

@app.route("/health")
def health():
    mem = {}
    util = {}
    runtime_info = {}

    if torch.cuda.is_available():
        free_gb  = torch.cuda.mem_get_info()[0] / 1e9
        total_gb = torch.cuda.mem_get_info()[1] / 1e9
        used_gb  = total_gb - free_gb
        mem["gpu_free_gb"]   = round(free_gb, 2)
        mem["gpu_total_gb"]  = round(total_gb, 2)
        mem["gpu_used_gb"]   = round(used_gb, 2)
        mem["gpu_used_pct"]  = round((used_gb / total_gb) * 100, 1) if total_gb > 0 else 0

 # GPU utilization via nvidia-smi (opsyonel, yoksa tahmini)
        try:
            import subprocess
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=3
            )
            if result.returncode == 0:
                util["gpu_pct"] = float(result.stdout.strip().split("\n")[0])
        except Exception:
            # Fallback: tahmini utilisation (kullanılan bellek oranından)
            util["gpu_pct"] = round((used_gb / total_gb) * 100, 1)

 # Runtime süresi (sunucu başlatıldığından beri geçen zaman)
    if hasattr(health, "_start_time"):
        runtime_info["uptime_seconds"] = int(time.time() - health._start_time)
    else:
        runtime_info["uptime_seconds"] = 0

    return jsonify({
        "status": "ok",
        "memory": mem,
        "gpu_utilization": util,
        "runtime": runtime_info
    })

# ── 6. KAPAK RESMİ ÜRETİMİ (DreamShaper 8 - SD 1.5) ───────────────────────────
COVER_PATHS = ["/content/cover_0.jpg", "/content/cover_1.jpg", "/content/cover_2.jpg"]

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
                # Her kapak için hafifçe farklı tohum (seed) veya hafif prompt varyasyonu verilebilir
                img = pipe(prompt=prompt, num_inference_steps=20, height=512, width=512).images[0]
                img.save(COVER_PATHS[i])
                print(f"✅ Kapak {i} kaydedildi: {COVER_PATHS[i]}")
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
    if not cover_prompt:
        return jsonify({"status": "error", "message": "cover_prompt parametresi zorunludur"}), 400
    
    try:
        generate_covers_lazy(cover_prompt)
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

    if NGROK_TOKEN and NGROK_TOKEN != "BURAYA_NGROK_TOKEN_GELECEK":
        ngrok.set_auth_token(NGROK_TOKEN)
        public_url = ngrok.connect(5000)
        print("\n🔗 NODE.JS PROJENİZE YAPIŞTIRACAĞINIZ URL:\n", public_url.public_url)
        with open("ngrok_url.txt", "w", encoding="utf-8") as f:
            f.write(public_url.public_url)
        print("\n" + "-" * 50 + "\n")
    else:
        print("\n⚠️ NGROK_TOKEN eksik.")

    import time as _time_module
    health._start_time = _time_module.time()
    
    # CRITICAL: debug=False ve threaded=True yapılarak Colab/Ngrok kilitlenmeleri önlendi.
    app.run(port=5000, debug=False, threaded=True, use_reloader=False)

