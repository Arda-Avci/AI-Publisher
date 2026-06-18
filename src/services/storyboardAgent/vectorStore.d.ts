import { VectorRecord } from './types.js';
export declare class InMemoryVectorStore {
    private records;
    private dimension;
    constructor(dimension?: number);
    add(record: VectorRecord): Promise<void>;
    addMany(records: VectorRecord[]): Promise<void>;
    search(query: string, topK?: number, filterMeta?: Record<string, any>): Promise<VectorRecord[]>;
    remove(id: string): Promise<void>;
    clear(): Promise<void>;
    get size(): number;
    private simpleHashEmbedding;
    private hashWord;
    private cosineSimilarity;
}
export declare const storyboardVectorStore: InMemoryVectorStore;
//# sourceMappingURL=vectorStore.d.ts.map