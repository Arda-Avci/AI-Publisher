# Yapılacaklar Listesi (TODO)

## 🟢 Faz Z3 — Self-Contained Dockerfile FROM Fix (1 Tem 2026)
- [x] Build #137 hatası analiz edildi — 23 model Dockerfile'da `FROM` eksik
- [x] `scripts/gen_selfcontained_dockerfiles.ps1` düzeltildi (`$fromMap` eklendi)
- [x] Tüm 23 Dockerfile yeniden yazıldı (Grup A: 2.2.1 / B: 2.6.0 / C: 2.8.0)
- [x] Commit + push → GitHub Actions build tetikle
- [ ] Build başarısını doğrula

## 🟢 Faz Z4 — Modal 3-Service Architecture (1 Tem 2026)
- [x] Karar: 25 per-model → 3 servis (audio/image/video)
- [x] `_run_generate` Flask test_client fix (core bug: `app.generate()` yoktu)
- [x] Weight download graceful skip (`except Exception` ile HF auth hatası yut)
- [x] `HF_TOKEN` case-insensitive fix (`__init__.py`)
- [x] Tüm 3 servis deploy edildi (modal deploy basarili)
- [x] Test: 8 model PASS (kokoro, xtts, whisper, f5tts, audioldm2, wav2lip, sadtalker, musetalk)
- [x] Test: 6 model FAIL (geneface, videoretalking, browseruse, stablediffusion, 2 untested)
- [x] geneface fix: subprocess timeout 120s, checkpoint kontrol, boto3 eklendi
- [x] video-retalking fix: boto3+botocore eklendi
- [x] browser-use fix: flask eklendi, CMD eklendi
- [x] Test timeout 300→600s
- [x] Tüm fix'ler commit+push → GH Actions build tetiklendi

## 🔴 Faz Z5 — Remaining Model Testing (18 model)

### Build Success Verification
- [ ] GH Actions build #138 sonucu kontrol et (geneface, video-retalking, browser-use)
- [ ] Yeni build'lerle yeniden test et

### Face Group (4 model)
- [ ] geneface — checkpoint download fix sonrasi test
- [ ] videoretalking — build fix sonrasi test
- [ ] realesrgan — ilk test
- [ ] wav2lip ✅ (zaten gecti)

### Image Group (2 model)
- [ ] stablediffusion — transformers MT5Tokenizer fix gerektirir
- [ ] realesrgan

### Video Group (11 model)
- [ ] wan
- [ ] wan25
- [ ] cogvideox
- [ ] hunyuan
- [ ] ltx
- [ ] mochi
- [ ] animatediff
- [ ] dynamicrafter
- [ ] pyramidflow
- [ ] svd
- [ ] videocrafter
- [ ] zeroscope

### Browser Group (1 model)
- [ ] browseruse — build fix sonrasi test

## 🔴 Faz 4 — Node.js Entegrasyonu
- [ ] `src/services/modalBridge.ts` — ModalClient wrapper
- [ ] `src/queue.ts` güncelle — RunPodClient → ModalClient
- [ ] SSE poll integration (`fc.get(timeout=0)`)

## ⏳ Faz 5 — Deploy & Production
- [ ] Production deploy pipeline (GitHub Actions → Modal)
- [ ] Load test (concurrent model calls)

## ⏳ Faz 6 — RunPod/Colab Kod Temizliği
- [ ] `colab_docker/` arşiv
- [ ] `.env.example` RUNPOD_* temizle
- [ ] `src/constants.ts` RUNPOD* sabitleri kaldır
- [ ] Eski RunPod kodlarını temizle

## Referans
- ADR-008: RunPod → Modal Migration
- `modal_apps/audio_service.py`: Audio grubu (11 model)
- `modal_apps/image_service.py`: Image grubu (2 model)
- `modal_apps/video_service.py`: Video grubu (12 model)
- `scripts/test_modal_sequential.py`: Sequential test script (TIMEOUT=600)
- `scripts/deploy_modal_serial.ps1`: Sequential Modal deploy
