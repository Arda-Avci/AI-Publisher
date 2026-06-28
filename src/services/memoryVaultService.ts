import { Logger } from '../lib/logger.js';
import { isNeo4jConnected, runQuery } from './neo4jService.js';

export interface CreativeMemory {
  id: string;
  userId: number;
  sessionId: string;
  type: 'style_choice' | 'rejected_idea' | 'character_trait' | 'pacing_preference' | 'color_palette' | 'narrative_device' | 'user_feedback';
  key: string;
  value: string;
  context: string;
  createdAt: string;
}

export interface MemoryQuery {
  userId: number;
  types?: string[];
  since?: string;
  limit?: number;
}

export async function storeMemory(
  userId: number,
  sessionId: string,
  type: CreativeMemory['type'],
  key: string,
  value: string,
  context?: string,
): Promise<boolean> {
  if (!isNeo4jConnected()) {
    Logger.warn('[MemoryVault] Neo4j not connected, memory not stored');
    return false;
  }

  try {
    await runQuery(
      `MERGE (m:CreativeMemory {userId: $userId, key: $key})
       SET m.sessionId = $sessionId,
           m.type = $type,
           m.value = $value,
           m.context = $context,
           m.createdAt = datetime(),
           m.updatedAt = timestamp()
       RETURN m`,
      { userId, sessionId, type, key, value, context: context ?? '' },
    );
    Logger.info('[MemoryVault] Stored:', { type, key });
    return true;
  } catch (err) {
    Logger.error('[MemoryVault] Store error:', err);
    return false;
  }
}

export async function queryMemories(query: MemoryQuery): Promise<CreativeMemory[]> {
  if (!isNeo4jConnected()) return [];

  try {
    let cypher = 'MATCH (m:CreativeMemory {userId: $userId})';
    const params: Record<string, unknown> = { userId: query.userId };

    if (query.types && query.types.length > 0) {
      cypher += ' WHERE m.type IN $types';
      params.types = query.types;
    }

    if (query.since) {
      cypher += query.types && query.types.length > 0 ? ' AND' : ' WHERE';
      cypher += ' m.createdAt >= datetime($since)';
      params.since = query.since;
    }

    cypher += ' RETURN m ORDER BY m.createdAt DESC';

    if (query.limit) {
      cypher += ' LIMIT $limit';
      params.limit = query.limit;
    }

    const result = await runQuery(cypher, params);
    return result.records.map((record: any) => recordToMemory(record.get('m')));
  } catch (err) {
    Logger.error('[MemoryVault] Query error:', err);
    return [];
  }
}

export async function getCreativeContext(
  userId: number,
  _sessionId: string,
): Promise<string> {
  if (!isNeo4jConnected()) return '';

  const recent = await queryMemories({ userId, limit: 20 });

  const styleChoices = recent.filter(m => m.type === 'style_choice');
  const rejected = recent.filter(m => m.type === 'rejected_idea');
  const feedback = recent.filter(m => m.type === 'user_feedback');
  const narrative = recent.filter(m => m.type === 'narrative_device');

  const parts: string[] = [];

  if (styleChoices.length > 0) {
    parts.push('Previous style choices:');
    styleChoices.forEach(m => parts.push(`- ${m.key}: ${m.value}`));
  }

  if (rejected.length > 0) {
    parts.push('Rejected ideas:');
    rejected.forEach(m => parts.push(`- ${m.value}`));
  }

  if (narrative.length > 0) {
    parts.push('Narrative devices used:');
    narrative.forEach(m => parts.push(`- ${m.key}: ${m.value}`));
  }

  if (feedback.length > 0) {
    parts.push('User feedback:');
    feedback.forEach(m => parts.push(`- ${m.context}: ${m.value}`));
  }

  return parts.join('\n');
}

export async function markRejected(
  userId: number,
  sessionId: string,
  idea: string,
  reason: string,
): Promise<boolean> {
  return storeMemory(userId, sessionId, 'rejected_idea', `rejected_${Date.now()}`, idea, reason);
}

function recordToMemory(neo4jObj: any): CreativeMemory {
  const props = neo4jObj.properties ?? neo4jObj;
  return {
    id: String(props.key ?? ''),
    userId: Number(props.userId ?? 0),
    sessionId: String(props.sessionId ?? ''),
    type: props.type as CreativeMemory['type'],
    key: String(props.key ?? ''),
    value: String(props.value ?? ''),
    context: String(props.context ?? ''),
    createdAt: String(props.createdAt ?? ''),
  };
}
