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
export declare class AgentGraph<TState extends Record<string, any>> {
    private nodes;
    private edges;
    private entryPoint;
    addNode(node: GraphNode<TState>): this;
    addEdge(edge: GraphEdge<TState>): this;
    setEntryPoint(name: string): this;
    private resolveNext;
    run(initialState: TState, maxIterations?: number): Promise<GraphRunResult<TState>>;
}
//# sourceMappingURL=agentGraph.d.ts.map