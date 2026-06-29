import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { z } from 'zod';
import { generateObject } from 'ai';
import { Logger } from '../lib/logger.js';
import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { PodcastScriptSchema } from './aiService.js';
import { synthesizeKokoro } from './kokoroTts.js';
import { runFFmpeg } from './videoService.js';

export interface PodcastGenerateInput {
  prompt: string;
  characters?: string;
  voice?: string;
}

export interface PodcastGenerateResult {
  podcastTitle: string;
  episodes: z.infer<typeof PodcastScriptSchema>['episodes'];
  audioPath: string;
  downloadUrl: string;
}

const TMP_DIR = path.join(os.tmpdir(), 'ai-publisher-podcast');

export async function generatePodcastScript(
  topic: string,
  characters: string,
): Promise<z.infer<typeof PodcastScriptSchema>> {
  const models = getAIModelChain();

  const prompt = `Sen profesyonel bir podcast ve talk-show yapımcısısın.
Konu: ${topic}
Katılımcı Personalar / Karakterler: ${characters}

Görevlerin:
1. Bu konu etrafında, personaların karakter özelliklerine ve ses tonlarına uygun olarak akıcı ve tartışmalı bir diyalog (script) oluştur.
2. Diyalogları ardışık konuşma blokları halinde tasarla (her blok maksimum 6 saniye sürecek şekilde ayarlanmalı).
3. Konuşmaların arasına ve arkasına uygun ses efektleri (sfxPrompt) yerleştir.
4. Çıktıyı tamamen Türkçe olarak, Zod şemasına uygun biçimde üret.`;

  const result = await withFallbackAndRetry(
    (model) => {
      return generateObject({
        model,
        schema: PodcastScriptSchema,
        abortSignal: AbortSignal.timeout(60000),
        prompt,
      });
    },
    models,
    2,
    2000,
    true,
  );

  return result.object;
}

export async function generatePodcastAudio(
  input: PodcastGenerateInput,
): Promise<PodcastGenerateResult> {
  const { prompt, characters = 'Tek anlatıcı (narrator)', voice = 'af_bella' } = input;

  await fs.ensureDir(TMP_DIR);

  Logger.info('[Podcast] Generating script...');
  const script = await generatePodcastScript(prompt, characters);

  Logger.info(`[Podcast] Script generated: "${script.podcastTitle}" (${script.episodes.length} episodes)`);

  const segmentPaths: string[] = [];

  for (let i = 0; i < script.episodes.length; i++) {
    const ep = script.episodes[i];
    if (!ep) continue;
    const segPath = path.join(TMP_DIR, `episode_${String(i).padStart(3, '0')}.wav`);

    Logger.info(`[Podcast] TTS episode ${i + 1}/${script.episodes.length}: "${ep.text.slice(0, 50)}..."`);
    try {
      await synthesizeKokoro(
        { text: ep.text, voice: voice || 'af_bella', speed: 1.0 },
        segPath,
      );
      segmentPaths.push(segPath);

      if (ep.sfxPrompt && ep.sfxPrompt !== 'none') {
        Logger.info(`[Podcast] SFX requested: "${ep.sfxPrompt}" (placeholder — FFmpeg tone)`);
      }
    } catch (err: any) {
      Logger.warn(`[Podcast] TTS failed for episode ${i}, skipping: ${err.message}`);
    }
  }

  if (segmentPaths.length === 0) {
    throw new Error('Podcast generation failed: no TTS segments produced');
  }

  const outputFilename = `podcast_${Date.now()}.wav`;
  const outputDir = path.join(process.cwd(), 'uploads');
  await fs.ensureDir(outputDir);
  const outputPath = path.join(outputDir, outputFilename);

  Logger.info(`[Podcast] Concatenating ${segmentPaths.length} audio segments...`);

  if (segmentPaths.length === 1) {
    await fs.copy(segmentPaths[0]!, outputPath);
  } else {
    const concatListPath = path.join(TMP_DIR, `concat_${Date.now()}.txt`);
    const content = segmentPaths
      .map((p) => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');
    await fs.writeFile(concatListPath, content);

    await runFFmpeg('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c', 'copy',
      outputPath,
    ], 60000);
  }

  Logger.info(`[Podcast] Output: ${outputPath}`);

  return {
    podcastTitle: script.podcastTitle,
    episodes: script.episodes,
    audioPath: outputPath,
    downloadUrl: `/uploads/${outputFilename}`,
  };
}
