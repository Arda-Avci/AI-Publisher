import { z } from 'zod';
import { generateObject } from 'ai';
import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { Logger } from '../lib/logger.js';
import { getVideoDuration } from './videoService.js';
import path from 'path';
import fs from 'fs-extra';

export const ConsistencyReportSchema = z.object({
  passed: z.boolean(),
  globalConsistencyScore: z.number().min(0).max(100),
  characterConsistency: z.array(
    z.object({
      characterName: z.string(),
      appearsInScenes: z.array(z.number()),
      consistencyScore: z.number().min(0).max(100),
      issues: z.array(z.string()),
    }),
  ),
  settingConsistency: z.array(
    z.object({
      setting: z.string(),
      appearsInScenes: z.array(z.number()),
      consistencyScore: z.number().min(0).max(100),
      issues: z.array(z.string()),
    }),
  ),
  recommendations: z.array(z.string()),
});

export type ConsistencyReport = z.infer<typeof ConsistencyReportSchema>;

export async function validateSceneConsistency(
  scenes: Array<{
    sceneNumber: number;
    videoPrompt: string;
    speechText?: string;
    settingDescription?: string;
    charactersInScene?: string[];
  }>,
): Promise<ConsistencyReport> {
  const models = getAIModelChain();

  const sceneTable = scenes
    .map(
      (s) =>
        `Sahne ${s.sceneNumber} | "${s.videoPrompt.slice(0, 80)}" | Karakterler: ${(s.charactersInScene || []).join(', ')} | Ortam: ${s.settingDescription || 'belirtilmemiş'}`,
    )
    .join('\n');

  const result = await withFallbackAndRetry(
    (model) => {
      const prompt = `Sen bir MLLM (Multi-modal Large Language Model) video tutarlılık uzmanısın.

Sahneler:
${sceneTable}

Görevlerin:
1. Her karakterin tüm sahnelerde tutarlı görünüp görünmediğini kontrol et
2. Mekan/ortam tutarlılığını değerlendir
3. Karakterlerin sahneler arası geçişlerde kaybolup kaybolmadığını kontrol et
4. Global tutarlılık skoru ver (0-100)
5. Varsa tutarsızlıklar için öneriler sun

Kurallar:
- Bir karakter bir sahnede varsa, mantıklı bir şekilde çıkış yapmış olmalı
- Mekan değişiklikleri anlamlı olmalı
- Görsel prompt'lardaki stil/ton tutarlı olmalı`;

      return generateObject({
        model,
        schema: ConsistencyReportSchema,
        abortSignal: AbortSignal.timeout(45000),
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

export async function validateFinalVideo(
  videoPath: string,
  jobId: number,
  expectedScenes: number,
): Promise<{
  passed: boolean;
  duration: number;
  expectedDuration: number;
  issues: string[];
}> {
  const issues: string[] = [];

  if (!(await fs.pathExists(videoPath))) {
    return {
      passed: false,
      duration: 0,
      expectedDuration: expectedScenes * 6,
      issues: ['Video dosyası bulunamadı'],
    };
  }

  const stat = await fs.stat(videoPath);
  if (stat.size < 1024) {
    issues.push('Video dosyası çok küçük (< 1KB)');
  }

  let duration = 0;
  try {
    duration = await getVideoDuration(videoPath);
  } catch {
    issues.push('Video süresi okunamadı');
  }

  const expectedDuration = expectedScenes * 6;
  const minDuration = expectedDuration * 0.7;
  const maxDuration = expectedDuration * 1.3;

  if (duration < minDuration) {
    issues.push(
      `Video süresi beklenenden kısa: ${duration.toFixed(1)}s (beklenen: ~${expectedDuration}s)`,
    );
  } else if (duration > maxDuration) {
    issues.push(
      `Video süresi beklenenden uzun: ${duration.toFixed(1)}s (beklenen: ~${expectedDuration}s)`,
    );
  }

  Logger.info(
    `[MLLM] Final video validation: ${videoPath}, ${duration.toFixed(1)}s/${expectedDuration}s, ${issues.length} issues`,
  );

  return {
    passed: issues.length === 0,
    duration,
    expectedDuration,
    issues,
  };
}
