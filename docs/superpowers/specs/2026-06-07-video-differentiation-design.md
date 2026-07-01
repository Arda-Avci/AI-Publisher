# 2026-06-07 Video Ã–zgÃ¼nleÅŸtirme ve Esnek StÃ¼dyo TasarÄ±mÄ± (Spec)

Bu tasarÄ±m dokÃ¼manÄ±, platforma geliÅŸmiÅŸ **YouTube Video Ã–zgÃ¼nleÅŸtirme (FarklÄ±laÅŸtÄ±rma)** ve **SÄ±fÄ±rdan Video Ãœretimi** akÄ±ÅŸlarÄ±nÄ± entegre etmek iÃ§in mimari detaylarÄ± ve uygulama planÄ±nÄ± tanÄ±mlar.

---

## 1. Proje AmacÄ± ve Kapsam

KullanÄ±cÄ±larÄ±n YouTube'da bulduklarÄ± viral videolarÄ± veya yerel yÃ¼kledikleri referans videolarÄ± kullanarak YouTube telif ve kopya iÃ§erik (reuse content) filtrelerine takÄ±lmayacak ÅŸekilde **benzersiz (Ã¶zgÃ¼n)** yeni videolar Ã¼retmesini saÄŸlamak. 

AynÄ± zamanda sisteme referans video verilmediÄŸi durumlarda tamamen promptlara dayalÄ± **sÄ±fÄ±rdan Ã¼retim** desteÄŸi kazandÄ±rÄ±larak altyapÄ±nÄ±n esnek Ã§alÄ±ÅŸmasÄ± hedeflenmektedir.

---

## 2. Ana Ã–zellikler ve AkÄ±ÅŸlar

### 2.1. Ä°ki FarklÄ± Ã‡alÄ±ÅŸma Modu
Sistem, "Yeni Proje BaÅŸlat" formunda kullanÄ±cÄ±nÄ±n seÃ§imine gÃ¶re iki farklÄ± akÄ±ÅŸ izler:
1.  **Ã–zgÃ¼nleÅŸtirme Modu (Referans Videolu):** 
    *   YouTube linki veya yerel video yÃ¼klenir.
    *   SÃ¼re seÃ§eneÄŸi (AynÄ±, Daha KÄ±sa, Daha Uzun) belirlenir.
    *   Orijinal transkript Ã§Ä±karÄ±lÄ±r, Gemini ile temizlenip hedef dile Ã§evrilir.
    *   Yerel video montaj aÅŸamasÄ±nda FFmpeg ile Ã¶zgÃ¼nlÃ¼k filtreleri uygulanÄ±r.
2.  **SÄ±fÄ±rdan Ãœretim Modu (Direct Prompt):**
    *   Referans video yoktur. Sadece prompt, yÃ¶netmen direktifleri ve karakter tasviri girilir.
    *   Yapay zeka transkript yerine girilen master prompt ve notlarÄ± bÃ¶lerek sahne promptlarÄ± oluÅŸturur.
    *   Docker container tarafÄ±nda gÃ¶rselden-videoya deÄŸil, doÄŸrudan metinden-videoya (T2V) modeli Ã§alÄ±ÅŸÄ±r.

### 2.2. SÃ¼re SeÃ§enekleri (Duration Mode)
*   **AynÄ± (Same):** Orijinal sahne sayÄ±sÄ± korunur (ortalama 3-5 sahne, her biri min 6sn).
*   **Daha KÄ±sa (Shorter):** Toplam sahne sayÄ±sÄ± %30 azaltÄ±lÄ±r (min 2 sahne).
*   **Daha Uzun (Longer):** Toplam sahne sayÄ±sÄ± %50 artÄ±rÄ±lÄ±r (son sahne varyasyonlarÄ± eklenerek uzatÄ±lÄ±r).
*   *Bu seÃ§enek hem FÄ±rsat Hunisi modalÄ±nda hem de ana stÃ¼dyo kontrol paneli formunda seÃ§ilebilir olacaktÄ±r.*

