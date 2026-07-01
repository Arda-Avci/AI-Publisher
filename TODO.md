# Yapılacaklar Listesi (TODO)

## 🟢 Faz Z3 — Self-Contained Dockerfile FROM Fix (1 Tem 2026)
- [x] Build #137 hatası analiz edildi — 23 model Dockerfile'da `FROM` eksik
- [x] `scripts/gen_selfcontained_dockerfiles.ps1` düzeltildi (`$fromMap` eklendi)
- [x] Tüm 23 Dockerfile yeniden yazıldı (Grup A: 2.2.1 / B: 2.6.0 / C: 2.8.0)
- [ ] Commit + push → GitHub Actions build tetikle
- [ ] Build başarısını doğrula

## 🟢 Faz Z1 — Modal Per-Model Deploy (30 Haz 2026)
- [x] 25 model `ai-publisher-{name}` deploy edildi (GHCR imaj + Modal template)
- [x] Kokoro test: TTS üretimi başarılı (30s)
- [x] Whisper test: route discovery çalışıyor (parametre bekliyor)
- [x] Template: conda Python keşfi + transformers<4.46 pin + workspace dirs
- [x] Auto-scaler: `min_containers=0, scaledown_window=5` (25 model)
- [x] `modalClient.ts` MODEL_TO_MODAL mapping güncellendi
- [x] `update_autoscaler.py` — deploy'suz pool ayar aracı
- [x] `_inspect.py` — imaj iç yapı keşif aracı
- [x] Eski factory pattern (`video_service.py`, `image_service.py`) deprecated

## 🔴 Faz Z2 — Tüm Modelleri Test Et
- [ ] Döngüsel test script'i yaz (25 model, her birine uygun parametre)
- [ ] Kokoro ✅ → `/synthesize` ile ses üretimi
- [ ] Whisper ⚠️ → `/transcribe` ile transkripsiyon
- [ ] Stable Diffusion ⚠️ → import çok yavaş (health timeout)
- [ ] WAN/WAN25 → video üretimi
- [ ] F5-TTS/XTTS → TTS üretimi
- [ ] Wav2Lip/SadTalker → lip-sync
- [ ] Diğer modeller
- [ ] Hata alan modelleri düzelt

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
- [ ] `.github/workflows/docker-build.yml` pasifleştir

## Referans
- ADR-008: RunPod → Modal Migration
- `modal_apps/deploy_serial.ps1`: Ana deploy script (template + 25 model)
- `modal_apps/modalClient.ts`: Model→Modal app mapping (25 entry)
- `modal_apps/update_autoscaler.py`: Deploy'suz pool ayarı
