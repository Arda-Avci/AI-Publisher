---
name: colab-optimized-synthesis
description: Use when configuring or optimizing Google Colab GPU server environments to achieve instant model loading (via Google Drive cache), warm process stability, error logging, and auto-shutdown on queue completion.
---

# Colab Optimized Synthesis

## Overview
Bu kılavuz, Google Colab üzerinde çalışan GPU sunucusunun (Flask/Ngrok) dakikalarca model indirmesini önlemek, Google Drive'ı kalıcı önbellek (HF/Torch Cache) olarak kullanmak, hataları izole edip diske loglamak ve iş kuyruğu bittiğinde sunucuyu otomatik kapatmak için gerekli teknik desenleri içerir.

## Kullanım Alanı
- Model indirme süresini dakikalardan saniyelere indirmek istendiğinde (Hugging Face önbelleği Google Drive'a yönlendirilir).
- Sunucunun her iş yüklemesinde sıfırlanıp ölmesini engellemek için "Warm Process" kurgulandığında.
- Colab hatalarını yakalayıp yerel bir log dosyasına yazma ve başarısız işlerde bu logu ana sunucuya (Node.js) göndermek gerektiğinde.
- Kuyrukta iş kalmadığında sunucuyu otonom olarak durdurmak (Idle Shutdown) istendiğinde.

## Temel Desenler

### 1. Google Drive Entegrasyonu (Hızlı Model Yükleme)
Hugging Face ve Torch modellerinin indirme konumlarını Google Drive üzerine yönlendirerek, ikinci çalıştırmadan itibaren modellerin **saniyeler içerisinde** yüklenmesi sağlanır.

```python
import os
from google.colab import drive

# Google Drive'ı mount et
drive.mount('/content/drive')

# Önbellek dizinlerini Drive altına yönlendir
os.environ["HF_HOME"] = "/content/drive/MyDrive/Colab_Cache/huggingface"
os.environ["TORCH_HOME"] = "/content/drive/MyDrive/Colab_Cache/torch"
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1" # Hızlı indirme aktiftir
```

### 2. Warm Process & Hata Günlüğü (Logging)
Colab Flask sunucusunda meydana gelen tüm çökmeleri traceback detaylarıyla `colab_error.log` dosyasına yazıp, hata durumunda bu logu Node.js Express callback sunucusuna POST edin.

```python
import traceback

def log_and_send_error(task_id, exception, callback_url=None):
    error_msg = traceback.format_exc()
    with open("colab_error.log", "a", encoding="utf-8") as f:
        f.write(f"[{datetime.datetime.now()}] Task {task_id} Failed:\n{error_msg}\n")
    
    if callback_url:
        try:
            requests.post(callback_url, json={
                "task_id": task_id,
                "status": "failed",
                "error": str(exception),
                "error_log": error_msg
            })
        except Exception as e:
            print(f"Callback failed: {e}")
```

### 3. Otonom Kapanma (Idle Shutdown)
İşler bittiğinde Colab oturumunun boşa (idle) kaynak tüketmemesi için Node.js tarafında kuyruk boşaldığında Colab sunucusundaki `/shutdown` endpoint'i tetiklenmelidir.

```python
@app.route('/shutdown', methods=['POST'])
def shutdown():
    print("Shutting down server...")
    # Colab oturumunu sonlandır
    os.system("kill -9 -1")
    return jsonify({"status": "shutdown_initiated"})
```
