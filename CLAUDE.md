# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-Publisher is a Node.js/Express video publishing automation platform that generates AI-powered social media videos (YouTube Shorts, TikTok, X, Meta Reels) using Google Colab GPU, Playwright, and FFmpeg. It features a dashboard studio with a glassmorphism/cyberpunk aesthetic, multi-language support (tr/en), premium theme system, and a "Fırsatlar Hunisi" (Opportunity Funnel) for discovering & differentiating viral YouTube videos.

## Tech Stack

- **Backend**: Express 5, TypeScript, SQLite (`sqlite` + `sqlite3`), express-session, bcrypt
- **Frontend**: Vanilla HTML/CSS/JS (no framework) — single-page dashboard served as inline HTML strings from `src/server.ts`
- **AI Integration**: `@ai-sdk/google` + `ai` SDK (Gemini 2.5 Flash) for director plans, text cleaning, translation, scene prompt generation
- **Video Processing**: Playwright (chromium) for social media posting, FFmpeg for muxing/shorts
- **YouTube Transcript**: `youtube-transcript` npm package
- **Auth**: bcrypt password hashing, session-based auth
- **Dev**: tsx (watch mode available)

## Commands

```bash
# Start development server (port 3014)
npm run dev        # tsx watch mode (auto-reload on file change)
npm start          # tsx (single run)
npm run typecheck  # tsc --noEmit
npm run build      # tsc emit
npm install        # install all deps including youtube-transcript
```

## Architecture

- `src/server.ts` — Express app, all HTML/CSS/JS dashboard inline as template literal strings. Routes: `/`, `/login`, `/create-job`, `/save-meta/:id`, `/publish/:id/:platform`, `/progress/:id`, `/delete-job/:id`, `/retry-job/:id`, `/start-job/:jobId`, `/settings`, `/save-settings`, `/opportunity-videos`, `/differentiate-video`, `/approve-translation/:jobId`, `/differentiate-cancel/:jobId`
- `src/lib/transcript.ts` — YouTube transcript extraction (local)
- `src/lib/translation.ts` — Gemini-based text cleaning + translation + scene prompt generation (local)
- `src/lib/differentiate.ts` — Orchestrator for 2-phase video differentiation
- `src/db.ts` — SQLite initialization with idempotent `CREATE TABLE IF NOT EXISTS` + try/catch `ALTER TABLE` migrations
- `src/queue.ts` — Job queue + SSE `clients` Map; `checkQueue()` only picks up `status='pending'` rows
- `src/publisher.ts` — Playwright upload functions
- `database.sqlite` — SQLite DB (gitignored)
- `uploads/`, `videolar/` — Reference images and generated videos

## Dashboard Design System

8 premium themes (nebula, forest, corporate, midnight, sunset, ocean, cyberpunk, matrix) + light/dark mode. HSL CSS variables: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--cyan`, `--cyan-foreground`, `--radius`.

Theme application: `<html class="dark theme-{themeId}">`.

## Multi-Language (i18n)

`TRANSLATIONS` map at top of `server.ts`, keys `tr` and `en`. Per-user via `users.preferred_language`. Switch via `/save-settings` → page reload.

## Modals (in dashboard)

- **Settings** — sidebar tabs (Appearance, Language, Account, Production) with premium theme cards + iOS-style toggles
- **Help** — search-filtered topic list
- **Opportunity Funnel** — 2-step: interest + language selection → 20 real YouTube videos in horizontal scroll
- **Differentiation** — 2-step inside funnel: settings (target lang + duration) → translation review (editable) → approve

## Database Schema

```sql
users: id, username, password, youtube_api_key, sample_cover_base64, personal_avatar_base64,
       text_position_grid, default_preset_tone, preferred_language (default 'tr'), selected_theme

video_jobs: id, user_id, master_prompt, production_notes, character_features, material_path,
            estimated_minutes, total_scenes, completed_scenes, current_stage, progress_percent,
            final_filename, status ('awaiting_approval'|'pending'|'processing'|'completed'|'failed'),
            target_platforms (JSON), yt/tt/x/meta title/desc/tags/status, ...
            playlist_id, cover_image_path, has_shorts, has_subtitles,
            -- Differentiation columns (S2.5+):
            source_video_id, source_video_meta (JSON),
            differentiation_target_lang, differentiation_duration_mode,
            transcript, transcript_cleaned, transcript_translated, scene_prompts (JSON)
```

## Important Flow Notes

### Video Differentiation (4 phases)
1. **Phase 1** (`POST /differentiate-video`): extract YouTube transcript + Gemini clean + Gemini translate → INSERT job with `status='awaiting_approval'`. NO Colab start.
2. **Phase 2** (frontend review): user edits translated text in textarea.
3. **Phase 3** (`POST /approve-translation/:jobId`): Gemini generates scene prompts from edited text → UPDATE job with `scene_prompts` + `status='pending'` + prefilled `master_prompt`/`production_notes`. NO Colab start.
4. **Phase 4** (`POST /start-job/:jobId`): user clicks "▶ Projeyi Başlat" on dashboard → `checkQueue()` → Colab starts.

Cancellation: `POST /differentiate-cancel/:jobId` deletes `awaiting_approval` jobs.

### Job Status State Machine
```
[new] → awaiting_approval → pending → processing → completed/failed
                            (manual)         (checkQueue)
```
- `checkQueue()` in `queue.ts:102` filters `WHERE status = 'pending'` — `awaiting_approval` jobs sit idle
- Differentiation jobs NEVER auto-start Colab
- User must click "Projeyeyi Başlat" button on dashboard

### Pre-publish Auth Check
`POST /publish/:id/:platform` first checks if `auth_<platform>.json` exists in CWD. If missing, returns `{success:false, error:'AUTH_MISSING'}` — no Playwright launch.

### Security
- All job-mutating routes (`/delete-job/:id`, `/retry-job/:id`, `/publish/:id/:platform`, `/start-job/:jobId`, `/approve-translation/:jobId`, `/differentiate-cancel/:jobId`) verify `user_id = req.session.userId` before any action
- Avatar base64: `loadSettings()` writes existing avatar to hidden input; `saveSettings()` only includes in payload if user uploaded a new file
- Global `Content-Type: text/html; charset=utf-8` header via middleware for Turkish character support

### SSE Implementation
- `GET /progress/:id` registers response in `clients` Map; `req.on('close')` cleans up
- No auth on SSE endpoint (job ID opacity is the only protection — consider adding session check)
- Client opens one `EventSource` per active job; auto-reload on completion
