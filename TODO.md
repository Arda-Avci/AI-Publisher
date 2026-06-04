# Yapılacaklar Listesi (TODO)

## 📋 Hazırlık & Yapılandırma
- [x] TypeScript yapılandırma dosyasını (`tsconfig.json`) kontrol et ve NodeNext moduna uyarla.
- [x] `.env.example` ve `.env` şablonunu oluştur.
- [x] Dizin yapısını oluştur (`src/`, `uploads/`, `videolar/`).

## ☁️ Bölüm 1: Google Colab Katmanı
- [x] Google Colab için Flask sunucusu (`colab_server.py`) kodunu hazırla (Image-to-Video, XTTS, AudioLDM2 entegrasyonu, Dudak senkronizasyonu).
- [x] Stable Diffusion 1.5 (`DreamShaper 8`) ile 3 alternatif kapak üretme endpoint'i ve lazy loading bellek optimizasyonu entegrasyonu.
- [x] Colab sunucu başlatma betiğindeki (`colab_setup.py`) `UnsupportedOperation: fileno` hatasını log dosyası yönlendirmesiyle giderme, çalışmayan Wav2Lip/GAN indirme linklerini güncel Hugging Face adresleriyle güncelleme, SymPy çakışmasını önlemek için oturum yeniden başlatma uyarısı ekleme, `colab_server.py`'a Colab Secrets üzerinden `NGROK_TOKEN` desteği ekleme, Ngrok URL'ini otomatik olarak hücre çıktısına yazdırma, bekleme süresini 30 saniyeye çıkarma, hata durumunda logları ekrana basma, Python 3.12 uyumluluğu için `coqui-tts` geçişi yapma, mükerrer `git clone` hatalarını giderme, eksik `colab_server.py` için otomatik dosya yükleme istemi (files.upload) tetikleme ve unbuffered (-u) loglama sağlama.


## 💻 Bölüm 2: Node.js / TypeScript Komut Merkezi Katmanı
- [x] SQLite Veritabanı Mimarisi (`src/db.ts`) genişletilmiş ayar/playlist sütunları.
- [x] Node.js ColabManager'ın (`src/lib/colab-manager.ts`) yerel Python çalıştırma süreçleri yerine `.env` üzerindeki `COLAB_URL` bağlantısını doğrudan benimsemesi (zaman aşımı hatası düzeltildi).

- [x] Zod şeması ve Gemini entegrasyonlu Hikaye Bölücü / Pazarlama Metni Üretici.
- [x] Sıralı İş Kuyruğu ve FFmpeg Mix/Altyazı Gömme Motoru (`src/queue.ts`).
- [x] FFmpeg dikey video (Shorts 9:16) boxblur ve Like/Abone ol callout motoru entegrasyonu.
- [x] Playwright Sosyal Medya Yayın Motoru (`src/publisher.ts` - YouTube Playlist entegreli).
- [x] Fırsatlar Hunisi horizontal scroll ve profil ayarları dashboard tasarımı (`src/server.ts`).
- [x] D-Note premium tema ve i18n (çoklu dil) desteğinin modüler olarak entegrasyonu (JSON dosyaları, `themes.ts` modülü, `i18n` ve `theme` middleware katmanları ile).

## 🧪 Test & Doğrulama
- [x] SQLite ve iş akışının entegrasyon testlerini yaz ve Vitest ile doğrula (`src/test_integration.spec.ts`).
- [x] Playwright session yükleme kodlarının doğruluğunu denetle.
- [x] Veritabanı kuyruk temizliğini gerçekleştir ve 2 aktif pending iş hazırla.

## 🗒️ Dokümantasyon & Mimari Kararlar
- [x] VoxCPM seslendirme modeli değerlendirmesini ve gelecek yol haritası kararını `docs/adr/ADR-001-TTS-Engine-Evaluation.md` dosyasına kaydet.
