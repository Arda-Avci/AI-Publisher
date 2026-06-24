# Profesyonel Kısa Film Üretimi İş Akışı — Uygulama Planı

Kaynak: `Script_writer_is_akisi.txt`

## Mimari Karar
Full workflow 9 bağımsız workstream'e bölündü. Her workstream kendi tip tanımı, servis katmanı, REST route ve testini içerir. Hiçbiri birbirini bloklamaz.

## Workstream'ler

### A — Writer Tier System
Dosyalar: `src/services/crewai/writerTiers.ts` (yeni), `writerCrew.ts` (güncelle), `routes/crewAI.ts` (güncelle), `test_writerTiers.spec.ts` (yeni)
3 tier: professional (düşük sıcaklık, sıkı revizyon), creative (yüksek sıcaklık, esnek), assistant (düşük karmaşıklık, hızlı)

### B — Document Parser
Dosyalar: `src/services/documentParser.ts` (yeni), `routes/documentUpload.ts` (yeni), `test_documentParser.spec.ts` (yeni)
Bağımlılık: mammoth + pdf-parse

### C — Art Style Presets
Dosyalar: `src/types/artStyle.ts` (yeni), `src/services/artStylePresets.ts` (yeni), `outlinerAgent.ts` (güncelle), `test_artStylePresets.spec.ts` (yeni)
10+ preset: Nolan, Blade Runner, Squid Game, Tarantino, Wes Anderson, Ghibli, Fincher, Villeneuve, Refn, Singh

### D — Beatsheet Duration
Dosyalar: `src/types/script.ts` (güncelle), `sceneArchitectAgent.ts` (güncelle)
ScenePlanSchema → durationSeconds field eklenecek

### E — Environment/Prop Library
Dosyalar: `src/db.ts` (güncelle), `src/types/envProp.ts` (yeni), `src/services/envPropService.ts` (yeni), `src/routes/envProps.ts` (yeni), `test_envProp.spec.ts` (yeni)
Character library kalıbının birebir kopyası

### F — Storyboard Service
Dosyalar: `src/services/storyboardGenerator.ts` (yeni), `src/routes/storyboard.ts` (yeni), `test_storyboard.spec.ts` (yeni)
RunPod FLUX.1-schnell ile sahne → 2K image

### G — Frontend (A-F sonrası)
ScriptWriterPanel güncellemesi: tier selector, style cards, doc upload, env/prop manager, storyboard grid

### H — Timeline + Post-Prod
Timeline drag-reorder, transition picker, 4K upscale UI, alt scene gen

### I — Export Pipeline
concat/zip servis + FilmFreeway metadata export

## İlerleme

| Workstream | Durum | Test |
|-----------|-------|------|
| A | ❌ | — |
| B | ❌ | — |
| C | ❌ | — |
| D | ❌ | — |
| E | ❌ | — |
| F | ❌ | — |
| G | ❌ | — |
| H | ❌ | — |
| I | ❌ | — |
