import { Logger } from '../lib/logger.js';

export interface GraphNode<TState> {
  name: string;
  execute: (state: TState) => Promise<TState | null>;
}

export interface GraphEdge<TState> {
  from: string;
  to: string | ((state: TState) => string);
}

export interface GraphRunResult<TState> {
  finalState: TState;
  path: string[];
  iterations: number;
}

export class AgentGraph<TState extends Record<string, any>> {
  private nodes = new Map<string, GraphNode<TState>>();
  private edges: GraphEdge<TState>[] = [];
  private entryPoint: string | null = null;

  addNode(node: GraphNode<TState>): this {
    if (this.nodes.has(node.name)) {
      throw new Error(`Node "${node.name}" already exists`);
    }
    this.nodes.set(node.name, node);
    if (!this.entryPoint) this.entryPoint = node.name;
    return this;
  }

  addEdge(edge: GraphEdge<TState>): this {
    if (!this.nodes.has(edge.from)) {
      throw new Error(`Source node "${edge.from}" not found`);
    }
    this.edges.push(edge);
    return this;
  }

  setEntryPoint(name: string): this {
    if (!this.nodes.has(name)) {
      throw new Error(`Entry node "${name}" not found`);
    }
    this.entryPoint = name;
    return this;
  }

  private resolveNext(fromName: string, state: TState): string | null {
    for (const edge of this.edges) {
      if (edge.from !== fromName) continue;
      if (typeof edge.to === 'function') {
        return edge.to(state);
      }
      return edge.to;
    }
    return null;
  }

  async run(
    initialState: TState,
    maxIterations = 10
  ): Promise<GraphRunResult<TState>> {
    if (!this.entryPoint) throw new Error('No entry point set');

    let state = { ...initialState };
    let currentNode = this.entryPoint;
    const path: string[] = [];
    let iterations = 0;

    while (currentNode && iterations < maxIterations) {
      const node = this.nodes.get(currentNode);
      if (!node) throw new Error(`Node "${currentNode}" not found in graph`);

      path.push(currentNode);
      iterations++;

      Logger.info(`[AgentGraph] Executing node: ${currentNode} (iter ${iterations})`);

      const result = await node.execute(state);
      if (result === null) {
        Logger.info(`[AgentGraph] Node "${currentNode}" returned null — halting`);
        break;
      }
      state = result;

      const next = this.resolveNext(currentNode, state);
      if (!next) {
        Logger.info(`[AgentGraph] No outgoing edge from "${currentNode}" — halting`);
        break;
      }
      currentNode = next;
    }

    return { finalState: state, path, iterations };
  }
}
