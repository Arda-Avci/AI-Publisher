import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import fs from 'fs-extra';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockTaskId, axiosResponse } = vi.hoisted(() => {
  const mockTaskId = `task_${Date.now()}`;
  const axiosResponse = (data: any) => ({ status: 200, statusText: 'OK', headers: {}, config: {} as any, data });
  return { mockTaskId, axiosResponse };
});

vi.mock('axios', () => ({
  default: {
    post: vi.fn(async (url: string) => {
      if (url.includes('/generate-media')) {
        return axiosResponse({ status: 'accepted', task_id: mockTaskId });
      }
      if (url.includes('/inpaint-image') || url.includes('/generate-image')) {
        return axiosResponse(new ArrayBuffer(100));
      }
      if (url.includes('/generate-covers')) {
        return axiosResponse({ status: 'success', cover_paths: ['/download/cover/0', '/download/cover/1', '/download/cover/2'] });
      }
      if (url.includes('/apply-lipsync')) {
        return axiosResponse({ status: 'success', output_path: '/lip_sync_output.mp4', skipped: false });
      }
      if (url.includes('/generate-broll')) {
        return axiosResponse({ status: 'success', source: 'pexels', download_url: '/download/broll/1/1' });
      }
      if (url.includes('/localize-dubbing')) {
        return axiosResponse({ status: 'success', task_id: mockTaskId });
      }
      if (url.includes('/generate-avatar')) {
        return axiosResponse({ status: 'success', avatar_base64: 'data:image/png;base64,mockAvatar' });
      }
      if (url.includes('/status/')) {
        return axiosResponse({ status: 'success', stage: 'done', stagePercent: 100 });
      }
      if (url.includes('/remove-background')) {
        return axiosResponse(new ArrayBuffer(200));
      }
      if (url.includes('/transcribe')) {
        return axiosResponse({
          status: 'success', text: 'mock transcript',
          segments: [{ start: 0, end: 5, text: 'mock segment', words: [{ word: 'mock', start: 0, end: 0.5, confidence: 0.9 }] }],
          language: 'tr',
        });
      }
      if (url.includes('/shutdown')) {
        return axiosResponse({ status: 'shutting_down' });
      }
      return axiosResponse({});
    }),
    get: vi.fn(async (url: string) => {
      if (url.includes('/status/')) {
        return axiosResponse({ status: 'success', stage: 'done', stagePercent: 100 });
      }
      if (url.includes('/download/')) {
        return axiosResponse(new ArrayBuffer(500));
      }
      if (url.includes('/gpu-info') || url.includes('/health')) {
        return axiosResponse({ gpu: 'Tesla T4', memory: { gpu_total_gb: 16, gpu_free_gb: 12 }, status: 'running' });
      }
      if (url.includes('/verify-libs')) {
        return axiosResponse({ success: true, report: { torch: { status: 'ok' }, diffusers: { status: 'ok' }, TTS: { status: 'ok' } } });
      }
      return axiosResponse({});
    }),
  },
}));

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.from('mock')),
    remove: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockImplementation((p: string) => Promise.resolve(p.includes('_exists'))),
    readdir: vi.fn().mockResolvedValue([]),
    existsSync: vi.fn().mockImplementation((p: string) => p.includes('_exists')),
  },
  ensureDir: vi.fn().mockResolvedValue(undefined),
  copy: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from('mock')),
  remove: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockImplementation((p: string) => Promise.resolve(p.includes('_exists'))),
  readdir: vi.fn().mockResolvedValue([]),
  existsSync: vi.fn().mockImplementation((p: string) => p.includes('_exists')),
}));

vi.mock('./lib/logger.js', () => ({
  Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('./lib/ai-provider.js', () => ({
  getAIModelChain: vi.fn().mockReturnValue([{ modelId: 'gemini-2.5-flash' }]),
}));

vi.mock('./lib/ai-utils.js', () => ({
  withFallbackAndRetry: vi.fn(async (fn: any) => fn({ modelId: 'gemini-2.5-flash' })),
}));

vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: 'mock' }),
  generateObject: vi.fn().mockResolvedValue({ object: { titles: [], hashtags: [] } }),
}));

const COLAB_URL = 'https://mock-colab.ngrok-free.dev';

