import dotenv from 'dotenv';
import { RunPodClient } from '../src/services/runpod.js';

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

console.log('========================================================');
console.log('🚀 RunPod Serverless Hazır Model Doğrulama Aracı');
console.log('========================================================');

if (!RUNPOD_API_KEY) {
  console.error('[Hata] RUNPOD_API_KEY environment değişkeni tanımlı değil!');
  process.exit(1);
}

// Env Endpoint Listesi
const ENDPOINTS = {
  WAN25: process.env.RUNPOD_WAN25_ENDPOINT_ID,
  WAN: process.env.RUNPOD_WAN_ENDPOINT_ID,
  MOCHI: process.env.RUNPOD_MOCHI_ENDPOINT_ID,
  XTTS: process.env.RUNPOD_XTTS_ENDPOINT_ID,
  AUDIOLDM2: process.env.RUNPOD_AUDIOLDM2_ENDPOINT_ID,
  HUNYUAN_AVATAR: process.env.RUNPOD_HUNYUANVIDEO_ENDPOINT_ID,
  MUSETALK: process.env.RUNPOD_MUSETALK_ENDPOINT_ID,
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Durum Takip Fonksiyonu
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

// 1. Wan 2.5 Video Testi
async function testWan25() {
  const endpointId = ENDPOINTS.WAN25;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_WAN25_ENDPOINT_ID tanımlı değil. Wan 2.5 testi atlanıyor.');
    return;
  }

  console.log('\n🎬 1. Wan 2.5 Video Modeli Test Ediliyor...');
  const input = {
    prompt: 'A tiny neon cyan robot dancing on a table, 3d render, high quality.',
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
    console.error(`[Hata] Wan 2.5 testi başarısız: ${err.message}`);
  }
}

// 2. Mochi Video Testi
async function testMochi() {
  const endpointId = ENDPOINTS.MOCHI;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_MOCHI_ENDPOINT_ID tanımlı değil. Mochi testi atlanıyor.');
    return;
  }

  console.log('\n🎬 2. Mochi Video Sentez Modeli Test Ediliyor...');
  const input = {
    prompt: 'Fast camera motion zooming into a burning wooden cube on a table, realistic fire.',
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

// 3. XTTS Türkçe Seslendirme Testi
async function testXtts() {
  const endpointId = ENDPOINTS.XTTS;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_XTTS_ENDPOINT_ID tanımlı değil. XTTS testi atlanıyor.');
    return;
  }

  console.log('\n🗣️ 3. XTTS Seslendirme Modeli Test Ediliyor...');
  const input = {
    text: 'Sayın seyirciler, stüdyomuzdan canlı yayınla sıcak bir gelişmeyi aktarıyoruz. Şu anda arkamdaki pencereden alevler içinde bir uçağın geçtiği görülüyor.',
    language: 'tr',
    // Projedeki varsayılan referans seslerden birini veya boş dummy referansı kullanabiliriz
    speaker_wav: 'https://github.com/coqui-ai/TTS/raw/main/tests/data/ljspeech/wavs/LJ001-0001.wav',
  };

  try {
    const job = await RunPodClient.runJob(endpointId, input);
    console.log(`[Bilgi] Job tetiklendi. ID: ${job.id}`);
    await pollJob(endpointId, job.id);
  } catch (err: any) {
    console.error(`[Hata] XTTS testi başarısız: ${err.message}`);
  }
}

// 4. AudioLDM2 Ses Efekti Testi
async function testAudioLdm2() {
  const endpointId = ENDPOINTS.AUDIOLDM2;
  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_AUDIOLDM2_ENDPOINT_ID tanımlı değil. AudioLDM2 testi atlanıyor.');
    return;
  }

  console.log('\n🎵 4. AudioLDM2 Ses Efekti (SFX) Modeli Test Ediliyor...');
  const input = {
    prompt: 'Deafening jet engine roar with massive crackling fire and explosion sounds',
    duration: 5.0,
    guidance_scale: 3.5,
    ddim_steps: 30,
  };

  try {
    const job = await RunPodClient.runJob(endpointId, input);
    console.log(`[Bilgi] Job tetiklendi. ID: ${job.id}`);
    await pollJob(endpointId, job.id);
  } catch (err: any) {
    console.error(`[Hata] AudioLDM2 testi başarısız: ${err.message}`);
  }
}

// 5. Hunyuan Video Avatar / MuseTalk Ağız Senkronizasyon Testi
async function testHunyuanAvatar() {
  const endpointId = ENDPOINTS.HUNYUAN_AVATAR || ENDPOINTS.MUSETALK;
  const isHunyuan = !!ENDPOINTS.HUNYUAN_AVATAR;

  if (!endpointId) {
    console.warn('\n⚠️ RUNPOD_HUNYUANVIDEO_ENDPOINT_ID veya RUNPOD_MUSETALK_ENDPOINT_ID tanımlı değil. Avatar testi atlanıyor.');
    return;
  }

  console.log(`\n👤 5. ${isHunyuan ? 'HunyuanVideo-Avatar' : 'MuseTalk'} Ağız Senkronizasyon Modeli Test Ediliyor...`);
  const input = isHunyuan
    ? {
        video_url: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/news_anchor_base.mp4',
        audio_url: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/news_audio_tr.mp3',
      }
    : {
        avatar_image: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/news_anchor_frame.png',
        audio_url: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/news_audio_tr.mp3',
      };

  try {
    const job = await RunPodClient.runJob(endpointId, input);
    console.log(`[Bilgi] Job tetiklendi. ID: ${job.id}`);
    await pollJob(endpointId, job.id);
  } catch (err: any) {
    console.error(`[Hata] Avatar ağız senkronizasyon testi başarısız: ${err.message}`);
  }
}

// Ana Başlatıcı
async function runAllTests() {
  console.log('Testler sırayla başlatılıyor...');
  
  const target = process.argv[2];
  if (target === '--wan25') {
    await testWan25();
  } else if (target === '--mochi') {
    await testMochi();
  } else if (target === '--xtts') {
    await testXtts();
  } else if (target === '--sfx') {
    await testAudioLdm2();
  } else if (target === '--avatar') {
    await testHunyuanAvatar();
  } else {
    // Varsayılan: Sırayla hepsini test et
    await testWan25();
    await testMochi();
    await testXtts();
    await testAudioLdm2();
    await testHunyuanAvatar();
  }

  console.log('\n========================================================');
  console.log('✅ RunPod Model Doğrulama Testi Tamamlandı!');
  console.log('========================================================');
}

// Node.js CLI çalıştırıcı kontrolü
const isMain = import.meta.url.endsWith(process.argv[1] || '');
if (isMain || process.argv.includes('--run')) {
  runAllTests().catch(err => {
    console.error('Test süreci kritik hata ile sonlandı:', err);
    process.exit(1);
  });
}
