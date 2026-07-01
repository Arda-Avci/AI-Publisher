---
name: docker-build-video-models
description: Instructions and guidelines on how to build, update, patch, and test Docker images for Serverless RunPod endpoints in the AI-Publisher project, including transformers v5+ PyTorch compatibility patches, B2 region matching, and worker cycling.
---

# Docker Ä°maj Derleme, GÃ¼ncelleme ve Test YÃ¶nergeleri (Video Modelleri)

Bu skill, AI-Publisher projesinde RunPod Serverless Ã¼zerinde Ã§alÄ±ÅŸan LTX-Video ve Wan-2.1 gibi video Ã¼retim modellerine ait Docker imajlarÄ±nÄ±n derlenmesi, yamalanmasÄ±, yayÄ±nlanmasÄ± ve test edilmesine iliÅŸkin adÄ±mlarÄ± ve mimari kurallarÄ± tanÄ±mlar.

## ğŸ› ï¸ Docker Derleme AdÄ±mlarÄ± (Google Colab / GitHub Actions)
1. **Base Imaj Derleme (`Dockerfile.base`)**: 
   * Ortak kullanÄ±lan paketler (`diffusers`, `sentencepiece`, `einops`, `decord`, `open_clip_torch`, `av`, `tiktoken`, `protobuf`) base imaj iÃ§inde tutulur. 
   * DeÄŸiÅŸiklik yapÄ±lmadÄ±ÄŸÄ± sÃ¼rece workflow base imajÄ± derlemeyi pas geÃ§er (skip).
2. **Model Ä°maj Derleme (`Dockerfile`)**:
   * Her model kendi dizininde (`docker_image/wan/`, `docker_image/ltx/` vb.) Ã¶zel baÄŸÄ±mlÄ±lÄ±klarÄ±nÄ± kurar ve `app.py` dosyasÄ±nÄ± kopyalar.
   * Model aÄŸÄ±rlÄ±klarÄ± (weights) derleme boyutunu kÃ¼Ã§Ã¼ltmek amacÄ±yla build-time yerine run-time sÄ±rasÄ±nda indirilecek ÅŸekilde konfigÃ¼re edilmiÅŸtir.

## ğŸ©¹ Kritik Uyumluluk YamalarÄ± (Monkey-Patching)
Model sunucusunun (`app.py`) baÅŸlangÄ±cÄ±nda aÅŸaÄŸÄ±daki yamalarÄ±n eksiksiz uygulandÄ±ÄŸÄ±ndan emin olunmalÄ±dÄ±r:

### 1. Transformers v5+ T5TokenizerFast YamasÄ±
HuggingFace `transformers` v5+ Ã¼zerinde kaldÄ±rÄ±lan `T5TokenizerFast` sÄ±nÄ±fÄ±nÄ±n `PreTrainedTokenizerFast` Ã¼zerinden dinamik olarak ayaÄŸa kaldÄ±rÄ±lmasÄ± ve transformers namespace'lerine baÄŸlanmasÄ± gerekir.

### 2. PyTorch SÃ¼rÃ¼m Taklidi
Transformers v5+ paketinin PyTorch >= 2.4.0 beklentisini aÅŸmak amacÄ±yla:
```python
import importlib.metadata
import torch

torch.__version__ = "2.4.0"
# importlib.metadata.version("torch") -> "2.4.0" dÃ¶necek ÅŸekilde yamalanmalÄ±dÄ±r.
```

### 3. GradScaler & is_compiling YamalarÄ±
* `torch.amp.GradScaler = torch.cuda.amp.GradScaler` (GradScaler ImportError Ã§Ã¶zÃ¼mÃ¼)
* `torch.compiler.is_compiling = lambda: False` ve `torch.compiler.is_dynamo_compiling = lambda: False`

### 4. Custom Op ve Fake/Autograd KayÄ±tlarÄ±
Mixture of Experts (`moe.py`) iÃ§indeki `torch.library.custom_op` API'sinin py dÃ¼zeyinde geriye dÃ¶nÃ¼k uyumlu sarmalayÄ±cÄ±sÄ± yazÄ±lmalÄ±, `register_fake` ve `register_autograd` graceful fallback ile sarmalanmalÄ±dÄ±r.

### 5. `torch.get_default_device` EksikliÄŸi YamasÄ±
PyTorch 2.2.1 ve eski runtimelarda eksik olan bu metot dinamik olarak eklenmelidir:
```python
if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")
```

## â˜ï¸ Backblaze B2 S3 API BÃ¶lge (Region) Entegrasyonu
Boto3 (Python) veya AWS SDK (Node.js) istemcisi baÅŸlatÄ±lÄ±rken `region_name` parametresi hardcoded bÄ±rakÄ±lmamalÄ±, `B2_ENDPOINT_URL` Ã¼zerinden dinamik olarak ayrÄ±ÅŸtÄ±rÄ±lmalÄ±dÄ±r. Signature mismatch (Malformed Access Key Id) hatalarÄ±nÄ±n Ã¶nÃ¼ne bu ÅŸekilde geÃ§ilir.

## ğŸ”„ Worker GÃ¼ncelleme ve CanlÄ±da Test DÃ¶ngÃ¼sÃ¼
Ä°maj baÅŸarÄ±yla derlenip GHCR'a pushlandÄ±ktan sonra aÅŸaÄŸÄ±daki adÄ±mlar sÄ±rayla yÃ¼rÃ¼tÃ¼lÃ¼r:

1. **Commit SHA GÃ¼ncellemesi**: En son commit SHA deÄŸeri `scripts/update_and_test_manual.js` dosyasÄ±nda `COMMIT_SHA` deÄŸiÅŸkenine atanÄ±r.
2. **Template GÃ¼ncellemesi & Worker DÃ¶ngÃ¼sÃ¼ (Cycle)**:
   ```bash
   node scripts/update_and_test_manual.js
   ```
   Bu script RunPod template imajÄ±nÄ± yeni SHA etiketiyle gÃ¼nceller, mevcut Ã§alÄ±ÅŸan worker'larÄ± sonlandÄ±rÄ±r (maxWorkers=0) ve 10 saniye bekledikten sonra yeni imajlÄ± worker'larÄ± ayaÄŸa kaldÄ±rÄ±r (maxWorkers=3).
3. **TeÅŸhis Testi**:
   ```bash
   node scripts/test_wan_serverless.js <ENDPOINT_ID>
   ```
   Bu script `prompt: "diagnose"` payload'u ile modelin hatasÄ±z yÃ¼klendiÄŸini teyit eder.
4. **GerÃ§ek Video Ãœretim Testi**:
   ```bash
   node scripts/test_generate_video.js <ENDPOINT_ID>
   ```
   Bu script gerÃ§ek bir prompt ile modelin video sentezlemesini ve B2'ye yÃ¼klemesini baÅŸlatarak uÃ§tan uca doÄŸrulamayÄ± tamamlar.
