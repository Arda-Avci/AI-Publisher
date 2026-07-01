import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { Logger } from '../../lib/logger.js';
import { TIMEOUT } from '../../constants.js';

export interface SoundDesignPlan {
  adr: ADRLine[];
  foley: FoleyEffect[];
  roomTones: RoomTone[];
  soundBridges: SoundBridge[];
  scoreDirection: string;
  mixNotes: string[];
}

export interface ADRLine {
  sceneIndex: number;
  characterName: string;
  originalLine: string;
  reason: string;
  suggestedRecordingNote: string;
}

export interface FoleyEffect {
  sceneIndex: number;
  timestampSec: number;
  effect: string;
  description: string;
}

export interface RoomTone {
  sceneIndex: number;
  environmentType: string;
  durationSec: number;
  notes: string;
}

export interface SoundBridge {
  fromSceneIndex: number;
  toSceneIndex: number;
  bridgeType: 'audio_lead' | 'dialogue_overlap' | 'music_sweep';
  description: string;
}

const SoundDesignSchema = z.object({
  adr: z.array(z.object({
    sceneIndex: z.number(),
    characterName: z.string(),
    originalLine: z.string(),
    reason: z.string(),
    suggestedRecordingNote: z.string(),
  })),
  foley: z.array(z.object({
    sceneIndex: z.number(),
    timestampSec: z.number(),
    effect: z.string(),
    description: z.string(),
  })),
  roomTones: z.array(z.object({
    sceneIndex: z.number(),
    environmentType: z.string(),
    durationSec: z.number(),
    notes: z.string(),
  })),
  soundBridges: z.array(z.object({
    fromSceneIndex: z.number(),
    toSceneIndex: z.number(),
    bridgeType: z.enum(['audio_lead', 'dialogue_overlap', 'music_sweep']),
    description: z.string(),
  })),
  scoreDirection: z.string(),
  mixNotes: z.array(z.string()),
});

export async function planSoundDesign(
  sceneDescriptions: string[],
  trimAdjustments?: { sceneIndex: number; newDurationSec: number; reason: string }[],
): Promise<SoundDesignPlan> {
  const models = getAIModelChain();

  const durations = sceneDescriptions.map((_, i) => {
    const trim = trimAdjustments?.find(t => t.sceneIndex === i + 1);
    return trim ? trim.newDurationSec : 10;
  });

  const sceneBlocks = sceneDescriptions.map((desc, i) =>
    `[Scene ${i + 1}] (${durations[i]}s) ${desc}`
  ).join('\n');

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: SoundDesignSchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt: `You are a professional sound designer for film post-production. Analyze these scenes and plan:

1. **ADR (Automated Dialogue Replacement)** — Which lines need re-recording due to noise, performance, or clarity?
2. **Foley** — What everyday sound effects need to be performed in sync (footsteps, cloth rustle, door close, glass clink)?
3. **Room Tone** — What ambient background tone is needed per environment (forest, office, stadium, cathedral)?
4. **Sound Bridges** — How to smooth transitions (audio leading into next scene, dialogue overlap, music sweep across cut)?
5. **Score Direction** — One paragraph describing music style, tempo, instrumentation
6. **Mix Notes** — Mixing priorities (dialogue clarity, dynamic range, bass management)

Scenes:
${sceneBlocks}`,
      }),
    models,
    2,
    5000,
    true,
  );

  const sd = result.object;
  Logger.info('[SoundDesign] Plan created:', {
    adr: sd.adr.length,
    foley: sd.foley.length,
    roomTones: sd.roomTones.length,
    soundBridges: sd.soundBridges.length,
  });

  return {
    adr: sd.adr,
    foley: sd.foley,
    roomTones: sd.roomTones,
    soundBridges: sd.soundBridges,
    scoreDirection: sd.scoreDirection,
    mixNotes: sd.mixNotes,
  };
}
