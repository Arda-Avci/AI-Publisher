Bu sistem; tek bir master senaryodan video (sahneler arası devamlılıkla), karakter seslendirmesi (TTS), ses efektleri (SFX) üretecek, dudak senkronizasyonu yapacak, videonun altına altyazı basacak, her şeyi iş kuyruğuna sokup sırayla işleyecek, ön yüzde canlı ilerleme çubuğu gösterecek, biter bitmez videoyu otomatik indirecek ve tek tıkla çerezli (güvenli) yöntemle çoklu sosyal medyada (YouTube, TikTok vb.) yayınlamanızı sağlayacaktır.
İşte sıfırdan kurulum rehberiniz:
☁️ BÖLÜM 1: Google Colab Kurulumu (Yapay Zekâ Sunucusu)
Tüm ağır yapay zekâ render yükünü Google'ın ücretsiz ekran kartlarında (GPU) çalıştıracağız.
1. Adım: Defteri Açın ve Ekran Kartını Seçin
Google Colab adresine gidin.
Oturum açtıktan sonra Yeni Defter (New Notebook) seçeneğine tıklayın.
Üst menüden Düzenle (Edit) > Defter Ayarları (Notebook Settings) yolunu izleyin.
Donanım ivmeleyicisini T4 GPU olarak seçip kaydedin.
2. Adım: Gerekli Kütüphaneleri Yükleyin (Hücre 1)
İlk kod hücresine aşağıdaki komutu yapıştırın ve hücrenin solundaki oynat butonuna basarak çalıştırın:
python
# Video, ses ve tünelleme araçlarını topluca kuruyoruz
!pip install diffusers transformers hf_transfer accelerate imageio-ffmpeg Flask flask-ngrok pyngrok TTS
Kodu dikkatli kullanın.

3. Adım: Arka Plan Yapay Zekâ Kodunu Yazın (Hücre 2)
Yeni bir kod hücresi açın, aşağıdaki tüm medya üretim, lip-sync ve API mantığını içeren kodu yapıştırın ve çalıştırın:
python
import os
import torch
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_file
from diffusers import CogVideoXImageToVideoPipeline, AudioLDM2Pipeline
from diffusers.utils import load_image, export_to_video
import scipy.io.wavfile as wavfile
from TTS.api import TTS

os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"
app = Flask(__name__)

print("🚀 Modeller GPU'ya yükleniyor (Bu işlem 5-10 dakika sürebilir)...")

# 1. Video Motoru (Image-to-Video)
video_pipe = CogVideoXImageToVideoPipeline.from_pretrained("THUDM/CogVideoX-5b-I2V", torch_dtype=torch.float16).to("cuda")
video_pipe.enable_model_cpu_offload()
video_pipe.vae.enable_tiling()

# 2. Ses ve Efekt Motorları
sfx_pipe = AudioLDM2Pipeline.from_pretrained("cvssp/audioldm2", torch_dtype=torch.float16).to("cuda")
tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", gpu=True)

# Çene/Dudak hareketlerini ses frekansına göre esneten akıllı animasyon filtresi
def apply_lipsync(video_path, audio_path, output_path):
    cap = cv2.VideoCapture(video_path)
    sample_rate, audio_data = wavfile.read(audio_path)
    audio_amplitude = np.abs(audio_data)
    if len(audio_amplitude.shape) > 1: audio_amplitude = audio_amplitude[:, 0]
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    frame_idx = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        
        chunk = audio_amplitude[int(frame_idx*(sample_rate/fps)):int((frame_idx+
1)*(sample_rate/fps))]
        volume = np.mean(chunk) if len(chunk) > 0 else 0
        
        if volume > 500: # Karakter konuşuyorsa çene-ağız bölgesini esnet
            h, w, _ = frame.shape
            mouth_zone = frame[int(h*0.65):int(h*0.85), int(w*0.4):int(w*0.6)]
            scale = 1.0 + (volume / 25000.0)
            if scale > 1.15: scale = 1.15
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
    
    # Sahneler arası tutarlılık (Video-to-Video zinciri)
    if scene_number > 1 and os.path.exists(LAST_VIDEO_PATH):
        cap = cv2.VideoCapture(LAST_VIDEO_PATH)
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) - 1)
        ret, frame = cap.read()
        if ret: cv2.imwrite("/content/last_frame.jpg", frame)
        cap.release()
        init_image = load_image("/content/last_frame.jpg")
    else:
        init_image = load_image(user_image_path) if user_image_path and os.path.exists(user_image_path) else load_image("https://huggingface.co")

    # 1. Video Üret
    raw_video_path = "/content/raw_video.mp4"
    video_frames = video_pipe(prompt=final_prompt, image=init_image, num_frames=49, num_inference_steps=35).frames
    export_to_video(video_frames, raw_video_path, fps=8)
    
    # 2. Seslendirme (TTS)
    audio_path = "/content/speech.wav"
    if speech_text:
        speaker_wav = "/content/karakter.wav" if os.path.exists("/content/karakter.wav") else None
        tts.tts_to_file(text=speech_text, speaker_wav=speaker_wav, language="tr", file_path=audio_path)
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
def download_video(): return send_file(LAST_VIDEO_PATH, mimetype='video/mp4')
@app.route('/download/speech')
def download_speech(): return send_file("/content/speech.wav", mimetype='audio/wav')
@app.route('/download/sfx')
def download_sfx(): return send_file("/content/sfx.wav", mimetype='audio/wav')

