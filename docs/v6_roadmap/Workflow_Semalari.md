# Workflow Şemaları — AI Publisher

---

## Workflow 1: Sıfırdan Prompt → Video

```
Kullanıcı "Bir uzay belgeseli yap" yazar
      │
      ▼
┌─────────────────────────────────────────────────┐
│  Faz 1B: Niche Profile Detection                 │
│  → "uzay" → science/education profili            │
│  → hook: "Hiç merak ettiniz mi...?"              │
│  → visual vocab: nebula, galaxy, rocket          │
│  → TTS ton: dramatik, meraklı                    │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  multiAgentPipeline.ts (veya Faz 2A: LangGraph)  │
│                                                   │
│  Director Agent                                   │
│  → 5 sahneli plan: hook→setup→conflict→climax→CTA│
│                                                   │
│  Screenwriter Agent                               │
│  → her sahne için: videoPrompt + speechText +     │
│    sfxPrompt + cameraMotion                       │
│                                                   │
│  Producer Agent                                   │
│  → GPU kaynak planı, model seçimi                 │
│  → sahne sıralama optimizasyonu                   │
└──────┬──────────┬──────────┬──────────────────────┘
       │          │          │
       ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Docker   │ │ XTTS/    │ │ Docker   │
│ CogVideo │ │ Edge TTS │ │ AudioLDM2│
│ Wan 2.1  │ │ Kokoro   │ │ (SFX)    │
│ Hunyuan  │ │ (ses)    │ │ Flux/SD  │
│ LTX      │ │          │ │ (görsel) │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     └────────────┼────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│  FFmpeg Worker Pool                               │
│  → video + ses + SFX mix                          │
│  → Burn-in subtitles (sarı renk, altyazı)         │
│  → Faz 3B: A/B Split/MuseTalk Avatar (Job-2)      │
│  → Faz 3C: Cut & Color (Job-4)                    │
│  → Faz 1A: Remotion template render               │
│  → Brand kit uygulama (logo, renk)                │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Faz 4B: Dynamic Subtitles (Job-5)                │
│  → faster-whisper → DynamicCaptions               │
│  → ASS subtitle fix                               │
│                                                   │
│  Faz 4A: Smart Dubbing (Job-3)                    │
│  → beat-sync cuts + transcript edit + multi-dub   │
│                                                   │
│  SSE Progress → Dashboard                        │
│  → "278 / 542 mikro parça"                       │
│  → Kullanıcı onayı (awaiting_approval)           │
│  → AI üretilen başlık/hashtag düzenleme          │
│  → "Kaydet ve Yayınla" butonu                    │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Playwright Publisher                             │
│  → YouTube (+ playlist)                           │
│  → TikTok                                         │
│  → X (Twitter)                                    │
│  → Meta (Instagram/Facebook)                      │
│  → Faz 5B: Batch/Schedule publish                │
└─────────────────────────────────────────────────┘
```

---

## Workflow 2: Fırsatlar Hunisi → Video

```
┌─────────────────────────────────────────────────────┐
│  Opportunities.tsx (Dashboard)                       │
│  → Horizontal scroll kartları                        │
│  → Hover preview tooltip (sabit konum)               │
│  → Isı haritası (trend/beklenti)                     │
│  → "📝 Prompt Olarak Kullan" butonu                  │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Job Form Doldurma (fillJobForm)                     │
│  → Başlık → Master prompt alanı                      │
│  → Açıklama → Production notes                       │
│  → Transcript → prompt zenginleştirme                │
│  → Hedef platform otomatik seçim                     │
│  → Kullanıcı düzenleme/sadeleştirme                  │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
         ┌─────────────────────────────┐
         │  Workflow 1 (Prompt→Video)   │
         │  Aynı pipeline               │
         └─────────────────────────────┘
```

---

## Workflow 3: Sportoto Entegrasyonu → Video

