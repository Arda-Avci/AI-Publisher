# MoneyPrinterTurbo Ã— AI-Publisher KarÅŸÄ±laÅŸtÄ±rma ve Uyarlama Raporu

**Kaynak:** https://github.com/harry0703/MoneyPrinterTurbo  
**Tarih:** 2 Haziran 2026  
**AmaÃ§:** MPT'nin Ã¼stÃ¼n yÃ¶nlerini analiz ederek AI-Publisher'a uyarlanabilecek Ã¶ÄŸeleri belirlemek.

---

## 1. Genel Mimari KarÅŸÄ±laÅŸtÄ±rmasÄ±

| Ã–zellik | MoneyPrinterTurbo (MPT) | AI-Publisher (Bizim) |
|---|---|---|
| **Mimari** | MVC (Python FastAPI + Streamlit WebUI) | Node.js Express + Docker Flask (localhost:5001-5016) |
| **Video KaynaÄŸÄ±** | Pexels/Pixabay stok video API | AI Ã¼retim (ModelScope T2V) |
| **TTS** | Azure/OpenAI/Edge TTS (bulut) | XTTS-v2 (yerel GPU) |
| **AltyazÄ±** | faster-whisper (Whisper ASR) | FFmpeg burn-in (statik) |
| **LLM Entegrasyonu** | OpenAI/Gemini/Ollama/DeepSeek vb. (10+ provider) | Sadece Gemini Flash |
| **Sosyal Medya YayÄ±n** | âŒ Yok | âœ… Playwright ile YouTube/TikTok/X/Meta |
| **AI Video Ãœretimi** | âŒ Yok | âœ… ModelScope T2V |
| **Ä°ÅŸ KuyruÄŸu** | Basit sÄ±ralÄ± iÅŸlem | SSE + Job Queue |
| **Lisans** | Apache 2.0 | Ã–zel |

**Temel Fark:**  
- MPT â†’ **Ä°Ã§erik aÄŸÄ±rlÄ±klÄ±** (stok video + LLM senaryo + TTS, GPU gerektirmez)  
- AI-Publisher â†’ **Ãœretim aÄŸÄ±rlÄ±klÄ±** (AI video + ses klonlama + sosyal medya yayÄ±n)

---

## 2. MPT'nin ÃœstÃ¼n OlduÄŸu Alanlar (AlÄ±nabilecekler)

### ğŸ”¥ Ã–NCELÄ°K 1 â€” FFmpeg Video BirleÅŸtirme Motoru

**MPT'deki implementasyon:** `app/services/video.py`

MPT'nin FFmpeg concat sistemi bizimkinden Ã§ok daha robust:

```python
# MPT'nin yaklaÅŸÄ±mÄ± â€” donanÄ±m codec fallback zinciri
_SUPPORTED_VIDEO_CODECS = (
    "libx264", "h264_nvenc", "h264_amf", 
    "h264_qsv", "h264_mf", "h264_videotoolbox"
)

def _write_videofile_with_codec_fallback(clip, output_file, codec, **kwargs):
    # DonanÄ±m codec baÅŸarÄ±sÄ±z olursa libx264'e otomatik geÃ§er
    # Windows/Mac/Linux/Docker uyumlu
```

**Bizde eksik olan:**
- GPU codec (NVENC) â†’ CPU codec otomatik fallback yok
- Windows path escape (TÃ¼rkÃ§e karakterli klasÃ¶rlerde crash olabilir)
- Codec whitelist gÃ¼venlik katmanÄ±

**Uyarlama PlanÄ±:** `src/queue.ts`'teki FFmpeg komutlarÄ±na codec fallback eklenecek.

---

### ğŸ”¥ Ã–NCELÄ°K 1 â€” faster-whisper ile Otomatik AltyazÄ± Ãœretimi

**MPT'deki implementasyon:** `app/services/subtitle.py`

```python
from faster_whisper import WhisperModel

# Ses dosyasÄ±ndan kelime bazlÄ± timestamp Ã¼retir
segments, info = model.transcribe(
    audio_file,
    beam_size=5,
    word_timestamps=True,    # Kelime bazlÄ± zamanlama
    vad_filter=True,          # Sessizlik algÄ±lama
    vad_parameters=dict(min_silence_duration_ms=500),
)
```

**Bizde nasÄ±l yapÄ±yoruz ÅŸu an:**  
FFmpeg `drawtext` filter ile statik altyazÄ± yazÄ±yoruz â€” zaman damgasÄ± yok, kelime senkronizasyonu yok.

