import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import { colab } from '../lib/colab-manager.js';
import { Logger } from '../lib/logger.js';

export interface StudioSoundOptions {
  denoise?: boolean;
  equalize?: boolean;
  deecho?: boolean;
  levelDb?: number;
}

export interface SmartReframeOptions {
  useFaceTracking?: boolean;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  outputWidth?: number;
  outputHeight?: number;
  startTime?: number;
  duration?: number;
}

export interface StudioResult {
  outputPath: string;
  usedColab: boolean;
  durationMs: number;
}

type ProgressCallback = (percent: number, message: string) => void;

async function tryColab<T>(action: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    if (colab.isHealthy()) {
      const result = await fn();
      return { ok: true, value: result };
    }
  } catch (err) {
    Logger.warn(`[aiStudio] Colab ${action} failed, will fallback:`, err);
  }
  return { ok: false };
}

export async function enhanceAudio(
  inputVideo: string,
  outputVideo: string,
  options: StudioSoundOptions = {},
  onProgress?: ProgressCallback
): Promise<StudioResult> {
  const startTime = Date.now();
  const opts = { denoise: true, equalize: false, deecho: true, levelDb: -3, ...options };

  onProgress?.(10, 'Ses iyileştirme başlıyor...');

  const colabResult = await tryColab('studio-sound', async () => {
    const colabUrl = colab.getState().ngrokUrl;
    if (!colabUrl) throw new Error('Colab not connected');

    const videoBuffer = await fs.readFile(inputVideo);
    const formData = new FormData();
    formData.append('video', new Blob([videoBuffer], { type: 'video/mp4' }), path.basename(inputVideo));
    formData.append('options', JSON.stringify(opts));

    const response = await axios.post(`${colabUrl}/api/v1/studio/studio-sound`, formData, {
      headers: { 'ngrok-skip-browser-warning': 'true', 'bypass-tunnel-reminder': 'true' },
      responseType: 'arraybuffer',
      timeout: 300000,
    });

    await fs.writeFile(outputVideo, Buffer.from(response.data));
    return { outputPath: outputVideo, usedColab: true, durationMs: Date.now() - startTime };
  });

  if (colabResult.ok) return colabResult.value;

  onProgress?.(30, 'Yerel FFmpeg ile ses iyileştirme...');
  const { enhanceAudio: localEnhance } = await import('./studioSound.js');
  await localEnhance(inputVideo, outputVideo, opts);
  onProgress?.(100, 'Ses iyileştirme tamamlandı');

  return { outputPath: outputVideo, usedColab: false, durationMs: Date.now() - startTime };
}

export async function enhanceVideoAudio(
  inputVideo: string,
  outputVideo: string,
  options: StudioSoundOptions = {},
  onProgress?: ProgressCallback
): Promise<StudioResult> {
  const startTime = Date.now();
  const opts = { denoise: true, equalize: false, deecho: true, levelDb: -3, ...options };

  onProgress?.(10, 'Video+Ses iyileştirme başlıyor...');

  const colabResult = await tryColab('studio-sound-video', async () => {
    const colabUrl = colab.getState().ngrokUrl;
    if (!colabUrl) throw new Error('Colab not connected');

    const videoBuffer = await fs.readFile(inputVideo);
    const formData = new FormData();
    formData.append('video', new Blob([videoBuffer], { type: 'video/mp4' }), path.basename(inputVideo));
    formData.append('options', JSON.stringify(opts));

    const response = await axios.post(`${colabUrl}/api/v1/studio/studio-sound`, formData, {
      headers: { 'ngrok-skip-browser-warning': 'true', 'bypass-tunnel-reminder': 'true' },
      responseType: 'arraybuffer',
      timeout: 300000,
    });

    await fs.writeFile(outputVideo, Buffer.from(response.data));
    return { outputPath: outputVideo, usedColab: true, durationMs: Date.now() - startTime };
  });

  if (colabResult.ok) return colabResult.value;

  onProgress?.(30, 'Yerel FFmpeg ile video+sess iyileştirme...');
  const { enhanceVideoAudio: localEnhance } = await import('./studioSound.js');
  await localEnhance(inputVideo, outputVideo, opts);
  onProgress?.(100, 'Video+Ses iyileştirme tamamlandı');

  return { outputPath: outputVideo, usedColab: false, durationMs: Date.now() - startTime };
}

