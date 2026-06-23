# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Lessons Learned (Repeat Offenses)

### LangGraph State Generic Type
`StateGraph<typeof QueueState.StateType>` → tsc generic constraint hatası. Çözüm: `GraphState` type alias + `as any` casts on `addEdge`, `compile`, `getState`, `invoke`. LangGraph type inference node names only allows `__start__`/`__end__` on `addEdge` without `as any`.

### Veo 3.1 RunPod Bypass
`modelType.includes('veo-31')` kontrolü `generateVideo` dallanmasından sonra değil önce yapılmalı. RunPod dispatch zinciri tamamen atlanır. taskId simülasyonu: `veo31_{jobId}_{sceneNum}`.

### LangGraph Checkpointer Setup
`PostgresSaver.fromConnString()` sonrası `await checkpointer.setup()` çağrılmalı (otomatik tablo oluşturma). `thread_id: "job_{jobId}"` config ile checkpoint'leme.

### never `except Exception: pass`
Try/catch bloklarında `except Exception: pass` kullanma — sessizce hata yutar, token/secret bulamama sebebini gizler. Hep `except Exception as e: print(e)` yap.
- **Örnek**: `colab_docker_build.ipynb` — `userdata.get("GITHUB_PAT")` başarısız oluyor ama `pass` yüzünden kimse görmüyor. 2 kez düzeltildi.
- Docker/RunPod container'larında da aynı kural geçerli.

### Environment Variable Name Case-Sensitive
`GITHUB_PAT` != `github_pat` != `Github_Pat`. Kullanıcı hangi isimle kaydettiğini bilmeyebilir. Her zaman 3 varyant dene: `GITHUB_PAT`, `GITHUB_TOKEN`, `GH_TOKEN`.

### Path: Always check file existence before operations
Before reading/moving/writing files, always verify path exists. Don't assume Docker images, auth files, or temp dirs exist.

### Don't Guess Root Cause — Read Code First
Error görünce tahmin etme, önce kodu oku. `except Exception: pass` gibi kalıpları ara. "notebook access kapalı" tahmini yanlıştı — asıl sebep sessiz `pass`'ti.

## Project Overview

AI-Publisher is a Node.js/Express video publishing automation platform that generates AI-powered social media videos (YouTube Shorts, TikTok, X, Meta Reels) using Docker/RunPod GPU workers, Playwright, RabbitMQ, Redis, PostgreSQL, and FFmpeg. It features a dashboard studio with a glassmorphism/cyberpunk aesthetic, multi-language support (tr/en), premium theme system, and a "Fırsatlar Hunisi" (Opportunity Funnel) for discovering & differentiating viral YouTube videos.

## Tech Stack

- **Backend**: Express 5, TypeScript 6, pg (PostgreSQL connection pool), express-session, bcrypt
- **Caching & Pub/Sub**: Redis (Pub/Sub for SSE messaging, RedisMutex for distributed GPU locks)
- **Message Queue**: RabbitMQ (Event-driven queue: `video_jobs_queue`, `publish_jobs_queue`)
- **Frontend**: Vanilla HTML/CSS/JS (no framework) — single-page dashboard served as inline HTML strings from `src/views/dashboard.ts`
- **AI Integration**: `@ai-sdk/google` (Gemini 2.5 Flash), `@ai-sdk/openai` (Minimax M3 OpenAI provider)
- **Video Processing**: Playwright (chromium) for social media posting, FFmpeg & FFprobe for muxing/shorts/watermarks
- **Storage**: Unified `IStorage` interface (`LocalStorageProvider` default, Cloud-ready)
- **Auth**: bcrypt password hashing, session-based auth (session secret required)

## Commands

```bash
# Start development server (port 3016)
npm run dev        # tsx watch mode (auto-reload on file change)
npm start          # tsx (single run)
npm run check      # typecheck + test + lint (vitest run)
npm run check:types # tsc typecheck
npm run format     # prettier format
npm run check:lint # eslint check
```

## Architecture

- `src/server.ts` — Express app entry point. Sets up database, RabbitMQ channel, Redis connection, and registers modular routes.
- `src/db.ts` — PostgreSQL pool initializer. Includes a SQL converter to translate SQLite syntax (`?` parameterization) for PostgreSQL compatibility.
- `src/queue.ts` — RabbitMQ worker for video production jobs. Coordinates scene generation with Colab Flask endpoints and compiles final videos using FFmpeg helpers.
- `src/publisher.ts` — Playwright upload functions for YouTube, TikTok, X, and Meta.
- `src/services/runpod.ts` — Coordinates RunPod endpoint lifecycle (start, stop, status polling, webhook registration).
- `src/services/veo31.ts` — Google Vertex AI Veo 3.1 REST API wrapper. Direkt API çağrısı (RunPod bypass). `generateVideo(imageUrl, prompt, aspectRatio)`, operation polling (5dk timeout, 5sn interval).
- `src/queue-graph.ts` — LangGraph StateGraph (8 node: directorPlanning→sceneGeneration→coverSynthesis→loraTraining→sceneRender→ffmpegMix→concatFinal→publishSocial). PostgresSaver checkpointer. `OTEL_QUEUE_GRAPH=true` env var ile aktif.
- `src/services/trendAnalyzer.ts` — Playwright ile 4 platform trend scraping (TikTok, YouTube, X, Instagram).
- `src/services/trendScheduler.ts` — Interval-based trend tarama scheduler (env var periyot, varsayılan 30dk).
- `src/lib/telemetry.ts` — OpenTelemetry NodeSDK (HTTP, Express, PG, ioredis, amqplib instrumentasyonları).
- `src/lib/metrics.ts` — Prometheus domain metrikleri (job duration, scene counter, render time, active/failed jobs).
- `src/lib/differentiate.ts` — Orchestrator for Fırsatlar Hunisi viral video transcript extraction & Gemini rewrite.
- `src/lib/publish-queue.ts` — RabbitMQ queue for publishing videos to prevent concurrent Playwright browsers from overloading RAM.
- `src/services/videoService.ts` — Contains reusable FFmpeg wrappers (dikey conversion, end screen, sound effects mix).
- `src/services/aiService.ts` — Houses centralized AI generation schemes and retry utilities.

