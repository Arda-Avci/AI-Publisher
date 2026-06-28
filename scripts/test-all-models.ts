import dotenv from 'dotenv';
import { RunPodClient } from '../src/services/runpod.js';
import {
  getEndpointForModel,
  getModelConfig,
  getAllModelKeys,
  validateEndpoints,
} from '../src/services/runpodEndpoints.js';

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

if (!RUNPOD_API_KEY || RUNPOD_API_KEY.includes('your_')) {
  console.error('❌ RUNPOD_API_KEY .env tanimli degil');
  process.exit(1);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TEST_PROMPTS: Record<string, string> = {
  animatediff: 'A cute cat walking on a sunny beach, anime style, 2D animation',
  audioldm2: 'Thunderstorm with heavy rain and wind howling through trees',
  cogvideox: 'A cinematic shot of a sports car driving on a mountain road at sunset',
  'cogvideox-2b': 'A peaceful garden with flowers blooming in slow motion',
  dynamicrafter: 'A serene lake with mountains reflecting on water surface',
  f5tts: 'Merhaba, bu bir test konusmasidir. Nasil duyuluyorum?',
  geneface: '', // needs audio + image URL
  hunyuan: 'A majestic dragon flying over ancient Chinese temples at dawn',
  kokorotts: 'Bugun hava cok guzel, disarida yurumek icin harika bir gun.',
  'lora-trainer': '', // needs image URLs array
  ltx: 'A astronaut walking on Mars surface, red dusty landscape, cinematic',
  mochi: 'Aerial drone shot of a lighthouse on a rocky cliff during storm',
  musetalk: '', // needs video + audio URL
  'pyramid-flow': 'A blooming flower time-lapse, vibrant colors, macro photography',
  sadtalker: '', // needs source_image + audio_url
  stablediffusion: 'A futuristic city with neon lights, cyberpunk style, highly detailed digital art',
  svd: '', // needs image_url
  'video-retalking': '', // needs video + audio URL
  videocrafter: 'A train moving through a snowy landscape, steam engine, vintage',
  wan: 'A news anchor in a modern studio, professional lighting, 4K quality',
  wan25: 'Cinematic drone footage of Istanbul Bosphorus at golden hour',
  'wan22-comfyui': '', // ComfyUI workflow format (special)
  wav2lip: '', // needs video + audio URL
  whisper: 'https://pub-c0646c0e86334547908b53d1000bb69d.r2.dev/news_audio_tr.mp3', // audio_url
  xtts: 'Sayin seyirciler, su an canli yayin akisimiza devam ediyoruz.',
  zeroscope: 'A horse galloping across a green field, slow motion',
  'browser-use': '', // special — needs task description
  realesrgan: '', // needs image_url
};

interface TestResult {
  model: string;
  status: 'ok' | 'skip' | 'fail';
  endpointId?: string;
  error?: string;
  jobId?: string;
  elapsed?: number;
}

async function testModel(modelKey: string): Promise<TestResult> {
  const endpointId = getEndpointForModel(modelKey);
  const config = getModelConfig(modelKey);

  if (!endpointId) {
    return { model: modelKey, status: 'skip', error: 'No endpoint configured' };
  }

  if (config?.envVar && !process.env[config.envVar]) {
    return { model: modelKey, status: 'skip', error: `${config.envVar} not set` };
  }

  const prompt = TEST_PROMPTS[modelKey];
  if (!prompt) {
    return { model: modelKey, status: 'skip', error: 'No test prompt defined' };
  }

  if (['musetalk', 'sadtalker', 'wav2lip', 'video-retalking', 'geneface',
       'lora-trainer', 'svd', 'dynamicrafter', 'wan22-comfyui',
       'browser-use', 'realesrgan'].includes(modelKey)) {
    return { model: modelKey, status: 'skip', error: 'Needs special input (URL/image/video)' };
  }

  console.log(`\n🧪 ${config?.modelName || modelKey} (${modelKey})`);
  console.log(`   Endpoint: ${endpointId}`);
  console.log(`   Prompt: ${prompt.slice(0, 60)}...`);

  const start = Date.now();

  try {
    const input: Record<string, unknown> = {
      ...(config?.defaultInput || {}),
      prompt,
    };

    const testInput = { ...input, prompt };
    if (modelKey === 'whisper') {
      testInput.audio_url = prompt;
      delete testInput.prompt;
    }

    const job = await RunPodClient.runJob(endpointId, testInput);
    console.log(`   Job ID: ${job.id}`);

    const status = await RunPodClient.pollUntilComplete(
      endpointId,
      job.id,
      5000,
      300000,
      (progress) => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(0);
        if (progress.status === 'IN_PROGRESS') {
          process.stdout.write(`   [${elapsed}s] ${progress.status} (queue: ${progress.queuePosition ?? '?'})\r`);
        }
      },
    );

    const elapsed = Date.now() - start;
    console.log(`   ✅ Completed in ${(elapsed / 1000).toFixed(1)}s`);

    return {
      model: modelKey,
      status: 'ok',
      endpointId,
      jobId: job.id,
      elapsed,
    };
  } catch (error: any) {
    const elapsed = Date.now() - start;
    console.error(`   ❌ Failed: ${error.message}`);
    return {
      model: modelKey,
      status: 'fail',
      endpointId,
      error: error.message,
      elapsed,
    };
  }
}