```
┌─────────────────────────────────────────────────────────────┐
│  Haftalık Maç Programı (Sportoto API)                        │
│  → Takım isimleri, lig sıralaması                            │
│  → Sakatlık raporları                                        │
│  → Hava durumu tahmini                                       │
│  → Canlı oranlar                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  DiscussionSource.fetchWeeklyDiscussion(week)                │
│  → SportotoSource (gerçek API)                               │
│  → StubSource (test/mock — deterministik hash)               │
│  → SportotoUtterance[] dizisi döner                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  ScriptEngine.generateFromDiscussion()                       │
│  → Showrunner LLM: outline oluşturma                         │
│    (Zen→Minimax→Gemini chain)                                │
│                                                              │
│  → Per-character LLM dispatch:                               │
│    Maç Yorumcusu → Gemini 2.5 Flash                          │
│    Eski Futbolcu → Claude/M3 (MiniMax)                        │
│    Kumarbaz → ZEN free (OpenRouter fallback)                  │
│    DataScout → OpenRouter free model (ZEN fallback)           │
│                                                              │
│  → scripts + script_segments tablolarına yaz                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  TalkShowEditor.tsx (Dashboard — Talk-Show sekmesi)          │
│                                                              │
│  Config Ekranı                                               │
│  → Gösteri seç/oluştur                                       │
│  → Karakter listesi (4 AI agent)                             │
│  → Platform checkboxes                                       │
│  → "AI ile Script Oluştur" butonu                            │
│                                                              │
│  Edit Ekranı                                                 │
│  → Segment kartları (scene_type badge + karakter adı)        │
│  → Inline dialogue düzenleme                                 │
│  → Regenerate butonu (tek segment)                            │
│                                                              │
│  "Video Üret" butonu → POST /scripts/:id/produce              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  orchestrateToVideo.ts                                       │
│  → Her ajan mesajı → FFmpeg drawtext sahne                   │
│    (karakter adı + konuşma metni + renk kodu)                │
│  → concat + BGM mix (afade + volume 0.15)                    │
│  → Temp dosya temizliği                                      │
│  → Workflow 1'in publishing kısmı                            │
│  → Playwright multi-platform publish                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Workflow 4: Video Özgünleştirme (YouTube Linki → Yeni Video)

```
┌─────────────────────────────────────────────────────────────┐
│  Kullanıcı YouTube linkini yapıştırır + "Özgünleştir"        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Docker'da yt-dlp ile video indirme                  │
│  → OpenCV time-based frame kesme                             │
│  → Whisper transkript çıkarma                                │
│  → Gemini ile farklılaştırma metni üretme                    │
│  → "%90 hazır" SSE bildirimi                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Kullanıcı Onayı (awaiting_approval)                │
│  → Başlık/açıklama düzenleme                                 │
│  → Süre modu seçimi (90sn / 180sn / 300sn)                   │
│  → Layout seçimi (foreground+blur+vignette)                  │
│  → "Onayla" butonu                                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: Docker video model lazy load (CogVideoX/Wan/Hunyuan)│
│  → Image-to-Video (ilk frame → init_image)                   │
│  → Sahneler arası dynamic crossfade                          │
│  → %90 foreground + boxblurred background + vignette         │
│  → Workflow 1'in FFmpeg mix ve publishing kısmı              │
└─────────────────────────────────────────────────────────────┘
```

---

## Workflow 5: Chat-to-Edit (Doğal Dil ile Kurgu)

```
┌─────────────────────────────────────────────────────────────┐
│  Kullanıcı: "Bu sahneyi hızlandır"                           │
│             "Altyazı ekle"                                    │
│             "Şurayı kes"                                      │
│             "Sıcak sinematik tonlar ver"                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  chatToEdit.ts → Faz 2B Edit Agent                           │
│                                                              │
│  Intent Classifier (LLM + Zod)                                │
│  → Doğal dil → structured intent                             │
│  → { intent: "speed", target: "scene_2", params: {1.5x} }    │
│                                                              │
│  Snapshot Al (StateManager)                                   │
│  → SQLite/JSON kaydı                                         │
│  → "Geri al" için referans                                   │
│                                                              │
│  14 Operasyon Tipi:                                           │
│  trim, speed, enhance, remove_silence, add_broll,             │
│  add_transition, add_text, add_logo, adjust_audio,            │
│  add_sfx, resize, add_pings, add_subtitles, duck_audio       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  FFmpeg Worker Pool                                         │
│  → Intent'e göre FFmpeg filtresi oluştur                     │
│  → Worker thread'de çalıştır                                 │
│  → Başarılı → SSE bildirim                                   │
│  → Başarısız → hata mesajı + intent yeniden dene             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Preview Güncellemesi                               │
│  → Video player'da anlık önizleme                            │
│  → "Geri Al" butonu (snapshot restore)                       │
│  → "Değişiklikleri Kaydet" butonu                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Workflow 6: Talk-Show AI — 5 Agent + Video

