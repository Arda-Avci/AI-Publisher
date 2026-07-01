# Diff Log â€” Session 2026-06-30

## Faz 6A: Directory constants migration
- `src/constants.ts` oluÅŸturuldu (DIRECTORIES, PORTS, FILE_LIMITS, TIMEOUT, RETRY, SCENE_DEFAULTS, AI_DEFAULTS, CREDIT_DEFAULTS, DOCKER_PORTS, IYZICO, CALLBACK, B2_DEFAULTS, RUNPOD, SOCIAL_URLS, YOUTUBE, GEMINI_API, FONTS, CLEANUP, CREDIT_COSTS, PUBLISH, QUEUE, NEO4J, RATE_LIMIT)
- 39 dosyada `'videolar'` â†’ `DIRECTORIES.VIDEO_OUTPUT`, `'uploads'` â†’ `DIRECTORIES.UPLOADS`
- `scripts/migrate_constants.py` â€” batch string migration
- tsc 0 hata, eslint 0 hata

## Faz 6B: Port defaults migration
- 5 dosyada `process.env.PORT || 4000` â†’ `process.env.PORT || PORTS.SERVER`
- `scripts/add_port_constants.py` + `scripts/fix_missing_port_imports.py`
- tsc 0 hata

## Faz 6C: TIMEOUT migration
- `src/constants.ts` â€” TIMEOUT geniÅŸletildi (HEAVY_GEN, BROWSER_NAV, BROWSER_WAIT, BROWSER_UPLOAD, FFMPEG, EXEC_QUICK, API_FETCH, DOCKER_CHECK, PIPECAT_HEALTH, LORA_CHECK, HEAVY_POLL, POLL_TASK)
- 33 dosyada hardcoded timeout deÄŸerleri â†’ `TIMEOUT.*`
- `scripts/migrate_timeouts.py`
- tsc 0 hata, eslint 0 hata

## Faz 6D: Kalan constants migration
- **FILE_LIMITS**: 5 dosyada `500*1024*1024` â†’ `FILE_LIMITS.MAX_VIDEO_UPLOAD`, `10*1024*1024` â†’ `FILE_LIMITS.MAX_CHARACTER_IMAGE`
- **RETRY**: 2 dosyada `maxRetries=60` â†’ `RETRY.INPAINT_POLL`, `maxRetries=120` â†’ `RETRY.V2V_POLL`
- **CREDIT_DEFAULTS**: `db.ts`'de SQL string'lerde `10000` â†’ `${CREDIT_DEFAULTS.ADMIN_SEED_CREDITS}` (template literal)
- **RATE_LIMIT**: `middleware/rate-limit.ts`'de `windowMs: 60*1000` â†’ `RATE_LIMIT.HEAVY_WINDOW_MS`, `windowMs: 15*60*1000` â†’ `RATE_LIMIT.AUTH_WINDOW_MS`
- **DOCKER_PORTS**: `lib/docker-host.ts`'de 26 adet `port: 50xx` â†’ `DOCKER_PORTS.*`
- `scripts/migrate_constants_6d.py`
- tsc 0 hata

## Faz 7A: .env.example reorganizasyonu
- 23 bÃ¶lÃ¼mlÃ¼ gruplama (CORE, ENCRYPTION, DEPLOYMENT, DATABASE, NEO4J, AI PROVIDERS, B2, RUNPOD, CLOUD VIDEO API, GOOGLE VEO, IYZICO, SMTP, TREND SCHEDULER, OPENTELEMETRY, MULTI-AGENT, SPORTOTO, BROWSER-USE)

