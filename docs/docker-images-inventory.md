# AI-Publisher Docker Images Inventory

> Her Docker imajının tam bileşenleri, versiyonları ve sistem gereksinimleri.

---

## 🧱 Base Image

**Tüm servislerin atası — `ai-publisher-base:latest`**

| Katman | Değer |
|--------|-------|
| **Base Image** | `pytorch/pytorch:2.2.1-cuda12.1-cudnn8-runtime` |
| **Sistem Araçları** | ffmpeg, git, wget, curl, cmake, libgl1-mesa-glx, libglib2.0-0, build-essential, libass-dev, espeak-ng, espeak, fonts-dejavu, fonts-freefont-ttf |
| **Python Paketleri** | flask, requests, scipy, numpy<2.0.0, accelerate, transformers>=4.46, pillow, runpod, boto3 |

---

## 🎬 Video Generation

### animatediff
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `guoyww/animatediff-motion-adapter-v1-5-2`, `frankjoshua/toonyou_beta6` |
| **Packages** | diffusers>=0.29.0, decord, open_clip_torch |
| **Framework** | diffusers |
| **Precision** | fp16 |
| **Output** | MP4 |
| **Frames** | 16 (512x512) |
| **VRAM** | ≥18GB direct CUDA; <18GB CPU offload |
| **Endpoint** | `POST /generate` |

---

### audioldm2
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `cvssp/audioldm2` |
| **Packages** | diffusers (inherited from base), scipy, numpy, transformers |
| **Framework** | diffusers |
| **Precision** | fp16 |
| **Output** | WAV 16kHz PCM |
| **Default Duration** | 6.0s |
| **Endpoint** | `POST /generate` |

---

### cogvideox
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | CogVideoX-2b, CogVideoX-5b, Wan2.1, LTX-Video, HunyuanVideo |
| **Packages** | diffusers>=0.35,<0.36, decord, open_clip_torch |
| **Framework** | diffusers |
| **Output** | MP4 (ffmpeg subprocess) |
| **Default Frames** | 49 |
| **VRAM** | ≥18GB |
| **Endpoint** | `POST /generate` (multi-model dispatcher: CogVideoX, Wan, LTX, Hunyuan T2V/I2V) |

---

### dynamicrafter
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `DynamiCrafter/dynamicrafter_512_interp_512` |
| **Packages** | decord==0.6.0, einops==0.3.0, imageio==2.9.0, numpy==1.24.2, omegaconf==2.1.1, opencv-python-headless, pytorch_lightning==1.9.3, transformers>=4.25.1, moviepy, av, xformers, open_clip_torch==2.22.0, kornia, timm |
| **Framework** | Custom (strict version pinning) |
| **System** | ffmpeg |
| **Output** | MP4 |
| **Endpoint** | `POST /preload`, `POST /generate` |

---

### hunyuan
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `hunyuanvideo-community/HunyuanVideo` |
| **Packages** | diffusers>=0.35,<0.36, decord, open_clip_torch |
| **Framework** | diffusers |
| **Precision** | bfloat16 |
| **Output** | MP4 (ffmpeg) |
| **Default** | 65 frames, 25 inference steps |
| **VRAM** | ≥18GB |
| **Endpoint** | `POST /generate` |

---

### ltx
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `Lightricks/LTX-Video` |
| **Packages** | diffusers>=0.35,<0.36, decord, open_clip_torch |
| **Framework** | diffusers |
| **Precision** | bfloat16 |
| **Output** | MP4 |
| **Default** | 65 frames, 25 steps |
| **VRAM** | ≥18GB |
| **Endpoint** | `POST /generate` |

---

### mochi ⚠️ YÜKSEK VRAM
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `genmo/mochi-1-preview` |
| **Packages** | diffusers>=0.35,<0.36, transformers>=4.45.2, sentencepiece>=0.2.0, av==13.1.0, einops>=0.8.0, moviepy==1.0.3, ray>=2.37.0 |
| **Framework** | diffusers, Ray (distributed) |
| **Output** | MP4 |
| **VRAM** | **≥22GB** (offload) / **≥42GB** (full) — T4 16GB'ta ÇALIŞMAZ |
| **Endpoint** | `POST /generate` |

---

### pyramid-flow
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `nvidia/Pyramid-Flow` |
| **Packages** | diffusers>=0.35,<0.36, transformers>=4.39.3, accelerate==0.30.0, einops, ftfy, opencv-python-headless==4.10.0.84, imageio==2.33.1, imageio-ffmpeg==0.5.1, sentencepiece, timm==0.6.12, tiktoken, scikit-image==0.22.0 |
| **Framework** | diffusers |
| **Precision** | bfloat16 |
| **Output** | MP4 |
| **Default** | 81 frames, 30 steps |
| **VRAM** | ≥18GB |
| **Endpoint** | `POST /generate` |

