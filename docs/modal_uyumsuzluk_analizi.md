# Modal Uyumsuzluk Analizi

> Tarih: 2026-07-01
> Kapsam: 26 Dockerfiles + 26 app.py + Modal template

---

## 1. Base Image Kaosu (KRİTİK)

3 farklı base image, 3 farklı torch sürümü:

| Base | torch | CUDA | Kullanan Model Sayısı |
|------|-------|------|----------------------|
| `pytorch/pytorch:2.2.1-cuda12.1` | **2.2.1** | 12.1 | 17 |
| `pytorch/pytorch:2.6.0-cuda12.4` | **2.6.0** | 12.4 | 5 |
| `pytorch/pytorch:2.1.2-cuda11.8` | **2.1.2** | 11.8 | 2 |
| `pytorch/pytorch:2.8.0-cuda12.6` | **2.8.0** | 12.6 | 1 (cogvideox) |
| `python:3.11-slim` | **yok** | yok | 1 (browser-use) |

### Sorun: torch override savaşları

| Model | Dockerfile'da Ne Yapıyor | Base torch | Sonuç |
|-------|-------------------------|-----------|-------|
| **f5tts** | `pip install torch>=2.5.0` | 2.2.1 → **2.5.x** | torchaudio ABI kırılır |
| **wan25** | `pip install torch==2.5.1+cu121` | 2.6.0 → **2.5.1** | 2.6.0 → 2.5.1 downgrade |
| **lora-trainer** | `pip install torch>=2.5.0` | 2.2.1 → **2.5.x** | torchaudio ABI kırılır (deploy'da yok) |

### Neden KRİTİK?
- Base image `torch==2.2.1` + `xformers==0.0.25` ikisine de sabitlenmiş
- Bir model torch'u upgrade edince xformers çöker + torchaudio ABI uyumsuz olur
- **Template'deki torchaudio ABI fix (runtime `pip install torchaudio==X`) bir yama, çözüm değil**
- Global `transformers>=4.46` pin (base) vs `transformers<4.46` pin (kokoro template) çelişiyor

---

## 2. Monkey-Patch Bataklığı (KRİTİK)

15/26 modelde torch 2.2.1'in eksik API'leri için **yamasal (monkey-patch) kod** var.

### Patch Türleri

| Patch Türü | Etkilenen Modeller | Nedeni |
|-----------|-------------------|--------|
| `torch.__version__` override | 10 model | Kod `torch>=2.4.0` API kullanır, base 2.2.1 |
| `torch.compiler.is_compiling` mock | 10 model | torch 2.2.1'de yok |
| `torch.amp.GradScaler` mock | 10 model | API değişmiş |
| `nn.RMSNorm` import patches | 8 model | transformers/diffusers RMSNorm farklı |
| `SDPA enable_gqa` patches | 8 model | torch 2.2.1'de SDPA farklı |
| `torch.library.custom_op` hacks | 3 model | torch 2.2.1'de yok |
| `torch.uint16/32/64` ekleme | 5 model | torch 2.2.1'de yok |
| T5TokenizerFull module injection | 10 model | transformers sürüm farkı |
| `torch.get_default_device` patch | 10 model | transformers API değişikliği |

### Neden Yok Edilmesi Gerek
- Her patch başka bir patch'i tetikliyor (ör: wan/ltx'te T5 injection 150+ satır)
- Farklı torch sürümünde çalıştırınca *bazı* patch'ler çöker
- **Kök neden: Base image torch 2.2.1 ama kod 2.4+/2.5+ API gerektiriyor**
- Çözüm: base image torch 2.5+ yap → 15 modelin patch'leri gereksiz kalır

---

## 3. Soğuk Başlatma (Cold Start) Problemi (YÜKSEK)

Modal'da GPU model soğuk başlatma süreleri:

| Aşama | Süre |
|-------|------|
| GPU tahsisi (Modal scheduler) | 10-60s |
| GHCR image pull | 30-120s |
| Template setup (torchaudio fix + launcher) | 15-30s |
| Thread-launcher Flask health | ~2s (hemen yanıt verir) |
| Model import + weight load | 30-300s+ |
| **Toplam** | **~2-8 dk** |

### Sorunlar
- **5-dk test timeout**: f5tts cold start >5 dk → test başarısız
- **Template 503/504 retry**: 10 dk retry loop'u var ama test script 5 dk'da cancel ediyor
- **Whisper → kokoro pipeline**: Kokoro 35s'de yanıt veriyor ama whisper cold start'ı pipeline'a eklenince toplam >5 dk

### Çözüm Önerileri
1. Modal `enable_memory_snapshot=True` → ilk warm'dan sonra 5-10s cold start
2. Kritik modeller için `min_containers=1` (maliyetli ama garantili hızlı yanıt)
3. Test timeout'u GPU modeller için 10 dk'ya çıkar

---

## 4. Modal vs RunPod CMD Farkı (ORTA)

| Özellik | RunPod | Modal |
|---------|--------|-------|
| Entrypoint | Image CMD'sini çalıştırır | `@app.function` Python fonksiyonunu çalıştırır |
| Handler | `runpod_handler.py` (input alır, output döner) | Modal `generate()` fonksiyonu |
| Flask | `app.py` (manuel başlatılır) | Template'de Flask launcher thread'de başlatılır |
| Port | Container'ın portu açılır | Modal internal routing |

### Etkiler
10 model `sys.path.insert()` yapıyor → Modal template `/app/app.py` import ediyor, doğru çalışıyor
realesrgan: `CMD` direkt `app.py` → bu Modal için fark etmez, template import ediyor
browser-use: Hiç `CMD` yok → template import ediyor

