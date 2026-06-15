# Faz 2: LangGraph Multi-Agent Grafiği

**Süre:** Hafta 3-4
**Bağımlılık:** Faz 1 tamamlanmalı (opsiyonel: Track 1C)
**Paralel Track:** 3 (2B, 2C bağımsız)

---

## Track 2A — LangGraph Dönüşümü

**Referans:** Claqueta (LangGraph + Remotion + multi-agent), GraphReel (Send API)

### Yapılacaklar
- [ ] `multiAgentPipeline.ts`'i LangGraph event-driven grafiğine dönüştür
- [ ] State machine ile node'lar: Director → SceneCreator → AudioPlanner → VoiceGen → SoundEngineer → Validator → Render
- [ ] Mevcut Vercel AI SDK çağrılarını LangGraph node'larına sar
- [ ] `Send` API ile paralel scene processing (GraphReel deseni)
- [ ] Human-in-the-loop approval noktaları
- [ ] MemorySaver ile state persistence
- [ ] MCP tool olarak expose et

### Yeni Dosyalar
```
src/services/langgraph/
├── graph.ts                 (LangGraph grafiği)
├── nodes/
│   ├── directorNode.ts
│   ├── sceneCreatorNode.ts
│   ├── audioPlannerNode.ts
│   ├── voiceGenNode.ts
│   ├── soundEngineerNode.ts
│   ├── validatorNode.ts
│   └── renderNode.ts
├── state.ts                 (AgentState tipi)
└── tools.ts                 (LangGraph tools)
```

### Mevcut Dosyalar
- `src/services/multiAgentPipeline.ts` — **alternatif pipeline olarak kalır**, LangGraph yanına eklenir
- `src/routes/viMax.ts` — LangGraph endpoint'i eklenir (mevcut rotalar değişmez)
- `client/src/` — StudioPanel'de pipeline seçici (Vercel AI / LangGraph)

### Değişiklik Seviyesi: Major (yeni framework eklenir, mevcut korunur)

---

## Track 2B — Edit Agent + Undo Sistemi

**Referans:** montage-ai Phase 5 (Intent Classifier + State Manager + Undo)

### Yapılacaklar
- [ ] Mevcut `chatToEdit.ts`'i Intent Classifier ile genişlet
- [ ] Doğal dil → structured intent dönüşümü (LLM + Zod)
- [ ] 14 operasyon tipini intent'e bağla
- [ ] Snapshot-based version history (SQLite veya JSON)
- [ ] Undo/Revert API
- [ ] Targeted re-run (sadece değişen sahneyi yeniden üret)

### Yeni Dosyalar
```
src/services/editAgent/
├── intentClassifier.ts      (LLM → structured intent)
├── executor.ts              (intent → FFmpeg/rerun)
├── stateManager.ts          (snapshot al/geri yükle)
├── types.ts                 (Intent, Snapshot tipleri)
└── routes.ts                (edit API rotaları)
```

### Mevcut Dosyalar
- `src/services/chatToEdit.ts` — **genişletilir** (yeni metodlar eklenir)
- `src/routes/chatToEdit.ts` — yeni rotalar eklenir

### Değişiklik Seviyesi: Major (mevcut servisi güçlendirir)

---

## Track 2C — Storyboard Agent

**Referans:** Hungbk295/story-shot-agent (screenplay → video prompt)

### Yapılacaklar
- [ ] Senaryo/metin → LangGraph multi-agent storyboard dönüşümü
- [ ] Chroma vector retrieval ile karakter/sahne tutarlılığı
- [ ] Sora/Veo/Runway uyumlu prompt fragment'ları üretme
- [ ] Kalite denetleme + süreklilik kontrolü
- [ ] Çoklu dil desteği (TR/EN)

### Yeni Dosyalar
```
src/services/storyboardAgent/
├── graph.ts                 (LangGraph storyboard grafiği)
├── nodes/
│   ├── parserNode.ts        (senaryo ayrıştırma)
│   ├── sceneSplitterNode.ts (sahne bölme)
│   ├── promptConverterNode.ts (prompt dönüşüm)
│   └── qualityNode.ts       (kalite kontrol)
├── vectorStore.ts           (Chroma entegrasyonu)
└── types.ts
```

### Mevcut Dosyalar
- `src/services/mllmValidator.ts` — quality node'da kullanılır
- `src/services/ragScriptGenerator.ts` — vector store referansı

### Değişiklik Seviyesi: Minor (yeni servis)
