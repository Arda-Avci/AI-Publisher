# Google Colab Docker Kurulum ve Ä°maj Ä°nÅŸa SÃ¼reci (`docker_image`)

Bu klasÃ¶r, Google Colab (T4 GPU) Ã¼zerinde lazy-loading (istek anÄ±nda yÃ¼kleme) ve aktif VRAM yÃ¶netimi ile Ã§alÄ±ÅŸan 11 farklÄ± yapay zeka/medya modelinin Docker konteyner yapÄ±landÄ±rmalarÄ±nÄ± ve toplu inÅŸa (build) scriptini barÄ±ndÄ±rÄ±r.

## `build_all.sh` Nedir ve Ne Yapar?

`build_all.sh`, tÃ¼m Docker imajlarÄ±nÄ± sÄ±fÄ±rdan inÅŸa etmek ve Google Drive Ã¼zerinde kalÄ±cÄ± olarak depolamak iÃ§in tasarlanmÄ±ÅŸ otonom bir otomasyon scriptidir. AdÄ±m adÄ±m ÅŸu iÅŸlemleri gerÃ§ekleÅŸtirir:

1. **Google Drive Dizin HazÄ±rlÄ±ÄŸÄ±:**
   Google Drive Ã¼zerinde imajlarÄ±n kalÄ±cÄ± olarak saklanacaÄŸÄ± `/content/drive/MyDrive/Colab Notebooks/docker/images` dizinini kontrol eder ve yoksa oluÅŸturur.

2. **Ortak Taban Ä°majÄ±n Ä°nÅŸasÄ± (`Dockerfile.base`):**
   `ai-publisher-base:latest` adÄ±nda ortak bir taban imaj inÅŸa eder. Bu imaj; CUDA 12.1 runtime, PyTorch, FFmpeg, Flask, Requests, NumPy ve Accelerate gibi tÃ¼m modellerin paylaÅŸtÄ±ÄŸÄ± ortak sistem ve Python kÃ¼tÃ¼phanelerini iÃ§erir.
   * *Neden Ã¶nemli?* Alt imajlarÄ±n boyutunu kÃ¼Ã§Ã¼ltÃ¼r ve katman paylaÅŸÄ±mÄ± (layer sharing) sayesinde disk alanÄ±ndan bÃ¼yÃ¼k oranda tasarruf saÄŸlar.

3. **Modellere Ã–zel Ä°majlarÄ±n Ä°nÅŸasÄ±:**
   AÅŸaÄŸÄ±daki 11 model iÃ§in kendi alt klasÃ¶rlerindeki `Dockerfile` yapÄ±landÄ±rmalarÄ±nÄ± sÄ±rayla Ã§alÄ±ÅŸtÄ±rarak imajlarÄ± hazÄ±rlar:
   * `cogvideox`, `wan`, `ltx`, `hunyuan` (Video modelleri)
   * `xtts`, `kokorotts` (Ses/TTS modelleri)
   * `audioldm2` (Ses efekti / SFX modeli)
   * `wav2lip`, `musetalk` (Dudak senkronizasyonu / Vision modelleri)
   * `whisper` (Transkripsiyon ve altyazÄ± motoru)
   * `stablediffusion` (DreamShaper / Flux gÃ¶rsel motoru ve `rembg` arka plan temizleyici)

4. **DoÄŸrudan Google Drive'a SÄ±kÄ±ÅŸtÄ±rÄ±lmÄ±ÅŸ KayÄ±t:**
   Google Colab VM disk sÄ±nÄ±rlarÄ±nÄ±n (genellikle ~78 GB kullanÄ±labilir alan) aÅŸÄ±lmasÄ±nÄ± Ã¶nlemek iÃ§in, inÅŸa edilen her imajÄ± diske kaydetmeden doÄŸrudan `docker save` ve `gzip` komutlarÄ±nÄ± birbirine baÄŸlayarak (pipe) Google Drive'a `.tar.gz` formatÄ±nda sÄ±kÄ±ÅŸtÄ±rarak yazar:
   ```bash
   docker save "ai-publisher-$MODEL:latest" | gzip > "$DRIVE_DIR/$MODEL.tar.gz"
   ```

---

## Model Port ve Ä°ÅŸlev HaritasÄ±

Ä°nÅŸa edilen konteynerlerin dinlediÄŸi portlar ve Ã¼stlendikleri gÃ¶revler ÅŸu ÅŸekildedir:

| Konteyner AdÄ± | Port | Ä°Ã§erik / Model SÃ¼rÃ¼mÃ¼ | GÃ¶revi |
| :--- | :--- | :--- | :--- |
| `cogvideox` | 5001 | CogVideoX-2b / 5b-I2V | Video Ã¼retimi |
| `xtts` | 5002 | XTTS-v2 & Edge-TTS | Ses sentezleme ve Klonlama |
| `audioldm2` | 5003 | AudioLDM2 | Ses Efekti (SFX) Ã¼retimi |
| `wav2lip` | 5004 | Wav2Lip | Dudak senkronizasyonu |
| `musetalk` | 5005 | MuseTalk | Talking-head dudak senkronizasyonu |
| `whisper` | 5006 | faster-whisper | Transkripsiyon ve SRT AltyazÄ± Ã¼retimi |
| `stablediffusion`| 5007 | DreamShaper 8 / Flux.1 Schnell | GÃ¶rsel / Kapak sentezi & `rembg` |
| `wan` | 5008 | Wan 2.1 (T2V & I2V) | Dinamik/Aksiyon video Ã¼retimi |
| `ltx` | 5009 | LTX-Video | HÄ±zlÄ± video Ã¼retimi |
| `hunyuan` | 5010 | HunyuanVideo | Sinematik video Ã¼retimi |
| `kokorotts` | 5011 | Kokoro-82M | YÃ¼ksek kaliteli hÄ±zlÄ± TTS sentezi |

---

## Ã‡alÄ±ÅŸtÄ±rma ve KullanÄ±m

Google Colab Ã¼zerinde bu Docker imajlarÄ±nÄ± sÄ±fÄ±rdan inÅŸa etmek isterseniz:

1. Google Drive'Ä± baÄŸlayÄ±n.
2. `docker_image` dizinine gidin.
3. BetiÄŸe Ã§alÄ±ÅŸtÄ±rma izni vererek baÅŸlatÄ±n:
   ```bash
   chmod +x build_all.sh
   ./build_all.sh
   ```
4. Ä°nÅŸa iÅŸlemi tamamlandÄ±ktan sonra, sonraki Colab oturum aÃ§Ä±lÄ±ÅŸlarÄ±nda `colab_setup.py` bu `.tar.gz` dosyalarÄ±nÄ± otomatik olarak algÄ±layÄ±p saniyeler iÃ§inde geri yÃ¼kleyecektir (`docker load`).
