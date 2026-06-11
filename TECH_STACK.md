# AI-Publisher Teknoloji Yığını (Tech Stack)

Bu belge, "Otonom Çoklu Sosyal Medya Destekli AI Video Üretim ve Pazarlama Platformu" (SaaS) projesinin uçtan uca mimarisinde kullanılan teknolojileri ve kütüphaneleri listeler.

Proje mimarisi iki ana katmana ayrılmıştır:

## 1. Ağır İşlem ve Yapay Zeka Katmanı (Google Colab / Python)
Bu katman, ağır yapay zeka modellerinin T4 GPU üzerinde off-load ve tiling optimizasyonlarıyla çalıştırılmasından sorumludur.

*   **Sunucu Altyapısı:**
    *   **Çalışma Ortamı:** Google Colab (T4 GPU)
    *   **Web Çatısı:** Python Flask
    *   **Dışa Açım (Tünelleme):** Pyngrok (Ngrok üzerinden Node.js ile iletişim)
*   **Yapay Zeka Modelleri:**
    *   **Video Üretimi (T2V / I2V):** `THUDM/CogVideoX-5b-I2V` veya `damo-vilab/text-to-video-ms-1.7b` (ModelScope) - Görselden ve metinden video üretimi.
    *   **Ses Klonlama ve Üretimi (TTS):** `coqui/XTTS-v2` (Türkçe dil desteği ve ses klonlama yeteneği).
    *   **Ses Efekti Üretimi (SFX):** `cvssp/audioldm2` (Videolara dinamik ortam sesleri üretimi).
    *   **Gerçek Zamanlı Dudak Senkronizasyonu:** `Wav2Lip` (Karakterin sesin genliğine göre ağız hareketlerini eşlemesi).
    *   **Altyazı (STT):** `faster-whisper` (Sesten metne dönüştürme ve kelime zamanlamalı `.srt` dosyası üretimi).
*   **Görüntü ve Ses İşleme Araçları:**
    *   `OpenCV` (Video frame yakalama ve yüz/dudak manipülasyonu)
    *   `scipy.io.wavfile` & `numpy` (Ses dalgası ve genlik analizleri)
    *   `diffusers`, `transformers`, `accelerate` (Hugging Face model boru hatları)
    *   `yt-dlp` (YouTube'dan doğrudan orijinal referans videoları indirme)

---

## 2. Komut Merkezi ve Kullanıcı Paneli Katmanı (Node.js)
Bu katman, kullanıcı arayüzünü sunan, iş kuyruklarını (Job Queue) yöneten, API isteklerini koordine eden ve platformlarda (YouTube, TikTok, X, Meta) otomatik yayınlama yapan ana merkezdir.

*   **Temel Altyapı:**
    *   **Çalışma Zamanı (Runtime):** Node.js
    *   **Dil:** TypeScript (`tsx` ile anında çalıştırma ve `tsc` ile derleme)
    *   **Web Çatısı:** Express.js (`express-session` ile oturum yönetimi)
*   **Veritabanı ve Önbellekleme:**
    *   **İlişkisel Veritabanı:** SQLite (veya alternatif yapılandırma ile PostgreSQL - `pg` paketi mevcut)
    *   **Önbellek ve Durum Yönetimi:** Redis (`ioredis`) - Playwright bot durumları ve rate limiting için.
*   **İş Kuyruğu ve Asenkron Görevler:**
    *   **Message Broker:** RabbitMQ (`amqplib`) - Video üretim sırası ve sosyal medya yayınlama kuyruklarının yönetimi.
*   **Yapay Zeka Prompt Analizi:**
    *   **AI SDK:** Vercel AI SDK (`@ai-sdk/google`, `@ai-sdk/openai`) - Kullanıcı promptlarını (`master_prompt`) analiz edip otonom şekilde sahnelere, SEO uyumlu açıklamalara ve etiketlere dönüştürmek (`gemini-2.5-flash` vb. LLM kullanarak).
*   **Çoklu Sosyal Medya Yayın Motoru (RPA):**
    *   **Tarayıcı Otomasyonu:** Playwright (`playwright`) - Anti-bot korumalarını atlatmak için önceden tanımlanmış çerez (cookie) dosyalarıyla (auth.json, auth_tiktok.json vb.) çalışan "headless" tarayıcı motoru.
*   **Medya İşleme (Backend):**
    *   `multer` (Kullanıcılardan gelen medya dosyalarının yüklenmesi)
    *   `FFmpeg` (Colab'dan inen sahnelerin, sesin, efektifin mikslenmesi ve sarı altyazıların videoya "burn-in" olarak basılması)
*   **Kalite Kontrol ve Test:**
    *   `vitest` (Birim ve entegrasyon testleri)
    *   `supertest` (Express endpoint testleri)
    *   `eslint` & `tsc` (Statik kod analizi ve Type check)
*   **Güvenlik:**
    *   `bcrypt` (Kullanıcı şifrelerinin hash'lenmesi)
    *   `express-rate-limit` (Brute-force koruması)
    *   `dotenv` (Çevre değişkenlerinin gizlenmesi)

---

## Mimari Akış Özeti

1.  **Girdi:** Kullanıcı Node.js paneline girer, metin promptu veya kaynak video girerek projeyi başlatır.
2.  **LLM Analizi:** Vercel AI SDK, projeyi ardışık sahnelere bölerek bir JSON şeması oluşturur. (Her platform için SEO başlık, etiket).
3.  **Kuyruğa Alma:** Node.js, görevleri RabbitMQ veya otonom bir Job Queue aracılığıyla sıraya alır ve Colab sunucusuna iletir.
4.  **Üretim:** Colab üzerindeki Flask sunucusu; videoyu üretir (CogVideo), sesi klonlar (XTTS), dublajla dudakları senkronize eder (Wav2Lip) ve efektler (AudioLDM2) ekler.
5.  **Geribildirim:** Bu süreç boyunca Node.js, `Server-Sent Events (SSE)` üzerinden tarayıcıya canlı ilerleme yüzdesini basar.
6.  **Yayın:** Dosyalar Node.js makinesine indirilir, FFmpeg ile birleştirilir ve Playwright (bot) tarafından TikTok, YouTube Shorts, X ve Meta Reels üzerine otomatik olarak yüklenir.
