# 2026-06-12 React + Vite Portal, Remotion Timeline EditÃ¶rÃ¼ ve GeliÅŸmiÅŸ GÃ¶rsel StÃ¼dyo Mimarisi (Spec)

Bu tasarÄ±m dokÃ¼manÄ±, platformun kullanÄ±cÄ± arayÃ¼zÃ¼nÃ¼ **React + Vite + Tailwind CSS** modern mimarisine taÅŸÄ±mak, `@remotion/player` tabanlÄ± profesyonel bir timeline editÃ¶r yerleÅŸimi kurmak ve Docker GPU container katmanÄ±nÄ± **FP8 dÃ¼zeyinde yeni nesil video/imaj modelleri (Wan 2.1, LTX 2, Hunyuan, Flux)** ve **Edge-TTS** ile hÄ±zlandÄ±rmak iÃ§in gerekli olan mimariyi ve Odysseus esintili geliÅŸmiÅŸ fotoÄŸraf editÃ¶rÃ¼ (Background Removal, Inpainting Mask) yeteneklerini tanÄ±mlar.

---

## 1. Proje AmacÄ± ve Kapsam

Mevcut Express SSR (sunucu taraflÄ± ÅŸablon) mimarisi, zengin etkileÅŸim gerektiren timeline manipÃ¼lasyonlarÄ± ve geliÅŸmiÅŸ imaj dÃ¼zenleme Ã¶zellikleri iÃ§in hantal kalmaktadÄ±r. Bu dÃ¶nÃ¼ÅŸÃ¼mle birlikte:
*   ArayÃ¼z, CapCut/Premiere kalitesinde, katmanlÄ± (video ve ses kanallarÄ± ayrÄ±ÅŸmÄ±ÅŸ) ve **Neon Cyan** koyu tema uyumlu bir React uygulamasÄ±na dÃ¶nÃ¼ÅŸtÃ¼rÃ¼lecektir.
*   **Port KÄ±sÄ±tÄ±:** Frontend geliÅŸtirme sunucusu (Vite) kesinlikle **4000** portunda Ã§alÄ±ÅŸacaktÄ±r. Backend Express API ise mevcut **3016** portunda kalacak ve Vite dev tÃ¼nelinden proxy edilecektir. Yeni port ihtiyacÄ±nda kullanÄ±cÄ±ya mutlaka sorulacaktÄ±r.
*   **Remotion Timeline:** KullanÄ±cÄ±lar sahnelerin yerini sÃ¼rÃ¼kle-bÄ±rak ile deÄŸiÅŸtirebilecek, araya yeni sahne ekleyip silebilecek ve sadece seÃ§ilen sahneyi tekrar Ã¼retebilecektir (Regenerate).
*   **Docker Yeni Nesil FP8 & Edge-TTS:** Kurulumu 10+ dakika sÃ¼ren coqui-tts tamamen kaldÄ±rÄ±lacak; seslendirmede Edge-TTS ve OpenAI TTS kullanÄ±lacaktÄ±r. Video Ã¼retiminde VRAM dostu, FP8 hassasiyetinde **Wan 2.1**, **LTX 2** veya **Hunyuan Video** Hugging Face Diffusers lazy-load mimarisi entegre edilecektir. Karakter tutarlÄ±lÄ±ÄŸÄ± iÃ§in ilk kare **Flux (FP8)** ile Ã¼retilip canlandÄ±rÄ±lacaktÄ±r (Image Anchored Synthesis).
*   **FotoÄŸraf EditÃ¶rÃ¼ & Arka Plan Temizleme:** Odysseus projesindekine benzer ÅŸekilde, yÃ¼klenen materyaller iÃ§in tarayÄ±cÄ±da Canvas tabanlÄ± fÄ±rÃ§a ile maske Ã§izilip Docker container'a inpainting isteÄŸi yollanabilecek ve tek tÄ±kla `rembg` (Docker container'da Ã§alÄ±ÅŸan) aracÄ±lÄ±ÄŸÄ±yla arka plan temizlenebilecektir.

---

## 2. Teknik Mimari ve Model SeÃ§imleri

