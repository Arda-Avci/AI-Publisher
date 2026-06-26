# Yapılacaklar Listesi (TODO)

## 🟢 Tamamlandı — Docker İmajlarının Sıralı Derlenmesi ve Matrix Güncellemesi (26 Haz 2026)
- [x] Tüm 24 model (`animatediff`, `audioldm2`, `cogvideox`, `dynamicrafter`, `f5tts`, `hunyuan`, `kokorotts`, `lora-trainer`, `ltx`, `mochi`, `musetalk`, `pyramid-flow`, `sadtalker`, `stablediffusion`, `svd`, `videocrafter`, `wan`, `wan25`, `wav2lip`, `whisper`, `xtts`, `zeroscope`, `browser-use`, `geneface`, `video-retalking`) `docker-build.yml` matrix listesine eklendi.
- [x] `colab_docker/build_all_v2.sh` scriptindeki model yazımları / typoları kontrol edildi (herhangi bir yazım hatası olmadığı doğrulandı).

## 🔴 Aktif — Script Writer Full Workflow (24 Haz 2026)

Kaynak: `Script_writer_is_akisi.txt`

### Paralel Workstream'ler (A-F backend, birbirini bloklamaz)

| # | Workstream | Dosyalar | Durum |
|---|-----------|----------|-------|
| A | Writer Tier System | `writerTiers.ts`, `writerCrew.ts` güncelle, `crewAI.ts` güncelle, `test_writerTiers.spec.ts` | ✅ |
| B | Document Parser | `documentParser.ts`, `documentUpload.ts`, `test_documentParser.spec.ts` | ✅ |
| C | Art Style Presets | `artStyle.ts`, `artStylePresets.ts`, `outlinerAgent.ts` güncelle, `test_artStylePresets.spec.ts` | ✅ |
| D | Beatsheet Duration | `types/script.ts` güncelle, `sceneArchitectAgent.ts` güncelle | ✅ |
| E | Env/Prop Library | `db.ts` güncelle, `envProp.ts`, `envPropService.ts`, `envProps.ts`, `test_envProp.spec.ts` | ✅ |
| F | Storyboard Service | `storyboardGenerator.ts`, `storyboardRoutes.ts`, `b2.ts` güncelle, `test_storyboard.spec.ts` | ✅ |

### 🔜 Frontend + Devam (A-F ✅, G ✅, H ✅, I ✅, J ✅)

