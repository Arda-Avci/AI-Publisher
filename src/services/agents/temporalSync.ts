import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { Logger } from '../../lib/logger.js';
import { TIMEOUT } from '../../constants.js';

export interface TemporalEvent {
  sceneNumber: number;
  timeJumpDetected: boolean;
  timeJumpDuration: string; // e.g., "10 years later", "next morning", "none"
  temporalType: 'linear' | 'flashback' | 'flashforward' | 'time_loop' | 'ellipsis';
  requiresTransitionShot: boolean;
  transitionShotPrompt?: string; // Prompt for visual transition (e.g. spinning clock, calendar pages)
  timeOfDayAdjustment?: string; // Photographic time of day description to inject
  colorGradeHint?: string; // e.g. "sepia for flashback", "cool blue for night"
}

export interface TemporalPlan {
  events: TemporalEvent[];
  timelineExplanation: string;
}

const TemporalPlanSchema = z.object({
  events: z.array(
    z.object({
      sceneNumber: z.number(),
      timeJumpDetected: z.boolean(),
      timeJumpDuration: z.string(),
      temporalType: z.enum(['linear', 'flashback', 'flashforward', 'time_loop', 'ellipsis']),
      requiresTransitionShot: z.boolean(),
      transitionShotPrompt: z.string().optional(),
      timeOfDayAdjustment: z.string().optional(),
      colorGradeHint: z.string().optional(),
    }),
  ),
  timelineExplanation: z.string(),
});

export async function analyzeTemporalSync(
  scenes: { sceneNumber: number; location: string; timeOfDay: string; summary: string }[],
): Promise<TemporalPlan> {
  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: TemporalPlanSchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt: `You are an expert Hollywood Film Editor and Narrative Continuity Director.
Your task is to analyze the timeline and temporal transitions of the following scenes.

Scenes (in order):
${scenes.map((s) => `Scene ${s.sceneNumber}: Location: "${s.location}", Time of Day: "${s.timeOfDay}", Summary: "${s.summary}"`).join('\n')}

For each scene, analyze:
1. Is there a time jump or non-linear transition (flashback, flashforward, ellipsis) from the previous scene?
2. If a time jump is detected, how long is it? (e.g., "next morning", "10 years later", "3 hours later")
3. What is the temporal type?
   - 'linear': Direct continuation in time.
   - 'flashback': Reliving a past event.
   - 'flashforward': Peeking into a future event.
   - 'time_loop': Repeating the same timeline.
   - 'ellipsis': A significant jump forward in time without showing the intermediate events.
4. Does this transition require a special visual transition shot? (e.g., spinning clock, seasons changing, calendar leaves falling, zoom into photo). If so, provide a visual prompt for a video generator.
5. Provide a photographic 'timeOfDayAdjustment' prompt additions (e.g., "Warm afternoon light, long shadows", "Moonlight pouring through window, dark blue hues").
6. Provide a 'colorGradeHint' matching the mood/time (e.g., "Warm golden tones", "Desaturated cold colors", "Vintage sepia for flashback").

Output:
- events: Array of TemporalEvent (one for each scene in the list)
- timelineExplanation: A brief one-sentence overview explaining the story's timeline structure.`,
      }),
    models,
    2,
    5000,
    true,
  );

  Logger.info('[TemporalSync] Temporal analysis completed:', {
    explanation: result.object.timelineExplanation.slice(0, 100),
    eventsCount: result.object.events.length,
  });

  return {
    events: result.object.events as TemporalEvent[],
    timelineExplanation: result.object.timelineExplanation,
  };
}
