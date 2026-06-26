# AGENT_MEMORY.md - Yapay Zeka Bellek Dosyası

> [!IMPORTANT]
> **KATI KURAL:** Model, kullanıcı onayı olmadan mevcut hiçbir kaynak kod dosyasını üzerine yazamaz, değiştiremez veya silemez. Değişiklikler önce plan olarak sunulmalı ve onay alınmalıdır.

## 1. Genel Proje ve Mimari Durumu
- **Proje Adı:** AI_Publisher (Otonom Çoklu Sosyal Medya Destekli AI Video Üretim ve Pazarlama Platformu)
- **Ana Teknolojiler:** Node.js, TypeScript, Express, SQLite (Geliştirme), PostgreSQL (Production), Redis, RabbitMQ, Backblaze B2, Playwright.
- **Video Model Entegrasyonu:** LTX-Video ve Wan modelleri RunPod Serverless üzerinde çalıştırılmaktadır.

## 2. RunPod LTX-Video Durumu (Endpoint: `w572siswids6pk`)
- **Base Image:** PyTorch 2.2.1 tabanlı base image kullanılmaktadır.
- **Uygulanan Çalışma Zamanı Yamaları (Runtime Patching):**
  - **RMSNorm Yaması:** PyTorch 2.2.1 üzerinde bulunmayan `torch.nn.RMSNorm` sınıfı Python düzeyinde dinamik olarak monkey-patch edilmiştir.
  - **GQA (enable_gqa) Yaması:** PyTorch 2.5 öncesi `scaled_dot_product_attention()` içinde bulunmayan `enable_gqa` parametresi pop edilerek key/value kafaları manuel çoğaltılmıştır (`repeat_interleave`).
  - **Static FFmpeg Yaması:** Conda FFmpeg paketinde GPL (libx264) lisansı bulunmadığı için, `ffbinaries` projesinden static FFmpeg derlemesi indirilip `/tmp/ffmpeg` yoluna çıkarılmış ve `PATH` çevre değişkenine eklenmiştir.
  - **Çıktı Yolu Düzeltmesi:** `/content/` dizini `/workspace/outputs/` dizinine sembolik bağ ile yönlendirilmiştir (`ln -sf /workspace/outputs /content`).

## 3. GHCR Üzerinden Docker Derleme (Yeni Fikir)
- Local GPU/Docker kısıtlamaları ve Colab kesintileri nedeniyle, Docker imajları doğrudan GitHub Container Registry (GHCR) üzerinde GitHub Actions CI/CD hatları ile derlenecektir.
- **Sonuç:** 24 modelin tamamı ve Base imaj başarıyla derlenerek GHCR (`ghcr.io/anomalyco/` veya `ghcr.io/arda-avci/`) altına pushlandı. `wav2lip` modelindeki indirme hatası comment-out edilerek bypass edildi.

## 4. Aktif Durum ve Sonraki Adımlar
- **Endpoint Durumu:** Kullanıcı tarafından yeni oluşturulan `rojgtzuf3nztup` serverless endpoint'i üzerinden test başarıyla yapıldı.
- **Test Sonucu:** `node scripts/test_wan_serverless.js rojgtzuf3nztup` komutuyla iş başarıyla tetiklendi, sırasıyla `IN_QUEUE` ve `IN_PROGRESS` aşamalarını geçip `COMPLETED` oldu ve `/content/raw_video.mp4` başarıyla üretildi.
- **Hedef:** Diğer şablon modellerin de entegrasyonu ve e2e süreçlerinin doğrulanması.
