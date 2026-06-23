# ADR-007: LangGraph + Postgres Checkpointer Queue Upgrade

## Status
Kabul Edildi

## Baglam
Mevcut `queue.ts` (2396 satir) monolitik sequential is akisi. Her stage
(startProduction icinde sirali fonksiyon cagrilari). Avantajlari: basit,
calisiyor. Dezavantajlari:
- State management yok (hata durumunda is nerede kaldigi bilinmiyor)
- Retry mekanizmasi basit (sadece transient Docker hatalari)
- Paralel dallanma yok
- Test edilebilirlik dusuk

LangGraph StateGraph + Postgres Checkpointer cozum sunar:
- Her pipeline stage ayri bir node
- State Postgres'te persist edilir → crash'ten sonra kaldigi yerden devam
- Conditional branching (ornek: LoRA basarisizsa retry, basariliysa devam)
- Built-in retry per node

## Karar
1. Mevcut `queue.ts` korunur (fallback olarak)
2. `src/queue-graph.ts` olusturulur — LangGraph StateGraph tabanli pipeline
3. Her stage bir graph node'u olur:
   - `directorPlanning`
   - `sceneGeneration`
   - `coverSynthesis`
   - `loraTraining`
   - `sceneRender` (her scene alt-node)
   - `ffmpegMix`
   - `concatFinal`
   - `publishSocial`
4. State Schema (Postgres'te `queue_state` tablosu):
   ```typescript
   interface QueueState {
     jobId: number;
     userId: number;
     currentStage: string;
     completedScenes: number;
     totalScenes: number;
     progressPercent: number;
     errors: string[];
     retryCount: number;
     intermediateUrls: string[];
     finalFilename?: string;
   }
   ```
5. Postgres Checkpointer: Her node sonrasi state otomatik kaydedilir
6. Gecis stratejisi: `OTEL_QUEUE_GRAPH=true` env var ile aktif, varsayilan `false`
7. Test: Parallel calistir, sonuclari karsilastir

## Sonuclar
### Olumlu
- Crash-safe is akisi (Postgres checkpoint)
- Her node bagimsiz test edilebilir
- Parallel dallanma mumkun (ornek: eszamanli LoRA + cover)
- Built-in retry per node
- Mevcut queue.ts bozulmaz (fallback)

### Olumsuz
- Yeni bagimli: `@langchain/langgraph`, `@langchain/langgraph-checkpointer-postgres`
- Gecis stratejisi kompleks (A/B test)
- Postgres'te ek tablo
- Mevcut 2396 satir queue.ts'nin graph node'larina bolunmesi uzun surebilir