**MPT'yi uyarladÄ±ÄŸÄ±mÄ±zda:**
- TTS'in Ã¼rettiÄŸi WAV dosyasÄ±nÄ± Whisper'a gÃ¶ndeririz
- Kelime bazlÄ± `.srt` dosyasÄ± Ã¼retilir
- FFmpeg burn-in yerine senkron altyazÄ± basÄ±lÄ±r

**Docker container'da kurulum:**
```bash
pip install faster-whisper
# Model: "small" (238MB) veya "medium" (769MB) â€” T4'te sorunsuz
```

---

### ğŸ”¥ Ã–NCELÄ°K 2 â€” Ã‡oklu LLM Provider DesteÄŸi

**MPT'deki implementasyon:** `app/services/llm.py`

MPT 15+ LLM saÄŸlayÄ±cÄ±sÄ±nÄ± destekliyor:
- OpenAI, Azure, Gemini, Ollama, DeepSeek, MiniMax, Qwen, Moonshot, Grok, Cloudflare...

**Bizde ÅŸu an:** YalnÄ±zca `gemini-2.5-flash`

**Neden Ã¶nemli:**
- API kotasÄ± dolduÄŸunda alternatif yok
- KullanÄ±cÄ± kendi API anahtarÄ±yla farklÄ± model seÃ§emiyor

**Uyarlama PlanÄ±:** `src/queue.ts`'te LLM provider seÃ§imini `.env`'e taÅŸÄ±yacaÄŸÄ±z:
```env
LLM_PROVIDER=gemini          # gemini | openai | ollama | deepseek
LLM_MODEL=gemini-2.5-flash
OPENAI_API_KEY=...
DEEPSEEK_API_KEY=...
```

---

### ğŸ”¥ Ã–NCELÄ°K 2 â€” GeliÅŸmiÅŸ AltyazÄ± Stillendirme Sistemi

**MPT'nin Ã¶zellikleri:**
- Font, boyut, renk, konum seÃ§imi
- AltyazÄ± outline (kenarlÄ±k) desteÄŸi
- Kelime bazlÄ± animasyon

**Bizde ÅŸu an:** SarÄ± renkli sabit `drawtext` filtresi

**Uyarlama:**
```typescript
// src/queue.ts'e eklenecek altyazÄ± seÃ§enekleri
interface SubtitleOptions {
  font: string;           // "Arial" | "Helvetica" | "custom"
  fontSize: number;       // 24-72
  color: string;          // hex renk
  outlineColor: string;   // kenarlÄ±k rengi
  position: "bottom" | "top" | "center";
  style: "word" | "line"; // kelime bazlÄ± / satÄ±r bazlÄ±
}
```

---

### âœ… Ã–NCELÄ°K 3 â€” Pexels/Pixabay Stok Video Entegrasyonu (Hibrit Mod)

**MPT'deki yaklaÅŸÄ±m:**
- LLM ile anahtar kelimeler Ã¼retir
- Pexels API'den ilgili stok videolarÄ± Ã§eker
- Ä°Ã§eriÄŸi sahne sahne birleÅŸtirir

**AI-Publisher iÃ§in hibrit senaryo:**
- KÄ±sa sahneler â†’ AI Ã¼retim (ModelScope)
- Uzun / arka plan sahneleri â†’ Pexels stok video
- Maliyet/hÄ±z dengesini kullanÄ±cÄ± seÃ§er

**Uygulama:**
```typescript
// .env
USE_STOCK_VIDEO=true         // Stok video modunu aktifleÅŸtirir
PEXELS_API_KEY=...           // Ãœcretsiz, saniyede 20 istek
VIDEO_SOURCE=ai | stock | hybrid
```

---

### âœ… Ã–NCELÄ°K 3 â€” GÃ¶rÃ¼ntÃ¼ Sanitizasyon (EXIF Metadata Temizleme)

**MPT'deki implementasyon:**
```python
def _sanitize_image_file(image_path: str) -> str:
    # Bozuk EXIF metadata olan gÃ¶rseller MoviePy'yi crash eder
    # Temiz bir kopyasÄ±nÄ± oluÅŸturur
    with Image.open(image_path) as image:
        cleaned_image = Image.new(image.mode, image.size)
        cleaned_image.putdata(list(image.getdata()))
        cleaned_image.save(sanitized_path)
```

**Neden Ã¶nemli:** KullanÄ±cÄ± yÃ¼klediÄŸi gÃ¶rseller (karakter.jpg vb.) bozuk EXIF iÃ§erirse Docker container'da crash oluyor. Bu basit fonksiyon `generate-media` endpoint'i Ã¶ncesine eklenebilir.

---