async function main() {
  console.log('===========================================================');
  console.log('  RunPod Model Test Suite — v2 API');
  console.log('===========================================================');

  const { configured, missing } = validateEndpoints();
  console.log(`\n📊 Endpoint Durumu:`);
  console.log(`   ✅ ${configured.length} model konfigure`);
  console.log(`   ⏳ ${missing.length} model eksik`);
  console.log(`   📦 Toplam: ${getAllModelKeys().length} model kayitli`);
  console.log(`   🔑 API: ${RUNPOD_API_KEY?.slice(0, 12)}...`);

  if (missing.length > 0) {
    console.log(`\n   Eksik endpoint'ler:`);
    for (const key of missing) {
      const cfg = getModelConfig(key);
      console.log(`     - ${cfg?.modelName || key} (${cfg?.envVar})`);
    }
  }

  const target = process.argv[2];
  let modelsToTest: string[];

  if (target && target !== '--all') {
    modelsToTest = [target];
  } else if (target === '--video') {
    modelsToTest = getAllModelKeys().filter((k) => getModelConfig(k)?.category === 'video');
  } else if (target === '--audio') {
    modelsToTest = getAllModelKeys().filter((k) => getModelConfig(k)?.category === 'audio');
  } else if (target === '--face') {
    modelsToTest = getAllModelKeys().filter((k) => getModelConfig(k)?.category === 'face');
  } else {
    modelsToTest = getAllModelKeys();
  }

  console.log(`\n🧪 ${modelsToTest.length} model test edilecek...`);
  console.log('===========================================================\n');

  const results: TestResult[] = [];
  for (const modelKey of modelsToTest) {
    const result = await testModel(modelKey);
    results.push(result);
    await sleep(1000);
  }

  console.log('\n\n===========================================================');
  console.log('  TEST SONUCLARI');
  console.log('===========================================================');
  console.log(`\n   ✅ Basarili: ${results.filter((r) => r.status === 'ok').length}`);
  console.log(`   ⏭️  Atlanan: ${results.filter((r) => r.status === 'skip').length}`);
  console.log(`   ❌ Hatali:  ${results.filter((r) => r.status === 'fail').length}`);

  const failed = results.filter((r) => r.status === 'fail');
  if (failed.length > 0) {
    console.log('\n   Basarisiz modeller:');
    for (const f of failed) {
      console.log(`     - ${f.model}: ${f.error}`);
    }
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Kritik hata:', err);
  process.exit(1);
});
