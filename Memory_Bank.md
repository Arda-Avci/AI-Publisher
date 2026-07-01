# Memory Bank — 2026-07-01 (Session 6)

## Son Oturum (1 Tem — Modal 3-Service Architecture)

### Karar: Per-Model → 3-Service
- **25 per-model Modal app** → **3 servis**: `ai-publisher-audio` (11), `ai-publisher-image` (2), `ai-publisher-video` (12)
- Base imajlar terk edildi, her model kendi `FROM pytorch/pytorch:X.Y.Z`
- 3 torch grubu: A (2.2.1/cuda12.1), B (2.6.0/cuda12.4), C (2.8.0/cuda12.6)
- GHCR imajlari GitHub Actions ile build → Modal `Image.from_registry()` kullanir

### Core Fix: Flask test_client
- **Bug**: Tüm `app.py` Flask sunucusu, `generate()` fonksiyonu yok → `AttributeError`
- **Fix**: `app.generate()` → `flask_mod.app.test_client().post(route, json=payload)`
- Route discovery: `url_map.iter_rules()` ile ilk POST route
- 3 serviste de uygulandi (audio/image/video)

### Weight Download Graceful Skip
- `_ensure_weights` `except Exception` ile HF 401/auth hatalarini yutup Docker-bundled weight'lere dusuyor
- `HF_TOKEN` case fix: `__init__.py` case-insensitive lookup

### Test Sonuçlari
**PASS (8)**: kokoro(2s), xtts(11s), whisper(8s), f5tts(12s), audioldm2(17s), wav2lip(18s), sadtalker(15s), musetalk(56s)

**FAIL (6)**:
- geneface: DNS timeout (git clone), subprocess timeout 120s fix uygulandi
- videoretalking: crash loop, boto3 fix uygulandi
- browseruse: crash loop, flask+CMD fix uygulandi
- stablediffusion: transformers MT5Tokenizer uyumsuz (ayri fix gerek)
- realesrgan: test edilmedi
- 11 video model: test edilmedi

### CRASH-LOOP Fix'leri
- **geneface**: `subprocess.run(timeout=120)`, checkpoint kontrol, `2>/dev/null` kaldirildi, `boto3+botocore` eklendi
- **video-retalking**: `boto3+botocore` eklendi, CUDA 11.8 korundu
- **browser-use**: `flask` eklendi, `CMD ["python", "app.py"]` eklendi
- **test timeout**: 300→600s
- **Push**: tum fix'ler commit+push, GH Actions build tetiklendi

## Key Architecture (Güncel)
- **3 Modal servis**: `modal_apps/audio_service.py`, `image_service.py`, `video_service.py`
- **Global-scope `@app.function`** — her model ayri function olarak deploy edilir
- `_run_generate(model_name, payload)` — Flask test_client ile in-process HTTP
- `_ensure_weights(model_name)` — graceful skip on auth error, Docker-bundled fallback
- **Auth**: Bearer Token (`MODAL_AUTH_TOKEN`) — `check_auth` inline
- **Output**: Flask response + `_return_file=True` → base64 file doner
- **Auto-scaler**: `min_containers=0, scaledown_window=5`

## Critical Issues
- **geneface checkpoint**: `audio2motion.pt`, `motion2video.pt` Docker imajinda yok, runtime download implementasyonu beklemede
- **stablediffusion**: transformers MT5Tokenizer uyumsuz — ayri Docker fix gerektiriyor
- **GH Actions build bekleniyor**: geneface, video-retailing, browser-use imajlari yeniden build oluyor
- **18 model test edilmedi**: image(1) + video(11) + face(4) + browser(1) + upscale(1)
- **Windows cp1254 encoding**: `PYTHONIOENCODING=utf-8` + ASCII-safe print'ler gerekli. Emoji kullanma.
- **Modal deploy "no changes detected"**: Cozum: dosyaya unique marker ekleyip yeniden deploy.

## Next Steps
1. ⏳ GH Actions build bitince geneface/video-retalking/browser-use test
2. ⏳ image grubu test (stablediffusion transformers fix)
3. ⏳ video grubu test (wan, wan25, cogvideox, hunyuan, ltx, mochi, animatediff, dynamicrafter, pyramidflow, svd, videocrafter, zeroscope)
4. ⏳ Node.js entegrasyonu (Faz 4 — ModalBridge.ts, queue.ts update)
5. ⏳ Tum testler gecince dokuman guncellemesi

## Relevant Files
- `modal_apps/audio_service.py`: 11 model, global-scope `@app.function`. `_run_generate` Flask test_client kullanir. Weight download graceful skip.
- `modal_apps/image_service.py`: 2 model. Ayni `_run_generate` pattern.
- `modal_apps/video_service.py`: 12 model. Ayni `_run_generate` pattern.
- `modal_apps/__init__.py`: `HF_TOKEN` case-insensitive fix.
- `colab_docker/geneface/app.py`: `subprocess.run(timeout=120)` + checkpoint kontrol.
- `colab_docker/geneface/Dockerfile`: `2>/dev/null` kaldirildi, `boto3+botocore` eklendi.
- `colab_docker/video-retalking/Dockerfile`: `boto3+botocore` eklendi.
- `colab_docker/browser-use/Dockerfile`: `flask` + `CMD` eklendi.
- `scripts/test_modal_sequential.py`: Sequential test. `TIMEOUT=600`. First fail'de durur.
- `scripts/deploy_modal_serial.ps1`: Sequential Modal deploy.
- `.github/workflows/docker-build.yml`: CI — path filter + dinamik matrix.
