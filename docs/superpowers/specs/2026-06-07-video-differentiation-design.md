# 2026-06-07 Video Özgünleştirme ve Esnek Stüdyo Tasarımı (Spec)

Bu tasarım dokümanı, platforma gelişmiş **YouTube Video Özgünleştirme (Farklılaştırma)** ve **Sıfırdan Video Üretimi** akışlarını entegre etmek için mimari detayları ve uygulama planını tanımlar.

---

## 1. Proje Amacı ve Kapsam

Kullanıcıların YouTube'da buldukları viral videoları veya yerel yükledikleri referans videoları kullanarak YouTube telif ve kopya içerik (reuse content) filtrelerine takılmayacak şekilde **benzersiz (özgün)** yeni videolar üretmesini sağlamak. 

Aynı zamanda sisteme referans video verilmediği durumlarda tamamen promptlara dayalı **sıfırdan üretim** desteği kazandırılarak altyapının esnek çalışması hedeflenmektedir.

---

## 2. Ana Özellikler ve Akışlar

### 2.1. İki Farklı Çalışma Modu
Sistem, "Yeni Proje Başlat" formunda kullanıcının seçimine göre iki farklı akış izler:
1.  **Özgünleştirme Modu (Referans Videolu):** 
    *   YouTube linki veya yerel video yüklenir.
    *   Süre seçeneği (Aynı, Daha Kısa, Daha Uzun) belirlenir.
    *   Orijinal transkript çıkarılır, Gemini ile temizlenip hedef dile çevrilir.
    *   Yerel video montaj aşamasında FFmpeg ile özgünlük filtreleri uygulanır.
2.  **Sıfırdan Üretim Modu (Direct Prompt):**
    *   Referans video yoktur. Sadece prompt, yönetmen direktifleri ve karakter tasviri girilir.
    *   Yapay zeka transkript yerine girilen master prompt ve notları bölerek sahne promptları oluşturur.
    *   Colab tarafında görselden-videoya değil, doğrudan metinden-videoya (T2V) modeli çalışır.

### 2.2. Süre Seçenekleri (Duration Mode)
*   **Aynı (Same):** Orijinal sahne sayısı korunur (ortalama 3-5 sahne, her biri min 6sn).
*   **Daha Kısa (Shorter):** Toplam sahne sayısı %30 azaltılır (min 2 sahne).
*   **Daha Uzun (Longer):** Toplam sahne sayısı %50 artırılır (son sahne varyasyonları eklenerek uzatılır).
*   *Bu seçenek hem Fırsat Hunisi modalında hem de ana stüdyo kontrol paneli formunda seçilebilir olacaktır.*

### 2.3. Kuyrukta Paralel Hazırlık (RabbitMQ & Node.js CPU Optimization)
Colab GPU çalışma süresini (kredi harcamasını) minimumda tutmak için:
*   Kuyrukta (RabbitMQ) sıradaki işler işlenirken; **Colab GPU gerektirmeyen hazırlık aşamaları (Phase 1: video indirme, transkript çekme, Gemini çeviri ve planlama)** Node.js tarafında arka planda **paralel** olarak yürütülür.
*   Colab GPU'su yalnızca render aşamasına geçildiğinde (`colabMutex.acquire()`) kilitlenir.
*   Böylece Colab sunucusu render yaparken, sıradaki işin tüm metin, çeviri ve görsel referans kare hazırlıkları tamamlanmış olur. Kuyruk bittiği an Colab otomatik kapatılır (`colab.stop()`).

### 2.4. Colab Tarafında Premium 6 Saniyelik Video Üretimi
*   Model, **CogVideoX-5b-I2V** (Image-to-Video) ve **CogVideoX-5b** (Text-to-Video) modellerine yükseltilecektir.
*   Her sahne için minimum **49 kare (6 saniye @ 8fps)** üretilecektir.
*   Eğer referans kare varsa CogVideoX-5b-I2V tetiklenir; yoksa CogVideoX-5b T2V tetiklenir.
*   Üretilen video ve ses dosyaları anında Node.js sunucusuna indirilir.

### 2.5. FFmpeg ile Gelişmiş Özgünlük Filtreleri (`videoService.ts`)
YouTube piksel eşleştirme algoritmalarını aşmak için montaj sırasında şu filtreler uygulanır:
*   **Ufaltma & Bulanık Arka Plan:** Video %90 ölçeğine ufaltılıp, arkasına kendi görüntüsünün %100 ölçeklenmiş ve 40px bulanıklaştırılmış (`boxblur=40`) hali arka plan olarak bindirilir.
*   **Renk & Vinyet:** Hafif kontrast (`eq=contrast=1.05:saturation=1.1`) ve vinyet (`vignette=pi/8`) efektiyle piksel imzası değiştirilir.
*   **Sahne Geçişleri:** Sahneler birleştirilirken aralarda 0.5 saniyelik çapraz geçiş (crossfade) uygulanır.

