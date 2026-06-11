# AI-Publisher: "Top Yuvarlak AI" & Otonom Sosyal Medya Video Üretim SaaS Platformu
## 🧠 Beyin Fırtınası ve Nihai Hedefler Belgesi (Brainstorming & Final Goals)

Bu belge, projenin başından itibaren verilen tüm promptları, mimari kararları, SaaS kredilendirme vizyonunu ve gelecekteki **"Top Yuvarlak AI" (Sportoto Entegrasyonu)** multimodal talk-show projesini bir araya getirerek projenin nihai hedeflerini çizmektedir.

---

## 🎯 1. Projenin Vizyonu ve Temel Felsefesi
AI-Publisher, sıradan bir video düzenleyici veya basit bir API sarmalayıcı değildir. Proje; **insansız (otonom), viralitesi yüksek, SEO uyumlu ve platformlar arası otomatik dağıtım yapabilen** bir yapay zeka video render çiftliği ve pazarlama otomasyonudur.

### Sıfır Hardcoded / Dinamik Yapı
Platformda hiçbir dilde, metinde veya API anahtarında sabitlenmiş (hardcoded) veri bulunmaz. Çoklu dil altyapısı (`tr.json`, `en.json`) dinamik yüklenir, temalar ve renk paletleri (`hsl` tabanlı modern CSS) tamamen veri odaklı yönetilir.

---

## 🏗️ 2. Teknoloji Stack ve Model Hiyerarşisi
Uygulama, ağır GPU modellerinin çalıştırıldığı bir **Google Colab (T4/L4 GPU)** katmanı ile kuyruk yönetimini, iş akışını ve bot otomasyonunu yöneten **Node.js (TypeScript)** komut merkezinden oluşur.

### Video Üretim Motoru Seçimleri
Kullanıcının seçtiği şablon tipine göre sistem otonom olarak en iyi VRAM/kalite dengesini sunan modeli seçer:
- 🎬 **Sinematik Şablonlar (Cinematic):** HunyuanVideo (En yüksek görsel kalite ve detay).
- ⚡ **Dinamik Şablonlar (Dynamic) & Pixar Animasyonları:** Wan 2.1 (Aksiyon, pürüzsüz geçişler ve 3D Pixar çizgi film estetiği).
- 📝 **Basit/Hızlı Şablonlar (Simple):** LTX-Video 2 (Hızlı prototipleme ve düşük kaynak tüketimi).

---

## 💰 3. SaaS ve Kredilendirme Sistemi Mimarisi
Platformun SaaS olarak ticarileştirilmesi amacıyla kurulan kredi altyapısı, sistem kaynaklarının adil kullanımını ve monetizasyonunu sağlar:
- **Sahne Başına Üretim:** 10 Kredi.
- **Kapak Sentezi (SD 1.5 + RealESRGAN + GFPGAN):** 5 Kredi.
- **Video Özgünleştirme / Farklılaştırma:** 15 Kredi.
- **Hata Güvencesi (Refund):** Herhangi bir kuyruk hatasında, tünel kopmasında veya kullanıcı iptalinde harcanan krediler kuruşu kuruşuna kullanıcı hesabına otonom olarak iade edilir.

---

## 🔗 4. Otonom Callback (Webhook) ve Sıfır Kilitlenme Mimarisi
Colab sunucusunun kilitlenmesini ve Node.js backend'inin asılı kalmasını önlemek için geliştirilen kararlılık önlemleri:
- **Çift Yönlü Dosya İletimi:** Colab üretimi tamamlandığı anda Node.js callback webhook rotasına (`/api/v1/video/callback`) dosyaları (video, ses, altyazı, sfx) anında **push** eder.
- **Erken Polling Çıkışı (Early Exit):** Node.js polling yaparken, eğer callback dosyalarının diskte yerel olarak tamamlandığını algılarsa Colab durum sorgusunun bitmesini beklemeden döngüyü kırar ve anında montaj aşamasına geçer.
- **Dinamik Watchdog:** Sabit süreler yerine `Geçen Süre + Colab ETA + 3 Dakika` formülüyle çalışan otonom zaman aşımı denetçisi devrededir.
- **Anında Disk Temizliği:** Yüklenen materyal (`material_path`) ile Sahne 1 üretimi tamamlandığı an, diskte yer kaplamaması ve kilitlenme yaratmaması için asenkron olarak diskten anında silinir.

---

## 🔮 5. Zirve Hedef: "Top Yuvarlak AI" Multimodal Talk-Show
Projenin kimsede olmayan, spor toto entegrasyonu ile çalışacak ve dikey video platformlarında (Shorts, TikTok, Reels) viral olacak nihai hedefidir.

### Grup Sohbetinden Video (Grup Tartışması)
Odysseus projesindeki personaların grup sohbeti gibi, birden fazla yapay zeka ajanı bir futbol tartışma masasında buluşur. Sistem, her ajanın ürettiği metin için ayrı video/ses üretip bunları kronolojik olarak birleştirir.

### Multimodal Ajan Kadrosu (The Panelists)
1. 🎙️ **Moderatör / Sunucu (Meta-Orchestrator):** Tartışmayı yönetir, söz hakkı dağıtır, tansiyonu ayarlar.
2. 📊 **Taktik Deha / Analist (Gemini 2.5 Pro):** xG beklentileri, ısı haritaları, taktik tahtası ve rasyonel verilerle konuşur.
3. ⚽ **Eski Futbolcu (Claude 3.5 Sonnet):** "Sahanın çimini yutmuş" abi karakteri. Derbi stresi, tribün baskısı, soyunma odası hikayeleriyle konuşur.
4. 🎲 **Kumarbaz (DeepSeek-R1):** Kelly Kriteri ve oran hareketleriyle anomalileri bulur, gizli "value" oranları fısıldar.
5. 🤖 **Siber DataScout (İstihbarat Ajanı):** Sosyal medya trendleri, sakatlık matrisleri, uydu hava durumu verilerini analiz eden soğukkanlı veri androidi.

### Pixar 3D Animasyon Estetiği
Karakterlerin Wav2Lip ve ses senkronizasyonlarının kusursuz görünmesi, mimiklerin ve büyük gözlerin dikey videolarda daha samimi durması için **3D Pixar Animasyon Şablonu** tercih edilmiştir. Bu şablon, spor tartışmalarına eğlenceli ve yüksek bağlılık (retention) sağlayan bir çizgi film havası katar.

---

## 📈 6. Viralite ve SEO Stratejisi (Arda Avcı 2026 Standartları)
- **Alex Hormozi Stili Kinetik Altyazılar:** Sarı-beyaz renkli, kelime bazlı büyüyen kinetik altyazılar (ASS formatında FFmpeg drawtext ile gömülür).
- **Spatial Audio & Smart Ducking:** Konuşma başladığında arka plan ses efektlerinin (SFX) sesi otomatik kısılır (Sidechain compression). SFX sesleri sahne akışına göre sağ/sol hoparlörler arasında pürüzsüzce kayar (Spatial panning).
- **Yapay Zeka Viralite Skoru:** Kapak resmi ve ilk saniyelerdeki kanca (hook) karesi Gemini Vision tarafından analiz edilerek viral olma olasılığı (%0-100) hesaplanır ve iyileştirme önerileri sunulur.
