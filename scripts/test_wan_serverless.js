const dotenv = require('dotenv');
const axios = require('axios');

// Load .env
dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.argv[2] || process.env.RUNPOD_WAN22_COMFYUI_ENDPOINT_ID || 'paga2u5nmv4nvo';

if (!RUNPOD_API_KEY || RUNPOD_API_KEY.includes('your_runpod_api_key_here')) {
  console.error('❌ Hata: .env dosyasındaki RUNPOD_API_KEY değerini güncellemelisiniz!');
  process.exit(1);
}

if (!ENDPOINT_ID || ENDPOINT_ID.includes('endpoint_id')) {
  console.error('❌ Hata: Endpoint ID bulunamadı!');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');

// Format for actual video generation
const payload = {
  input: {
    prompt: "Slow-motion close-up video of three heavy solid square ice cubes falling from the air and splashing one by one into a crystal glass. The crystal glass is filled with amber-brown liquor whiskey. As each ice cube plunges into the glass, the liquid whiskey displaces, creating a dynamic splash of brown droplets spraying upwards over the edges of the glass. The glass sits on a blue tablecloth. The background is a dimly lit, cozy warm rustic wooden living room. Highly detailed fluid physics, photorealistic, 4k",
    num_frames: 81,
    num_inference_steps: 50,
    b2_credentials: {
      endpoint_url: process.env.B2_ENDPOINT_URL,
      key_id: process.env.B2_KEY_ID,
      application_key: process.env.B2_APPLICATION_KEY,
      bucket_name: process.env.B2_BUCKET_NAME
    },
    job_id: `test_wan_${Date.now()}`,
    scene_number: 1
  }
};

async function testServerless() {
  console.log(`🚀 [RunPod] Wan Serverless Endpoint tetikleniyor: ${ENDPOINT_ID}`);
  console.log(`📂 Gönderilen Payload:`, JSON.stringify(payload, null, 2));

  try {
    const runRes = await axios.post(
      `https://api.runpod.ai/v2/${ENDPOINT_ID}/run`,
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
    console.log(`⏳ İş durumu izleniyor (polling)...`);

    let completed = false;
    let attempts = 0;
    const maxAttempts = 180; // 15 dakika max

    while (!completed && attempts < maxAttempts) {
      attempts++;
      const statusRes = await axios.get(
        `https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${jobId}`,
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
            const destPath = path.join(destDir, `test_video_wan_serverless_${Date.now()}.mp4`);
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
        console.error('Error Details:', statusRes.data.error);
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

testServerless();
