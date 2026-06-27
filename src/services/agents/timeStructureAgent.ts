import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { Logger } from '../../lib/logger.js';

export type TimeStructure =
  | 'linear'
  | 'non_linear'
  | 'reverse'
  | 'parallel'
  | 'time_loop'
  | 'anthology';

export interface TimeStructureSuggestion {
  structure: TimeStructure;
  sequence: { sceneNumber: number; narrativeTime: string; description: string }[];
  audienceEffect: string;
  justification: string;
}

const TimeStructureSchema = z.object({
  sequence: z.array(
    z.object({
      sceneNumber: z.number(),
      narrativeTime: z.string(),
      description: z.string(),
    }),
  ),
  audienceEffect: z.string(),
  justification: z.string(),
});

const STRUCTURE_DEFINITIONS: Record<TimeStructure, string> = {
  linear: 'Events presented in chronological order — straightforward, easy to follow',
  non_linear: 'Events presented out of chronological order with flashbacks/flash-forwards (Pulp Fiction, Memento, Dunkirk)',
  reverse: 'Story told backwards, each scene reveals the cause of the previous (Memento, Irreversible, The Affair of the Necklace)',
  parallel: 'Two or more storylines happening simultaneously, cross-cut between them (Inception, The Godfather Part II, Cloud Atlas)',
  time_loop: 'Events repeat in a cycle until the protagonist learns a lesson (Groundhog Day, Edge of Tomorrow, Russian Doll)',
  anthology: 'Multiple separate stories connected by a theme or framing device (Pulp Fiction, Babel, Crash, Love Actually)',
};

export async function suggestTimeStructure(
  storySynopsis: string,
  totalScenes: number,
  preferredStructure?: TimeStructure,
): Promise<TimeStructureSuggestion> {
  const structure = preferredStructure || 'linear';
  const structureDef = STRUCTURE_DEFINITIONS[structure];
  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: TimeStructureSchema,
        abortSignal: AbortSignal.timeout(30000),
        prompt: `You are a narrative structure specialist.

Apply the "${structure}" time structure to this story:

Story: "${storySynopsis}"
Total scenes: ${totalScenes}

Structure definition: ${structureDef}

Output:
- sequence: Array of { sceneNumber, narrativeTime (when in the story this scene occurs), description } for each scene. Scene numbers 1-${totalScenes}.
- audienceEffect: How this structure affects the viewing experience
- justification: Why this structure fits this story`,
      }),
    models,
    2,
    5000,
    true,
  );

  Logger.info('[TimeStructure] Applied:', { structure, scenes: totalScenes });

  return {
    structure,
    sequence: result.object.sequence,
    audienceEffect: result.object.audienceEffect,
    justification: result.object.justification,
  };
}
