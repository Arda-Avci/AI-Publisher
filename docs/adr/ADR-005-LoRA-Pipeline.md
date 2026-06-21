# ADR-005: LoRA Fine-Tuning Pipeline (Karakter Tutarlılığı)

## Durum
Kabul Edildi (20 Haziran 2026)

## Bağlam
Her sahnede aynı karakterin yüz/fiziksel özelliklerinin tutarlı görünmesi gerekiyor. Mevcut pipeline'da her sahne bağımsız prompt ile üretiliyor; karakter drift'i kaçınılmaz. Self-consistency chaining (son kare taşıma) kısmen çözüm sunsa da yeni açı/ortam/pozda yüz kayması devam ediyor.

Amaç: Kullanıcının 3-5 referans görselinden LoRA adapter weight'leri çıkararak tüm sahnelerde karakter tutarlılığını sağlamak.

## Karar
LoRA (Low-Rank Adaptation) fine-tuning pipeline'ı eklendi:

### Mimari
- **Yeni container:** `colab_docker/lora-trainer/` (port 5016, GPU_HEAVY)
  - SDXL tabanlı, LoRA rank=32, 8-bit AdamW, gradient checkpointing
  - 3 endpoint: `/health`, `/train`, `/infer`
- **Yeni servis:** `src/services/loraService.ts`
  - `trainLoRA()`: Docker container'da LoRA eğitimi başlatma
  - `inferWithLoRA()`: Eğitilmiş weight'lerle görsel üretme
- **DB değişikliği:**
  - `character_lora_weights` tablosu (job_id, character_name, weights_path, training_status)
  - `video_jobs.lora_enabled` kolonu
- **queue.ts entegrasyonu:** Her sahne üretiminden önce LoRA weights lookup → `lora_weights_path` payload'a eklenir → Docker container video generation'dan önce LoRA inference yapar → çıkan görsel init_image olarak kullanılır

### Akış
1. Kullanıcı dashboard'da LoRA checkbox'ı işaretler + 3-5 referans görsel yükler
2. Job başlatıldığında `trainLoRA()` tetiklenir
3. Eğitim tamamlandığında weight'ler DB'ye kaydedilir
4. Her sahne üretiminde weight'ler modele enjekte edilir
5. Karakter tüm sahnelerde aynı yüz/fiziksel özelliklerle tutarlı üretilir

### Teknik Detaylar
- `peft.LoraConfig(r=32, lora_alpha=64, target_modules=["to_q", "to_k", "to_v", "to_out"])`
- `bitsandbytes` 8-bit AdamW optimizer
- `gradient_checkpointing_enable()` her zaman aktif
- `pipe.enable_model_cpu_offload()` VRAM < 20GB ise
- Eğitim: ~100-200 step, ~5 dakika (T4 GPU)

## Sonuçlar
### Olumlu
- Karakter drift'i minimize edilir
- Kullanıcı kendi karakter görsellerini kullanır (özgün içerik)
- Mevcut pipeline'da minimal değişiklik (queue.ts'de ~10 satır)
- LoRA weight'leri ~100MB, disk/drive'da az yer kaplar

### Olumsuz
- İlk job'da ~5dk ek bekleme (eğitim süresi)
- Kullanıcıdan en az 3 referans görsel talep edilir
- T4 GPU'da eğitim VRAM sınırı nedeniyle düşük batch size
- Farklı karakterler için ayrı LoRA eğitimi gerekir (çoklu karakter senaryolarında maliyet artar)

### Gelecek İyileştirmeler
- [ ] Önceden eğitilmiş karakter kütüphanesi (tekrar kullanım)
- [ ] Çoklu karakter desteği (her karakter için ayrı LoRA)
- [ ] LoRA weight'lerinin kalıcı saklanması (Docker volume)
- [ ] Eğitim ilerlemesinin SSE ile canlı broadcast'i
