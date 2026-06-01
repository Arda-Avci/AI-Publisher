# Yapılacaklar Listesi (TODO)

## 📋 Hazırlık & Yapılandırma
- [x] TypeScript yapılandırma dosyasını (`tsconfig.json`) kontrol et ve NodeNext moduna uyarla.
- [x] `.env.example` ve `.env` şablonunu oluştur.
- [x] Dizin yapısını oluştur (`src/`, `uploads/`, `videolar/`).

## ☁️ Bölüm 1: Google Colab Katmanı
- [x] Google Colab için Flask sunucusu (`colab_server.py`) kodunu hazırla (Image-to-Video, XTTS, AudioLDM2 entegrasyonu, Dudak senkronizasyonu ve indirme endpoint'leri).

## 💻 Bölüm 2: Node.js / TypeScript Komut Merkezi Katmanı
- [x] SQLite Veritabanı Mimarisi (`src/db.ts`) kodlaması.
- [x] Zod şeması ve Gemini entegrasyonlu Hikaye Bölücü / Pazarlama Metni Üretici.
- [x] Sıralı İş Kuyruğu ve FFmpeg Mix/Altyazı Gömme Motoru (`src/queue.ts`).
- [x] Playwright Sosyal Medya Yayın Motoru (`src/publisher.ts` - YouTube, TikTok, X, Meta).
- [x] Express Web Sunucusu ve SSE Canlı Takip Arayüzü (`src/server.ts`).
- [x] Dashboard ve Giriş Ekranı Frontend tasarımı (Açık/Koyu Neon Cyan tema, canlanabilir arayüz).

## 🧪 Test & Doğrulama
- [x] SQLite ve iş akışının entegrasyon testlerini yaz.
- [x] Playwright session yükleme kodlarının doğruluğunu denetle.
