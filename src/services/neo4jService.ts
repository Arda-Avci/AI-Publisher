import { Logger } from '../lib/logger.js';

let driver: any = null;
let connected = false;
let neo4jLib: any = null;

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'neo4j';

async function getNeo4jLib(): Promise<any> {
  if (!neo4jLib) {
    neo4jLib = await import('neo4j-driver');
  }
  return neo4jLib;
}

export async function getNeo4jDriver(): Promise<any> {
  if (!driver) {
    const neo4j = await getNeo4jLib();
    driver = neo4j.default.driver(NEO4J_URI, neo4j.default.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000,
      maxConnectionPoolSize: 10,
      connectionAcquisitionTimeout: 5000,
    });
  }
  return driver;
}

export async function connectNeo4j(): Promise<boolean> {
  try {
    const d = await getNeo4jDriver();
    await d.verifyConnectivity();
    connected = true;
    Logger.info('[Neo4j] Connected successfully');
    return true;
  } catch (err) {
    Logger.warn('[Neo4j] Connection failed — running without graph DB', err);
    connected = false;
    return false;
  }
}

export function isNeo4jConnected(): boolean {
  return connected;
}

export async function runQuery(cypher: string, params: Record<string, unknown> = {}): Promise<any> {
  const d = await getNeo4jDriver();
  const session = d.session();
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

export async function runRead(cypher: string, params: Record<string, unknown> = {}): Promise<any> {
  const d = await getNeo4jDriver();
  const session = d.session({ defaultAccessMode: 'READ' });
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

export async function initNeo4jSchema(): Promise<void> {
  if (!connected) return;

  const constraints = [
    'CREATE CONSTRAINT IF NOT EXISTS FOR (c:Character) REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (l:Location) REQUIRE l.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (o:Object) REQUIRE o.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE',
    'CREATE CONSTRAINT IF NOT EXISTS FOR (p:PlotLine) REQUIRE p.id IS UNIQUE',
  ];

  for (const cypher of constraints) {
    try {
      await runQuery(cypher);
    } catch (err) {
      Logger.warn('[Neo4j] Constraint creation skipped', err);
    }
  }

  Logger.info('[Neo4j] Schema initialized');
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    const d = await getNeo4jDriver();
    await d.close();
    driver = null;
    connected = false;
    Logger.info('[Neo4j] Disconnected');
  }
}

export default {
  getNeo4jDriver,
  connectNeo4j,
  isNeo4jConnected,
  runQuery,
  runRead,
  initNeo4jSchema,
  closeNeo4j,
};
