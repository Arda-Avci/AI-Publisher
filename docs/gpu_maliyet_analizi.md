# GPU Sunucu Maliyet Analizi

## Mevcut Durum: Google Colab

### Colab Kullanım Maliyeti

| Plan | Aylık Ücret | GPU | VRAM | Limitlemeler |
|------|------------|-----|------|-------------|
| **Colab Free** | $0 | T4 (isteğe bağlı) | 16 GB | 2-4 saat/gün, düşük öncelik |
| **Colab Pro** | ~$11/ay | T4/L4 | 16-24 GB | Daha yüksek kota, arka planda çalışma |
| **Colab Pro+** | ~$55/ay | T4/L4/A100 öncelikli | 16-40 GB | En yüksek öncelik, premium GPU |
| **Colab Pay-As-You-Go** | $0.094/compute unit | T4/L4/A100 | — | Compute unit başına ücretlendirme |

### Aylık Colab Maliyeti Tahmini (Pro+)

| Kullanım Senaryosu | Saat/Gün | Gün/Ay | Aylık Maliyet |
|-------------------|----------|--------|-------------|
| Hafif (1-2 video/gün) | 4-6 | 30 | ~$55 (Pro+) |
| Orta (5-10 video/gün) | 8-12 | 30 | ~$55-110 |
| Ağır (20+ video/gün) | 16-24 | 30 | ~$55 + Ek compute unit |

**Colab dezavantajları:**
- Oturum 12 saatte resetlenir (kesinti)
- GPU değişken (T4/L4/A100 arası geçiş)
- ngrok/localtunnel bağımlılığı
- Önbellek yönetimi zor
- Model yükleme her oturumda tekrarlanır (~10-15 dk kayıp)
- Paylaşımlı GPU — komşu kullanıcı etkisi

---

## Seçenek 1: Fiziksel GPU Sunucu (Kendi Donanımı)

### Donanım Seçenekleri

| GPU Modeli | VRAM | Fiyat (Yeni) | Fiyat (İkinci El) | Performans |
|-----------|------|-------------|------------------|-----------|
| **NVIDIA RTX 3060 12GB** | 12 GB | ~$300 | ~$200 | CogVideoX-5b için yetersiz |
| **NVIDIA RTX 3090 24GB** | 24 GB | ~$1,500 | ~$900 | **Tavsiye edilen minimum** |
| **NVIDIA RTX 4090 24GB** | 24 GB | ~$2,000 | ~$1,600 | En iyi fiyat/performans |
| **NVIDIA A4000 16GB** | 16 GB | ~$1,100 | ~$700 | Yetersiz VRAM |
| **NVIDIA A5000 24GB** | 24 GB | ~$2,500 | ~$1,500 | Enterprise segment |
| **2× RTX 3090** | 48 GB | ~$3,000 | ~$1,800 | Paralel işleme |

### Sistem Maliyeti

| Bileşen | RTX 3090 Sistemi | RTX 4090 Sistemi |
|---------|-----------------|-----------------|
| GPU | $900 (2. el) | $1,600 (2. el) |
| CPU (Ryzen 5 5600 / i5-13400) | $150 | $200 |
| RAM 32GB DDR4/DDR5 | $60 | $80 |
| Anakart | $100 | $150 |
| PSU 850W+ | $120 | $150 |
| Depolama 1TB NVMe | $60 | $60 |
| Kasa + Soğutma | $100 | $120 |
| **Toplam** | **~$1,490** | **~$2,360** |

### Aylık İşletme Maliyeti