### 2.3. Kuyrukta Paralel HazÄ±rlÄ±k (RabbitMQ & Node.js CPU Optimization)
Docker GPU container Ã§alÄ±ÅŸma sÃ¼resini minimumda tutmak iÃ§in:
*   Kuyrukta (RabbitMQ) sÄ±radaki iÅŸler iÅŸlenirken; **GPU container gerektirmeyen hazÄ±rlÄ±k aÅŸamalarÄ± (Phase 1: video indirme, transkript Ã§ekme, Gemini Ã§eviri ve planlama)** Node.js tarafÄ±nda arka planda **paralel** olarak yÃ¼rÃ¼tÃ¼lÃ¼r.
*   GPU container yalnÄ±zca render aÅŸamasÄ±na geÃ§ildiÄŸinde kilitlenir.
*   BÃ¶ylece Docker container render yaparken, sÄ±radaki iÅŸin tÃ¼m metin, Ã§eviri ve gÃ¶rsel referans kare hazÄ±rlÄ±klarÄ± tamamlanmÄ±ÅŸ olur.

### 2.4. Docker Container'da Premium 6 Saniyelik Video Ãœretimi
*   Model, **CogVideoX-5b-I2V** (Image-to-Video) ve **CogVideoX-5b** (Text-to-Video) modellerine yÃ¼kseltilecektir.
*   Her sahne iÃ§in minimum **49 kare (6 saniye @ 8fps)** Ã¼retilecektir.
*   EÄŸer referans kare varsa CogVideoX-5b-I2V tetiklenir; yoksa CogVideoX-5b T2V tetiklenir.
*   Ãœretilen video ve ses dosyalarÄ± anÄ±nda Node.js sunucusuna indirilir.

### 2.5. FFmpeg ile GeliÅŸmiÅŸ Ã–zgÃ¼nlÃ¼k Filtreleri (`videoService.ts`)
YouTube piksel eÅŸleÅŸtirme algoritmalarÄ±nÄ± aÅŸmak iÃ§in montaj sÄ±rasÄ±nda ÅŸu filtreler uygulanÄ±r:
*   **Ufaltma & BulanÄ±k Arka Plan:** Video %90 Ã¶lÃ§eÄŸine ufaltÄ±lÄ±p, arkasÄ±na kendi gÃ¶rÃ¼ntÃ¼sÃ¼nÃ¼n %100 Ã¶lÃ§eklenmiÅŸ ve 40px bulanÄ±klaÅŸtÄ±rÄ±lmÄ±ÅŸ (`boxblur=40`) hali arka plan olarak bindirilir.
*   **Renk & Vinyet:** Hafif kontrast (`eq=contrast=1.05:saturation=1.1`) ve vinyet (`vignette=pi/8`) efektiyle piksel imzasÄ± deÄŸiÅŸtirilir.
*   **Sahne GeÃ§iÅŸleri:** Sahneler birleÅŸtirilirken aralarda 0.5 saniyelik Ã§apraz geÃ§iÅŸ (crossfade) uygulanÄ±r.

---

## 3. ArayÃ¼z ve KullanÄ±cÄ± Deneyimi DeÄŸiÅŸiklikleri

### 3.1. Ana Form GÃ¼ncellemesi (`src/views/dashboard.ts`)
*   Forma **"Ã–zgÃ¼nleÅŸtirme SÃ¼re Modu"** seÃ§eneÄŸi eklenir (AynÄ±, Daha KÄ±sa, Daha Uzun).
*   Referans video seÃ§ildiÄŸinde veya yÃ¼klendiÄŸinde bu sÃ¼re modu aktif olur.
*   FÄ±rsat hunisinden gelen sÃ¼re seÃ§imi bu alana otomatik doldurulur.

### 3.2. Durum Takip EkranÄ± (Progress & SSE)
KullanÄ±cÄ± stÃ¼dyo kuyruÄŸundaki iÅŸlerin her aÅŸamasÄ±nÄ± anlÄ±k gÃ¶rebilir:
*   `stageVideoDownloading`: "Orijinal video indiriliyor..."
*   `stageTranscriptExtracting`: "Transkript Ã§Ä±karÄ±lÄ±yor..."
*   `stageTranslationPlanning`: "Metin Ã§evriliyor ve sahneler planlanÄ±yor..."
*   `stageDockerStarting`: "Docker container baÅŸlatÄ±lÄ±yor..."
*   `stageSceneGenerating`: "Sahne {N} Ã¼retiliyor..."
*   `stageDockerProgress`: "Docker: {AÅŸama MesajÄ±} ({YÃ¼zde}%)"
*   `stageFinalMontage`: "Final montaj ve Ã¶zgÃ¼nlÃ¼k filtreleri uygulanÄ±yor..."

