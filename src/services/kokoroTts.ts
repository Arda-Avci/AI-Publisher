import { Logger } from '../lib/logger.js';
import axios from 'axios';
import fs from 'fs-extra';
import { dockerHost } from '../lib/docker-host.js';

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
    const kokoroUrl = dockerHost.getUrl('kokorotts');

    const response = await axios.post(`${kokoroUrl}/generate-media`, {
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
      Logger.info(`[KokoroTTS] Generated via Docker: ${outputPath}`);
      return outputPath;
    }

    throw new Error('No download URL in response');
  } catch (err: any) {
    Logger.warn(`[KokoroTTS] Docker Kokoro failed: ${err.message}`);
    throw err;
  }
}