### âœ… Ã–NCELÄ°K 3 â€” GeliÅŸmiÅŸ Vidyo KÄ±rpma Stratejisi

**MPT'nin `_prioritize_unique_source_clips` fonksiyonu:**
- AynÄ± kaynak videonun tekrar tekrar kullanÄ±lmasÄ±nÄ± Ã¶nler
- En uzun klibi Ã¶nceliklendirir
- Random shuffle ile doÄŸal sÄ±ra oluÅŸturur

**AI-Publisher'da kullanÄ±m yeri:** Birden fazla sahne Ã¼retildiÄŸinde ve sahneler birleÅŸtirilirken.

---

## 3. Bizim ÃœstÃ¼n OlduÄŸumuz Alanlar (MPT'de Yok)

| Ã–zellik | Durum |
|---|---|
| **AI Video Ãœretimi** | MPT sadece stok video kullanÄ±r, biz gerÃ§ek AI video Ã¼retiyoruz |
| **Ses Klonlama** | MPT standart TTS; biz XTTS-v2 ile karakter sesi klonlama yapÄ±yoruz |
| **Sosyal Medya YayÄ±n** | MPT'de tamamen yok; biz Playwright ile 4 platform yayÄ±n yapÄ±yoruz |
| **SSE CanlÄ± Ä°lerleme** | MPT basit progress bar; biz gerÃ§ek zamanlÄ± SSE stream yapÄ±yoruz |
| **Lip-Sync** | MPT'de yok; biz OpenCV ile ses-aÄŸÄ±z senkronizasyonu yapÄ±yoruz |

---

## 4. Uygulama Ã–ncelik SÄ±rasÄ±

### Faz 1 â€” Hemen Uygulanabilir (DÃ¼ÅŸÃ¼k Maliyet, YÃ¼ksek Etki)

- [ ] **Docker container'a faster-whisper ekle** â†’ Otomatik altyazÄ± Ã¼retimi
  - DeÄŸiÅŸtirilecek dosya: `docker_image/server.py`
  - Beklenen sÃ¼re: 2 saat

- [ ] **EXIF sanitizasyon** â†’ KullanÄ±cÄ± gÃ¶rsel yÃ¼kleme gÃ¼venliÄŸi
  - DeÄŸiÅŸtirilecek dosya: `docker_image/server.py`
  - Beklenen sÃ¼re: 30 dakika

- [ ] **FFmpeg codec fallback** â†’ Windows uyumluluÄŸu
  - DeÄŸiÅŸtirilecek dosya: `src/queue.ts`
  - Beklenen sÃ¼re: 1 saat

### Faz 2 â€” Orta Vade (Orta Maliyet, YÃ¼ksek Etki)

- [ ] **AltyazÄ± stil seÃ§enekleri** â†’ Dashboard formuna eklenir
  - DeÄŸiÅŸtirilecek dosyalar: `src/server.ts`, `src/queue.ts`
  - Beklenen sÃ¼re: 4 saat

- [ ] **Ã‡oklu LLM provider** â†’ `.env` + `src/queue.ts`
  - DeÄŸiÅŸtirilecek dosyalar: `.env`, `src/queue.ts`
  - Beklenen sÃ¼re: 3 saat

### Faz 3 â€” Uzun Vade (YÃ¼ksek Maliyet, Stratejik)

- [ ] **Pexels/Pixabay Hibrit Mod** â†’ Stok video + AI video karÄ±ÅŸÄ±k Ã¼retim
  - Yeni dosya: `src/stockvideo.ts`
  - Beklenen sÃ¼re: 1-2 gÃ¼n

---

## 5. Kod Ã–rneÄŸi â€” faster-whisper ile AltyazÄ± Ãœretimi

Docker sunucusuna eklenecek fonksiyon:

```python
def generate_subtitles_whisper(audio_path: str, output_srt: str) -> str:
    """
    faster-whisper ile ses dosyasÄ±ndan .srt altyazÄ± Ã¼retir.
    Model: 'small' (~238MB, T4'te ~5sn/dakika ses)
    """
    from faster_whisper import WhisperModel
    
    model = WhisperModel("small", device="cuda", compute_type="float16")
    segments, info = model.transcribe(
        audio_path,
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        language="tr",  # TÃ¼rkÃ§e zorla
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
- MPT AltyazÄ± Servisi: `app/services/subtitle.py`
- faster-whisper: https://github.com/SYSTRAN/faster-whisper
- Pexels API: https://www.pexels.com/api/

---

*Bu rapor AI-Publisher projesinin geliÅŸtirilmesi amacÄ±yla hazÄ±rlanmÄ±ÅŸtÄ±r.*
