import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import { dockerHost } from '../lib/docker-host.js';
import { Logger } from '../lib/logger.js';
import { TIMEOUT } from '../constants.js';

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
  dockerUsed: boolean;
  durationMs: number;
}

type ProgressCallback = (percent: number, message: string) => void;

async function tryDocker<T>(
  action: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    if (await dockerHost.isServiceHealthy('stablediffusion')) {
      const result = await fn();
      return { ok: true, value: result };
    }
  } catch (err) {
    Logger.warn(`[aiStudio] Docker ${action} failed, will fallback:`, err);
  }
  return { ok: false };
}

export async function enhanceAudio(
  inputVideo: string,
  outputVideo: string,
  options: StudioSoundOptions = {},
  onProgress?: ProgressCallback,
): Promise<StudioResult> {
  const startTime = Date.now();
  const opts = { denoise: true, equalize: false, deecho: true, levelDb: -3, ...options };

  onProgress?.(10, 'Ses iyileştirme başlıyor...');

  const dockerResult = await tryDocker('studio-sound', async () => {
    const sdUrl = dockerHost.getUrl('stablediffusion');

    const videoBuffer = await fs.readFile(inputVideo);
    const formData = new FormData();
    formData.append(
      'video',
      new Blob([videoBuffer], { type: 'video/mp4' }),
      path.basename(inputVideo),
    );
    formData.append('options', JSON.stringify(opts));

    const response = await axios.post(`${sdUrl}/api/v1/studio/studio-sound`, formData, {
      responseType: 'arraybuffer',
      timeout: TIMEOUT.FFMPEG,
    });

    await fs.writeFile(outputVideo, Buffer.from(response.data));
    return { outputPath: outputVideo, dockerUsed: true, durationMs: Date.now() - startTime };
  });

  if (dockerResult.ok) return dockerResult.value;

  onProgress?.(30, 'Yerel FFmpeg ile ses iyileştirme...');
  const { enhanceAudio: localEnhance } = await import('./studioSound.js');
  await localEnhance(inputVideo, outputVideo, opts);
  onProgress?.(100, 'Ses iyileştirme tamamlandı');

  return { outputPath: outputVideo, dockerUsed: false, durationMs: Date.now() - startTime };
}

export async function enhanceVideoAudio(
  inputVideo: string,
  outputVideo: string,
  options: StudioSoundOptions = {},
  onProgress?: ProgressCallback,
): Promise<StudioResult> {
  const startTime = Date.now();
  const opts = { denoise: true, equalize: false, deecho: true, levelDb: -3, ...options };

  onProgress?.(10, 'Video+Ses iyileştirme başlıyor...');

  const dockerResult = await tryDocker('studio-sound-video', async () => {
    const sdUrl = dockerHost.getUrl('stablediffusion');

    const videoBuffer = await fs.readFile(inputVideo);
    const formData = new FormData();
    formData.append(
      'video',
      new Blob([videoBuffer], { type: 'video/mp4' }),
      path.basename(inputVideo),
    );
    formData.append('options', JSON.stringify(opts));

    const response = await axios.post(`${sdUrl}/api/v1/studio/studio-sound`, formData, {
      responseType: 'arraybuffer',
      timeout: TIMEOUT.FFMPEG,
    });

    await fs.writeFile(outputVideo, Buffer.from(response.data));
    return { outputPath: outputVideo, dockerUsed: true, durationMs: Date.now() - startTime };
  });

  if (dockerResult.ok) return dockerResult.value;

  onProgress?.(30, 'Yerel FFmpeg ile video+sess iyileştirme...');
  const { enhanceVideoAudio: localEnhance } = await import('./studioSound.js');
  await localEnhance(inputVideo, outputVideo, opts);
  onProgress?.(100, 'Video+Ses iyileştirme tamamlandı');

  return { outputPath: outputVideo, dockerUsed: false, durationMs: Date.now() - startTime };
}

export async function smartReframe(
  inputVideo: string,
  outputVideo: string,
  options: SmartReframeOptions = {},
  onProgress?: ProgressCallback,
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

  const dockerResult = await tryDocker('smart-reframe', async () => {
    const sdUrl = dockerHost.getUrl('stablediffusion');

    const videoBuffer = await fs.readFile(inputVideo);
    const formData = new FormData();
    formData.append(
      'video',
      new Blob([videoBuffer], { type: 'video/mp4' }),
      path.basename(inputVideo),
    );
    formData.append('options', JSON.stringify(opts));

    const response = await axios.post(`${sdUrl}/api/v1/studio/smart-reframe`, formData, {
      responseType: 'arraybuffer',
      timeout: TIMEOUT.HEAVY_GEN,
    });

    await fs.writeFile(outputVideo, Buffer.from(response.data));
    return { outputPath: outputVideo, dockerUsed: true, durationMs: Date.now() - startTime };
  });

  if (dockerResult.ok) return dockerResult.value;

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

  return { outputPath: outputVideo, dockerUsed: false, durationMs: Date.now() - startTime };
}

export async function removeBackground(
  inputImage: string,
  outputImage: string,
  onProgress?: ProgressCallback,
): Promise<StudioResult> {
  const startTime = Date.now();
  onProgress?.(10, 'Arka plan kaldırma başlıyor...');

  const dockerResult = await tryDocker('remove-background', async () => {
    const sdUrl = dockerHost.getUrl('stablediffusion');

    const imgBuffer = await fs.readFile(inputImage);
    const formData = new FormData();
    formData.append(
      'image',
      new Blob([imgBuffer], { type: 'image/png' }),
      path.basename(inputImage),
    );

    const response = await axios.post(`${sdUrl}/remove-background`, formData, {
      responseType: 'arraybuffer',
      timeout: TIMEOUT.DOWNLOAD,
    });

    await fs.writeFile(outputImage, Buffer.from(response.data));
    return { outputPath: outputImage, dockerUsed: true, durationMs: Date.now() - startTime };
  });

  if (dockerResult.ok) {
    onProgress?.(100, 'Arka plan kaldırma tamamlandı');
    return dockerResult.value;
  }

  throw new Error('Arka plan kaldırma için Docker bağlantısı gerekli');
}

