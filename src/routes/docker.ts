import { Router, type Request, type Response } from 'express';
import { dockerHost } from '../lib/docker-host.js';
import { Logger } from '../lib/logger.js';
import axios from 'axios';

const router = Router();

const SERVICE_REGISTRY: Record<string, { port: number; description: string; healthUrl: string }> = {
  cogvideox:    { port: 5001, description: 'Video Generation (CogVideoX)',        healthUrl: '/health' },
  xtts:         { port: 5002, description: 'TTS / Voice Cloning (XTTS-v2)',       healthUrl: '/health' },
  audioldm2:    { port: 5003, description: 'Sound FX (AudioLDM2)',                healthUrl: '/health' },
  wav2lip:      { port: 5004, description: 'Lip Sync (Wav2Lip)',                  healthUrl: '/health' },
  musetalk:     { port: 5005, description: 'Talking Head (MuseTalk)',             healthUrl: '/health' },
  whisper:      { port: 5006, description: 'Transcription (Whisper)',             healthUrl: '/health' },
  stablediffusion: { port: 5007, description: 'Image Generation (SD / Flux)',     healthUrl: '/health' },
  wan:          { port: 5008, description: 'Video Generation (Wan 2.1)',          healthUrl: '/health' },
  ltx:          { port: 5009, description: 'Video Generation (LTX-Video)',        healthUrl: '/health' },
  hunyuan:      { port: 5010, description: 'Video Generation (HunyuanVideo)',      healthUrl: '/health' },
  kokorotts:    { port: 5011, description: 'TTS (Kokoro-82M)',                    healthUrl: '/health' },
  svd:          { port: 5012, description: 'Video Generation (SVD-XT)',           healthUrl: '/health' },
  animatediff:  { port: 5013, description: 'Animation (AnimateDiff)',             healthUrl: '/health' },
  wan25:        { port: 5014, description: 'Video Generation (Wan2.5)',           healthUrl: '/health' },
  f5tts:        { port: 5015, description: 'Zero-Shot TTS (F5-TTS)',              healthUrl: '/health' },
  'lora-trainer': { port: 5016, description: 'LoRA Fine-Tuning',                  healthUrl: '/health' },
  sadtalker:            { port: 5017, description: 'Talking Head (SadTalker)',                healthUrl: '/health' },
  dynamicrafter:  { port: 5018, description: 'Image-to-Video (DynamiCrafter)',     healthUrl: '/health' },
  zeroscope:            { port: 5019, description: 'Text-to-Video (Zeroscope)',              healthUrl: '/health' },
  'video-retalking':    { port: 5020, description: 'Lip Sync (Video-ReTalking)',             healthUrl: '/health' },
  geneface:       { port: 5021, description: '3D Talking Head (GeneFace++)',       healthUrl: '/health' },
  mochi:          { port: 5022, description: 'Video Generation (Mochi-1)',           healthUrl: '/health' },
  'pyramid-flow': { port: 5023, description: 'Video Generation (Pyramid-Flow)',    healthUrl: '/health' },
  videocrafter:   { port: 5024, description: 'Video Generation (VideoCrafter)',    healthUrl: '/health' },
  realesrgan:     { port: 5025, description: '4K Upscale (Real-ESRGAN)',           healthUrl: '/health' },
  'browser-use':  { port: 5026, description: 'Browser Automation (browser-use)',    healthUrl: '/health' },
};

async function fetchGPUInfo(): Promise<{ gpu: string; vramTotal: number; vramUsed: number } | null> {
  try {
    const host = dockerHost.getHost();
    const res = await axios.get(`${host}:5001/gpu-info`, { timeout: 5000 });
    if (res.data) {
      return {
        gpu: res.data.gpu_model || res.data.gpu || 'Unknown',
        vramTotal: res.data.vram_total || res.data.total_vram || 0,
        vramUsed: res.data.vram_used || res.data.used_vram || 0,
      };
    }
  } catch {
    try {
      const host = dockerHost.getHost();
      const res = await axios.get(`${host}:5007/gpu-info`, { timeout: 5000 });
      if (res.data) {
        return {
          gpu: res.data.gpu_model || res.data.gpu || 'Unknown',
          vramTotal: res.data.vram_total || 0,
          vramUsed: res.data.vram_used || 0,
        };
      }
    } catch {}
  }
  return null;
}

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const state = dockerHost.getState();
    const gpuInfo = await fetchGPUInfo();
    const healthyCount = Object.values(state.services).filter(s => s.healthy).length;
    const totalCount = Object.keys(state.services).length;
    const isRunning = healthyCount > 0;
    res.json({
      host: state.host,
      status: isRunning ? 'running' : 'stopped',
      isRunning,
      healthyCount,
      totalCount,
      gpuModel: gpuInfo?.gpu ?? null,
      vram_total: gpuInfo?.vramTotal ?? 0,
      vram_used: gpuInfo?.vramUsed ?? 0,
      services: state.services,
    });
  } catch (err) {
    Logger.error('[Docker] /status error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: 'Docker status check failed' });
  }
});

router.get('/test-models', async (_req: Request, res: Response) => {
  const results: Array<{ model: string; status: string; vram?: number; error?: string; timeMs?: number }> = [];
  const host = dockerHost.getHost();
  for (const [name, info] of Object.entries(SERVICE_REGISTRY)) {
    const start = Date.now();
    try {
      const url = `${host}:${info.port}${info.healthUrl}`;
      const r = await axios.get(url, { timeout: 10000 });
      results.push({
        model: name,
        status: r.status === 200 ? 'healthy' : 'degraded',
        timeMs: Date.now() - start,
      });
    } catch (err: any) {
      results.push({
        model: name,
        status: 'error',
        error: err.code || err.message || 'Connection failed',
        timeMs: Date.now() - start,
      });
    }
  }
  res.json({ results, total: results.length, healthy: results.filter(r => r.status === 'healthy').length });
});

router.get('/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const sendState = async () => {
    try {
      const state = dockerHost.getState();
      const gpuInfo = await fetchGPUInfo();
      const healthyCount = Object.values(state.services).filter(s => s.healthy).length;
      const isRunning = healthyCount > 0;
      res.write(`data: ${JSON.stringify({
        host: state.host,
        status: isRunning ? 'running' : 'stopped',
        isRunning,
        healthyCount,
        totalCount: Object.keys(state.services).length,
        gpuModel: gpuInfo?.gpu ?? null,
        vram_total: gpuInfo?.vramTotal ?? 0,
        vram_used: gpuInfo?.vramUsed ?? 0,
        services: state.services,
      })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ status: 'error', error: 'Status check failed' })}\n\n`);
    }
  };

  void sendState();
  const interval = setInterval(sendState, 30_000);

  const onServiceChange = () => { void sendState(); };
  dockerHost.on('service-change', onServiceChange);

  req.on('close', () => {
    clearInterval(interval);
    dockerHost.off('service-change', onServiceChange);
  });
});

export default router;
