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

## Faz Z4: Modal 3-Service Architecture & CRASH-LOOP Fix (1 Tem 2026)
- **Architecture**: 25 per-model Modal app → 3 servis (`audio_service.py`, `image_service.py`, `video_service.py`)
- **Core Fix**: `_run_generate` — `app.generate()` (yok) → `flask_mod.app.test_client().post(route, json=payload)`
- **Weight download graceful skip**: `_ensure_weights` `except Exception` ile HF auth hatası yutulur
- **HF_TOKEN case fix**: `modal_apps/__init__.py` — `os.environ.get("HF_TOKEN") or os.environ.get("hf_token", "")`
- **geneface fix**: `subprocess.run(timeout=120)` + checkpoint kontrol + `2>/dev/null` kaldirildi + `boto3+botocore`
- **video-retalking fix**: `boto3+botocore` eklendi (CUDA 11.8 korundu)
- **browser-use fix**: `flask` + `CMD ["python", "app.py"]` eklendi
- **Test timeout**: 300→600s
- **Test results**: 8 PASS (kokoro, xtts, whisper, f5tts, audioldm2, wav2lip, sadtalker, musetalk), 6 FAIL/untested
- **Etkilenen dosyalar**:
  - `modal_apps/audio_service.py` — `_run_generate` test_client pattern
  - `modal_apps/image_service.py` — ayni pattern
  - `modal_apps/video_service.py` — ayni pattern
  - `modal_apps/__init__.py` — HF_TOKEN case fix
  - `colab_docker/geneface/app.py` — timeout + checkpoint
  - `colab_docker/geneface/Dockerfile` — boto3 + `2>/dev/null` kaldir
  - `colab_docker/video-retalking/Dockerfile` — boto3
  - `colab_docker/browser-use/Dockerfile` — flask + CMD
  - `scripts/test_modal_sequential.py` — TIMEOUT 600
  - `PROJECT_STATUS.md` — Faz Z4 eklendi
  - `TODO.md` — Faz Z4+Z5 eklendi
  - `Memory_Bank.md` — Session 6 yeniden yazildi
  - `diff.md` — bu guncelleme
