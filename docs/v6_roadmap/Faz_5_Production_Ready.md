# Faz 5: Viral & Production Readiness

**Süre:** Hafta 7-8
**Bağımlılık:** Track 5A ← 4A + 4B, Track 5B ← 1A + 2A, Track 5C ← her şey
**Kapsam:** Job-7 (Viral Engine), Multi-Brand Theming, MCP v2, Prod Checklist
**Paralel Track:** 3

---

## Track 5A — Viral Optimization Engine (Job-7)

**Referans:** OpusClip, Captions.ai, mevcut `src/services/aiBroll.ts`, `viralHookGenerator.ts`

### Yapılacaklar
- [ ] **AI B-Roll Sentezi:** CogVideoX/Wan ile anahtar kelime tabanlı 3-4 sn özgün B-Roll (Job-7.1)
- [ ] **Viral Hook Analizi:** İlk 3 saniye hook kalitesini LLM ile değerlendir (Job-7.2)
- [ ] **Duygu Odaklı Altyazı:** Ses frekansı + tonlama analizi ile vurgulu kelimeleri renklendir (Job-7.3)
- [ ] **Viral Hashtag & Başlık Motoru:** Platform bazlı SEO/trend uyumlu öneriler (Job-7.4)

### Mevcut Altyapı
| Bileşen | Durum | İhtiyaç |
|---|---|---|
| `aiBroll.ts` | ✅ Mevcut | Queue bağla, multi-model |
| `viralHookGenerator.ts` | ✅ Mevcut | Frontend bağla |
| `aiService.ts` | ✅ Mevcut | Hashtag prompt'u |
| Duvar altyazı efektleri | ✅ Mevcut | DynamicCaptions genişlet |

### Yeni Dosyalar
```
src/services/viralEngine/
├── brollSynthesizer.ts      (çoklu model B-Roll)
├── hookAnalyzer.ts          (hook kalite skoru)
├── emotionCaption.ts        (ses frekans → renk)
├── hashtagGenerator.ts      (platform bazlı SEO)
├── titleOptimizer.ts        (A/B başlık testi)
└── routes.ts                (viral API)
```

### Mevcut Dosyalar
- `src/services/aiBroll.ts` — **genişletilir**
- `src/services/aiService.ts` — hashtag prompt'u
- `client/src/components/DynamicCaptions.tsx` — duygu renkleri
- `src/routes/jobs.ts` — viral endpoint'ler

### Değişiklik Seviyesi: Minor (mevcut servisleri güçlendirir)

---

## Track 5B — Multi-Brand Theming + MCP Tools v2

**Referans:** Claqueta (multi-brand), remotion-mcp-studio (25 MCP tool)

### Yapılacaklar
- [ ] Her Remotion composition'ına `brandId` parametresi
- [ ] Brand teması: renk paleti, tipografi, logo, maskot/avatar
- [ ] Dashboard'tan marka yönetimi (CRUD)
- [ ] Mevcut 5 MCP tool'u 15+ tool'a genişlet
- [ ] Yeni tool'lar: compose_video, run_pipeline, get_analytics, edit_scene, schedule_publish, list_templates, generate_script, split_screen, apply_brand, undo_edit
- [ ] Tool'ları Zod schema ile doğrulama
- [ ] AI agent'ların backend'i tam kontrolü

### Yeni Dosyalar
```
src/services/brandManager/
├── brandService.ts          (CRUD)
├── brandRenderer.ts         (Remotion brand inject)
├── types.ts                 (Brand teması tipi)
└── routes.ts                (API rotaları)
client/src/components/BrandManager.tsx  (UI)
```

### Mevcut Dosyalar
- `client/src/components/RemotionVideo.tsx` — brandId parametresi alır
- `src/services/mcpServer.ts` — **genişletilir** (tool registry)
- `src/server.ts` — brand rotaları mount

### Değişiklik Seviyesi: Minor

---

## Track 5C — Production Checklist

**Referans:** Mevcut TODO.md — 17 maddelik prod checklist

### Yapılacaklar
- [ ] VRAM Offloading Testi — 5 ardışık proje (≥10 sahne) render
- [ ] Mikro-Parça Senkronizasyonu — Colab ↔ Node.js polling testi
- [ ] Tünel Kopma Koruması — Uzun render kopma/sürdürme testi
- [ ] Event Loop Bloklanma Testi — 3 FFmpeg + Express SSE
- [ ] FFmpeg Timeout & Fallback — GPU codec → CPU libx264
- [ ] Disk Race Condition — ENOENT koruma testi
- [ ] Transkript Zinciri Stres Testi — API kotası → scraper → Gemini fallback
- [ ] LLM Geçiş Testi — ZEN → OpenRouter (free) → Minimax → Gemini
- [ ] Callback PSK Güvenliği — Yetkisiz istek 401 testi
- [ ] 9'lu Başlık Matrisi — FFmpeg drawtext doğrulama
- [ ] i18n Hafıza — localStorage tercih hatırlama testi
- [ ] SSE Reconnect — EventSource otomatik yeniden bağlanma
- [ ] Playwright Session Çerezleri — Güncel session doğrulama
- [ ] .env Sızıntısı Kontrolü — API key hardcoded taraması
- [ ] HTTP Güvenlik Başlıkları — X-Frame-Options, CSP, X-Content-Type-Options
- [ ] Session Cookie — httpOnly, secure, sameSite doğrulama
- [ ] Derleme — check:types, check:lint, test (228+), client build, Express build

### Test Dosyaları
```
tests/production/
├── stress_vram.spec.ts
├── polling_sync.spec.ts
├── tunnel_recovery.spec.ts
├── eventloop_block.spec.ts
├── ffmpeg_fallback.spec.ts
├── disk_race.spec.ts
├── transcript_chain.spec.ts
├── llm_fallback.spec.ts
├── callback_psk.spec.ts
├── title_matrix.spec.ts
├── i18n_memory.spec.ts
├── sse_reconnect.spec.ts
├── playwright_session.spec.ts
├── env_leak.spec.ts
├── security_headers.spec.ts
├── session_cookie.spec.ts
└── build_all.spec.ts
```

### Değişiklik Seviyesi: Patch (test katmanı)
