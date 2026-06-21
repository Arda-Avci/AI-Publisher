# Geliştirici ve Teknik Referans Kılavuzu

Bu kılavuz, AI-Publisher projesinde geliştirme yapan mühendisler için mimari yapıyı, veritabanı şemalarını, iş kuyruklarını ve sık karşılaşılan sorunların çözümlerini belgelendirir.

---

## 1. Dizin ve Dosya Yapısı

AI-Publisher backend ve frontend olarak iki ana bölüme ayrılmıştır:

- **`/src`**: Backend uygulama kodları (TypeScript).
  - **`/components`**: Backend dashboard şablon motorları (React bileşenleri / views).
  - **`/lib`**: Ortak kütüphaneler (Veritabanı, Redis, RabbitMQ, Logger vb.).
  - **`/middleware`**: Kimlik doğrulama, CSRF, hata yakalama ve i18n middleware'leri.
  - **`/routes`**: Express API uç noktaları.
  - **`/services`**: Yapay zekâ, video ve ses montaj servisleri.
  - **`/workers`**: FFmpeg komutlarını izole thread'lerde çalıştıran Worker Pool.
- **`/client`**: Bağımsız React/Vite/Tailwind CSS ön yüz arayüzü.
- **`/C4-Documentation`**: C4 Model formatında çizilmiş mimari belgeler ve OpenAPI yaml dosyaları.

---

## 2. Kurulum ve Yerel Geliştirme

### Gereksinimler
- Node.js v18+
- SQLite3 (Lokal geliştirme) / PostgreSQL (Üretim ortamı)
- Redis Server (Kilitler ve SSE mesajlaşması için)
- RabbitMQ (İş kuyrukları için)
- FFmpeg (Sistem yolunda tanımlı olmalıdır)

### Kurulum Adımları
1. Proje bağımlılıklarını yükleyin:
   ```bash
   npm install
   ```
2. `.env` dosyasını yapılandırın:
   ```bash
   cp .env.example .env
   ```
3. Playwright tarayıcı motorunu kurun:
   ```bash
   npx playwright install chromium
   ```
4. Geliştirme sunucusunu başlatın (Port 3016 ve client portu eşzamanlı açılır):
   ```bash
   npm run dev
   ```

---

## 3. Veritabanı Şeması (SQLite & PostgreSQL)

Sistem hem SQLite hem de PostgreSQL uyumlu çalışacak şekilde tasarlanmıştır.

### `users` Tablosu
Kullanıcı kimlik bilgilerini ve SaaS limitlerini tutar:
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `username`: TEXT (Benzersiz kullanıcı adı)
- `password`: TEXT (Bcrypt ile hash'lenmiş şifre)
- `credits`: INTEGER (Kullanıcının harcayabileceği aktif kredi bakiyesi)
- `monthly_credit_limit`: INTEGER (Aylık kredi limiti)

### `video_jobs` Tablosu
Video üretim süreçlerini ve sosyal medya yayınlama durumlarını saklar:
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id`: INTEGER (İş sahibi kullanıcı referansı)
- `master_prompt`: TEXT (Nihai senaryo promptu)
- `production_notes`: TEXT (Kullanıcının belirttiği özel notlar)
- `material_path`: TEXT (Kullanıcının yüklediği referans görsel/video konumu)
- `status`: TEXT (`pending`, `processing`, `completed`, `failed`)
- `progress_percent`: INTEGER (Yüzdelik tamamlanma durumu)
- `current_stage`: TEXT (SSE panelinde görünen canlı durum yazısı)
- `yt_title`, `yt_desc`, `yt_tags`: YouTube pazarlama metinleri
- `tt_desc`, `tt_tags`: TikTok pazarlama metinleri

---

## 4. İş Kuyruğu ve FFmpeg Coworker Pool

### Mesaj Kuyruğu (RabbitMQ)
İşler backend üzerinden oluşturulduğunda RabbitMQ kuyruğuna push edilir. `src/queue.ts` içerisindeki consumer bu işleri sırayla tüketir.
- **Kilit Mekanizması**: Aynı anda sadece tek bir işin Docker GPU container'ına gitmesi için SQL düzeyinde atomik kilitler ve Redis kilitleri kullanılır.

### FFmpeg Coworker Pool (`src/workers/`)
FFmpeg video montajı, altyazı kalıcı gömme (`drawtext` veya `subtitles` filtresi) ve ses birleştirme işlemleri ana Node.js event loop'unu bloklamamak için `worker_threads` (işçi parçacıkları) üzerinden çalıştırılır.
- **`ffmpeg-pool-worker.ts`**: Parent thread'den gelen FFmpeg komutlarını bağımsız bir işlemde çalıştırarak bellek sızıntılarını ve CPU kilitlenmelerini engeller.

---

## 5. Sorun Giderme (Troubleshooting)

### 1. Windows FFmpeg Yazı Tipi (Font) Hatası
Windows sistemlerinde FFmpeg altyazı basarken font bulamazsa çökebilir. `src/services/videoService.ts` içinde Windows için sistem font yolları (örn: `C:/Windows/Fonts/arial.ttf`) otomatik olarak algılanıp atanmaktadır. Font hatası alırsanız sisteminizde Arial fontunun yüklü olduğunu doğrulayın.

### 2. SQLite / PostgreSQL lastID Hatası
sqlite3 kütüphanesi insert işlemlerinde `lastID` dönerken, pg (PostgreSQL) sürücüsü `rows[0]` üzerinden veri döner. Projedeki `db.ts` bu farkı otomatik sarmalayarak uyumluluk sağlar.

### 3. Docker Container SSE Kesintileri
Docker container yeniden başlatmalarında SSE akışlarında zaman zaman kesinti oluşabilir. İstemci tarafında (`useLanguage` ve Progress SSE kısımlarında) kesintilere karşı otomatik yeniden bağlanma (`onerror`) eklenmiştir.
