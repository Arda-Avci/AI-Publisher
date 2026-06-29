const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Load .env
dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

if (!RUNPOD_API_KEY || RUNPOD_API_KEY.includes('your_runpod_api_key_here')) {
  console.error('❌ Hata: .env dosyasındaki RUNPOD_API_KEY değerini güncellemelisiniz!');
  process.exit(1);
}

// Model configurations with default parameters and env key names
const MODEL_CONFIGS = {
  wan: {
    name: 'Wan 2.1 T2V',
    envKey: 'RUNPOD_WAN_ENDPOINT_ID',
    params: { num_frames: 81, num_inference_steps: 50 }
  },
  wan25: {
    name: 'Wan 2.5 I2V',
    envKey: 'RUNPOD_WAN25_ENDPOINT_ID',
    params: { num_frames: 81, num_inference_steps: 30, image_path: "" }
  },
  hunyuan: {
    name: 'HunyuanVideo',
    envKey: 'RUNPOD_HUNYUANVIDEO_ENDPOINT_ID',
    params: { num_frames: 65, num_inference_steps: 25 }
  },
  ltx: {
    name: 'LTX-Video',
    envKey: 'RUNPOD_LTX_ENDPOINT_ID', 
    fallbackId: 'rojgtzuf3nztup',
    params: { num_frames: 65, num_inference_steps: 25 }
  },
  mochi: {
    name: 'Mochi-1',
    envKey: 'RUNPOD_MOCHI_ENDPOINT_ID',
    params: { num_frames: 49, num_inference_steps: 30 }
  },
  cogvideox: {
    name: 'CogVideoX',
    envKey: 'RUNPOD_COGVIDEOX_ENDPOINT_ID',
    params: { num_frames: 49, num_inference_steps: 30 }
  },
  svd: {
    name: 'Stable Video Diffusion',
    envKey: 'RUNPOD_SVD_ENDPOINT_ID',
    params: { num_frames: 25, image_path: "" }
  },
  zeroscope: {
    name: 'Zeroscope',
    envKey: 'RUNPOD_ZEROSCOPE_ENDPOINT_ID',
    params: { num_frames: 24, num_inference_steps: 25, fps: 8, height: 576, width: 1024 }
  },
  videocrafter: {
    name: 'VideoCrafter2',
    envKey: 'RUNPOD_VIDEOCRAFTER_ENDPOINT_ID',
    params: { num_frames: 16, num_inference_steps: 25 }
  },
  pyramidflow: {
    name: 'PyramidFlow',
    envKey: 'RUNPOD_PYRAMIDFLOW_ENDPOINT_ID',
    params: { num_frames: 81, num_inference_steps: 30 }
  },
  animatediff: {
    name: 'AnimateDiff',
    envKey: 'RUNPOD_ANIMATEDIFF_ENDPOINT_ID',
    params: { num_frames: 16, num_inference_steps: 25 }
  },
  dynamicrafter: {
    name: 'DynamiCrafter',
    envKey: 'RUNPOD_DYNAMICRAFTER_ENDPOINT_ID',
    params: { num_frames: 16, num_inference_steps: 25, image_path: "" }
  }
};

const selectedModelKey = process.argv[2];
if (!selectedModelKey || !MODEL_CONFIGS[selectedModelKey]) {
  console.error('❌ Hata: Geçerli bir model belirtmelisiniz!');
  console.log('Kullanılabilir modeller:', Object.keys(MODEL_CONFIGS).join(', '));
  console.log('Örnek kullanım: node scripts/test_all_video_models.js wan');
  process.exit(1);
}

const config = MODEL_CONFIGS[selectedModelKey];
let endpointId = process.env[config.envKey];

// Fallback logic if env ID is missing
if (!endpointId) {
  if (config.fallbackId) {
    endpointId = config.fallbackId;
  } else {
    console.error(`❌ Hata: ${config.envKey} değeri .env dosyasında bulunamadı!`);
    process.exit(1);
  }
}