---

### stablediffusion
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | FLUX.1-schnell, dreamshaper (text-to-image), `runwayml/stable-diffusion-inpainting`, RealESRGAN_x4plus, GFPGAN |
| **Packages** | diffusers>=0.35,<0.36, realesrgan, gfpgan, basicsr, rembg |
| **Framework** | diffusers, basicsr, rembg |
| **System** | ffmpeg, libgl |
| **Output** | PNG (image), JPG (covers/avatar) |
| **Endpoints** | `POST /generate-image`, `POST /generate-covers`, `POST /generate-avatar`, `POST /inpaint`, `POST /remove-background` |
| **Ek Not** | RealESRGAN_x4plus.pth GitHub'dan runtime'da indirilir |

---

### videocrafter
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `VideoCrafter/Text2Video-1024`, `VideoCrafter/Text2Video-512`, `VideoCrafter/Image2Video-512` |
| **Packages** | pytorch-lightning==2.1.0, xformers==0.0.24, omegaconf==2.3.0, einops==0.7.0, ftfy==6.2.0, decord |
| **Framework** | Custom PyTorch (LV-DM — diffusers DEĞİL, `lvdm` modülleri) |
| **Precision** | fp16 |
| **Output** | MP4 (numpy frames → ffmpeg) |
| **VRAM** | 10–12GB (320×512) / 24GB (1024×576) |
| **Port** | **5024** (docker-compose: 5024→5000) |
| **Endpoint** | `POST /generate` (T2V), `POST /generate-i2v` (I2V) |

---

### svd (Stable Video Diffusion)
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `stabilityai/stable-video-diffusion-img2vid-xt` |
| **Packages** | diffusers>=0.35,<0.36, decord, open_clip_torch |
| **Framework** | diffusers |
| **Precision** | fp16 |
| **Output** | MP4 |
| **Resolution** | 1024x576 (input resized) |
| **Endpoint** | `POST /generate` |

---

### wan (Wan 2.1)
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `Wan-AI/Wan2.1-I2V-14B-480P`, `Wan-AI/Wan2.1-T2V-1.3B` |
| **Packages** | diffusers>=0.35,<0.36, decord, open_clip_torch |
| **Framework** | diffusers |
| **Precision** | bfloat16 |
| **Output** | MP4 |
| **Default** | 81 frames, 30 steps |
| **VRAM** | ≥18GB |
| **Endpoint** | `POST /generate` |

---

### wan25 (Wan 2.5)
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `Wan-AI/Wan2.5-I2V-14B` |
| **Packages** | diffusers>=0.35,<0.36, decord, open_clip_torch, torch==2.5.1+cu121, torchvision==0.20.1+cu121 |
| **Framework** | diffusers |
| **Precision** | bfloat16 |
| **Output** | MP4 |
| **Default** | 16 fps, 81 frames |
| **VRAM** | <20GB → sequential CPU offload |
| **Endpoint** | `POST /generate` |

---

### zeroscope
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `cerspense/zeroscope_v2_576w` |
| **Packages** | diffusers>=0.35,<0.36, accelerate==0.30.0, scipy==1.11.1, numpy==1.24.2, decord==0.6.0, open_clip_torch==2.23.0 |
| **Framework** | diffusers |
| **Precision** | fp16 |
| **Output** | MP4 |
| **Resolution** | 576x1024 |
| **Frames** | 24 |
| **Endpoint** | `POST /generate` |

---

## 🖼️ Image Generation

### stablediffusion
| Özellik | Değer |
|---------|-------|
| **Models** | FLUX.1-schnell ( Schnell ), dreamshaper (text-to-image) |
| **Enhancement** | GFPGAN (face), RealESRGAN_x4plus (super-res) |
| **Inpainting** | `runwayml/stable-diffusion-inpainting` |
| **Background Removal** | rembg |
| **Output** | PNG (image/avatar/inpaint), JPG (covers) |
| **Endpoints** | `/generate-image`, `/generate-covers` (3 covers), `/generate-avatar`, `/inpaint`, `/remove-background` |

---

## 🔊 Audio / TTS

### f5tts
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | F5-TTS DiT (custom) |
| **Packages** | f5-tts>=1.1.0, torch>=2.5.0, soundfile, librosa |
| **System** | ffmpeg, espeak-ng |
| **Output** | WAV 24kHz |
| **Config** | dim=1024, depth=22, heads=16, ff_mult=4 |
| **Fallback** | CPU if VRAM < 3.5GB |
| **Endpoint** | `POST /synthesize` |

---

