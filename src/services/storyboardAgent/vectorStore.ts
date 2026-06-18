import { VectorRecord } from './types.js';
import { Logger } from '../../lib/logger.js';

export class InMemoryVectorStore {
  private records: VectorRecord[] = [];
  private dimension: number;

  constructor(dimension = 128) {
    this.dimension = dimension;
  }

  async add(record: VectorRecord): Promise<void> {
    if (!record.embedding) {
      record.embedding = this.simpleHashEmbedding(record.content);
    }
    this.records.push(record);
  }

  async addMany(records: VectorRecord[]): Promise<void> {
    for (const r of records) {
      await this.add(r);
    }
  }

  async search(query: string, topK = 5, filterMeta?: Record<string, any>): Promise<VectorRecord[]> {
    const queryEmb = this.simpleHashEmbedding(query);
    const scored = this.records
      .filter((r) => {
        if (!filterMeta) return true;
        return Object.entries(filterMeta).every(([k, v]) => r.metadata[k] === v);
      })
      .map((r) => ({
        record: r,
        score: this.cosineSimilarity(queryEmb, r.embedding || []),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.map((s) => s.record);
  }

  async remove(id: string): Promise<void> {
    this.records = this.records.filter((r) => r.id !== id);
  }

  async clear(): Promise<void> {
    this.records = [];
  }

  get size(): number {
    return this.records.length;
  }

  private simpleHashEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const emb = new Array(this.dimension).fill(0);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      const hash = this.hashWord(word);
      const idx = Math.abs(hash) % this.dimension;
      emb[idx] += 1.0 / words.length;
    }

    const norm = Math.sqrt(emb.reduce((s, v) => s + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < emb.length; i++) emb[i] /= norm;
    }

    return emb;
  }

  private hashWord(word: string): number {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      const char = word.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      const valA = a[i] ?? 0;
      const valB = b[i] ?? 0;
      dot += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}

export const storyboardVectorStore = new InMemoryVectorStore(128);