### 2.1. Docker GPU Container KatmanÄ± (`docker_image/`)
*   **AÄŸÄ±r kÃ¼tÃ¼phanelerin tasfiyesi:** `coqui-tts` ve tÃ¼m baÄŸÄ±mlÄ±lÄ±klarÄ± (`espeak-ng`, `TTS` vb.) kaldÄ±rÄ±lacak. Yerine sadece hafif `edge-tts` kurulacaktÄ±r.
*   **FP8 Video Modelleri (Lazy Load):**
    *   **Wan 2.1 (FP8):** `Wan2_1-I2V-14B-480P-quantized` veya `Wan2_1-T2V-1.3B-quantized`.
    *   **LTX 2 (FP8):** `LTX-Video-quantized`.
    *   **Hunyuan Video (FP8):** `HunyuanVideo` (8-bit quantized).
    *   *Modeller, ilk istek geldiÄŸinde VRAM'e yÃ¼klenecek (lazy load) ve iÅŸ bittiÄŸinde `torch.cuda.empty_cache()` ile temizlenecektir.*
*   **Flux (FP8) & Stable Diffusion Inpaint:**
    *   **Flux.1-schnell (FP8):** Karakter sabitliÄŸi iÃ§in ilk referans gÃ¶rselin (Anchor Frame) Ã¼retilmesinde kullanÄ±lacaktÄ±r.
    *   **Stable Diffusion XL Inpaint (FP8) veya Flux Inpaint:** Canvas maskesi ile gelen gÃ¶rsellerin inpaint edilmesi iÃ§in kullanÄ±lacaktÄ±r.
*   **Arka Plan Temizleme (Rembg):**
    *   Docker container'a `rembg[gpu]` paketi kurulacaktÄ±r.
    *   `/remove-background` rotasÄ±, gÃ¶nderilen resmi `rembg.remove` fonksiyonu ile iÅŸleyip arka planÄ± temizlenmiÅŸ ÅŸeffaf PNG olarak geri dÃ¶ndÃ¼recektir.
*   **Dudak Senkronizasyonu (Lip-Sync):**
    *   OpenCV tabanlÄ± esnek genlik esnetme algoritmasÄ± korunacak, ancak aÄŸÄ±r XTTS yerine Edge-TTS ses dosyalarÄ± ile beslenecektir.

### 2.2. Node.js & TypeScript API KatmanÄ± (`src/`)
*   Mevcut RabbitMQ kuyruk yÃ¶netimi, PostgreSQL entegrasyonu, i18n sistemi ve FÄ±rsatlar Hunisi mantÄ±ÄŸÄ± aynen korunacaktÄ±r.
*   Express sunucusu `/api/v1/` Ã¶n ekiyle API uÃ§larÄ± sunacaktÄ±r:
    *   `POST /api/v1/jobs/create`: Yeni proje oluÅŸturma (Zod validator devrede).
    *   `GET /api/v1/jobs/:id`: Ä°ÅŸ detaylarÄ± (sahneler ve pazarlama metinleri).
    *   `POST /api/v1/jobs/:id/update-scenes`: Sahnelerin sÄ±rasÄ±nÄ±/iÃ§eriÄŸini gÃ¼ncelleme (Remotion Timeline'daki deÄŸiÅŸikliklerin DB'ye kaydedilmesi).
     *   `POST /api/v1/jobs/:id/regenerate-scene`: Sadece belirli bir sahneyi Docker container'a tekrar Ã¼rettirme.
     *   `POST /api/v1/editor/remove-background`: GÃ¶rseli alÄ±p Docker container'a iletir, temizlenen ÅŸeffaf gÃ¶rseli kaydeder.
     *   `POST /api/v1/editor/inpaint`: GÃ¶rsel + Maske verisini alÄ±p Docker container'a iletir, dÃ¼zenlenen gÃ¶rseli kaydeder.

### 2.3. React + Vite Frontend KatmanÄ± (`client/` - Port 4000)
*   **Teknoloji YÄ±ÄŸÄ±nÄ±:** React 19, Vite, Tailwind CSS, Lucide React (ikonlar), `@remotion/player` (video timeline Ã¶nizleme).
*   **Timeline EditÃ¶rÃ¼ TasarÄ±mÄ±:**
    *   **GÃ¶rsel Raylar (Tracks):** Ãœstte video sahneleri, altta onlara baÄŸlÄ± ses kanallarÄ± (Edge-TTS + SFX) yatay timeline ÅŸeritleri halinde listelenecektir.
    *   **SÃ¼rÃ¼kle-BÄ±rak (Drag-and-Drop):** Sahneler sÃ¼rÃ¼klenerek yer deÄŸiÅŸtirebilecektir (`@hello-pangea/dnd` veya hafif HTML5 Drag/Drop API ile).
    *   **Ã–nizleme (Remotion Player):** SeÃ§ilen sahnelerin render edilmemiÅŸ halleri (varsa resim + ses, yoksa placeholder) anlÄ±k olarak Remotion Player Ã¼zerinde oynatÄ±labilecektir.
    *   **Tekil Yenileme (Regenerate):** Her sahne kartÄ±nÄ±n Ã¼zerinde "Yeniden Ãœret" butonu yer alacak, bu sayede tÃ¼m projeyi bozmadan sadece o sahne Colab'a gÃ¶nderilip gÃ¼ncellenecektir.
