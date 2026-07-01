# ADR-008: RunPod'dan Modal.com'a GeÃ§iÅŸ

## Durum
Kabul Edildi â€” UygulanÄ±yor

## BaÄŸlam
RunPod kaldÄ±rÄ±lÄ±yor. 26 model Docker imajÄ± GHCR'de kalÄ±yor, Modal Ã¼zerinden Ã§alÄ±ÅŸacak.

### Mevcut Durum
- **26 Docker imajÄ±** GHCR'de (`ghcr.io/anomalyco/*`)
- Ä°majlar **model aÄŸÄ±rlÄ±ÄŸÄ± iÃ§ermez** â€” tÃ¼m aÄŸÄ±rlÄ±klar runtime'da HuggingFace'den indirilir (`from_pretrained()`)
- Model aÄŸÄ±rlÄ±klarÄ± HF cache (`/workspace/hf_cache`) yolunda tutulur
- Modal Volume: bir kere indirilen aÄŸÄ±rlÄ±klarÄ±n kalÄ±cÄ± cache'i
- Volume'de yoksa â†’ HuggingFace'den indir â†’ Volume'e kaydet

### GeÃ§iÅŸ Nedeni
1. RunPod eksi bakiye â€” canlÄ± test yapÄ±lamÄ±yor
2. Scale-to-zero (keep_warm=0) â€” sadece aktif render sÃ¼resi kadar Ã¶deme
3. GPU/CPU ayrÄ±ÅŸtÄ±rmasÄ± â€” ses CPU'da $0.047/core-hr
4. Modal JS SDK (`npm install modal`) ile Node.js native entegrasyon
5. 30+ GPU seÃ§eneÄŸi, preemptible %50+ ucuz

## Karar
RunPod kaldÄ±rÄ±lÄ±yor, Modal.com'a geÃ§iliyor.

### 3 App Mimarisi
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚              Node.js (Express)                       â”‚
â”‚  src/services/modalBridge.ts                         â”‚
â”‚  â†‘ RunPodClient â†’ ModalClient                        â”‚
â”‚  â†‘ fn.spawn() + fc.get() (async call)               â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚ POST /api/video    â”‚ POST /api/imageâ”‚ POST /api/audio
       â–¼                    â–¼                â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ VÄ°DEO GPU    â”‚  â”‚ GÃ–RSEL GPU   â”‚  â”‚ SES GPU+CPU   â”‚
â”‚ Modal App    â”‚  â”‚ Modal App    â”‚  â”‚ Modal App      â”‚
â”‚ H100 / A100  â”‚  â”‚ A10 / L4     â”‚  â”‚ A10 / CPU      â”‚
â”‚ 12 model     â”‚  â”‚ 3 model      â”‚  â”‚ 11 model       â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚                 â”‚                 â”‚
       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                         â–¼
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
              â”‚ B2 Storage       â”‚
              â”‚ (output)         â”‚
              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Volume Mimarisi
- Tek Volume: `ai-publisher-weights` (1 TiB free tier iÃ§inde)
- Alt dizinler: `/models/video/`, `/models/image/`, `/models/audio/`
- Container mount: `/vol/weights`
- Fallback: weight Volume'de yoksa `from_pretrained()` ile HuggingFace'den indir â†’ Volume'e kaydet

### GHCR Ä°maj KullanÄ±mÄ±
```python
image = modal.Image.from_registry("ghcr.io/anomalyco/wan:latest", secret=SECRET_GHCR)
```
- Ä°majlar runtime only (Python + baÄŸÄ±mlÄ±lÄ±klar)
- Model aÄŸÄ±rlÄ±klarÄ± Volume'den yÃ¼klenir
- Volume'de yoksa imaj iÃ§indeki `from_pretrained()` ile indirilir

## SonuÃ§lar

### Olumlu
- RunPod bakiye sorunu kalkar
- Docker build/maintenance sÄ±fÄ±rlanÄ±r (GHCR imajlarÄ± korunur)
- 30+ RUNPOD_* env var tamamen kalkar
- GPU/CPU ayrÄ±ÅŸmasÄ± ile maliyet optimizasyonu
- Scale-to-zero, sadece Ã§alÄ±ÅŸÄ±rken Ã¶de
- First 1 TiB Volume storage Ã¼cretsiz

