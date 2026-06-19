# AI-Publisher Teknoloji Yığını (Tech Stack)

Bu belge, "Otonom Çoklu Sosyal Medya Destekli AI Video Üretim ve Pazarlama Platformu" (SaaS) projesinin uçtan uca mimarisinde kullanılan teknolojileri, kütüphaneleri ve AI modellerini listeler.

---

## 1. Ağır İşlem ve Yapay Zeka Katmanı (Google Colab / Python / Docker)

Bu katman, ağır yapay zeka modellerinin T4/L4 GPU üzerinde, aktif VRAM yönetimi (OOM koruması), lazy loading ve CPU off-loading/tiling optimizasyonlarıyla çalıştırılmasından sorumludur. Tüm modeller bağımsız Docker konteynerlerinde izole edilmiştir.

### 📦 Konteynerizasyon ve Derleme Altyapısı (Kaniko & Local Registry)
*   **İzole Konteyner Yapısı:** Tüm AI modelleri 11 bağımsız Docker imajı (base + 10 model) olarak derlenir ve Google Drive (`/content/drive/MyDrive/Colab Notebooks/docker/images/`) altında `.tar.gz` olarak saklanır.
*   **Derleme Motoru (Kaniko):** Colab üzerindeki cgroup read-only kısıtlamalarını bypass etmek amacıyla daemonless **Kaniko** motoru kullanılır.
*   **Local Registry:** Modeller arası `FROM ai-publisher-base:latest` bağımlılığını yönetebilmek amacıyla Colab üzerinde Go-tabanlı hafif bir lokal Registry (`localhost:5000`) ayağa kaldırılmıştır.
*   **Paralel Sıkıştırma (Pigz):** Imaj yedekleme hızını optimize etmek amacıyla paralel sıkıştırma yapan `pigz` aracı entegre edilmiştir.
*   **Bütünlük Doğrulama:** `verify_images.py --drive-only` betiği ile Drive üzerindeki `.tar.gz` imaj arşivlerinin bozuk veya eksik olup olmadığı `tarfile` kütüphanesiyle kontrol edilmektedir.

### 🧠 Yapay Zeka Modelleri ve Servisleri
*   **Video Üretimi (T2V / I2V):** 
    *   `THUDM/CogVideoX-5b-I2V` (veya `CogVideoX-2b`)
    *   `Wan 2.1` (Dynamic şablonlar için)
    *   `HunyuanVideo` (Cinematic şablonlar için)
    *   `LTX-Video` (Simple şablonlar için)
    *   *Akıllı Sahne Sürekliliği (Autoregressive Chaining):* Sahne > 1 ise, bir önceki sahnenin bitiş karesi OpenCV ile yakalanıp I2V modeline başlangıç görseli (`init_image`) olarak beslenir.
*   **Ses Klonlama ve Üretimi (TTS):** 
    *   `coqui/XTTS-v2` (Kullanıcılardan alınan `.mp3`/`.wav` referans seslerinden Base64 aktarımı ile Türkçe ses klonlama).
    *   *Edge TTS* ve *OpenAI TTS* (Alternatif ve hızlı seslendirme sağlayıcıları).
    *   *Ses Sündürme (Time-Stretch):* `pyrubberband` (soundfile) ile ses perdeleri korunarak 0.5x-2.0x oranında video süresine göre esnetilir.
*   **Ses Efekti Üretimi (SFX):** `cvssp/audioldm2` (Dinamik ve konsept uyumlu sfx sentezi).
*   **Dudak Senkronizasyonu (Lip-Sync):** 
    *   `Wav2Lip` (Ses genliğine göre dudak hareketi).
    *   `MuseTalk` (Multi-face / speaker targeting desteği; belirli bir karaktere göre dudak senkronizasyonu).
*   **Altyazı ve Transkript (STT):** `faster-whisper` (Sesten metne dönüştürme ve kelime zamanlamalı altyazı koordinat üretimi).
*   **Görsel ve Yüz İyileştirme:** 
    *   `GFPGAN v1.4` (Yapay zeka kapak sentezlerinde ve video karelerinde yüz restorasyonu).
    *   `RealESRGAN` (Görselleri ve kapakları 2x/4x ölçekleme).
*   **Stable Diffusion:** `DreamShaper 8` ile otonom kapak sentezi ve `rembg` ile otonom arka plan temizleme.

---

## 2. Komut Merkezi ve Kullanıcı Paneli Katmanı (Node.js / TypeScript / React)

Bu katman; kullanıcı panelini sunan, iş kuyruklarını yöneten, SSE ile canlı durum raporlayan ve Playwright botları ile sosyal medya platformlarında otomatik paylaşım yapan komut merkezidir.

### 🏗️ Temel Altyapı ve Çalışma Zamanı
*   **Çalışma Zamanı (Runtime):** Node.js
*   **Dil:** TypeScript (TS 5.x, `strictNullChecks` uyumlu, sıfır derleme hatasıyla tip güvenliği).
*   **Sunucu Çatısı:** Express.js (`express-session` tabanlı oturum yönetimi).
*   **Veritabanı:** 
    *   *PostgreSQL* (`pg` havuzu ile üretim ortamında).
    *   *SQLite* (Geliştirme ve hızlı yerel testler için).
