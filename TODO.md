# Yapılacaklar Listesi (TODO)

## 🔴 Aktif — Script Writer Full Workflow (24 Haz 2026)

Kaynak: `Script_writer_is_akisi.txt`

### Paralel Workstream'ler (A-F backend, birbirini bloklamaz)

| # | Workstream | Dosyalar | Durum |
|---|-----------|----------|-------|
| A | Writer Tier System | `services/crewai/writerTiers.ts`, `writerCrew.ts` güncelle, `routes/crewAI.ts` güncelle, `test_writerTiers.spec.ts` | 🔄 **Aktif** |
| B | Document Parser | `services/documentParser.ts`, `routes/documentUpload.ts`, `test_documentParser.spec.ts` | ⏳ |
| C | Art Style Presets | `types/artStyle.ts`, `services/artStylePresets.ts`, `outlinerAgent.ts` güncelle, `test_artStylePresets.spec.ts` | ⏳ |
| D | Beatsheet Duration | `types/script.ts` güncelle, `sceneArchitectAgent.ts` güncelle | ⏳ |
| E | Env/Prop Library | `db.ts` güncelle, `types/envProp.ts`, `services/envPropService.ts`, `routes/envProps.ts`, `test_envProp.spec.ts` | ⏳ |
| F | Storyboard Service | `services/storyboardGenerator.ts`, `routes/storyboard.ts`, `test_storyboard.spec.ts` | ⏳ |

### A-F sonrası frontend + devam

| # | Workstream | Bağımlılık | Durum |
|---|-----------|-----------|-------|
| G | Frontend (tier selector, style cards, doc upload, env/prop mgr, storyboard grid) | A-F API | ⏳ |
| H | Timeline + Post-Prod (drag-reorder, transition, 4K upscale, alt scene) | G | ⏳ |
| I | Export Pipeline (concat/zip, FilmFreeway metadata) | H | ⏳ |

## ✅ Tamamlanan Major Fazlar

| Faz | Tarih |
|---|---|
| Actions Runner Disk Alanı Optimizasyonu (Free disk space) | 25 Haz |
| Colab→Docker Migration | 21 Haz |
| SVD-XT + Sıralı Derleme | 19 Haz |
| v6.0 Core (32 Template, LangGraph 5-node, MuseTalk, Storyboard) | 15-20 Haz |
| Dockerfile Bağımlılık Düzeltmeleri (7 model, CUDA 11.x) | 21 Haz |
| GHCR Upload Notebook | 22 Haz |
| RunPod + B2 Geçişi (runpod.ts, webhook, queue) | 22 Haz |
| Trend Analizi (4 platform scraping, Phase 2 prompt enjeksiyonu, Phase 3 scheduler+chart) | 23 Haz |
| OpenTelemetry (Batch 3) | 23 Haz |
| LoRA Pipeline Fix (concurrent polling, threaded Flask, callback) | 23 Haz |
| Production Readiness (18 test) | 23 Haz |
| Test Onarımları + Faz 7C (23 integrasyon testi) | 22-23 Haz |
| v7.1 Patch (Deep Think fix, Pino logger, MCP) | 23 Haz |
| Veo 3.1 I2V (Batch 5) | 23 Haz |
| LangGraph Queue Upgrade (8-node StateGraph, Postgres Checkpointer) | 23 Haz |
| Multi-agent Content Team (CrewAI-style custom) | 23 Haz |
| iyzico Ödeme (Faz 4 backend + client JS + modal) | 23 Haz |
| ModelRouter (cost-priority routing, 27 test) | 24 Haz |
| Character Library + Full Body + Photo-to-Character (56 test) | 24 Haz |
| **CrewAI Writer Pipeline** (Faz A-D) | 24 Haz |

## AI Framework Durumu

| Framework | Durum | Açıklama |
|-----------|-------|----------|
| LangChain (`@langchain/core`) | ✅ | `queue-graph.ts`, `agentGraph.ts`, `multiAgentPipeline.ts` |
| LangGraph (`@langchain/langgraph`) | ✅ | `StateGraph` 8-node, `PostgresSaver` checkpointer |
| RAG (`ragScriptGenerator.ts`) | ✅ | Gemini + Zod şemalı RAG script, `/api/v1/vimax/rag-script` |
| CrewAI (`@crewai-ts/core`) | ✅ | 4-agent writer pipeline tam. Writer Tiers ekleniyor |
| AutoGen | ❌ | Projede yok |

## Test Dosyaları

| Dosya | Test Sayısı |
|-------|------------|
| test_crewai.spec.ts | 13 |
| test_writerTiers.spec.ts | ⏳ |
| test_documentParser.spec.ts | ⏳ |
| test_artStylePresets.spec.ts | ⏳ |
| test_envProp.spec.ts | ⏳ |
| test_storyboard.spec.ts | ⏳ |
| test_characterGeneration.spec.ts | 12 |
| test_characterPresets.spec.ts | 24 |
| test_characterProfile.spec.ts | 20 |
| test_modelRouter.spec.ts | 27 |
| _diğer 15 test dosyası_ | — |

---

## Bekleyen İşler

### ☁️ RunPod Altyapı + E2E Test
- [ ] Network Volume'e model ağırlıklarını yükle (`/workspace/models`)
- [ ] Port yönlendirme testi (5001-5012)
- [ ] RunPod callback (webhook) POST → diske yazma doğrulama
- [ ] Wan 2.1/2.5 imajlarının Colab'de yeniden derlenip GHCR'a pushlanması

### 💳 iyzico Ödeme — Canlı Test
- [ ] Sandbox merchant panel → API key + abonelik plan kodları
- [ ] Sanal kartla manuel checkout/webhook testi
- [ ] Kredi blokajı (render başında bloke, bitince düş, iptalde refund)

### 📦 GHCR → RunPod
- [ ] 7 model (SadTalker, DynamiCrafter, Zeroscope, Video-ReTalking, GeneFace++, Mochi-1, Pyramid-Flow) ContainerManager entegrasyonu + endpoint

---

## Notlar
- Docker Hub kullanılmaz. Tüm imajlar → GHCR (`ghcr.io/Arda-Avci/`)
- Medya dosyaları Backblaze B2'de saklanır
- Test: `npx vitest run`, typecheck: `npm run check:types`, lint: `npm run check:lint`
