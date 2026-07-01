# Memory Bank — 2026-07-01 (Session 5)

## Son Oturum (1 Tem — Dockerfile FROM Fix)
- **Build #137 analiz**: 23 self-contained Dockerfile build'te fail (3 special model OK)
- **Root cause**: `FROM` satırı eksik — generator script template'inde unutulmuş
- **Fix uygulandı**:
  - `scripts/gen_selfcontained_dockerfiles.ps1` — `$fromMap` eklendi (3 grup)
  - 23 Dockerfile yeniden yazıldı (Grup A: 2.2.1 / B: 2.6.0 / C: 2.8.0)
- **Dökümanlar güncellendi**: PROJECT_STATUS.md, TODO.md, diff.md
- **Durum**: Commit + push bekliyor → GitHub Actions build tetiklenecek

## Active Phases
- **Faz Z3**: Dockerfile FROM fix — 23/23 Dockerfile düzeltildi, push bekliyor
- **Faz Z**: Modal per-model deploy — 25/25 deploy OK, 4/25 test OK
- **Faz 4**: Node.js entegrasyonu — başlamadı
- **Faz 5**: Tüm modellerin döngüsel testi — başlamadı

## Key Architecture (Güncel)
- GHCR images via `modal.Image.from_registry()` — container iç Flask server'ı başlatılır
- 25 per-model Modal app: `ai-publisher-{name}` → `generate()` fonksiyonu
- **Self-contained Dockerfile**: 3 torch grubu (2.2.1/2.6.0/2.8.0), her model kendi FROM + tüm pip'leri içerir
- **Yeni template:** Thread-based launcher → health immediately responds → module background yüklenir → 503/retry pattern → route proxy via Werkzeug Client
- Torchaudio fix: `pip install torchaudio==<torch_version> --force-reinstall --no-deps` (ABI mismatch fix)
- Auth: Bearer Token (`MODAL_AUTH_TOKEN`) — `check_auth` inline
- Output: Flask response + `_return_file=True` → base64 file döner
- Auto-scaler: `min_containers=0, scaledown_window=5`

## Critical Issues
- **Build #137**: 23 model Dockerfile'ında FROM eksik → **FIX UYGULANDI** (push bekliyor)
- **f5tts**: Dockerfile `torch>=2.5.0` torchaudio ABI kırar → template'de runtime fix var, test edilemedi (GPU cold start ~5+ dk)
- **Stable Diffusion / heavy video modelleri**: module-level `import diffusers` → Flask başlamaz → thread-launcher ile health çalışır ama `/synthesize` 503 dönerken model yüklenmezse timeout. Çözüm: Modal GPU snapshot veya `min_containers=1`.
- `modal_apps/` modülü **kullanılmıyor** (inline template)
- Eski `video_service.py`/`image_service.py` **kullanım dışı**

## Next Steps
1. ✅ Build #137 hatası teşhis edildi (FROM eksik)
2. ✅ Dockerfile'lar düzeltildi
3. ⏳ Commit + push → build #138
4. ⏳ Build başarısı doğrula
5. ⏳ Tüm modelleri döngüsel test et
