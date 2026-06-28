import { dockerHost, DockerService } from '../src/lib/docker-host.js';

interface PortResult {
  service: string;
  port: number;
  healthy: boolean;
  error?: string;
}

async function main() {
  console.log('========================================================');
  console.log('  Docker Port Test — 5001-5026');
  console.log('========================================================\n');

  const results: PortResult[] = [];
  const list = dockerHost as any;
  const registry: Record<string, { port: number; description: string }> =
    (list as any).constructor?.name === 'DockerHostImpl'
      ? {} // fallback
      : {};

  const serviceKeys: DockerService[] = [
    'cogvideox', 'xtts', 'audioldm2', 'wav2lip', 'musetalk',
    'whisper', 'stablediffusion', 'wan', 'ltx', 'hunyuan',
    'kokorotts', 'svd', 'animatediff', 'wan25', 'f5tts',
    'lora-trainer', 'sadtalker', 'dynamicrafter', 'zeroscope',
    'video-retalking', 'geneface', 'mochi', 'pyramid-flow',
    'videocrafter', 'realesrgan', 'browser-use',
  ];

  let passed = 0;
  let failed = 0;

  for (const key of serviceKeys) {
    let port = 0;
    let desc = key;
    try {
      const url = dockerHost.getUrl(key);
      port = Number(url.split(':')[2]) || 0;
      const info = await dockerHost.isServiceHealthy(key);
      if (info) {
        console.log(`  ✅ ${key.padEnd(20)} port ${String(port).padEnd(4)} healthy`);
        passed++;
      } else {
        console.log(`  ❌ ${key.padEnd(20)} port ${String(port).padEnd(4)} unreachable`);
        failed++;
      }
      results.push({ service: key, port, healthy: info });
    } catch (err: any) {
      console.log(`  ❌ ${key.padEnd(20)} port ${String(port || '?').padEnd(4)} error: ${err.message}`);
      failed++;
      results.push({ service: key, port, healthy: false, error: err.message });
    }
  }

  console.log('\n========================================================');
  console.log(`  Sonuc: ${passed} saglikli, ${failed} hatali`);
  console.log('========================================================');

  if (failed > 0) {
    console.log('\n  Basarisiz servisler:');
    for (const r of results) {
      if (!r.healthy) {
        console.log(`    - ${r.service} (port ${r.port}): ${r.error || 'yanit vermiyor'}`);
      }
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Kritik hata:', err);
  process.exit(1);
});
