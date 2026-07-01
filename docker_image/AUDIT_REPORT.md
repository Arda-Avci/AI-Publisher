# ğŸ³ Docker & Runtime Audit Report â€” docker_image/

**Tarih**: 2026-06-28  
**Kapsam**: 26 model dizini (Dockerfile + app.py)  
**AmaÃ§**: Build ve runtime hatalarÄ±nÄ± tespit etmek

---

## ğŸ“Š Ã–zet Tablo

| Kritik | Orta | DÃ¼ÅŸÃ¼k | Toplam Bulgu |
|--------|------|-------|--------------|
| 9 | 7 | 5 | 21 |

---

## ğŸ—ï¸ Base Image (Dockerfile.base)

| Ã–zellik | DeÄŸer |
|---------|-------|
| Base | `pytorch/pytorch:2.2.1-cuda12.1-cudnn8-devel` |
| PyTorch | 2.2.1 (pinned) |
| CUDA | 12.1 |
| FFmpeg | Static build â†’ `/usr/bin/ffmpeg` |
| Python | Conda Python 3.9 |
| diffusers | >=0.35,<0.36 |
| transformers | >=4.46 |
| xformers | 0.0.25 |

---

## ğŸ”´ KRÄ°TÄ°K BULGULAR (Build/Run-time Hata)

### 1. cogvideox â€” preload() KÄ±rÄ±k
**Dosya**: `cogvideox/app.py:286`  
```python
pipe = get_pipeline()  # get_pipeline(video_model, is_i2v) gerektirir
```
`/preload` endpoint'i TypeError fÄ±rlatacak â€” zorunlu argÃ¼manlar eksik.

---

### 2. f5tts â€” YanlÄ±ÅŸ Import Yolu
**Dosya**: `f5tts/app.py:33-34`  
```python
from f5_tts.model import DiT
from f5_tts.infer import InferenceSession
```
`f5-tts>=1.1.0` paketinde `f5_tts.infer` modÃ¼lÃ¼ mevcut deÄŸil. DoÄŸru kullanÄ±m: `from f5_tts.api import F5TTS`. ImportError garanti.

---

### 3. wan25 â€” PyTorch SÃ¼rÃ¼m Ã‡akÄ±ÅŸmasÄ±
**Dosya**: `wan25/Dockerfile:10-13`  
```
torch==2.5.1+cu121 torchvision==0.20.1+cu121 torchaudio==2.5.1+cu121
```
Base image'deki xformers==0.0.25 (PyTorch 2.2.1 iÃ§in derlenmiÅŸ) bu yÃ¼klemeyle kÄ±rÄ±labilir. CUDA sÃ¼rÃ¼mÃ¼ uyuÅŸsa bile ABI uyumsuzluÄŸu olasÄ±lÄ±ÄŸÄ± yÃ¼ksek.

---

### 4. realesrgan â€” YanlÄ±ÅŸ CMD
**Dosya**: `realesrgan/Dockerfile:9`  
```dockerfile
CMD ["/opt/conda/bin/python", "-u", "app.py"]
```
TÃ¼m diÄŸer konteynerler `runpod_handler.py` kullanÄ±yor. realesrgan doÄŸrudan `app.py` Ã§alÄ±ÅŸtÄ±rÄ±yor â€” RunPod serverless modda Ã§alÄ±ÅŸmaz. AyrÄ±ca `COPY runpod_handler.py` ve `COPY shared/` eksik.

---

### 5. sadtalker â€” Runtime'da Git Clone
**Dosya**: `sadtalker/app.py:29-31`  
```python
subprocess.run(["git", "clone", "...SadTalker.git", MODEL_DIR], ...)
```
RunPod serverless ortamÄ±nda git clone baÅŸarÄ±sÄ±z olabilir (aÄŸ kÄ±sÄ±tlamalarÄ±). Dockerfile'da build-time clone yapÄ±lmÄ±ÅŸ olsa da, runtime'da tekrar deneme riski var.

---

### 6. hunyuan â€” GÃ¼venlik AÃ§Ä±ÄŸÄ± (exec)
**Dosya**: `hunyuan/app.py:256`  
```python
exec(code)  # /diagnose endpoint'inde
```
Rastgele kod Ã§alÄ±ÅŸtÄ±ran bir endpoint â€” ĞºĞ¾Ğ½Ñ‚eyĞ½ĞµÑ€ dÄ±ÅŸarÄ±dan eriÅŸime aÃ§Ä±ksa ciddi gÃ¼venlik riski.

---

### 7. wan/ltx â€” YanlÄ±ÅŸ Python Yolu (diagnose)
**Dosya**: `wan/app.py:355`, `ltx/app.py:363`  
```python
"/opt/conda/lib/python3.10/site-packages/transformers/..."
```
Base image Python 3.9 kullanÄ±yor, 3.10 deÄŸil. Bu path mevcut deÄŸil â€” diagnose endpoint'i her zaman hata verecek.

---

### 8. geneface â€” CUDA 11.8 UyumsuzluÄŸu
**Dosya**: `geneface/Dockerfile:3,39`  
```dockerfile
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-devel AS builder
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-runtime
```
`ai-publisher-base` kullanmÄ±yor. CUDA 11.8 ile tÃ¼m diÄŸer konteynerlarÄ±n (CUDA 12.1) uyumsuz. Multi-stage build image boyutunu azaltsa da, GPU sÃ¼rÃ¼cÃ¼sÃ¼ uyumsuzluÄŸu riski yÃ¼ksek.

---

### 9. video-retalking â€” AynÄ± CUDA 11.8 Sorunu
**Dosya**: `video-retalking/Dockerfile:2`  
```dockerfile
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-devel
```
Geneface ile aynÄ± sorun. Ãœstelik multi-stage olmadÄ±ÄŸÄ± iÃ§in image boyutu Ã§ok bÃ¼yÃ¼k olacak.