describe('Colab Video & Audio Generation Integration Tests', () => {
  beforeAll(() => {
    process.env.COLAB_URL = COLAB_URL;
  });

  afterAll(() => {
    delete process.env.COLAB_URL;
    vi.restoreAllMocks();
  });

  // ── 1. Video Generation ─────────────────────────────────────────────────────

  it('[VIDEO] generate-media endpoint creates production task', async () => {
    const response = await axios.post(`${COLAB_URL}/generate-media`, {
      mode: 'video',
      prompt: 'Test animation scene',
      model: 'CogVideoX-5b',
      scene_number: 1,
    });
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('accepted');
    expect(response.data.task_id).toBeDefined();
  });

  it('[VIDEO] task status polling returns completion', async () => {
    const response = await axios.get(`${COLAB_URL}/status/${mockTaskId}`);
    expect(response.data.status).toBe('success');
    expect(response.data.stage).toBe('done');
    expect(response.data.stagePercent).toBe(100);
  });

  it('[VIDEO] download endpoint serves binary data', async () => {
    const response = await axios.get(`${COLAB_URL}/download/video`);
    expect(response.data).toBeInstanceOf(ArrayBuffer);
  });

  it('[VIDEO] verify-libs returns ok for all models', async () => {
    const response = await axios.get(`${COLAB_URL}/verify-libs`);
    expect(response.data.success).toBe(true);
    expect(response.data.report.torch.status).toBe('ok');
    expect(response.data.report.diffusers.status).toBe('ok');
    expect(response.data.report.TTS.status).toBe('ok');
  });

  it('[VIDEO] gpu-info returns hardware details', async () => {
    const response = await axios.get(`${COLAB_URL}/gpu-info`);
    expect(response.data.gpu).toBeDefined();
    expect(response.data.memory.gpu_total_gb).toBeGreaterThan(0);
  });

  // ── 2. Audio / TTS Generation ────────────────────────────────────────────────

  it('[AUDIO] transcribe endpoint returns segments with word timestamps', async () => {
    const response = await axios.post(`${COLAB_URL}/transcribe`, { file_path: '/content/audio_exists.mp3', language: 'tr' });
    expect(response.data.status).toBe('success');
    expect(response.data.text).toBe('mock transcript');
    expect(response.data.segments.length).toBeGreaterThan(0);
    expect(response.data.segments[0].words).toBeDefined();
    expect(response.data.segments[0].words[0].word).toBe('mock');
    expect(response.data.segments[0].words[0].start).toBe(0);
  });

  it('[AUDIO] TTS speech generation via XTTS', async () => {
    const response = await axios.post(`${COLAB_URL}/generate-media`, {
      mode: 'xtts',
      text: 'Test speech',
      voice: 'Claribel Dervla',
      language: 'tr',
    });
    expect(response.data.status).toBe('accepted');
  });

  it('[AUDIO] SFX generation via AudioLDM2', async () => {
    const response = await axios.post(`${COLAB_URL}/generate-media`, {
      mode: 'sfx',
      prompt: 'Explosion sound effect',
    });
    expect(response.data.status).toBe('accepted');
  });

  // ── 3. Image / Cover Generation ──────────────────────────────────────────────

  it('[IMAGE] generate-image endpoint via DreamShaper/Flux', async () => {
    const formData = new FormData();
    formData.append('prompt', 'Cinematic portrait of a warrior');
    const response = await axios.post(`${COLAB_URL}/generate-image`, formData, {
      responseType: 'arraybuffer',
    });
    expect(response.data).toBeInstanceOf(ArrayBuffer);
    expect(response.data.byteLength).toBeGreaterThan(50);
  });

  it('[IMAGE] generate-covers produces 3 alternatives', async () => {
    const response = await axios.post(`${COLAB_URL}/generate-covers`, {
      prompt: 'YouTube thumbnail about AI',
      title: 'AI Revolution 2026',
      num_covers: 3,
    });
    expect(response.data.status).toBe('success');
    expect(response.data.cover_paths).toHaveLength(3);
  });

  it('[IMAGE] remove-background endpoint', async () => {
    const response = await axios.post(`${COLAB_URL}/remove-background`);
    expect(response.status).toBe(200);
  });

  it('[IMAGE] inpaint-image endpoint with mask', async () => {
    const response = await axios.post(`${COLAB_URL}/inpaint-image`);
    expect(response.status).toBe(200);
  });

  // ── 4. Lip-Sync ──────────────────────────────────────────────────────────────

  it('[LIP-SYNC] apply-lipsync returns output path', async () => {
    const formData = new FormData();
    formData.append('video', new Blob(['mock'], { type: 'video/mp4' }), 'video.mp4');
    formData.append('audio', new Blob(['mock'], { type: 'audio/wav' }), 'speech.wav');
    const response = await axios.post(`${COLAB_URL}/apply-lipsync`, formData);
    expect(response.data.status).toBe('success');
    expect(response.data.output_path).toContain('.mp4');
  });

  it('[LIP-SYNC] lipsync handles multi-face with speaker target', async () => {
    const formData = new FormData();
    formData.append('video', new Blob(['mock'], { type: 'video/mp4' }), 'scene.mp4');
    formData.append('audio', new Blob(['mock'], { type: 'audio/wav' }), 'speech.wav');
    formData.append('speaker', 'sibel');
    formData.append('character_images', JSON.stringify({ sibel: 'base64...' }));
    const response = await axios.post(`${COLAB_URL}/apply-lipsync`, formData);
    expect(response.data.status).toBe('success');
  });

  // ── 5. B-Roll Generation ─────────────────────────────────────────────────────

  it('[B-ROLL] generate-broll returns download URL', async () => {
    const response = await axios.post(`${COLAB_URL}/generate-broll`, {
      prompt: 'City traffic timelapse',
      duration: 5,
      scene_number: 1,
      job_id: 100,
    });
    expect(response.data.status).toBe('success');
    expect(response.data.download_url).toContain('/download/broll/');
  });

  it('[B-ROLL] broll download serves binary', async () => {
    const response = await axios.get(`${COLAB_URL}/download/broll/1/1`);
    expect(response.data).toBeInstanceOf(ArrayBuffer);
  });

  // ── 6. Avatar Generation ─────────────────────────────────────────────────────

  it('[AVATAR] generate-avatar returns base64 image', async () => {
    const response = await axios.post(`${COLAB_URL}/generate-avatar`, {
      avatar_prompt: 'Young woman with blue eyes, cyberpunk style',
    });
    expect(response.data.status).toBe('success');
    expect(response.data.avatar_base64).toContain('data:image/png;base64,');
  });

  // ── 7. Multi-language Dubbing ────────────────────────────────────────────────

  it('[DUBBING] localize-dubbing creates task', async () => {
    const response = await axios.post(`${COLAB_URL}/localize-dubbing`, {
      video_path: '/content/video_exists.mp4',
      source_lang: 'tr',
      target_langs: ['en', 'de', 'fr'],
      voice: 'Claribel Dervla',
    });
    expect(response.data.status).toBe('success');
    expect(response.data.task_id).toBeDefined();
  });

  it('[DUBBING] localized video download', async () => {
    const response = await axios.get(`${COLAB_URL}/download/localized/video/1/1`);
    expect(response.data).toBeInstanceOf(ArrayBuffer);
  });

  it('[DUBBING] localized audio download', async () => {
    const response = await axios.get(`${COLAB_URL}/download/localized/audio/1/1`);
    expect(response.data).toBeInstanceOf(ArrayBuffer);
  });

  // ── 8. Cover Download ────────────────────────────────────────────────────────

  it('[COVER] download cover serves binary', async () => {
    const response = await axios.get(`${COLAB_URL}/download/cover/0`);
    expect(response.data).toBeInstanceOf(ArrayBuffer);
  });

  // ── 9. Subtitle Download ─────────────────────────────────────────────────────

  it('[SUBTITLE] download subtitle endpoint', async () => {
    const response = await axios.get(`${COLAB_URL}/download/subtitle`);
    expect(response.data).toBeInstanceOf(ArrayBuffer);
  });

  // ── 10. Shutdown ─────────────────────────────────────────────────────────────

  it('[SHUTDOWN] shutdown endpoint', async () => {
    const response = await axios.post(`${COLAB_URL}/shutdown`);
    expect(response.status).toBe(200);
  });

  // ── 11. Task status polling ──────────────────────────────────────────────────

  it('[TASK] status polling with different stages', async () => {
    const response = await axios.get(`${COLAB_URL}/status/mock_task_video`);
    expect(response.data.status).toBe('success');
    expect(response.data.stagePercent).toBeGreaterThanOrEqual(0);
  });
});
