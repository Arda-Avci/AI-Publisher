# Faz 4: Dubbing, Altyazı & AI Stüdyo

**Süre:** Hafta 5-6
**Bağımlılık:** Track 4A ← 3C, Track 4B/4C bağımsız
**Kapsam:** Job-3 (Smart Dubbing), Job-5 (Dynamic Subtitles), Job-6 (AI Studio)
**Paralel Track:** 3

---

## Track 4A — Smart Dubbing Engine (Job-3)

**Referans:** Montage-AI, mevcut `src/services/autoDubbing.ts`, `beatSyncEditor.ts`, `transcriptEditor.ts`

### Yapılacaklar
- [ ] **Beat-Synced Cuts:** FFmpeg + ses analizi ile BPM/peak noktalarına göre otomatik kesim (Job-3.1)
- [ ] **Transkript Tabanlı Kurgu:** Panel üzerinde kelime silme → FFmpeg otonom kırpma (Job-3.2)
- [ ] **Otomatik Dublaj:** Whisper transkript → XTTS-v2 → rubberband time-stretch (Job-3.3)
- [ ] **Çoklu Dil Desteği:** TR/EN/DE/FR/AR (Job-3.4)

### Mevcut Altyapı
| Bileşen | Durum | İhtiyaç |
|---|---|---|
| `beatSyncEditor.ts` | ✅ Mevcut | RabbitMQ queue bağla |
| `transcriptEditor.ts` | ✅ Mevcut | Frontend entegrasyon |
| `autoDubbing.ts` | ✅ Mevcut | Çoklu dil UI bağla |
| Colab XTTS-v2 | ✅ Mevcut | Zaten çalışıyor |
| Rubberband | ✅ Mevcut | Colab'da mevcut |

### Yeni Dosyalar
```
src/services/dubbing/
├── beatSyncQueue.ts         (RabbitMQ bağlantısı)
├── transcriptEditorQueue.ts (RabbitMQ bağlantısı)
├── autoDubbingQueue.ts      (RabbitMQ bağlantısı)
└── multiLanguage.ts         (dil yönetimi)
```

### Mevcut Dosyalar
- `src/services/beatSyncEditor.ts` — **genişletilir**
- `src/services/transcriptEditor.ts` — **genişletilir**
- `src/services/autoDubbing.ts` — **genişletilir**
- `src/routes/editor.ts` — yeni endpoint'ler
- `client/src/components/` — UI bileşenleri

### Değişiklik Seviyesi: Patch (servisler var, bağlantı eksik)

---

## Track 4B — Dynamic Subtitles & Transcription (Job-5)

**Referans:** SubtitleAI, mevcut `client/src/components/DynamicCaptions.tsx`

### Yapılacaklar
- [ ] **Dinamik Altyazı:** Kelime zaman damgalı bounce/pulse/shake animasyonları (Job-5.1)
- [ ] **faster-whisper:** Colab'da C++ motoru ile 4x hızlı deşifre (Job-5.2)
- [ ] **openai-whisper fallback:** faster-whisper çalışmazsa yedek (Job-5.3)
- [ ] **ASS Windows Bug Fix:** `original_size` parametre düzeltmesi (Job-5.4)

### Mevcut Altyapı
| Bileşen | Durum | İhtiyaç |
|---|---|---|
| `DynamicCaptions.tsx` | ✅ Mevcut | V2 animasyonlar |
| `subtitleRenderer.ts` | ✅ Mevcut | ASS fix doğrula |
| Colab faster-whisper | ✅ Mevcut | Test + optimize |
| openai-whisper fallback | ✅ Mevcut | Test |

### Yeni Dosyalar
```
src/services/subtitleEngine/
├── dynamicCaptionV2.ts      (v2 animasyon motoru)
├── fasterWhisperBridge.ts   (Colab faster-whisper çağrısı)
└── assFix.ts                (original_size düzeltmesi)
```

### Mevcut Dosyalar
- `client/src/components/DynamicCaptions.tsx` — **genişletilir**
- `src/services/subtitleRenderer.ts` — **doğrulanır**
- `colab_server.py` — faster-whisper endpoint optimize

### Değişiklik Seviyesi: Patch (hızlı kazanım)

---

## Track 4C — AI Studio Suite (Job-6)

**Referans:** Descript Studio Sound, Runway Inpainting, mevcut Colab eye-contact/inpaint endpoint'leri

### Yapılacaklar
- [ ] **AI Göz Teması:** Colab gaze-correction endpoint'i ile konuşmacı göz bebeklerini sabitle (Job-6.1)
- [ ] **Studio Sound:** Arka plan gürültü + yankı temizleme (Job-6.2)
- [ ] **Smart Reframe:** OpenCV yüz takibi ile 16:9 → 9:16 dinamik crop (Job-6.3)
- [ ] **AI Inpainting:** Nesne/maske silme (Job-6.4)

### Mevcut Altyapı
| Bileşen | Durum | İhtiyaç |
|---|---|---|
| Colab eye-contact endpoint | ✅ Mevcut | `/api/v1/eye-contact` |
| Colab inpaint endpoint | ✅ Mevcut | `/api/v1/inpaint-video` |
| `face-track-worker.ts` | ✅ Mevcut | Smart reframe için |
| Studio Sound (noise filter) | ❌ Yeni | FFmpeg anlms + Colab |

### Yeni Dosyalar
```
src/services/aiStudio/
├── studioSound.ts           (gürültü + yankı temizleme)
├── smartReframe.ts          (face-track + crop)
├── eyeContactBridge.ts      (Colab eye-contact çağrısı)
├── inpaintBridge.ts         (Colab inpaint çağrısı)
└── types.ts
```

### Mevcut Dosyalar
- `colab_server.py` — eye-contact/inpaint endpoint'leri zaten var
- `src/routes/colab.ts` — yeni rotalar eklenir
- `client/src/components/` — premium kurgu araçları paneli (v5.7'de yapıldı)

### Değişiklik Seviyesi: Patch (Colab endpoint'leri var, frontend bağlantısı eklenecek)
