import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { Logger } from '../../lib/logger.js';

export type TransitionType =
  | 'cut'
  | 'fade'
  | 'dissolve'
  | 'wipe'
  | 'invisible_cut'
  | 'smash_cut'
  | 'j_cut'
  | 'l_cut'
  | 'match_cut'
  | 'whip_pan'
  | 'iris';

export interface Transition {
  fromScene: number;
  toScene: number;
  type: TransitionType;
  durationFrames: number;
  reason: string;
  technicalNote: string;
}

export interface TransitionPlan {
  transitions: Transition[];
  overallRhythm: string;
}

const TransitionSchema = z.object({
  transitions: z.array(
    z.object({
      fromScene: z.number(),
      toScene: z.number(),
      type: z.enum([
        'cut',
        'fade',
        'dissolve',
        'wipe',
        'invisible_cut',
        'smash_cut',
        'j_cut',
        'l_cut',
        'match_cut',
        'whip_pan',
        'iris',
      ]),
      durationFrames: z.number().min(1).max(48),
      reason: z.string(),
      technicalNote: z.string(),
    }),
  ),
  overallRhythm: z.string(),
});

const TRANSITION_GUIDE = {
  invisible_cut: 'Hidden via whip pan, match action, or passing object — audience doesn\'t notice the cut (Children of Men, 1917)',
  smash_cut: 'Abrupt cut from quiet to loud or vice versa for shock value (2001 bone-to-spaceship, The Graduate)',
  j_cut: 'Audio from next scene begins before the video transition (dialogue heard over the previous scene)',
  l_cut: 'Video transitions before the audio from previous scene ends (dialogue continues over new visuals)',
  match_cut: 'Visual match between two scenes — shape, color, or motion continuity (2001 bone-to-spaceship, Lawrence of Arabia match on sun)',
  whip_pan: 'Fast horizontal camera movement creates blur, masking the cut (Wes Anderson signature)',
  iris: 'Circular mask opens/closes to transition (silent film style, The Grand Budapest Hotel)',
};

export async function designTransitions(
  sceneDescriptions: string[],
): Promise<TransitionPlan> {
  const models = getAIModelChain();
  const guideText = Object.entries(TRANSITION_GUIDE)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: TransitionSchema,
        abortSignal: AbortSignal.timeout(30000),
        prompt: `You are a professional film editor designing transitions between scenes.

Scenes (in order):
${sceneDescriptions.map((d, i) => `Scene ${i + 1}: "${d}"`).join('\n')}

Transition guide:
${guideText}

For each adjacent pair (scene 1→2, 2→3, 3→4, ...), choose the best transition type:
- For continuity scenes: use invisible_cut, j_cut, l_cut, or match_cut
- For emotional shifts: use smash_cut or fade
- For stylistic effect: use whip_pan, wipe, or iris

Output:
- transitions: Array of { fromScene, toScene, type, durationFrames (1-48), reason, technicalNote }
- overallRhythm: One sentence describing the rhythm of the scene transitions`,
      }),
    models,
    2,
    5000,
    true,
  );

  Logger.info('[TransitionDesigner] Plan created:', {
    count: result.object.transitions.length,
    rhythm: result.object.overallRhythm.slice(0, 80),
  });

  return {
    transitions: result.object.transitions as Transition[],
    overallRhythm: result.object.overallRhythm,
  };
}
