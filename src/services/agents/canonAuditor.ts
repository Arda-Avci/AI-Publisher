import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { isNeo4jConnected, runQuery, initNeo4jSchema } from '../neo4jService.js';
import { Logger } from '../../lib/logger.js';
import { TIMEOUT } from '../../constants.js';

export interface CanonValidation {
  passed: boolean;
  score: number;
  issues: CanonIssue[];
  entities: ExtractedEntity[];
}

export interface CanonIssue {
  type: 'character_death_violation' | 'timeline_inconsistency' | 'location_impossible' | 'object_disappeared' | 'relationship_break' | 'continuity_error';
  severity: 'error' | 'warning' | 'info';
  description: string;
  sceneNumber?: number;
  entityName?: string;
}

export interface ExtractedEntity {
  type: 'character' | 'location' | 'object' | 'event';
  name: string;
  state?: string;
  sceneNumber: number;
}

const SceneEntitySchema = z.object({
  entities: z.array(
    z.object({
      type: z.enum(['character', 'location', 'object', 'event']),
      name: z.string(),
      state: z.string().optional(),
      status: z.enum(['alive', 'dead', 'appears', 'disappears', 'damaged', 'destroyed', 'intact']).optional(),
    }),
  ),
});

async function extractSceneEntities(sceneDescription: string): Promise<ExtractedEntity[]> {
  const models = getAIModelChain();
  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: SceneEntitySchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_QUICK),
        prompt: `Extract all characters, locations, objects, and key events from this scene description.

Scene: "${sceneDescription}"

For each entity, identify:
- type: character / location / object / event
- name: specific name
- state: current visible state (e.g. "wounded", "angry", "holding gun", "running")
- status: alive/dead/appears/disappears/damaged/destroyed/intact`,
      }),
    models,
    2,
    3000,
    true,
  );

  return result.object.entities.map((e, i) => ({
    type: e.type as ExtractedEntity['type'],
    name: e.name,
    state: e.state,
    sceneNumber: i + 1,
  }));
}

export async function validateScenes(
  sceneDescriptions: string[],
  _jobId: number,
): Promise<CanonValidation> {
  const issues: CanonIssue[] = [];
  let allEntities: ExtractedEntity[] = [];

  for (const [i, desc] of sceneDescriptions.entries()) {
    const entities = await extractSceneEntities(desc);
    allEntities = [...allEntities, ...entities.map(e => ({ ...e, sceneNumber: i + 1 }))];
  }

  if (isNeo4jConnected()) {
    await initNeo4jSchema();
    for (const entity of allEntities) {
      try {
        const label = entity.type.charAt(0).toUpperCase() + entity.type.slice(1);
        await runQuery(
          `MERGE (n:${label} {id: $name, name: $name})
           ON CREATE SET n.firstSeen = $sceneNumber
           ON MATCH SET n.lastSeen = $sceneNumber, n.state = $state`,
          { name: entity.name, sceneNumber: entity.sceneNumber, state: entity.state ?? '' },
        );
      } catch (err) {
        Logger.warn('[CanonAuditor] Neo4j write skipped:', err);
      }
    }
  }

  const deadCharacters = new Map<string, number>();
  for (const entity of allEntities) {
    if (entity.type === 'character' && entity.state?.toLowerCase().includes('dead')) {
      deadCharacters.set(entity.name, entity.sceneNumber);
    }
    if (entity.type === 'character' && entity.state?.toLowerCase().includes('dies')) {
      deadCharacters.set(entity.name, entity.sceneNumber);
    }
  }

  for (const entity of allEntities) {
    if (deadCharacters.has(entity.name) && entity.sceneNumber > (deadCharacters.get(entity.name) || 0)) {
      if (entity.state && !entity.state.toLowerCase().includes('flashback') && !entity.state.toLowerCase().includes('memory') && !entity.state.toLowerCase().includes('corpse')) {
        issues.push({
          type: 'character_death_violation',
          severity: 'error',
          description: `"${entity.name}" öldüğü sahne #${deadCharacters.get(entity.name)}'den sonra sahne #${entity.sceneNumber}'de tekrar görünüyor`,
          sceneNumber: entity.sceneNumber,
          entityName: entity.name,
        });
      }
    }
  }

  const score = Math.max(0, 100 - issues.filter(i => i.severity === 'error').length * 25 - issues.filter(i => i.severity === 'warning').length * 10);

  return {
    passed: issues.filter(i => i.severity === 'error').length === 0,
    score,
    issues,
    entities: allEntities,
  };
}

export async function checkTimelineConsistency(
  characterStates: { characterName: string; sceneNumber: number; location: string; state: string }[],
): Promise<CanonIssue[]> {
  const issues: CanonIssue[] = [];
  const characterLocations = new Map<string, { location: string; scene: number }>();

  for (const cs of characterStates) {
    const prev = characterLocations.get(cs.characterName);
    if (prev && prev.location !== cs.location && cs.sceneNumber - prev.scene <= 1) {
      if (!cs.state.toLowerCase().includes('travel')) {
        issues.push({
          type: 'timeline_inconsistency',
          severity: 'warning',
          description: `"${cs.characterName}" sahne #${prev.scene}'de "${prev.location}" iken sahne #${cs.sceneNumber}'de "${cs.location}" — seyahat süresi yetersiz`,
          sceneNumber: cs.sceneNumber,
          entityName: cs.characterName,
        });
      }
    }
    characterLocations.set(cs.characterName, { location: cs.location, scene: cs.sceneNumber });
  }

  return issues;
}

export { extractSceneEntities };
