import dotenv from 'dotenv';
import { RunPodClient } from '../src/services/runpod.js';

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

console.log('========================================================');
console.log('🚀 RunPod Serverless Hub Hazır Şablonlar Doğrulama Aracı');
console.log('   (Sadece Video ve Ses Modelleri - LLM/Ollama Hariç)');
console.log('========================================================');

if (!RUNPOD_API_KEY) {
  console.error('[Hata] RUNPOD_API_KEY environment değişkeni tanımlı değil!');
  process.exit(1);
}

// Hazır şablon endpoint env değişkenleri
const ENDPOINTS = {
  // --- Video Modelleri ---
  WAN22_LORA: process.env.RUNPOD_WAN22_ENDPOINT_ID, // Wan2.2 with LoRA
  MOCHI: process.env.RUNPOD_MOCHI_ENDPOINT_ID,       // Mochi Video Generator
  SANA: process.env.RUNPOD_SANA_ENDPOINT_ID,         // Sana 0.6B Text-to-Image
  HUNYUAN_AVATAR: process.env.RUNPOD_HUNYUANVIDEO_ENDPOINT_ID, // HunyuanVideo-Avatar API
  MULTITALK: process.env.RUNPOD_MULTITALK_ENDPOINT_ID, // Multitalk_Runpod_hub

  // --- Ses / TTS / STT Modelleri ---
  FISH_SPEECH: process.env.RUNPOD_FISHSPEECH_ENDPOINT_ID, // Runpod Worker Fish Speech
  COSYVOICE: process.env.RUNPOD_COSYVOICE_ENDPOINT_ID,     // CosyVoice3 TTS Runpod
  WHISPERX: process.env.RUNPOD_WHISPERX_ENDPOINT_ID,       // WhisperX Worker v2
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Durum Takip (Polling) Fonksiyonu
async function pollJob(endpointId: string, jobId: string, maxWaitSeconds = 600): Promise<any> {
  const start = Date.now();
  console.log(`[Polling] Job ID ${jobId} için durum kontrol ediliyor...`);

  while (Date.now() - start < maxWaitSeconds * 1000) {
    try {
      const statusRes = await RunPodClient.getJobStatus(endpointId, jobId);
      const status = statusRes.status;

      console.log(`  - Durum: ${status} | Geçen süre: ${Math.floor((Date.now() - start) / 1000)}s`);

      if (status === 'COMPLETED') {
        console.log(`[Başarılı] Job ${jobId} tamamlandı! Çıktı:`, JSON.stringify(statusRes.output, null, 2));
        return statusRes;
      }

      if (status === 'FAILED') {
        console.error(`[Başarısız] Job ${jobId} hata aldı! Detaylar:`, JSON.stringify(statusRes.error || statusRes, null, 2));
        throw new Error(`Job ${jobId} failed`);
      }

      if (status === 'CANCELLED') {
        console.warn(`[İptal] Job ${jobId} iptal edildi.`);
        throw new Error(`Job ${jobId} cancelled`);
      }
    } catch (err: any) {
      console.error(`[Hata] Polling sırasında bir hata oluştu: ${err.message}`);
    }

    await sleep(5000); // 5 saniye bekle
  }

  throw new Error(`Job ${jobId} zaman aşımına uğradı (${maxWaitSeconds}s).`);
}

// --- VİDEO MODELLERİ TEST FONKSİYONLARI ---

// 1. Wan2.2 with LoRA Testi
async function testWan22() {
  const endpointId = ENDPOINTS.WAN22_LORA;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_WAN22_ENDPOINT_ID tanımlı değil. Wan2.2 testi atlanıyor.');
    return;
  }

  console.log('\n🎬 Wan 2.2 with LoRA Test Ediliyor...');
  const input = {
    prompt: 'A close-up shot of a burning airplane falling down from the sky, photorealistic, cinematic.',
    num_frames: 49,
    width: 832,
    height: 480,
    guidance_scale: 5,
    num_inference_steps: 30,
  };

  try {
    const job = await RunPodClient.runJob(endpointId, input);
    console.log(`[Bilgi] Job tetiklendi. ID: ${job.id}`);
    await pollJob(endpointId, job.id);
  } catch (err: any) {
    console.error(`[Hata] Wan2.2 testi başarısız: ${err.message}`);
  }
}

// 2. Mochi Video Generator Testi
async function testMochi() {
  const endpointId = ENDPOINTS.MOCHI;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_MOCHI_ENDPOINT_ID tanımlı değil. Mochi testi atlanıyor.');
    return;
  }

  console.log('\n🎬 Mochi Video Generator Test Ediliyor...');
  const input = {
    prompt: 'Fast camera motion tracking a burning airplane wing falling into a green field.',
    num_frames: 49,
    width: 848,
    height: 480,
  };

  try {
    const job = await RunPodClient.runJob(endpointId, input);
    console.log(`[Bilgi] Job tetiklendi. ID: ${job.id}`);
    await pollJob(endpointId, job.id);
  } catch (err: any) {
    console.error(`[Hata] Mochi testi başarısız: ${err.message}`);
  }
}

// 3. Sana 0.6B Text-to-Image Testi
async function testSana() {
  const endpointId = ENDPOINTS.SANA;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_SANA_ENDPOINT_ID tanımlı değil. Sana 0.6B testi atlanıyor.');
    return;
  }

  console.log('\n🎬 Sana 0.6B Text-to-Image Test Ediliyor...');
  const input = {
    prompt: 'A professional male news anchor in a modern neon cyan studio, photorealistic, 1024x1024 resolution.',
    width: 1024,
    height: 1024,
  };

  try {
    const job = await RunPodClient.runJob(endpointId, input);
    console.log(`[Bilgi] Job tetiklendi. ID: ${job.id}`);
    await pollJob(endpointId, job.id);
  } catch (err: any) {
    console.error(`[Hata] Sana testi başarısız: ${err.message}`);
  }
}