### Olumsuz
- Cold start ~5-10sn (Volume mount + model load), her Ã§aÄŸrÄ±da
- Preemptible GPU kesintisi olabilir (retry mekanizmasÄ± zaten var)
- Test suite gÃ¼ncellenmeli

### Maliyet
| Servis | GPU | Modal Ãœcret |
|--------|-----|-------------|
| Video (Wan/Cog) | H100 80GB | $3.95/hr (preemptible ~$1.98/hr) |
| Video (hafif) | A100 80GB | $2.50/hr (preemptible ~$1.25/hr) |
| GÃ¶rsel (SD/FLUX) | A10 24GB | $1.10/hr (preemptible ~$0.55/hr) |
| Ses CPU | CPU | $0.047/core-hr |
| Volume (model weights) | â€” | $0/ay (1TiB free tier iÃ§inde) |

keep_warm=0 â†’ sadece aktif render sÃ¼resi kadar Ã¶deme.
5dk video render = H100 ~$0.33/job (preemptible ~$0.16/job).

## Uygulama PlanÄ± (Paralel Fazlar)

### Faz 1: DokÃ¼mantasyon TemizliÄŸi (1 gÃ¼n)
- ADR-008 gÃ¼ncelle (bu dosya)
- PROJECT_STATUS.md, TODO.md, Memory_Bank.md â†’ RunPod/Colab referanslarÄ± temizle

### Faz 2: Modal Setup + env.ts (1 gÃ¼n, baÄŸÄ±msÄ±z)
- `modal volume create ai-publisher-weights`
- Modal workspace + token
- `src/env.ts` â†’ `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`, `MODAL_AUTH_TOKEN`
- `src/constants.ts` â†’ `MODAL` sabitleri eklendi, `RUNPOD` kaldÄ±rÄ±ldÄ±

### Faz 3A: Video Servisi (2 gÃ¼n, 3B/3C ile paralel)
- `modal_apps/video_service.py` â€” 12 video model
- Volume mount + HF fallback
- GPU config per model

### Faz 3B: Image Servisi (2 gÃ¼n, 3A/3C ile paralel)
- `modal_apps/image_service.py` â€” 3 image model
- Volume mount + HF fallback

### Faz 3C: Audio Servisi (2 gÃ¼n, 3A/3B ile paralel)
- `modal_apps/audio_service.py` â€” 11 model (GPU+CPU)
- Volume mount + HF fallback
- CPU-only modellerde gpu=None

### Faz 4: Node.js Entegrasyonu (2 gÃ¼n, Faz 2'ye baÄŸÄ±mlÄ±)
- `src/services/modalBridge.ts` â€” ModalClient wrapper
- `src/queue.ts` gÃ¼ncelleme â€” RunPodClient â†’ ModalClient
- SSE poll integration (`fc.get(timeout=0)`)

### Faz 5: Deploy & Test (1 gÃ¼n, Faz 3+4 bitince)
- `deploy_all.sh` ile 3 app deploy
- Kokoro (CPU) PoC test
- Video model (GPU) PoC test
- Volume fallback test

### Faz 6: RunPod/Colab Kod TemizliÄŸi (1 gÃ¼n, baÄŸÄ±msÄ±z)
- `docker_image/` arÅŸivlenir (silinmez, referans olarak kalÄ±r)
- `.env.example` RUNPOD_* temizlenir
- `src/constants.ts` RUNPOD* sabitleri kaldÄ±rÄ±lÄ±r
- Eski `src/` RunPod kodlarÄ± temizlenir
- `.github/workflows/docker-build.yml` pasifleÅŸtirilir

### Riskler
| Risk | Mitigasyon |
|------|-----------|
| GHCR pull hÄ±zÄ± (eStargz desteÄŸi yok) | Modal image cache: ilk pull'dan sonra hÄ±zlanÄ±r |
| Cold start 10+sn | Kabul edildi. Volume mount ~2sn, model load ~3-8sn |
| Preemptible GPU kesintisi | Retry mekanizmasÄ± zaten var (queue.ts) |
| HF rate limit (429) | Volume cache + retry |
