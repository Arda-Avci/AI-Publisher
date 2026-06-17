import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import { colab } from '../lib/colab-manager.js';
import { Logger } from '../lib/logger.js';

export interface MuseTalkOptions {
  faceImagePath: string;
  audioPath: string;
  bbox?: string;
}

export interface MuseTalkResult {
  outputPath: string;
  success: boolean;
}

export async function generateTalkingHead(
  options: MuseTalkOptions,
  outputVideo?: string,
): Promise<MuseTalkResult> {
  const colabUrl = colab.getState().ngrokUrl;
  if (!colabUrl) {
    throw new Error('MuseTalk için Colab bağlantısı gerekli');
  }

  const facePath = options.faceImagePath;
  const audioPath = options.audioPath;

  if (!(await fs.pathExists(facePath))) {
    throw new Error(`Yüz görseli bulunamadı: ${facePath}`);
  }
  if (!(await fs.pathExists(audioPath))) {
    throw new Error(`Ses dosyası bulunamadı: ${audioPath}`);
  }

  const outPath = outputVideo || path.join(process.cwd(), 'videolar', `musetalk_${Date.now()}.mp4`);

  const faceBuffer = await fs.readFile(facePath);
  const audioBuffer = await fs.readFile(audioPath);

  const formData = new FormData();
  formData.append('face', new Blob([faceBuffer], { type: 'image/jpeg' }), path.basename(facePath));
  formData.append(
    'audio',
    new Blob([audioBuffer], { type: 'audio/wav' }),
    path.basename(audioPath),
  );
  if (options.bbox) {
    formData.append('bbox', options.bbox);
  }

  Logger.info('[MuseTalk] Generating talking head video...', { facePath, audioPath });

  try {
    const response = await axios.post(`${colabUrl}/api/v1/musetalk`, formData, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'bypass-tunnel-reminder': 'true',
      },
      responseType: 'arraybuffer',
      timeout: 600000,
    });

    await fs.writeFile(outPath, Buffer.from(response.data));
    Logger.info('[MuseTalk] Talking head video saved', { outPath });

    return { outputPath: outPath, success: true };
  } catch (err: any) {
    Logger.error('[MuseTalk] Generation failed:', err);
    throw new Error(`MuseTalk hatası: ${err.message}`);
  }
}

export async function preloadModel(): Promise<boolean> {
  const colabUrl = colab.getState().ngrokUrl;
  if (!colabUrl) return false;

  try {
    const response = await axios.post(
      `${colabUrl}/api/v1/musetalk/preload`,
      {},
      {
        headers: { 'ngrok-skip-browser-warning': 'true' },
        timeout: 300000,
      },
    );
    return response.data?.status === 'success';
  } catch (err) {
    Logger.warn('[MuseTalk] Preload failed:', err);
    return false;
  }
}

export interface ComboLipSyncResult {
  outputPath: string;
  success: boolean;
}

export async function generateComboLipSync(
  videoPath: string,
  audioPath: string,
  outputVideo?: string,
): Promise<ComboLipSyncResult> {
  const colabUrl = colab.getState().ngrokUrl;
  if (!colabUrl) {
    throw new Error('Combo lip-sync icin Colab baglantisi gerekli');
  }

  const vPath = videoPath;
  const aPath = audioPath;

  if (!(await fs.pathExists(vPath))) {
    throw new Error(`Video dosyasi bulunamadi: ${vPath}`);
  }
  if (!(await fs.pathExists(aPath))) {
    throw new Error(`Ses dosyasi bulunamadi: ${aPath}`);
  }

  const outPath =
    outputVideo || path.join(process.cwd(), 'videolar', `combo_lipsync_${Date.now()}.mp4`);

  const videoBuffer = await fs.readFile(vPath);
  const audioBuffer = await fs.readFile(aPath);

  const formData = new FormData();
  formData.append('video_path', vPath);
  formData.append('audio_path', aPath);

  Logger.info('[ComboLipSync] Starting Wav2Lip + MuseTalk pipeline...', {
    videoPath: vPath,
    audioPath: aPath,
  });

  try {
    const response = await axios.post(`${colabUrl}/api/v1/lipsync/combo`, formData, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'bypass-tunnel-reminder': 'true',
      },
      responseType: 'arraybuffer',
      timeout: 600000,
    });

    await fs.writeFile(outPath, Buffer.from(response.data));
    Logger.info('[ComboLipSync] Combo lip-sync video saved', { outPath });

    return { outputPath: outPath, success: true };
  } catch (err: any) {
    Logger.error('[ComboLipSync] Generation failed:', err);
    throw new Error(`Combo lip-sync hatasi: ${err.message}`);
  }
}