// 4. HunyuanVideo-Avatar API Testi
async function testHunyuanAvatar() {
  const endpointId = ENDPOINTS.HUNYUAN_AVATAR;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_HUNYUANVIDEO_ENDPOINT_ID tanımlı değil. HunyuanVideo-Avatar testi atlanıyor.');
    return;
  }

  console.log('\n👤 HunyuanVideo-Avatar API Test Ediliyor...');
  const input = {
    video_url: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/news_anchor_base.mp4',
    audio_url: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/news_audio_tr.mp3',
  };

  try {
    const job = await RunPodClient.runJob(endpointId, input);
    console.log(`[Bilgi] Job tetiklendi. ID: ${job.id}`);
    await pollJob(endpointId, job.id);
  } catch (err: any) {
    console.error(`[Hata] HunyuanVideo-Avatar testi başarısız: ${err.message}`);
  }
}

// 5. Multitalk Ağız Senkronizasyon Testi
async function testMultitalk() {
  const endpointId = ENDPOINTS.MULTITALK;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_MULTITALK_ENDPOINT_ID tanımlı değil. Multitalk testi atlanıyor.');
    return;
  }

  console.log('\n👤 Multitalk Ağız Senkronizasyon Test Ediliyor...');
  const input = {
    avatar_image: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/news_anchor_frame.png',
    audio_url: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/news_audio_tr.mp3',
  };

  try {
    const job = await RunPodClient.runJob(endpointId, input);
    console.log(`[Bilgi] Job tetiklendi. ID: ${job.id}`);
    await pollJob(endpointId, job.id);
  } catch (err: any) {
    console.error(`[Hata] Multitalk testi başarısız: ${err.message}`);
  }
}

// --- SES (AUDIO / TTS / STT) MODELLERİ TEST FONKSİYONLARI ---

// 6. Fish Speech TTS Testi
async function testFishSpeech() {
  const endpointId = ENDPOINTS.FISH_SPEECH;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_FISHSPEECH_ENDPOINT_ID tanımlı değil. Fish Speech testi atlanıyor.');
    return;
  }

  console.log('\n🗣️ Fish Speech TTS Test Ediliyor...');
  const input = {
    text: 'Sayın seyirciler, stüdyomuzdan canlı yayınla sıcak bir gelişmeyi aktarıyoruz.',
    reference_audio: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/anchor_ref.wav',
  };

  try {
    const job = await RunPodClient.runJob(endpointId, input);
    console.log(`[Bilgi] Job tetiklendi. ID: ${job.id}`);
    await pollJob(endpointId, job.id);
  } catch (err: any) {
    console.error(`[Hata] Fish Speech testi başarısız: ${err.message}`);
  }
}

// 7. CosyVoice TTS Testi
async function testCosyVoice() {
  const endpointId = ENDPOINTS.COSYVOICE;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_COSYVOICE_ENDPOINT_ID tanımlı değil. CosyVoice testi atlanıyor.');
    return;
  }

  console.log('\n🗣️ CosyVoice TTS Test Ediliyor...');
  const input = {
    text: 'Aman tanrım! Uçak hızla irtifa kaybediyor ve şu an yere çakılıyor!',
    role: 'default',
  };

  try {
    const job = await RunPodClient.runJob(endpointId, input);
    console.log(`[Bilgi] Job tetiklendi. ID: ${job.id}`);
    await pollJob(endpointId, job.id);
  } catch (err: any) {
    console.error(`[Hata] CosyVoice testi başarısız: ${err.message}`);
  }
}

// 8. WhisperX Deşifre (STT) Testi
async function testWhisperX() {
  const endpointId = ENDPOINTS.WHISPERX;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_WHISPERX_ENDPOINT_ID tanımlı değil. WhisperX testi atlanıyor.');
    return;
  }

  console.log('\n🗣️ WhisperX STT (Deşifre) Test Ediliyor...');
  const input = {
    audio_url: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/news_audio_tr.mp3',
    language: 'tr',
  };

  try {
    const job = await RunPodClient.runJob(endpointId, input);
    console.log(`[Bilgi] Job tetiklendi. ID: ${job.id}`);
    await pollJob(endpointId, job.id);
  } catch (err: any) {
    console.error(`[Hata] WhisperX testi başarısız: ${err.message}`);
  }
}

// Ana Çalıştırıcı
async function main() {
  const target = process.argv[2];

  if (target === '--video') {
    await testWan22();
    await testMochi();
    await testSana();
    await testHunyuanAvatar();
    await testMultitalk();
  } else if (target === '--audio') {
    await testFishSpeech();
    await testCosyVoice();
    await testWhisperX();
  } else {
    // Varsayılan: Tüm video ve ses modellerini sırayla test et
    console.log('Seçilen tüm video modelleri test ediliyor...');
    await testWan22();
    await testMochi();
    await testSana();
    await testHunyuanAvatar();
    await testMultitalk();

    console.log('\nSeçilen tüm ses modelleri test ediliyor...');
    await testFishSpeech();
    await testCosyVoice();
    await testWhisperX();
  }

  console.log('\n========================================================');
  console.log('✅ Hazır Şablonlar Doğrulama Testi Tamamlandı!');
  console.log('========================================================');
}

// Node.js CLI çalıştırıcı kontrolü
const isMain = import.meta.url.endsWith(process.argv[1] || '');
if (isMain || process.argv.includes('--run')) {
  main().catch(err => {
    console.error('Doğrulama süreci kritik hata ile sonlandı:', err);
    process.exit(1);
  });
}
