---
name: gpu-optimized-synthesis
description: Use when configuring or optimizing Docker-based GPU synthesis environments (RunPod) for instant model loading via persistent volume, warm process stability, error logging, and auto-shutdown on queue completion.
---

# GPU Optimized Synthesis

## Overview
Bu kılavuz, Docker konteynerlerinde çalışan GPU sunucusunun model indirme süresini minimize etmek, persistent volume'ları (B2, Docker volume) HF/Torch cache olarak kullanmak, hataları izole edip diske loglamak ve iş kuyruğu bittiğinde konteyneri otomatik kapatmak için gerekli teknik desenleri içerir.

## Kullanım Alanı
- Model indirme süresini dakikalardan saniyelere indirmek istendiğinde (Hugging Face önbelleği persistent volume'a yönlendirilir).
- Sunucunun her iş yüklemesinde sıfırlanıp ölmesini engellemek için "Warm Process" kurgulandığında.
- Docker konteyner hatalarını yakalayıp yerel bir log dosyasına yazma ve başarısız işlerde bu logu ana sunucuya (Node.js) göndermek gerektiğinde.
- Kuyrukta iş kalmadığında sunucuyu otonom olarak durdurmak (Idle Shutdown) istendiğinde.

## Temel Desenler

### 1. Persistent Volume Entegrasyonu (Hızlı Model Yükleme)
Hugging Face ve Torch modellerinin indirme konumlarını Docker volume veya B2 bucket üzerine yönlendirerek, ikinci çalıştırmadan itibaren modellerin **saniyeler içerisinde** yüklenmesi sağlanır.

```dockerfile
ENV HF_HOME=/cache/huggingface
ENV TORCH_HOME=/cache/torch
ENV HF_HUB_ENABLE_HF_TRANSFER=1
VOLUME /cache
```

```yaml
# docker-compose.yml
volumes:
  model-cache:
    driver: local

services:
  model-server:
    volumes:
      - model-cache:/cache
```

### 2. Warm Process & Hata Günlüğü (Logging)
Docker konteynerda meydana gelen tüm çökmeleri traceback detaylarıyla `error.log` dosyasına yazıp, hata durumunda bu logu Node.js webhook'una POST edin.

```python
import traceback

def log_and_send_error(task_id, exception, webhook_url=None):
    error_msg = traceback.format_exc()
    with open("error.log", "a", encoding="utf-8") as f:
        f.write(f"[{datetime.datetime.now()}] Task {task_id} Failed:\n{error_msg}\n")
    
    if webhook_url:
        try:
            requests.post(webhook_url, json={
                "task_id": task_id,
                "status": "failed",
                "error": str(exception),
                "error_log": error_msg
            })
        except Exception as e:
            print(f"Webhook failed: {e}")
```

### 3. Otonom Kapanma (Idle Shutdown)
İşler bittiğinde konteynerin boşa kaynak tüketmemesi için Node.js tarafında kuyruk boşaldığında RunPod API üzerinden konteyner durdurulmalıdır.

```typescript
// src/services/runpod.ts
async function stopEndpoint(endpointId: string): Promise<void> {
  await fetch(`https://api.runpod.io/v2/endpoints/${endpointId}/stop`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}` },
  });
}
```
