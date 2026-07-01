# ADR-008: RunPod'dan Modal.com'a Geçiş

## Durum
Kabul Edildi — Uygulanıyor

## Bağlam
RunPod kaldırılıyor. 26 model Docker imajı GHCR'de kalıyor, Modal üzerinden çalışacak.

### Mevcut Durum
- **26 Docker imajı** GHCR'de (`ghcr.io/anomalyco/*`)
- İmajlar **model ağırlığı içermez** — tüm ağırlıklar runtime'da HuggingFace'den indirilir (`from_pretrained()`)
- Model ağırlıkları HF cache (`/workspace/hf_cache`) yolunda tutulur
- Modal Volume: bir kere indirilen ağırlıkların kalıcı cache'i
- Volume'de yoksa → HuggingFace'den indir → Volume'e kaydet

### Geçiş Nedeni
1. RunPod eksi bakiye — canlı test yapılamıyor
2. Scale-to-zero (keep_warm=0) — sadece aktif render süresi kadar ödeme
3. GPU/CPU ayrıştırması — ses CPU'da $0.047/core-hr
4. Modal JS SDK (`npm install modal`) ile Node.js native entegrasyon
5. 30+ GPU seçeneği, preemptible %50+ ucuz

## Karar
RunPod kaldırılıyor, Modal.com'a geçiliyor.

### 3 App Mimarisi
```
┌─────────────────────────────────────────────────────┐
│              Node.js (Express)                       │
│  src/services/modalBridge.ts                         │
│  ↑ RunPodClient → ModalClient                        │
│  ↑ fn.spawn() + fc.get() (async call)               │
└──────┬────────────────────┬────────────────┬─────────┘
       │ POST /api/video    │ POST /api/image│ POST /api/audio
       ▼                    ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ VİDEO GPU    │  │ GÖRSEL GPU   │  │ SES GPU+CPU   │
│ Modal App    │  │ Modal App    │  │ Modal App      │
│ H100 / A100  │  │ A10 / L4     │  │ A10 / CPU      │
│ 12 model     │  │ 3 model      │  │ 11 model       │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
              ┌──────────────────┐
              │ B2 Storage       │
              │ (output)         │
              └──────────────────┘
```

### Volume Mimarisi
- Tek Volume: `ai-publisher-weights` (1 TiB free tier içinde)
- Alt dizinler: `/models/video/`, `/models/image/`, `/models/audio/`
- Container mount: `/vol/weights`
- Fallback: weight Volume'de yoksa `from_pretrained()` ile HuggingFace'den indir → Volume'e kaydet

### GHCR İmaj Kullanımı
```python
image = modal.Image.from_registry("ghcr.io/anomalyco/wan:latest", secret=SECRET_GHCR)
```
- İmajlar runtime only (Python + bağımlılıklar)
- Model ağırlıkları Volume'den yüklenir
- Volume'de yoksa imaj içindeki `from_pretrained()` ile indirilir

## Sonuçlar

### Olumlu
- RunPod bakiye sorunu kalkar
- Docker build/maintenance sıfırlanır (GHCR imajları korunur)
- 30+ RUNPOD_* env var tamamen kalkar
- GPU/CPU ayrışması ile maliyet optimizasyonu
- Scale-to-zero, sadece çalışırken öde
- First 1 TiB Volume storage ücretsiz

### Olumsuz
- Cold start ~5-10sn (Volume mount + model load), her çağrıda
- Preemptible GPU kesintisi olabilir (retry mekanizması zaten var)
- Test suite güncellenmeli

### Maliyet
| Servis | GPU | Modal Ücret |
|--------|-----|-------------|
| Video (Wan/Cog) | H100 80GB | $3.95/hr (preemptible ~$1.98/hr) |
| Video (hafif) | A100 80GB | $2.50/hr (preemptible ~$1.25/hr) |
| Görsel (SD/FLUX) | A10 24GB | $1.10/hr (preemptible ~$0.55/hr) |
| Ses CPU | CPU | $0.047/core-hr |
| Volume (model weights) | — | $0/ay (1TiB free tier içinde) |

keep_warm=0 → sadece aktif render süresi kadar ödeme.
5dk video render = H100 ~$0.33/job (preemptible ~$0.16/job).

## Uygulama Planı (Paralel Fazlar)

### Faz 1: Dokümantasyon Temizliği (1 gün)
- ADR-008 güncelle (bu dosya)
- PROJECT_STATUS.md, TODO.md, Memory_Bank.md → RunPod/Colab referansları temizle

### Faz 2: Modal Setup + env.ts (1 gün, bağımsız)
- `modal volume create ai-publisher-weights`
- Modal workspace + token
- `src/env.ts` → `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`, `MODAL_AUTH_TOKEN`
- `src/constants.ts` → `MODAL` sabitleri eklendi, `RUNPOD` kaldırıldı

### Faz 3A: Video Servisi (2 gün, 3B/3C ile paralel)
- `modal_apps/video_service.py` — 12 video model
- Volume mount + HF fallback
- GPU config per model

### Faz 3B: Image Servisi (2 gün, 3A/3C ile paralel)
- `modal_apps/image_service.py` — 3 image model
- Volume mount + HF fallback

### Faz 3C: Audio Servisi (2 gün, 3A/3B ile paralel)
- `modal_apps/audio_service.py` — 11 model (GPU+CPU)
- Volume mount + HF fallback
- CPU-only modellerde gpu=None

### Faz 4: Node.js Entegrasyonu (2 gün, Faz 2'ye bağımlı)
- `src/services/modalBridge.ts` — ModalClient wrapper
- `src/queue.ts` güncelleme — RunPodClient → ModalClient
- SSE poll integration (`fc.get(timeout=0)`)

### Faz 5: Deploy & Test (1 gün, Faz 3+4 bitince)
- `deploy_all.sh` ile 3 app deploy
- Kokoro (CPU) PoC test
- Video model (GPU) PoC test
- Volume fallback test

### Faz 6: RunPod/Colab Kod Temizliği (1 gün, bağımsız)
- `colab_docker/` arşivlenir (silinmez, referans olarak kalır)
- `.env.example` RUNPOD_* temizlenir
- `src/constants.ts` RUNPOD* sabitleri kaldırılır
- Eski `src/` RunPod kodları temizlenir
- `.github/workflows/docker-build.yml` pasifleştirilir

### Riskler
| Risk | Mitigasyon |
|------|-----------|
| GHCR pull hızı (eStargz desteği yok) | Modal image cache: ilk pull'dan sonra hızlanır |
| Cold start 10+sn | Kabul edildi. Volume mount ~2sn, model load ~3-8sn |
| Preemptible GPU kesintisi | Retry mekanizması zaten var (queue.ts) |
| HF rate limit (429) | Volume cache + retry |
