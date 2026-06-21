# MoneyPrinterTurbo × AI-Publisher Karşılaştırma ve Uyarlama Raporu

**Kaynak:** https://github.com/harry0703/MoneyPrinterTurbo  
**Tarih:** 2 Haziran 2026  
**Amaç:** MPT'nin üstün yönlerini analiz ederek AI-Publisher'a uyarlanabilecek öğeleri belirlemek.

---

## 1. Genel Mimari Karşılaştırması

| Özellik | MoneyPrinterTurbo (MPT) | AI-Publisher (Bizim) |
|---|---|---|
| **Mimari** | MVC (Python FastAPI + Streamlit WebUI) | Node.js Express + Docker Flask (localhost:5001-5016) |
| **Video Kaynağı** | Pexels/Pixabay stok video API | AI üretim (ModelScope T2V) |
| **TTS** | Azure/OpenAI/Edge TTS (bulut) | XTTS-v2 (yerel GPU) |
| **Altyazı** | faster-whisper (Whisper ASR) | FFmpeg burn-in (statik) |
| **LLM Entegrasyonu** | OpenAI/Gemini/Ollama/DeepSeek vb. (10+ provider) | Sadece Gemini Flash |
| **Sosyal Medya Yayın** | ❌ Yok | ✅ Playwright ile YouTube/TikTok/X/Meta |
| **AI Video Üretimi** | ❌ Yok | ✅ ModelScope T2V |
| **İş Kuyruğu** | Basit sıralı işlem | SSE + Job Queue |
| **Lisans** | Apache 2.0 | Özel |

**Temel Fark:**  
- MPT → **İçerik ağırlıklı** (stok video + LLM senaryo + TTS, GPU gerektirmez)  
- AI-Publisher → **Üretim ağırlıklı** (AI video + ses klonlama + sosyal medya yayın)

---

## 2. MPT'nin Üstün Olduğu Alanlar (Alınabilecekler)

### 🔥 ÖNCELİK 1 — FFmpeg Video Birleştirme Motoru

**MPT'deki implementasyon:** `app/services/video.py`

MPT'nin FFmpeg concat sistemi bizimkinden çok daha robust:

```python
# MPT'nin yaklaşımı — donanım codec fallback zinciri
_SUPPORTED_VIDEO_CODECS = (
    "libx264", "h264_nvenc", "h264_amf", 
    "h264_qsv", "h264_mf", "h264_videotoolbox"
)

def _write_videofile_with_codec_fallback(clip, output_file, codec, **kwargs):
    # Donanım codec başarısız olursa libx264'e otomatik geçer
    # Windows/Mac/Linux/Docker uyumlu
```

**Bizde eksik olan:**
- GPU codec (NVENC) → CPU codec otomatik fallback yok
- Windows path escape (Türkçe karakterli klasörlerde crash olabilir)
- Codec whitelist güvenlik katmanı

**Uyarlama Planı:** `src/queue.ts`'teki FFmpeg komutlarına codec fallback eklenecek.

---

### 🔥 ÖNCELİK 1 — faster-whisper ile Otomatik Altyazı Üretimi

**MPT'deki implementasyon:** `app/services/subtitle.py`

```python
from faster_whisper import WhisperModel

# Ses dosyasından kelime bazlı timestamp üretir
segments, info = model.transcribe(
    audio_file,
    beam_size=5,
    word_timestamps=True,    # Kelime bazlı zamanlama
    vad_filter=True,          # Sessizlik algılama
    vad_parameters=dict(min_silence_duration_ms=500),
)
```

**Bizde nasıl yapıyoruz şu an:**  
FFmpeg `drawtext` filter ile statik altyazı yazıyoruz — zaman damgası yok, kelime senkronizasyonu yok.

**MPT'yi uyarladığımızda:**
- TTS'in ürettiği WAV dosyasını Whisper'a göndeririz
- Kelime bazlı `.srt` dosyası üretilir
- FFmpeg burn-in yerine senkron altyazı basılır

