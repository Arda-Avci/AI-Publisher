# Bilinen Sorunlar, Sınırlamalar ve Ertelenmiş İşler

> Bu dosya projenin tüm bilinen sorunlarını, dış bağımlılıklarını, güvenlik uyarılarını ve gelecek sprint'leri tek yerde toplar. Sprint'ler tamamlandıkça burası güncellenir.

**Son güncelleme:** v7.0 Colab-Heavy Kurgu & Kaniko Derleme Sonrası (19 Haziran 2026)

---

## 🟢 Çözülen Önemli Sorunlar (v6.0 & v7.0)

### 1. Google Colab Cgroup ve Docker Engelleri (Kökten Çözüldü)
*   **Sorun:** Colab ortamında cgroup read-only kısıtlamaları sebebiyle Docker Daemon (`dockerd`) başlatılamıyor veya konteyner derlenemiyordu.
*   **Çözüm:** Daemonless çalışan **Kaniko** mimarisine geçildi. Modeller arası bağımlılığı korumak amacıyla Colab üzerinde Go-tabanlı hafif bir yerel Registry (`localhost:5000`) ayağa kaldırıldı. Derleme adımları ve notebook dosyaları bu otonom yapıya göre güncellendi.
*   **Statoverride Yaması:** PyTorch base imajında bulunan ve APT paket yüklemelerini kilitleyen `messagebus` statoverride hatası `Dockerfile.base` içerisine eklenen yama ile giderildi.

### 2. Ağır FFmpeg İşlemlerinin Sunucuyu Kilitlemesi (Colab-Heavy Kurgu ile Çözüldü)
*   **Sorun:** Yerel sunucuda (Node.js) video altyazısı yakma, renk derecelendirme (color grading), farklılaştırma filtreleri ve logo yerleştirme işlemleri CPU/RAM'i tamamen tüketerek sunucunun kilitlenmesine yol açıyordu.
*   **Çözüm:** Tüm ağır kurgu ve FFmpeg render işleri tamamen **Google Colab** tarafına taşındı. Node.js backend'i artık sadece üretilen sahne parçalarını hızlı `-c copy` demuxer concat komutuyla birleştiriyor. Bu işlem 1 saniyenin altında tamamlanmaktadır.

### 3. server.ts Monolitik Yapısı ve Kod Okunabilirliği (Parçalandı)
*   **Sorun:** `server.ts` dosyası 5000+ satıra ulaşmıştı; HTML, CSS, JS ve tüm API rotaları tek bir dosya içindeydi.
*   **Çözüm:** Sunucu kodları modüler hale getirildi. HTML ve istemci tarafı kodları `src/views/` altına (stiller ve scriptler ayrıştırılarak), API rotaları ise `src/routes/` (`jobs.ts`, `differentiation.ts`, `authSetup.ts` vb.) altına taşındı.

### 4. isProcessing Kilit Çakışmaları (SQL Atomic Lock ile Çözüldü)
*   **Sorun:** Bellek tabanlı `isProcessing` flag'i multi-process (PM2/Cluster) ortamlarda yarış durumuna (race condition) sebep olabiliyordu.
*   **Çözüm:** Veritabanı seviyesinde atomic kilit mekanizması (`UPDATE video_jobs SET status='processing' WHERE id=? AND status='pending'`) entegre edilerek veri bütünlüğü garanti altına alındı.

### 5. Test Kapsamı ve Hataları (Yeşillendirildi)
*   **Sorun:** Projede entegrasyon ve birim testleri eksikti ve mevcut testler sonsuz döngüye giriyordu.
*   **Çözüm:** `vitest` altyapısı kuruldu. FFmpeg komutlarına `shortest=1` / `-shortest` eklenerek sonsuz döngüler çözüldü. Ses kanalı bulunmayan video girdileri için sessiz kanal fallback'leri entegre edildi. Toplam 286 adet test sıfır hata ile yeşillendirildi.

---

## 🟡 Güncel Sınırlamalar ve Takip Edilmesi Gereken Konular (Kısa Vade)

### 1. Google Colab Tünel Kesintileri (Ngrok & Localtunnel)
*   **Durum:** Colab ile Node.js arasındaki iletişim Ngrok ve Localtunnel aracılığıyla kurulmaktadır. Tünel servislerinin ücretsiz paketlerindeki bant genişliği limitleri ve bağlantı kopmaları süreçlerin duraksamasına yol açabilir.
*   **Yapılacak:** Tünel kopmalarında frontend tarafına entegre edilen auto-reconnect mantığı izlenmeli; uzun vadede sabit IP'li VPS veya RunPod Serverless mimarisine geçilmelidir.

### 2. Google Drive Kota ve Zaman Aşımı Riskleri
*   **Durum:** 11 Docker imajının `.tar.gz` yedekleri ve Hugging Face/Torch model önbellekleri (`HF_HOME` / `TORCH_HOME`) Google Drive üzerinde saklanmaktadır. Drive senkronizasyonunun gecikmesi veya kota aşımı durumlarında imaj yükleme/indirme işlemleri başarısız olabilir.
*   **Yapılacak:** Arşiv bütünlük kontrolleri (`verify_images.py --drive-only`) düzenli olarak çalıştırılmalı ve yedeklerin eksiksiz olduğundan emin olunmalıdır.

### 3. Playwright Sosyal Medya Çerezlerinin (Cookies) Eskimesi
*   **Durum:** YouTube, TikTok, X (Twitter) ve Meta Reels otomasyonu için kullanılan çerez dosyaları (`auth_youtube.json` vb.) platformların güvenlik güncellemeleri veya oturum sürelerinin dolması nedeniyle geçersiz hale gelebilir.
*   **Yapılacak:** Paylaşım başarısız olduğunda veya "Login required" hatası alındığında, admin paneli üzerinden çerezler yeniden oluşturulmalıdır.

### 4. SSE (Server-Sent Events) Yetkilendirme Eksikliği
*   **Durum:** `/progress/:id` rotası şu an için sıkı bir kimlik doğrulama (`requireAuth`) middleware'ine sahip değildir. Job ID'sini tahmin eden üçüncü şahıslar ilerleme durumunu dinleyebilir.
*   **Yapılacak:** Bu endpoint'e kullanıcı sahipliği doğrulaması eklenmelidir.

---

## 📋 Gelecek Sprint'ler (Yol Haritası)

1.  **RunPod Serverless Geçişi:** Google Colab'ın ücretsiz tier kısıtlamalarından ve tünel kararsızlıklarından tamamen kurtulmak için tüm Docker imajlarının RunPod Serverless üzerinde deploy edilmesi.
2.  **Gelişmiş Video Düzenleyici (React/Remotion):** Frontend tarafında sürükle-bırak destekli, çok kanallı ve tarayıcıda render yeteneğine sahip Remotion tabanlı profesyonel video editörü entegrasyonu.
3.  **SSE API Güvenliği:** Canlı ilerleme yayını yapan tüm SSE uç noktalarına JWT/Session tabanlı sıkı kimlik doğrulama katmanının eklenmesi.
4.  **Otomatik Çerez Yenileyici:** Playwright ile çerezlerin eskidiğini algılayıp admin paneline uyarı gönderen veya sessizce yenilemeye çalışan otonom arka plan servisi.
