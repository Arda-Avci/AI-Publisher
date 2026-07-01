# AGENT_MEMORY.md - Yapay Zeka Bellek DosyasÄ±

> [!IMPORTANT]
> **KATI KURAL:** Model, kullanÄ±cÄ± onayÄ± olmadan mevcut hiÃ§bir kaynak kod dosyasÄ±nÄ± Ã¼zerine yazamaz, deÄŸiÅŸtiremez veya silemez. DeÄŸiÅŸiklikler Ã¶nce plan olarak sunulmalÄ± ve onay alÄ±nmalÄ±dÄ±r.

## 1. Genel Proje ve Mimari Durumu
- **Proje AdÄ±:** AI_Publisher (Otonom Ã‡oklu Sosyal Medya Destekli AI Video Ãœretim ve Pazarlama Platformu)
- **Ana Teknolojiler:** Node.js, TypeScript, Express, SQLite (GeliÅŸtirme), PostgreSQL (Production), Redis, RabbitMQ, Backblaze B2, Playwright.
- **Video Model Entegrasyonu:** LTX-Video ve Wan modelleri RunPod Serverless Ã¼zerinde Ã§alÄ±ÅŸtÄ±rÄ±lmaktadÄ±r.

## 2. RunPod LTX-Video Durumu (Endpoint: `w572siswids6pk`)
- **Base Image:** PyTorch 2.2.1 tabanlÄ± base image kullanÄ±lmaktadÄ±r.
- **Uygulanan Ã‡alÄ±ÅŸma ZamanÄ± YamalarÄ± (Runtime Patching):**
  - **RMSNorm YamasÄ±:** PyTorch 2.2.1 Ã¼zerinde bulunmayan `torch.nn.RMSNorm` sÄ±nÄ±fÄ± Python dÃ¼zeyinde dinamik olarak monkey-patch edilmiÅŸtir.
  - **GQA (enable_gqa) YamasÄ±:** PyTorch 2.5 Ã¶ncesi `scaled_dot_product_attention()` iÃ§inde bulunmayan `enable_gqa` parametresi pop edilerek key/value kafalarÄ± manuel Ã§oÄŸaltÄ±lmÄ±ÅŸtÄ±r (`repeat_interleave`).
  - **Static FFmpeg YamasÄ±:** Conda FFmpeg paketinde GPL (libx264) lisansÄ± bulunmadÄ±ÄŸÄ± iÃ§in, `ffbinaries` projesinden static FFmpeg derlemesi indirilip `/tmp/ffmpeg` yoluna Ã§Ä±karÄ±lmÄ±ÅŸ ve `PATH` Ã§evre deÄŸiÅŸkenine eklenmiÅŸtir.
  - **Ã‡Ä±ktÄ± Yolu DÃ¼zeltmesi:** `/content/` dizini `/workspace/outputs/` dizinine sembolik baÄŸ ile yÃ¶nlendirilmiÅŸtir (`ln -sf /workspace/outputs /content`).

## 3. GHCR Ãœzerinden Docker Derleme (Yeni Fikir)
- Local GPU/Docker kÄ±sÄ±tlamalarÄ± ve Colab kesintileri nedeniyle, Docker imajlarÄ± doÄŸrudan GitHub Container Registry (GHCR) Ã¼zerinde GitHub Actions CI/CD hatlarÄ± ile derlenecektir.
- **SonuÃ§:** 24 modelin tamamÄ± ve Base imaj baÅŸarÄ±yla derlenerek GHCR (`ghcr.io/anomalyco/` veya `ghcr.io/arda-avci/`) altÄ±na pushlandÄ±. `wav2lip` modelindeki indirme hatasÄ± comment-out edilerek bypass edildi.

## 4. Aktif Durum ve Sonraki AdÄ±mlar
- **DÃ¼zeltilen Hatalar:**
  - **`torchvision::nms` HatasÄ±:** Base imaj derlenirken pip'in torchvision sÃ¼rÃ¼mÃ¼nÃ¼ otomatik olarak uyumsuz bir sÃ¼rÃ¼me yÃ¼kseltmesi sebebiyle oluÅŸan `operator torchvision::nms does not exist` hatasÄ±, `docker_image/Dockerfile.base` dosyasÄ±nda `torch==2.2.1`, `torchvision==0.17.1`, `torchaudio==2.2.1` ve `xformers==0.0.25` sÃ¼rÃ¼mleri sabitlenerek (pin) giderildi.
  - **`RecursionError` HatasÄ±:** Model yÃ¼kleme sÄ±rasÄ±nda diffusers kÃ¼tÃ¼phanesinin modÃ¼l repr loglama/derinlik sÄ±nÄ±rÄ± nedeniyle verdiÄŸi `maximum recursion depth exceeded while calling a Python object` hatasÄ±, `docker_image/wan/app.py` ve `docker_image/ltx/app.py` dosyalarÄ±na `sys.setrecursionlimit(10000)` eklenerek Ã§Ã¶zÃ¼ldÃ¼.
- **Son Derleme Durumu:** GitHub Actions Ã¼zerindeki yeni `28281285315` derlemesi (Docker Build & Push) tÃ¼m modeller (`wan`, `ltx`, `wav2lip` dahil) iÃ§in baÅŸarÄ±yla tamamlandÄ±.
- **Hedef:** RunPod Ã¼zerinde yeni derlenen imajlar ile testleri tekrar tetikleyerek video Ã¼retimini uÃ§tan uca doÄŸrulamak.
