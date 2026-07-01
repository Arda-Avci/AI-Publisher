import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { Logger } from '../../lib/logger.js';
import { TIMEOUT } from '../../constants.js';

export type NarrativeDevice =
  | 'false_protagonist'
  | 'frame_story'
  | 'breaking_fourth_wall'
  | 'stream_of_consciousness'
  | 'unreliable_narrator'
  | 'rashomon_effect'
  | 'macguffin'
  | 'red_herring'
  | 'dramatic_irony'
  | 'cliffhanger';

export interface NarrativeSuggestion {
  device: NarrativeDevice;
  description: string;
  integrationNotes: string[];
  scenePlacement: number[];
  impact: string;
}

const NarrativeSchema = z.object({
  device: z.enum([
    'false_protagonist',
    'frame_story',
    'breaking_fourth_wall',
    'stream_of_consciousness',
    'unreliable_narrator',
    'rashomon_effect',
    'macguffin',
    'red_herring',
    'dramatic_irony',
    'cliffhanger',
  ]),
  description: z.string(),
  integrationNotes: z.array(z.string()),
  scenePlacement: z.array(z.number()),
  impact: z.string(),
});

const DEVICE_EXPLANATIONS: Record<NarrativeDevice, string> = {
  false_protagonist: 'A character who appears to be the protagonist but is killed or revealed otherwise (Psycho, Game of Thrones)',
  frame_story: 'A story within a story, with an outer narrative wrapping the main tale (The Princess Bride, Titanic)',
  breaking_fourth_wall: 'Character directly addresses the audience/camera (Deadpool, House of Cards, Fleabag)',
  stream_of_consciousness: 'Continuous flow of character thoughts, feelings, and perceptions (The Hours, The Diving Bell and the Butterfly)',
  unreliable_narrator: 'Narrator whose credibility is compromised, forcing audience to question the story (Fight Club, The Usual Suspects)',
  rashomon_effect: 'Same event shown from multiple contradictory perspectives (Rashomon, Gone Girl)',
  macguffin: 'An object or goal that drives the plot but is ultimately unimportant (Pulp Fiction briefcase, Ark of the Covenant)',
  red_herring: 'A misleading clue designed to divert audience from the true solution (Scooby-Doo, Knives Out)',
  dramatic_irony: 'Audience knows something the characters do not (Romeo and Juliet, The Godfather baptism scene)',
  cliffhanger: 'An abrupt ending at a critical moment, leaving the audience in suspense (Inception top, The Empire Strikes Back)',
};

export async function suggestNarrativeDevice(
  storySynopsis: string,
  preferredDevice?: NarrativeDevice,
): Promise<NarrativeSuggestion> {
  const device = preferredDevice || 'dramatic_irony';
  const deviceExplanation = DEVICE_EXPLANATIONS[device];
  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: NarrativeSchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt: `You are a master screenwriter specializing in narrative devices.

Apply the "${device}" device to this story:

Story: "${storySynopsis}"

Device explanation: ${deviceExplanation}

Output:
- device: the chosen device
- description: How this device is implemented in this specific story (2-3 sentences)
- integrationNotes: 2-4 specific ways to weave this device into the narrative
- scenePlacement: Scene indices where this device should appear (1-based)
- impact: What emotional/psychological effect this creates for the audience`,
      }),
    models,
    2,
    5000,
    true,
  );

  Logger.info('[NarrativeDevice] Applied:', { device, story: storySynopsis.slice(0, 60) });

  return {
    device: result.object.device as NarrativeDevice,
    description: result.object.description,
    integrationNotes: result.object.integrationNotes,
    scenePlacement: result.object.scenePlacement,
    impact: result.object.impact,
  };
}