## Dashboard Design System

8 premium themes (nebula, forest, corporate, midnight, sunset, ocean, cyberpunk, matrix) + light/dark mode. HSL CSS variables: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`.

Theme application: `<html class="dark theme-{themeId}">`.

## Multi-Language (i18n)

Handled via middleware `src/middleware/i18n.ts` using locales `src/messages/tr.json` and `src/messages/en.json`. User choice saved to `users.preferred_language`.

## Database Schema (PostgreSQL)

```sql
users: id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT, youtube_api_key TEXT,
       sample_cover_base64 TEXT, personal_avatar_base64 TEXT, text_position_grid TEXT,
       default_preset_tone TEXT, preferred_language TEXT DEFAULT 'tr', selected_theme TEXT,
       apply_lipsync INTEGER DEFAULT 1, apply_end_screen INTEGER DEFAULT 1,
       credits INTEGER DEFAULT 100, monthly_credit_limit INTEGER DEFAULT 100,
       credit_reset_date TIMESTAMP, brand_logo_base64 TEXT, brand_primary_color TEXT DEFAULT '#00F2FE',
       brand_secondary_color TEXT DEFAULT '#9B51E0', brand_font_path TEXT, personal_voice_base64 TEXT

video_jobs: id SERIAL PRIMARY KEY, user_id INTEGER, master_prompt TEXT, production_notes TEXT,
             character_features TEXT, material_path TEXT, estimated_minutes REAL, total_scenes INTEGER,
             completed_scenes INTEGER DEFAULT 0, current_stage TEXT DEFAULT 'Kuyrukta',
             progress_percent INTEGER DEFAULT 0, final_filename TEXT, status TEXT DEFAULT 'pending',
             target_platforms TEXT, yt_title TEXT, yt_desc TEXT, yt_tags TEXT, yt_status TEXT,
             tt_desc TEXT, tt_tags TEXT, tt_status TEXT, x_desc TEXT, x_tags TEXT, x_status TEXT,
             meta_desc TEXT, meta_tags TEXT, meta_status TEXT, playlist_id TEXT, cover_image_path TEXT,
             has_shorts INTEGER DEFAULT 1, has_subtitles INTEGER DEFAULT 1, source_video_id TEXT,
             source_video_meta TEXT, differentiation_target_lang TEXT, differentiation_duration_mode TEXT,
             transcript TEXT, transcript_cleaned TEXT, transcript_translated TEXT, scene_prompts TEXT,
             colab_task_id TEXT, tts_provider TEXT DEFAULT 'xtts', tts_voice TEXT DEFAULT 'Claribel Dervla',
             model_type TEXT DEFAULT 'CogVideoX-5b', production_template TEXT DEFAULT 'cinematic',
             brand_kit_enabled INTEGER DEFAULT 0, dubbing_lang TEXT, kinetic_subtitles INTEGER DEFAULT 0,
             viral_score INTEGER, auto_sfx_placement INTEGER DEFAULT 0, audio_ducking INTEGER DEFAULT 0

audit_log: id SERIAL PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL, entity_type TEXT,
           entity_id INTEGER, details TEXT, ip_address TEXT, user_agent TEXT, created_at TIMESTAMP
```

## Important Flow Notes

### Video Differentiation (4 phases)
1. **Phase 1** (`POST /differentiate-video`): YouTube transcript + Gemini translation → INSERT job (`awaiting_approval`).
2. **Phase 2**: User edits translation text in UI.
3. **Phase 3** (`POST /approve-translation/:jobId`): Gemini generates scene prompts → UPDATE job (`scene_prompts` & status `pending`).
4. **Phase 4**: User starts the job → Enqueued to RabbitMQ worker → RunPod endpoint is triggered.

### Model Routing (queue.ts)
- `production_template` → `modelType` → `endpointId` (RunPod). Veo-31 bu zinciri kırar: direkt Vertex AI REST API.
- RunPod dispatch: `runpod.ts` → endpoint → webhook callback → B2 download → FFmpeg mix.
- Docker container fallback: ContainerManager port (5001-5023) HTTP polling.

### LangGraph Queue (queue-graph.ts)
- `OTEL_QUEUE_GRAPH=true` env var ile aktif. Fallback: queue.ts.
- 8-node StateGraph, PostgresSaver checkpointer, crash recovery.
- `runJobGraph(jobId)` — yeni iş başlatma. `resumeJobGraph(jobId)` — kaldığı yerden devam.
- Her node `broadcastProgress` ile SSE güncellemesi gönderir.
- Node'lar şu an stub; gerçek servislere bağlanması gerekli (generateStudioScenes, RenderClient.dispatch, videoService.concatVideosWithCrossfade, publisher.ts).

### SSE Implementation
Real-time progress updates are sent via Server-Sent Events utilizing Redis Pub/Sub to allow horizontal scaling of Node processes.
- SSE endpoint `/progress/:id` listens for Redis messages and feeds them to EventSource.
