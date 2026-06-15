# Faz 1: Remotion Stüdyo & Görsel Motor

**Süre:** Hafta 1-2
**Paralel Track:** 3 (A/B/C bağımsız çalışır)

---

## Track 1A — Template Kütüphanesi

**Referans:** SwiftClip (32 template), remotion-cinematic, marketing-videos, openmotion

### Yapılacaklar
- [ ] Mevcut `RemotionVideo.tsx` yanına 32 SwiftClip template'i ekle
- [ ] Kategorilendirme: Marketing, Social, Data Viz, Broadcast, AI, Retro
- [ ] Zod schema validation ekle (remotion-cinematic Pattern)
- [ ] Agent-driven template seçici (marketing-videos Pattern)
- [ ] Her template için 9:16 (Shorts) + 16:9 (yatay) + 1:1 (kare) varyantları
- [ ] Remotion Player ile canlı önizleme
- [ ] Claude Code skill dosyası (`SKILL.md`)

### Yeni Dosyalar
```
client/src/components/remotion-templates/
├── ProductLaunch.tsx
├── FeatureShowcase.tsx
├── SocialProof.tsx
├── TutorialIntro.tsx
├── DataViz.tsx
├── BrandReveal.tsx
├── SubscribeCTA.tsx
├── ... (32 template)
├── schema.ts              (Zod schema'lar)
├── templateRegistry.ts    (template katalog)
└── Root.tsx               (Remotion root update)
```

### Mevcut Dosyalar
- `client/src/components/RemotionVideo.tsx` — **değişmez**, yanına eklenir
- `client/src/types.ts` — template tipleri eklenir

---

## Track 1B — Niche Profile Sistemi

**Referans:** rushindrasinha/youtube-shorts-pipeline

### Yapılacaklar
- [ ] NicheProfile tipi oluştur (hook pattern, visual vocab, TTS ton, caption font, BGM mood)
- [ ] Varsayılan niş profiller: tech, finance, fitness, health, gaming, crypto, education, entertainment
- [ ] AI otomatik niş detekte etme (prompt'tan)
- [ ] Her niş için hook pattern kütüphanesi
- [ ] Niş bazlı caption/font config
- [ ] BGM mood eşleştirme

### Yeni Dosyalar
```
src/services/nicheProfile.ts        (sınıf + config)
src/types/nicheProfile.ts           (tipler)
src/services/nicheProfiles/         (default profiller)
├── tech.ts
├── finance.ts
├── fitness.ts
├── ... (8+ profil)
```

### Mevcut Dosyalar
- `src/services/aiService.ts` — `enhanceVideoPrompt()` profili kullanır
- `src/queue.ts` — planning aşamasında profil bilgisini alır

---

## Track 1C — Stable Diffusion / Flux Görsel Motor (Pexels Yok)

**Referans:** Mevcut Colab SD pipeline'ı (DreamShaper 8), Flux dev

### Yapılacaklar
- [ ] Colab'da SD XL / Flux dev lazy-load pipeline kuran endpoint
- [ ] `generate_image(topic, style, aspect_ratio)` → görsel üret
- [ ] Prompt-to-image: sahne prompt'undan otomatik background görseli
- [ ] Stil seçenekleri: realistic, cinematic, anime, retro, product
- [ ] Aspect ratio: 16:9 (video), 9:16 (shorts), 1:1 (thumbnail)
- [ ] FFmpeg ile görsel → video (5-10sn loop + kenar yumuşatma)
- [ ] Batch görsel üretim (tek sahne için N alternatif)

### Neden Pexels değil?
- API bağımlılığı sıfır
- Rate limit yok
- Her konsept için özgün görsel
- Colab GPU zaten var, ek maliyet yok
- Mevcut SD 1.5 pipeline'ı (DreamShaper 8) temel alınır

### Yeni Dosyalar
```
colab_server.py — genişlet: Flux lazy-load endpoint
src/services/visualGenerator/
├── types.ts                  (görsel tipleri)
├── colabBridge.ts            (Colab SD/Flux çağrıları)
├── styleTemplates.ts         (stil prompt şablonları)
├── imageToVideo.ts           (FFmpeg loop + easing)
└── batchGenerator.ts         (toplu görsel üretimi)
```

### Mevcut Dosyalar
- `colab_server.py` — `/generate-image` endpoint eklenir
- `src/routes/bRoll.ts` — **yeniden adlandırılır** veya görsel rotaları eklenir
- `src/services/aiService.ts` — prompt enhancement

### Değişiklik Seviyesi: Minor (mevcut SD altyapısını genişletir)
