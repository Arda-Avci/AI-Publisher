"""
AI-Publisher Colab Sunucu - v5 (Docker Supervisor & Gateway)
============================================================
Bu sunucu, Google Colab host makinesinde çalışarak Node.js istemcisinden
gelen tüm talepleri alır. Ağır derin öğrenme modellerini yüklemek yerine:
- İlgili modeli içeren Docker konteynerini çalıştırır (Lazy Loading).
- GPU VRAM çakışmalarını önlemek için aktif GPU konteyner kontrolü yapar.
- İstekleri konteynerin yerel Flask API'sine yönlendirir (Proxy).
- Boşta kalan konteynerleri (5 dk) ve VM'i (15 dk) otomatik kapatır.
- Basit OpenCV/FFmpeg işlemlerini host üzerinde doğrudan yürütür.
"""

import os
import time
import uuid
import json
import shutil
import datetime
import traceback
import threading
import subprocess
import requests
import cv2
import numpy as np
from scipy.io import wavfile
from flask import Flask, request, jsonify, send_file

app = Flask(__name__)

# --- CONFIGURATION ---
CONTAINER_IDLE_TIMEOUT_SECONDS = 120  # 2 minutes — konteyner boşta kalma süresi
VM_IDLE_TIMEOUT_SECONDS = 300          # 5 minutes — VM otomatik kapatma süresi

# --- FILE PATHS ---
LAST_VIDEO_PATH  = "/content/current_scene.mp4"
RAW_VIDEO_PATH   = "/content/raw_video.mp4"
AUDIO_PATH       = "/content/speech.wav"
SFX_PATH         = "/content/sfx.wav"
SUBTITLE_PATH    = "/content/subtitle.srt"

# --- GLOBAL STATES ---
server_start_time = time.time()
last_activity_time = time.time()
TASKS = {}

DIAGNOSTICS = {
    "total_jobs_received": 0,
    "total_jobs_success": 0,
    "total_jobs_failed": 0,
    "last_job_time": None,
    "last_job_status": None,
    "last_job_error": None,
    "callbacks": {
        "total_attempted": 0,
        "total_success": 0,
        "total_failed": 0,
        "last_sent_at": None,
        "last_status_code": None,
        "last_error": None,
        "last_url": None,
        "tunnel_connectivity": "unknown"
    },
    "outputs": {
        "videos_generated": 0,
        "speech_synthesized": 0,
        "sfx_generated": 0,
        "lipsync_applied": 0,
        "subtitles_generated": 0
    },
    "recent_activities": []
}

def log_diagnostic_activity(msg):
    timestamp = datetime.datetime.now().isoformat()
    DIAGNOSTICS["recent_activities"].append(f"[{timestamp}] {msg}")
    if len(DIAGNOSTICS["recent_activities"]) > 20:
        DIAGNOSTICS["recent_activities"].pop(0)

# --- CONTAINER MANAGER (Lazy-loading & VRAM Optimizer) ---
class ContainerManager:
    PORTS = {
        "cogvideox": 5001,
        "xtts": 5002,
        "audioldm2": 5003,
        "wav2lip": 5004,
        "musetalk": 5005,
        "whisper": 5006,
        "stablediffusion": 5007,
        "wan": 5008,
        "ltx": 5009,
        "hunyuan": 5010,
        "kokorotts": 5011,
        "svd": 5012,
        "animatediff": 5013,
        "wan25": 5014,
        "f5tts": 5015,
        "lora-trainer": 5016
    }
    
    # GPU-heavy containers: only one can run at a time (T4 VRAM limit)
    GPU_HEAVY = ["cogvideox", "xtts", "audioldm2", "wav2lip", "musetalk", "stablediffusion", "wan", "ltx", "hunyuan", "svd", "animatediff", "wan25", "f5tts", "lora-trainer"]
    
    # CPU-only containers: can run concurrently, no GPU reservation needed
    CPU_ONLY = ["whisper", "kokorotts"]
    
    def __init__(self):
        self.last_active = {name: time.time() for name in self.PORTS}
        self.lock = threading.Lock()
        
    def is_running(self, name):
        try:
            res = subprocess.run(
                ["docker", "inspect", "-f", "{{.State.Running}}", f"ai-publisher-{name}"],
                capture_output=True, text=True
            )
            return res.stdout.strip() == "true"
        except Exception:
            return False

    def ensure_container(self, name):
        global last_activity_time
        last_activity_time = time.time()
        
        with self.lock:
            self.last_active[name] = time.time()
            
            # Prevent VRAM OOM: Stop other GPU heavy containers before starting this one
            if name in self.GPU_HEAVY:
                for other in self.GPU_HEAVY:
                    if other != name and self.is_running(other):
                        print(f"[SUPERVISOR] Stopping GPU container '{other}' to free VRAM for '{name}'")
                        subprocess.run(["docker", "stop", f"ai-publisher-{other}"], capture_output=True)
            
            # Check container existence & status
            try:
                res = subprocess.run(
                    ["docker", "inspect", "-f", "{{.State.Status}}", f"ai-publisher-{name}"],
                    capture_output=True, text=True
                )
                status = res.stdout.strip()
            except Exception:
                status = "none"
                
            port = self.PORTS[name]
            
            if status == "running":
                return f"http://localhost:{port}"
                
            elif status in ("exited", "paused", "created"):
                print(f"[SUPERVISOR] Starting container ai-publisher-{name}...")
                subprocess.run(["docker", "start", f"ai-publisher-{name}"], check=True)
            else:
                print(f"[SUPERVISOR] Creating and running container ai-publisher-{name}...")
                use_gpu = name not in self.CPU_ONLY
                cmd = ["docker", "run", "-d"]
                if use_gpu:
                    cmd.extend(["--gpus", "all"])
                cmd.extend([
                    "--name", f"ai-publisher-{name}",
                    "-p", f"{port}:5000",
                    "-v", "/content:/content",
                    "-v", "/content/drive:/content/drive",
                    "-e", "HF_HOME=/content/drive/MyDrive/Colab_Cache/huggingface",
                    "-e", "TORCH_HOME=/content/drive/MyDrive/Colab_Cache/torch",
                    f"ai-publisher-{name}:latest"
                ])
                subprocess.run(cmd, check=True)
                
            # Wait for container to respond to healthcheck
            url = f"http://localhost:{port}"
            for _ in range(90):
                try:
                    r = requests.get(f"{url}/health", timeout=1)
                    if r.status_code == 200:
                        print(f"[SUPERVISOR] Container ai-publisher-{name} is ready.")
                        return url
                except Exception:
                    pass
                time.sleep(1)
            raise RuntimeError(f"Container ai-publisher-{name} failed to respond on port {port}")

    def stop_container(self, name):
        if self.is_running(name):
            print(f"[SUPERVISOR] Stopping container ai-publisher-{name} due to inactivity...")
            subprocess.run(["docker", "stop", f"ai-publisher-{name}"], capture_output=True)

    def stop_idle_containers(self):
        for name in self.PORTS:
            if self.is_running(name):
                # Don't stop containers if there are active tasks processing
                has_active_tasks = any(t.get("status") == "processing" for t in TASKS.values())
                if not has_active_tasks and (time.time() - self.last_active[name] > CONTAINER_IDLE_TIMEOUT_SECONDS):
                    self.stop_container(name)

container_manager = ContainerManager()