```
┌─────────────────────────────────────────────────────────────┐
│  POST /orchestrate + topic                                   │
│  Örn: "Fenerbahçe-Galatasaray derbi analizi"                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Meta-Orchestrator (Zen chain — ücretsiz)                    │
│  → workflow planı oluştur                                    │
│  → Agent dispatch: hangi agent ne yapacak?                   │
│  → "Maç Yorumcusu analiz yapsın"                             │
│  → "Kumarbaz oran versin"                                    │
│  → "DataScout hava durumu getirsin"                          │
└────┬──────────┬──────────┬──────────┬──────────────────────┘
     │          │          │          │
     ▼          ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Maç     │ │ Eski    │ │ Kumarbaz│ │ Data    │
│ Yorumcus│ │ Futbolcu│ │ DeepSeek│ │ Scout   │
│ Gemini  │ │ Claude  │ │         │ │ Zen     │
│         │ │         │ │         │ │         │
│ Analiz  │ │ Stres   │ │ Kelly   │ │ Hava    │
│ xG      │ │ derbi   │ │ Kriteri │ │ sakatlık│
│ taktik  │ │ tribün  │ │ Value   │ │ uydu    │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │           │           │           │
     └───────────┼───────────┼───────────┘
                 ▼           ▼
┌─────────────────────────────────────────────────────────────┐
│  orchestrateToVideo.ts                                       │
│                                                              │
│  Her ajan mesajı → FFmpeg drawtext sahnesi                   │
│  → Karakter adı (renk kodlu: kırmızı/mavi/yeşil/sarı)        │
│  → Konuşma metni (altyazı)                                   │
│                                                              │
│  concat ile tüm sahneleri birleştir                           │
│  → xfade geçişleri                                           │
│                                                              │
│  BGM mix (afade + volume 0.15)                               │
│                                                              │
│  Faz 5B: Multi-brand skin uygula                              │
│  → logo overlay, brand rengi                                 │
│                                                              │
│  Temp dosya temizliği                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Workflow 7: Batch Pipeline — Toplu Video Üretimi

```
┌─────────────────────────────────────────────────────────────┐
│  JSON Topic Listesi                                          │
│  [                                                           │
│    { "topic": "Yapay zeka trendleri", "platform": ["YT"] },  │
│    { "topic": "2026 borsa tahminleri", "platform": ["TT"] }, │
│    { "topic": "Sağlıklı beslenme" }                          │
│  ]                                                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Faz 5B: Batch Manager                                       │
│                                                              │
│  → Topic'leri paralel işle                                   │
│  → Her topic için Workflow 1 başlat                          │
│  → Niche profile otomatik detekte                            │
│  → Kaynak yönetimi (GPU/API kotaları)                        │
│  → İlerleme dashboard'u                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Scheduler (CRON)                                            │
│  → Günde 1x / 2x / 3x                                       │
│  → Belirli saatlerde otomatik başlatma                       │
│  → Topic havuzundan sıradakini al                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Playwright Publisher                                        │
│  → Tüm videoları sırayla yayınla                              │
│  → Her platform için ayrı SEO metni                          │
│  → Batch publish raporu                                      │
└─────────────────────────────────────────────────────────────┘
```
