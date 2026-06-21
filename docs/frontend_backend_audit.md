# Frontend ↔ Backend Entegrasyon Denetimi

**Tarih:** 20 Haziran 2026
**Kapsam:** 37 frontend bileşen, 175+ backend endpoint, 2 package.json

---

## 🛑 KRİTİK: Frontend'in Çağırdığı Ama Backend'de Olmayan Rotalar

Bu rotalar **404 döner** — özellik tamamen kırık.

| # | Frontend Çağrı | Backend Durum | Etkilenen Bileşen | Şiddet |
|---|---|---|---|---|
| 1 | `GET /api/v1/jobs` | ❌ Yok | `App.tsx:219` — job listesi yüklenmez, galeri boş | 🔴 Kritik |
| 2 | `GET /api/v1/jobs/${jobId}` | ❌ Yok | `TalkShowEditor.tsx` — job detayı alınamaz | 🟠 Yüksek |
| 3 | `EventSource /api/v1/progress/stream?jobId=X` | ❌ Backend'de `GET /progress/:id` var ama path farklı | `App.tsx:268`, `TalkShowEditor.tsx` — SSE bağlanamaz, progress çalışmaz | 🔴 Kritik |
| 4 | `POST /api/v1/viral-score/${jobId}` | ❌ Backend: `POST /api/v1/jobs/:jobId/viral-score` (path farkı) | `App.tsx:574` — viral skor analizi çalışmaz | 🟠 Yüksek |
| 5 | `POST /api/v1/upload` | ❌ Yok | `MuseTalkPanel.tsx` — dosya yükleme kırık | 🔴 Kritik |
| 6 | `GET /api/v1/schedule-publish` | ❌ Yok (scheduler servisi var ama route yok) | `SchedulePublishPanel.tsx` | 🟠 Yüksek |
| 7 | `POST /api/v1/schedule-publish` | ❌ Yok | `SchedulePublishPanel.tsx` | 🟠 Yüksek |
| 8 | `DELETE /api/v1/schedule-publish/${id}` | ❌ Yok | `SchedulePublishPanel.tsx` | 🟠 Yüksek |
| 9 | `GET /api/v1/colab/test-models` | ❌ Backend: `POST /api/v1/colab/test-models` (method farkı) | `GalleryPanel.tsx` — model testi çalışmaz | 🟡 Orta |
| 10 | `GET /api/v1/jobs?limit=20` | ❌ Yok | `TalkShowEditor.tsx` — job listesi alınamaz | 🟠 Yüksek |

---

## ⚠️ Backend'de Olan Ama Frontend'de Hiç Kullanılmayan Rotalar

Bu özellikler backend'de tam kodlanmış ama UI'ya bağlanmamış.

### Tamamen Kullanılmayan Servis Grupları