# --- BACKROUND IDLE MONITORING ---
def idle_monitor_thread():
    while True:
        try:
            container_manager.stop_idle_containers()
            
            # Check overall VM shutdown condition
            has_active_tasks = any(t.get("status") == "processing" for t in TASKS.values())
            if not has_active_tasks:
                idle_duration = time.time() - last_activity_time
                if idle_duration > VM_IDLE_TIMEOUT_SECONDS:
                    print(f"[SUPERVISOR] Server idle for {idle_duration:.1f}s. Shutting down Colab VM...")
                    trigger_vm_shutdown()
        except Exception as e:
            print(f"[SUPERVISOR] Error in idle monitor thread: {e}")
        time.sleep(30)

def trigger_vm_shutdown():
    try:
        from google.colab import runtime
        runtime.unassign()
    except Exception:
        import signal
        os.kill(os.getpid(), signal.SIGTERM)

# Start background monitoring thread
threading.Thread(target=idle_monitor_thread, daemon=True).start()

# --- HELPER FUNCTIONS ---
def download_file(url, dest_path):
    if not url: return None
    try:
        headers = {"ngrok-skip-browser-warning": "any-value", "bypass-tunnel-reminder": "true"}
        resp = requests.get(url, headers=headers, stream=True, timeout=30)
        if resp.status_code == 200:
            with open(dest_path, "wb") as f:
                shutil.copyfileobj(resp.raw, f)
            return dest_path
    except Exception as e:
        print(f"[SUPERVISOR] Failed downloading file from {url}: {e}")
    return None

def parse_srt_time_to_seconds(srt_time):
    parts = srt_time.split(':')
    part0 = parts[0] if len(parts) > 0 else '0'
    part1 = parts[1] if len(parts) > 1 else '0'
    part2 = parts[2] if len(parts) > 2 else '0,0'
    secs_parts = part2.split(',')
    sec0 = secs_parts[0] if len(secs_parts) > 0 else '0'
    sec1 = secs_parts[1] if len(secs_parts) > 1 else '0'
    h = int(part0)
    m = int(part1)
    s = int(sec0)
    ms = int(sec1)
    return h * 3600 + m * 60 + s + ms / 1000.0

def format_seconds_to_ass_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 100)
    return f"{h}:{m:02d}:{s:02d}.{ms:02d}"

