# Sprint 18+ Yol Haritası — React Migration (S4.C) Sonrası Başlanacak İşler

Bu dokümanda, Sprint 4.C (React Migration) tamamlandıktan sonra başlanacak 7 ana iş parçası (job) listelenmiştir. Her job kendi içinde bağımsız olup paralel yürütülebilir.

---

## Job-1: Otonom Clipping Motoru Geliştirme (Faz C - v2)

**Hedef:** Mevcut clipper altyapısını geliştirerek uzun yatay videoları analiz edip otonom dikey Shorts formatında kırpan motor.

### Alt Görevler
- [ ] Whisper transkript + LLM (Gemini 2.5 Flash) ile viral segment tespiti
- [ ] FFmpeg smart crop: konuşmacı yüz takibi ile dinamik 9:16 kırpma
- [ ] Kırpılan bölümlere otomatik altyazı gömme + BGM miksajı
- [ ] `/api/v1/clipper/extract` ve `/list` rotalarının RabbitMQ kuyruk entegrasyonu

---

## Job-2: A/B Split Screen & Maskot Overlay (Faz C - v2)

**Hedef:** İzleyici retention'ını artırmak için bölünmüş ekran ve maskot/avatar bindirme.

### Alt Görevler
- [ ] FFmpeg `vstack` ile üstte AI video + altta Minecraft/ASMR layout
- [ ] Şeffaf PNG maskot/avatar bindirme şablonu
- [ ] Kullanıcı tarafından seçilebilir split-screen oranları (70/30, 50/50, 60/40)
- [ ] Dashboard'tan split-screen preview ve konfigürasyon

---

## Job-3: Akıllı Kurgu & Dublaj (Faz D - v2)

**Hedef:** Ritim tabanlı otomatik kesim, transkript kurgusu ve çok dilli dublaj.

### Alt Görevler
- [ ] FFmpeg + ses analizi ile BPM/peak noktalarına göre beat-synced cuts
- [ ] Transkript metninden kelime silme → otomatik FFmpeg kırpma
- [ ] Whisper transkript → XTTS-v2 ses klonlama → rubberband time-stretch ile dublaj
- [ ] Çoklu dil desteği (TR/EN/DE/FR/AR)

---

## Job-4: Kurgu & Renk Ajanı (Faz E - v2)

**Hedef:** Sessizlik kesici, hareket algılama ve doğal dil renk derecelendirme.

### Alt Görevler
- [ ] Konuşma boşluklarını ve hareketsiz kareleri tespit eden FFmpeg filtresi
- [ ] Kullanıcıdan "sıcak sinematik tonlar", "neon mor" gibi doğal dil komutları
- [ ] `colorbalance`, `eq`, LUT `.cube` dosyalarının dinamik uygulanması
- [ ] AI asistan panelinden renk ön izleme

---

## Job-5: Dinamik Altyazı & Hızlı Transkript (Faz F - v2)

**Hedef:** Hormozi tarzı modern dinamik altyazılar, faster-whisper ile hızlı deşifre.

### Alt Görevler
- [ ] Kelime zaman damgalı bounce/pulse/shake animasyonlu altyazı bileşeni
- [ ] faster-whisper C++ motoru (Colab) ile 4x hızlı deşifre
- [ ] openai-whisper fallback zinciri
- [ ] ASS altyazı formatında `original_size` Windows FFmpeg bug fix

---

## Job-6: Premium AI Kurgu & Ses İyileştirme (Faz G - v2)

**Hedef:** AI göz teması, stüdyo kalitesinde ses, akıllı reframe, nesne silme.

### Alt Görevler
- [ ] Gaze-correction modeli ile konuşmacı göz teması düzeltme
- [ ] Arka plan gürültü silme, yankı temizleme (Studio Sound)
- [ ] OpenCV yüz takibi ile 16:9 → 9:16 dinamik crop (smart reframe)
- [ ] Hafif inpainting modeli ile nesne/maske silme

---

## Job-7: Viral Optimizasyon & B-Roll Sentezi (Faz H - v2)

**Hedef:** Otonom B-Roll sentezi, viral hook analizi, duygu odaklı altyazı.

### Alt Görevler
- [ ] CogVideoX ile anahtar kelime tabanlı 3-4 sn B-Roll sentezi
- [ ] İlk 3 saniye hook kalitesini değerlendiren LLM analizi
- [ ] Ses frekansı + tonlama analizi ile vurgulu kelimeleri renklendirme
- [ ] Viral hashtag ve başlık öneri motoru

---

## Öncelik Sırası (Önerilen)

1. **Job-1** (Otonom Clipper) — En yüksek kullanıcı talebi
2. **Job-5** (Dinamik Altyazı) — Hızlı kazanım, düşük efor
3. **Job-4** (Renk Ajanı) — Mevcut altyapıya kolay entegrasyon
4. **Job-3** (Dublaj) — Orta efor, yüksek etki
5. **Job-6** (AI Kurgu) — Bağımlılık var
6. **Job-7** (Viral) — Analitik altyapı gerektirir
7. **Job-2** (Split Screen) — En düşük öncelik

---

*Not: Bu işlerin v1 MVP'leri halihazırda tamamlanmıştır. v2 geliştirmeleri mevcut implementasyonların üzerine inşa edilecektir.*