*   **FotoÄŸraf EditÃ¶rÃ¼ Paneli:**
    *   GÃ¶rsel yÃ¼kleme veya Flux ile gÃ¶rsel Ã¼retme sonrasÄ±nda aÃ§Ä±lan modal iÃ§inde **Canvas EditÃ¶rÃ¼** yer alacaktÄ±r.
    *   **FÄ±rÃ§a Boyutu ve Rengi (Maskeleme):** KullanÄ±cÄ± fare ile gÃ¶rselin dÃ¼zenlemek istediÄŸi yerini (inpainting alanÄ±) maskeleyebilecektir (siyah/beyaz maske Ã¼retimi).
    *   **Arka PlanÄ± KaldÄ±r Butonu:** `rembg` endpoint'ine istek atarak resmi ÅŸeffaflaÅŸtÄ±racaktÄ±r.
    *   **Flux Inpaint Butonu:** Ã‡izilen maske ve yeni bir metinsel prompt ile sadece maskeli alanÄ± deÄŸiÅŸtirecektir.

### 2.4. Kamera Hareket ÅablonlarÄ± (Motion Templates)
*   **ArayÃ¼z Kontrolleri:** Timeline'daki her bir sahne kartÄ± Ã¼zerinde bir "Kamera Hareketi" (Camera Motion) seÃ§im kutusu bulunacaktÄ±r.
*   **Åablon SeÃ§enekleri:** Yok (None), Zoom In (YakÄ±nlaÅŸma), Zoom Out (UzaklaÅŸma), Pan Left (Sola KaydÄ±rma), Pan Right (SaÄŸa KaydÄ±rma) ve Breathing (Nefes/DoÄŸal TitreÅŸim).
*   **Prompt Entegrasyonu:** SeÃ§ilen hareket ÅŸablonuna karÅŸÄ±lÄ±k gelen prompt tanÄ±mlarÄ± (Ã–rn: `", camera zooming in slowly, cinematic movement"`, `", camera panning left, horizontal motion"`) Node.js tarafÄ±nda kuyruk iÅŸlenirken orijinal promptun sonuna otomatik eklenecektir. Bu sayede Wan 2.1 ve LTX 2 gibi modern I2V/T2V modellerinin doÄŸal kamera kontrol yetenekleri sÄ±fÄ±r ekstra donanÄ±m maliyetiyle canlandÄ±rÄ±lacaktÄ±r.

---

## 3. ArayÃ¼z ve GÃ¶rsel TasarÄ±m (Neon Cyan Dark Mode)

KullanÄ±cÄ± arayÃ¼zÃ¼, CapCut ve Premiere Pro gibi modern video kurgu yazÄ±lÄ±mlarÄ±ndan ilseler alacaktÄ±r:
*   **Renk Paleti:** Derin grafit arka planlar (`#0B0F19`), neon cyan vurgular (`#00F2FE`), elektrik moru detaylar (`#9B51E0`) ve temiz beyaz tipografi.
*   **Timeline DÃ¼zeni:** SayfanÄ±n alt kÄ±smÄ±nÄ± kaplayan, yatay olarak kaydÄ±rÄ±labilen (horizontal scroll), zaman Ã§izgisi ve oynatma kafasÄ± (playhead) simÃ¼lasyonu barÄ±ndÄ±ran katmanlÄ± yapÄ±.
*   **FÄ±rsatlar Hunisi:** Yenilenen React arayÃ¼zÃ¼nde, sol veya Ã¼st panelde modern bir kart akÄ±ÅŸÄ± ÅŸeklinde entegre edilecek, "Prompt Olarak Kullan" tÄ±klandÄ±ÄŸÄ±nda anÄ±nda timeline Ã¼zerinde yeni sahneler oluÅŸturacaktÄ±r.

