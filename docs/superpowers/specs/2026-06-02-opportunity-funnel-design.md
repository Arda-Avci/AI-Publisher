# Fırsatlar Hunisi ve Akıllı Video Üretim Şartnamesi (Design Spec)

**Tarih:** 2026-06-02  
**Konu:** Fırsatlar Hunisi (Opportunity Funnel) Entegrasyonu, Kapak Fotoğrafı Sentezi ve Gelişmiş Video Montaj Motoru  
**Yazar:** Antigravity (AI Lead Architect)  

---

## 🎯 Amaç ve Başarı Kriterleri
Bu belgede belirtilen sistem, başarılı YouTube videolarını analiz edip "Farklılaştırma Hunisi" (Differentiation Funnel) standartlarına göre özgünleştirerek çoklu platformda (YouTube Shorts, TikTok, X, Meta Reels) otomatik yayınlayan modüllerin mimari detaylarını tanımlar.
*   **İzlenme Hedefi:** Video başına minimum 30.000+ izlenme.
*   **SEO Standartları:** Arda Avcı 2026 standartlarına uygun Neon Cyan (#00FFFF) görsel dili ve başlık formatları.

---

## 🏗️ Mimari ve Bileşen Sınırları

### 1. Veritabanı Genişletmesi (`database.sqlite`)
`users` ve `video_jobs` tablolarına aşağıdaki yeni sütunlar eklenir:
*   **`users`:**
    *   `youtube_api_key` (TEXT) - YouTube Data API Key.
    *   `sample_cover_base64` (TEXT) - Örnek kapak resmi şablonu (Base64).
    *   `personal_avatar_base64` (TEXT) - Kullanıcı portresi/logosu (Base64).
    *   `text_position_grid` (TEXT) - Kapak üzerindeki yazının konumlanacağı 3x3 matris hücresi (örn: "top-left", "center", "bottom-right").
    *   `default_preset_tone` (TEXT) - Varsayılan anlatıcı tonu (gizemli, dramatik, storytelling).
*   **`video_jobs`:**
    *   `playlist_id` (TEXT) - YouTube üzerinde yüklenecek oynatma listesi ID'si.
    *   `cover_image_path` (TEXT) - Seçilen ve sentezlenen nihai kapağın yerel yolu.
    *   `has_shorts` (INTEGER) - Shorts versiyonu üretilip üretilmediği (0 veya 1).
    *   `has_subtitles` (INTEGER) - Altyazı eklenip eklenmediği (0 veya 1).

---

### 2. Modüler İş Akışı ve Colab Bellek Yönetimi (Lazy Sequence)
Büyük yapay zekâ modellerinin T4 GPU üzerinde çökmeden çalışabilmesi için iş akışı sıralı şekilde tasarlanmıştır:
```
[1. Kapak Üretimi: Stable Diffusion 1.5] ➔ [Hafıza Temizliği]
                    │
                    ▼
[2. Video Üretimi: ModelScope T2V] ➔ [Hafıza Temizliği]
                    │
                    ▼
[3. Ses Üretimi: XTTS-v2 & Whisper] ➔ [Hafıza Temizliği]
```

#### A. Kapak Fotoğrafı Sentezi (SD 1.5 + Node.js)
1.  Colab sunucusuna görsel promptu gönderilir. `DreamShaper 8` modeliyle **3 alternatif kapak resmi** üretilir.
2.  Node.js sunucusu kapakları çeker. Kullanıcının base64 portresini alır, **Neon Cyan (#00FFFF) dairesel çerçeve** içine sokarak kırpar.
3.  Seçilen 3x3 grid koordinatına (örn: `top-right`), dairesel portre ve SEO başlığı gölge/parlama efektiyle yerleştirilir.

#### B. Akıllı Dikey Video Motoru (Shorts 9:16)
FFmpeg kullanılarak yatay/kare sahneler dikey formata dönüştürülür:
1.  Video katmanı kopyalanır.
2.  Arka plan 1080x1920 dikey alana genişletilir ve `boxblur=40` filtresiyle bulanıklaştırılır.
3.  Orijinal 1:1 video bu arka planın tam ortasına yerleştirilir.

#### C. Video İçi Etkileşim Callout'ları
*   **%30 Süresinde:** 👍 Like ve "Beğen" ikonu/yazısı (3 sn).
*   **%50 Süresinde:** Ortada sarı renkli *"Kanalıma abone olmayı unutmayın"* yazısı (4 sn).
*   **%65 Süresinde:** 🔔 Abone Ol & Bildirimleri Aç ikonu/yazısı (3 sn).
*   **Son 5 Saniyede:** Statik Bitiş Ekranı (End Screen) - Kullanıcının dairesel çerçeveli avatarı, *"Sonraki Videoyu İzleyin"* çağrısı ve YouTube bileşen alanı.

---

### 3. Fırsatlar Hunisi Arayüzü (Hover Modal & Settings)
*   **Buton & Hover Modal:** Dashboard ana sayfasına eklenen butonun üzerine gelindiğinde mini huni modalı açılır.
*   **Horizontal Scroll:** YouTube Data API (anahtar varsa) veya yedek olarak tırpanlama (scraping) kütüphanesiyle çekilen son 20 video, yan yana kaydırılabilir kartlar halinde listelenir.
*   **Neon Isı Haritası:** Kartların altındaki Fırsat Skorları renklendirilir:
    *   `Skor > 10`: Yeşil 🟢 (Olağanüstü)
    *   `Skor 5-10`: Cyan 🔵 (Yüksek)
    *   `Skor 2-5`: Sarı 🟡 (İyi)
*   **Ön İzleme & Onay Ekranı:** Yayınlanmadan önce ana yatay video ve shorts dikey videosu ayrı ayrı izlenebilir. Kullanıcı platform bazlı SEO metinlerini düzenleyebilir ve YouTube Playlist seçimini yapabilir.
*   **Playwright Oynatma Listesi Otomasyonu:** Playwright, YouTube Studio yükleme sayfasında playlist seçme veya yeni playlist oluşturma adımlarını simüle eder.

### 🤖 4. Playwright Otomatik Dosya Yükleme (Upload) Akışı
Playwright, çerez dosyalarını (`auth_youtube.json` vb.) kullanarak oturum açma engellerine takılmadan yükleme sürecini şu adımlarla tamamen otomatik yürütür:
1.  **Tarayıcı Başlatma:** İlgili platformun yükleme sayfasına (örn: `https://youtube.com/upload` veya YouTube Studio) gidilir.
2.  **Dosya Seçici Tetikleme:** Yükleme butonuna tıklanır ve Playwright'ın dosya seçici dinleyicisi (`page.waitForEvent('filechooser')`) aktif edilir.
3.  **Otomatik Yükleme (setInputFiles):** Sunucunun diskindeki video dosyası (`videolar/film_x.mp4`) ve üretilen kapak resmi (`cover_x.png`) dosya seçiciye programatik olarak beslenir (`fileChooser.setFiles()`). Dosyalar tarayıcıya otomatik yüklenmeye başlar.
4.  **Metin & Playlist Girişi:** Gemini tarafından üretilen başlık, açıklama ve etiketler ilgili metin alanlarına yazılır. Oynatma listesi seçilir.
5.  **Yayınlama:** Yükleme ve işleme bittikten sonra "Yayınla" (Publish) butonuna tıklanarak işlem sonlandırılır.

### 🔐 5. Akıllı Oturum/Giriş Kontrolü Akışı (Session Check Flow)
Yayın platformlarındaki çerezlerin durumunu denetlemek için iki kademeli kontrol mekanizması uygulanır:
1.  **Üretim Öncesi Kontrol (Pre-check):**
    *   Kullanıcı işi kuyruğa eklemeden önce, seçilen platformların `auth_*.json` dosyalarının varlığı sunucuda kontrol edilir.
    *   Eksik çerez olması durumunda kullanıcıya *"Çerez eksik, video otomatik yayınlanamayacak"* uyarısı verilerek onay istenir.
2.  **Yayın Öncesi / Hata Durumunda Kurtarma (On-demand Recovery):**
    *   Yayınlama sırasında oturum hatası (`auth error`) alınırsa, arayüzde **"Oturumu Yenile / Giriş Yap"** butonu tetiklenir.
    *   Playwright, sunucu ekranında görünür modda (`headless: false`) ilgili giriş sayfasını açar. Kullanıcı manuel giriş yaptığında çerezleri yeniden kaydedip yayına devam eder.

---

## 🧪 Doğrulama ve Test Planı
*   **Tür Güvenliği:** `npx tsc --noEmit` ile TypeScript derleme doğrulaması.
*   **FFmpeg Render Doğrulaması:** Bulanıklaştırma ve callout filtrelerinin lokal olarak üretilen test videolarında doğru yerleştiğinin ve sürelere uyduğunun kontrolü.
*   **Playwright Akış Kontrolü:** YouTube playlist seçme adımlarının headless/headful modda izlenerek hata vermediğinin doğrulanması.
