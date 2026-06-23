# AI-Publisher Docker Image Deployment Map

Her imaj icin: fonksiyon, GPU ihtiyaci, VRAM, port, base image, notlar.

## Ozet Tablo

| Image | Port | Fonksiyon | GPU | VRAM | Base | Notes |
|-------|------|-----------|-----|------|------|-------|
| `ai-publisher-cogvideox` | 5001 | Video (I2V/T2V) | ZORUNLU | 12-24 GB | CUDA 12.1 | CogVideoX 5b + Wan 2.1 I2V switch |
| `ai-publisher-xtts` | 5002 | TTS (Turkce dahil cok dilli) | Onerilen | 4-6 GB | CUDA 12.1 | coqui-tts XTTS-v2 |
| `ai-publisher-audioldm2` | 5003 | SFX (ses efekti) | Onerilen | 4-6 GB | CUDA 12.1 | cvssp/audioldm2 |
| `ai-publisher-wav2lip` | 5004 | Lip-Sync | ZORUNLU | 4-8 GB | CUDA 12.1 | Rudrabha/Wav2Lip checkpoints |
| `ai-publisher-musetalk` | 5005 | Lip-Sync (talking head) | ZORUNLU | 6-10 GB | CUDA 12.1 | TMElyralab/MuseTalk |
| `ai-publisher-whisper` | 5006 | Transkripsiyon (STT) | Opsiyonel | 2-4 GB | CUDA 12.1 | faster-whisper + openai-whisper |
| `ai-publisher-stablediffusion` | 5007 | Gorsel (image gen) | ZORUNLU | 6-12 GB | CUDA 12.1 | SD/Flux/SD-Inpaint |
| `ai-publisher-wan` | 5008 | Video (T2V/I2V) | ZORUNLU | 12-30 GB | CUDA 12.1 | Wan2.1-T2V 1.3B + I2V 14B |
| `ai-publisher-ltx` | 5009 | Video (I2V) | ZORUNLU | 8-12 GB | CUDA 12.1 | Lightricks/LTX-Video |
| `ai-publisher-hunyuan` | 5010 | Video (T2V) | ZORUNLU | 16-24 GB | CUDA 12.1 | HunyuanVideo 720p |
| `ai-publisher-kokorotts` | 5011 | TTS (hizli, EN agirlikli) | Opsiyonel | 2-4 GB | CUDA 12.1 | hexgrad/Kokoro-82M |
| `ai-publisher-svd` | 5012 | Video (I2V) | ZORUNLU | 8-12 GB | CUDA 12.1 | Stable Video Diffusion XT |
| `ai-publisher-animatediff` | 5013 | Animasyon | ZORUNLU | 6-10 GB | CUDA 12.1 | AnimateDiff v1.5-2 |
| `ai-publisher-wan25` | 5014 | Video (genis I2V) | ZORUNLU | 16-28 GB | CUDA 12.1 | Wan2.5-I2V-14B |
| `ai-publisher-f5tts` | 5015 | TTS (zero-shot clone) | Onerilen | 4-6 GB | CUDA 12.1 | charactr/vocos-mel-24khz |
| `ai-publisher-lora-trainer` | 5016 | LoRA egitim | ZORUNLU | 16-24 GB | CUDA 12.1 | CogVideoX-5b + SDXL base |
| `ai-publisher-sadtalker` | 5017 | Talking head (audio-driven) | ZORUNLU | 4-8 GB | CUDA 12.1 | OpenTalker/SadTalker |
| `ai-publisher-dynamicrafter` | 5018 | Image-to-Video | ZORUNLU | 8-12 GB | CUDA 12.1 | DynamiCrafter 512 |
| `ai-publisher-zeroscope` | 5019 | Text-to-Video | ZORUNLU | 8-12 GB | CUDA 12.1 | zeroscope_v2_576w |
| `ai-publisher-video-retalking` | 5020 | Lip-Sync (video) | ZORUNLU | 6-10 GB | **CUDA 11.8** | ayri base, PyTorch 2.1.2 |
| `ai-publisher-geneface` | 5021 | 3D Talking Head | ZORUNLU | 8-12 GB | **CUDA 11.8** | PyTorch3D, 2-stage build |
| `ai-publisher-mochi` | 5022 | Video (T2V) | ZORUNLU | 16-20 GB | CUDA 12.1 | genmo/mochi-1-preview |
| `ai-publisher-pyramid-flow` | 5023 | Video (cascaded) | ZORUNLU | 12-18 GB | CUDA 12.1 | nvidia/Pyramid-Flow |
| `ai-publisher-browser-use` | 9222 | Browser automation | **OPSIYONEL** | 0 GB | **CPU (python:3.11-slim)** | Playwright + LLM agent |

## Kategori Bazli Gruplama

### Video Uretim (12 image, ZORUNLU GPU)

| Image | VRAM | Sure/Klip | Kalite |
|-------|------|-----------|--------|
| wan (2.1-I2V-14B) | 30 GB | ~12s | 1080p, en hizli |
| wan25 (2.5-I2V) | 28 GB | ~15s | 1080p, yeni |
| cogvideox (5b-I2V) | 16 GB | ~45s | 720p |
| hunyuan | 24 GB | ~60s | 720p, yavas |
| mochi | 20 GB | ~30s | 480p, cinematic |
| pyramid-flow | 18 GB | ~45s | 768p |
| ltx | 12 GB | ~8s | 768x512, en hizli |
| svd | 12 GB | ~25s | 576x1024 |
| animatediff | 10 GB | ~20s | 512x512 |
| dynamicrafter | 12 GB | ~40s | 512x512 |
| zeroscope | 12 GB | ~60s | 576x320, en yavas |

