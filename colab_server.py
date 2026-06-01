import os
import torch
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_file
from diffusers import CogVideoXImageToVideoPipeline, AudioLDM2Pipeline
from diffusers.utils import load_image, export_to_video
import scipy.io.wavfile as wavfile

os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"
app = Flask(__name__)

print("🚀 Modeller GPU'ya yükleniyor (VRAM/Sıralı CPU Offload Aktif)...")

# 1. Video Motoru (Image-to-Video) - VRAM Optimizasyonları (offload ve slicing)
video_pipe = CogVideoXImageToVideoPipeline.from_pretrained(
    "THUDM/CogVideoX-2b", 
    torch_dtype=torch.float16,
    low_cpu_mem_usage=True
)
# Doğrudan .to("cuda") yerine katman bazlı offload ve attention slicing etkinleştiriliyor
video_pipe.enable_sequential_cpu_offload()
video_pipe.vae.enable_tiling()
video_pipe.enable_attention_slicing()

# 2. Ses Efekti Motoru - VRAM Optimizasyonu
sfx_pipe = AudioLDM2Pipeline.from_pretrained(
    "cvssp/audioldm2", 
    torch_dtype=torch.float16,
    low_cpu_mem_usage=True
)
sfx_pipe.enable_sequential_cpu_offload()
sfx_pipe.enable_attention_slicing()

# 3. Seslendirme (TTS) Motoru - Lazy loading ile sadece talep anında belleğe yüklenir
tts_model = None

def get_tts():
    global tts_model
    if tts_model is None:
        from TTS.api import TTS
        print("🎙️ XTTS modeli ilk kez yükleniyor...")
        tts_model = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", gpu=True)
    return tts_model

# Dudak/Çene hareketlerini ses genliğine göre esneten animasyon filtresi
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
        
        if volume > 500: # Karakter konuşuyorsa çene-ağız bölgesini esnet
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
    
    # Sahneler arası tutarlılık (Autoregressive Chaining)
    if scene_number > 1 and os.path.exists(LAST_VIDEO_PATH):
        cap = cv2.VideoCapture(LAST_VIDEO_PATH)
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) - 1)
        ret, frame = cap.read()
        if ret: 
            cv2.imwrite("/content/last_frame.jpg", frame)
        cap.release()
        init_image = load_image("/content/last_frame.jpg")
    else:
        init_image = load_image(user_image_path) if user_image_path and os.path.exists(user_image_path) else load_image("https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/diffusers/cogvideox_sample.png")

    # 1. Video Üret (6 saniyelik 8 FPS için 49 frame)
    raw_video_path = "/content/raw_video.mp4"
    video_frames = video_pipe(prompt=final_prompt, image=init_image, num_frames=49, num_inference_steps=35).frames
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

    # 4. Ses Efekti (SFX)
    sfx_path = "/content/sfx.wav"
    if sfx_prompt:
        audio_sfx = sfx_pipe(sfx_prompt, audio_length_in_s=6.0, num_inference_steps=25).audios
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
    print("Sunucu kuruldu, alt hücreden Ngrok başlatabilirsiniz.")
    app.run(port=5000)
