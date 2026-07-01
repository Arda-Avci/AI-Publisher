import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { isNeo4jConnected, runQuery, runRead } from '../neo4jService.js';
import { Logger } from '../../lib/logger.js';
import { TIMEOUT } from '../../constants.js';

export interface PlantPayoff {
  plant: string;
  scenePlanted: number;
  payoff?: string;
  scenePayoff?: number;
  status: 'pending' | 'fulfilled' | 'missed';
}

export interface CharacterState {
  characterName: string;
  sceneNumber: number;
  location: string;
  inventory: string[];
  health: 'healthy' | 'injured' | 'critical' | 'dead';
  emotionalState: string;
}

const PlantPayoffSchema = z.object({
  plants: z.array(
    z.object({
      plant: z.string(),
      scenePlanted: z.number(),
      payoff: z.string().optional(),
      scenePayoff: z.number().optional(),
      status: z.enum(['pending', 'fulfilled', 'missed']),
    }),
  ),
  suggestions: z.array(z.string()),
});

export async function analyzePlantPayoff(
  sceneDescriptions: string[],
): Promise<{ plants: PlantPayoff[]; suggestions: string[] }> {
  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: PlantPayoffSchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt: `You are a master screenwriter analyzing Chekhov's Gun / Plant & Payoff structure.

Analyze these scenes and identify all planted elements and whether they pay off:

Scenes:
${sceneDescriptions.map((d, i) => `Scene ${i + 1}: "${d}"`).join('\n')}

Rules:
1. Every significant object/line mentioned should have a payoff later
2. "Chekhov's Gun" — if a gun is shown in Act 1, it must fire by Act 3
3. Red herrings are intentional plants without payoff
4. Missed payoffs reduce story quality

Output:
- plants: Array of { plant, scenePlanted, payoff?, scenePayoff?, status }
- suggestions: Array of suggestions for missed/lost payoffs`,
      }),
    models,
    2,
    5000,
    true,
  );

  const plants: PlantPayoff[] = result.object.plants.map((p: any) => ({
    plant: p.plant,
    scenePlanted: p.scenePlanted,
    payoff: p.payoff,
    scenePayoff: p.scenePayoff,
    status: p.status as PlantPayoff['status'],
  }));

  if (isNeo4jConnected()) {
    for (const plant of plants) {
      try {
        await runQuery(
          `MERGE (o:Object {id: $name, name: $name})
           SET o.plantedInScene = $scenePlanted,
               o.payoffStatus = $status,
               o.payoffInScene = $scenePayoff`,
          { name: plant.plant, scenePlanted: plant.scenePlanted, status: plant.status, scenePayoff: plant.scenePayoff || 0 },
        );
      } catch (err) {
        Logger.warn('[Continuity] Neo4j plant write skipped:', err);
      }
    }
  }

  Logger.info('[Continuity] Plant & Payoff analysis:', {
    total: plants.length,
    fulfilled: plants.filter(p => p.status === 'fulfilled').length,
    missed: plants.filter(p => p.status === 'missed').length,
  });

  return { plants, suggestions: result.object.suggestions };
}

export async function trackCharacterState(
  characterName: string,
  state: CharacterState,
): Promise<void> {
  if (!isNeo4jConnected()) return;

  try {
    await runQuery(
      `MERGE (c:Character {id: $name, name: $name})
       SET c.lastScene = $sceneNumber,
           c.location = $location,
           c.health = $health,
           c.emotionalState = $emotionalState,
           c.inventory = $inventory`,
      {
        name: characterName,
        sceneNumber: state.sceneNumber,
        location: state.location,
        health: state.health,
        emotionalState: state.emotionalState,
        inventory: JSON.stringify(state.inventory),
      },
    );
    Logger.info('[Continuity] Character state updated:', { characterName, scene: state.sceneNumber });
  } catch (err) {
    Logger.warn('[Continuity] Character state Neo4j write skipped:', err);
  }
}

export async function getCharacterTimeline(
  characterName: string,
): Promise<CharacterState[]> {
  if (!isNeo4jConnected()) return [];

  try {
    const result = await runRead(
      `MATCH (c:Character {id: $name})
       RETURN c.lastScene, c.location, c.health, c.emotionalState, c.inventory`,
      { name: characterName },
    );
    if (result.records.length === 0) return [];
    const r = result.records[0];
    return [{
      characterName,
      sceneNumber: r.get('c.lastScene') || 0,
      location: r.get('c.location') || '',
      inventory: JSON.parse(r.get('c.inventory') || '[]'),
      health: (r.get('c.health') || 'healthy') as CharacterState['health'],
      emotionalState: r.get('c.emotionalState') || '',
    }];
  } catch (err) {
    Logger.warn('[Continuity] Character timeline read skipped:', err);
    return [];
  }
}

export async function verifyObjectContinuity(
  sceneDescriptions: string[],
): Promise<{ objectName: string; firstSeen: number; lastSeen: number; status: string }[]> {
  if (!isNeo4jConnected()) return [];

  const results: { objectName: string; firstSeen: number; lastSeen: number; status: string }[] = [];

  for (const desc of sceneDescriptions) {
    const { extractSceneEntities } = await import('./canonAuditor.js');
    const entities = await extractSceneEntities(desc);
    for (const entity of entities) {
      if (entity.type === 'object') {
        try {
          await runQuery(
            `MERGE (o:Object {id: $name, name: $name})
             SET o.lastSeenScene = $sceneNumber`,
            { name: entity.name, sceneNumber: entity.sceneNumber },
          );
        } catch (err) {
          Logger.warn('[Continuity] Object tracking skipped:', err);
        }
      }
    }
  }

  return results;
}
