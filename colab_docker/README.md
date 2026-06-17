# Google Colab Docker Kurulum ve İmaj İnşa Süreci (`colab_docker`)

Bu klasör, Google Colab (T4 GPU) üzerinde lazy-loading (istek anında yükleme) ve aktif VRAM yönetimi ile çalışan 11 farklı yapay zeka/medya modelinin Docker konteyner yapılandırmalarını ve toplu inşa (build) scriptini barındırır.

## `build_all.sh` Nedir ve Ne Yapar?

`build_all.sh`, tüm Docker imajlarını sıfırdan inşa etmek ve Google Drive üzerinde kalıcı olarak depolamak için tasarlanmış otonom bir otomasyon scriptidir. Adım adım şu işlemleri gerçekleştirir:

1. **Google Drive Dizin Hazırlığı:**
   Google Drive üzerinde imajların kalıcı olarak saklanacağı `/content/drive/MyDrive/Colab Notebooks/docker/images` dizinini kontrol eder ve yoksa oluşturur.

2. **Ortak Taban İmajın İnşası (`Dockerfile.base`):**
   `ai-publisher-base:latest` adında ortak bir taban imaj inşa eder. Bu imaj; CUDA 12.1 runtime, PyTorch, FFmpeg, Flask, Requests, NumPy ve Accelerate gibi tüm modellerin paylaştığı ortak sistem ve Python kütüphanelerini içerir.
   * *Neden önemli?* Alt imajların boyutunu küçültür ve katman paylaşımı (layer sharing) sayesinde disk alanından büyük oranda tasarruf sağlar.

3. **Modellere Özel İmajların İnşası:**
   Aşağıdaki 11 model için kendi alt klasörlerindeki `Dockerfile` yapılandırmalarını sırayla çalıştırarak imajları hazırlar:
   * `cogvideox`, `wan`, `ltx`, `hunyuan` (Video modelleri)
   * `xtts`, `kokorotts` (Ses/TTS modelleri)
   * `audioldm2` (Ses efekti / SFX modeli)
   * `wav2lip`, `musetalk` (Dudak senkronizasyonu / Vision modelleri)
   * `whisper` (Transkripsiyon ve altyazı motoru)
   * `stablediffusion` (DreamShaper / Flux görsel motoru ve `rembg` arka plan temizleyici)

4. **Doğrudan Google Drive'a Sıkıştırılmış Kayıt:**
   Google Colab VM disk sınırlarının (genellikle ~78 GB kullanılabilir alan) aşılmasını önlemek için, inşa edilen her imajı diske kaydetmeden doğrudan `docker save` ve `gzip` komutlarını birbirine bağlayarak (pipe) Google Drive'a `.tar.gz` formatında sıkıştırarak yazar:
   ```bash
   docker save "ai-publisher-$MODEL:latest" | gzip > "$DRIVE_DIR/$MODEL.tar.gz"
   ```

---

## Model Port ve İşlev Haritası

İnşa edilen konteynerlerin dinlediği portlar ve üstlendikleri görevler şu şekildedir:

| Konteyner Adı | Port | İçerik / Model Sürümü | Görevi |
| :--- | :--- | :--- | :--- |
| `cogvideox` | 5001 | CogVideoX-2b / 5b-I2V | Video üretimi |
| `xtts` | 5002 | XTTS-v2 & Edge-TTS | Ses sentezleme ve Klonlama |
| `audioldm2` | 5003 | AudioLDM2 | Ses Efekti (SFX) üretimi |
| `wav2lip` | 5004 | Wav2Lip | Dudak senkronizasyonu |
| `musetalk` | 5005 | MuseTalk | Talking-head dudak senkronizasyonu |
| `whisper` | 5006 | faster-whisper | Transkripsiyon ve SRT Altyazı üretimi |
| `stablediffusion`| 5007 | DreamShaper 8 / Flux.1 Schnell | Görsel / Kapak sentezi & `rembg` |
| `wan` | 5008 | Wan 2.1 (T2V & I2V) | Dinamik/Aksiyon video üretimi |
| `ltx` | 5009 | LTX-Video | Hızlı video üretimi |
| `hunyuan` | 5010 | HunyuanVideo | Sinematik video üretimi |
| `kokorotts` | 5011 | Kokoro-82M | Yüksek kaliteli hızlı TTS sentezi |

---

## Çalıştırma ve Kullanım

Google Colab üzerinde bu Docker imajlarını sıfırdan inşa etmek isterseniz:

1. Google Drive'ı bağlayın.
2. `colab_docker` dizinine gidin.
3. Betiğe çalıştırma izni vererek başlatın:
   ```bash
   chmod +x build_all.sh
   ./build_all.sh
   ```
4. İnşa işlemi tamamlandıktan sonra, sonraki Colab oturum açılışlarında `colab_setup.py` bu `.tar.gz` dosyalarını otomatik olarak algılayıp saniyeler içinde geri yükleyecektir (`docker load`).