export async function smartReframe(
  inputVideo: string,
  outputVideo: string,
  options: SmartReframeOptions = {},
  onProgress?: ProgressCallback
): Promise<StudioResult> {
  const startTime = Date.now();
  const opts = {
    useFaceTracking: true,
    aspectRatio: '9:16' as const,
    outputWidth: 1080,
    outputHeight: 1920,
    startTime: 0,
    ...options,
  };

  onProgress?.(10, 'Akıllı yeniden çerçeveleme başlıyor...');

  const colabResult = await tryColab('smart-reframe', async () => {
    const colabUrl = colab.getState().ngrokUrl;
    if (!colabUrl) throw new Error('Colab not connected');

    const videoBuffer = await fs.readFile(inputVideo);
    const formData = new FormData();
    formData.append('video', new Blob([videoBuffer], { type: 'video/mp4' }), path.basename(inputVideo));
    formData.append('options', JSON.stringify(opts));

    const response = await axios.post(`${colabUrl}/api/v1/studio/smart-reframe`, formData, {
      headers: { 'ngrok-skip-browser-warning': 'true', 'bypass-tunnel-reminder': 'true' },
      responseType: 'arraybuffer',
      timeout: 600000,
    });

    await fs.writeFile(outputVideo, Buffer.from(response.data));
    return { outputPath: outputVideo, usedColab: true, durationMs: Date.now() - startTime };
  });

  if (colabResult.ok) return colabResult.value;

  onProgress?.(30, 'Yerel yüz takibi ile yeniden çerçeveleme...');
  if (opts.useFaceTracking) {
    const { videoClipper } = await import('./clipper/index.js');
    const segment = {
      id: `reframe-${Date.now()}`,
      startTime: opts.startTime,
      endTime: opts.duration ? opts.startTime + opts.duration : opts.startTime + 30,
      duration: opts.duration || 30,
      score: 100,
      reason: 'Smart reframe',
      highlights: [],
    };
    await videoClipper.cropSegmentWithFaceTracking(inputVideo, outputVideo, segment, {
      aspectRatio: opts.aspectRatio,
      outputWidth: opts.outputWidth,
      outputHeight: opts.outputHeight,
    });
  } else {
    const { autoReframeHorizontalToVertical } = await import('./autoReframe.js');
    await autoReframeHorizontalToVertical(inputVideo, outputVideo, 'center');
  }
  onProgress?.(100, 'Yeniden çerçeveleme tamamlandı');

  return { outputPath: outputVideo, usedColab: false, durationMs: Date.now() - startTime };
}

export async function removeBackground(
  inputImage: string,
  outputImage: string,
  onProgress?: ProgressCallback
): Promise<StudioResult> {
  const startTime = Date.now();
  onProgress?.(10, 'Arka plan kaldırma başlıyor...');

  const colabResult = await tryColab('remove-background', async () => {
    const colabUrl = colab.getState().ngrokUrl;
    if (!colabUrl) throw new Error('Colab not connected');

    const imgBuffer = await fs.readFile(inputImage);
    const formData = new FormData();
    formData.append('image', new Blob([imgBuffer], { type: 'image/png' }), path.basename(inputImage));

    const response = await axios.post(`${colabUrl}/remove-background`, formData, {
      headers: { 'ngrok-skip-browser-warning': 'true', 'bypass-tunnel-reminder': 'true' },
      responseType: 'arraybuffer',
      timeout: 120000,
    });

    await fs.writeFile(outputImage, Buffer.from(response.data));
    return { outputPath: outputImage, usedColab: true, durationMs: Date.now() - startTime };
  });

  if (colabResult.ok) {
    onProgress?.(100, 'Arka plan kaldırma tamamlandı');
    return colabResult.value;
  }

  throw new Error('Arka plan kaldırma için Colab bağlantısı gerekli');
}

