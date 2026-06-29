# Yapılacaklar Listesi (TODO)

## 🔴 Aktif — Docker İmajlarının Sıralı Derlenmesi (25 Haz 2026)
- [x] `cogvideox` Docker build ve push (Hata giderildi, disk prune eklendi)
- [x] `dynamicrafter` Docker build ve push (Build-time weights iptal edildi, workflow matrix'e eklendi)
- [x] `hunyuan` Docker build ve push (Build-time weights iptal edildi, app.py bug'ı düzeltildi)
- [x] `lora-trainer` Docker build ve push (Build-time weights iptal edildi, app.py bug'ı düzeltildi)
- [x] `ltx` Docker build ve push (Build-time weights iptal edildi, app.py bug'ları düzeltildi)
- [x] `mochi` Docker build ve push (Build-time weights iptal edildi, app.py bug'ı düzeltildi)
- [x] `musetalk` Docker build ve push (Hata yok, başarıyla derlendi)
- [x] `pyramid-flow` Docker build ve push (Build-time weights iptal edildi, app.py bug'ı düzeltildi)
- [x] `sadtalker` Docker build ve push (Build-time weights iptal edildi, app.py checkpoints indirmesi entegre edildi)
- [x] `svd` Docker build ve push (Build-time weights iptal edildi, app.py bug'ı düzeltildi)
- [x] `wan` Docker build ve push (Build-time weights iptal edildi, app.py bug'ları düzeltildi)
- [x] `wan25` Docker build ve push
- [x] Base imaj ve GitHub Actions workflow optimizasyonu (Dockerfile.base path filter + referans paketlerin base'e taşınması) (26 Haz)
- [x] `animatediff` Docker build ve push (26 Haz)
- [x] `audioldm2` Docker build ve push (26 Haz)
- [x] `f5tts` Docker build ve push (26 Haz)
- [x] `kokorotts` Docker build ve push (26 Haz)
- [x] `stablediffusion` Docker build ve push (26 Haz)
- [x] `videocrafter` Docker build ve push (26 Haz)
- [x] `whisper` Docker build ve push (26 Haz)
- [x] `xtts` Docker build ve push (26 Haz)
- [x] `zeroscope` Docker build ve push (26 Haz)
- [x] `wav2lip` Docker build ve push (Hata giderildi, başarıyla derlendi) (26 Haz)

## ✅ RunPod Serverless Hata Giderimi ve Entegrasyonu (28 Haz 2026)
- [x] LTX/Wan model `diagnose` modundaki `UnboundLocalError` hatasının giderilmesi
- [x] HuggingFace `transformers` v5+ sürümünün PyTorch >= 2.4.0 zorunluluğunu aşmak için sürüm taklit yaması
- [x] `accelerate` paketinin `torch.amp.GradScaler` içe aktarım hatasının giderilmesi
- [x] `transformers` v5+ model kayıt süreçlerindeki `torch.compiler.is_compiling` AttributeError hatasının giderilmesi
- [x] Mixture of Experts (`moe.py`) içindeki `torch.library.custom_op` AttributeError hatasının giderilmesi ve register_fake/register_autograd uyumluluk yamasının yazılması
- [x] Backblaze B2 S3 API endpoint'inden bölge (region) kodunun dinamik parse edilmesi yamasının eklenmesi
- [x] B2 Master Key sınırlamasını aşmak için S3 uyumlu Custom Application Key entegrasyonunun tamamlanması
- [x] RunPod worker'larının yeni yamalı imaj etiketleri ile cycle edilip `test_generate_video.js` ile gerçek video sentezleme ve B2 yüklemesinin %100 başarılı doğrulanması
- [x] **HunyuanVideo & Diğer Tüm Modeller `GradScaler` ve `T5TokenizerFast` Yamaları**: PyTorch 2.2.1 altındaki `GradScaler` ve transformers v5+ altındaki `T5TokenizerFast` / `get_default_device` monkey-patch yamaları tüm `app.py` dosyalarında (`hunyuan`, `mochi`, `pyramid-flow`, `animatediff`, `dynamicrafter`, `audioldm2`, `stablediffusion`, `cogvideox`, `wan`, `ltx`, `zeroscope`) proaktif olarak tamamlandı.
- [x] **RunPod REST API PATCH Mimarisine Geçiş**: GraphQL `saveEndpoint` mutasyonundaki 400 bad request hatalarını önlemek için tüm yönetim scriptleri REST API PATCH `/v1/endpoints/:id` yapısına geçirildi.
- [x] **FFmpeg openh264 Versiyon Uyuşmazlığı Düzeltmesi**: `libopenh264` dynamic library mismatches / encoding failed hatalarını tamamen ortadan kaldırmak için, `Dockerfile.base` imajına statik derlenmiş (statically compiled) FFmpeg binary'si indirilip kuruldu.
- [x] **Wan 2.5 `libtorchaudio` ABI / C++ Symbol Uyuşmazlığı**: PyTorch 2.5.1 ve torchaudio dynamic linker ABI sembol uyuşmazlığı hatasını gidermek için `wan25/Dockerfile`'a `torchaudio==2.5.1+cu121` sürümü eklenerek uyumluluk sağlandı.
- [x] **VideoCrafter2 Config Dizin Yolu Düzeltmesi**: `/app/videocrafter/configs/inference.yaml` bulunamadı başlatma hatası, pretrained yüklemesinde kullanılmayan bu gereksiz dosya check adımı `videocrafter/app.py` dosyasından kaldırılarak çözüldü.
- [x] **PyramidFlow Pipeline İçe Aktarma Düzeltmesi**: `cannot import name 'PyramidFlowPipeline' from 'diffusers'` hatası, `pyramid-flow/Dockerfile`'daki diffusers minimum sürüm gereksinimi `>=0.32.0` yapılarak giderildi.
- [x] **Preload NameError (vram_cleanup / flush_memory) Hataları**: Zeroscope, CogVideoX, AudioLDM2, AnimateDiff, Kokoro, F5-TTS, XTTS ve GeneFace modellerinin `app.py` preload rotalarındaki eksik/hatalı `vram_cleanup` veya `flush_memory` tanımlamaları tamamen giderildi.

## 🔴 Aktif — RunPod Serverless Çoklu Model Hata Giderimleri (28 Haz 2026)
- [ ] **Mochi-1 GPU VRAM Kotası Yükseltimi**: Mochi-1 serverless endpoint konfigürasyonunu T4 (16GB) yerine minimum 24GB (A10G/ADA_24) VRAM destekleyen GPU grupları ile güncellemek.
- [ ] **AnimateDiff & DynamiCrafter Quota Limiti**: RunPod ile görüşülerek ya da pasif/az kullanılan endpoint'ler kapatılarak serverless worker quota limitini 10'dan yukarı çıkartıp bu iki modeli de aktif etmek.

## ✅ Script Writer Full Workflow Tamamlandı (27 Haz 2026)

Kaynak: `Script_writer_is_akisi.txt`

### Workstream A-F (Backend) + G-I (Frontend) + J (Feature) + K (Test)

| # | Workstream | Durum |
|---|-----------|-------|
| A | Writer Tier System — `writerTiers.ts`, `writerCrew.ts`, `test_writerTiers.spec.ts` | ✅ |
| B | Document Parser — `documentParser.ts`, `documentUpload.ts`, `test_documentParser.spec.ts` | ✅ |
| C | Art Style Presets — `artStyle.ts`, `artStylePresets.ts`, `test_artStylePresets.spec.ts` | ✅ |
| D | Beatsheet Duration — `types/script.ts`, `sceneArchitectAgent.ts` | ✅ |
| E | Env/Prop Library — `db.ts`, `envProp.ts`, `envPropService.ts`, `test_envProp.spec.ts` | ✅ |
| F | Storyboard Service — `storyboardGenerator.ts`, `storyboardRoutes.ts`, `test_storyboard.spec.ts` | ✅ |
| G | Frontend Dashboard — ScriptWriterPanel (tier/style/doc upload/storyboard grid) + Gallery + metadata UI | ✅ |
| H | Timeline + Post-Prod — drag-reorder, transition, 4K upscale, alt scene | ✅ |
| I | Export Pipeline — concat/zip, FilmFreeway metadata, GalleryPanel button | ✅ |
| J | Analytics, Multi-Lang, Notification Center, Bugfix/Refactor | ✅ |
| K | **Test Altyapısı** — AI guard standardizasyonu, 3 pipeline integration test dosyası (43 test), 11 frontend rendering test | ✅ |

## ✅ Tamamlanan Fazlar

### Faz A — Altyapı
- [x] `neo4jService.ts` — Driver singleton + Cypher helper
- [x] `db.ts` — `production_mode` kolonu

### Faz B — Canon & Continuity (Neo4j tabanlı)
- [x] `canonAuditor.ts` — Scene entity extraction → Neo4j MERGE, death/timeline/location validation
- [x] `continuityManager.ts` — Plant & Payoff AI analysis + Neo4j object tracking + character state
- [x] `characterPsychologist.ts` — Relationship edges (affection/trust/animosity), slow-burn max 10pt/scene

### Faz C — Sinematik Zeka
- [x] `editingTheoryAgent.ts` — Walter Murch Rule of Six (Emotion 51% + Story 23% + Rhythm 10% + Eye-trace 7% + Planarity 5% + Spatial 4%)
- [x] `auteurSignatureAgent.ts` — 6 yönetmen stili (Tarantino/Anderson/Fincher/Kubrick/Spielberg/Nolan)

### Faz D — Post-Production Pipeline
- [x] `postProductionAgent.ts` — Rough→Fine→Picture Lock AI agent + timeline builder
- [x] `soundDesigner.ts` — ADR/Foley/room tone/sound bridge/score direction AI agent
- [x] `videoService.ts` — bleach_bypass/day_for_night presets, applyTimeRamp(), applyLut()
- [x] 11 unit test geçiyor

### Faz E — Rekabetçi Feature'lar (9 dosya)
- [x] `brandGuideService.ts` — Brand book CRUD + Zod schema + PostgreSQL tablosu
- [x] `memoryVaultService.ts` — Neo4j cross-session creative memory (7 types)
- [x] `multiTurnEditor.ts` — Iterative refinement + undo history + intent classification
- [x] `draftToHiFi.ts` — Draft→4K upscale (Lanczos + denoise + deinterlace)
- [x] `inpaintingService.ts` — FLUX inpainting via RunPod + B2 upload + polling
- [x] `plainLanguageEdit.ts` — Doğal dil→FFmpeg AI translation + execution
- [x] `physicsAdvisor.ts` — Gravity/optics/mechanics constraint injection
- [x] `videoToVideoService.ts` — Style transfer (10 preset: cinematic/anime/noir/vaporwave vs.)
- [x] `hdrPipeline.ts` — 10-bit HDR tonemapping PQ/HLG/HDR10/HDR10+
- [x] 13 test geçiyor

### Faz F — Mod Yönetimi
- [x] `promptEnhancer.ts` — Short-form hook/loop/retention enhancer + film cultural/subtext/DoP enhancer
- [x] `queue.ts` — Short mode → `enhanceShortFormPrompt()` injection → `generateStudioScenes()`
- [x] `dashboard.ts` — Üretim Modu selectörü (Short/Film/Series) + hint text
- [x] `dashboardScripts.ts` — Edit modal'a `production_mode` eklendi

### Faz G — Ekstra Teknik Ajanları
- [x] `narrativeDeviceAgent.ts` — 10 anlatı cihazı (false protagonist, frame story, 4th wall, vs.)
- [x] `timeStructureAgent.ts` — 6 zaman yapısı (linear/non-linear/reverse/parallel/time-loop/anthology)
- [x] `transitionDesignerAgent.ts` — 11 geçiş türü (invisible cut, smash cut, J/L-cut, match cut, vs.)

### Kullanıcı Feature'ları
- [x] Film/Dizi modu storyboard zorunluluğu (`queue.ts` + `storyboardIntegration.ts`)
- [x] Karakter referans entegrasyonu (`characterReferenceService.ts`)
- [x] Dizi modu admin-only (`routes/jobs.ts`)
- [x] Senaryo/prompt geliştirme kredi kesintisi (`creditService.ts` + `queue.ts`)

### Test Suite Onarımları (26-27 Haz)
- [x] Test suite hanging fix — `vitest.config.ts`'ye `SKIP_AI_TESTS=true`, AI guard standardizasyonu
- [x] promptEnhancer.ts `maxDurationSec` bug fix — hardcoded 60 yerine `config?.maxDurationSec ?? 60`
- [x] multiTurnEditor test fix — çift generateObject mock'u + videoService importOriginal partial mock
- [x] getCreativeContext assertion fix — string return tipine uygun toContain
- [x] timeStructureAgent mock fix — `structureMap` anahtarına uygun değer (`non-linear`)
- [x] **481 → 524 test geçiyor, 34 skip, 192sn tam süre** (0 hata)

### Yeni Test Dosyaları (K-Faz)
- [x] `test_pipeline_integration.spec.ts` — 11 test: Job Queue + FFmpeg + Scene CRUD + error handling
- [x] `test_api_lifecycle.spec.ts` — 21 test: Full job/scene CRUD via API + auth guards + publish pre-checks
- [x] `test_frontend_rendering.spec.ts` — 11 test: SPA rendering + session management + auth redirects
- [x] `test_promptEnhancer.spec.ts` — 10 test, Phase F pure functions
- [x] `test_narrativeAgents.spec.ts` — 15 test, Phase B + G
- [x] `test_competitive_features.spec.ts` — 13 → 29 test

## ✅ Faz M — Model-Specific Prompt Formatting (28 Haz 2026)
- [x] `modelPromptBuilder.ts` — `buildModelPrompt()` her model için optimize prompt şablonu
- [x] `runpodEndpoints.ts` — defaultInput düzeltmeleri (fps/num_frames/width/height)
- [x] `veo31` cloud API registry'e eklendi
- [x] `queue.ts` — modelType belirleme öne çekildi, modelPromptBuilder kullanılıyor
- [x] `queue-graph.ts` — modelPromptBuilder entegre edildi
- [x] Model Motoru dropdown canlandı: `MODEL_ENGINE_OPTIONS` (14 model), `model_type` backend'e gönderiliyor
- [x] `App.tsx` + `routes/jobs.ts` — model_type form/DB akışı tamam
- [x] tsc --noEmit 0 hata (backend + frontend)

### Bekleyen (Açık İşler)
- [x] `docker-compose.yml` (root) — PostgreSQL + Redis + Neo4j + RabbitMQ (26 Haz)
- [x] Docker build: sadtalker, svd, wan, wan25, wav2lip (Hepsi 26-27 Haz'da derlendi)
- [x] Faz H: Frontend — StoryboardPanel (tab), CameraControlPanel, App.tsx entegrasyon (26 Haz)
- [x] Faz H: Timeline drag-reorder tum track + transition strip (26 Haz)
- [x] Faz K: Kapsamlı integration test full pipeline (3 test dosyası) — ✅ TAMAMLANDI

## ✅ Tamamlanan Major Fazlar

| Faz | Tarih |
|---|---|
| Split Screen FFmpeg & Glibc Fix | 25 Haz |
| Kredi Blokajı Sistemi (hold/confirm/refund + retry guard + queue-graph) | 26 Haz |
| Credit Blocking Refinements (retry_count guard, no refund on transient, queue-graph) | 26 Haz |
| Actions Runner Disk Alanı Optimizasyonu (Free disk space) | 25 Haz |
| Colab→Docker Migration | 21 Haz |
| SVD-XT + Sıralı Derleme | 19 Haz |
| v6.0 Core (32 Template, LangGraph 5-node, MuseTalk, Storyboard) | 15-20 Haz |
| Dockerfile Bağımlılık Düzeltmeleri (7 model, CUDA 11.x) | 21 Haz |
| GHCR Upload Notebook | 22 Haz |
| Phase H (Timeline + Post-Prod + StoryboardPanel + CameraControl) | 25-26 Haz |
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
| test_postproduction.spec.ts | 11 | ✅ |
| test_competitive_features.spec.ts | 29 | ✅ |
| test_narrativeAgents.spec.ts | 15 | ✅ |
| test_promptEnhancer.spec.ts | 10 | ✅ |
| test_color_grade.spec.ts | 9 | ✅ |
| test_differentiation.spec.ts | 6 | ⏸️ (AI-guarded, SKIP_AI_TESTS) |
| test_ai_helper.spec.ts | 4 | ⏸️ (AI-guarded) |
| test_prompt_services.spec.ts | 4 | ⏸️ (AI-guarded) |
| test_clipper_v2.spec.ts | 8 | ⏸️ (AI-guarded) |
| test_pipeline_integration.spec.ts | 11 | ✅ (yeni) |
| test_api_lifecycle.spec.ts | 21 | ✅ (yeni) |
| test_frontend_rendering.spec.ts | 11 | ✅ (yeni) |
| _diğer 22 test dosyası_ | ~280 | ✅ |
| **Toplam** | **524 ✅ / 34 ⏸️** (558 total) | |

---

## 🔴 Aktif İşler

### 💳 iyzico Ödeme — Canlı Test
- [ ] Sandbox merchant panel → API key + abonelik plan kodları
- [ ] Sanal kartla manuel checkout/webhook testi
- [x] Kredi blokajı (render başında bloke, bitince düş, iptalde refund)

### 🎬 Prompt Generation Control
- [ ] Short mode → prompt enhancer'ın doğru çalıştığından emin ol
- [ ] Film/Series mode → AI'nın anlatı yapısına uygun prompt ürettiğini doğrula
- [ ] Model-specific prompt'ların model_parameters_and_prompts.md şablonlarına uyduğunu kontrol et

### 🔒 Code Audit — Kalan Yüksek Öncelikler
- [x] `any` tip kullanımı yaygın — db.ts, queue.ts, middleware'lerdeki unused temizlendi
- [x] CSRF token rotation — başarılı state-changing POST'tan sonra token yenileniyor
- [x] `noUnusedLocals: true` + `noUnusedParameters: true` aktifleştirildi (60+ unused fix tamamlandı)

### 🔒 Code Audit — Kalan Orta/Düşük Öncelikler
- [x] Route modülerliği — server.ts'deki 60+ route yorum satırlarıyla gruplandırıldı
- [x] pino-http type uyumsuzluğu — `@types/pino` kaldırıldı (pino 9.x kendi tiplerini içeriyor)
- [x] Logger redact — `username` eklendi
- [x] Cookie `secure` — `COOKIE_SECURE` env ile yapılandırılabilir
- [x] Rate limit test bypass — `DISABLE_RATE_LIMIT` env ile devre dışı bırakılabilir
- [x] `convertQuery()` refactor — basitleştirildi, `@deprecated` notu eklendi, yeni sorgular PostgreSQL native formatında yazılacak

---

## ✅ Tamamlanan Faz M (28 Haz 2026)
- [x] modelPromptBuilder.ts — `buildModelPrompt()` her model için optimize prompt şablonu
- [x] runpodEndpoints.ts — defaultInput düzeltmeleri (fps/num_frames/width/height)
- [x] veo31 cloud API registry'e eklendi
- [x] queue.ts — modelType belirleme öne çekildi, modelPromptBuilder kullanılıyor
- [x] queue-graph.ts — modelPromptBuilder entegre edildi
- [x] Model Motoru dropdown canlandı: MODEL_ENGINE_OPTIONS (14 model), model_type backend'e gönderiliyor
- [x] App.tsx + routes/jobs.ts — model_type form/DB akışı tamam
- [x] tsc --noEmit 0 hata (backend + frontend)

## Notlar
- Docker Hub kullanılmaz. Tüm imajlar → GHCR (`ghcr.io/Arda-Avci/`)
- Medya dosyaları Backblaze B2'de saklanır
- Test: `npx vitest run`, typecheck: `npm run check:types`, lint: `npm run check:lint`
