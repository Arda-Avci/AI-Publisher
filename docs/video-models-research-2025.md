# Video Üretim Modelleri Araştırma Raporu — 2025

> Mevcut AI-Publisher envanteri karşılaştırmalı analiz + eksik açık kaynak model önerileri + API fiyatlandırması.

---

## 1. AI-Publisher'da Olmayan Açık Kaynak Modeller

### 1.1 Yüksek Öncelik — Pipeline'a Uyumlu (diffusers/HF uyumlu)

| Model | Tip | Framework | GitHub | VRAM | Öneri |
|--------|-----|-----------|--------|------|--------|
| **Open-Sora** (ByteDance) | T2V | PyTorch | [GitHub](https://github.com/hpcaitech/Open-Sora) | ≥24GB | ★★★★★ — STDiT mimarisi, yüksek kalite |
| **Open-Sora-Plan v1.1** | T2V | PyTorch | [ModelScope](https://modelscope.cn/models/AI-MScope/Open-Sora-Plan-v1.0.0) | ≥24GB | ★★★★★ — Açık kaynak, uzun video |
| **I2VGen-XL** (Alibaba) | I2V | PyTorch | [ModelScope](https://modelscope.cn/models/iic/i2vgen-xl) | ≥16GB | ★★★★☆ — I2V için güçlü |
| **LaVie** (Mozilla) | T2V | PyTorch | [GitHub](https://github.com/mlfoundations/lavie) | ≥16GB | ★★★☆☆ — Tümdengelim video üretimi |
| **VideoCrafter** (NVIDIA MCG-NJU) | T2V/I2V | PyTorch | [GitHub](https://github.com/MCG-NJU/VideoCrafter) | ≥12GB | ★★★★☆ — Çoklu model ailesi |
| **CogVideoX-1.5** (THUDM) | T2V/I2V | diffusers | [GitHub](https://github.com/THUDM/CogVideoX) | ≥16GB | ★★★★☆ — Mevcut CogVideoX'in iyileştirmesi |
| **Show-1** (ByteDance) | T2V | PyTorch | [GitHub](https://github.com/bytedance/Show-1) | ≥12GB | ★★★☆☆ — Çok aşamalı pipeline |
| **EMU3** (Meta) | T2V/I2V | PyTorch | [GitHub](https://github.com/facebookresearch/EMU3) | ≥24GB | ★★★★☆ — multimodal açık model |
| **Lightning** (ByteDance) | T2V | PyTorch | açık kaynak değil | — | Kapalı kaynak API |
| **ModelScope T2V** | T2V | diffusers | [ModelScope](https://modelscope.cn) | ≥12GB | ★★★☆☆ — Çin ekosistemine açılan kapı |

### 1.2Dikkat Çekici Ama Pipeline'a Uyumsuz (Restructuring gerekir)

| Model | Tip | Not | Yeniden Yapılandırma Zorluğu |
|--------|-----|-----|---------------------------|
| **Open-MVideo** (Microsoft) | T2V | Büyük ölçekli, MM-DiT | ⚠️ Orta — HF diffusers değil, özelleştirilmiş pipeline |
| **LaVie-2** | T2V | Yüksek kalite, iframe pipeline | ⚠️ Yüksek — özel eğitim kodu gerekli |
| **WALT** (Google) | T2V | SVD alternatifi | ⚠️ Orta — Transformer-based, HF entegrasyonu mevcut değil |
| **Lumiere** (Google) | T2V | Space-time diffusion | ⚠️ Yüksek — Google Research özel |
| **Mochi-1** (Genmo) | T2V | Halihazırda var (mochi) | ✓ Zaten var |

### 1.3 Ozel API Gerektiren (Açık kaynak yok / cloud-only)

| Servis | Tür | API Var mı? | Fiyatlandırma |
|--------|-----|-------------|---------------|
| **Sora** (OpenAI) | T2V | Cloud API | Bilinmiyor — erişim sınırlı |
| **Veo 2** (Google) | T2V | Vertex AI API | ~$0.10–0.35/sn (değişken) |
| **Kling** (Kuaishou) | T2V/I2V | API mevcut | ~$0.10/sn |
| **Luma Dream Machine** | T2V/I2V | API mevcut | Kaynak bulunamadı |
| **Haiper** | T2V/I2V | API mevcut | Kaynak bulunamadı |
| **PixVerse** | T2V/I2V | API mevcut | Kaynak bulunamadı |

---

## 2. Ticari Video API Fiyatlandırması

### 2.1 Runway
| Plan | Aylık | Kredi | Kredi/Saniye | Süre |
|------|--------|-------|--------------|------|
| Free | $0 | 125 (bir kerelik) | ~6 kredi/sn | ~20sn |
| Standard | $12/yıl | 625/ay | ~6 kredi/sn | ~100sn |
| Pro | $28/yıl | 2,250/ay | — | ~375sn |
| Max | $76/yıl | 9,500/ay | — | ~1,580sn |

> **Kod:** Gen-4.5 Turbo (~6 kredi/sn) — Standart planda ~100sn video/ay.

### 2.2 Pika Labs
| Plan | Aylık | Kredi | 5s 480p | 5s 1080p |
|------|--------|-------|----------|-----------|
| Free | $0 | 80 | 12 kredi | 65 kredi |
| Basic | $8 | 700 | 24 kredi | 65 kredi |
| Standard | $28 | 2,300 | 24 kredi | 65 kredi |
| Pro | $76 | 6,000 | 24 kredi | 65 kredi |

> **Kod:** Pika 2.5 — 480p 5s = 12 kredi (free) / 24 kredi (paid). 1080p 5s = 65 kredi.

### 2.3 Diğer API Sağlayıcılar (Bulunan Veriler)

| Sağlayıcı | Model | Durum |
|------------|-------|-------|
| **Kling AI** | Kling 1.5 / 2.0 | API mevcut — tam fiyat bulunamadı |
| **Luma AI** | Dream Machine 1.6 | API mevcut — fiyat yayınlanmamış |
| **Haiper AI** | Haiper Turbo | API mevcut — fiyat yayınlanmamış |
| **PixVerse** | v3 | API mevcut — fiyat yayınlanmamış |
| **Veo 2** (Google) | Veo 2 | Vertex AI üzerinden | ~$0.10–0.35/sn (Vertex AI standart) |
| **Sora** (OpenAI) | Sora | Erişim çok sınırlı | Bilinmiyor |

---

## 3. Donanım İhtiyaçları Karşılaştırması

### AI-Publisher'da Olan Modeller

| Model | Minimum VRAM | Önerilen VRAM | GPU Türü |
|-------|-------------|--------------|---------|
| CogVideoX-5b | 12GB | 18GB+ | A100 / 3090 / A10G |
| CogVideoX-2b | 8GB | 12GB+ | T4 / 3060 |
| Wan 2.1 | 12GB | 18GB+ | A100 / 3090 |
| Wan 2.5 | 16GB | 24GB+ | A100 |
| HunyuanVideo | 12GB | 18GB+ | A100 / 3090 |
| LTX-Video | 12GB | 18GB+ | A100 / 3090 |
| Pyramid-Flow | 12GB | 24GB+ | A100 |
| Stable Video Diffusion | 8GB | 12GB+ | T4 / 3090 |
| Zeroscope | 8GB | 12GB+ | T4 / 3090 |
| AnimateDiff | 12GB | 18GB+ | A100 / 3090 |
| Mochi-1 | **22GB** | 40GB+ | A100 40GB ⚠️ |
| DynamiCrafter | 8GB | 12GB+ | T4 / 3090 |
| AudioLDM2 | 4GB | 8GB+ | Herhangi bir GPU |
| F5-TTS | 4GB | 8GB+ | Herhangi bir GPU (CPU fallback mevcut) |
| XTTS / Kokoro | 2GB | 4GB+ | Herhangi bir GPU / CPU |
| Whisper | 2GB | 4GB+ | Herhangi bir GPU / CPU |
| Wav2Lip | 4GB | 6GB+ | T4 / 3090 |
| MuseTalk | 6GB | 8GB+ | T4 / 3090 |
| LoRA Trainer | 16GB | 24GB+ | A100 (FP8 quantizasyon ile 16GB yeterli) |

### AI-Publisher'da Olmayan Modeller

| Model | Minimum VRAM | Önerilen VRAM | GPU Türü |
|-------|-------------|--------------|---------|
| **Open-Sora** | 20GB | 40GB+ | A100 40GB / H100 |
| **Open-Sora-Plan** | 20GB | 40GB+ | A100 40GB / H100 |
| **I2VGen-XL** | 12GB | 24GB+ | A100 |
| **LaVie** | 12GB | 24GB+ | A100 |
| **VideoCrafter** | 10GB | 16GB+ | A100 / 3090 |
| **CogVideoX-1.5** | 12GB | 24GB+ | A100 |
| **Show-1** | 10GB | 16GB+ | A100 / 3090 |
| **EMU3** | 20GB | 40GB+ | H100 / A100 40GB |

---

## 4. Entegrasyon Durumu (2026)

### ✅ Tamamlanan Entegrasyonlar

| Model/Servis | Tür | Durum |
|-------------|-----|-------|
| **VideoCrafter** | T2V/I2V (Docker, port 5024) | ✅ Self-hosted, custom PyTorch LV-DM |
| **Runway Gen-4.5 Turbo** | Cloud API | ✅ `src/services/runwayService.ts` |
| **Kling AI 2.0** | Cloud API | ✅ `src/services/klingService.ts` |
| **Pika Labs 2.5** | Cloud API | ✅ `src/services/pikaService.ts` |
| **Luma Dream Machine 1.6** | Cloud API | ✅ `src/services/lumaService.ts` |
| **Haiper Turbo** | Cloud API | ✅ `src/services/haiperService.ts` |
| **PixVerse v3** | Cloud API | ✅ `src/services/pixverseService.ts` |
| **Veo 2 (Vertex AI)** | Cloud API | ✅ `src/services/veo2Service.ts` |

> Tüm cloud API'ler platform geneli tek API key kullanır. Ücretlendirme: API maliyeti × 1.5. Kredi sistemi `src/services/creditService.ts` ile entegre.

### Kalan Öncelikler

| Model | Durum | Not |
|-------|-------|-----|
| **Open-Sora-Plan** | Beklemede | diffusers/PyTorch, MM-DiT |
| **I2VGen-XL** | Beklemede | Alibaba açık kaynak |
| **CogVideoX-1.5** | Beklemede | Mevcut CogVideoX'in yükseltmesi |

---

## 5. Sonuç ve Öncelik Sıralaması

### Açık Kaynak İçin (RunPod'da Self-Hosted)

1. **Open-Sora-Plan** — En yüksek kaliteli açık T2V, uzun video (60s+), aktif geliştirme
2. **VideoCrafter** — NVIDIA MCG-NJU, T2V+I2V+Video-to-Video ailesi, güvenilir
3. **I2VGen-XL** — Alibaba, güçlü I2V performansı, mevcut pipeline'a yakın
4. **CogVideoX-1.5** — Mevcut CogVideoX'in doğrudan yükseltmesi (en az iş)

### Cloud API İçin

1. **Veo 2** — En kaliteli cloud video API, Vertex AI üzerinden mevcut altyapıyla uyumlu
2. **Kling AI** — Uygun fiyatlı, hızlı, yaygın kullanım
3. **Pika Labs** — Uygun fiyatlı, küçük içerik üreticileri için ideal