**Risk**: Modal template'in Flask launcher'ı real app'i `importlib` ile import ediyor. Eğer app.py __name__ == "__main__" kontrolü yapıyorsa ve `app.run()` çağırıyorsa sorun olmaz. Ama bazı app.py'ler `if __name__ == "__main__": app.run()` ile başlıyorsa bu import sırasında çalışmaz.

---

## 5. Bağımlılık Çatışmaları (ORTA)

### transformers Sürüm Çatışması
- **Base**: `transformers>=4.46` (torch 2.2.1 için)
- **Kokoro template**: `transformers<4.46` pin'i
- **Kokoro Dockerfile** hiç transformers pin'lemiyor
- **Base-cuda126**: `transformers>=4.57` (çok yeni)

### diffusers Sürüm Çatışması
- **Base**: `diffusers>=0.35,<0.36`
- **animatediff Dockerfile**: `diffusers>=0.29.0` (Base'dekiyle uyumlu)
- **Base-cuda124** (wan25, mochi, hunyuan): `diffusers>=0.35,<0.36` → uyumlu
- **Base-cuda126** (cogvideox): `diffusers>=0.35,<0.36` → uyumlu

### numpy Sürüm Çatışması
- **Base**: `numpy<2.0.0` (soft pin)
- **Base-cuda126**: `numpy==1.26.0` (hard pin)
- **dynamicrafter Dockerfile**: `numpy==1.24.2` → downgrade
- **zeroscope Dockerfile**: `numpy==1.24.2` → downgrade

### xformers Kilit
- **Base**: `xformers==0.0.25` (torch 2.2.1 için compile edilmiş)
- torch upgrade edilince xformers da upgrade gerektirir
- xformers 0.0.28+ torch 2.5.x desteği var

---

## 6. Modal GPU Türü Eşleme Sorunları (DÜŞÜK)

| GPU | Modal Karşılığı | CUDA Sürümü | Not |
|-----|----------------|-------------|-----|
| T4 | A10 | SM 7.5 | Çok yavaş, kullanma |
| A10 | A10 | SM 8.6 | 24GB VRAM |
| A100 | A100 | SM 8.0 | 40/80GB VRAM |
| H100 | H100 | SM 9.0 | 80GB VRAM |

### VRAM Kısıtlamaları
- **wan25** (14B): A10 24GB yetmez → H100 gerekir ✅ doğru atanmış
- **wan** (I2V-14B): H100 gerekir ✅
- **hunyuan**: A100 gerekir ✅
- **mochi**: 22GB+ gerekir, A100 ✅ (ama kodu `VRAM<22GB` kontrolü yapıyor)
- **stablediffusion**: A10 yeter ✅
- **cogvideox**: A100 gerekir ✅

---

## 7. Test Edilen Modellerde Alınan Hatalar

| Hata | Kaynak | Nedeni | Çözüm |
|------|--------|--------|-------|
| **f5tts TIMEOUT** (302s) | Test script | Cold start >5 dk | Snapshot veya timeout artır |
| **Whisper TIMEOUT** (pipeline) | Test script | Cold start >5 dk | Snapshot veya timeout artır |
| **XTTS fallback** | XTTS app.py | Ses referansı yok → edge-tts | Normal davranış, hata değil |
| Model yüklenirken 503 | Template proxy | Module loading sırasında | Normal davranış, retry ediyor |

---

## 8. Test Edilmeyen Modellerde Tahmini Risk

| Risk Seviyesi | Model Sayısı | Neden |
|--------------|-------------|-------|
| ✅ DÜŞÜK (çalışır) | 4 | audioldm2, realesrgan, svd, zeroscope — basit diffusers pipeline, az patch |
| ⚠️ ORTA | 6 | animatediff, dynamicrafter, wav2lip, video-retalking — git clone gerekli |
| 🔴 YÜKSEK | 11 | wan, wan25, ltx, cogvideox, hunyuan, mochi, stablediffusion, pyramid-flow — ağır patch + weight download |
| ❓ BİLİNMİYOR | 2 | geneface (CUDA 11.8), browser-use (farklı base) |
| 🚫 DEPLOY'DA YOK | 2 | lora-trainer, videocrafter |

---

## Önerilen Çözüm Sırası

### Acil (fix & test)
1. **Test timeout GPU modeller için 10 dk yap** — f5tts, whisper cold start >5 dk
2. **Modal snapshot ekl** — `enable_memory_snapshot=True` tüm GPU modellerde
3. **f5tts app.py parametre validasyonu** — test'in gönderdiği parametreler doğru mu?

### Kısa Vade (tek base image)
4. **Base image birleştir**: `pytorch/pytorch:2.5.1-cuda12.4-cudnn9-devel`
   - torch 2.5.1 → f5tts (`torch>=2.5.0`) ve wan25 (`torch==2.5.1`) ile uyumlu
   - xformers 0.0.28+ ile uyumlu
   - transformers 4.46+ ile uyumlu
   - 15 modeldeki monkey-patch'lerin çoğu gereksiz kalır
5. **xformers upgrade**: `xformers>=0.0.28`
6. **CUDA 12.4 standardize**: Modal A10/A100/H100 hepsi CUDA 12.x driver

### Orta Vade (kod temizliği)
7. **Monkey-patch'leri kaldır** — 15 modelden ~500 satır yama kod silinir
8. **2 aşamalı deploy**: Base image rebuild → tüm model Dockerfile güncelle
9. **Pipeline testleri**: Kokoro→Whisper, StableDiffusion→Wav2Lip, XTTS→Wav2Lip
