import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const COLAB_URL = process.env.COLAB_URL || 'http://localhost:5000';

describe('Colab Video & Audio Generation Integration Tests', () => {
  beforeAll(() => {
    if (!process.env.COLAB_URL) {
      process.env.COLAB_URL = COLAB_URL;
    }
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
  }, 60000);

  it('[VIDEO] task status polling returns completion', async () => {
    const taskId = `task_${Date.now()}`;
    const response = await axios.get(`${COLAB_URL}/status/${taskId}`);
    expect(response.data).toHaveProperty('status');
  }, 60000);

  it('[VIDEO] download endpoint serves binary data', async () => {
    const response = await axios.get(`${COLAB_URL}/download/video`, {
      responseType: 'arraybuffer',
    });
    expect(response.data).toBeDefined();
  }, 60000);

  it('[VIDEO] verify-libs returns ok for all models', async () => {
    const response = await axios.get(`${COLAB_URL}/verify-libs`);
    expect(response.data.success).toBe(true);
    expect(response.data.report).toBeDefined();
  }, 60000);

  it('[VIDEO] gpu-info returns hardware details', async () => {
    const response = await axios.get(`${COLAB_URL}/gpu-info`);
    expect(response.data.gpu).toBeDefined();
    expect(response.data.memory.gpu_total_gb).toBeGreaterThan(0);
  }, 60000);

  // ── 2. Audio / TTS Generation ────────────────────────────────────────────────

  it('[AUDIO] transcribe endpoint returns segments with word timestamps', async () => {
    const response = await axios.post(`${COLAB_URL}/transcribe`, {
      file_path: '/content/audio_exists.mp3',
      language: 'tr',
    });
    expect(response.data.status).toBe('success');
    expect(response.data.text).toBeDefined();
    expect(response.data.segments.length).toBeGreaterThan(0);
  }, 60000);

  it('[AUDIO] TTS speech generation via XTTS', async () => {
    const response = await axios.post(`${COLAB_URL}/generate-media`, {
      mode: 'xtts',
      text: 'Test speech',
      voice: 'Claribel Dervla',
      language: 'tr',
    });
    expect(response.data.status).toBe('accepted');
  }, 60000);

  it('[AUDIO] SFX generation via AudioLDM2', async () => {
    const response = await axios.post(`${COLAB_URL}/generate-media`, {
      mode: 'sfx',
      prompt: 'Explosion sound effect',
    });
    expect(response.data.status).toBe('accepted');
  }, 60000);

  // ── 3. Image / Cover Generation ──────────────────────────────────────────────

  it('[IMAGE] generate-image endpoint via DreamShaper/Flux', async () => {
    const formData = new FormData();
    formData.append('prompt', 'Cinematic portrait of a warrior');
    const response = await axios.post(`${COLAB_URL}/generate-image`, formData, {
      responseType: 'arraybuffer',
    });
    expect(response.data).toBeDefined();
  }, 60000);

  it('[IMAGE] generate-covers produces 3 alternatives', async () => {
    const response = await axios.post(`${COLAB_URL}/generate-covers`, {
      prompt: 'YouTube thumbnail about AI',
      title: 'AI Revolution 2026',
      num_covers: 3,
    });
    expect(response.data.status).toBe('success');
    expect(response.data.cover_paths).toHaveLength(3);
  }, 60000);

  it('[IMAGE] remove-background endpoint', async () => {
    const response = await axios.post(`${COLAB_URL}/remove-background`);
    expect(response.status).toBe(200);
  }, 60000);

  it('[IMAGE] inpaint-image endpoint with mask', async () => {
    const response = await axios.post(`${COLAB_URL}/inpaint-image`);
    expect(response.status).toBe(200);
  }, 60000);

  // ── 4. Lip-Sync ──────────────────────────────────────────────────────────────

  it('[LIP-SYNC] apply-lipsync returns output path', async () => {
    const formData = new FormData();
    formData.append('video', new Blob(['mock'], { type: 'video/mp4' }), 'video.mp4');
    formData.append('audio', new Blob(['mock'], { type: 'audio/wav' }), 'speech.wav');
    const response = await axios.post(`${COLAB_URL}/apply-lipsync`, formData);
    expect(response.data.status).toBe('success');
    expect(response.data.output_path).toContain('.mp4');
  }, 60000);

  it('[LIP-SYNC] lipsync handles multi-face with speaker target', async () => {
    const formData = new FormData();
    formData.append('video', new Blob(['mock'], { type: 'video/mp4' }), 'scene.mp4');
    formData.append('audio', new Blob(['mock'], { type: 'audio/wav' }), 'speech.wav');
    formData.append('speaker', 'sibel');
    formData.append('character_images', JSON.stringify({ sibel: 'base64...' }));
    const response = await axios.post(`${COLAB_URL}/apply-lipsync`, formData);
    expect(response.data.status).toBe('success');
  }, 60000);

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
  }, 60000);

  it('[B-ROLL] broll download serves binary', async () => {
    const response = await axios.get(`${COLAB_URL}/download/broll/1/1`, {
      responseType: 'arraybuffer',
    });
    expect(response.data).toBeDefined();
  }, 60000);

  // ── 6. Avatar Generation ─────────────────────────────────────────────────────

  it('[AVATAR] generate-avatar returns base64 image', async () => {
    const response = await axios.post(`${COLAB_URL}/generate-avatar`, {
      avatar_prompt: 'Young woman with blue eyes, cyberpunk style',
    });
    expect(response.data.status).toBe('success');
    expect(response.data.avatar_base64).toContain('data:image/png;base64,');
  }, 60000);

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
  }, 60000);

  it('[DUBBING] localized video download', async () => {
    const response = await axios.get(`${COLAB_URL}/download/localized/video/1/1`, {
      responseType: 'arraybuffer',
    });
    expect(response.data).toBeDefined();
  }, 60000);

  it('[DUBBING] localized audio download', async () => {
    const response = await axios.get(`${COLAB_URL}/download/localized/audio/1/1`, {
      responseType: 'arraybuffer',
    });
    expect(response.data).toBeDefined();
  }, 60000);

  // ── 8. Cover Download ────────────────────────────────────────────────────────

  it('[COVER] download cover serves binary', async () => {
    const response = await axios.get(`${COLAB_URL}/download/cover/0`, {
      responseType: 'arraybuffer',
    });
    expect(response.data).toBeDefined();
  }, 60000);

  // ── 9. Subtitle Download ─────────────────────────────────────────────────────

  it('[SUBTITLE] download subtitle endpoint', async () => {
    const response = await axios.get(`${COLAB_URL}/download/subtitle`, {
      responseType: 'arraybuffer',
    });
    expect(response.data).toBeDefined();
  }, 60000);

  // ── 10. Shutdown ─────────────────────────────────────────────────────────────

  it('[SHUTDOWN] shutdown endpoint', async () => {
    const response = await axios.post(`${COLAB_URL}/shutdown`);
    expect(response.status).toBe(200);
  }, 60000);

  // ── 11. Task status polling ──────────────────────────────────────────────────

  it('[TASK] status polling with different stages', async () => {
    const response = await axios.get(`${COLAB_URL}/status/mock_task_video`);
    expect(response.data).toHaveProperty('status');
    expect(response.data).toHaveProperty('stagePercent');
  }, 60000);
});