## Faz 7B: src/env.ts (minimal env wrapper)
- `requiredEnv()` helper (production'da missing env â†’ throw)
- `env` object: typed accessor'lar, constants.ts'den default'lar, boolean parsing
- Kritik env'ler (SESSION_SECRET, ENCRYPTION_KEY) production'da validate edilir
- `env.PORT` â†’ defaults to `PORTS.SERVER`, `env.CALLBACK_TOKEN` â†’ defaults to `CALLBACK.DEFAULT_TOKEN`
- Varolan `process.env.X`'leri DEÄÄ°ÅTÄ°RMEZ (sadece yeni kodda kullanÄ±labilir)
- tsc 0 hata, eslint 0 hata

## Scripts
- `scripts/migrate_constants.py` â€” directory string migration
- `scripts/migrate_timeouts.py` â€” timeout migration (33 dosya)
- `scripts/migrate_constants_6d.py` â€” 6D constants migration (9 dosya)
- `scripts/add_port_constants.py` â€” port default migration
- `scripts/fix_missing_port_imports.py` â€” port import fix
- `scripts/fix_db_credits.py` â€” db.ts template literal fix
- `scripts/fix_rate_limit_import.py` â€” rate-limit.ts import fix
- `scripts/fix_import_paths_6d.py` â€” subdirectory import path fix
- `scripts/find_missing_constants.py` â€” missing constants search

## Faz Z3: Self-Contained Dockerfile FROM Fix (1 Tem 2026)
- **Bug**: `scripts/gen_selfcontained_dockerfiles.ps1` template'inde `FROM` satÄ±rÄ± yoktu
- **Fix**: Script'e `$fromMap` dictionary eklendi (Grup A/B/C â†’ torch 2.2.1/2.6.0/2.8.0)
- **23 Dockerfile yeniden yazÄ±ldÄ±** â€” her birine doÄŸru `FROM pytorch/pytorch:X.Y.Z-cudaXX.X-cudnnX-runtime`
- **Etkilenen dosyalar**:
  - `scripts/gen_selfcontained_dockerfiles.ps1` â€” FROM mapping + template fix
  - `docker_image/{23-model}/Dockerfile` â€” FROM satÄ±rÄ± eklendi
  - `PROJECT_STATUS.md` â€” Faz Z3 eklendi
  - `TODO.md` â€” Faz Z3 eklendi
  - `Memory_Bank.md` â€” Session 5 gÃ¼ncellendi

## Faz Z4: Modal 3-Service Architecture & CRASH-LOOP Fix (1 Tem 2026)
- **Architecture**: 25 per-model Modal app â†’ 3 servis (`audio_service.py`, `image_service.py`, `video_service.py`)
- **Core Fix**: `_run_generate` â€” `app.generate()` (yok) â†’ `flask_mod.app.test_client().post(route, json=payload)`
- **Weight download graceful skip**: `_ensure_weights` `except Exception` ile HF auth hatasÄ± yutulur
- **HF_TOKEN case fix**: `modal_apps/__init__.py` â€” `os.environ.get("HF_TOKEN") or os.environ.get("hf_token", "")`
- **geneface fix**: `subprocess.run(timeout=120)` + checkpoint kontrol + `2>/dev/null` kaldirildi + `boto3+botocore`
- **video-retalking fix**: `boto3+botocore` eklendi (CUDA 11.8 korundu)
- **browser-use fix**: `flask` + `CMD ["python", "app.py"]` eklendi
- **Test timeout**: 300â†’600s
- **Test results**: 8 PASS (kokoro, xtts, whisper, f5tts, audioldm2, wav2lip, sadtalker, musetalk), 6 FAIL/untested
- **Etkilenen dosyalar**:
  - `modal_apps/audio_service.py` â€” `_run_generate` test_client pattern
  - `modal_apps/image_service.py` â€” ayni pattern
  - `modal_apps/video_service.py` â€” ayni pattern
  - `modal_apps/__init__.py` â€” HF_TOKEN case fix
  - `docker_image/geneface/app.py` â€” timeout + checkpoint
  - `docker_image/geneface/Dockerfile` â€” boto3 + `2>/dev/null` kaldir
  - `docker_image/video-retalking/Dockerfile` â€” boto3
  - `docker_image/browser-use/Dockerfile` â€” flask + CMD
  - `scripts/test_modal_sequential.py` â€” TIMEOUT 600
  - `PROJECT_STATUS.md` â€” Faz Z4 eklendi
  - `TODO.md` â€” Faz Z4+Z5 eklendi
  - `Memory_Bank.md` â€” Session 6 yeniden yazildi
  - `diff.md` â€” bu guncelleme

## Faz Z6: TasarÄ±m AjanÄ± (Design Agent) Kurulumu (01 Tem 2026)
- **Yenilik**: Otonom TasarÄ±m AjanÄ± (Design Agent) altyapÄ±sÄ± kuruldu.
- **Skill**: `.agents/skills/design-agent/SKILL.md` yÃ¶nergeleri yazÄ±ldÄ±.
- **Scripts**:
  - `analyze_pages.js` â€” Sayfa ve CSS deÄŸiÅŸken analizi yapan script.
  - `generate_proposal.js` â€” Alternatifli (A/B) tasarÄ±m teklifi Ã¼reten script.
  - `apply_design.js` â€” Onaylanan alternatifi entegre eden (inline style yutan) script.
- **Test**: `LoginPage.tsx` Ã¼zerinde Alternatif A baÅŸarÄ±yla uygulandÄ± ve `client/src/index.css` dosyasÄ±na premium sÄ±nÄ±flar eklendi.
- **Tip GÃ¼venliÄŸi**: DeÄŸiÅŸiklik sonrasÄ± `npm run check:types` sÄ±fÄ±r hata ile tamamlandÄ±.
- **Etkilenen Dosyalar**:
  - `client/src/components/LoginPage.tsx` â€” inline style'lar temizlendi, premium class'lar giydirildi.
  - `client/src/index.css` â€” premium LoginPage stilleri eklendi.