**Docker container'da kurulum:**
```bash
pip install faster-whisper
# Model: "small" (238MB) veya "medium" (769MB) — T4'te sorunsuz
```

---

### 🔥 ÖNCELİK 2 — Çoklu LLM Provider Desteği

**MPT'deki implementasyon:** `app/services/llm.py`

MPT 15+ LLM sağlayıcısını destekliyor:
- OpenAI, Azure, Gemini, Ollama, DeepSeek, MiniMax, Qwen, Moonshot, Grok, Cloudflare...

**Bizde şu an:** Yalnızca `gemini-2.5-flash`

**Neden önemli:**
- API kotası dolduğunda alternatif yok
- Kullanıcı kendi API anahtarıyla farklı model seçemiyor

**Uyarlama Planı:** `src/queue.ts`'te LLM provider seçimini `.env`'e taşıyacağız:
```env
LLM_PROVIDER=gemini          # gemini | openai | ollama | deepseek
LLM_MODEL=gemini-2.5-flash
OPENAI_API_KEY=...
DEEPSEEK_API_KEY=...
```

---

### 🔥 ÖNCELİK 2 — Gelişmiş Altyazı Stillendirme Sistemi

**MPT'nin özellikleri:**
- Font, boyut, renk, konum seçimi
- Altyazı outline (kenarlık) desteği
- Kelime bazlı animasyon

**Bizde şu an:** Sarı renkli sabit `drawtext` filtresi

**Uyarlama:**
```typescript
// src/queue.ts'e eklenecek altyazı seçenekleri
interface SubtitleOptions {
  font: string;           // "Arial" | "Helvetica" | "custom"
  fontSize: number;       // 24-72
  color: string;          // hex renk
  outlineColor: string;   // kenarlık rengi
  position: "bottom" | "top" | "center";
  style: "word" | "line"; // kelime bazlı / satır bazlı
}
```

---

### ✅ ÖNCELİK 3 — Pexels/Pixabay Stok Video Entegrasyonu (Hibrit Mod)

**MPT'deki yaklaşım:**
- LLM ile anahtar kelimeler üretir
- Pexels API'den ilgili stok videoları çeker
- İçeriği sahne sahne birleştirir

**AI-Publisher için hibrit senaryo:**
- Kısa sahneler → AI üretim (ModelScope)
- Uzun / arka plan sahneleri → Pexels stok video
- Maliyet/hız dengesini kullanıcı seçer

**Uygulama:**
```typescript
// .env
USE_STOCK_VIDEO=true         // Stok video modunu aktifleştirir
PEXELS_API_KEY=...           // Ücretsiz, saniyede 20 istek
VIDEO_SOURCE=ai | stock | hybrid
```

---

### ✅ ÖNCELİK 3 — Görüntü Sanitizasyon (EXIF Metadata Temizleme)

**MPT'deki implementasyon:**
```python
def _sanitize_image_file(image_path: str) -> str:
    # Bozuk EXIF metadata olan görseller MoviePy'yi crash eder
    # Temiz bir kopyasını oluşturur
    with Image.open(image_path) as image:
        cleaned_image = Image.new(image.mode, image.size)
        cleaned_image.putdata(list(image.getdata()))
        cleaned_image.save(sanitized_path)
```

**Neden önemli:** Kullanıcı yüklediği görseller (karakter.jpg vb.) bozuk EXIF içerirse Docker container'da crash oluyor. Bu basit fonksiyon `generate-media` endpoint'i öncesine eklenebilir.

---

### ✅ ÖNCELİK 3 — Gelişmiş Vidyo Kırpma Stratejisi

**MPT'nin `_prioritize_unique_source_clips` fonksiyonu:**
- Aynı kaynak videonun tekrar tekrar kullanılmasını önler
- En uzun klibi önceliklendirir
- Random shuffle ile doğal sıra oluşturur