| Servis | Backend Route Sayısı | Frontend Kullanımı | Etki |
|---|---|---|---|
| **ViMax** (multi-agent pipeline) | 5 endpoint | ❌ Hiçbiri çağrılmıyor | 🟡 Orta — pipeline var ama UI yok |
| **Pipecat** (ses/video pipeline) | 9 endpoint | ❌ Hiçbiri çağrılmıyor | 🟡 Orta — bridge var ama UI yok |
| **Differentiation** (özgünleştirme) | 4 endpoint | ❌ Hiçbiri çağrılmıyor | 🟡 Orta |
| **Chat-to-Edit** (doğal dil kurgu) | 3 endpoint | ❌ Hiçbiri çağrılmıyor | 🟠 Yüksek — EditQueuePanel var ama chat-to-edit servisini çağırmıyor |
| **B-Roll** (AI klip sentezi) | 2 endpoint | ❌ Hiçbiri çağrılmıyor | 🟡 Orta |
| **Niche** (niş analiz) | 2 endpoint | ❌ Hiçbiri çağrılmıyor | 🟢 Düşük |
| **BeatSync** (ritim kesme) | 3 endpoint | ❌ Hiçbiri çağrılmıyor | 🟢 Düşük |
| **Color Grade** (renk derecelendirme) | 3 endpoint | ❌ Hiçbiri çağrılmıyor | 🟡 Orta — ColorGraderPanel var ama backend çağırmıyor |
| **Cut** (sessizlik kesme) | 3 endpoint | ❌ Hiçbiri çağrılmıyor | 🟢 Düşük |
| **Dubbing** (dublaj) | 2 endpoint | ❌ Hiçbiri çağrılmıyor | 🟡 Orta — DubbingPanel var ama backend çağırmıyor |
| **Viral** (hook/hashtag/optimize) | 7 endpoint | ❌ Hiçbiri çağrılmıyor | 🟠 Yüksek — ViralPanel var ama backend çağırmıyor |
| **Transcript Cut** | 1 endpoint | ❌ Çağrılmıyor | 🟢 Düşük |
| **AI Studio** (`/api/v1/studio/*`) | 7 endpoint | ❌ Hiçbiri çağrılmıyor | 🟡 Orta — StudioToolsPanel var ama backend çağırmıyor |
| **Storyboard** | 3 endpoint | ❌ Hiçbiri çağrılmıyor | 🟢 Düşük |
| **Audit Log** | 2 endpoint | ❌ Hiçbiri çağrılmıyor | 🟢 Düşük |
| **LoRA** | 4 endpoint | ❌ Hiçbiri çağrılmıyor | 🟡 Orta — yeni özellik, UI bağlanmamış |
| **Sportoto/TalkShow orchestrate** | 3 endpoint | ❌ Hiçbiri çağrılmıyor | 🟢 Düşük — TalkShowEditor sadece script API'sini kullanıyor |
| **Docker yönetim** (start/connect/stop) | 3 endpoint | ❌ Hiçbiri çağrılmıyor | 🟡 Orta — kullanıcı Docker'ı UI'dan yönetemez |
| **Select Cover** | 1 endpoint | ❌ Çağrılmıyor | 🟡 Orta — CoverSelector var ama backend çağırmıyor |

### Kısmen Kullanılan Rotalar