### Audio / Ses Isleme (4 image)

| Image | GPU | Tipik VRAM | Islem |
|-------|-----|------------|-------|
| xtts | Onerilen | 4-6 GB | Text-to-speech (16 dil, voice clone) |
| kokorotts | Opsiyonel | 2-4 GB | TTS (hizli, EN/TR) |
| f5tts | Onerilen | 4-6 GB | Zero-shot voice clone |
| audioldm2 | Onerilen | 4-6 GB | Sound effect generation |
| whisper | Opsiyonel | 2-4 GB | Speech-to-text (5 model size) |

### Lip-Sync / Talking Head (4 image, ZORUNLU GPU)

| Image | VRAM | Islem |
|-------|------|-------|
| wav2lip | 4-8 GB | Dudak senkron (audio → video) |
| musetalk | 6-10 GB | Talking head generation |
| sadtalker | 4-8 GB | Audio-driven portrait animation |
| video-retalking | 6-10 GB | Video lip-sync (CUDA 11.8) |
| geneface | 8-12 GB | 3D talking head (CUDA 11.8) |

### Gorsel (2 image)

| Image | VRAM | Islem |
|-------|------|-------|
| stablediffusion | 6-12 GB | SD/Flux/SDXL image generation |
| lora-trainer | 16-24 GB | LoRA fine-tuning |

### Ozel (1 image, CPU OLAN)

| Image | GPU | Islem |
|-------|-----|-------|
| browser-use | **OPSIYONEL** | Playwright + LLM browser agent, YouTube/TikTok/X/Meta upload |

## RunPod Endpoint Onerisi

### RunPod Serverless (sadece calisma zamani ucreti)

Kucuk veya arada sirada kullanilan modeller icin:

| Endpoint | Worker Tipi | Maliyet Notu |
|----------|-------------|--------------|
| whisper | CPU (8GB RAM) | STT, GPU gereksiz |
| kokorotts | CPU (8GB RAM) | TTS, GPU gereksiz |
| browser-use | CPU (4GB RAM) | Browser automation |
| xtts | T4 GPU (16GB) | TTS, kucuk VRAM |
| audioldm2 | T4 GPU (16GB) | SFX, kucuk VRAM |
| f5tts | T4 GPU (16GB) | TTS, kucuk VRAM |

### RunPod GPU VM (surekli calisan modeller)

Buyuk veya uzun sureli render icin:

| VM | VRAM | Kullanilacak Modeller |
|----|------|----------------------|
| 1x A40 (48GB) | Tek tek | cogvideox, hunyuan, mochi, pyramid-flow, wan (ayri ayri) |
| 1x A100 (80GB) | 2-3 ayni anda | orta VRAM'li modeller (ltx, svd, dynamicrafter, zeroscope) |
| 1x H100 (80GB) | 2-3 ayni anda | hizli VRAM'li (wan 2.1 1.3B) + cogvideox 2b |

### RunPod Network Volume (ortak cache)

`/workspace/hf_cache` ve `/workspace/torch_cache` icin:

| Senaryo | Boyut |
|---------|-------|
| Minimum (sadece runtime cache) | 50 GB |
| Onerilen (LoRA + torch compile) | 100 GB |
| Maksimum (her sey local) | 200 GB |

## CUDA 11.8 vs 12.1 Ayrım

Bazı modeller PyTorch 3D veya eski CUDA gerektirir:

| Base | Image | Neden |
|------|-------|-------|
| CUDA 12.1 (devel) | cogvideox, wan, wan25, ltx, hunyuan, svd, animatediff, dynamicrafter, pyramid-flow, mochi, zeroscope, lora-trainer, stablediffusion, audioldm2, xtts, whisper, kokorotts, f5tts, musetalk, wav2lip, sadtalker | Yeni modeller, modern PyTorch |
| **CUDA 11.8 (devel)** | **geneface** | PyTorch3D 0.7.6 + PyTorch 2.1 uyumu |
| **CUDA 11.8 (devel)** | **video-retalking** | Eski basicsr + facexlib |
| **CPU (python:3.11-slim)** | **browser-use** | GPU gereksiz |

CUDA 11.8 image'lari CUDA 12.1 worker'inda calistirilamaz, **ayri worker/endpoint** gerekli.

## Endpoint URL Sablonu

Node.js tarafi `dockerHost.getUrl(service)` ile baglanir:

```
http://localhost:{port}             # local Docker (docker-compose)
http://{worker-ip}:{port}           # RunPod pod (tek container)
https://{endpoint-id}.api.runpod.ai # RunPod serverless (otomatik scale)
```

Service → port eslemesi `src/lib/docker-host.ts:48-72` dosyasinda tanimli.

## Build Sirasinda Skip Mantigi

`colab_docker/build_all.sh` her model icin:
1. `MODEL.tar.gz` + `MODEL.sha256` Drive'da var mi?
2. `Dockerfile.base` sha + `MODEL/Dockerfile` sha = hesaplanan hash
3. Hash eslesirse skip, degismis ise rebuild

`./force_rebuild.sh --all` tum cache'i invalidate eder, full rebuild yapar.
