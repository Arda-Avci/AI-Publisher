const axios = require('axios');
require('dotenv').config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY defined in .env');
  process.exit(1);
}

const headers = {
  Authorization: RUNPOD_API_KEY,
  'Content-Type': 'application/json'
};

// Test ettiğimiz 10 video modeli + stablediffusion endpoint listesi
const ENDPOINTS = [
  { id: 'mey8jdqjmajszx', name: 'Wan2.1_T2V', templateId: '8f7n11puzs' },
  { id: 'gitw8ok1ugw5xr', name: 'Wan2.5_Serverless', templateId: 'hf7wbwug58' },
  { id: 'mxkayqhw4geo56', name: 'HunyuanVideo', templateId: 'd0m314hqup' },
  { id: 'rojgtzuf3nztup', name: 'LTX_Video', templateId: 'yvgtzuf3nz' },
  { id: '1d1o2z4hqup1kd', name: 'Mochi_Serverless', templateId: '10405edf97' },
  { id: 'bntqgrsmz4jojy', name: 'CogVideoX_Serverless', templateId: 'cogvideox7' },
  { id: 'y6lancu65n7w6p', name: 'SVD_Serverless', templateId: 'svdserver2' },
  { id: '7tnfihn0gjst27', name: 'Zeroscope_Serverless', templateId: 'zeroscope7' },
  { id: 'fx21kse80al35d', name: 'VideoCrafter_Serverless', templateId: 'videocraft' },
  { id: 'aatp5pymi3mj53', name: 'PyramidFlow_Serverless', templateId: 'pyramidfl7' }
];

async function updateEndpointWorkersMax(endpointId, templateId, name, workersMax) {
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
    console.log(`✅ [${name}] workersMax REST API ile ayarlandı: ${workersMax}`);
    return true;
  } catch (e) {
    console.error(`❌ [${name}] Hata:`, e.response ? e.response.data : e.message);
    return false;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🔄 RunPod Serverless Endpoint\'leri Recycle Ediliyor (Temizleniyor)...');
  
  // Önce tüm endpointleri workersMax = 0 yapalım (Tüm çalışan podlar sonlansın)
  for (const ep of ENDPOINTS) {
    await updateEndpointWorkersMax(ep.id, ep.templateId, ep.name, 0);
    await sleep(1000); // API limitlerini zorlamamak için kısa bekleme
  }

  console.log('⏳ 15 saniye bekleniyor (Podların kapanması ve temizlenmesi için)...');
  await sleep(15000);

  // Sonra tüm endpointleri tekrar workersMax = 1 yapalım (İlk tetiklemede yeni imajlar indirilsin)
  console.log('🔄 Endpoint workersMax değerleri tekrar 1 yapılıyor...');
  for (const ep of ENDPOINTS) {
    await updateEndpointWorkersMax(ep.id, ep.templateId, ep.name, 1);
    await sleep(1000);
  }

  console.log('🎉 Tüm endpointler başarıyla recycle edildi! Artık yeni imajlar aktif olacak.');
}

main();