| Route | Frontend Kullanımı |
|---|---|
| `GET /api/v1/characters/:id` | ❌ Çağrılmıyor (sadece listeleme var) |
| `PUT /api/v1/characters/:id` | ❌ Çağrılmıyor (karakter güncelleme UI'ı yok) |
| `POST /api/v1/retry-job/:id` | ❌ Çağrılmıyor (job retry UI'ı yok) |
| `GET /api/v1/clipper/:id` | ❌ Çağrılmıyor |
| `POST /api/v1/clipper/:id/retry` | ❌ Çağrılmıyor |
| `GET /api/v1/clipper/progress/:id` | ❌ Çağrılmıyor |
| `POST /api/v1/clipper/:id/auto` | ❌ Çağrılmıyor |
| `POST /api/v1/clipper/split-screen*` (7 tane) | ❌ Çağrılmıyor |
| `POST /api/v1/publish/:id/:platform` | ❌ Frontend çağırmıyor (dashboardScripts.js'de olabilir) |
| `POST /api/v1/cancel-publish/:id/:platform` | ❌ Çağrılmıyor |
| `POST /api/v1/publish-all/:id` | ❌ Çağrılmıyor |
| `GET /auth-status/:platform` | ❌ Çağrılmıyor |
| `POST /auth-setup/:platform` | ❌ Çağrılmıyor |
| `DELETE /auth-setup/:platform` | ❌ Çağrılmıyor |
| `POST /api/v1/auth-setup/:platform` | ❌ Çağrılmıyor |
| `GET /api/v1/help-videos` | ❓ AdminHelpVideos çağırıyor ama sorgu parametresiz hali |
| `POST /api/v1/help-videos/admin` | ❌ Frontend çağırmıyor (sadece admin UI) |

---

## 🔶 Frontend Bileşenlerinin Durumu

### API Çağırmayan (Pure UI) Bileşenler

Bu bileşenler sadece prop/state ile çalışıyor — API çağırmamaları sorun değil, parent'ları veriyi sağlıyor olabilir.

| Bileşen | Görevi | Not |
|---|---|---|
| `DubbingPanel.tsx` | Dublaj formu | Pure form state, hiç API çağırmaz |
| `DynamicCaptions.tsx` | Canlı altyazı animasyonu | DOM manipülasyonu, API gerekmez |
| `ViralPanel.tsx` | Viral analiz gösterimi | Pure UI props |
| `KineticSubtitlesPanel.tsx` | Kinetik altyazı ayarları | Pure UI props |
| `ColorGraderPanel.tsx` | Renk ayarları | Pure state, backend çağırmaz |
| `CoverSelector.tsx` | Kapak seçici | Callback prop ile çalışır |
| `RemotionVideo.tsx` | Remotion render | Sadece Remotion kütüphanesi |
| `SubtitleWord.tsx` | CSS animasyon | Tamamen CSS |
| `StudioToolsPanel.tsx` | AI stüdyo araçları | Sadece toggle state |
| `StudioPanel.tsx` | Orta panel | Sadece child yönetir |
| `Header.tsx` | Navigasyon | Link ve butonlar |
| `AdminLayout.tsx` | Admin layout | Sadece layout |

### API Çağıran Ama Backend'de Karşılığı Olmayan/Bozuk

| Bileşen | Çağrı | Sorun |
|---|---|---|
| `App.tsx` | `GET /api/v1/jobs` | **KIRIK** — job listeleme hiç çalışmaz |
| `App.tsx` | `EventSource /api/v1/progress/stream` | **KIRIK** — progress hiç çalışmaz |
| `App.tsx` | `POST /api/v1/viral-score/${jobId}` | **KIRIK** — path yanlış |
| `MuseTalkPanel.tsx` | `POST /api/v1/upload` | **KIRIK** — upload route yok |
| `SchedulePublishPanel.tsx` | `GET/POST/DELETE /api/v1/schedule-publish` | **KIRIK** — route yok |
| `GalleryPanel.tsx` | `GET /api/v1/colab/test-models` | **KIRIK** — GET yerine POST |
| `TalkShowEditor.tsx` | `GET /api/v1/jobs/${jobId}` | **KIRIK** — job detay route yok |
| `TalkShowEditor.tsx` | `EventSource /api/v1/progress/stream` | **KIRIK** — progress route yanlış |

---

## 🔷 Frontend - Backend Path/Method Uyumsuzlukları

| # | Frontend | Backend | Fark |
|---|---|---|---|
| 1 | `GET /api/v1/jobs` | Yok | Route eksik |
| 2 | `GET /api/v1/jobs/:id` | Yok | Route eksik |
| 3 | `EventSource /api/v1/progress/stream?jobId=X` | `GET /progress/:id` | Path tamamen farklı |
| 4 | `POST /api/v1/viral-score/:id` | `POST /api/v1/jobs/:jobId/viral-score` | `/jobs/` segmenti eksik |
| 5 | `POST /api/v1/upload` | Yok | Route eksik |
| 6 | `GET /api/v1/colab/test-models` | `POST /api/v1/colab/test-models` | GET vs POST |
| 7 | `GET /api/v1/schedule-publish` | Yok | Route eksik |
| 8 | `POST /api/v1/schedule-publish` | Yok | Route eksik |
| 9 | `DELETE /api/v1/schedule-publish/:id` | Yok | Route eksik |
| 10 | `GET /api/v1/help-videos` (query paramsız) | `GET /api/v1/help-videos?feature=&lang=` | Sorgu parametresi eksik olabilir |

---

## 📦 Bağımlılık Analizi

### Backend `package.json` (root)

| Paket | Sürüm | Durum |
|---|---|---|
| `@ai-sdk/anthropic` | ^3.0.82 | ✅ |
| `@ai-sdk/google` | ^3.0.80 | ✅ |
| `@ai-sdk/openai` | ^3.0.68 | ✅ |
| `ai` | ^6.0.193 | ✅ |
| `amqplib` | ^2.0.1 | ✅ |
| `axios` | ^1.16.1 (override) | ✅ |
| `bcrypt` | ^6.0.0 | ✅ |
| `dotenv` | ^17.4.2 | ✅ |
| `express` | ^5.2.1 | ✅ |
| `express-rate-limit` | ^7.5.1 | ✅ |
| `express-session` | ^1.19.0 | ✅ |
| `fs-extra` | ^11.3.5 | ✅ |
| `ioredis` | ^5.11.1 | ✅ |
| `iyzipay` | ^2.0.67 | ✅ |
| `multer` | ^2.1.1 | ✅ |
| `pg` | ^8.21.0 | ✅ |
| `playwright` | ^1.60.0 (override) | ✅ |
| `pino` | ^9.0.0 | ✅ |
| `ws` | ^8.21.0 (override) | ✅ |
| `youtube-transcript` | ^1.2.1 | ✅ |
| `yt-search` | ^2.13.1 | ✅ |

### Frontend `client/package.json`

| Paket | Sürüm | Durum |
|---|---|---|
| `@remotion/player` | ^4.0.475 | ✅ |
| `@tailwindcss/vite` | ^4.3.1 | ✅ |
| `lucide-react` | ^1.17.0 | ✅ |
| `react` | ^19.2.6 | ✅ |
| `react-dom` | ^19.2.6 | ✅ |
| `react-router-dom` | ^7.17.0 | ✅ |
| `remotion` | ^4.0.475 | ✅ |
| `tailwindcss` | ^4.3.1 | ✅ |

### Eksik/Uyumsuz Bağımlılıklar

| # | Paket | Nerede Gerekli | Sebep |
|---|---|---|---|
| 1 | `@types/react` ^19.2.17 | root devDependencies'de var ama client'da farklı | Root'ta ^19.2.17, client'da ^19.2.14 |
| 2 | `@types/react-dom` ^19.2.3 | root devDependencies'de var ama client'da farklı | Root'ta ^19.2.3, client'da ^19.2.3 — uyumlu |
| 3 | `uuid` | Backend'de kullanılıyor olabilir (tip var `@types/uuid^10.0.0`) ama runtime paketi `package.json`'da YOK | `src/` kodunda `uuid` import'ı varsa runtime hatası |
| 4 | Pino-pretty | root dev'de ^11.0.0, logger.ts prod'da `pino-pretty` kullanıyorsa production'da hata | 🟡 Orta |

---

## 📋 ÖZET: Toplu Düzeltme Listesi

### Acil (Kritik — Çalışmayı Engelliyor)

| # | Sorun | Düzeltme |
|---|---|---|
| 1 | `GET /api/v1/jobs` route'u yok | `jobs.ts`'ye job listeleme route'u ekle |
| 2 | `EventSource /api/v1/progress/stream` yanlış path | Frontend'i `/progress/${jobId}` kullanacak şekilde düzelt VEYA backendi `/api/v1/progress/stream` kabul edecek şekilde genişlet |
| 3 | `POST /api/v1/upload` route'u yok | `editor.ts`'ye upload route'u ekle |
| 4 | `POST /api/v1/viral-score/${id}` path yanlış | Frontend'de path'i `/api/v1/jobs/${jobId}/viral-score` düzelt |

### Yüksek Öncelik

| # | Sorun | Düzeltme |
|---|---|---|
| 5 | `/api/v1/schedule-publish` route'ları yok | Scheduler servisi var, route'ları ekle |
| 6 | `GET /api/v1/jobs/${jobId}` route'u yok | Job detay route'u ekle |
| 7 | `GET /api/v1/colab/test-models` method hatası | Frontend'de GET → POST düzelt (veya Docker endpoint'i) |
| 8 | Chat-to-Edit servisi frontend'de çağrılmıyor | EditQueuePanel'i chat-to-edit API'sine bağla |
| 9 | Viral servis frontend'de çağrılmıyor | ViralPanel'i viral API'sine bağla |
| 10 | Dubbing servisi frontend'de çağrılmıyor | DubbingPanel'i dubbing API'sine bağla |
| 11 | Color Grade servisi frontend'de çağrılmıyor | ColorGraderPanel'i color API'sine bağla |
| 12 | AI Studio servisi frontend'de çağrılmıyor | StudioToolsPanel'i studio API'sine bağla |

### Orta Öncelik

| # | Sorun | Düzeltme |
|---|---|---|
| 13 | ViMax pipeline UI'sı yok | Frontend bileşeni ekle |
| 14 | Pipecat pipeline UI'sı yok | Frontend bileşeni ekle |
| 15 | LoRA training UI'sı yok | LoraPanel bileşeni ekle |
| 16 | Docker yönetim UI'sı yok | Docker container durum butonları ekle |
| 17 | CoverSelector backend'e bağlı değil | select-cover API'sini çağır |
| 18 | Retry job UI'ı yok | Job kartına retry butonu ekle |
| 19 | Publish route'ları frontend'de çağrılmıyor | Publish butonlarını API'ye bağla |
| 20 | `uuid` runtime paketi root'ta eksik | `npm install uuid` |

### Düşük Öncelik

| # | Sorun | Düzeltme |
|---|---|---|
| 21 | Storyboard UI'sı yok | Frontend bileşeni ekle |
| 22 | Audit log UI'sı yok | Admin sayfasına audit log paneli ekle |
| 23 | BeatSync UI'sı yok | Frontend bileşeni ekle |
| 24 | Cut UI'sı yok | Frontend bileşeni ekle |
| 25 | Transcript Cut UI'sı yok | Frontend bileşeni ekle |
| 26 | Niche UI'sı yok | Frontend bileşeni ekle |

---

## 📊 İstatistikler

| Kategori | Sayı |
|---|---|
| Toplam backend endpoint | ~175+ |
| Frontend'den çağrılan endpoint | ~85 |
| **Kırık frontend çağrısı** | **10** |
| **Backend'de olup frontend'de kullanılmayan** | **~90** |
| Frontend bileşen (API çağıran) | 26/37 |
| Frontend bileşen (pure UI) | 11/37 |
| Hiç çağrılmayan servis grubu | 18 |

---

## 🎯 Kırık Özellikler (Özet)

| Bileşen | Çalışma Durumu |
|---|---|
| **Job Galerisi** (video listesi) | ❌ Kırık — `GET /api/v1/jobs` route'u yok |
| **SSE Progress Bar** | ❌ Kırık — EventSource path yanlış |
| **MuseTalk (yükleme)** | ❌ Kırık — upload route yok |
| **Viral Skor** | ❌ Kırık — path yanlış |
| **Schedule Publish** | ❌ Kırık — route yok |
| **Video Galeri/Listeleme** | ❌ Kırık — route yok |
| **Docker Model Test** | ⚠️ Method hatası |
| **Dubbing** | ⚠️ UI var, backend bağlı değil |
| **Viral Panel** | ⚠️ UI var, backend bağlı değil |
| **Color Grade** | ⚠️ UI var, backend bağlı değil |
| **AI Studio Tools** | ⚠️ UI var, backend bağlı değil |
| **Chat-to-Edit** | ⚠️ UI var, backend bağlı değil |
| **Cover Select** | ⚠️ UI var, backend bağlı değil |
| **Publish Butonları** | ⚠️ UI'da var mı emin değil, backend çağrılmıyor |
