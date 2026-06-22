import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { RunPodClient } from '../src/services/runpod.js';
import { runFFmpeg } from '../src/services/videoService.js';

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

console.log('========================================================');
console.log('🎬 Haber Spikeri & Uçak Kazası Entegrasyon Senaryo Testi');
console.log('========================================================');

if (!RUNPOD_API_KEY) {
  console.error('[Hata] RUNPOD_API_KEY environment değişkeni tanımlı değil!');
  process.exit(1);
}

// Env Endpoint Listesi
const ENDPOINTS = {
  WAN25: process.env.RUNPOD_WAN25_ENDPOINT_ID,
  XTTS: process.env.RUNPOD_XTTS_ENDPOINT_ID,
  AUDIOLDM2: process.env.RUNPOD_AUDIOLDM2_ENDPOINT_ID,
  HUNYUAN_AVATAR: process.env.RUNPOD_HUNYUANVIDEO_ENDPOINT_ID,
  MUSETALK: process.env.RUNPOD_MUSETALK_ENDPOINT_ID,
};

// Çıktı klasörlerini hazırla
const OUTPUT_DIR = path.join(process.cwd(), 'videolar');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const TEMP_DIR = path.join(OUTPUT_DIR, 'temp_news_crash');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Durum Takip Fonksiyonu (Webhook bypass polling)
async function pollJob(endpointId: string, jobId: string, maxWaitSeconds = 900): Promise<string> {
  const start = Date.now();
  console.log(`[Polling] Job ID ${jobId} için durum kontrol ediliyor...`);

  while (Date.now() - start < maxWaitSeconds * 1000) {
    const statusRes = await RunPodClient.getJobStatus(endpointId, jobId);
    const status = statusRes.status;

    console.log(`  - Durum: ${status} | Geçen süre: ${Math.floor((Date.now() - start) / 1000)}s`);

    if (status === 'COMPLETED') {
      // Çıktı URL'ini ayıkla (Genellikle response içinde url veya output alanında olur)
      const output = statusRes.output;
      let fileUrl = '';
      if (typeof output === 'string') {
        fileUrl = output;
      } else if (output && typeof output === 'object') {
        fileUrl = output.url || output.video_url || output.audio_url || output.output_url || (Array.isArray(output) ? output[0] : '');
      }

      if (!fileUrl) {
        throw new Error(`Job ${jobId} tamamlandı fakat çıktı URL'i bulunamadı. Yanıt: ${JSON.stringify(statusRes)}`);
      }

      console.log(`[Başarılı] Job ${jobId} tamamlandı! Çıktı URL: ${fileUrl}`);
      return fileUrl;
    }

    if (status === 'FAILED') {
      throw new Error(`Job ${jobId} hata aldı! Detaylar: ${JSON.stringify(statusRes.error || statusRes)}`);
    }

    if (status === 'CANCELLED') {
      throw new Error(`Job ${jobId} iptal edildi.`);
    }

    await sleep(5000); // 5 saniye bekle
  }

  throw new Error(`Job ${jobId} zaman aşımına uğradı (${maxWaitSeconds}s).`);
}

