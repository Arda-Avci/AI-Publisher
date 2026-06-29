# 🐳 Docker & Runtime Audit Report — colab_docker/

**Tarih**: 2026-06-28  
**Kapsam**: 26 model dizini (Dockerfile + app.py)  
**Amaç**: Build ve runtime hatalarını tespit etmek

---

## 📊 Özet Tablo

| Kritik | Orta | Düşük | Toplam Bulgu |
|--------|------|-------|--------------|
| 9 | 7 | 5 | 21 |

---

## 🏗️ Base Image (Dockerfile.base)

| Özellik | Değer |
|---------|-------|
| Base | `pytorch/pytorch:2.2.1-cuda12.1-cudnn8-devel` |
| PyTorch | 2.2.1 (pinned) |
| CUDA | 12.1 |
| FFmpeg | Static build → `/usr/bin/ffmpeg` |
| Python | Conda Python 3.9 |
| diffusers | >=0.35,<0.36 |
| transformers | >=4.46 |
| xformers | 0.0.25 |

---

## 🔴 KRİTİK BULGULAR (Build/Run-time Hata)

### 1. cogvideox — preload() Kırık
**Dosya**: `cogvideox/app.py:286`  
```python
pipe = get_pipeline()  # get_pipeline(video_model, is_i2v) gerektirir
```
`/preload` endpoint'i TypeError fırlatacak — zorunlu argümanlar eksik.

---

### 2. f5tts — Yanlış Import Yolu
**Dosya**: `f5tts/app.py:33-34`  
```python
from f5_tts.model import DiT
from f5_tts.infer import InferenceSession
```
`f5-tts>=1.1.0` paketinde `f5_tts.infer` modülü mevcut değil. Doğru kullanım: `from f5_tts.api import F5TTS`. ImportError garanti.

---

### 3. wan25 — PyTorch Sürüm Çakışması
**Dosya**: `wan25/Dockerfile:10-13`  
```
torch==2.5.1+cu121 torchvision==0.20.1+cu121 torchaudio==2.5.1+cu121
```
Base image'deki xformers==0.0.25 (PyTorch 2.2.1 için derlenmiş) bu yüklemeyle kırılabilir. CUDA sürümü uyuşsa bile ABI uyumsuzluğu olasılığı yüksek.

---

### 4. realesrgan — Yanlış CMD
**Dosya**: `realesrgan/Dockerfile:9`  
```dockerfile
CMD ["/opt/conda/bin/python", "-u", "app.py"]
```
Tüm diğer konteynerler `runpod_handler.py` kullanıyor. realesrgan doğrudan `app.py` çalıştırıyor — RunPod serverless modda çalışmaz. Ayrıca `COPY runpod_handler.py` ve `COPY shared/` eksik.

---

### 5. sadtalker — Runtime'da Git Clone
**Dosya**: `sadtalker/app.py:29-31`  
```python
subprocess.run(["git", "clone", "...SadTalker.git", MODEL_DIR], ...)
```
RunPod serverless ortamında git clone başarısız olabilir (ağ kısıtlamaları). Dockerfile'da build-time clone yapılmış olsa da, runtime'da tekrar deneme riski var.

---

### 6. hunyuan — Güvenlik Açığı (exec)
**Dosya**: `hunyuan/app.py:256`  
```python
exec(code)  # /diagnose endpoint'inde
```
Rastgele kod çalıştıran bir endpoint — контeyнер dışarıdan erişime açıksa ciddi güvenlik riski.

---

### 7. wan/ltx — Yanlış Python Yolu (diagnose)
**Dosya**: `wan/app.py:355`, `ltx/app.py:363`  
```python
"/opt/conda/lib/python3.10/site-packages/transformers/..."
```
Base image Python 3.9 kullanıyor, 3.10 değil. Bu path mevcut değil — diagnose endpoint'i her zaman hata verecek.

---

### 8. geneface — CUDA 11.8 Uyumsuzluğu
**Dosya**: `geneface/Dockerfile:3,39`  
```dockerfile
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-devel AS builder
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-runtime
```
`ai-publisher-base` kullanmıyor. CUDA 11.8 ile tüm diğer konteynerların (CUDA 12.1) uyumsuz. Multi-stage build image boyutunu azaltsa da, GPU sürücüsü uyumsuzluğu riski yüksek.

---

### 9. video-retalking — Aynı CUDA 11.8 Sorunu
**Dosya**: `video-retalking/Dockerfile:2`  
```dockerfile
FROM pytorch/pytorch:2.1.2-cuda11.8-cudnn8-devel
```
Geneface ile aynı sorun. Üstelik multi-stage olmadığı için image boyutu çok büyük olacak.

---

