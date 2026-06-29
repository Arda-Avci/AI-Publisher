#!/usr/bin/env node
/**
 * RunPod Serverless container'ları recycle eder.
 * Eski cache'lenmiş container'ları durdurur, yeni imajlarla yeniden başlatılmasını sağlar.
 *
 * Kullanım:
 *   node scripts/recycle_runpod_containers.js                    # Tüm endpoint'leri recycle et
 *   node scripts/recycle_runpod_containers.js wan hunyuan ltx    # Sadece belirli modelleri
 *
 * Gerekli env değişkenleri:
 *   RUNPOD_API_KEY
 */

require('dotenv').config();
const https = require('https');

const API_KEY = process.env.RUNPOD_API_KEY;
if (!API_KEY) {
  console.error('RUNPOD_API_KEY ayarlı değil.');
  process.exit(1);
}

const ENDPOINTS = {
  wan:            process.env.RUNPOD_WAN_ENDPOINT_ID,
  wan25:          process.env.RUNPOD_WAN25_ENDPOINT_ID,
  hunyuan:        process.env.RUNPOD_HUNYUANVIDEO_ENDPOINT_ID,
  ltx:            process.env.RUNPOD_LTX_ENDPOINT_ID,
  mochi:          process.env.RUNPOD_MOCHI_ENDPOINT_ID,
  cogvideox:      process.env.RUNPOD_COGVIDEOX_5B_ENDPOINT_ID,
  svd:            process.env.RUNPOD_SVD_ENDPOINT_ID,
  zeroscope:      process.env.RUNPOD_ZEROSCOPE_ENDPOINT_ID,
  videocrafter:   process.env.RUNPOD_VIDEOCRAFTER_ENDPOINT_ID,
  pyramidflow:    process.env.RUNPOD_PYRAMIDFLOW_ENDPOINT_ID,
  stablediffusion: process.env.RUNPOD_STABLEDIFFUSION_ENDPOINT_ID,
  animatediff:    process.env.RUNPOD_ANIMATEDIFF_ENDPOINT_ID,
  sadtalker:      process.env.RUNPOD_SADTALKER_ENDPOINT_ID,
  musetalk:       process.env.RUNPOD_MUSETALK_ENDPOINT_ID,
  wav2lip:        process.env.RUNPOD_WAV2LIP_ENDPOINT_ID,
  whisper:        process.env.RUNPOD_WHISPER_ENDPOINT_ID,
  xtts:           process.env.RUNPOD_XTTS_ENDPOINT_ID,
  f5tts:          process.env.RUNPOD_F5TTS_ENDPOINT_ID,
  kokorotts:      process.env.RUNPOD_KOKOROTTS_ENDPOINT_ID,
  audioldm2:      process.env.RUNPOD_AUDIOLDM2_ENDPOINT_ID,
  browseruse:     process.env.RUNPOD_BROWSER_USE_ENDPOINT_ID,
  geneface:       process.env.RUNPOD_GENEFACE_ENDPOINT_ID,
  videoretalking: process.env.RUNPOD_VIDEORETALKING_ENDPOINT_ID,
  realesrgan:     process.env.RUNPOD_REALESRGAN_ENDPOINT_ID,
  loratrainer:    process.env.RUNPOD_LORATRAINER_ENDPOINT_ID,
};

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.runpod.io',
      path: `/v2${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request(opts, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch {
          resolve({ raw: Buffer.concat(chunks).toString() });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getRunningPods(endpointId) {
  const res = await apiRequest('GET', `/${endpointId}/pod`);
  if (res && res.pods) return res.pods;
  if (res && res.id) return [res];
  return [];
}

async function stopPod(endpointId, podId) {
  try {
    await apiRequest('POST', `/${endpointId}/pod/${podId}/stop`);
    return true;
  } catch (e) {
    console.error(`  Pod ${podId} durdurulamadı: ${e.message}`);
    return false;
  }
}

async function recycleEndpoint(key, endpointId) {
  if (!endpointId) {
    console.log(`⏭  ${key}: Endpoint ID ayarlı değil, atlanıyor`);
    return { key, status: 'skipped', reason: 'no endpoint id' };
  }

  console.log(`🔄 ${key} (${endpointId}) recycle ediliyor...`);

  const pods = await getRunningPods(endpointId);
  if (pods.length === 0) {
    console.log(`  ℹ️  Çalışan pod yok, yeni istek geldiğinde otomatik start olacak`);
    return { key, status: 'no_pods', podsStopped: 0 };
  }

  let stopped = 0;
  for (const pod of pods) {
    const podId = pod.id || pod.podId;
    if (podId) {
      const ok = await stopPod(endpointId, podId);
      if (ok) {
        console.log(`  ✅ Pod ${podId} durduruldu`);
        stopped++;
      }
    }
  }

  return { key, status: 'recycled', podsStopped: stopped };
}

async function main() {
  const args = process.argv.slice(2);
  const filter = args.length > 0 ? args : Object.keys(ENDPOINTS);

  console.log(`\n🚀 RunPod Container Recycle — ${filter.length} endpoint\n`);

  const results = [];
  for (const key of filter) {
    const endpointId = ENDPOINTS[key];
    const result = await recycleEndpoint(key, endpointId);
    results.push(result);
  }

  console.log('\n📊 Sonuçlar:');
  const recycled = results.filter(r => r.status === 'recycled');
  const skipped = results.filter(r => r.status === 'skipped');
  const noPods = results.filter(r => r.status === 'no_pods');

  console.log(`  ✅ Recycled: ${recycled.length}`);
  console.log(`  ⏭  Skipped (no env): ${skipped.length}`);
  console.log(`  ℹ️  No running pods: ${noPods.length}`);

  if (recycled.length > 0) {
    console.log('\n⚠️  Yeni imajların yüklenmesi için RunPod\'da ~2-5 dk bekleyin.');
    console.log('    İlk istek cold start yapacak ve yeni image\'ı pull edecek.');
  }
}

main().catch(console.error);