def convert_srt_to_kinetic_ass(srt_path, ass_path, primary_color='#00F2FE', secondary_color='#FFFFFF', font_name='Arial', anim_style='bounce'):
    if not os.path.exists(srt_path): return
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    blocks = content.strip().split('\n\n')
    events = []
    
    def hex_to_ass_color(hex_str):
        cleaned = hex_str.replace('#', '')
        if len(cleaned) == 6:
            r = cleaned[0:2]
            g = cleaned[2:4]
            b = cleaned[4:6]
            return f"&H00{b}{g}{r}&"
        return '&H00FFFFFF&'
        
    ass_primary = hex_to_ass_color(primary_color)
    ass_secondary = hex_to_ass_color(secondary_color)
    
    style_tags = {
        'bounce': '\\fscx125\\fscy125',
        'pulse': '\\fscx140\\fscy140',
        'shake': '\\fscx110\\fscy110\\frx5\\fry3',
        'pop': '\\fscx150\\fscy150\\bord3',
        'wave': '\\fscx120\\fscy120\\frx10'
    }
    
    active_style = style_tags.get(anim_style, style_tags['bounce'])
    
    for block in blocks:
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        if len(lines) < 3: continue
        time_line = lines[1]
        text_lines = " ".join(lines[2:])
        if '-->' not in time_line: continue
        
        start_str, end_str = time_line.split('-->')
        start_sec = parse_srt_time_to_seconds(start_str.strip())
        end_sec = parse_srt_time_to_seconds(end_str.strip())
        total_duration = end_sec - start_sec
        
        words = [w for w in text_lines.split() if len(w) > 0]
        if not words: continue
        
        word_duration = total_duration / len(words)
        
        for i in range(len(words)):
            w_start = start_sec + i * word_duration
            w_end = w_start + word_duration
            
            text_parts = []
            for idx, w in enumerate(words):
                if idx == i:
                    text_parts.append(f"{{\\c{ass_primary}\\b1{active_style}}}{w}{{\\r}}")
                else:
                    text_parts.append(f"{{\\c{ass_secondary}\\b0}}{w}")
            
            start_ass = format_seconds_to_ass_time(w_start)
            end_ass = format_seconds_to_ass_time(w_end)
            events.append(f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,,{' '.join(text_parts)}")
            
    ass_header = f"""[Script Info]
Title: Kinetic Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},42,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,0,2,10,10,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    with open(ass_path, 'w', encoding='utf-8') as f:
        f.write(ass_header + "\n".join(events))

def mix_video_on_colab(video_path, speech_path, sfx_path, subtitle_path, music_path, logo_path, output_path, data):
    differentiation_layout = data.get("differentiation_layout")
    music_volume = float(data.get("music_volume", 0.15))
    
    primary_color = data.get("subtitle_primary_color", "#00F2FE")
    secondary_color = data.get("subtitle_secondary_color", "#FFFFFF")
    font_name = data.get("subtitle_font_name", "Arial")
    anim_style = data.get("subtitle_anim_style", "bounce")
    
    ass_path = "/content/subtitle_kinetic.ass"
    if subtitle_path and os.path.exists(subtitle_path):
        convert_srt_to_kinetic_ass(subtitle_path, ass_path, primary_color, secondary_color, font_name, anim_style)
    
    inputs = ["-i", video_path, "-i", speech_path, "-i", sfx_path]
    
    music_idx = -1
    if music_path and os.path.exists(music_path):
        inputs.extend(["-i", music_path])
        music_idx = len(inputs) // 2 - 1
        
    logo_idx = -1
    if logo_path and os.path.exists(logo_path):
        inputs.extend(["-i", logo_path])
        logo_idx = len(inputs) // 2 - 1
        
    filter_parts = []
    
    current_v = "0:v"
    
    if differentiation_layout in ("vertical", "horizontal"):
        w, h = (1080, 1920) if differentiation_layout == "vertical" else (1920, 1080)
        scale_orig = "972:-1" if differentiation_layout == "vertical" else "1728:-1"
        filter_parts.append(
            f"[{current_v}]split[orig][bg];"
            f"[bg]scale={w}:{h},boxblur=40[blurred];"
            f"[orig]scale={scale_orig},eq=contrast=1.05:saturation=1.1[scaled];"
            f"[blurred][scaled]overlay=(W-w)/2:(H-h)/2,vignette=pi/8[diffv]"
        )
        current_v = "diffv"
        
    if logo_idx != -1:
        filter_parts.append(f"[{logo_idx}:v]scale=120:-1[scaled_logo]")
        filter_parts.append(f"[{current_v}][scaled_logo]overlay=W-w-20:20[logov]")
        current_v = "logov"
        
    if os.path.exists(ass_path):
        filter_parts.append(f"[{current_v}]subtitles={ass_path}[subv]")
        current_v = "subv"
        
    if music_idx != -1:
        filter_parts.append("[1:a][2:a]amix=inputs=2:duration=first:dropout_transition=0[speech_sfx]")
        filter_parts.append(f"[{music_idx}:a]volume={music_volume}[bg]")
        filter_parts.append(f"[bg][speech_sfx]sidechaincompress=threshold=0.12:ratio=2.5:attack=15:release=250[bg_ducked]")
        filter_parts.append("[speech_sfx][bg_ducked]amix=inputs=2:duration=first:dropout_transition=0[aout]")
        audio_map = "[aout]"
    else:
        filter_parts.append("[1:a][2:a]amix=inputs=2:duration=first:dropout_transition=0[aout]")
        audio_map = "[aout]"
        
    cmd = ["ffmpeg", "-y"]
    cmd.extend(inputs)
    cmd.extend(["-filter_complex", ";".join(filter_parts)])
    cmd.extend(["-map", f"[{current_v}]", "-map", audio_map])
    cmd.extend(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-c:a", "aac", "-b:a", "192k", "-shortest", output_path])
    
    print(f"[SUPERVISOR] Running FFmpeg Mix command: {' '.join(cmd)}")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[SUPERVISOR] FFmpeg mix failed: {res.stderr}")
        raise RuntimeError(f"FFmpeg mixing failed: {res.stderr}")

def check_tunnel_connectivity():
    last_url = DIAGNOSTICS["callbacks"]["last_url"]
    if not last_url:
        return "unknown"
    try:
        from urllib.parse import urlparse
        parsed = urlparse(last_url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        headers = {"ngrok-skip-browser-warning": "any-value", "bypass-tunnel-reminder": "true"}
        resp = requests.get(f"{base_url}/api/v1/csrf", headers=headers, timeout=3.0)
        if resp.status_code == 200:
            return "healthy"
        resp = requests.get(base_url, headers=headers, timeout=3.0)
        if resp.status_code < 500:
            return "healthy"
        return "unhealthy"
    except Exception:
        return "failed"

def _update_task(task_id, **kwargs):
    if task_id in TASKS:
        TASKS[task_id].update(kwargs)
    else:
        TASKS[task_id] = kwargs

# --- DIRECTORY UTILS ---
def get_youtube_video_path(video_id):
    os.makedirs("/content/source_videos", exist_ok=True)
    target_path = f"/content/source_videos/{video_id}.mp4"
    if os.path.exists(target_path):
        return target_path
        
    print(f"[SUPERVISOR] Downloading YouTube video {video_id} directly on Colab...")
    try:
        import yt_dlp
        ydl_opts = {
            'outtmpl': '/content/source_videos/%(id)s.%(ext)s',
            'format': 'best[ext=mp4]/mp4',
            'quiet': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f"https://www.youtube.com/watch?v={video_id}"])
    except ImportError:
        subprocess.run(["pip", "install", "yt-dlp"], capture_output=True)
        import yt_dlp
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

def extract_frame_at_time(video_path, timestamp_sec, out_img_path):
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
        raise RuntimeError(f"Failed to extract frame at {timestamp_sec}s")

# --- CORE RENDER WORKER ---
def _generate_media_worker(task_id, data):
    global last_activity_time
    last_activity_time = time.time()
    
    video_prompt = data.get("video_prompt", "")
    speech_text = data.get("speech_text", "")
    sfx_prompt = data.get("sfx_prompt", "")
    character_features = data.get("character_features", "")
    apply_lipsync = bool(data.get("apply_lipsync", False))
    scene_number = int(data.get("scene_number", 1))
    source_video_id = data.get("source_video_id", "")
    reference_image_base64 = data.get("reference_image_base64", "")
    video_model = data.get("video_model", "CogVideoX-5b")
    tts_provider = data.get("tts_provider", "xtts")
    tts_voice = data.get("tts_voice", "Claribel Dervla")

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
            print(f"❌ YouTube download/frame extraction failed: {exc}")
            image_path = None
    elif reference_image_base64:
        _update_task(task_id, status="processing", stage="image_decoding", stagePercent=10, message="Referans görsel çözülüyor...")
        try:
            import base64
            image_path = f"/content/scene_{scene_number}_init.jpg"
            b64_data = reference_image_base64
            if "," in b64_data:
                b64_data = b64_data.split(",")[1]
            img_bytes = base64.b64decode(b64_data)
            with open(image_path, "wb") as f:
                f.write(img_bytes)
        except Exception as exc:
            print(f"❌ Base64 decode failed: {exc}")
            image_path = None

    # 0. LoRA INFERENCE: generate character-consistent init image if weights provided
    lora_weights_path = data.get("lora_weights_path", "")
    if lora_weights_path:
        _update_task(task_id, stage="lora_injection", stagePercent=12, message="Karakter referansı LoRA ile oluşturuluyor...")
        try:
            lora_url = container_manager.ensure_container("lora-trainer")
            lora_image_path = f"/content/lora_scene_{scene_number}_init.jpg"
            res = requests.post(f"{lora_url}/infer", json={
                "weights_path": lora_weights_path,
                "prompt": final_prompt,
                "output_path": lora_image_path
            }, timeout=120).json()
            if res.get("status") == "success" and os.path.exists(lora_image_path):
                image_path = lora_image_path
                print(f"[SUPERVISOR] LoRA image generated for scene {scene_number}")
            else:
                print(f"[SUPERVISOR] LoRA inference returned non-success: {res}")
        except Exception as exc:
            print(f"[SUPERVISOR] LoRA injection failed (falling back to default init): {exc}")

    # 1. VIDEO GENERATION (Proxy to the chosen video container)
    model_lower = video_model.lower()
    if "wan25" in model_lower or "wan2.5" in model_lower:
        container_name = "wan25"
        model_display = "Wan 2.5"
    elif "wan" in model_lower:
        container_name = "wan"
        model_display = "Wan 2.1"
    elif "ltx" in model_lower:
        container_name = "ltx"
        model_display = "LTX-Video"
    elif "hunyuan" in model_lower:
        container_name = "hunyuan"
        model_display = "HunyuanVideo"
    elif "animatediff" in model_lower:
        container_name = "animatediff"
        model_display = "AnimateDiff"
    elif "svd" in model_lower or "stable-video" in model_lower or "stablevideo" in model_lower:
        container_name = "svd"
        model_display = "Stable Video Diffusion (SVD-XT)"
    else:
        container_name = "cogvideox"
        model_display = "CogVideoX"

    _update_task(task_id, status="processing", stage="video_generation", stagePercent=15, message=f"Video üretiliyor ({model_display})...")
    try:
        url = container_manager.ensure_container(container_name)
        payload = {
            "prompt": final_prompt,
            "image_path": image_path,
            "video_model": video_model,
            "output_path": RAW_VIDEO_PATH,
            "num_frames": 49,
            "num_inference_steps": 30
        }
        res = requests.post(f"{url}/generate", json=payload, timeout=600).json()
        if res.get("status") != "success":
            raise RuntimeError(res.get("message", "Video generation container error"))
        
        DIAGNOSTICS["outputs"]["videos_generated"] += 1
        log_diagnostic_activity(f"Video generated for task: {task_id}")
    except Exception as exc:
        _update_task(task_id, status="error", message=f"Video Generation Error: {str(exc)}")
        return

    _update_task(task_id, stagePercent=30, message="Video üretildi, ses sentezleniyor...")

    # 2. SPEECH SYNTHESIS (Proxy to xtts or f5tts container)
    if speech_text:
        try:
            video_duration = 49 / 8 # 6.125s
            tts_container = "f5tts" if tts_provider == "f5tts" else "xtts"
            url = container_manager.ensure_container(tts_container)
            payload = {
                "text": speech_text,
                "output_path": AUDIO_PATH,
                "provider": tts_provider,
                "target_duration_sec": video_duration,
                "speaker_wav": "/content/karakter.wav",
                "voice": tts_voice,
                "language": "tr"
            }
            res = requests.post(f"{url}/synthesize", json=payload, timeout=180).json()
            if res.get("status") != "success":
                raise RuntimeError(res.get("message", f"{tts_container} container error"))
            
            DIAGNOSTICS["outputs"]["speech_synthesized"] += 1
            log_diagnostic_activity(f"Speech synthesized for task: {task_id}")
        except Exception as exc:
            _update_task(task_id, status="error", message=f"{tts_provider} Sentezleme Hatası: {str(exc)}")
            return
    else:
        # Create silent audio
        silence = np.zeros(int(16000 * 3), dtype=np.int16)
        wavfile.write(AUDIO_PATH, 16000, silence)

    _update_task(task_id, stage="tts_generation", stagePercent=40, message="TTS tamam, altyazı üretiliyor...")

    # 3. SUBTITLES (Proxy to whisper container)
    if speech_text:
        try:
            url = container_manager.ensure_container("whisper")
            payload = {
                "file_path": AUDIO_PATH,
                "language": "tr"
            }
            res = requests.post(f"{url}/transcribe", json=payload, timeout=90).json()
            if res.get("status") == "success":
                with open(SUBTITLE_PATH, "w", encoding="utf-8") as f:
                    f.write(res.get("srt", ""))
                DIAGNOSTICS["outputs"]["subtitles_generated"] += 1
                log_diagnostic_activity(f"Subtitles generated for task: {task_id}")
        except Exception as exc:
            print(f"[SUPERVISOR] Subtitle generation warning: {exc}")

    _update_task(task_id, stagePercent=55, message="Altyazı hazır, dudak senkroni uygulanıyor...")

    # 4. LIP SYNC (Proxy to wav2lip container)
    out_path = RAW_VIDEO_PATH
    if apply_lipsync and speech_text:
        try:
            url = container_manager.ensure_container("wav2lip")
            payload = {
                "video_path": RAW_VIDEO_PATH,
                "audio_path": AUDIO_PATH,
                "speaker": data.get("speaker"),
                "character_images": data.get("character_images")
            }
            res = requests.post(f"{url}/apply-lipsync", json=payload, timeout=240).json()
            if res.get("success") and res.get("output_path"):
                out_path = res["output_path"]
                DIAGNOSTICS["outputs"]["lipsync_applied"] += 1
                log_diagnostic_activity(f"LipSync applied for task: {task_id}")
        except Exception as exc:
            print(f"[SUPERVISOR] Lip sync failed (falling back to raw video): {exc}")

    if out_path != LAST_VIDEO_PATH:
        try:
            shutil.copyfile(out_path, LAST_VIDEO_PATH)
        except Exception as copy_err:
            print(f"[WARN] Failed copying output to final path: {copy_err}")

    _update_task(task_id, stage="lipsync_done", stagePercent=70, message="Dudak senkroni tamam, ses efekti üretiliyor...")

    # 5. SFX (Proxy to audioldm2 container)
    if sfx_prompt:
        try:
            url = container_manager.ensure_container("audioldm2")
            payload = {
                "prompt": sfx_prompt,
                "output_path": SFX_PATH,
                "audio_length_in_s": 6.0,
                "num_inference_steps": 20
            }
            res = requests.post(f"{url}/generate", json=payload, timeout=120).json()
            if res.get("status") != "success":
                raise RuntimeError(res.get("message", "AudioLDM2 container error"))
            DIAGNOSTICS["outputs"]["sfx_generated"] += 1
            log_diagnostic_activity(f"SFX generated for task: {task_id}")
        except Exception as exc:
            _update_task(task_id, status="error", message=f"SFX Hatası: {str(exc)}")
            return
    else:
        silence = np.zeros(int(16000 * 3), dtype=np.int16)
        wavfile.write(SFX_PATH, 16000, silence)

    _update_task(task_id, stage="mixing", stagePercent=80, message="Kurgu ve miksaj yapılıyor...")
    try:
        music_url = data.get("background_music")
        logo_url = data.get("logo_url")
        
        music_path = None
        if music_url:
            music_path = "/content/bg_music.mp3"
            download_file(music_url, music_path)
            
        logo_path = None
        if logo_url:
            logo_path = "/content/logo.png"
            download_file(logo_url, logo_path)
            
        temp_mixed = "/content/temp_mixed.mp4"
        mix_video_on_colab(
            video_path=LAST_VIDEO_PATH,
            speech_path=AUDIO_PATH,
            sfx_path=SFX_PATH,
            subtitle_path=SUBTITLE_PATH if os.path.exists(SUBTITLE_PATH) else None,
            music_path=music_path,
            logo_path=logo_path,
            output_path=temp_mixed,
            data=data
        )
        if os.path.exists(temp_mixed):
            shutil.copyfile(temp_mixed, LAST_VIDEO_PATH)
            os.remove(temp_mixed)
        if music_path and os.path.exists(music_path): os.remove(music_path)
        if logo_path and os.path.exists(logo_path): os.remove(logo_path)
        if os.path.exists("/content/subtitle_kinetic.ass"): os.remove("/content/subtitle_kinetic.ass")
    except Exception as mix_err:
        print(f"[SUPERVISOR] Video mixing failed: {mix_err}")

    _update_task(task_id, stage="finalizing", stagePercent=90, message="Dosyalar hazırlanıyor...")
    TASKS[task_id] = {
        "status": "success",
        "has_subtitle": os.path.exists(SUBTITLE_PATH),
        "lipsync_applied": out_path != RAW_VIDEO_PATH,
        "stage": "done",
        "stagePercent": 100,
        "message": "Tamamlandı"
    }

def _generate_media_worker_with_callback(task_id, data):
    callback_url = data.get("callback_url")
    job_id = data.get("job_id")
    scene_number = data.get("scene_number", 1)
    
    DIAGNOSTICS["total_jobs_received"] += 1
    DIAGNOSTICS["last_job_time"] = datetime.datetime.now().isoformat()
    DIAGNOSTICS["last_job_status"] = "processing"
    log_diagnostic_activity(f"Job started: Job: {job_id}, Scene: {scene_number}")

    try:
        _generate_media_worker(task_id, data)
        
        if TASKS.get(task_id, {}).get("status") == "success":
            DIAGNOSTICS["total_jobs_success"] += 1
            DIAGNOSTICS["last_job_status"] = "success"
            
            if callback_url:
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
                
                bypass_headers = {"ngrok-skip-browser-warning": "any-value", "bypass-tunnel-reminder": "true"}
                DIAGNOSTICS["callbacks"]["total_attempted"] += 1
                DIAGNOSTICS["callbacks"]["last_sent_at"] = datetime.datetime.now().isoformat()
                DIAGNOSTICS["callbacks"]["last_url"] = callback_url
                
                try:
                    response = requests.post(callback_url, data=payload, files=files, headers=bypass_headers, timeout=120)
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
        else:
            DIAGNOSTICS["total_jobs_failed"] += 1
            DIAGNOSTICS["last_job_status"] = "failed"
            DIAGNOSTICS["last_job_error"] = TASKS.get(task_id, {}).get("message", "Job processing error")
            
    except Exception as e:
        error_msg = traceback.format_exc()
        try:
            with open("colab_error.log", "a", encoding="utf-8") as f:
                f.write(f"[{datetime.datetime.now().isoformat()}] Host Exception (Task {task_id}):\n{error_msg}\n")
        except: pass
        DIAGNOSTICS["total_jobs_failed"] += 1
        DIAGNOSTICS["last_job_status"] = "failed"
        DIAGNOSTICS["last_job_error"] = str(e)
        if callback_url:
            try:
                bypass_headers = {"ngrok-skip-browser-warning": "any-value", "bypass-tunnel-reminder": "true"}
                requests.post(callback_url, data={
                    "task_id": task_id,
                    "job_id": job_id,
                    "scene_number": scene_number,
                    "status": "error",
                    "message": str(e)
                }, headers=bypass_headers, timeout=10)
            except: pass

# --- HOST API ROUTES ---
@app.route("/generate-media", methods=["POST"])
def generate_media():
    data = request.get_json(force=True) or {}
    
    # Check if this is a synchronous Kokoro TTS request
    if data.get("mode") == "kokoro_tts":
        global last_activity_time
        last_activity_time = time.time()
        try:
            url = container_manager.ensure_container("kokorotts")
            payload = {
                "text": data.get("text", ""),
                "voice": data.get("voice", "af_bella"),
                "speed": float(data.get("speed", 1.0)),
                "output_path": "/content/kokoro_speech.wav"
            }
            res = requests.post(f"{url}/synthesize", json=payload, timeout=60).json()
            if res.get("status") == "success":
                return jsonify({
                    "status": "success",
                    "download_url": f"{request.url_root.rstrip('/')}/download/kokoro"
                }), 200
            return jsonify({"status": "error", "message": res.get("message", "Kokoro TTS failed")}), 500
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    task_id = str(uuid.uuid4())
    TASKS[task_id] = {"status": "processing", "stage": "queued", "stagePercent": 0}
    
    thread = threading.Thread(target=_generate_media_worker_with_callback, args=(task_id, data))
    thread.start()
    return jsonify({"status": "accepted", "task_id": task_id, "message": "İş kuyruğa alındı."}), 202

@app.route("/api/v1/lora/train", methods=["POST"])
def lora_train():
    global last_activity_time
    last_activity_time = time.time()

    data = request.get_json(force=True) or {}
    job_id = data.get("job_id")
    character_name = data.get("character_name", "character")
    image_paths = data.get("image_paths", [])
    callback_url = data.get("callback_url", "")

    if not image_paths:
        return jsonify({"status": "error", "message": "image_paths required"}), 400

    task_id = str(uuid.uuid4())
    TASKS[task_id] = {"status": "processing", "stage": "lora_training", "stagePercent": 0}

    def _train_worker(tid, params):
        try:
            TASKS[tid]["stagePercent"] = 5
            TASKS[tid]["message"] = "LoRA eğitimi başlatılıyor..."
            url = container_manager.ensure_container("lora-trainer")
            res = requests.post(f"{url}/train", json=params, timeout=600).json()
            if res.get("status") == "success":
                TASKS[tid] = {
                    "status": "success",
                    "stage": "lora_training_complete",
                    "stagePercent": 100,
                    "message": "LoRA eğitimi tamamlandı",
                    "weights_path": res.get("weights_path"),
                    "steps_completed": res.get("steps_completed", 0)
                }
                if callback_url:
                    try:
                        requests.post(callback_url, json={
                            "task_id": tid, "job_id": job_id,
                            "status": "success", "type": "lora",
                            "weights_path": res.get("weights_path"),
                            "steps_completed": res.get("steps_completed")
                        }, timeout=30)
                    except Exception:
                        pass
            else:
                TASKS[tid] = {"status": "error", "stage": "lora_training_failed", "message": res.get("message", "LoRA training failed")}
        except Exception as e:
            TASKS[tid] = {"status": "error", "stage": "lora_training_failed", "message": str(e)}

    thread = threading.Thread(target=_train_worker, args=(task_id, {
        "job_id": job_id,
        "character_name": character_name,
        "image_paths": image_paths,
        "output_dir": f"/content/lora_weights/{job_id}"
    }))
    thread.start()
    return jsonify({"status": "accepted", "task_id": task_id}), 202

@app.route("/status/<task_id>", methods=["GET"])
def task_status(task_id):
    if task_id not in TASKS:
        return jsonify({"status": "error", "message": "Task ID bulunamadı"}), 404
    return jsonify(TASKS[task_id])

@app.route("/apply-lipsync", methods=["POST"])
def apply_lipsync_endpoint():
    global last_activity_time
    last_activity_time = time.time()
    
    data = request.get_json(force=True) or {}
    video_path = data.get("video_path")
    audio_path = data.get("audio_path")
    
    if not video_path or not audio_path:
        return jsonify({"error": "video_path ve audio_path zorunlu"}), 400
        
    try:
        url = container_manager.ensure_container("wav2lip")
        res = requests.post(f"{url}/apply-lipsync", json=data, timeout=300)
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/transcribe", methods=["POST"])
def transcribe_route():
    global last_activity_time
    last_activity_time = time.time()
    
    try:
        url = container_manager.ensure_container("whisper")
        if "file" in request.files:
            files = {"file": (request.files["file"].filename, request.files["file"].stream, request.files["file"].mimetype)}
            data = request.form.to_dict()
            res = requests.post(f"{url}/transcribe", files=files, data=data, timeout=300)
        else:
            res = requests.post(f"{url}/transcribe", json=request.get_json(force=True), timeout=300)
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/faster-whisper", methods=["POST"])
def faster_whisper_route():
    # Same as transcribe
    return transcribe_route()

@app.route("/synthesize-speech", methods=["POST"])
def synthesize_speech_route():
    global last_activity_time
    last_activity_time = time.time()
    
    try:
        data = request.get_json(force=True) or {}
        tts_container = "f5tts" if data.get("provider") == "f5tts" else "xtts"
        url = container_manager.ensure_container(tts_container)
        output_path = f"/tmp/synth_speech_{uuid.uuid4().hex[:8]}.wav"
        data["output_path"] = output_path
        
        res = requests.post(f"{url}/synthesize", json=data, timeout=180).json()
        if res.get("status") == "success" and os.path.exists(output_path):
            return send_file(output_path, mimetype="audio/wav", as_attachment=True, download_name="speech.wav")
        return jsonify({"error": res.get("message", f"{tts_container} container speech generation failed")}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- LIGHTWEIGHT HOST ENDPOINTS ---
@app.route("/remove-background", methods=["POST"])
def remove_background():
    global last_activity_time
    last_activity_time = time.time()
    
    if "image" not in request.files:
        return jsonify({"error": "Görsel dosyası ('image') gönderilmedi"}), 400
        
    try:
        import rembg
        input_data = request.files["image"].read()
        output_data = rembg.remove(input_data)
        import io
        return send_file(io.BytesIO(output_data), mimetype="image/png")
    except ImportError:
        subprocess.run(["pip", "install", "rembg"], capture_output=True)
        import rembg
        input_data = request.files["image"].read()
        output_data = rembg.remove(input_data)
        import io
        return send_file(io.BytesIO(output_data), mimetype="image/png")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/inpaint-image", methods=["POST"])
def inpaint_image():
    global last_activity_time
    last_activity_time = time.time()
    
    # Forward SD inpainting requests to stablediffusion container
    try:
        url = container_manager.ensure_container("stablediffusion")
        
        image_file = request.files["image"]
        mask_file = request.files["mask"]
        prompt = request.form.get("prompt", "")
        
        image_path = "/content/inpaint_temp_img.png"
        mask_path = "/content/inpaint_temp_mask.png"
        output_path = "/content/inpaint_output.png"
        
        image_file.save(image_path)
        mask_file.save(mask_path)
        
        payload = {
            "image_path": image_path,
            "mask_path": mask_path,
            "prompt": prompt,
            "output_path": output_path
        }
        res = requests.post(f"{url}/inpaint", json=payload, timeout=180).json()
        if res.get("status") == "success" and os.path.exists(output_path):
            return send_file(output_path, mimetype="image/png")
        return jsonify({"error": res.get("message", "Inpainting failed")}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/eye-contact", methods=["POST"])
def api_eye_contact():
    global last_activity_time
    last_activity_time = time.time()
    
    data = request.get_json(force=True) or {}
    video_path = data.get("video_path")
    output_path = data.get("output_path")
    
    if not video_path or not output_path:
        return jsonify({"error": "video_path ve output_path parametreleri zorunludur"}), 400
        
    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        
        temp_out = f"/content/gaze_temp_{uuid.uuid4().hex[:8]}.mp4"
        out = cv2.VideoWriter(temp_out, fourcc, fps, (width, height))
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
                
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
        out.release()
        
        cmd = [
            "ffmpeg", "-y", "-i", temp_out, "-i", video_path,
            "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "copy", "-c:a", "aac",
            "-shortest", output_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if os.path.exists(temp_out):
            os.unlink(temp_out)
            
        return jsonify({"status": "success", "output_path": output_path})
    except Exception as e:
        try:
            shutil.copyfile(video_path, output_path)
            return jsonify({"status": "success", "output_path": output_path, "note": f"Fallback applied due to error: {e}"})
        except Exception as copy_e:
            return jsonify({"error": f"Failed eye contact: {copy_e}"}), 500

@app.route("/api/v1/inpaint", methods=["POST"])
def api_video_inpaint():
    global last_activity_time
    last_activity_time = time.time()
    
    data = request.get_json(force=True) or {}
    video_path = data.get("video_path")
    mask_regions = data.get("mask_regions", [])
    output_path = data.get("output_path")
    
    if not video_path or not output_path:
        return jsonify({"error": "video_path ve output_path zorunlu"}), 400
        
    try:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        
        temp_out = f"/content/inpaint_temp_{uuid.uuid4().hex[:8]}.mp4"
        out = cv2.VideoWriter(temp_out, fourcc, fps, (width, height))
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            
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
                
            inpainted = cv2.inpaint(frame, mask, 3, cv2.INPAINT_TELEA)
            out.write(inpainted)
            
        cap.release()
        out.release()
        
        cmd = [
            "ffmpeg", "-y", "-i", temp_out, "-i", video_path,
            "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "copy", "-c:a", "aac",
            "-shortest", output_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if os.path.exists(temp_out):
            os.unlink(temp_out)
        return jsonify({"status": "success", "output_path": output_path})
    except Exception as e:
        try:
            shutil.copyfile(video_path, output_path)
            return jsonify({"status": "success", "output_path": output_path, "note": f"Fallback applied: {e}"})
        except:
            return jsonify({"error": str(e)}), 500

@app.route("/generate-image", methods=["POST"])
def generate_image_route():
    global last_activity_time
    last_activity_time = time.time()
    
    try:
        url = container_manager.ensure_container("stablediffusion")
        data = request.get_json(force=True) or {}
        output_path = "/content/generated_anchor.png"
        data["output_path"] = output_path
        res = requests.post(f"{url}/generate-image", json=data, timeout=180).json()
        if res.get("status") == "success" and os.path.exists(output_path):
            return send_file(output_path, mimetype="image/png")
        return jsonify({"error": res.get("message", "DreamShaper/Flux generation failed")}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/generate-covers", methods=["POST"])
def generate_covers_route():
    global last_activity_time
    last_activity_time = time.time()
    
    try:
        url = container_manager.ensure_container("stablediffusion")
        data = request.get_json(force=True) or {}
        cover_prompt = data.get("cover_prompt", "")
        job_id = data.get("job_id")
        callback_url = data.get("callback_url")
        
        cover_paths = ["/content/cover_0.jpg", "/content/cover_1.jpg", "/content/cover_2.jpg"]
        payload = {
            "cover_prompt": cover_prompt,
            "output_paths": cover_paths
        }
        res = requests.post(f"{url}/generate-covers", json=payload, timeout=240).json()
        if res.get("status") != "success":
            raise RuntimeError(res.get("message", "Cover generation container error"))
            
        # Push covers using callback
        if callback_url and job_id:
            files = {}
            for i in range(3):
                if os.path.exists(cover_paths[i]):
                    files[f'cover_{i}'] = open(cover_paths[i], 'rb')
            
            cb_payload = {"job_id": job_id, "status": "success", "type": "covers", "message": "Covers design complete"}
            requests.post(callback_url, data=cb_payload, files=files, timeout=60)
            
        return jsonify({"status": "success", "message": "Covers generated successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/download/cover/<int:index>", methods=["GET"])
def download_cover(index):
    if index < 0 or index > 2:
        return jsonify({"error": "Index must be 0, 1 or 2"}), 400
    path = f"/content/cover_{index}.jpg"
    if not os.path.exists(path):
        return jsonify({"error": "Cover not found"}), 404
    return send_file(path, mimetype="image/jpeg")

@app.route("/generate-broll", methods=["POST"])
def generate_broll():
    global last_activity_time
    last_activity_time = time.time()
    
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    scene_number = data.get("scene_number", 1)
    duration = data.get("duration", 6)
    job_id = data.get("job_id", 1)
    
    broll_path = f"/content/broll_{job_id}_{scene_number}.mp4"
    pexels_key = os.environ.get("PEXELS_API_KEY", "")
    
    if pexels_key:
        try:
            headers = {"Authorization": pexels_key}
            res = requests.get(f"https://api.pexels.com/videos/search?query={prompt}&per_page=5", headers=headers, timeout=10)
            if res.status_code == 200:
                videos = res.json().get("videos", [])
                if videos:
                    links = [v.get("video_files", []) for v in videos]
                    mp4_links = [l for fl in links for l in fl if l.get("file_type") == "video/mp4"]
                    if mp4_links:
                        dl_url = mp4_links[0].get("link")
                        v_data = requests.get(dl_url, timeout=30).content
                        with open(broll_path, "wb") as f: f.write(v_data)
                        
                        temp_cut = f"/content/broll_cut_{job_id}_{scene_number}.mp4"
                        subprocess.run([
                            "ffmpeg", "-y", "-i", broll_path, "-t", str(duration),
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", temp_cut
                        ], capture_output=True)
                        if os.path.exists(temp_cut):
                            os.rename(temp_cut, broll_path)
                        return jsonify({"status": "success", "source": "pexels", "download_url": f"/download/broll/{job_id}/{scene_number}"})
        except Exception as e:
            print(f"[SUPERVISOR] B-roll Pexels failed, falling back to AI: {e}")
            
    # AI Fallback
    try:
        black_path = "/content/black.jpg"
        if not os.path.exists(black_path):
            cv2.imwrite(black_path, np.zeros((1920, 1080, 3), dtype=np.uint8))
            
        # Try CogVideoX, then LTX, launching their respective containers
        models = [
            ("CogVideoX-5b-I2V", "cogvideox"),
            ("LTX-Video-I2V", "ltx")
        ]
        generated = False
        for model, container_name in models:
            try:
                url = container_manager.ensure_container(container_name)
                payload = {
                    "prompt": prompt,
                    "image_path": black_path,
                    "video_model": model,
                    "output_path": broll_path
                }
                res = requests.post(f"{url}/generate", json=payload, timeout=240).json()
                if res.get("status") == "success":
                    generated = True
                    break
            except Exception as broll_e:
                print(f"[SUPERVISOR] B-roll generation with {model} failed: {broll_e}")
                
        if not generated:
            raise RuntimeError("All B-roll fallback models failed")
            
        return jsonify({"status": "success", "source": "ai", "download_url": f"/download/broll/{job_id}/{scene_number}"})
    except Exception as e:
        # Static black clip fallback
        try:
            black_path = "/content/black.jpg"
            if not os.path.exists(black_path):
                cv2.imwrite(black_path, np.zeros((1920, 1080, 3), dtype=np.uint8))
            subprocess.run([
                "ffmpeg", "-y", "-loop", "1", "-i", black_path, "-t", str(duration),
                "-c:v", "libx264", "-pix_fmt", "yuv420p", broll_path
            ], capture_output=True)
            return jsonify({"status": "success", "source": "static_fallback", "download_url": f"/download/broll/{job_id}/{scene_number}"})
        except:
            return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/localize-dubbing", methods=["POST"])
def localize_dubbing():
    global last_activity_time
    last_activity_time = time.time()
    
    data = request.get_json(force=True) or {}
    speech_text = data.get("speech_text", "")
    target_lang = data.get("target_lang", "en")
    job_id = data.get("job_id", 1)
    scene_number = data.get("scene_number", 1)
    ref_audio_b64 = data.get("reference_audio_base64", "")
    speaker_wav = data.get("speaker_wav", "/content/karakter.wav")
    
    out_audio_path = f"/content/localized_speech_{job_id}_{scene_number}.wav"
    out_video_path = f"/content/localized_video_{job_id}_{scene_number}.mp4"
    
    # 1. Synthesize
    try:
        url = container_manager.ensure_container("xtts")
        payload = {
            "text": speech_text,
            "output_path": out_audio_path,
            "provider": "xtts",
            "speaker_wav": speaker_wav,
            "language": target_lang,
            "reference_audio_base64": ref_audio_b64
        }
        res = requests.post(f"{url}/synthesize", json=payload, timeout=180).json()
        if res.get("status") != "success":
            raise RuntimeError("TTS failed")
    except Exception as e:
        return jsonify({"status": "error", "message": f"TTS localized dubbing failed: {e}"}), 500
        
    # 2. Lip Sync
    try:
        local_video_path = f"/content/ms_{job_id}_{scene_number}.mp4"
        if not os.path.exists(local_video_path) and os.path.exists(LAST_VIDEO_PATH):
            local_video_path = LAST_VIDEO_PATH
            
        url = container_manager.ensure_container("wav2lip")
        payload = {
            "video_path": local_video_path,
            "audio_path": out_audio_path
        }
        res = requests.post(f"{url}/apply-lipsync", json=payload, timeout=240).json()
        if res.get("success") and res.get("output_path"):
            shutil.copyfile(res["output_path"], out_video_path)
        else:
            raise RuntimeError(res.get("error", "Lip Sync failed"))
    except Exception as e:
        # FFmpeg copy audio to video fallback
        subprocess.run([
            "ffmpeg", "-y", "-i", local_video_path, "-i", out_audio_path,
            "-c:v", "copy", "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0",
            "-shortest", out_video_path
        ], capture_output=True)
        
    return jsonify({
        "status": "success",
        "video_url": f"/download/localized/video/{job_id}/{scene_number}",
        "audio_url": f"/download/localized/audio/{job_id}/{scene_number}"
    })

# --- DOWNLOADS ---
@app.route("/download/video")
def download_video(): return send_file(LAST_VIDEO_PATH, mimetype="video/mp4")

@app.route("/download/speech")
def download_speech(): return send_file(AUDIO_PATH, mimetype="audio/wav")

@app.route("/download/kokoro")
def download_kokoro():
    path = "/content/kokoro_speech.wav"
    if not os.path.exists(path):
        return jsonify({"error": "Kokoro file not found"}), 404
    return send_file(path, mimetype="audio/wav")

@app.route("/download/sfx")
def download_sfx(): return send_file(SFX_PATH, mimetype="audio/wav")

@app.route("/download/subtitle")
def download_subtitle():
    if not os.path.exists(SUBTITLE_PATH):
        return jsonify({"error": "Altyazı bulunamadı"}), 404
    return send_file(SUBTITLE_PATH, mimetype="text/plain", download_name="subtitle.srt")

@app.route("/download/broll/<int:job_id>/<int:scene_number>", methods=["GET"])
def download_broll_file(job_id, scene_number):
    path = f"/content/broll_{job_id}_{scene_number}.mp4"
    if not os.path.exists(path): return jsonify({"error": "B-roll not found"}), 404
    return send_file(path, mimetype="video/mp4")

@app.route("/download/localized/video/<int:job_id>/<int:scene_number>", methods=["GET"])
def download_localized_video(job_id, scene_number):
    path = f"/content/localized_video_{job_id}_{scene_number}.mp4"
    if not os.path.exists(path): return jsonify({"error": "Not found"}), 404
    return send_file(path, mimetype="video/mp4")

@app.route("/download/localized/audio/<int:job_id>/<int:scene_number>", methods=["GET"])
def download_localized_audio(job_id, scene_number):
    path = f"/content/localized_speech_{job_id}_{scene_number}.wav"
    if not os.path.exists(path): return jsonify({"error": "Not found"}), 404
    return send_file(path, mimetype="audio/wav")

# --- AVATAR & MUSETALK & SPLIT ---
@app.route("/generate-avatar", methods=["POST"])
def generate_avatar():
    global last_activity_time
    last_activity_time = time.time()
    try:
        url = container_manager.ensure_container("stablediffusion")
        res = requests.post(f"{url}/generate-avatar", json=request.get_json(force=True), timeout=240)
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/musetalk", methods=["POST"])
def musetalk_endpoint():
    global last_activity_time
    last_activity_time = time.time()
    
    if "face" not in request.files or "audio" not in request.files:
        return jsonify({"error": "face ve audio gerekli"}), 400
        
    try:
        url = container_manager.ensure_container("musetalk")
        files = {
            "face": (request.files["face"].filename, request.files["face"].stream, request.files["face"].mimetype),
            "audio": (request.files["audio"].filename, request.files["audio"].stream, request.files["audio"].mimetype)
        }
        data = {"bbox": request.form.get("bbox", "")}
        res = requests.post(f"{url}/generate", files=files, data=data, timeout=300)
        
        # Return video stream/bytes directly
        return res.content, res.status_code, {"Content-Type": "video/mp4"}
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/musetalk/preload", methods=["POST"])
def musetalk_preload():
    try:
        url = container_manager.ensure_container("musetalk")
        res = requests.post(f"{url}/preload", timeout=120)
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/lipsync/combo", methods=["POST"])
def lipsync_combo_endpoint():
    global last_activity_time
    last_activity_time = time.time()
    
    data = request.get_json(force=True) or {}
    video_path = data.get("video_path")
    audio_path = data.get("audio_path")
    
    if not video_path or not audio_path:
        return jsonify({"error": "video_path ve audio_path zorunlu"}), 400
        
    try:
        # Step 1: Wav2Lip
        url_w2l = container_manager.ensure_container("wav2lip")
        res1 = requests.post(f"{url_w2l}/apply-lipsync", json=data, timeout=240).json()
        
        step1_path = res1.get("output_path", video_path) if res1.get("success") else video_path
        
        # Step 2: MuseTalk
        url_mt = container_manager.ensure_container("musetalk")
        
        # Extract first frame as face image for MuseTalk
        face_img = "/tmp/combo_face.jpg"
        cap = cv2.VideoCapture(step1_path)
        ret, frame = cap.read()
        if ret: cv2.imwrite(face_img, frame)
        cap.release()
        
        if not ret or not os.path.exists(face_img):
            return send_file(step1_path, mimetype="video/mp4")
            
        files = {
            "face": open(face_img, "rb"),
            "audio": open(audio_path, "rb")
        }
        res2 = requests.post(f"{url_mt}/generate", files=files, timeout=300)
        
        if os.path.exists(face_img): os.remove(face_img)
        
        if res2.status_code == 200:
            return res2.content, 200, {"Content-Type": "video/mp4"}
        return send_file(step1_path, mimetype="video/mp4")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/split/preview", methods=["GET"])
def split_preview():
    layout = request.args.get("layout", "50/50")
    position = request.args.get("position", "top")
    w, h = 640, 360
    img = np.zeros((h, w, 3), dtype=np.uint8)
    if position in ("left", "right"):
        split_x = int(w * (int(layout[:2]) / 100))
        if position == "left": img[:, :split_x] = [255, 255, 255]
        else: img[:, split_x:] = [255, 255, 255]
    else:
        split_y = int(h * (int(layout[:2]) / 100))
        if position == "top": img[:split_y, :] = [255, 255, 255]
        else: img[split_y:, :] = [255, 255, 255]
    
    temp = f"/tmp/split_preview_{uuid.uuid4().hex[:8]}.jpg"
    cv2.imwrite(temp, img)
    try: return send_file(temp, mimetype="image/jpeg")
    finally:
        if os.path.exists(temp): os.remove(temp)

@app.route("/api/v1/split/apply", methods=["POST"])
def split_apply():
    data = request.get_json(force=True) or {}
    job_id = data.get("job_id")
    if not job_id: return jsonify({"error": "job_id zorunludur"}), 400
    
    path = f"/content/split_config_{job_id}.json"
    with open(path, "w") as f: json.dump(data, f)
    return jsonify({"status": "success", "config_path": path})

@app.route("/api/v1/studio/smart-reframe", methods=["POST"])
def studio_smart_reframe():
    global last_activity_time
    last_activity_time = time.time()
    
    if "video" not in request.files: return jsonify({"error": "video gerekli"}), 400
    try:
        input_path = "/tmp/reframe_in.mp4"
        output_path = "/tmp/reframe_out.mp4"
        request.files["video"].save(input_path)
        
        opts = json.loads(request.form.get("options", "{}"))
        tw = opts.get("outputWidth", 1080)
        th = opts.get("outputHeight", 1920)
        
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vf", f"crop={tw}:{th}:(in_w-{tw})/2:(in_h-{th})/2",
            "-c:a", "aac", "-c:v", "libx264", "-preset", "fast", output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        with open(output_path, "rb") as f: content = f.read()
        return content, 200, {"Content-Type": "video/mp4"}
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for p in [input_path, output_path]:
            if os.path.exists(p): os.remove(p)

@app.route("/api/v1/studio/studio-sound", methods=["POST"])
def studio_sound():
    global last_activity_time
    last_activity_time = time.time()
    
    if "video" not in request.files: return jsonify({"error": "video gerekli"}), 400
    try:
        input_path = "/tmp/sound_in.mp4"
        output_path = "/tmp/sound_out.mp4"
        request.files["video"].save(input_path)
        
        opts = json.loads(request.form.get("options", "{}"))
        denoise = opts.get("denoise", True)
        deecho = opts.get("deecho", True)
        eq = opts.get("equalize", False)
        ldb = opts.get("levelDb", -3)
        
        filters = ["highpass=f=200", "lowpass=f=3000"]
        if denoise: filters.append("afftdn=nr=10:nf=-20")
        if deecho: filters.extend(["anlmdn=s=7:p=0.005", "dynaudnorm=g=15:f=150"])
        if eq: filters.extend(["equalizer=f=3000:t=h:width_type=s:width=0.5:g=2", "equalizer=f=300:t=h:width_type=s:width=0.5:g=-1"])
        filters.append(f"loudnorm=I={ldb}:LRA=11:TP={ldb+1}")
        
        cmd = [
            "ffmpeg", "-y", "-i", input_path, "-af", ",".join(filters),
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        with open(output_path, "rb") as f: content = f.read()
        return content, 200, {"Content-Type": "video/mp4"}
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for p in [input_path, output_path]:
            if os.path.exists(p): os.remove(p)

# --- SHUTDOWN & HEALTH & DIAGNOSTICS ---
@app.route("/shutdown", methods=["POST"])
def shutdown_server():
    print("[SUPERVISOR] Shutdown requested. Terminating Colab VM...")
    threading.Thread(target=trigger_vm_shutdown).start()
    return jsonify({"status": "shutdown_triggered", "message": "Colab oturumu kapatılıyor."}), 200

@app.route("/health", methods=["GET"])
def health_check():
    gpu_total_gb = 0.0
    gpu_used_gb = 0.0
    gpu_pct = 0.0
    gpu_model = None
    
    try:
        import torch
        if torch.cuda.is_available():
            device = torch.cuda.current_device()
            gpu_model = torch.cuda.get_device_name(device)
            gpu_total_gb = torch.cuda.get_device_properties(device).total_memory / (1024**3)
            # Use nvidia-smi command to get VRAM usage, since torch doesn't see container memory allocation
            res = subprocess.run(["nvidia-smi", "--query-gpu=memory.used", "--format=csv,nounits,noheader"], capture_output=True, text=True)
            gpu_used_gb = float(res.stdout.strip()) / 1024.0
            gpu_pct = (gpu_used_gb / gpu_total_gb) * 100 if gpu_total_gb > 0 else 0.0
    except:
        pass
            
    uptime_seconds = int(time.time() - server_start_time)
    DIAGNOSTICS["callbacks"]["tunnel_connectivity"] = check_tunnel_connectivity()
    
    models_loaded = {
        name: container_manager.is_running(name) for name in container_manager.PORTS
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

# --- CLI HELPERS ---
@app.route("/verify-libs", methods=["GET"])
def verify_libs():
    report = {
        "docker": {"status": "ok" if shutil.which("docker") else "missing"},
        "nvidia-smi": {"status": "ok" if shutil.which("nvidia-smi") else "missing"}
    }
    success = all(v["status"] == "ok" for v in report.values())
    return jsonify({"success": success, "report": report}), 200 if success else 500

@app.route("/gpu-info", methods=["GET"])
def gpu_info_route():
    try:
        import torch
        if not torch.cuda.is_available():
            return jsonify({"error": "CUDA not available"}), 503
        device = torch.cuda.current_device()
        return jsonify({
            "gpu_name": torch.cuda.get_device_name(device),
            "vram_gb": round(torch.cuda.get_device_properties(device).total_memory / 1e9, 2),
            "cuda_version": torch.version.cuda or "unknown",
            "is_l4": "L4" in torch.cuda.get_device_name(device)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/test-models", methods=["POST"])
def test_models():
    # Return status of container images
    report = {}
    for name in container_manager.PORTS:
        try:
            res = subprocess.run(["docker", "images", "-q", f"ai-publisher-{name}:latest"], capture_output=True, text=True)
            report[name] = {"image_loaded": len(res.stdout.strip()) > 0}
        except:
            report[name] = {"image_loaded": False}
    return jsonify({"success": True, "models": report})

# --- STARTUP ---
if __name__ == "__main__":
    NGROK_TOKEN = os.environ.get("NGROK_TOKEN", "")
    if not NGROK_TOKEN:
        try:
            from google.colab import userdata
            NGROK_TOKEN = userdata.get('NGROK_TOKEN')
        except Exception:
            pass

    if NGROK_TOKEN and len(NGROK_TOKEN.strip()) > 10:
        from pyngrok import ngrok
        ngrok.set_auth_token(NGROK_TOKEN)
        public_url = ngrok.connect(5000)
        print("\n🔗 NODE.JS PROJENİZE YAPIŞTIRACAĞINIZ URL:\n", public_url.public_url)
        with open("ngrok_url.txt", "w", encoding="utf-8") as f:
            f.write(public_url.public_url)
        print("\n" + "-" * 50 + "\n")
    else:
        print("\n⚠️ NGROK_TOKEN eksik veya geçersiz.")

    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True, use_reloader=False)