*   **Önbellek ve SSE Durum Yönetimi:** Redis (`ioredis` ve Redis Pub/Sub) üzerinden state-free Server-Sent Events (SSE) yayın kararlılığı.

### 📥 İş Kuyruğu ve Asenkron Görev Yönetimi
*   **Message Broker:** RabbitMQ (`amqplib`) - Video üretim kuyrukları ve sosyal medya yayın kuyruklarının yönetimi.
*   **Kuyruk Optimizasyonları:** Prefetch(3) ile Node.js tarafında paralel hazırlık, Colab tarafı için `colabMutex` kilidi, otomatik yeniden bağlanma (auto-reconnect) döngüleri.
*   **SaaS Kredilendirme Sistemi:** `users` tablosunda kredi sınırları (`credits`, `monthly_credit_limit`) ve tüm harcama/iade geçmişini tutan `credit_transactions` tablosu ile entegre SaaS yönetim modülü.

### 🎭 Yapay Zeka Model Fallback ve Prompt Analizi
*   **Akıllı LLM Zinciri:** Zen Free (`big-pickle`, `mimo-v2.5-free`, `nemotron-3-ultra-free`) -> Minimax-M3 (Anthropic SDK proxy'si) -> Gemini-2.5-flash fallback zinciri.
*   **Watchdog & ETA:** Colab VM'den gelen gerçek `etaSeconds` bilgisine göre çalışan dinamik watchdog zaman aşımı yönetimi.

### 🎬 Medya İşleme ve Altyazı Motoru (Bypass Logic & Fast Concat)
*   **Colab-Heavy Kurgu:** Altyazı yakma, renk derecelendirme, farklılaştırma filtreleri ve logo yerleştirme süreçleri tamamen Google Colab tarafındaki FFmpeg katmanında tamamlanır.
*   **Hızlı Concat (Bypass):** `MOCK_COLAB === 'false'` iken Node.js local FFmpeg mix adımları bypass edilir. Sahneler tamamlandığında Node.js backend'inde herhangi bir FFmpeg re-encode işlemi yapılmaz. Gelen pre-mixed sahneler `ffmpeg -y -f concat -safe 0 -i list.txt -c copy` komutuyla 1 saniyeden kısa sürede birleştirilir.
*   **Kinetic Subtitles:** Sarı renkli şık altyazıların (Bounce, Pulse, Shake, Pop, Wave animasyonları) FFmpeg ASS filtreleri ile Colab tarafında kalıcı olarak videoya gömülmesi (Burn-in).

### 🤖 Sosyal Medya Otomasyon Motoru (RPA)
*   **Tarayıcı Otomasyonu:** Playwright (`playwright`).
*   **Paylaşım Protokolleri:** `auth.json`, `auth_tiktok.json`, `auth_x.json`, `auth_meta.json` çerez dosyalarını kullanarak tarayıcı simülasyonu (insansı gecikmeler, insan tıklaması/yazması ve hata toleransı ile) üzerinden YouTube Shorts, TikTok, X (Twitter) ve Meta Reels yüklemeleri.

### 🛡️ Güvenlik Sıkılaştırmaları
*   **XSS Koruması:** Kullanıcı girdilerinin (`master_prompt` vb.) `escapeHtml` fonksiyonu ile sanitize edilerek basılması.
*   **Clickjacking & MIME-Sniffing:** Express Güvenlik Başlıkları (Helmet benzeri özel middleware) entegrasyonu.
*   **CSRF Koruması:** `src/middleware/csrf.ts` ve fetch/form interceptor katmanı.
*   **Webhook Korunması:** Colab callback webhook rotasında query token PSK doğrulaması.

---

## 3. Frontend Katmanı (React SPA)

Kullanıcının video üretim süreçlerini yönettiği, görsel ve işitsel düzenlemeler yaptığı modern web arayüzü.

*   **Arayüz Tasarımı:** Vite + React + Vanilla CSS (Glassmorphism temalı, neon mor/cyan renk paleti, koyu mod/tema desteği).
*   **Çoklu Dil (i18n):** `useLanguage` hook'u ile dinamik yüklenen Türkçe ve İngilizce dil paketleri (`tr.json` / `en.json`).
*   **Bileşen Mimarı:**
    *   `LandingPage.tsx`: Neon gradyanlı, video modallı kurumsal karşılama sayfası.
    *   `StudioPanel.tsx`: Canlı video önizleme, Timeline, MuseTalk ve Edit Queue bileşenlerinin toplandığı ana stüdyo.
    *   `Timeline.tsx`: Çok kanallı (Video/Audio/SFX/Music) profesyonel timeline düzenleyici.
    *   `PhotoEditor.tsx`: Canvas tabanlı inpaint, maske ve arka plan temizleme aracı.
    *   `GalleryPanel.tsx`: Üretilen videoların listelendiği, SSE tabanlı canlı ilerleme göstergesine ve meta düzenleyiciye sahip galeri paneli.