// URL'den dosya indirme fonksiyonu (Axios ile)
async function downloadFile(url: string, destPath: string): Promise<void> {
  console.log(`[Download] İndiriliyor: ${url} -> ${destPath}`);
  const axios = (await import('axios')).default;
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function runScenario() {
  // 0. Endpoint Kontrolleri (Mock kesinlikle yasak, eksiklik durumunda patlatıyoruz)
  const missingEndpoints = Object.entries(ENDPOINTS)
    .filter(([_, val]) => !val)
    .map(([key]) => key);

  if (missingEndpoints.length > 0) {
    throw new Error(`[Hata] Gerekli RunPod Endpoint ID'leri eksik: ${missingEndpoints.join(', ')}. .env dosyasını doldurmalısınız.`);
  }

  console.log('1. AŞAMA: Metinlerin Türkçe Seslendirmesi (XTTS-v2)');
  
  // Sahne 1 Seslendirme
  const text1 = 'Sayın seyirciler, stüdyomuzdan canlı yayınla sıcak bir gelişmeyi aktarıyoruz. Şu anda arkamdaki pencereden alevler içinde bir uçağın geçtiği görülüyor.';
  console.log(`[XTTS] Sahne 1 ses sentezi başlatılıyor...`);
  const ttsJob1 = await RunPodClient.runJob(ENDPOINTS.XTTS!, {
    text: text1,
    language: 'tr',
    speaker_wav: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/anchor_ref.wav', // stüdyo spikeri ses referansı
  });
  const audioUrl1 = await pollJob(ENDPOINTS.XTTS!, ttsJob1.id);
  const audioPath1 = path.join(TEMP_DIR, 'scene1_audio.wav');
  await downloadFile(audioUrl1, audioPath1);

  // Sahne 2 Seslendirme (Spikerin arka plandaki telaşlı sesi)
  const text2 = 'Aman tanrım! Uçak hızla irtifa kaybediyor! Evet, kontrolü tamamen kaybetti ve şu an yere çakılıyor!';
  console.log(`[XTTS] Sahne 2 ses sentezi başlatılıyor...`);
  const ttsJob2 = await RunPodClient.runJob(ENDPOINTS.XTTS!, {
    text: text2,
    language: 'tr',
    speaker_wav: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/anchor_ref.wav',
  });
  const audioUrl2 = await pollJob(ENDPOINTS.XTTS!, ttsJob2.id);
  const audioPath2 = path.join(TEMP_DIR, 'scene2_audio.wav');
  await downloadFile(audioUrl2, audioPath2);


  console.log('\n2. AŞAMA: Uçağın Düşüş Ses Efekti Üretimi (AudioLDM2)');
  
  const sfxPrompt = 'Deafening airplane jet engine roaring, metal tearing and screaming, followed by a massive hollow explosion and ground shaking crash.';
  console.log(`[AudioLDM2] Ses efekti sentezi başlatılıyor...`);
  const sfxJob = await RunPodClient.runJob(ENDPOINTS.AUDIOLDM2!, {
    prompt: sfxPrompt,
    duration: 6.0,
    guidance_scale: 3.5,
    ddim_steps: 30,
  });
  const sfxUrl = await pollJob(ENDPOINTS.AUDIOLDM2!, sfxJob.id);
  const sfxPath = path.join(TEMP_DIR, 'scene2_sfx.wav');
  await downloadFile(sfxUrl, sfxPath);


  console.log('\n3. AŞAMA: Sahne 1 Videosu Üretimi (Haber Spikeri + Arkadan Geçen Uçak)');
  
  // Spiker videosu sentezi (HunyuanVideo-Avatar API)
  // spikerin ağzı XTTS ses dosyasıyla senkronize edilir
  console.log(`[HunyuanVideo-Avatar] Sahne 1 videosu sentezleniyor...`);
  const avatarJob1 = await RunPodClient.runJob(ENDPOINTS.HUNYUAN_AVATAR!, {
    video_url: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/news_anchor_burning_airplane_bg.mp4', // arkasında yanan uçak geçen spiker taban videosu
    audio_url: audioUrl1,
  });
  const videoUrl1 = await pollJob(ENDPOINTS.HUNYUAN_AVATAR!, avatarJob1.id);
  const videoPath1 = path.join(TEMP_DIR, 'scene1_avatar.mp4');
  await downloadFile(videoUrl1, videoPath1);


  console.log('\n4. AŞAMA: Sahne 2 Videosu Üretimi (Uçağın Düşüşü & Patlama)');
  
  // Wan2.5 video sentezi
  const videoPrompt2 = 'Cinematic close-up tracking shot, camera rapidly zooms into the burning airplane. The airplane wing breaks off in fire, plunging vertically and crashing into a grassy field, causing a massive realistic fiery explosion and debris flying.';
  console.log(`[Wan2.5] Sahne 2 (Uçak kazası/zoom) videosu sentezleniyor...`);
  const videoJob2 = await RunPodClient.runJob(ENDPOINTS.WAN25!, {
    prompt: videoPrompt2,
    num_frames: 49,
    width: 832,
    height: 480,
    guidance_scale: 5,
    num_inference_steps: 30,
  });
  const videoUrl2 = await pollJob(ENDPOINTS.WAN25!, videoJob2.id);
  const videoPath2 = path.join(TEMP_DIR, 'scene2_raw_video.mp4');
  await downloadFile(videoUrl2, videoPath2);


  console.log('\n5. AŞAMA: Kurgu ve FFmpeg Mixing / Concat Adımları');

  // Sahne 2: Video + Spiker Sesi + Patlama Efekti (amix) miksleme
  console.log('[FFmpeg] Sahne 2 ses ve ses efekti miksleniyor...');
  const scene2MixedPath = path.join(TEMP_DIR, 'scene2_mixed.mp4');
  
  // FFmpeg komutu: Video, spiker sesi ve SFX'i birleştirir.
  const mixArgs = [
    '-i', videoPath2,
    '-i', audioPath2,
    '-i', sfxPath,
    '-filter_complex', '[1:a][2:a]amix=inputs=2:duration=first[a]',
    '-map', '0:v',
    '-map', '[a]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    '-y', scene2MixedPath
  ];
  await runFFmpeg('ffmpeg', mixArgs);
  console.log('[OK] Sahne 2 miksajı tamamlandı.');

  // Concat Listesi oluştur
  const concatListPath = path.join(TEMP_DIR, 'concat_list.txt');
  const fileContent = `file '${videoPath1.replace(/\\/g, '/')}'\nfile '${scene2MixedPath.replace(/\\/g, '/')}'\n`;
  fs.writeFileSync(concatListPath, fileContent, 'utf-8');

  // Sahne 1 ve Sahne 2'yi Concat etme
  console.log('[FFmpeg] Sahneler birleştiriliyor (concat)...');
  const finalVideoPath = path.join(OUTPUT_DIR, 'news_crash_test.mp4');
  const concatArgs = [
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    '-c', 'copy',
    '-y', finalVideoPath
  ];
  await runFFmpeg('ffmpeg', concatArgs);
  console.log(`[OK] Final videosu hazırlandı: ${finalVideoPath}`);

  // Geçici temizlik
  try {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log('[Temizlik] Geçici dosyalar silindi.');
  } catch (err: any) {
    console.warn('[Temizlik] Geçici klasör silinemedi:', err.message);
  }
}

// Başlatıcı kontrolü
const isMain = import.meta.url.endsWith(process.argv[1] || '');
if (isMain || process.argv.includes('--run')) {
  runScenario().catch(err => {
    console.error('Senaryo testi kritik hata ile sonlandı:', err);
    process.exit(1);
  });
}