| Kalem | Aylık Maliyet |
|-------|-------------|
| Elektrik (RTX 3090 ~350W, 24/7 = 252 kWh/ay) | ~$38 (TR'de ~₺800) |
| İnternet (simetrik 100 Mbps) | ~$15 (TR'de ~₺300) |
| Bakım/yedek parça (amortisman) | ~$20 |
| **Toplam aylık** | **~$73 (TR'de ~₺1,900)** |

---

## Seçenek 2: Bulut GPU Kiralama

### Karşılaştırma Tablosu

| Sağlayıcı | GPU | VRAM | Saatlik Ücret | Aylık (24/7) | Aylık (8/5) |
|-----------|-----|------|-------------|-------------|------------|
| **Lambda Labs** | RTX 3090 | 24 GB | $0.50 | $360 | $80 |
| **Lambda Labs** | A100 80GB | 80 GB | $1.10 | $792 | $176 |
| **Vast.ai** | RTX 3090 | 24 GB | $0.25-0.50 | $180-360 | $40-80 |
| **Vast.ai** | RTX 4090 | 24 GB | $0.30-0.60 | $216-432 | $48-96 |
| **RunPod** | RTX 3090 | 24 GB | $0.39 | $281 | $62 |
| **RunPod** | RTX 4090 | 24 GB | $0.49 | $353 | $78 |
| **RunPod** | A100 80GB | 80 GB | $1.09 | $785 | $174 |
| **Hetzner** | RTX 4000 (20GB) | 20 GB | €0.89 | €641 | €142 |
| **Hetzner** | A100 80GB | 80 GB | €2.39 | €1,721 | €382 |
| **AWS (g4dn.xlarge)** | T4 16GB | 16 GB | $0.526 | $379 | $84 |
| **AWS (g5.xlarge)** | A10G 24GB | 24 GB | $1.006 | $724 | $161 |
| **Azure (NC6s v3)** | V100 16GB | 16 GB | $3.06 | $2,203 | $490 |
| **Google Cloud (L4)** | L4 24GB | 24 GB | $0.54 | $389 | $86 |

### Spot/Preemptible Fiyatları (Önerilen)

| Sağlayıcı | GPU | Spot Fiyat | Tasarruf | Risk |
|-----------|-----|-----------|---------|------|
| **Lambda Labs** | RTX 3090 | $0.32/saat | %36 | Orta |
| **RunPod** | RTX 3090 | $0.21/saat | %46 | Düşük |
| **AWS (g4dn)** | T4 | $0.158/saat | %70 | Yüksek |
| **Google Cloud (L4)** | L4 | $0.16/saat | %70 | Yüksek |

---

## Seçenek 3: Özel GPU Kiralama (Dedicated)

| Sağlayıcı | Donanım | Aylık Ücret | Kurulum | Notlar |
|-----------|---------|------------|---------|--------|
| **Hetzner (AX102)** | RTX 4090 + i9-13900 + 64GB | €299/ay | €0 | **En iyi fiyat/performans** |
| **Hetzner (AX101)** | RTX 4000 + i9-13900 + 64GB | €179/ay | €0 | 20GB VRAM (bazı modeller için sınırlı) |
| **KimSufi (KS-13)** | GTX 1080 Ti | €45/ay | €0 | Çok zayıf, önerilmez |
| **OVH (T4)** | T4 16GB + 4 vCPU + 32GB | €150/ay | €0 | VRAM sınırlı |
| **Contabo** | RTX 3090 + 8 vCPU + 64GB | €89/ay | €0 | Düşük bant genişliği |
| **LeaderGPU** | RTX 4090 + 8 vCPU + 64GB | €149/ay | €0 | Avrupa merkezli |

---

## VRAM Gereksinim Analizi

### Mevcut Modellerin Bellek Kullanımı

| Model | VRAM (float16) | VRAM (CPU offload) | Yükleme Süresi |
|------|---------------|-------------------|---------------|
| **CogVideoX-5b** | ~14 GB | ~4 GB | ~30-45 sn |
| **CogVideoX-2b** | ~8 GB | ~2 GB | ~15-20 sn |
| **DreamShaper 8 (SD1.5)** | ~4 GB | ~2 GB | ~8-10 sn |
| **XTTS-v2** | ~3 GB | ~1 GB | ~5-8 sn |
| **GFPGAN** | ~2 GB | ~1 GB | ~3-4 sn |
| **RealESRGAN** | ~1 GB | ~0.5 GB | ~2-3 sn |
| **AudioLDM2** | ~3 GB | ~1 GB | ~5-8 sn |
| **Toplam (tüm modeller)** | **~27 GB** | **~11.5 GB** | **~60-90 sn** |

### GPU Yeterlilik Matrisi

| GPU | VRAM | Tüm Modeller | CogVideoX-5b + TTS | Sadece SD | Sıralı Kuyruk |
|-----|------|-------------|-------------------|-----------|--------------|
| **RTX 3060 12GB** | 12 GB | ❌ | ❌ | ✅ | ⚠️ (CPU offload gerekli) |
| **T4 16GB** | 16 GB | ❌ | ⚠️ (offload ile) | ✅ | ⚠️ |
| **RTX 3090 24GB** | 24 GB | ⚠️ (sıralı) | ✅ | ✅ | ✅ |
| **RTX 4090 24GB** | 24 GB | ⚠️ (sıralı) | ✅ | ✅ | ✅ |
| **L4 24GB** | 24 GB | ⚠️ (sıralı) | ✅ | ✅ | ✅ |
| **A10G 24GB** | 24 GB | ⚠️ (sıralı) | ✅ | ✅ | ✅ |
| **A100 40GB** | 40 GB | ✅ | ✅ | ✅ | ✅ |
| **A100 80GB** | 80 GB | ✅ | ✅ | ✅ | ✅ (paralel) |

> **Not:** Tüm modeller aynı anda GPU'da tutulamaz. Mevcut Colab mimarisi sıralı yükleme/kaldırma (lazy loading) kullanır. **24 GB VRAM yeterlidir** — CogVideoX-5b render alırken diğer modeller CPU'ya offload edilir.

---

## Kapsamlı Maliyet Karşılaştırması

### 12 Aylık Toplam Sahip Olma Maliyeti (TCO)

| Seçenek | Kurulum | Aylık | 12 Ay Toplam | 24 Ay Toplam |
|---------|--------|-------|-------------|-------------|
| **Colab Pro+** | $0 | $55 | **$660** | **$1,320** |
| **Fiziksel RTX 3090 (2. el)** | $1,490 | $73 | **$2,366** | **$3,242** |
| **Fiziksel RTX 4090 (2. el)** | $2,360 | $73 | **$3,236** | **$4,112** |
| **RunPod RTX 3090 (8/5)** | $0 | $62 | **$744** | **$1,488** |
| **RunPod RTX 3090 (24/7)** | $0 | $281 | **$3,372** | **$6,744** |
| **Vast.ai RTX 3090 (8/5)** | $0 | $40-80 | **$480-960** | **$960-1,920** |
| **Hetzner AX102 (RTX 4090)** | $0 | €299 (~$330) | **~$3,960** | **~$7,920** |
| **Lambda Labs RTX 3090 (24/7)** | $0 | $360 | **$4,320** | **$8,640** |
| **AWS g4dn.xlarge (spot 8/5)** | $0 | ~$25 | **~$300** | **~$600** |
| **Contabo RTX 3090** | $0 | €89 (~$98) | **~$1,176** | **~$2,352** |

---

## Öneri: En İyi Seçenekler

### 🥇 Vast.ai / RunPod (Spot Instance)
**Tahmini Aylık Maliyet: $40-80**
- ✅ Sadece kullanırken öde
- ✅ RTX 3090/4090 seçeneği
- ✅ snapshot/docker desteği
- ✅ Düşük gecikme
- ❌ Instance kapatılabilir (spot riski)
- ❌ Model her seferinde yüklenir (~2 dk)

### 🥇 Contabo RTX 3090 (Dedicated)
**Tahmini Aylık Maliyet: €89 (~$98)**
- ✅ Dedicated sunucu, 7/24 çalışır
- ✅ Model önbellekte kalır (sıfır yükleme süresi)
- ✅ ngrok/tunnel gerekmez
- ✅ 64GB RAM, 8 vCPU
- ❌ Sabit aylık ücret
- ❌ Bant genişliği sınırlı (400 Mbps)

### 🥉 Fiziksel RTX 3090 (2. El)
**Tahmini Aylık Maliyet (amortisman + elektrik): ~$60**
- ✅ Tam kontrol
- ✅ Sıfır gecikme, sınırsız kullanım
- ✅ Veri gizliliği
- ❌ Yüksek ön maliyet ($1,500)
- ❌ Soğutma, elektrik, bakım
- ❌ TR'de elektrik maliyetleri artıyor

---

## Colab'a Devam mı?

### Colab Kalınması Durumu (Kısa Vade)

| Faktör | Değerlendirme |
|--------|--------------|
| **Mevcut durum** | Çalışıyor, test edilmiş |
| **Aylık maliyet** | $55 (Pro+) |
| **Ölçeklenebilirlik** | Sınırlı (12 saat oturum) |
| **Kullanıcı başı maliyet** | 1-2 kullanıcı için uygun |
| **Kurulum süresi** | 0 |

### Geçiş Karar Matrisi

| Kriter | Colab Pro+ | Vast.ai 8/5 | Contabo | Fiziksel |
|--------|-----------|------------|---------|---------|
| **Aylık maliyet** | $55 | $60 | ~$98 | ~$60* |
| **Kurulum süresi** | 0 | 1 saat | 2 saat | 1 gün |
| **7/24 çalışma** | ❌ (12 saat) | ✅ (spot riski) | ✅ | ✅ |
| **Model önbelleği** | ❌ (her sefer) | ❌ | ✅ | ✅ |
| **Ölçeklenebilirlik** | Düşük | Yüksek | Orta | Düşük |
| **Veri güvenliği** | ❌ | ⚠️ | ✅ | ✅ |
| **Bant genişliği** | Sınırsız | Sınırsız | 400 Mbps | Sınırsız |
| **Kullanıcı sayısı** | 1-2 | 1-5 | 1-5 | 1-3 |

*\*Amortisman dahil*

---

## Eylem Planı (Tavsiye)

### Aşama 1: Hemen (0-3 ay) — Mevcut Colab + Vast.ai Yedek
- Colab Pro+ ile devam ($55/ay)
- Vast.ai'de RTX 3090 spot instance hazır tut ($0.30/saat — sadece ihtiyaç anında)
- **Tahmini aylık: $55-80**

### Aşama 2: Kısa Vade (3-6 ay) — Contabo'ya Geçiş
- Contabo RTX 3090 ($98/ay)
- Model Docker image hazırla (önbellekli)
- ngrok/tunnel ihtiyacı kalkar
- **Tahmini aylık: ~$98**

### Aşama 3: Orta Vade (6-12 ay) — Hibrit
- Contabo ana sunucu ($98/ay)
- Vast.ai yoğun dönemlerde yedek ($0-100/ay)
- Toplam kullanıcı >10 ise Heztner AX102 ($330/ay)
- **Tahmini aylık: $100-200**

### Aşama 4: Uzun Vade (12+ ay)
- Kullanıcı sayısı >20 ise dedicated sunucu
- Hetzner AX102 veya eşdeğeri
- Yük dengesi için 2+ sunucu
- **Tahmini aylık: $300-600**

---

## Ek: Docker ile Hızlı Geçiş İçin Hazırlık

```dockerfile
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

# Mevcut tüm modelleri image'e göm (önbellekleme)
COPY models/ /models/

# Flask sunucusu
COPY colab_server.py /app/
COPY colab_setup.py /app/

# Bağımlılıklar
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
RUN pip install -r /app/requirements.txt

# Model önbelleğini hazırla
RUN python -c "from diffusers import DiffusionPipeline; DiffusionPipeline.from_pretrained('Lykon/dreamshaper-8')"

CMD ["python", "/app/colab_server.py"]
```

> Bu Docker image hazır olduğunda, Vast.ai / RunPod / Contabo gibi herhangi bir GPU sağlayıcısına 5 dakikada deploy edilebilir.
