---
name: docker-build-video-models
description: Instructions and guidelines on how to build, update, patch, and test Docker images for Serverless RunPod endpoints in the AI-Publisher project, including transformers v5+ PyTorch compatibility patches, B2 region matching, and worker cycling.
---

# Docker İmaj Derleme, Güncelleme ve Test Yönergeleri (Video Modelleri)

Bu skill, AI-Publisher projesinde RunPod Serverless üzerinde çalışan LTX-Video ve Wan-2.1 gibi video üretim modellerine ait Docker imajlarının derlenmesi, yamalanması, yayınlanması ve test edilmesine ilişkin adımları ve mimari kuralları tanımlar.

## 🛠️ Docker Derleme Adımları (Google Colab / GitHub Actions)
1. **Base Imaj Derleme (`Dockerfile.base`)**: 
   * Ortak kullanılan paketler (`diffusers`, `sentencepiece`, `einops`, `decord`, `open_clip_torch`, `av`, `tiktoken`, `protobuf`) base imaj içinde tutulur. 
   * Değişiklik yapılmadığı sürece workflow base imajı derlemeyi pas geçer (skip).
2. **Model İmaj Derleme (`Dockerfile`)**:
   * Her model kendi dizininde (`colab_docker/wan/`, `colab_docker/ltx/` vb.) özel bağımlılıklarını kurar ve `app.py` dosyasını kopyalar.
   * Model ağırlıkları (weights) derleme boyutunu küçültmek amacıyla build-time yerine run-time sırasında indirilecek şekilde konfigüre edilmiştir.

## 🩹 Kritik Uyumluluk Yamaları (Monkey-Patching)
Model sunucusunun (`app.py`) başlangıcında aşağıdaki yamaların eksiksiz uygulandığından emin olunmalıdır:

### 1. Transformers v5+ T5TokenizerFast Yaması
HuggingFace `transformers` v5+ üzerinde kaldırılan `T5TokenizerFast` sınıfının `PreTrainedTokenizerFast` üzerinden dinamik olarak ayağa kaldırılması ve transformers namespace'lerine bağlanması gerekir.

### 2. PyTorch Sürüm Taklidi
Transformers v5+ paketinin PyTorch >= 2.4.0 beklentisini aşmak amacıyla:
```python
import importlib.metadata
import torch

torch.__version__ = "2.4.0"
# importlib.metadata.version("torch") -> "2.4.0" dönecek şekilde yamalanmalıdır.
```

### 3. GradScaler & is_compiling Yamaları
* `torch.amp.GradScaler = torch.cuda.amp.GradScaler` (GradScaler ImportError çözümü)
* `torch.compiler.is_compiling = lambda: False` ve `torch.compiler.is_dynamo_compiling = lambda: False`

### 4. Custom Op ve Fake/Autograd Kayıtları
Mixture of Experts (`moe.py`) içindeki `torch.library.custom_op` API'sinin py düzeyinde geriye dönük uyumlu sarmalayıcısı yazılmalı, `register_fake` ve `register_autograd` graceful fallback ile sarmalanmalıdır.

### 5. `torch.get_default_device` Eksikliği Yaması
PyTorch 2.2.1 ve eski runtimelarda eksik olan bu metot dinamik olarak eklenmelidir:
```python
if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")
```

## ☁️ Backblaze B2 S3 API Bölge (Region) Entegrasyonu
Boto3 (Python) veya AWS SDK (Node.js) istemcisi başlatılırken `region_name` parametresi hardcoded bırakılmamalı, `B2_ENDPOINT_URL` üzerinden dinamik olarak ayrıştırılmalıdır. Signature mismatch (Malformed Access Key Id) hatalarının önüne bu şekilde geçilir.

## 🔄 Worker Güncelleme ve Canlıda Test Döngüsü
İmaj başarıyla derlenip GHCR'a pushlandıktan sonra aşağıdaki adımlar sırayla yürütülür:

1. **Commit SHA Güncellemesi**: En son commit SHA değeri `scripts/update_and_test_manual.js` dosyasında `COMMIT_SHA` değişkenine atanır.
2. **Template Güncellemesi & Worker Döngüsü (Cycle)**:
   ```bash
   node scripts/update_and_test_manual.js
   ```
   Bu script RunPod template imajını yeni SHA etiketiyle günceller, mevcut çalışan worker'ları sonlandırır (maxWorkers=0) ve 10 saniye bekledikten sonra yeni imajlı worker'ları ayağa kaldırır (maxWorkers=3).
3. **Teşhis Testi**:
   ```bash
   node scripts/test_wan_serverless.js <ENDPOINT_ID>
   ```
   Bu script `prompt: "diagnose"` payload'u ile modelin hatasız yüklendiğini teyit eder.
4. **Gerçek Video Üretim Testi**:
   ```bash
   node scripts/test_generate_video.js <ENDPOINT_ID>
   ```
   Bu script gerçek bir prompt ile modelin video sentezlemesini ve B2'ye yüklemesini başlatarak uçtan uca doğrulamayı tamamlar.
