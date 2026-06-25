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

// Format for our custom Flask API (ghcr.io/arda-avci/ai-publisher-wan)
const payload = {
  input: {
    prompt: "A slow-motion cinematic shot. The camera begins outside a cozy wooden cabin in the cold winter with heavy snow falling, moving smoothly through the frost-dusted window into a warm, dim-lit living room. In the background, a rustic fireplace crackles with bright orange flames. In the foreground on a wooden table, a single ice cube drops into a heavy crystal glass of amber whiskey, causing dynamic liquid splashes and droplets flying in highly detailed slow-motion. Photorealistic, warm color grading, volumetric lighting, 8k resolution.",
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
  console.log(`🚀 [RunPod] Custom Flask API Endpoint tetikleniyor: ${ENDPOINT_ID}`);
  console.log(`📂 Gönderilen Düz Payload:`, JSON.stringify(payload, null, 2));

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
        console.log('🎉 [BAŞARILI] İş tamamlandı!');
        console.log('📦 Çıktı Verileri:', JSON.stringify(statusRes.data.output, null, 2));
        completed = true;
      } else if (status === 'FAILED') {
        console.error('❌ [HATA] İş başarısız oldu!');
        console.error('Error Details:', statusRes.data.error);
        completed = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    if (!completed) {
      console.log('⏰ Zaman aşımı: İş 5 dakika içinde tamamlanamadı.');
    }

  } catch (error) {
    console.error('❌ Hata oluştu:', error.response ? error.response.data : error.message);
  }
}

testServerless();
