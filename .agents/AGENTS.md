# Yapay Zeka Yayıncı Ajan Belleği ve Yönergeleri

Bu dosya, AI-Publisher projesinde karşılaşılan ve çözüme kavuşturulan karmaşık kütüphane uyumsuzlukları, çevre sorunları ve mimari kritik kararların hafızasını tutar. Yeni oturumlarda bu kurallar dikkate alınmalıdır.

## 🧠 Bellek ve Kritik Teknik Kurallar

### 1. Transformers v5+ Uyumluluk ve T5TokenizerFast Yaması
- **Sorun**: HuggingFace `transformers` v5+ sürümünde, `tokenization_t5_fast.py` dosyası ve `T5TokenizerFast` sınıfı kütüphaneden tamamen kaldırılmıştır. Ancak `diffusers` (özellikle LTX-Video ve Wan-2.1 gibi video üretim hatlarında) pipeline yüklemesi sırasında doğrudan `transformers` namespace'inden veya `transformers.models.t5` altından `T5TokenizerFast` sınıfını sorgular. Bu durum `AttributeError` veya `ValueError` ile Flask sunucusunun ve dolayısıyla RunPod worker'larının çökmesine yol açar.
- **Kural**: Docker imajlarında `transformers` kütüphanesini bypass etmeye çalışmak yerine, `app.py` başlangıcında `T5TokenizerFast` sınıfını `PreTrainedTokenizerFast` üzerinden dinamik olarak kendimiz tanımlamalı ve `transformers` namespaces'ine bağlamalıyız:
  ```python
  from transformers.tokenization_utils_fast import PreTrainedTokenizerFast
  from transformers.models.t5.tokenization_t5 import T5Tokenizer

  class T5TokenizerFast(PreTrainedTokenizerFast):
      vocab_files_names = {"vocab_file": "spiece.model", "tokenizer_file": "tokenizer.json"}
      model_input_names = ["input_ids", "attention_mask"]
      slow_tokenizer_class = T5Tokenizer
      
      def __init__(self, vocab_file=None, tokenizer_file=None, eos_token="</s>", unk_token="<unk>", pad_token="<pad>", extra_ids=100, additional_special_tokens=None, **kwargs):
          # T5 için ek kimlikler (extra_ids) yönetimi
          if extra_ids > 0 and additional_special_tokens is None:
              additional_special_tokens = [f"<extra_id_{i}>" for i in range(extra_ids)]
          elif extra_ids > 0 and additional_special_tokens is not None:
              for i in range(extra_ids):
                  token = f"<extra_id_{i}>"
                  if token not in additional_special_tokens:
                      additional_special_tokens.append(token)
          super().__init__(vocab_file=vocab_file, tokenizer_file=tokenizer_file, eos_token=eos_token, unk_token=unk_token, pad_token=pad_token, additional_special_tokens=additional_special_tokens, **kwargs)

  # Namespace bağlama
  import transformers
  import transformers.models.t5
  transformers.T5TokenizerFast = T5TokenizerFast
  transformers.models.t5.T5TokenizerFast = T5TokenizerFast
  ```

### 2. RunPod İmaj Dağıtımlarında Commit SHA Doğruluğu
- **Sorun**: Git commit sonrasında oluşan kısa hash'lerin (örneğin `1d570b3`) eski commit hash'leriyle hatalı birleştirilmesi (Copy-paste hataları), RunPod üzerinde `manifest unknown` (imaj bulunamadı) hatasına ve dolayısıyla tüm worker'lar `unhealthy` duruma düşmesine neden olmaktadır.
- **Kural**: Şablon güncellerken veya test scriptlerini hazırlarken commit hash'ini el ile birleştirmek yerine daima git log komutu ile doğrudan tam hash'i alın:
  ```bash
  git log -n 1 --pretty=format:"%H"
  ```
  Elde edilen 40 karakterlik gerçek SHA etiketini `scripts/update_and_test_manual.js` ve diğer dağıtım betiklerinde güncelleyin.

### 3. Asla Mock Kullanılmaması Kuralı
- **Kural**: Projenin asıl kodlarında (`src/` klasörü altında) veya çalışma mantığında asla mock kullanılmamalıdır. Hatalar maskelenmemeli, doğrudan fırlatılarak hatanın kaynağı görünür kılınmalıdır. Sadece üçüncü parti kütüphanelerin sürüm uyumsuzluklarını aşmak için gerekli dinamik maymun yamaları (monkey-patching) yukarıda 1. maddede gösterildiği gibi izole biçimde uygulanmalıdır.

### 4. Fonksiyonel Kapsamda Değişken Gölgeleme (Variable Shadowing) ve UnboundLocalError
- **Sorun**: Bir python fonksiyonu (örn: `generate()`) içerisinde local düzeyde yapılan `import torch` veya `import importlib` gibi import tanımlamaları, Python yorumlayıcısı tarafından fonksiyonun tüm kapsamı (scope) boyunca yerel değişken olarak algılanır. Bu durum, diagnose dışındaki video üretim dalları çalıştığında `UnboundLocalError: local variable 'torch' referenced before assignment` hatasına sebep olur.
- **Kural**: Global düzeyde import edilmiş modüller, fonksiyonlar içindeki alt bloklarda lokal olarak tekrar `import` edilmemelidir. Global nesne referansları doğrudan kullanılmalıdır.

### 5. `torch.get_default_device` Eksikliği Giderimi
- **Sorun**: PyTorch 2.2.1 ve eski özel imaj runtimelarında, `transformers` v5+ tarafından çağrılan `torch.get_default_device()` metodunun bulunmaması sebebiyle model yüklenirken `AttributeError` fırlatılır.
- **Kural**: Model yüklenmeden önce `torch` modülüne bu metot dinamik olarak yamalanmalıdır:
  ```python
  if not hasattr(torch, "get_default_device"):
      torch.get_default_device = lambda: torch.device("cpu")
  ```

### 6. Backblaze B2 S3 API Endpoint ve Bölge (Region) Eşleşmesi
- **Sorun**: Boto3 (Python) veya AWS SDK (Node.js) ile Backblaze B2'ye dosya yüklerken, endpoint URL (örn: `https://s3.eu-central-003.backblazeb2.com`) ile istemciye parametre geçilen bölge (örn: `us-west-004`) uyuşmadığında, imza doğrulama adımı başarısız olur ve B2 API'si `Malformed Access Key Id` / `InvalidAccessKeyId` hatası döner.
- **Kural**: B2 S3 istemcisi yapılandırılırken bölge adı (`region_name`), endpoint URL'den dinamik olarak parse edilmelidir:
  * Python:
    ```python
    region = "us-west-004"
    if "s3." in endpoint:
        region = endpoint.split("s3.")[1].split(".")[0]
    ```
  * TypeScript:
    ```typescript
    let region = 'us-west-004';
    if (endpoint.includes('s3.')) {
      region = endpoint.split('s3.')[1]?.split('.')[0] || 'us-west-004';
    }
    ```