print("Sunucu kuruldu, alt hücreden Ngrok başlatabilirsiniz.")
Kodu dikkatli kullanın.

(İsteğe Bağlı Önemli Not: Kendi sesinizi klonlamak isterseniz, Colab sol paneldeki Klasör simgesine tıklayıp 5 saniyelik konuşma kaydınızı /content/karakter.wav ismiyle buraya sürükleyip bırakabilirsiniz.)
4. Adım: Ngrok Tünelini Açın ve Başlatın (Hücre 3)
Üçüncü bir hücre açın. ngrok.com adresinden ücretsiz alacağınız Auth Token'ı buraya yazıp çalıştırın:
python
from pyngrok import ngrok
import time

# Ngrok Token'ınızı buraya girin
ngrok.set_auth_token("BURAYA_NGROK_TOKEN_GELECEK")

public_url = ngrok.connect(5000)
print("\n🔗 NODE.JS PROJENİZE YAPIŞTIRACAĞINIZ URL:\n", public_url.public_url)
print("\n--------------------------------------------------\n")

app.run(port=5000)
Kodu dikkatli kullanın.

Burada size verilecek olan https://ngrok-free.app adresini bir kenara not edin.
💻 BÖLÜM 2: Node.js / TypeScript Proje Kurulumu
Şimdi kendi bilgisayarınıza geçin. Terminalinizi (Komut satırını) açın ve sırasıyla şu komutları verin:
1. Klasör ve Bağımlılıkların Kurulması
bash
# Proje oluşturma
mkdir yapay-zeka-film-studyosu
cd yapay-zeka-film-studyosu
npm init -y

# Temel paketler, Yapay zeka SDK, Web server, Veritabanı ve Form yönetim araçları
npm install ai @ai-sdk/google axios fs-extra dotenv express express-session bcrypt sqlite3 sqlite multer playwright

# Geliştirici paketleri (TypeScript araçları)
npm install -D typescript @types/node @types/fs-extra @types/express @types/express-session @types/bcrypt @types/sqlite3 tsx

# Playwright tarayıcı motorunu indir
npx playwright install chromium

# Gerekli alt klasörleri aç
mkdir src videolar uploads
Kodu dikkatli kullanın.

2. Ayar Dosyaları ve Çevre Değişkenleri
1. tsconfig.json adında ana dizine bir dosya açın ve şunu yapıştırın:
json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
Kodu dikkatli kullanın.

2. .env adında ana dizine bir dosya açın ve Google AI Studio'dan alacağınız ücretsiz Gemini anahtarını ve Colab linkinizi girin:
env
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyYourGeminiKeyBuraya
COLAB_URL=https://ngrok-free.app
Kodu dikkatli kullanın.

3. Sosyal Medya Çerezlerinin Alınması:
Şifre yazarak Google veya TikTok bot korumalarına takılmamak için tarayıcı oturumunuzu bir kereye mahsus kaydedin. Terminalde şu komutları sırayla çalıştırıp açılan pencerelerde hesaplarınıza manuel giriş yapıp kapatın:
bash
npx playwright open --save-storage=auth_youtube.json https://youtube.com
npx playwright open --save-storage=auth_tiktok.json https://tiktok.com
Kodu dikkatli kullanın.

Böylece ana dizininizde auth_youtube.json ve auth_tiktok.json adında iki adet şifresiz giriş anahtarı oluşacaktır.
🛠️ BÖLÜM 3: Mimari Kod Dosyalarının Yazılması
Tüm kodlar src/ klasörünün içerisine eklenecektir.
1. Dosya: Veritabanı Katmanı (src/db.ts)
typescript
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import bcrypt from 'bcrypt';

export let db: Database;

