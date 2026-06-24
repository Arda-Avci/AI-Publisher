# Yapılacaklar Listesi (TODO)

## 🟢 Aktif Oturum — CrewAI Senaryo Yazma Pipeline

### Faz A — Altyapı (🔄 Şu an)
- [ ] `npm install @crewai-ts/core @crewai-ts/gemini`
- [ ] `src/services/crewai/crewaiService.ts` — base wrapper, LLM provider binding

### Faz B — Agent Tanımları (Faz A sonrası paralel)
- [ ] `src/services/crewai/outlinerAgent.ts` — Konsept + karakter geliştirici
- [ ] `src/services/crewai/sceneArchitectAgent.ts` — Sahne planlayıcı
- [ ] `src/services/crewai/scriptwriterAgent.ts` — Diyalog/senaryo yazarı
- [ ] `src/services/crewai/reviewerAgent.ts` — Kalite kontrol/editör

### Faz C — Pipeline Orchestration
- [ ] `src/services/crewai/writerCrew.ts` — CrewAI Crew tanımı + revision loop
- [ ] `src/types/script.ts` — ScriptOutputSchema (Zod)

### Faz D — API + Frontend
- [x] `POST /api/v1/crew/write-script` endpoint
- [x] `GET /api/v1/crew/scripts` endpoint
- [x] `GET /api/v1/crew/scripts/:id` endpoint
- [x] DB migration: scripts tablosuna topic, full_script, revision_count kolonlari
- [ ] Frontend script form + preview (dashboard.ts)
- [ ] @KarakterAdı referans entegrasyonu

## 🟢 Tamamlanan Major Fazlar

| Faz | Tarih |
|-----|-------|
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
| **CrewAI Writer Pipeline** (Faz A-D) | 🔄 Aktif |

## 🟢 Mevcut AI Framework Durumu

| Framework | Durum | Açıklama |
|-----------|-------|----------|
| LangChain (`@langchain/core`) | ✅ Kurulu | `queue-graph.ts`, `agentGraph.ts`, `multiAgentPipeline.ts` |
| LangGraph (`@langchain/langgraph`) | ✅ Kurulu | `StateGraph` 8-node, `PostgresSaver` checkpointer |
| RAG (`ragScriptGenerator.ts`) | ✅ Mevcut | Gemini ile Zod şemalı RAG script üretimi, `/api/v1/vimax/rag-script` |
| CrewAI (npm) | ❌ Kurulu Değil | `contentTeam.ts` **CrewAI-style custom implementasyon** — kendi agent rolleri, direkt Gemini çağrısı, CrewAI kütüphanesi kullanılmaz |
| AutoGen (npm) | ❌ Yok | Projede hiç referans yok |

## 🟢 Test Dosyaları (24 adet)

| Dosya | Test Sayısı |
|-------|------------|
| test_characterGeneration.spec.ts | 12 |
| test_characterPresets.spec.ts | 24 |
| test_characterProfile.spec.ts | 20 |
| test_modelRouter.spec.ts | 27 |
| test_ai_helper.spec.ts | ? |
| test_beats.spec.ts | ? |
| test_characters.spec.ts | ? |
| test_clipper_services.spec.ts | ? |
| test_clipper_v2.spec.ts | ? |
| test_clipper_whisper.spec.ts | ? |
| test_color_grade.spec.ts | ? |
| test_core.spec.ts | ? |
| test_credits.spec.ts | ? |
| test_differentiation.spec.ts | ? |
| test_dubbing_viral.spec.ts | ? |
| test_e2e_features.spec.ts | ? |
| test_editor_services.spec.ts | ? |
| test_integration.spec.ts | ? |
| test_production_readiness.spec.ts | ? |
| test_prompt_services.spec.ts | ? |
| test_scripts.spec.ts | ? |
| test_split_screen.spec.ts | ? |
| test_subtitle_render.spec.ts | ? |
| test_videoutils.spec.ts | ? |
| test_viral_hook.spec.ts | ? |

### 📦 Docker İyileştirme Grubu (✅ Tamamlandı)
- [x] Base image `-runtime` → `-devel` (nvcc için)
- [x] `shared/utils.py` — upload_to_backblaze + vram_cleanup + download_from_b2
- [x] Tüm app.py'lerde `/content/` → `/workspace/outputs/` çıktı yolu fix
- [x] Tüm modellere `/preload` endpoint eklendi (cold start önleme)
- [x] `runpod_handler.py` — utils import + dynamic path mapping
- [x] Google Drive referansları temizlendi (lora-trainer)
- [x] GitHub Actions workflow — base → matrix child build → GHCR push
- [x] Tüm Dockerfile'lara `shared/` COPY eklendi

---

## 🔴 Aktif Bekleyen İşler

### ☁️ RunPod Altyapı + E2E Test (Faz 2)
- [ ] Network Volume'e model ağırlıklarını yükle (`/workspace/models`)
- [ ] Port yönlendirme testi (5001-5012), lazy-loading / VRAM kontrol
- [ ] RunPod callback (webhook) POST → diske yazma doğrulama

### 💳 iyzico Ödeme — Canlı Test (Faz 4)
- [ ] Sandbox merchant panel → API key + abonelik plan kodları oluştur
- [ ] Sanal kartla manuel checkout/webhook testi
- [ ] Kredi blokajı (render başında bloke, bitince düş, iptalde refund)
- [ ] Kredi sıfırlanınca form kilitleme

### 🧪 E2E Playwright Test (Faz 7D)
- [ ] 7 E2E test: login, yeni proje, galeri, başlık düzenleme, publish, progress bar, responsive

### 📦 GHCR Docker Imajları → RunPod Bağlantısı
- [ ] 7 model (SadTalker, DynamiCrafter, Zeroscope, Video-ReTalking, GeneFace++, Mochi-1, Pyramid-Flow) Dockerfile'ları hazır, ContainerManager entegrasyonu + endpoint oluşturma kaldı

### 🗑️ Teknik Borç (✅ Tamamlandı)
- [x] `src/lib/tracing.ts` — OTLP span export → `telemetry.ts`'ye entegre edildi (`initTracing()` çağrısı)
- [x] Eski test fixture'ları temizlik — 7 orphan dosya silindi (s.mp4, p.mp4, video_exists.mp4, test_video_exists.mp4, 2×whisper_audio, input_exists_hook_preview.mp4)
- [x] Kırık/eskimiş testler onarımı — silent pass anti-pattern `it.runIf()` ile değiştirildi

---

## 📝 Notlar
- Docker Hub kullanılmaz. Tüm imajlar → GHCR (`ghcr.io/Arda-Avci/`) → GitHub Actions ile build → RunPod'da çalışır
- Üretilen medya dosyaları Backblaze B2'de saklanır
- Test için: `npx vitest run`, typecheck: `npm run check:types`, lint: `npm run check:lint`