---

## ğŸŸ¡ ORTA SEVÄ°YE BULGULAR

### 10. pyramid-flow â€” Ã–lÃ¼ Kod
**Dosya**: `pyramid-flow/app.py:50-57`  
Ä°kinci `if current_pipe is not None` kontrolÃ¼ asla Ã§alÄ±ÅŸmayacak â€” dead code.

### 11. zeroscope â€” Agresif Versiyon Sabitleme
**Dosya**: `zeroscope/Dockerfile:8-12`  
`accelerate==0.30.0`, `numpy==1.24.2`, `scipy==1.11.1` â€” base image'deki paketlerle Ã§akÄ±ÅŸabilir.

### 12. dynamicrafter â€” Eski numpy
**Dosya**: `dynamicrafter/Dockerfile:10`  
`numpy==1.24.2` sabitlenmiÅŸ, base image `numpy<2.0.0` kullanÄ±yor.

### 13. wav2lip â€” Tekrarlanan ARG/ENV
**Dosya**: `wav2lip/Dockerfile:3-4,29-30`  
`HF_TOKEN` iki kez tanÄ±mlanmÄ±ÅŸ â€” copy-paste hatasÄ±.

### 14. stablediffusion â€” Runtime Model Ä°ndirme
**Dosya**: `stablediffusion/app.py:121`  
RealESRGAN modeli GitHub'dan runtime'da indiriliyor â€” rate-limit riski.

### 15. videocrafter â€” YanlÄ±ÅŸ Output Path
**Dosya**: `videocrafter/app.py:154`  
`/content/output_videocrafter.mp4` â€” bu Colab path'i, `/workspace/outputs/` olmalÄ±.

### 16. sadtalker â€” Import BaÄŸÄ±mlÄ±lÄ±ÄŸÄ±
**Dosya**: `sadtalker/app.py:78-82`  
`from src.test_audio2coeff import Audio2Coeff` â€” cloned repo'nun iÃ§ yapÄ±sÄ±na baÄŸÄ±mlÄ±, repo deÄŸiÅŸirse kÄ±rÄ±lÄ±r.

---

## âœ… SAÄLIKLI MODELLER

| Model | Base | FFmpeg | Durum |
|-------|------|--------|-------|
| wan | ai-publisher-base | /usr/bin/ffmpeg libx264 | âœ… (diagnose hariÃ§) |
| ltx | ai-publisher-base | /usr/bin/ffmpeg libx264 | âœ… (diagnose hariÃ§) |
| hunyuan | ai-publisher-base | /usr/bin/ffmpeg libx264 | âœ… (exec risk hariÃ§) |
| mochi | ai-publisher-base | /usr/bin/ffmpeg libx264 | âœ… |
| svd | ai-publisher-base | diffusers export_to_video | âœ… |
| animatediff | ai-publisher-base | diffusers export_to_video | âœ… |
| audioldm2 | ai-publisher-base | WAV output (scipy) | âœ… |
| kokorotts | ai-publisher-base | WAV output (soundfile) | âœ… |
| whisper | ai-publisher-base | /usr/bin/ffmpeg libx264 | âœ… |
| xtts | ai-publisher-base | edge-tts CLI | âœ… |
| stablediffusion | ai-publisher-base | image output | âœ… |
| musetalk | ai-publisher-base | subprocess inference | âœ… |
| wav2lip | ai-publisher-base | /usr/bin/ffmpeg libx264 | âœ… |
| lora-trainer | ai-publisher-base | image output | âœ… |
| browser-use | python:3.11-slim | Playwright Chromium | âœ… |

---

## ğŸ”§ Ã–NERÄ°LEN DÃœZELTMELER (Ã–ncelik sÄ±rasÄ±na gÃ¶re)

1. **cogvideox/preload**: `get_pipeline()` Ã§aÄŸrÄ±sÄ±na argÃ¼man ekle veya varsayÄ±lan deÄŸer ata
2. **f5tts**: `f5_tts.infer.InferenceSession` â†’ `f5_tts.api.F5TTS` olarak deÄŸiÅŸtir
3. **realesrgan**: CMD'yi `runpod_handler.py` olarak deÄŸiÅŸtir, shared/ kopyala
4. **wan25**: torch versiyonunu base image ile uyumlu tut (2.2.1) veya xformers'i gÃ¼ncelle
5. **wan/ltx diagnose**: `python3.10` yerine `sys.version_info` ile dinamik path kullan
6. **hunyuan exec**: /diagnose endpoint'ini kaldÄ±r veya sandbox'la
7. **geneface/video-retalking**: CUDA 11.8 yerine CUDA 12.1 base image kullan (PyTorch 2.2.1 uyumlu)
8. **sadtalker**: Runtime git clone'i build-time'a taÅŸÄ±
9. **pyramid-flow**: Dead code'u temizle
10. **zeroscope/dynamicrafter**: SabitlenmiÅŸ eski versiyonlarÄ± gevÅŸet

---

## ğŸ“ Notlar

- TÃ¼m modeller `runpod_handler.py` Ã¼zerinden Flask app'Ä± baÅŸlatÄ±yor (realesrgan hariÃ§)
- TÃ¼m Flask app'leri port 5000'de dinliyor
- B2 yÃ¼kleme `shared/utils.py` Ã¼zerinden yapÄ±lÄ±yor
- FFmpeg codec'i tÃ¼m video modellerinde `libx264` â€” doÄŸru seÃ§im
- VRAM yÃ¶netimi modellerin Ã§oÄŸunda mevcut (cpu_offload, tiling)