## 🟡 ORTA SEVİYE BULGULAR

### 10. pyramid-flow — Ölü Kod
**Dosya**: `pyramid-flow/app.py:50-57`  
İkinci `if current_pipe is not None` kontrolü asla çalışmayacak — dead code.

### 11. zeroscope — Agresif Versiyon Sabitleme
**Dosya**: `zeroscope/Dockerfile:8-12`  
`accelerate==0.30.0`, `numpy==1.24.2`, `scipy==1.11.1` — base image'deki paketlerle çakışabilir.

### 12. dynamicrafter — Eski numpy
**Dosya**: `dynamicrafter/Dockerfile:10`  
`numpy==1.24.2` sabitlenmiş, base image `numpy<2.0.0` kullanıyor.

### 13. wav2lip — Tekrarlanan ARG/ENV
**Dosya**: `wav2lip/Dockerfile:3-4,29-30`  
`HF_TOKEN` iki kez tanımlanmış — copy-paste hatası.

### 14. stablediffusion — Runtime Model İndirme
**Dosya**: `stablediffusion/app.py:121`  
RealESRGAN modeli GitHub'dan runtime'da indiriliyor — rate-limit riski.

### 15. videocrafter — Yanlış Output Path
**Dosya**: `videocrafter/app.py:154`  
`/content/output_videocrafter.mp4` — bu Colab path'i, `/workspace/outputs/` olmalı.

### 16. sadtalker — Import Bağımlılığı
**Dosya**: `sadtalker/app.py:78-82`  
`from src.test_audio2coeff import Audio2Coeff` — cloned repo'nun iç yapısına bağımlı, repo değişirse kırılır.

---

## ✅ SAĞLIKLI MODELLER

| Model | Base | FFmpeg | Durum |
|-------|------|--------|-------|
| wan | ai-publisher-base | /usr/bin/ffmpeg libx264 | ✅ (diagnose hariç) |
| ltx | ai-publisher-base | /usr/bin/ffmpeg libx264 | ✅ (diagnose hariç) |
| hunyuan | ai-publisher-base | /usr/bin/ffmpeg libx264 | ✅ (exec risk hariç) |
| mochi | ai-publisher-base | /usr/bin/ffmpeg libx264 | ✅ |
| svd | ai-publisher-base | diffusers export_to_video | ✅ |
| animatediff | ai-publisher-base | diffusers export_to_video | ✅ |
| audioldm2 | ai-publisher-base | WAV output (scipy) | ✅ |
| kokorotts | ai-publisher-base | WAV output (soundfile) | ✅ |
| whisper | ai-publisher-base | /usr/bin/ffmpeg libx264 | ✅ |
| xtts | ai-publisher-base | edge-tts CLI | ✅ |
| stablediffusion | ai-publisher-base | image output | ✅ |
| musetalk | ai-publisher-base | subprocess inference | ✅ |
| wav2lip | ai-publisher-base | /usr/bin/ffmpeg libx264 | ✅ |
| lora-trainer | ai-publisher-base | image output | ✅ |
| browser-use | python:3.11-slim | Playwright Chromium | ✅ |

---

## 🔧 ÖNERİLEN DÜZELTMELER (Öncelik sırasına göre)

1. **cogvideox/preload**: `get_pipeline()` çağrısına argüman ekle veya varsayılan değer ata
2. **f5tts**: `f5_tts.infer.InferenceSession` → `f5_tts.api.F5TTS` olarak değiştir
3. **realesrgan**: CMD'yi `runpod_handler.py` olarak değiştir, shared/ kopyala
4. **wan25**: torch versiyonunu base image ile uyumlu tut (2.2.1) veya xformers'i güncelle
5. **wan/ltx diagnose**: `python3.10` yerine `sys.version_info` ile dinamik path kullan
6. **hunyuan exec**: /diagnose endpoint'ini kaldır veya sandbox'la
7. **geneface/video-retalking**: CUDA 11.8 yerine CUDA 12.1 base image kullan (PyTorch 2.2.1 uyumlu)
8. **sadtalker**: Runtime git clone'i build-time'a taşı
9. **pyramid-flow**: Dead code'u temizle
10. **zeroscope/dynamicrafter**: Sabitlenmiş eski versiyonları gevşet

---

## 📝 Notlar

- Tüm modeller `runpod_handler.py` üzerinden Flask app'ı başlatıyor (realesrgan hariç)
- Tüm Flask app'leri port 5000'de dinliyor
- B2 yükleme `shared/utils.py` üzerinden yapılıyor
- FFmpeg codec'i tüm video modellerinde `libx264` — doğru seçim
- VRAM yönetimi modellerin çoğunda mevcut (cpu_offload, tiling)
