# AI-Publisher: Otonom AI Video Üretim ve Pazarlama Platformu (SaaS)

AI-Publisher; dikey ve yatay formatta video üretebilen, marka kimliğini (Brand Kit) koruyan, kinetik altyazılar ve Sidechain Audio Ducking gibi gelişmiş kurgu filtrelerini otonom olarak uygulayan ve Playwright yardımıyla sosyal medyada (YouTube, TikTok, X, Meta Reels) otomatik paylaşım yapabilen uçtan uca bir SaaS platformudur.

---

## 🚀 Öne Çıkan Özellikler

- 🎬 **Dinamik Model Seçimi:** Proje şablonuna göre `cinematic` (HunyuanVideo), `dynamic` / `pixar` (Wan 2.1) ve `simple` (LTX-Video) modellerinin otonom seçimi.
- 🎙️ **Dinamik Ses Klonlama ve TTS (XTTS-v2):** Kullanıcıların kendi ses kayıtlarını profil ayarlarından yükleyerek ses sentezleme ve dublaj işlemlerinde kullanabilmesi.
- 🔗 **Otonom Webhook / Callback Mimarisi:** Google Colab sunucusu işlemini bitirdiği an dosyaları doğrudan backend sunucusuna push eder.
- ⚡ **Erken Polling Çıkışı (Early Exit):** Callback ile dosyalar yerel sunucuya ulaştığında, durum polling döngüsü beklemeden sonlanır ve montaj aşamasına geçilir.
- 💰 **SaaS Kredilendirme Altyapısı:** İşlem bazlı otomatik kredi düşüşü ve hata/iptal durumlarında kredilerin anlık iadesi (Refund).
- 🧹 **Otonom Temizlik:** Yüklenen materyaller (resim, video) disk alanından tasarruf etmek için Sahne 1 üretimi tamamlandığı anda anında silinir.
- 📊 **Yapay Zeka Viralite Analizi:** Gemini Vision API ile kapak görseli ve kanca (hook) karesi taranarak viral olma olasılığı (%0-100) hesaplanır.

---

## 🛠️ Kurulum ve Çalıştırma

Projenin kurulum gereksinimleri, ortam değişkenleri ve adım adım çalıştırma rehberi için lütfen **[KURULUM_VE_GEREKSINIMLER.md](file:///c:/Users/Damla/Proje/AI-Publisher/KURULUM_VE_GEREKSINIMLER.md)** belgesini inceleyin.

---

## 🗒️ Proje Durumu ve Yapılacaklar

- **Mevcut Durum Raporu:** [PROJECT_STATUS.md](file:///c:/Users/Damla/Proje/AI-Publisher/PROJECT_STATUS.md)
- **Yapılacaklar Listesi (TODO):** [TODO.md](file:///c:/Users/Damla/Proje/AI-Publisher/TODO.md)
- **Mimari Karar Kayıtları (ADR):** `docs/adr/`
- **Beyin Fırtınası Belgesi:** [brainstorming_final.md](file:///c:/Users/Damla/Proje/AI-Publisher/brainstorming_final.md)