// Prompt context is identical (ice cubes falling into whiskey glass)
const payload = {
  input: {
    prompt: "Slow-motion close-up video of three heavy solid square ice cubes falling from the air and splashing one by one into a crystal glass. The crystal glass is filled with amber-brown liquor whiskey. As each ice cube plunges into the glass, the liquid whiskey displaces, creating a dynamic splash of brown droplets spraying upwards over the edges of the glass. The glass sits on a blue tablecloth. The background is a dimly lit, cozy warm rustic wooden living room. Highly detailed fluid physics, photorealistic, 4k",
    ...config.params,
    b2_credentials: {
      endpoint_url: process.env.B2_ENDPOINT_URL,
      key_id: process.env.B2_KEY_ID,
      application_key: process.env.B2_APPLICATION_KEY,
      bucket_name: process.env.B2_BUCKET_NAME
    },
    job_id: `test_all_${selectedModelKey}_${Date.now()}`,
    scene_number: 1
  }
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function updateEndpointWorkersMax(endpointId, workersMax) {
  try {
    const res = await axios.patch(
      `https://rest.runpod.io/v1/endpoints/${endpointId}`,
      { workersMax: workersMax },
      {
        headers: {
          Authorization: `Bearer ${RUNPOD_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`   ⚙️ [${endpointId}] workersMax REST API ile ayarlandı: ${workersMax}`);
    return true;
  } catch (e) {
    console.error(`   ❌ workersMax güncelleme başarısız:`, e.response ? e.response.data : e.message);
    return false;
  }
}

async function ensureEndpointActive(targetEndpointId, targetName) {
  console.log(`   🔍 [${targetName}] Worker limit ve kota kontrolü yapılıyor...`);
  try {
    const listRes = await axios.get('https://rest.runpod.io/v1/endpoints', {
      headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` }
    });

    const targetEp = listRes.data.find(e => e.id === targetEndpointId);
    if (!targetEp) {
      console.warn(`   ⚠️ Endpoint bulunamadı!`);
      return;
    }

    if (targetEp.workersMax > 0) {
      console.log(`   ✅ Endpoint zaten aktif. (workersMax: ${targetEp.workersMax})`);
      return;
    }

    console.log(`   ⚠️ Endpoint inaktif (workersMax: 0). Kota açılıp aktif ediliyor...`);

    // workersMax > 0 olan başka bir pasif endpoint bulup kapatalım
    const activeEp = listRes.data.find(e => e.id !== targetEndpointId && e.workersMax > 0);
    if (activeEp) {
      console.log(`   🔄 Kota açmak için [${activeEp.name}] pasifleştiriliyor (workersMax -> 0)...`);
      await updateEndpointWorkersMax(activeEp.id, 0);
      await delay(2000);
    }

    // Hedef endpoint'i aktif edelim
    console.log(`   🔄 [${targetName}] aktifleştiriliyor (workersMax -> 1)...`);
    await updateEndpointWorkersMax(targetEndpointId, 1);
    await delay(5000); // Ayarların yansıması için bekleme

  } catch (e) {
    console.error(`   ❌ Kota denetimi başarısız:`, e.message);
  }
}

async function runTest() {
  console.log(`🚀 [RunPod] Tetikleniyor: ${config.name} (Endpoint: ${endpointId})`);
  
  // Test öncesi kota ve worker kontrolü
  await ensureEndpointActive(endpointId, config.name);
  
  console.log(`📂 Gönderilen Payload:`, JSON.stringify(payload, null, 2));

  try {
    const runRes = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RUNPOD_API_KEY}`
        }
      }
    );

    const jobId = runRes.data.id;
    console.log(`✅ [RunPod] İş başarıyla tetiklendi! Job ID: ${jobId}`);
    console.log(`⏳ Durum izleniyor (polling)...`);

    let completed = false;
    let attempts = 0;
    const maxAttempts = 180; // 15 dakika limit

    while (!completed && attempts < maxAttempts) {
      attempts++;
      const statusRes = await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${RUNPOD_API_KEY}`
          }
        }
      );

      const status = statusRes.data.status;
      console.log(`[Deneme ${attempts}] Durum: ${status}`);

      if (status === 'COMPLETED') {
        console.log('🎉 [BAŞARILI] Video üretimi tamamlandı!');
        console.log('📦 Çıktı Verileri:', JSON.stringify(statusRes.data.output, null, 2));

        // Otomatik Video İndirme (Auto-download video)
        try {
          const outputData = statusRes.data.output;
          let downloadUrl = null;
          if (outputData) {
            if (outputData.video_url) {
              downloadUrl = outputData.video_url;
            } else if (outputData.b2_urls) {
              const firstKey = Object.keys(outputData.b2_urls)[0];
              if (firstKey) {
                downloadUrl = outputData.b2_urls[firstKey];
              }
            } else if (typeof outputData === 'string' && outputData.startsWith('http')) {
              downloadUrl = outputData;
            }
          }

          if (downloadUrl) {
            const destDir = path.join(process.cwd(), 'outputs', 'test_outputs');
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            const destPath = path.join(destDir, `test_video_${selectedModelKey}_${Date.now()}.mp4`);
            console.log(`   📥 Video otomatik indiriliyor: ${downloadUrl}`);
            
            const downloadRes = await axios({
              method: 'get',
              url: downloadUrl,
              responseType: 'stream'
            });
            
            const writer = fs.createWriteStream(destPath);
            downloadRes.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
            console.log(`   💾 Video kaydedildi! Konum: ${destPath}`);
          }
        } catch (dlErr) {
          console.error(`   ⚠️ Video indirme başarısız:`, dlErr.message);
        }

        completed = true;
      } else if (status === 'FAILED') {
        console.error('❌ [HATA] İş başarısız oldu!');
        console.error('Hata Detayı:', statusRes.data.error);
        completed = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }

    if (!completed) {
      console.log('⏰ Zaman aşımı: İş 15 dakika içinde tamamlanamadı.');
    }

  } catch (error) {
    console.error('❌ Hata oluştu:', error.response ? error.response.data : error.message);
  }
}

runTest();