---

## 3. Arayüz ve Kullanıcı Deneyimi Değişiklikleri

### 3.1. Ana Form Güncellemesi (`src/views/dashboard.ts`)
*   Forma **"Özgünleştirme Süre Modu"** seçeneği eklenir (Aynı, Daha Kısa, Daha Uzun).
*   Referans video seçildiğinde veya yüklendiğinde bu süre modu aktif olur.
*   Fırsat hunisinden gelen süre seçimi bu alana otomatik doldurulur.

### 3.2. Durum Takip Ekranı (Progress & SSE)
Kullanıcı stüdyo kuyruğundaki işlerin her aşamasını anlık görebilir:
*   `stageVideoDownloading`: "Orijinal video indiriliyor..."
*   `stageTranscriptExtracting`: "Transkript çıkarılıyor..."
*   `stageTranslationPlanning`: "Metin çevriliyor ve sahneler planlanıyor..."
*   `stageColabStarting`: "Colab sunucusu başlatılıyor..."
*   `stageSceneGenerating`: "Sahne {N} üretiliyor..."
*   `stageColabProgress`: "Colab: {Aşama Mesajı} ({Yüzde}%)"
*   `stageFinalMontage`: "Final montaj ve özgünlük filtreleri uygulanıyor..."

---

## 4. Teknik Mimari ve Dosya Değişiklikleri

### 4.1. `src/db.ts` (Şema)
Mevcut `video_jobs` tablosundaki `differentiation_duration_mode` alanını formdan gelen verilere göre kaydedip işleyeceğiz.

### 4.2. `src/lib/differentiate.ts` (Phase 1 Paralelleştirme)
*   `runPhase1Background` fonksiyonu, RabbitMQ kuyruğuna girmeden önce çalışarak video indirme ve transkript çevirisini tamamlar.
*   Durum güncellemelerini DB'ye yazar ve SSE ile arayüze yayınlar.

### 4.3. `src/queue.ts` (İşlem Çarkı)
*   Eğer iş bir **YouTube referans videosu** (`source_video_id`) içeriyorsa, Node.js sunucusu videoyu indirmek ve kare çıkarmakla uğraşmaz. Doğrudan `source_video_id` değerini Colab'a istek gövdesinde gönderir.
*   Eğer iş **kullanıcı tarafından yerel olarak yüklenmiş bir video** (`material_path` uploads klasöründeyse) içeriyorsa, Node.js sunucusu ilgili sahne zamanına ait kareyi `extractReferenceFrameAtTime` ile yerel olarak keser ve Colab'a `reference_image_base64` parametresiyle gönderir (fallback modu).

### 4.4. `colab_server.py` (Colab Flask Sunucusu)
*   **Doğrudan İndirme Optimizasyonu:** Sunucu, gelen istekte `source_video_id` algıladığında, `yt-dlp` kullanarak videoyu doğrudan Google Cloud yüksek hızlı internet hattı üzerinden `/content/source_videos/` dizinine indirir (yaklaşık 1-2 saniye).
*   İlgili sahnenin başlangıç karesi, Colab tarafında OpenCV ile doğrudan indirilen videonun `(scene_number - 1) * 6` saniyesinden kesilerek çıkarılır.
*   Görsel, **CogVideoX-5b-I2V** modeline girdi (`init_image`) olarak beslenir. Böylece Ngrok üzerinden büyük base64 dosyaları transfer edilmemiş olur.
*   Yerel yüklenen videolar için `reference_image_base64` çözülerek girdi olarak kullanılmaya devam eder.


---

## 5. Doğrulama ve Test Planı

### Otomatik Testler
*   `src/test_differentiation.spec.ts` oluşturularak:
    *   Referans videodan kare çıkarma fonksiyonu doğrulanacak.
    *   Duration mode (Aynı, Daha Kısa, Daha Uzun) filtreleri test edilecek.
    *   Farklılaştırma (Filtreleme) parametreleri ve FFmpeg komut çıktıları denetlenecek.

### Manuel Doğrulama
*   Fırsat hunisinden bir video seçilerek "Daha Kısa" seçeneğiyle özgünleştirme başlatılacak.
*   Arka plandaki transkript indirme, çeviri ve onay adımları izlenecek.
*   Video tamamlandığında nihai MP4 dosyasının ufaltılmış-bulanıklaştırılmış formatı ve sahneler arası 6sn tutarlılığı incelenecek.
