const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_SDXL_ENDPOINT_ID = process.env.RUNPOD_SDXL_ENDPOINT_ID || process.env.RUNPOD_STABLEDIFFUSION_ENDPOINT_ID;

if (!RUNPOD_API_KEY || !RUNPOD_SDXL_ENDPOINT_ID) {
  console.error('❌ Hata: RUNPOD_API_KEY veya RUNPOD_SDXL_ENDPOINT_ID (SDXL/Stable Diffusion Endpoint) .env içerisinde tanımlı değil!');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${RUNPOD_API_KEY}`,
  'Content-Type': 'application/json'
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

async function main() {
  console.log(`🚀 SDXL Entegrasyon Testi Başlatılıyor... (Endpoint: ${RUNPOD_SDXL_ENDPOINT_ID})`);
  
  // Test öncesi kota ve worker kontrolü
  await ensureEndpointActive(RUNPOD_SDXL_ENDPOINT_ID, 'StableDiffusion_Serverless');
  
  const payload = {
    input: {
      prompt: "A gorgeous modern cyberpunk hacker girl portrait, high quality, highly detailed, neon cyan illumination, outfit styled by Outfit font, cinematic rendering",
      model_type: "sdxl",
      width: 1024,
      height: 1024,
      num_inference_steps: 25,
      guidance_scale: 7.5
    }
  };

  try {
    // 1. İstek tetikleme
    console.log('🔄 SDXL Görsel üretim isteği RunPod\'a gönderiliyor...');
    const triggerRes = await axios.post(`https://api.runpod.ai/v1/${RUNPOD_SDXL_ENDPOINT_ID}/run`, payload, { headers });
    const jobId = triggerRes.data.id;
    console.log(`✅ İş tetiklendi. Job ID: ${jobId}`);

    // 2. Durum sorgulama döngüsü
    console.log('⏳ Görsel üretimi bekleniyor...');
    let attempts = 0;
    const maxAttempts = 180; // 15 dakika limit
    
    while (attempts < maxAttempts) {
      const statusRes = await axios.get(`https://api.runpod.ai/v1/${RUNPOD_SDXL_ENDPOINT_ID}/status/${jobId}`, { headers });
      const status = statusRes.data.status;
      console.log(`   [SDXL] Durum: ${status} (Sorgu: ${attempts + 1}/${maxAttempts})`);

      if (status === 'COMPLETED') {
        console.log('🎉 SDXL Görsel üretimi BAŞARIYLA TAMAMLANDI!');
        console.log('📊 Çıktı verisi:', JSON.stringify(statusRes.data.output, null, 2));

        // Otomatik İndirme (Auto-download)
        try {
          const outputData = statusRes.data.output;
          let downloadUrl = null;
          if (outputData) {
            if (outputData.image_url) {
              downloadUrl = outputData.image_url;
            } else if (outputData.b2_urls) {
              const firstKey = Object.keys(outputData.b2_urls)[0];
              if (firstKey) {
                downloadUrl = outputData.b2_urls[firstKey];
              }
            }
          }

          if (downloadUrl) {
            const destDir = path.join(process.cwd(), 'outputs', 'test_outputs');
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            const destPath = path.join(destDir, `test_sdxl_${Date.now()}.png`);
            console.log(`   📥 Görsel otomatik indiriliyor: ${downloadUrl}`);
            
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
            console.log(`   💾 Görsel kaydedildi! Konum: ${destPath}`);
          }
        } catch (dlErr) {
          console.error(`   ⚠️ Görsel indirme başarısız:`, dlErr.message);
        }
        break;
      } else if (status === 'FAILED') {
        console.error('❌ SDXL Görsel üretimi BAŞARISIZ OLDU!', statusRes.data.error);
        process.exit(1);
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (e) {
    console.error('❌ Hata oluştu:', e.response ? JSON.stringify(e.response.data) : e.message);
  }
}

main();
