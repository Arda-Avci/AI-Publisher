import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { Logger } from '../../lib/logger.js';

export interface EditingScore {
  emotion: number;
  story: number;
  rhythm: number;
  eyeTrace: number;
  planarity: number;
  spatialContinuity: number;
  total: number;
  suggestions: string[];
}

const EditingSchema = z.object({
  scores: z.object({
    emotion: z.number().min(0).max(100),
    story: z.number().min(0).max(100),
    rhythm: z.number().min(0).max(100),
    eyeTrace: z.number().min(0).max(100),
    planarity: z.number().min(0).max(100),
    spatialContinuity: z.number().min(0).max(100),
  }),
  suggestions: z.array(z.string()),
  overallFeedback: z.string(),
});

export async function runEditingTheoryCheck(
  prevScene: string,
  nextScene: string,
): Promise<EditingScore> {
  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: EditingSchema,
        abortSignal: AbortSignal.timeout(30000),
        prompt: `You are a professional film editor applying Walter Murch's Rule of Six.

Between these two consecutive scenes, evaluate the transition using Murch's weighted criteria:

Previous scene: "${prevScene}"
Next scene: "${nextScene}"

Walter Murch's Rule of Six weights:
- Emotion (51%) — Does the cut serve the emotional truth of the moment?
- Story (23%) — Does it advance the narrative?
- Rhythm (10%) — Does it occur at the right moment musically/rhythmically?
- Eye-trace (7%) — Does it respect the audience's focus point?
- Planarity (2D平面) (5%) — Does it respect the 180-degree rule?
- Spatial Continuity (3D空间) (4%) — Is the physical space consistent?

Score each criterion 0-100. Provide specific suggestions if any score is below 60.
Return overall feedback on transition quality.`,
      }),
    models,
    2,
    5000,
    true,
  );

  const s = result.object.scores;
  const total = s.emotion * 0.51 + s.story * 0.23 + s.rhythm * 0.10 + s.eyeTrace * 0.07 + s.planarity * 0.05 + s.spatialContinuity * 0.04;

  Logger.info('[EditingTheory] Murch Rule of Six score:', {
    total: Math.round(total),
    emotion: s.emotion,
    story: s.story,
    rhythm: s.rhythm,
  });

  return {
    emotion: s.emotion,
    story: s.story,
    rhythm: s.rhythm,
    eyeTrace: s.eyeTrace,
    planarity: s.planarity,
    spatialContinuity: s.spatialContinuity,
    total: Math.round(total),
    suggestions: result.object.suggestions,
  };
}