| # | Workstream | Bağımlılık | Durum |
|---|-----------|-----------|-------|
| G | **Frontend Dashboard** — multi-platform metadata UI, auto-download, video player, Save & Publish | A-F API | ⏳ **kısmi** |
| G1 | Multi-platform metadata UI (TikTok/X/Meta field'ları + tab switcher) | — | ✅ |
| G2 | Auto-download on SSE stageCompleted | — | ✅ |
| G3 | Multi-platform Save & Publish (tüm platform alanlarını gönder) | — | ✅ |
| G4 | AI metadata auto-populate (`GET /api/v1/jobs` + `GET /api/v1/jobs/:id` + SSE auto-select) | `jobs.ts`, `App.tsx` | ✅ |
| G5 | Gallery inline video player | — | ✅ |
| G6 | Dashboard ana sayfa (stats, recent videos, quick actions) | G1-5 | ✅ |
| H | **Timeline + Post-Prod** (drag-reorder animation + keyboard shortcuts, 20 transition type, 4K Real-ESRGAN upscale, alt scene) | G | ✅ |
| I | **Export Pipeline** (concat/zip, FilmFreeway metadata, GalleryPanel button) | H | ✅ |
| J | **Analytics, Multi-Lang, Notification Center, Bugfix/Refactor** | I | ✅ |
| J1 | Analytics & Stats Dashboard — view tracking, viral score history, trend engagement charts | — | ✅ |
| J2 | Multi-Language Expansion — DE/FR/ES/AR locale support | — | ✅ |
| J3 | Notification Center — in-app history, email, push | — | ✅ |
| J4 | Bugfix & Refactor — lint fix, test cleanup, code quality pass | J1-3 | ✅ |
| K | **Test Altyapısı** — AI guard standardizasyonu, Phase J test dosyaları | J | ✅ |
| K1 | Test Altyapısı — `skipAITests` guard, 4 yeni test dosyası (notif/analytics/export/email), PG boolean fix | — | ✅ |

## ✅ Tamamlanan Major Fazlar

| Faz | Tarih |
|---|---|
| Split Screen FFmpeg & Glibc Fix | 25 Haz |
| Kredi Blokajı Sistemi | 25 Haz |
| Actions Runner Disk Alanı Optimizasyonu (Free disk space) | 25 Haz |
| Colab→Docker Migration | 21 Haz |
| SVD-XT + Sıralı Derleme | 19 Haz |
| v6.0 Core (32 Template, LangGraph 5-node, MuseTalk, Storyboard) | 15-20 Haz |
| Dockerfile Bağımlılık Düzeltmeleri (7 model, CUDA 11.x) | 21 Haz |
| GHCR Upload Notebook | 22 Haz |
| Phase H (Timeline + Post-Prod) | 25 Haz |
| Phase I (Export Pipeline) | 25 Haz |
| Phase J (Analytics, Multi-Lang, Notification, Refactor) | 25 Haz |
| Phase K1 (Test Altyapısı, AI guard, 4 yeni test) | 25 Haz |
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
| **Script Writer Full Workflow A-F** (Writer Tiers, Document Parser, Art Style Presets, Beatsheet Duration, Env/Prop Library, Storyboard Service) | 24 Haz |

## AI Framework Durumu

| Framework | Durum | Açıklama |
|-----------|-------|----------|
| LangChain (`@langchain/core`) | ✅ | `queue-graph.ts`, `agentGraph.ts`, `multiAgentPipeline.ts` |
| LangGraph (`@langchain/langgraph`) | ✅ | `StateGraph` 8-node, `PostgresSaver` checkpointer |
| RAG (`ragScriptGenerator.ts`) | ✅ | Gemini + Zod şemalı RAG script, `/api/v1/vimax/rag-script` |
| CrewAI (`@crewai-ts/core`) | ✅ | **Full workflow A-F tam.** Writer Tiers, Art Style, Duration, Document Parser, Env/Prop Library, Storyboard Service |
| AutoGen | ❌ | Projede yok |

## Test Dosyaları

| Dosya | Test Sayısı | Durum |
|-------|------------|-------|
| test_crewai.spec.ts | 20 | ✅ |
| test_writerTiers.spec.ts | 10 | ✅ |
| test_documentParser.spec.ts | 4 | ✅ |
| test_artStylePresets.spec.ts | 27 | ✅ |
| test_envProp.spec.ts | 24 | ✅ |
| test_storyboard.spec.ts | 22 | ✅ |
| test_characterGeneration.spec.ts | 12 | ✅ |
| test_characterPresets.spec.ts | 24 | ✅ |
| test_characterProfile.spec.ts | 20 | ✅ |
| test_modelRouter.spec.ts | 27 | ✅ |
| test_notifications.spec.ts | 11 | ✅ |
| test_analytics.spec.ts | 7 | ✅ |
| test_export.spec.ts | 4 | ✅ |
| test_email.spec.ts | 1 | ✅ |
| _diğer 15 test dosyası_ | ~100 | ✅ |
| **Toplam** | **~435+** (149 non-AI ✅, kalan AI-guarded) | |

---

## Bekleyen İşler

### ☁️ RunPod Altyapı + E2E Test
- [ ] Port yönlendirme testi (5001-5012)
- [ ] RunPod callback (webhook) POST → diske yazma doğrulama
- [x] Wan 2.1/2.5 imajlarının Colab'de yeniden derlenip GHCR'a pushlanması

### 💳 iyzico Ödeme — Canlı Test
- [ ] Sandbox merchant panel → API key + abonelik plan kodları
- [ ] Sanal kartla manuel checkout/webhook testi
- [x] Kredi blokajı (render başında bloke, bitince düş, iptalde refund)

### 📦 GHCR → RunPod
- [x] 7 model ContainerManager entegrasyonu + endpoint (SadTalker, DynamiCrafter, Zeroscope, Video-ReTalking, GeneFace++, Mochi-1, Pyramid-Flow)

---

## Notlar
- Docker Hub kullanılmaz. Tüm imajlar → GHCR (`ghcr.io/Arda-Avci/`)
- Medya dosyaları Backblaze B2'de saklanır
- Test: `npx vitest run`, typecheck: `npm run check:types`, lint: `npm run check:lint`
