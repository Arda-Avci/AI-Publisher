import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { Logger } from '../../lib/logger.js';
import { TIMEOUT } from '../../constants.js';

export interface PostProductionPlan {
  roughCut: {
    sceneOrder: string[];
    transitionNotes: string[];
    tempAudioTracks: string[];
  };
  fineCut: {
    trimAdjustments: { sceneIndex: number; newDurationSec: number; reason: string }[];
    pacingNotes: string[];
    transitionRefinements: { at: number; technique: string; description: string }[];
  };
  pictureLock: {
    finalDurationSec: number;
    masterTimeline: { sceneIndex: number; startTimeSec: number; endTimeSec: number }[];
    colorGradeDirection: string;
    soundMixNotes: string[];
    vfxNotes: string[];
    deliveryFormat: string;
  };
  recommendations: string[];
}

const SceneAnalysisSchema = z.object({
  scenes: z.array(z.object({
    index: z.number(),
    summary: z.string(),
    idealDurationSec: z.number(),
    pacingLabel: z.enum(['slow', 'medium', 'fast']),
    emotionalArc: z.enum(['rising', 'falling', 'plateau', 'climax']),
  })),
});

const PostProductionSchema = z.object({
  rough: z.object({
    sceneOrder: z.array(z.number()),
    transitionNotes: z.array(z.string()),
    tempAudioSuggestions: z.array(z.string()),
    structuralNotes: z.array(z.string()),
  }),
  fine: z.object({
    trimAdjustments: z.array(z.object({
      sceneIndex: z.number(),
      newDurationSec: z.number(),
      reason: z.string(),
    })),
    pacingNotes: z.array(z.string()),
    transitionRefinements: z.array(z.object({
      at: z.number(),
      technique: z.string(),
      description: z.string(),
    })),
  }),
  pictureLock: z.object({
    colorGradeDirection: z.string(),
    soundMixNotes: z.array(z.string()),
    vfxNotes: z.array(z.string()),
    deliveryFormat: z.string(),
  }),
  recommendations: z.array(z.string()),
});

export async function createPostProductionPlan(
  sceneDescriptions: string[],
  narrativeDevice?: string,
  timeStructure?: string,
  auteurStyle?: string,
): Promise<PostProductionPlan> {
  const models = getAIModelChain();

  const sceneResult = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: SceneAnalysisSchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt: `Analyze these ${sceneDescriptions.length} scenes for post-production planning.
For each scene provide: index, summary, idealDurationSec, pacingLabel (slow/medium/fast), emotionalArc (rising/falling/plateau/climax).

Scenes:
${sceneDescriptions.map((s, i) => `[${i + 1}] ${s}`).join('\n')}`,
      }),
    models,
    2,
    5000,
    true,
  );

  const scenes = sceneResult.object.scenes;
  const totalIdealDuration = scenes.reduce((sum, s) => sum + s.idealDurationSec, 0);

  const ppResult = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: PostProductionSchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt: `You are a professional post-production supervisor planning the edit pipeline: Rough Cut → Fine Cut → Picture Lock.

${auteurStyle ? `Director's style: ${auteurStyle}` : ''}
${narrativeDevice ? `Narrative device: ${narrativeDevice}` : ''}
${timeStructure ? `Time structure: ${timeStructure}` : ''}

Scenes (${scenes.length} total, ~${Math.round(totalIdealDuration / 60)}min):
${scenes.map(s => `[${s.index}] ${s.summary} (${s.idealDurationSec}s, ${s.pacingLabel}, ${s.emotionalArc})`).join('\n')}

ROUGH CUT:
- Reorder scenes by index (array of numbers) for best narrative flow
- Transition notes for each edit point
- Suggest temp audio tracks (music beds, ambiences)
- Structural notes: what's missing, what to trim

FINE CUT:
- Trim adjustments: where to tighten/loosen each scene
- Pacing notes: rhythm, breath, audience fatigue
- Transition refinements: at which scene boundary, what technique (J-cut, L-cut, smash cut, dissolve, fade, invisible cut)

PICTURE LOCK:
- Color grade direction: one paragraph describing the look
- Sound mix notes: dialogue layer, ambience, foley, score
- VFX notes: compositing, cleanup, title cards
- Delivery format: e.g. "4K DCI 24fps ProRes 422 HQ"

RECOMMENDATIONS:
- 3-5 actionable recommendations for post-production`,
      }),
    models,
    2,
    5000,
    true,
  );

  const pp = ppResult.object;
  const timeline = buildTimeline(scenes, pp.fine.trimAdjustments);

  Logger.info('[PostProduction] Plan created:', {
    scenes: scenes.length,
    roughAdjustments: pp.rough.structuralNotes.length,
    fineTrims: pp.fine.trimAdjustments.length,
    recommendations: pp.recommendations.length,
  });

  return {
    roughCut: {
      sceneOrder: pp.rough.sceneOrder.map(i => sceneDescriptions[i - 1] ?? `scene_${i}`),
      transitionNotes: pp.rough.transitionNotes,
      tempAudioTracks: pp.rough.tempAudioSuggestions,
    },
    fineCut: {
      trimAdjustments: pp.fine.trimAdjustments,
      pacingNotes: pp.fine.pacingNotes,
      transitionRefinements: pp.fine.transitionRefinements,
    },
    pictureLock: {
      finalDurationSec: totalIdealDuration,
      masterTimeline: timeline,
      colorGradeDirection: pp.pictureLock.colorGradeDirection,
      soundMixNotes: pp.pictureLock.soundMixNotes,
      vfxNotes: pp.pictureLock.vfxNotes,
      deliveryFormat: pp.pictureLock.deliveryFormat,
    },
    recommendations: pp.recommendations,
  };
}

function buildTimeline(
  scenes: { index: number; idealDurationSec: number }[],
  trims: { sceneIndex: number; newDurationSec: number }[],
): { sceneIndex: number; startTimeSec: number; endTimeSec: number }[] {
  const timeline: { sceneIndex: number; startTimeSec: number; endTimeSec: number }[] = [];
  let cursor = 0;

  for (const scene of scenes) {
    const trim = trims.find(t => t.sceneIndex === scene.index);
    const duration = trim ? trim.newDurationSec : scene.idealDurationSec;
    timeline.push({ sceneIndex: scene.index, startTimeSec: cursor, endTimeSec: cursor + duration });
    cursor += duration;
  }

  return timeline;
}