export async function initDatabase() {
  db = await open({
    filename: path.join(process.cwd(), 'database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT);
    
    CREATE TABLE IF NOT EXISTS video_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, master_prompt TEXT, production_notes TEXT, material_path TEXT, character_features TEXT,
      estimated_minutes REAL, total_scenes INTEGER, completed_scenes INTEGER DEFAULT 0, current_stage TEXT DEFAULT 'Kuyrukta', progress_percent INTEGER DEFAULT 0, final_filename TEXT, status TEXT DEFAULT 'pending',
      target_platforms TEXT,
      yt_title TEXT, yt_desc TEXT, yt_tags TEXT, yt_status TEXT DEFAULT 'not_selected',
      tt_desc TEXT, tt_tags TEXT, tt_status TEXT DEFAULT 'not_selected'
    );
  `);

  const userExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!userExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
  }
}
Kodu dikkatli kullanın.

2. Dosya: Sosyal Medya Yayın Motoru (src/publisher.ts)
typescript
import { chromium } from 'playwright';
import path from 'path';

export async function uploadToYouTube(videoPath: string, title: string, desc: string, tags: string) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'auth_youtube.json' });
  const page = await context.newPage();
  try {
    await page.goto('https://youtube.com');
    await page.waitForSelector('#upload-icon', { timeout: 30000 });
    await page.click('#upload-icon');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#select-files-button');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.resolve(videoPath));

    await page.waitForSelector('xhtml\\:textarea, #textbox', { timeout: 20000 });
    const titleBox = await page.$('#textbox[placeholder*="başlık"]');
    if (titleBox) await titleBox.fill(title);
    const descBox = await page.$('#description-container #textbox');
    if (descBox) await descBox.fill(`${desc}\n\n${tags}`);

    for (let i = 0; i < 3; i++) { await page.click('#next-button'); await page.waitForTimeout(2000); }
    await page.click('tp-yt-paper-radio-button[name="PUBLIC"]');
    await page.click('#done-button');
    await page.waitForTimeout(5000);
  } finally { await browser.close(); }
}

export async function uploadToTikTok(videoPath: string, desc: string, tags: string) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: 'auth_tiktok.json' });
  const page = await context.newPage();
  try {
    await page.goto('https://tiktok.com');
    await page.waitForSelector('iframe[src*="upload"]', { timeout: 30000 });
    const frame = await (await page.$('iframe[src*="upload"]'))?.contentFrame();
    
    const fileChooserPromise = frame!.waitForEvent('filechooser');
    await frame!.click('.upload-btn-input, input[type="file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.resolve(videoPath));

    await frame!.waitForSelector('.public-DraftEditor-content');
    await frame!.fill('.public-DraftEditor-content', `${desc} ${tags}`);
    await frame!.click('button:has-text("Yayınla")');
    await page.waitForTimeout(5000);
  } finally { await browser.close(); }
}
Kodu dikkatli kullanın.

3. Dosya: Sıralı İş Kuyruğu ve Yapay Zekâ Üretim Çarkı (src/queue.ts)
typescript
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { db } from './db.js';

export const clients = new Map<number, any>();
let isProcessing = false;

const StudioSchema = z.object({
  scenes: z.array(z.object({ sceneNumber: z.number(), videoPrompt: z.string(), speechText: z.string(), sfxPrompt: z.string() })),
  marketing: z.object({ ytTitle: z.string(), ytDesc: z.string(), ytTags: z.string(), ttDesc: z.string(), ttTags: z.string() })
});

function broadcast(jobId: number, data: object) {
  const res = clients.get(jobId);
  if (res) res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function checkQueue() {
  if (isProcessing) return;
  const nextJob = await db.get("SELECT * FROM video_jobs WHERE status = 'pending' ORDER BY id ASC");
  if (!nextJob) return;

  isProcessing = true;
  await startProduction(nextJob);
  isProcessing = false;
  checkQueue();
}

async function startProduction(job: any) {
  const COLAB_URL = process.env.COLAB_URL;
  const finalScenes: string[] = [];

  try {
    await db.run("UPDATE video_jobs SET status = 'processing', current_stage = 'Yönetmen Planlaması', progress_percent = 5 WHERE id = ?", [job.id]);
    broadcast(job.id, { stage: 'Yönetmen Planlaması', percent: 5 });

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: StudioSchema,
      prompt: `Hikaye: ${job.master_prompt}. Notlar: ${job.production_notes}. Sahneleri böl ve pazarlama yazılarını oluştur.`
    });

    const totalScenes = object.scenes.length;
    const estMin = totalScenes * 4.5;

    await db.run(`UPDATE video_jobs SET total_scenes = ?, estimated_minutes = ?, yt_title=?, yt_desc=?, yt_tags=?, tt_desc=?, tt_tags=? WHERE id = ?`,
      [totalScenes, estMin, object.marketing.ytTitle, object.marketing.ytDesc, object.marketing.ytTags, object.marketing.ttDesc, object.marketing.ttTags, job.id]);
    broadcast(job.id, { totalScenes, estimatedMinutes: estMin });

    for (const scene of object.scenes) {
      const pct = Math.floor((scene.sceneNumber / totalScenes) * 80) + 10;
      await db.run("UPDATE video_jobs SET current_stage = ?, progress_percent = ? WHERE id = ?", [`Sahne ${scene.sceneNumber} İşleniyor`, pct, job.id]);
      broadcast(job.id, { stage: `Sahne ${scene.sceneNumber} Üretiliyor`, percent: pct, completedScenes: scene.sceneNumber - 1 });

      await axios.post(`${COLAB_URL}/generate-media`, {
        scene_number: scene.sceneNumber, video_prompt: scene.videoPrompt, speech_text: scene.speechText, sfx_prompt: scene.sfxPrompt, character_features: job.character_features, user_image_path: job.material_path
      }, { timeout: 0 });

      const tV = path.join(process.cwd(), 'videolar', `tv_${job.id}_${scene.sceneNumber}.mp4`);
      const tS = path.join(process.cwd(), 'videolar', `ts_${job.id}_${scene.sceneNumber}.wav`);
      const tE = path.join(process.cwd(), 'videolar', `te_${job.id}_${scene.sceneNumber}.wav`);
      const mS = path.join(process.cwd(), 'videolar', `ms_${job.id}_${scene.sceneNumber}.mp4`);

      const dl = async (url: string, dest: string) => {
        const res = await axios({ method: 'GET', url, responseType: 'stream' });
        const w = fs.createWriteStream(dest); res.data.pipe(w);
        return new Promise((r) => w.on('finish', r));
      };

      // Otomatik Download ve FFmpeg Montaj + Altyazı Gömme Aşaması
      await dl(`${COLAB_URL}/download/video`, tV);
      await dl(`${COLAB_URL}/download/speech`, tS);
      await dl(`${COLAB_URL}/download/sfx`, tE);

      await new Promise<void>((res) => {
        const srt = path.join(process.cwd(), 'videolar', `s_${job.id}.srt`);
        if (scene.speechText) fs.writeFileSync(srt, `1\n00:00:00,000 --> 00:00:05,800\n${scene.speechText}`);
        const vf = scene.speechText ? `-vf "subtitles=${srt.replace(/\\/g, '/')}:force_style='Alignment=2,FontSize=16,PrimaryColour=&H00FFFF&'" ` : '';
        const cmd = `ffmpeg -y -i ${tV} -i ${tS} -i ${tE} ${vf}-filter_complex "[1:a][2:a]amix=inputs=2:duration=first[a]" -map 0:v -map "[a]" -c:a aac -shortest ${mS}`;
        exec(cmd, () => { if (fs.existsSync(srt)) fs.removeSync(srt); res(); });
      });

      await fs.remove(tV); await fs.remove(tS); await fs.remove(tE);
      finalScenes.push(mS);
      await db.run("UPDATE video_jobs SET completed_scenes = ? WHERE id = ?", [scene.sceneNumber, job.id]);
    }

    // Sahneleri Uç Uca Birleştir
    await db.run("UPDATE video_jobs SET current_stage = 'Final Montaj', progress_percent = 95 WHERE id = ?", [job.id]);
    broadcast(job.id, { stage: 'Final Montaj', percent: 95 });

    const fName = `film_${job.id}_${Date.now()}.mp4`;
    const fPath = path.join(process.cwd(), 'videolar', fName);
    const txt = path.join(process.cwd(), 'videolar', `l_${job.id}.txt`);
    fs.writeFileSync(txt, finalScenes.map(p => `file '${path.resolve(p)}'`).join('\n'));
    
    await new Promise<void>((r) => { exec(`ffmpeg -y -f concat -safe 0 -i ${txt} -c copy ${fPath}`, () => r()); });
    fs.removeSync(txt); for (const f of finalScenes) fs.removeSync(f);

    await db.run("UPDATE video_jobs SET status = 'completed', current_stage = 'Tamamlandı', progress_percent = 100, final_filename = ? WHERE id = ?", [fName, job.id]);
    broadcast(job.id, { stage: 'Tamamlandı', percent: 100, finalFilename: fName });

  } catch (e) {
    await db.run("UPDATE video_jobs SET status = 'failed', current_stage = 'Hata Verdi' WHERE id = ?", [job.id]);
    broadcast(job.id, { stage: 'Hata Verdi', percent: 0 });
  }
}