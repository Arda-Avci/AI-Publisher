import os
import torch
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_file
from diffusers import CogVideoXImageToVideoPipeline, AudioLDM2Pipeline
from diffusers.utils import load_image, export_to_video
import scipy.io.wavfile as wavfile
import gc
from pyngrok import ngrok
from PIL import Image
import traceback

app = Flask(__name__)

# Flask içerisindeki tüm hataları zorla konsola yazdıran hata yakalayıcı
@app.errorhandler(Exception)
def handle_exception(e):
    print("❌ SUNUCU HATA DETAYI:")
    traceback.print_exc()
    return jsonify({"status": "error", "message": str(e)}), 500

print("🚀 Flask sunucusu Lazy Loading (Sıralı Bellek Yönetimi) ile hazırlandı.")

# --- LAZY LOADING MOTORLARI ---

def generate_video_lazy(prompt, init_image):
    # Yükleme öncesi GPU önbelleğini tamamen temizle
    gc.collect()
    torch.cuda.empty_cache()
    
    print("🎬 Video motoru belleğe yükleniyor...")
    video_pipe = CogVideoXImageToVideoPipeline.from_pretrained(
        "THUDM/CogVideoX-2b", 
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True
    )
    video_pipe.enable_model_cpu_offload()
    video_pipe.vae.enable_tiling()
    video_pipe.vae.enable_slicing() # Bellek için VAE dilimleme eklendi
    video_pipe.enable_attention_slicing()
    
    print("🎬 Video üretimi başlatıldı...")
    frames = video_pipe(prompt=prompt, image=init_image, num_frames=49, num_inference_steps=30).frames
    
    # Belleği temizle
    del video_pipe
    gc.collect()
    torch.cuda.empty_cache()
    
    return frames

def generate_sfx_lazy(prompt):
    # Yükleme öncesi GPU önbelleğini temizle
    gc.collect()
    torch.cuda.empty_cache()
    
    print("🔊 Ses efekti motoru belleğe yükleniyor...")
    sfx_pipe = AudioLDM2Pipeline.from_pretrained(
        "cvssp/audioldm2", 
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True
    )
    sfx_pipe.enable_model_cpu_offload()
    
    print("🔊 Ses efekti üretiliyor...")
    audio = sfx_pipe(prompt, audio_length_in_s=6.0, num_inference_steps=20).audios
    
    # Belleği anında temizle
    del sfx_pipe
    gc.collect()
    torch.cuda.empty_cache()
    
    return audio

tts_model = None
def get_tts():
    global tts_model
    if tts_model is None:
        from TTS.api import TTS
        print("🎙️ XTTS modeli belleğe yükleniyor...")
        tts_model = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", gpu=True)
    return tts_model

# Dudak/Çene hareketlerini esneten animasyon filtresi
def apply_lipsync(video_path, audio_path, output_path):
    cap = cv2.VideoCapture(video_path)
    sample_rate, audio_data = wavfile.read(audio_path)
    audio_amplitude = np.abs(audio_data)
    if len(audio_amplitude.shape) > 1: 
        audio_amplitude = audio_amplitude[:, 0]
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    frame_idx = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: 
            break
        
        chunk = audio_amplitude[int(frame_idx*(sample_rate/fps)):int((frame_idx+1)*(sample_rate/fps))]
        volume = np.mean(chunk) if len(chunk) > 0 else 0
        
        if volume > 500:
            h, w, _ = frame.shape
            mouth_zone = frame[int(h*0.65):int(h*0.85), int(w*0.4):int(w*0.6)]
            scale = 1.0 + (volume / 25000.0)
            if scale > 1.15: 
                scale = 1.15
            mouth_resized = cv2.resize(mouth_zone, (0,0), fx=1.0, fy=scale, interpolation=cv2.INTER_LINEAR)
            rh, rw, _ = mouth_resized.shape
            frame[int(h*0.65):int(h*0.65)+rh, int(w*0.4):int(w*0.4)+rw] = mouth_resized[:int(h*0.2), :int(w*0.2)]
            
        out.write(frame)
        frame_idx += 1
        
    cap.release()
    out.release()

