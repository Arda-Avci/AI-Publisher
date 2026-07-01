# ADR-005: LoRA Fine-Tuning Pipeline (Karakter TutarlÄ±lÄ±ÄŸÄ±)

## Durum
Kabul Edildi (20 Haziran 2026)

## BaÄŸlam
Her sahnede aynÄ± karakterin yÃ¼z/fiziksel Ã¶zelliklerinin tutarlÄ± gÃ¶rÃ¼nmesi gerekiyor. Mevcut pipeline'da her sahne baÄŸÄ±msÄ±z prompt ile Ã¼retiliyor; karakter drift'i kaÃ§Ä±nÄ±lmaz. Self-consistency chaining (son kare taÅŸÄ±ma) kÄ±smen Ã§Ã¶zÃ¼m sunsa da yeni aÃ§Ä±/ortam/pozda yÃ¼z kaymasÄ± devam ediyor.

AmaÃ§: KullanÄ±cÄ±nÄ±n 3-5 referans gÃ¶rselinden LoRA adapter weight'leri Ã§Ä±kararak tÃ¼m sahnelerde karakter tutarlÄ±lÄ±ÄŸÄ±nÄ± saÄŸlamak.

## Karar
LoRA (Low-Rank Adaptation) fine-tuning pipeline'Ä± eklendi:

### Mimari
- **Yeni container:** `docker_image/lora-trainer/` (port 5016, GPU_HEAVY)
  - SDXL tabanlÄ±, LoRA rank=32, 8-bit AdamW, gradient checkpointing
  - 3 endpoint: `/health`, `/train`, `/infer`
- **Yeni servis:** `src/services/loraService.ts`
  - `trainLoRA()`: Docker container'da LoRA eÄŸitimi baÅŸlatma
  - `inferWithLoRA()`: EÄŸitilmiÅŸ weight'lerle gÃ¶rsel Ã¼retme
- **DB deÄŸiÅŸikliÄŸi:**
  - `character_lora_weights` tablosu (job_id, character_name, weights_path, training_status)
  - `video_jobs.lora_enabled` kolonu
- **queue.ts entegrasyonu:** Her sahne Ã¼retiminden Ã¶nce LoRA weights lookup â†’ `lora_weights_path` payload'a eklenir â†’ Docker container video generation'dan Ã¶nce LoRA inference yapar â†’ Ã§Ä±kan gÃ¶rsel init_image olarak kullanÄ±lÄ±r

### AkÄ±ÅŸ
1. KullanÄ±cÄ± dashboard'da LoRA checkbox'Ä± iÅŸaretler + 3-5 referans gÃ¶rsel yÃ¼kler
2. Job baÅŸlatÄ±ldÄ±ÄŸÄ±nda `trainLoRA()` tetiklenir
3. EÄŸitim tamamlandÄ±ÄŸÄ±nda weight'ler DB'ye kaydedilir
4. Her sahne Ã¼retiminde weight'ler modele enjekte edilir
5. Karakter tÃ¼m sahnelerde aynÄ± yÃ¼z/fiziksel Ã¶zelliklerle tutarlÄ± Ã¼retilir

### Teknik Detaylar
- `peft.LoraConfig(r=32, lora_alpha=64, target_modules=["to_q", "to_k", "to_v", "to_out"])`
- `bitsandbytes` 8-bit AdamW optimizer
- `gradient_checkpointing_enable()` her zaman aktif
- `pipe.enable_model_cpu_offload()` VRAM < 20GB ise
- EÄŸitim: ~100-200 step, ~5 dakika (T4 GPU)

## SonuÃ§lar
### Olumlu
- Karakter drift'i minimize edilir
- KullanÄ±cÄ± kendi karakter gÃ¶rsellerini kullanÄ±r (Ã¶zgÃ¼n iÃ§erik)
- Mevcut pipeline'da minimal deÄŸiÅŸiklik (queue.ts'de ~10 satÄ±r)
- LoRA weight'leri ~100MB, disk/drive'da az yer kaplar

### Olumsuz
- Ä°lk job'da ~5dk ek bekleme (eÄŸitim sÃ¼resi)
- KullanÄ±cÄ±dan en az 3 referans gÃ¶rsel talep edilir
- T4 GPU'da eÄŸitim VRAM sÄ±nÄ±rÄ± nedeniyle dÃ¼ÅŸÃ¼k batch size
- FarklÄ± karakterler iÃ§in ayrÄ± LoRA eÄŸitimi gerekir (Ã§oklu karakter senaryolarÄ±nda maliyet artar)

### Gelecek Ä°yileÅŸtirmeler
- [ ] Ã–nceden eÄŸitilmiÅŸ karakter kÃ¼tÃ¼phanesi (tekrar kullanÄ±m)
- [ ] Ã‡oklu karakter desteÄŸi (her karakter iÃ§in ayrÄ± LoRA)
- [ ] LoRA weight'lerinin kalÄ±cÄ± saklanmasÄ± (Docker volume)
- [ ] EÄŸitim ilerlemesinin SSE ile canlÄ± broadcast'i
