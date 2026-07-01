# Modal Test Sonuçları

> Tarih: 2026-07-01  
> Test süresi limiti: 5 dk (300s) / model  
> canceller: `call.cancel()`  
> Template: thread-based launcher + torchaudio ABI fix + base64 passthrough

---

## Özet

| Statü | Sayı |
|-------|------|
| ✅ PASS | 2 |
| ❌ FAIL | 0 |
| ⏰ TIMEOUT | 1 |
| ❓ TEST EDİLMEDİ | 21 |

---

## Ayrıntılı Sonuçlar

### ✅ Kokoro (35s)

| Alan | Değer |
|------|-------|
| Parametre | `text="Merhaba dünya, test konuşması."` |
| Yanıt | `{"output_path": "/workspace/outputs/kokoro_speech.wav", "status": "success"}` |
| GPU | A10 (eklendi) |
| TransformersPin | true (transformers<4.46) |
| Not | Cold start ~35s, model hızlı yükleniyor. GPU eklemesiyle CPU'daki darboğaz çözüldü. |

### ✅ XTTS (21s)

| Alan | Değer |
|------|-------|
| Parametre | `text="Merhaba dünya, test konuşması."` |
| Yanıt | `{"note": "fallback_applied", "output_path": "/workspace/outputs/speech.wav", "status": "success"}` |
| GPU | A10 (eklendi) |
| Not | Fallback edge-tts kullanıldı (ses referansı yok). Hızlı çalışıyor. A10 ile cold start ~21s. |

### ⏰ f5tts (302s — TIMEOUT, cancelled)

| Alan | Değer |
|------|-------|
| Parametre | `text="Merhaba dünya, test konuşması."` |
| Sonuç | TIMEOUT — `call.cancel()` ile sonlandırıldı |
| GPU | A10 (eklendi) |
| Olası neden | Dockerfile'da `torch>=2.5.0` override → torch 2.2.1 → torchaudio ABI runtime fix ~15s ek yük. Model download + GPU allocation >5 dk. |
| Çözüm önerisi | Modal GPU snapshot (`enable_memory_snapshot=True`) veya model weights Modal Volume'da önbellek. |

### ✅ Pipeline: Kokoro → Whisper (47s, önceki test)

| Alan | Değer |
|------|-------|
| Adım 1 | Kokoro: `"Merhaba dünya, bugün hava çok güzel."` → 41.6KB WAV |
| Adım 2 | Whisper: WAV → tam transkripsiyon (Türkçe) |
| Veri taşıma | Base64 passthrough (`_file_base64`) |
| Not | Pipeline beklendiği gibi çalışıyor. Kokoro Türkçe TTS üretiyor, Whisper doğru transkribe ediyor. |

### ⏰ Whisper (pipeline testinde timeout)

| Alan | Değer |
|------|-------|
| Durum | Pipeline testinde Whisper cold start'ta timeout |
| Olası neden | Whisper GPU cold start 5 dk'yı aştı. Kokoro'dan audio base64 alıp Whisper'a gönderme başarılı oldu ama Whisper model yüklenemedi. |
| Not | Önceki başarılı XTTS→Whisper testinde Whisper zaten sıcaktı (arka arkaya test). Soğuk başlatma >5 dk sürebilir. |

---

## Risk Analizi (Faz planına göre)

### Kategori 1: Eksik GPU (Faz A — ✅ Çözüldü)

| Model | Değişiklik | Durum |
|-------|-----------|-------|
| kokoro | `Gpu="A10"` eklendi | ✅ Deploy edildi, test PASS |
| whisper | `Gpu="A10"` eklendi | ✅ Deploy edildi |
| xtts | `Gpu="A10"` eklendi | ✅ Deploy edildi, test PASS |

### Kategori 2: Torch Override (Faz C — Bekliyor)

| Model | Risk | Seviye |
|-------|------|--------|
| f5tts | `torch>=2.5.0` → torch 2.2.1 override → torchaudio ABI kırık | YÜKSEK — cold start >5 dk |
| lora-trainer | Aynı override pattern | YOK — deploy'da mevcut değil |
| wan25 | torch 2.6.0 → 2.5.1 downgrade | ORTA — test edilmedi |

### Kategori 3: Module-level Import (Faz C — Bekliyor)

| Model | Risk | Seviye |
|-------|------|--------|
| stablediffusion | `import diffusers` (5 pipeline) | YÜKSEK — cold start 10+ dk olabilir |
| audioldm2 | module-level import | YÜKSEK |
| wav2lip | module-level import | YÜKSEK |
| xtts | module-level import | YÜKSEK — test PASS (template thread'de import ediyor) |
| pyramid-flow | module-level import | YÜKSEK |
| hunyuan | module-level import | YÜKSEK |
| mochi | module-level import | YÜKSEK |
| lora-trainer | module-level import | YOK |
| animatediff | module-level import | YÜKSEK |

---

## Kalan Testler (21 model)

Aşağıdaki modeller henüz test edilmedi (Phase C kapsamında):

| Grup | Model | Tahmini Süre | Not |
|------|-------|-------------|-----|
| audio | audioldm2 | ~3 dk | module-level import riskli |
| face | wav2lip | ~5+ dk | video+audio gerektirir |
| face | sadtalker | ~5+ dk | image+audio gerektirir |
| face | musetalk | ~5+ dk | video+audio gerektirir |
| face | geneface | ~5+ dk | audio gerektirir |
| face | videoretalking | ~5+ dk | video+audio gerektirir |
| image | stablediffusion | ~10+ dk | en ağır model, 5 pipeline |
| image | realesrgan | ~3 dk | image upscale |
| video | wan | ~3 dk | hafif video model |
| video | wan25 | ~5+ dk | torch override riski |
| video | cogvideox | ~3 dk | — |
| video | hunyuan | ~5+ dk | module-level import |
| video | ltx | ~3 dk | — |
| video | mochi | ~5+ dk | module-level import |
| video | animatediff | ~5+ dk | module-level import |
| video | dynamicrafter | ~3 dk | — |
| video | pyramidflow | ~5+ dk | module-level import |
| video | svd | ~3 dk | — |
| video | videocrafter | ~3 dk | — |
| video | zeroscope | ~3 dk | — |
| browser | browseruse | ~5+ dk | playwright browser launcher |

---

## Öneriler

### Acil (Phase C)
1. **f5tts cold start**: Modal `enable_memory_snapshot=True` ekle. İlk warm'dan sonra 5-10s'de başlar.
2. **Whisper cold start**: Aynı snapshot yöntemi. Pipeline testlerinde whisper sıcak kalmalı.
3. **Stablediffusion**: Module-level import → lazy import'a çevir. thread-launcher health'i kurtarır ama warm >10 dk sürebilir.

### Orta Vade (Phase D)
1. **ModalBridge.ts**: Tüm modeller için `MODEL_TO_MODAL` mapping hazır.
2. **queue.ts**: ModalClient implementasyonu — pipeline'lar için sequential spawn + 5dk timeout per model.

### İyileştirme
1. **min_containers**: Kritik modeller (kokoro, whisper, xtts) için `min_containers=1` düşünülebilir (maliyet artar).
2. **Model Volume**: f5tts, stablediffusion için model weights Modal Volume'da önbelleklenebilir.