**AI-Publisher'da kullanım yeri:** Birden fazla sahne üretildiğinde ve sahneler birleştirilirken.

---

## 3. Bizim Üstün Olduğumuz Alanlar (MPT'de Yok)

| Özellik | Durum |
|---|---|
| **AI Video Üretimi** | MPT sadece stok video kullanır, biz gerçek AI video üretiyoruz |
| **Ses Klonlama** | MPT standart TTS; biz XTTS-v2 ile karakter sesi klonlama yapıyoruz |
| **Sosyal Medya Yayın** | MPT'de tamamen yok; biz Playwright ile 4 platform yayın yapıyoruz |
| **SSE Canlı İlerleme** | MPT basit progress bar; biz gerçek zamanlı SSE stream yapıyoruz |
| **Lip-Sync** | MPT'de yok; biz OpenCV ile ses-ağız senkronizasyonu yapıyoruz |

---

## 4. Uygulama Öncelik Sırası

### Faz 1 — Hemen Uygulanabilir (Düşük Maliyet, Yüksek Etki)

- [ ] **Docker container'a faster-whisper ekle** → Otomatik altyazı üretimi
  - Değiştirilecek dosya: `colab_docker/server.py`
  - Beklenen süre: 2 saat

- [ ] **EXIF sanitizasyon** → Kullanıcı görsel yükleme güvenliği
  - Değiştirilecek dosya: `colab_docker/server.py`
  - Beklenen süre: 30 dakika

- [ ] **FFmpeg codec fallback** → Windows uyumluluğu
  - Değiştirilecek dosya: `src/queue.ts`
  - Beklenen süre: 1 saat

### Faz 2 — Orta Vade (Orta Maliyet, Yüksek Etki)

- [ ] **Altyazı stil seçenekleri** → Dashboard formuna eklenir
  - Değiştirilecek dosyalar: `src/server.ts`, `src/queue.ts`
  - Beklenen süre: 4 saat

- [ ] **Çoklu LLM provider** → `.env` + `src/queue.ts`
  - Değiştirilecek dosyalar: `.env`, `src/queue.ts`
  - Beklenen süre: 3 saat

### Faz 3 — Uzun Vade (Yüksek Maliyet, Stratejik)

- [ ] **Pexels/Pixabay Hibrit Mod** → Stok video + AI video karışık üretim
  - Yeni dosya: `src/stockvideo.ts`
  - Beklenen süre: 1-2 gün

---

## 5. Kod Örneği — faster-whisper ile Altyazı Üretimi

Docker sunucusuna eklenecek fonksiyon:

```python
def generate_subtitles_whisper(audio_path: str, output_srt: str) -> str:
    """
    faster-whisper ile ses dosyasından .srt altyazı üretir.
    Model: 'small' (~238MB, T4'te ~5sn/dakika ses)
    """
    from faster_whisper import WhisperModel
    
    model = WhisperModel("small", device="cuda", compute_type="float16")
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        language="tr",  # Türkçe zorla
    )
    
    with open(output_srt, "w", encoding="utf-8") as f:
        idx = 1
        for seg in segments:
            start = _format_srt_time(seg.start)
            end   = _format_srt_time(seg.end)
            f.write(f"{idx}\n{start} --> {end}\n{seg.text.strip()}\n\n")
            idx += 1
    
    return output_srt

def _format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
```

---

## 6. Referans Linkler

- MPT Kaynak: https://github.com/harry0703/MoneyPrinterTurbo
- MPT Video Servisi: `app/services/video.py`
- MPT LLM Servisi: `app/services/llm.py`
- MPT Altyazı Servisi: `app/services/subtitle.py`
- faster-whisper: https://github.com/SYSTRAN/faster-whisper
- Pexels API: https://www.pexels.com/api/

---

*Bu rapor AI-Publisher projesinin geliştirilmesi amacıyla hazırlanmıştır.*
