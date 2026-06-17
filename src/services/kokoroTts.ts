import { Logger } from '../lib/logger.js';
import axios from 'axios';
import path from 'path';
import fs from 'fs-extra';

interface KokoroTtsOptions {
  text: string;
  voice?: string;
  speed?: number;
  lang?: string;
}

export async function synthesizeKokoro(
  options: KokoroTtsOptions,
  outputPath: string,
): Promise<string> {
  const { text, voice = 'af_bella', speed = 1.0, lang } = options;

  try {
    const COLAB_URL = process.env.COLAB_URL;
    if (!COLAB_URL) {
      throw new Error('COLAB_URL not configured');
    }

    const response = await axios.post(`${COLAB_URL}/generate-media`, {
      mode: 'kokoro_tts',
      text,
      voice,
      speed,
      lang: lang || 'auto',
    });

    if (response?.data?.download_url) {
      const audioResp = await axios({
        url: response.data.download_url,
        method: 'GET',
        responseType: 'arraybuffer',
      });
      await fs.writeFile(outputPath, Buffer.from(audioResp.data));
      Logger.info(`[KokoroTTS] Generated via Colab: ${outputPath}`);
      return outputPath;
    }

    throw new Error('No download URL in response');
  } catch (err: any) {
    Logger.warn(`[KokoroTTS] Colab Kokoro failed: ${err.message}`);
    throw err;
  }
}