LAST_VIDEO_PATH = "/content/current_scene.mp4"

@app.route('/generate-media', methods=['POST'])
def generate_media():
    data = request.json
    scene_number = data.get('scene_number', 1)
    video_prompt = data.get('video_prompt')
    speech_text = data.get('speech_text', '')
    sfx_prompt = data.get('sfx_prompt', '')
    character_features = data.get('character_features', '')
    user_image_path = data.get('user_image_path', '')
    
    final_prompt = f"{character_features}, {video_prompt}" if character_features else video_prompt
    
    # Sahneler arası tutarlılık
    if scene_number > 1 and os.path.exists(LAST_VIDEO_PATH):
        cap = cv2.VideoCapture(LAST_VIDEO_PATH)
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) - 1)
        ret, frame = cap.read()
        if ret: 
            cv2.imwrite("/content/last_frame.jpg", frame)
        cap.release()
        init_image = load_image("/content/last_frame.jpg")
    else:
        # Önbelleği aşmak için dosya ismini blank_init_v2.jpg yapıyor ve 720x480 en-boy oranına sabitliyoruz
        if user_image_path and os.path.exists(user_image_path):
            init_image = load_image(user_image_path)
        else:
            print("ℹ️ Başlangıç görseli bulunamadı. Boş referans şablonu oluşturuluyor...")
            blank_img = np.zeros((480, 720, 3), dtype=np.uint8)
            cv2.imwrite("/content/blank_init_v2.jpg", blank_img)
            init_image = load_image("/content/blank_init_v2.jpg")

    # 1. Video Üret (Lazy)
    raw_video_path = "/content/raw_video.mp4"
    video_frames = generate_video_lazy(final_prompt, init_image)
    export_to_video(video_frames, raw_video_path, fps=8)
    
    # 2. Seslendirme (TTS)
    audio_path = "/content/speech.wav"
    if speech_text:
        speaker_wav = "/content/karakter.wav" if os.path.exists("/content/karakter.wav") else None
        tts_inst = get_tts()
        tts_inst.tts_to_file(text=speech_text, speaker_wav=speaker_wav, language="tr", file_path=audio_path)
    else:
        wavfile.write(audio_path, 16000, torch.zeros(16000 * 6).numpy().astype(np.int16))

    # 3. Dudak Senkronu
    apply_lipsync(raw_video_path, audio_path, LAST_VIDEO_PATH)

    # 4. Ses Efekti (SFX Lazy)
    sfx_path = "/content/sfx.wav"
    if sfx_prompt:
        audio_sfx = generate_sfx_lazy(sfx_prompt)
        wavfile.write(sfx_path, 16000, audio_sfx)
    else:
        wavfile.write(sfx_path, 16000, torch.zeros(16000 * 6).numpy().astype(np.int16))

    return jsonify({"status": "success"})

@app.route('/download/video')
def download_video(): 
    return send_file(LAST_VIDEO_PATH, mimetype='video/mp4')

@app.route('/download/speech')
def download_speech(): 
    return send_file("/content/speech.wav", mimetype='audio/wav')

@app.route('/download/sfx')
def download_sfx(): 
    return send_file("/content/sfx.wav", mimetype='audio/wav')

if __name__ == '__main__':
    # 1. Ngrok Auth ve Tünel Bağlantısı
    NGROK_TOKEN = "3EYJuaphUgm2YMvhGpiyRR8OZa6_3cKw59pY6yKS4jxgohw76"
    if NGROK_TOKEN and NGROK_TOKEN != "BURAYA_NGROK_TOKEN_GELECEK":
        ngrok.set_auth_token(NGROK_TOKEN)
        public_url = ngrok.connect(5000)
        print("\n🔗 NODE.JS PROJENİZE YAPIŞTIRACAĞINIZ URL:\n", public_url.public_url)
        print("\n--------------------------------------------------\n")
    else:
        print("\n⚠️ NGROK_TOKEN girilmedi! Tünel oluşturulmadan sadece localhost üzerinden başlatılıyor.\n")

    # 2. Flask Başlat
    app.run(port=5000, debug=True, use_reloader=False)
