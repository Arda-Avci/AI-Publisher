const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY bulunamadı!');
  process.exit(1);
}

const models = [
  { key: 'wan', name: 'Wan 2.1 T2V', endpoint: 'mey8jdqjmajszx', params: { num_frames: 81, num_inference_steps: 50 } },
  { key: 'wan25', name: 'Wan 2.5 I2V', endpoint: 'gitw8ok1ugw5xr', params: { num_frames: 81, num_inference_steps: 30 } },
  { key: 'hunyuan', name: 'HunyuanVideo', endpoint: 'mxkayqhw4geo56', params: { num_frames: 65, num_inference_steps: 25 } },
  { key: 'ltx', name: 'LTX-Video', endpoint: 'rojgtzuf3nztup', params: { num_frames: 65, num_inference_steps: 25 } },
  { key: 'mochi', name: 'Mochi-1', endpoint: '1d1o2z4hqup1kd', params: { num_frames: 49, num_inference_steps: 30 } },
  { key: 'cogvideox', name: 'CogVideoX', endpoint: 'bntqgrsmz4jojy', params: { num_frames: 49, num_inference_steps: 30 } },
  { key: 'svd', name: 'Stable Video Diffusion', endpoint: 'y6lancu65n7w6p', params: { num_frames: 25 } },
  { key: 'zeroscope', name: 'Zeroscope', endpoint: '7tnfihn0gjst27', params: { num_frames: 24, num_inference_steps: 25, fps: 8, height: 576, width: 1024 } },
  { key: 'videocrafter', name: 'VideoCrafter2', endpoint: 'fx21kse80al35d', params: { num_frames: 16, num_inference_steps: 25 } },
  { key: 'pyramidflow', name: 'PyramidFlow', endpoint: 'aatp5pymi3mj53', params: { num_frames: 81, num_inference_steps: 30 } }
];

const results = [];

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

async function runSequentialTests() {
  console.log('🏁 Sıralı video üretim testleri başlatılıyor... Toplam model sayısı: ' + models.length);

  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    console.log('\n=============================================');
    console.log(`⏳ [${i + 1}/${models.length}] Model: ${m.name} (Endpoint: ${m.endpoint}) test ediliyor...`);

    // Test öncesi kota ve worker kontrolü
    await ensureEndpointActive(m.endpoint, m.name);

    const payload = {
      input: {
        prompt: 'Slow-motion close-up video of three heavy solid square ice cubes falling from the air and splashing one by one into a crystal glass. The crystal glass is filled with amber-brown liquor whiskey. As each ice cube plunges into the glass, the liquid whiskey displaces, creating a dynamic splash of brown droplets spraying upwards over the edges of the glass. The glass sits on a blue tablecloth. The background is a dimly lit, cozy warm rustic wooden living room. Highly detailed fluid physics, photorealistic, 4k',
        ...m.params,
        b2_credentials: {
          endpoint_url: process.env.B2_ENDPOINT_URL,
          key_id: process.env.B2_KEY_ID,
          application_key: process.env.B2_APPLICATION_KEY,
          bucket_name: process.env.B2_BUCKET_NAME
        },
        job_id: `test_seq_${m.key}_${Date.now()}`,
        scene_number: 1
      }
    };

    const startTime = Date.now();
    const resultItem = { key: m.key, name: m.name, endpoint: m.endpoint, status: 'UNKNOWN', durationSec: 0, output: null, error: null };

    try {
      // Trigger job
      const runRes = await axios.post(
        `https://api.runpod.ai/v2/${m.endpoint}/run`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RUNPOD_API_KEY}`
          }
        }
      );

      const jobId = runRes.data.id;
      console.log(`   🚀 İş tetiklendi. Job ID: ${jobId}`);

      let completed = false;
      let attempts = 0;
      const maxAttempts = 120; // Model başına 20 dakika limit

      while (!completed && attempts < maxAttempts) {
        attempts++;
        const statusRes = await axios.get(
          `https://api.runpod.ai/v2/${m.endpoint}/status/${jobId}`,
          { headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` } }
        );

        const status = statusRes.data.status;
        console.log(`   [Model: ${m.key}] Deneme ${attempts} - Durum: ${status}`);

        if (status === 'COMPLETED') {
          console.log(`   ✅ BAŞARILI! Video üretimi tamamlandı.`);
          resultItem.status = 'SUCCESS';
          resultItem.output = statusRes.data.output;
          completed = true;

          // Otomatik İndirme (Auto-download) Mantığı
          try {
            const outputData = statusRes.data.output;
            let downloadUrl = null;
            let ext = '.mp4';

            if (outputData) {
              if (outputData.video_url) {
                downloadUrl = outputData.video_url;
                ext = '.mp4';
              } else if (outputData.image_url) {
                downloadUrl = outputData.image_url;
                ext = '.png';
              } else if (outputData.b2_urls) {
                // b2_urls içindeki ilk değeri alalım
                const firstKey = Object.keys(outputData.b2_urls)[0];
                if (firstKey) {
                  downloadUrl = outputData.b2_urls[firstKey];
                  ext = firstKey.endsWith('.png') || firstKey.endsWith('.jpg') ? '.png' : '.mp4';
                }
              }
            }

            if (downloadUrl) {
              const destDir = path.join(process.cwd(), 'outputs', 'test_outputs');
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
              }
              const destPath = path.join(destDir, `test_${m.key}_${Date.now()}${ext}`);
              console.log(`   📥 Dosya otomatik indiriliyor: ${downloadUrl}`);
              
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
              console.log(`   💾 İndirme tamamlandı! Kaydedilen konum: ${destPath}`);
              resultItem.localDownloadPath = destPath;
            }
          } catch (dlErr) {
            console.error(`   ⚠️ Otomatik indirme başarısız oldu:`, dlErr.message);
          }

        } else if (status === 'FAILED') {
          console.error(`   ❌ HATA! İş başarısız oldu.`);
          resultItem.status = 'FAILED';
          resultItem.error = statusRes.data.error;
          completed = true;
        } else {
          await delay(15000); // 15 saniye bekle
        }
      }

      if (!completed) {
        console.warn(`   ⚠️ ZAMAN AŞIMI!`);
        resultItem.status = 'TIMEOUT';
        resultItem.error = 'Job did not finish within 20 minutes limit.';
      }

    } catch (e) {
      console.error(`   ❌ İstek Hatası:`, e.message);
      resultItem.status = 'ERROR';
      resultItem.error = e.response ? e.response.data : e.message;
    }

    resultItem.durationSec = Math.round((Date.now() - startTime) / 1000);
    results.push(resultItem);

    // Save intermediate report
    fs.writeFileSync(
      path.join(process.cwd(), 'scripts/test_results_report.json'),
      JSON.stringify(results, null, 2),
      'utf8'
    );
  }

  console.log('\n=============================================');
  console.log('🎉 TÜM SIRALI TESTLER TAMAMLANDI!');
  console.log('📊 Sonuç Raporu: scripts/test_results_report.json dosyasına yazıldı.');
}

runSequentialTests();