export async function generateImage(
  prompt: string,
  outputImage: string,
  modelType: string = 'dreamshaper',
  onProgress?: ProgressCallback,
): Promise<StudioResult> {
  const startTime = Date.now();
  onProgress?.(10, 'Görsel üretiliyor...');

  const dockerResult = await tryDocker('generate-image', async () => {
    const sdUrl = dockerHost.getUrl('stablediffusion');

    const response = await axios.post(
      `${sdUrl}/generate-image`,
      { prompt, model_type: modelType },
      {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
        timeout: TIMEOUT.DOWNLOAD,
      },
    );

    await fs.writeFile(outputImage, Buffer.from(response.data));
    return { outputPath: outputImage, dockerUsed: true, durationMs: Date.now() - startTime };
  });

  if (dockerResult.ok) {
    onProgress?.(100, 'Görsel üretildi');
    return dockerResult.value;
  }

  throw new Error('Görsel üretimi için Docker bağlantısı gerekli');
}

export async function inpaintImage(
  inputImage: string,
  maskImage: string,
  prompt: string,
  outputImage: string,
  onProgress?: ProgressCallback,
): Promise<StudioResult> {
  const startTime = Date.now();
  onProgress?.(10, 'Inpaint başlıyor...');

  const dockerResult = await tryDocker('inpaint', async () => {
    const sdUrl = dockerHost.getUrl('stablediffusion');

    const imgBuffer = await fs.readFile(inputImage);
    const maskBuffer = await fs.readFile(maskImage);
    const formData = new FormData();
    formData.append('image', new Blob([imgBuffer], { type: 'image/png' }), 'image.png');
    formData.append('mask', new Blob([maskBuffer], { type: 'image/png' }), 'mask.png');
    formData.append('prompt', prompt);

    const response = await axios.post(`${sdUrl}/inpaint-image`, formData, {
      responseType: 'arraybuffer',
      timeout: TIMEOUT.DOWNLOAD,
    });

    await fs.writeFile(outputImage, Buffer.from(response.data));
    return { outputPath: outputImage, dockerUsed: true, durationMs: Date.now() - startTime };
  });

  if (dockerResult.ok) {
    onProgress?.(100, 'Inpaint tamamlandı');
    return dockerResult.value;
  }

  throw new Error('Inpaint için Docker bağlantısı gerekli');
}

export async function correctGaze(
  inputVideo: string,
  outputVideo: string,
  smooth: boolean = true,
  onProgress?: ProgressCallback,
): Promise<StudioResult> {
  const startTime = Date.now();
  onProgress?.(10, 'Göz teması düzeltiliyor...');

  const dockerResult = await tryDocker('eye-contact', async () => {
    const sdUrl = dockerHost.getUrl('stablediffusion');

    const response = await axios.post(
      `${sdUrl}/api/v1/eye-contact`,
      { video_path: inputVideo, output_path: outputVideo, smooth },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: TIMEOUT.FFMPEG,
      },
    );

    await fs.writeFile(outputVideo, Buffer.from(response.data));
    return { outputPath: outputVideo, dockerUsed: true, durationMs: Date.now() - startTime };
  });

  if (dockerResult.ok) {
    onProgress?.(100, 'Göz teması düzeltildi');
    return dockerResult.value;
  }

  onProgress?.(50, 'Yerel göz teması düzeltme...');
  const { correctEyeContact } = await import('./eyeContact.js');
  const result = await correctEyeContact(inputVideo, outputVideo);
  onProgress?.(100, 'Göz teması düzeltildi');

  return {
    outputPath: result.processedVideoPath,
    dockerUsed: false,
    durationMs: Date.now() - startTime,
  };
}

export async function removeBackgroundNoise(
  inputVideo: string,
  outputVideo: string,
  onProgress?: ProgressCallback,
): Promise<StudioResult> {
  const startTime = Date.now();
  onProgress?.(10, 'Arka plan gürültüsü siliniyor...');

  try {
    const { removeBackgroundNoise: localDenoise } = await import('./studioSound.js');
    await localDenoise(inputVideo, outputVideo);
    onProgress?.(100, 'Arka plan gürültüsü temizlendi');
    return { outputPath: outputVideo, dockerUsed: false, durationMs: Date.now() - startTime };
  } catch (err: any) {
    Logger.error('[aiStudio] removeBackgroundNoise failed', err);
    throw err;
  }
}

export async function removeReverb(
  inputVideo: string,
  outputVideo: string,
  onProgress?: ProgressCallback,
): Promise<StudioResult> {
  const startTime = Date.now();
  onProgress?.(10, 'Yankı temizleme yapılıyor...');

  try {
    const { removeReverb: localDereverb } = await import('./studioSound.js');
    await localDereverb(inputVideo, outputVideo);
    onProgress?.(100, 'Yankı temizlendi');
    return { outputPath: outputVideo, dockerUsed: false, durationMs: Date.now() - startTime };
  } catch (err: any) {
    Logger.error('[aiStudio] removeReverb failed', err);
    throw err;
  }
}
