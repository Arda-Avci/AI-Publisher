import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { isNeo4jConnected, runQuery, runRead } from '../neo4jService.js';
import { Logger } from '../../lib/logger.js';

export interface RelationshipEdge {
  character1: string;
  character2: string;
  affection: number;
  trust: number;
  animosity: number;
  lastUpdateScene: number;
  notes: string;
}

export interface RelationshipBeat {
  suggestedEmotion: string;
  scoreChange: number;
  dialogueHint: string;
  reason: string;
}

const SceneRelationshipSchema = z.object({
  interactions: z.array(
    z.object({
      character1: z.string(),
      character2: z.string(),
      interaction: z.string(),
      affectionDelta: z.number().min(-10).max(10),
      trustDelta: z.number().min(-10).max(10),
      animosityDelta: z.number().min(-10).max(10),
      notes: z.string(),
    }),
  ),
});

export async function analyzeSceneRelationships(
  sceneDescription: string,
  sceneNumber: number,
): Promise<RelationshipEdge[]> {
  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: SceneRelationshipSchema,
        abortSignal: AbortSignal.timeout(20000),
        prompt: `You are a character psychologist analyzing interpersonal dynamics.

Scene ${sceneNumber}: "${sceneDescription}"

For each pair of characters who interact in this scene, analyze how their relationship changes:
- affectionDelta: -10 to +10 (how much their fondness changes)
- trustDelta: -10 to +10 (how much their trust changes)
- animosityDelta: -10 to +10 (how much their hostility changes)

Rules:
1. Slow-burn rule: NO single change can exceed 10 points
2. Changes should feel earned by the interaction
3. Negative affection + positive animosity = conflict escalation
4. Positive affection + positive trust = bonding moment`,
      }),
    models,
    2,
    3000,
    true,
  );

  const relationships: RelationshipEdge[] = [];
  for (const interaction of result.object.interactions) {
    const rel: RelationshipEdge = {
      character1: interaction.character1,
      character2: interaction.character2,
      affection: interaction.affectionDelta,
      trust: interaction.trustDelta,
      animosity: interaction.animosityDelta,
      lastUpdateScene: sceneNumber,
      notes: interaction.notes,
    };
    relationships.push(rel);

    if (isNeo4jConnected()) {
      try {
        const key = [interaction.character1, interaction.character2].sort().join('__');
        await runQuery(
          `MERGE (c1:Character {id: $char1})
           MERGE (c2:Character {id: $char2})
           MERGE (c1)-[r:RELATES_TO {id: $key}]->(c2)
           SET r.affection = COALESCE(r.affection, 0) + $affectionDelta,
               r.trust = COALESCE(r.trust, 0) + $trustDelta,
               r.animosity = COALESCE(r.animosity, 0) + $animosityDelta,
               r.lastUpdate = $sceneNumber,
               r.notes = $notes`,
          {
            char1: interaction.character1,
            char2: interaction.character2,
            key,
            affectionDelta: interaction.affectionDelta,
            trustDelta: interaction.trustDelta,
            animosityDelta: interaction.animosityDelta,
            sceneNumber,
            notes: interaction.notes,
          },
        );
      } catch (err) {
        Logger.warn('[CharacterPsych] Neo4j skip:', err);
      }
    }
  }

  return relationships;
}

export async function getRelationshipArc(
  character1: string,
  character2: string,
): Promise<RelationshipEdge | null> {
  if (!isNeo4jConnected()) return null;

  try {
    const key = [character1, character2].sort().join('__');
    const result = await runRead(
      `MATCH (c1:Character {id: $char1})-[r:RELATES_TO {id: $key}]->(c2:Character {id: $char2})
       RETURN r.affection, r.trust, r.animosity, r.lastUpdate, r.notes`,
      { char1: character1, char2: character2, key },
    );
    if (result.records.length === 0) return null;
    const r = result.records[0];
    return {
      character1,
      character2,
      affection: r.get('r.affection') || 0,
      trust: r.get('r.trust') || 0,
      animosity: r.get('r.animosity') || 0,
      lastUpdateScene: r.get('r.lastUpdate') || 0,
      notes: r.get('r.notes') || '',
    };
  } catch (err) {
    Logger.warn('[CharacterPsych] Arc read skip:', err);
    return null;
  }
}

export async function suggestSlowBurnBeat(
  character1: string,
  character2: string,
  relationshipSoFar: RelationshipEdge | null,
  storyContext: string,
): Promise<RelationshipBeat> {
  const currentScore = relationshipSoFar
    ? relationshipSoFar.affection - relationshipSoFar.animosity
    : 0;

  const models = getAIModelChain();

  const BeatSchema = z.object({
    suggestedEmotion: z.string(),
    scoreChange: z.number().min(1).max(10),
    dialogueHint: z.string(),
    reason: z.string(),
  });

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: BeatSchema,
        abortSignal: AbortSignal.timeout(20000),
        prompt: `You are a relationship pacing expert using slow-burn storytelling.

Character 1: ${character1}
Character 2: ${character2}
Current relationship score: ${currentScore} (affection - animosity)
Story context: ${storyContext}

Suggest the next emotional beat in their relationship arc.

Rules:
- MAX score change per scene: 10 (slow-burn rule)
- Score should build gradually across multiple scenes
- Early beats should be subtle (2-5 points), later beats can be stronger (6-10)
- Each beat must feel earned by the story context

Output:
- suggestedEmotion: The emotional quality of the next beat
- scoreChange: How much the relationship score should change (1-10)
- dialogueHint: A line of dialogue that captures this beat
- reason: Why this beat fits now`,
      }),
    models,
    2,
    3000,
    true,
  );

  return {
    suggestedEmotion: result.object.suggestedEmotion,
    scoreChange: result.object.scoreChange,
    dialogueHint: result.object.dialogueHint,
    reason: result.object.reason,
  };
}
