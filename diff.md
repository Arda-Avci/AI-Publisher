# Diff Log — Session 2026-06-30

## Faz 6A: Directory constants migration
- `src/constants.ts` oluşturuldu (DIRECTORIES, PORTS, FILE_LIMITS, TIMEOUT, RETRY, SCENE_DEFAULTS, AI_DEFAULTS, CREDIT_DEFAULTS, DOCKER_PORTS, IYZICO, CALLBACK, B2_DEFAULTS, RUNPOD, SOCIAL_URLS, YOUTUBE, GEMINI_API, FONTS, CLEANUP, CREDIT_COSTS, PUBLISH, QUEUE, NEO4J, RATE_LIMIT)
- 39 dosyada `'videolar'` → `DIRECTORIES.VIDEO_OUTPUT`, `'uploads'` → `DIRECTORIES.UPLOADS`
- `scripts/migrate_constants.py` — batch string migration
- tsc 0 hata, eslint 0 hata

## Faz 6B: Port defaults migration
- 5 dosyada `process.env.PORT || 4000` → `process.env.PORT || PORTS.SERVER`
- `scripts/add_port_constants.py` + `scripts/fix_missing_port_imports.py`
- tsc 0 hata

## Faz 6C: TIMEOUT migration
- `src/constants.ts` — TIMEOUT genişletildi (HEAVY_GEN, BROWSER_NAV, BROWSER_WAIT, BROWSER_UPLOAD, FFMPEG, EXEC_QUICK, API_FETCH, DOCKER_CHECK, PIPECAT_HEALTH, LORA_CHECK, HEAVY_POLL, POLL_TASK)
- 33 dosyada hardcoded timeout değerleri → `TIMEOUT.*`
- `scripts/migrate_timeouts.py`
- tsc 0 hata, eslint 0 hata

## Faz 6D: Kalan constants migration
- **FILE_LIMITS**: 5 dosyada `500*1024*1024` → `FILE_LIMITS.MAX_VIDEO_UPLOAD`, `10*1024*1024` → `FILE_LIMITS.MAX_CHARACTER_IMAGE`
- **RETRY**: 2 dosyada `maxRetries=60` → `RETRY.INPAINT_POLL`, `maxRetries=120` → `RETRY.V2V_POLL`
- **CREDIT_DEFAULTS**: `db.ts`'de SQL string'lerde `10000` → `${CREDIT_DEFAULTS.ADMIN_SEED_CREDITS}` (template literal)
- **RATE_LIMIT**: `middleware/rate-limit.ts`'de `windowMs: 60*1000` → `RATE_LIMIT.HEAVY_WINDOW_MS`, `windowMs: 15*60*1000` → `RATE_LIMIT.AUTH_WINDOW_MS`
- **DOCKER_PORTS**: `lib/docker-host.ts`'de 26 adet `port: 50xx` → `DOCKER_PORTS.*`
- `scripts/migrate_constants_6d.py`
- tsc 0 hata

## Faz 7A: .env.example reorganizasyonu
- 23 bölümlü gruplama (CORE, ENCRYPTION, DEPLOYMENT, DATABASE, NEO4J, AI PROVIDERS, B2, RUNPOD, CLOUD VIDEO API, GOOGLE VEO, IYZICO, SMTP, TREND SCHEDULER, OPENTELEMETRY, MULTI-AGENT, SPORTOTO, BROWSER-USE)

## Faz 7B: src/env.ts (minimal env wrapper)
- `requiredEnv()` helper (production'da missing env → throw)
- `env` object: typed accessor'lar, constants.ts'den default'lar, boolean parsing
- Kritik env'ler (SESSION_SECRET, ENCRYPTION_KEY) production'da validate edilir
- `env.PORT` → defaults to `PORTS.SERVER`, `env.CALLBACK_TOKEN` → defaults to `CALLBACK.DEFAULT_TOKEN`
- Varolan `process.env.X`'leri DEĞİŞTİRMEZ (sadece yeni kodda kullanılabilir)
- tsc 0 hata, eslint 0 hata

## Scripts
- `scripts/migrate_constants.py` — directory string migration
- `scripts/migrate_timeouts.py` — timeout migration (33 dosya)
- `scripts/migrate_constants_6d.py` — 6D constants migration (9 dosya)
- `scripts/add_port_constants.py` — port default migration
- `scripts/fix_missing_port_imports.py` — port import fix
- `scripts/fix_db_credits.py` — db.ts template literal fix
- `scripts/fix_rate_limit_import.py` — rate-limit.ts import fix
- `scripts/fix_import_paths_6d.py` — subdirectory import path fix
- `scripts/find_missing_constants.py` — missing constants search

## Faz Z3: Self-Contained Dockerfile FROM Fix (1 Tem 2026)
- **Bug**: `scripts/gen_selfcontained_dockerfiles.ps1` template'inde `FROM` satırı yoktu
- **Fix**: Script'e `$fromMap` dictionary eklendi (Grup A/B/C → torch 2.2.1/2.6.0/2.8.0)
- **23 Dockerfile yeniden yazıldı** — her birine doğru `FROM pytorch/pytorch:X.Y.Z-cudaXX.X-cudnnX-runtime`
- **Etkilenen dosyalar**:
  - `scripts/gen_selfcontained_dockerfiles.ps1` — FROM mapping + template fix
  - `colab_docker/{23-model}/Dockerfile` — FROM satırı eklendi
  - `PROJECT_STATUS.md` — Faz Z3 eklendi
  - `TODO.md` — Faz Z3 eklendi
  - `Memory_Bank.md` — Session 5 güncellendi