```mermaid
graph TD
    subgraph Vite Dev Server [Vite Frontend - Port 4000]
        ReactUI[React 19 App]
        Remotion[Remotion Player Preview]
        ImageCanvas[Image Editor & Mask Canvas]
    end

    subgraph Node.js Backend [Express - Port 3016]
        API[Express API UÃ§larÄ±]
        RabbitMQ[RabbitMQ Message Broker]
        Postgres[(PostgreSQL Database)]
        Worker[Queue Worker & FFmpeg Assembler]
    end

    subgraph GPU Server [Docker Container - localhost:5001-5016]
        Flask[Flask API Server]
        Wan[Wan 2.1 / LTX 2 / Hunyuan Video]
        Flux[Flux.1 Schnell & SD Inpaint]
        Rembg[Rembg Engine]
        EdgeTTS[Edge TTS Engine]
    end

    ReactUI -->|Proxy /api| API
    API -->|Save Jobs & Scenes| Postgres
    API -->|Push Task| RabbitMQ
    Worker -->|Process Queue| RabbitMQ
    Worker -->|Generate / Inpaint / Remove BG| Flask
    Flask -->|Run Models| Wan
    Flask -->|Remove Background| Rembg
    Flask -->|Speech Sentez| EdgeTTS
```

---

## 4. VeritabanÄ± ÅemasÄ± GÃ¼ncellemeleri

`users` ve `video_jobs` tablolarÄ±na ek olarak, sahnelerin esnek sÄ±ralanmasÄ± ve yÃ¶netimi iÃ§in `video_scenes` tablosu eklenecektir:

```sql
CREATE TABLE IF NOT EXISTS video_scenes (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES video_jobs(id) ON DELETE CASCADE,
  scene_number INTEGER NOT NULL,
  video_prompt TEXT NOT NULL,
  speech_text TEXT,
  sfx_prompt TEXT,
  camera_motion VARCHAR(50) DEFAULT 'none', -- none, zoom_in, zoom_out, pan_left, pan_right, breathing
  image_path TEXT,          -- Flux ile Ã¼retilen veya yÃ¼klenen referans gÃ¶rsel
  mask_path TEXT,           -- Inpainting iÃ§in Ã§izilen maske
  video_path TEXT,          -- Colab'Ä±n Ã¼rettiÄŸi sahne videosu
  audio_path TEXT,          -- Ãœretilen ses dosyasÄ±
  status VARCHAR(20) DEFAULT 'pending', -- pending, generating, completed, failed
  sort_order INTEGER NOT NULL
);
```

`video_jobs` tablosuna da `model_type` (wan, ltx, hunyuan) alanÄ± eklenecektir.

---

## 5. DoÄŸrulama ve Test PlanÄ±

### 5.1. Otomatik Testler
*   `client/` dizininde Vitest ve React Testing Library ile:
    *   Timeline sÃ¼rÃ¼kle-bÄ±rak sÄ±ralama mantÄ±ÄŸÄ±nÄ±n testi.
    *   FotoÄŸraf editÃ¶rÃ¼ canvas Ã§izim ve maske Ã¼retimi testi.
*   Backend entegrasyon testlerinin (`src/test_differentiation.spec.ts` ve `src/test_integration.spec.ts`) React API rotalarÄ±yla uyumlu olacak ÅŸekilde gÃ¼ncellenmesi.

### 5.2. Manuel DoÄŸrulama
1.  **Vite Server DoÄŸrulamasÄ±:** `npm run dev` (Frontend) Ã§alÄ±ÅŸtÄ±rÄ±lÄ±p tarayÄ±cÄ±da `http://localhost:4000` adresi aÃ§Ä±lacak. Tema geÃ§iÅŸleri ve i18n kontrol edilecek.
2.  **Timeline SÃ¼rÃ¼kle-BÄ±rak:** 3 sahne oluÅŸturulup sÄ±ralarÄ± deÄŸiÅŸtirilecek, veritabanÄ±na doÄŸru `sort_order` ile kaydedildiÄŸi izlenecek.
3.  **Tek Sahne Yenileme:** Sadece 2. sahne iÃ§in "Yeniden Ãœret" tetiklenecek, Colab'a sadece o sahnenin verilerinin gittiÄŸi doÄŸrulanacak.
4.  **Arka Plan Temizleme:** Panele bir gÃ¶rsel yÃ¼klenecek, "Arka PlanÄ± KaldÄ±r" tÄ±klandÄ±ÄŸÄ±nda Colab'dan transparan gÃ¶rselin dÃ¶ndÃ¼ÄŸÃ¼ ve timeline'a yerleÅŸtiÄŸi gÃ¶zlemlenecek.
