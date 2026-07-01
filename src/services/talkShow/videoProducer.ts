/**
 * Talk Show Video Producer
 * Sportoto discussion verisini alır, TTS + FFmpeg ile video üretir.
 */

import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../../lib/logger.js';
import { runFFmpeg, getVideoDuration } from '../videoService.js';
import { dockerHost } from '../../lib/docker-host.js';
import type { SportotoDiscussion } from './discussionSource.js';
import { DIRECTORIES } from '../../constants.js';

const SPEAKER_COLORS: Record<string, string> = {
  Moderator: '#F59E0B',
  Yorumcu: '#06B6D4',
  Futbolcu: '#10B981',
  Kumarbaz: '#F43F5E',
  TeknikDirektor: '#60A5FA',
};

/**
 * Talk show video üretir:
 * 1. Her utterance için Docker TTS ile ses sentezle
 * 2. Her utterance için görsel bir scene oluştur (speaker adı + metin)
 * 3. Tüm scene'leri birleştir
 */
export async function produceTalkShowVideo(
  discussion: SportotoDiscussion,
  outputPath: string,
  _options: { backgroundVideo?: string } = {},
): Promise<string> {
  const workDir = path.join(
    process.cwd(),
    DIRECTORIES.VIDEO_OUTPUT,
    `talkshow_${discussion.sportoto_week}_${Date.now()}`,
  );
  await fs.ensureDir(workDir);

  Logger.info(
    `[TalkShowProducer] Producing video for week ${discussion.sportoto_week} (${discussion.utterances.length} scenes)`,
  );

  const scenePaths: string[] = [];
  const xttsUrl = dockerHost.getUrl('xtts');

  for (let i = 0; i < discussion.utterances.length; i++) {
    const u = discussion.utterances[i];
    if (!u) continue;
    const scenePath = path.join(workDir, `scene_${String(i).padStart(3, '0')}.mp4`);
    const audioPath = path.join(workDir, `audio_${String(i).padStart(3, '0')}.wav`);
    const speakerColor = SPEAKER_COLORS[u.speaker] || '#FFFFFF';

    try {
      // 1. TTS ile ses sentezle (Docker XTTS)
      const ttsResponse = await fetch(`${xttsUrl}/generate-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'xtts',
          text: u.text,
          voice:
            u.speaker === 'Moderator' || u.speaker === 'Futbolcu' || u.speaker === 'TeknikDirektor'
              ? 'tr-TR-AhmetNeural'
              : 'tr-TR-EmelNeural',
          language: 'tr',
          task_id: `talkshow_${discussion.sportoto_week}_${i}`,
        }),
      });

      if (ttsResponse.ok) {
        const ttsResult = await ttsResponse.json();
        if (ttsResult.status === 'accepted' && ttsResult.task_id) {
          await pollDockerTask(ttsResult.task_id);
          const speechResp = await fetch(`${xttsUrl}/download/speech`);
          if (speechResp.ok) {
            const audioBuffer = Buffer.from(await speechResp.arrayBuffer());
            await fs.writeFile(audioPath, audioBuffer);
          }
        }
      }

      // Fallback: if TTS failed, use FFmpeg silent audio with correct duration
      if (!(await fs.pathExists(audioPath))) {
        const wordCount = u.text.split(/\s+/).length;
        const duration = Math.max(2, Math.ceil((wordCount / 150) * 60));
        await runFFmpeg('ffmpeg', [
          '-y',
          '-f',
          'lavfi',
          '-i',
          `anullsrc=r=44100:cl=mono`,
          '-t',
          String(duration),
          audioPath,
        ]);
      }

      // 2. Get audio duration
      let audioDuration = 5;
      try {
        audioDuration = await getVideoDuration(audioPath);
      } catch {}

      // 3. Create visual scene with speaker name + text
      const bgColor = speakerColor;
      const textColor = '#FFFFFF';
      const fontSize = Math.min(28, Math.max(18, Math.round(1080 / 40)));

      await runFFmpeg('ffmpeg', [
        '-y',
        '-f',
        'lavfi',
        '-i',
        `color=c=#05070B:s=1920x1080:d=${audioDuration}:r=30`,
        '-i',
        audioPath,
        '-filter_complex',
        `[0:v]drawtext=text='${u.speaker}':fontcolor=${bgColor}:fontsize=36:x=(w-text_w)/2:y=h*0.15:fontfile='C\\:/Windows/Fonts/arial.ttf':box=1:boxcolor=black@0.4:boxborderw=8,` +
          `drawtext=text='${escapeDrawtext(u.text.substring(0, 280))}':fontcolor=${textColor}:fontsize=${fontSize}:` +
          `x=(w-text_w)/2:y=h*0.35:fontfile='C\\:/Windows/Fonts/arial.ttf':box=1:boxcolor=black@0.3:boxborderw=12` +
          `:text_width=w*0.85:line_spacing=8` +
          `[out]`,
        '-map',
        '[out]',
        '-map',
        '1:a',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-shortest',
        scenePath,
      ]);

      scenePaths.push(scenePath);
      Logger.info(
        `[TalkShowProducer] Scene ${i + 1}/${discussion.utterances.length} created: "${u.speaker}"`,
      );
    } catch (err) {
      Logger.warn(`[TalkShowProducer] Scene ${i} failed, skipping:`, err);
    }
  }

  // 4. Concatenate all scenes
  if (scenePaths.length === 0) {
    throw new Error('Hiçbir scene üretilemedi');
  }

  const concatList = path.join(workDir, 'concat.txt');
  const concatContent = scenePaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  await fs.writeFile(concatList, concatContent, 'utf-8');

  await runFFmpeg('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatList,
    '-c',
    'copy',
    outputPath,
  ]);

  // Cleanup temp dir
  await fs.remove(workDir).catch(() => {});

  Logger.info(`[TalkShowProducer] Video produced: ${outputPath} (${scenePaths.length} scenes)`);
  return outputPath;
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/:/g, '\\:')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, ' ')
    .substring(0, 280);
}

async function pollDockerTask(taskId: string, maxAttempts = 30): Promise<void> {
  const xttsUrl = dockerHost.getUrl('xtts');
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const resp = await fetch(`${xttsUrl}/status/${taskId}`);
      const data = await resp.json();
      if (data.status === 'success' || data.stage === 'done') return;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  Logger.warn(`[TalkShowProducer] Docker task ${taskId} timed out`);
}