---

## 4. Teknik Mimari ve Dosya DeÄŸiÅŸiklikleri

### 4.1. `src/db.ts` (Åema)
Mevcut `video_jobs` tablosundaki `differentiation_duration_mode` alanÄ±nÄ± formdan gelen verilere gÃ¶re kaydedip iÅŸleyeceÄŸiz.

### 4.2. `src/lib/differentiate.ts` (Phase 1 ParalelleÅŸtirme)
*   `runPhase1Background` fonksiyonu, RabbitMQ kuyruÄŸuna girmeden Ã¶nce Ã§alÄ±ÅŸarak video indirme ve transkript Ã§evirisini tamamlar.
*   Durum gÃ¼ncellemelerini DB'ye yazar ve SSE ile arayÃ¼ze yayÄ±nlar.

### 4.3. `src/queue.ts` (Ä°ÅŸlem Ã‡arkÄ±)
*   EÄŸer iÅŸ bir **YouTube referans videosu** (`source_video_id`) iÃ§eriyorsa, Node.js sunucusu videoyu indirmek ve kare Ã§Ä±karmakla uÄŸraÅŸmaz. DoÄŸrudan `source_video_id` deÄŸerini Docker container'a istek gÃ¶vdesinde gÃ¶nderir.
*   EÄŸer iÅŸ **kullanÄ±cÄ± tarafÄ±ndan yerel olarak yÃ¼klenmiÅŸ bir video** (`material_path` uploads klasÃ¶rÃ¼ndeyse) iÃ§eriyorsa, Node.js sunucusu ilgili sahne zamanÄ±na ait kareyi `extractReferenceFrameAtTime` ile yerel olarak keser ve Docker container'a `reference_image_base64` parametresiyle gÃ¶nderir (fallback modu).

### 4.4. Docker Flask Sunucusu (`docker_image/server.py`)
*   **DoÄŸrudan Ä°ndirme Optimizasyonu:** Sunucu, gelen istekte `source_video_id` algÄ±ladÄ±ÄŸÄ±nda, `yt-dlp` kullanarak videoyu doÄŸrudan yÃ¼ksek hÄ±zlÄ± internet hattÄ± Ã¼zerinden `/data/source_videos/` dizinine indirir (yaklaÅŸÄ±k 1-2 saniye).
*   Ä°lgili sahnenin baÅŸlangÄ±Ã§ karesi, Docker container iÃ§inde OpenCV ile doÄŸrudan indirilen videonun `(scene_number - 1) * 6` saniyesinden kesilerek Ã§Ä±karÄ±lÄ±r.
*   GÃ¶rsel, **CogVideoX-5b-I2V** modeline girdi (`init_image`) olarak beslenir.
*   Yerel yÃ¼klenen videolar iÃ§in `reference_image_base64` Ã§Ã¶zÃ¼lerek girdi olarak kullanÄ±lmaya devam eder.


---

## 5. DoÄŸrulama ve Test PlanÄ±

### Otomatik Testler
*   `src/test_differentiation.spec.ts` oluÅŸturularak:
    *   Referans videodan kare Ã§Ä±karma fonksiyonu doÄŸrulanacak.
    *   Duration mode (AynÄ±, Daha KÄ±sa, Daha Uzun) filtreleri test edilecek.
    *   FarklÄ±laÅŸtÄ±rma (Filtreleme) parametreleri ve FFmpeg komut Ã§Ä±ktÄ±larÄ± denetlenecek.

### Manuel DoÄŸrulama
*   FÄ±rsat hunisinden bir video seÃ§ilerek "Daha KÄ±sa" seÃ§eneÄŸiyle Ã¶zgÃ¼nleÅŸtirme baÅŸlatÄ±lacak.
*   Arka plandaki transkript indirme, Ã§eviri ve onay adÄ±mlarÄ± izlenecek.
*   Video tamamlandÄ±ÄŸÄ±nda nihai MP4 dosyasÄ±nÄ±n ufaltÄ±lmÄ±ÅŸ-bulanÄ±klaÅŸtÄ±rÄ±lmÄ±ÅŸ formatÄ± ve sahneler arasÄ± 6sn tutarlÄ±lÄ±ÄŸÄ± incelenecek.