export async function generateImage(
  prompt: string,
  outputImage: string,
  modelType: string = 'dreamshaper',
  onProgress?: ProgressCallback
): Promise<StudioResult> {
  const startTime = Date.now();
  onProgress?.(10, 'Görsel üretiliyor...');

  const colabResult = await tryColab('generate-image', async () => {
    const colabUrl = colab.getState().ngrokUrl;
    if (!colabUrl) throw new Error('Colab not connected');

    const response = await axios.post(`${colabUrl}/generate-image`,
      { prompt, model_type: modelType },
      {
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        responseType: 'arraybuffer',
        timeout: 120000,
      }
    );

    await fs.writeFile(outputImage, Buffer.from(response.data));
    return { outputPath: outputImage, usedColab: true, durationMs: Date.now() - startTime };
  });

  if (colabResult.ok) {
    onProgress?.(100, 'Görsel üretildi');
    return colabResult.value;
  }

  throw new Error('Görsel üretimi için Colab bağlantısı gerekli');
}

export async function inpaintImage(
  inputImage: string,
  maskImage: string,
  prompt: string,
  outputImage: string,
  onProgress?: ProgressCallback
): Promise<StudioResult> {
  const startTime = Date.now();
  onProgress?.(10, 'Inpaint başlıyor...');

  const colabResult = await tryColab('inpaint', async () => {
    const colabUrl = colab.getState().ngrokUrl;
    if (!colabUrl) throw new Error('Colab not connected');

    const imgBuffer = await fs.readFile(inputImage);
    const maskBuffer = await fs.readFile(maskImage);
    const formData = new FormData();
    formData.append('image', new Blob([imgBuffer], { type: 'image/png' }), 'image.png');
    formData.append('mask', new Blob([maskBuffer], { type: 'image/png' }), 'mask.png');
    formData.append('prompt', prompt);

    const response = await axios.post(`${colabUrl}/inpaint-image`, formData, {
      headers: { 'ngrok-skip-browser-warning': 'true', 'bypass-tunnel-reminder': 'true' },
      responseType: 'arraybuffer',
      timeout: 120000,
    });

    await fs.writeFile(outputImage, Buffer.from(response.data));
    return { outputPath: outputImage, usedColab: true, durationMs: Date.now() - startTime };
  });

  if (colabResult.ok) {
    onProgress?.(100, 'Inpaint tamamlandı');
    return colabResult.value;
  }

  throw new Error('Inpaint için Colab bağlantısı gerekli');
}

export async function correctGaze(
  inputVideo: string,
  outputVideo: string,
  smooth: boolean = true,
  onProgress?: ProgressCallback
): Promise<StudioResult> {
  const startTime = Date.now();
  onProgress?.(10, 'Göz teması düzeltiliyor...');

  const colabResult = await tryColab('eye-contact', async () => {
    const colabUrl = colab.getState().ngrokUrl;
    if (!colabUrl) throw new Error('Colab not connected');

    const videoBuffer = await fs.readFile(inputVideo);
    const formData = new FormData();
    formData.append('video', new Blob([videoBuffer], { type: 'video/mp4' }), path.basename(inputVideo));
    formData.append('smooth', String(smooth));

    const response = await axios.post(`${colabUrl}/api/v1/eye-contact`, formData, {
      headers: { 'ngrok-skip-browser-warning': 'true', 'bypass-tunnel-reminder': 'true' },
      responseType: 'arraybuffer',
      timeout: 300000,
    });

    await fs.writeFile(outputVideo, Buffer.from(response.data));
    return { outputPath: outputVideo, usedColab: true, durationMs: Date.now() - startTime };
  });

  if (colabResult.ok) {
    onProgress?.(100, 'Göz teması düzeltildi');
    return colabResult.value;
  }

  onProgress?.(50, 'Yerel göz teması düzeltme...');
  const { correctEyeContact } = await import('./eyeContact.js');
  const result = await correctEyeContact(inputVideo, outputVideo);
  onProgress?.(100, 'Göz teması düzeltildi');

  return { outputPath: result.processedVideoPath, usedColab: false, durationMs: Date.now() - startTime };
}