### kokorotts
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | Kokoro KPipeline (lang_code='a') |
| **Packages** | kokoro, soundfile, munch |
| **System** | espeak-ng |
| **Output** | WAV 24kHz |
| **Languages** | Multi-language (default English 'a' code) |
| **Default Voice** | af_bella |
| **Endpoint** | `POST /synthesize` |

---

### xtts
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | coqui-tts v2, edge-tts, OpenAI TTS |
| **Packages** | coqui-tts, edge-tts, openai, pyrubberband, soundfile |
| **System** | rubberband-cli, rubberband-ladspa, ffmpeg, espeak-ng |
| **Output** | WAV 24kHz |
| **Features** | Voice cloning (base64 ref audio), duration stretching via pyrubberband |
| **Endpoint** | `POST /synthesize` |

---

### audioldm2
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `cvssp/audioldm2` |
| **Framework** | diffusers |
| **Output** | WAV 16kHz PCM |
| **Default Duration** | 6.0s |
| **Endpoint** | `POST /generate` |

---

## 👄 Lip-Sync / Talking-Head

### musetalk
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `TMElyralab/MuseTalk` (GitHub'dan clone) |
| **Packages** | opencv-python-headless, omegaconf, einops, diffusers, librosa, trimesh, pytorch3d (optional), huggingface_hub |
| **System** | ffmpeg, curl, git |
| **Output** | MP4 |
| **Process** | inference.py subprocess (300s timeout) |
| **Endpoints** | `POST /preload`, `POST /generate` |

---

### wav2lip
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | `Rudrabha/Wav2Lip` (GitHub'dan clone) |
| **Packages** | face_recognition, face_recognition_models, opencv-python-headless, librosa |
| **System** | ffmpeg, curl |
| **Output** | MP4 |
| **Checkpoint** | `/app/Wav2Lip/checkpoints/wav2lip.pth` (runtime) |
| **Endpoint** | `POST /apply-lipsync` |

---

## 🗣️ Speech-to-Text

### whisper
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | faster-whisper (CTranslate2), openai-whisper (fallback) |
| **Packages** | faster-whisper, openai-whisper |
| **System** | ffmpeg |
| **Output** | text + SRT + word timestamps |
| **Features** | VAD filter, beam_size, language selection |
| **Fallback** | openai-whisper if faster-whisper fails |
| **Endpoint** | `POST /transcribe` |

---

## 🏋️ LoRA Training

### lora-trainer
| Özellik | Değer |
|---------|-------|
| **Base** | ai-publisher-base:latest |
| **Models** | CogVideoX-5b LoRA (PEFT), SDXL LoRA (PEFT) |
| **Packages** | torch>=2.5.0, diffusers>=0.35,<0.36, peft>=0.12.0, accelerate>=0.33.0, transformers>=4.44.0, bitsandbytes>=0.43.0, pillow, open_clip_torch, requests |
| **Framework** | PEFT, diffusers |
| **Storage** | HF hub, `/content/drive/MyDrive` (Drive volume) |
| **Output** | LoRA weights (HF repo / Drive) |
| **Process** | Background thread training |
| **Endpoints** | `GET /pretrained`, `POST /pretrained/load`, `POST /train`, `POST /infer`, `GET /progress/<job_id>` |

---

## 🚨 VRAM Gereksinimleri Özeti

| Servis | Minimum VRAM | Not |
|--------|-------------|-----|
| mochi | **22GB** (offload) / **42GB** (full) | ⚠️ T4 16GB'ta ÇALIŞMAZ |
| wan25 | <20GB → CPU offload | sequential offload |
| cogvideox | ≥18GB | direct CUDA |
| hunyuan | ≥18GB | bfloat16 |
| ltx | ≥18GB | bfloat16 |
| pyramid-flow | ≥18GB | bfloat16 |
| wan | ≥18GB | bfloat16 |
| animatediff | ≥18GB | fp16 |
| videocrafter | 10–12GB (512) / 24GB (1024) | fp16 |
| svd | ≥16GB | fp16 |
| zeroscope | ≥12GB | fp16 |
| f5tts | <3.5GB → CPU fallback | — |
| whisper | <4GB → CPU | — |
| Others | ≥8GB | CPU offload available |

---

## 🔧 Ortak Desenler

- **Memory flush:** `gc.collect() + torch.cuda.empty_cache() + synchronize()` — tüm servislerde mevcut
- **Port mapping:** internal 5000 → host 5001-5023 (docker-compose)
- **Health check:** `curl -f http://localhost:5000/health` her 30s
- **Output path:** `/content/` (Colab convention)
- **Lazy loading:** tüm pipeline'lar ilk istekte yüklenir
- **RunPod handler:** tüm servisler `runpod_handler.py` üzerinden çalışır
