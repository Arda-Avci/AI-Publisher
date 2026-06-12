# Bilinen Sorunlar, Sınırlamalar ve Ertelenmiş İşler

> Bu dosya projenin tüm bilinen sorunlarını, dış bağımlılıkları, güvenlik uyarılarını ve gelecek sprint'leri tek yerde toplar. Sprint'ler tamamlandıkça burası güncellenir.

**Son güncelleme:** S4 sonrası (2026-06-03)

---

## 🔴 KRİTİK — Düzeltilmesi Gereken (Acil)

### 1. Ngrok Token Sızıntısı
- **Durum:** Hardcoded token `colab_server.py:397`'den kaldırıldı (S3 kapsamında), artık `os.environ.get("NGROK_TOKEN")` kullanılıyor
- **Yapılacak:** Eski token'ı [dashboard.ngrok.com](https://dashboard.ngrok.com) üzerinden **revoke et** ve yenisini `.env`'e ekle
- **Araç:** `npm run setup-ngrok` sihirbazı otomatik yapabilir (S4'te eklendi)
- **Risk:** Token iptal edilmezse kötü niyetli kişiler tünelinizi kullanabilir

### 2. HuggingFace Wav2Lip Placeholder URL
- **Durum:** `colab_setup.py:1` placeholder URL: `https://huggingface.co/your-org/Wav2Lip/resolve/main/wav2lip.pth`
- **Yapılacak:** Takım biri `wav2lip.pth` (~400MB) dosyasını kendi HuggingFace reposuna yüklemeli ve `your-org` yerine gerçek username/org adını yazmalı
- **Fallback:** SharePoint URL'i hâlâ denenir, ama Microsoft rate-limit/rotate edebilir
- **Alternatif:** Google Drive public link + `gdown` ile indirme de eklenebilir

### 3. SSE Endpoint'inde Auth Eksik
- **Durum:** `GET /progress/:id` rotası `requireAuth` middleware'i olmadan çalışıyor
- **Etki:** Job ID'sini bilen biri o job'un progress'ini dinleyebilir (düşük risk — ID'ler ardışık tamsayı, sıralı deneme ile bulunabilir)
- **Düzeltme:** İlk fırsatta `requireAuth` + `WHERE id = ? AND user_id = ?` kontrolü ekle

---

## 🟡 ORTA — İyileştirilmesi Gereken (Kısa Vade)

### 4. Phase 1 (Differentiation) Hâlâ Senkron
- **Durum:** `POST /differentiate-video` 5-15 saniye boyunca (YouTube transcript + 2 Gemini çağrısı) blocking
- **Etki:** Modal spinner gösteriyor, kullanıcı bekliyor; yavaş Gemini yanıtında 30s+ olabilir
- **Planlanan Çözüm:** Background task + polling/SSE (ayrı sprint, kullanıcı tarafından ertelendi)
- **Öncelik:** Orta — şu an çalışıyor, UX suboptimal

### 5. server.ts 5093+ Satır — Monolitik
- **Durum:** Tüm HTML/CSS/JS tek template literal içinde, tüm route'lar aynı dosyada
- **Etki:** Geliştirme acı verici, IDE lag, conflict riski, test edilemez
- **Planlanan Çözüm:** **S5 (şu an başlıyor)** — `routes/`, `middleware/`, `views/` modüllerine böl
- **Öncelik:** Yüksek — uzun vadede sürdürülebilirlik için kritik

### 6. Publish Endpoint'i HTTP Thread'ini Blokluyor
- **Durum:** `POST /publish/:id/:platform` Playwright'ı senkron çalıştırıyor (3-5 dakika sürebilir)
- **Etki:** Tek kullanıcıda OK, çok kullanıcıda HTTP request'ler birikir, sunucu yanıt vermez
- **Çözüm:** `setImmediate(() => publish(...))` + sonucu SSE ile bildir, DB'de status tracking
- **Öncelik:** Orta

### 7. `isProcessing` Flag Multi-Process Güvensiz
- **Durum:** `queue.ts:18` module-level `let isProcessing = false`
- **Etki:** `cluster` veya `pm2` ile multi-process çalıştırılırsa aynı anda 2 job işlenebilir
- **Çözüm:** DB-level atomic lock: `UPDATE video_jobs SET status='processing' WHERE id=? AND status='pending'` ve row count kontrol et
- **Öncelik:** Orta

### 8. Frontend SSE Client Reconnect Yok
- **Durum:** `/progress/:id` EventSource bağlantısı düşerse kullanıcı progress göremez, "Onay Bekliyor" badge takılı kalır
- **Çözüm:** EventSource.onerror handler'da 5s backoff ile yeniden bağlan
- **Öncelik:** Orta

### 9. Multi-Tab Colab Polling (KISMEN ÇÖZÜLDÜ)
- **Durum:** S4'te header badge SSE'ye geçti, ama `pollColabStatus()` hâlâ `setInterval(15_000)` ile çağrılıyor (popover için)
- **Çözüm:** Popover da SSE ile aynı stream'i dinlesin
- **Öncelik:** Düşük (artık background overhead minimal)

### 10. Rate Limiting Yok
- **Durum:** `/create-job`, `/differentiate-video` herhangi bir kullanıcı saniyede 100 istek atabilir
- **Etki:** API quota aşımı, sunucu yüklenmesi
- **Çözüm:** `express-rate-limit` paketi ile dakikada 5 istek limiti
- **Öncelik:** Orta

### 11. Global Error Middleware Yok
- **Durum:** Express'te `(err, req, res, next) => ...` global handler yok
- **Etki:** 500 hataları generic, loglanmıyor, debug zor
- **Çözüm:** `app.use((err, req, res, next) => ...)` ekle
- **Öncelik:** Orta

### 12. Job İptal Endpoint'i Yok
- **Durum:** Pending/processing job'ları kullanıcı iptal edemez
- **Etki:** Yanlış prompt ile başlatılan job 30+ dakika Colab'da çalışır
- **Çözüm:** `POST /cancel-job/:id` + worker periyodik `isCancelled` kontrolü
- **Öncelik:** Düşük

### 13. Audit Log Yok
- **Durum:** Kim ne zaman hangi iş başlattı, sildi, yayınladı — kayıt yok
- **Etki:** Hata ayıklama, kullanıcı davranışı takibi imkansız
- **Çözüm:** `audit_log(user_id, action, entity_type, entity_id, created_at)` tablosu + middleware
- **Öncelik:** Düşük

---

## 🟢 DÜŞÜK — Stil / Kod Kalitesi (Uzun Vade)

### 14. Toplu Yayınlama Yok
- **Durum:** Her platform için ayrı Publish butonu
- **Çözüm:** "Tümünü Yayınla" tek tık butonu

### 15. Frontend Framework Yok
- **Durum:** Vanilla HTML/CSS/JS template literal
- **Çözüm:** React/Vite'e geçiş (büyük iş, 2-3 hafta)

### 16. i18n Externalization
- **Durum:** `TRANSLATIONS` objesi `server.ts` içinde devasa bir map
- **Çözüm:** `i18next` + JSON dosyaları, lazy load

### 17. Test Coverage Yok
- **Durum:** Hiç unit test, integration test yok
- **Çözüm:** `vitest` kurulumu + kritik fonksiyonlar için test (transcript, scoring, ffmpeg)

### 18. Prettier / ESLint Standardı Yok
- **Durum:** `.eslintrc` var ama Prettier config yok
- **Çözüm:** Prettier + ESLint strict, pre-commit hook

### 19. CI/CD Yok
- **Durum:** GitHub Actions, otomatik typecheck/test yok
- **Çözüm:** `.github/workflows/ci.yml` ekle

### 20. Docker Compose (ERTELENDİ)
- **Durum:** Bu geliştirme makinesinde Docker çalışmıyor, container planları raftan kaldırıldı
- **Çözüm:** Docker düzgün çalışan bir ortam bulunduğunda tekrar değerlendirilecek

---

## 🌐 DIŞ BAĞIMLILIKLAR — Kırılma Riski Olan Servisler

### 21. Google Colab Ücretsiz Tier
- **Kısıtlamalar:**
  - GPU süre limiti (günde ~4 saat, haftada ~20 saat)
  - RAM 12.67GB (T4) — büyük modeller OOM
  - Session 12 saat sonra veya inaktivity'de disconnect
  - ModelScope T2V zaten T4'ün sınırında çalışıyor
- **Risk:** Ağır kullanımda günlük kota aşılır, üretim durur
- **Çözüm:** Uzun vadede kendi GPU sunucusuna geçiş (RunPod, Vast.ai, kendi makinesi)

### 22. ngrok Ücretsiz Tier
- **Kısıtlamalar:**
  - 1 statik alan adı
  - 1 GB/ay bandwidth
  - Bağlantı hız limiti
- **Risk:** 1 job'ın video+ses indirmesi 200-500 MB → 2-5 job/ay bandwidth doldurur
- **Çözüm:** Cloudflare Tunnel (ücretsiz, limitsiz) veya kendi VPS

### 23. YouTube Data API v3
- **Kısıtlamalar:** 10,000 unit/gün (search=100 unit, videos.list=1 unit)
- **Etki:** Günde max 100 search veya 10,000 video detail lookup
- **Çözüm:** API key rotation veya kota artırım talebi (Google onayı gerekli)

### 24. Gemini API (Google AI Studio)
- **Kısıtlamalar:** Free tier 60 RPM (request per minute), 1500 RPD
- **Etki:** Çoklu kullanıcı 429 alabilir
- **Çözüm:** Exponential backoff, request queue

### 25. `youtube-transcript` Paketi
- **Kısıtlamalar:** YouTube'un unofficial endpoint'ini kullanıyor, kırılgan
- **Risk:** YouTube değişiklik yaparsa paket bozulur
- **Çözüm:** `yt-dlp` subprocess alternatifi (daha robust ama yavaş)

---

## 📊 ERTELENMİŞ SPRINT'LER

| Sprint | İçerik | Öncelik | Durum |
|---|---|---|---|
| **Phase 1 Async** | Background differentiation + polling/SSE | Orta | Kullanıcı erteledi, sonra bakacağız |
| **F9 DB Lock** | `isProcessing` → atomic UPDATE | Orta | Eklenecek |
| **F10 Audit Log** | Kullanıcı aksiyon logu | Düşük | Eklenecek |
| **S5 Refactor** | server.ts modüler yapıya böl | Yüksek | **Şu an başlıyor** |
| **Cancel Endpoint** | POST /cancel-job/:id | Düşük | Eklenecek |
| **SSE Auth** | /progress/:id auth | Orta | Eklenecek |
| **Toplu Yayın** | "Tümünü Yayınla" butonu | Düşük | UX iyileştirme |
| **React Migration** | Frontend framework'e geçiş | Çok düşük | Büyük refactor |
| **Docker Compose** | Tek komut kurulum | Orta | DevOps |
| **CI/CD** | GitHub Actions | Orta | DevOps |
| **Pre-commit Hooks** | Prettier/ESLint otomatik | Düşük | Kod kalitesi |
| **Unit Tests** | vitest + kritik testler | Orta | Kalite güvence |

---

## 🛠️ YAPISAL TEKNİK BORÇ

### 26. `src/server.ts` Büyüklüğü
- **Şu an:** 5093 satır
- **Hedef:** <500 satır (sadece app setup + route mounting)

### 27. Inline CSS/JS Büyüklüğü
- **Dashboard template literal:** ~3000 satır HTML+CSS+JS
- **Hedef:** Ayrı `.ts` dosyalarında fonksiyonlar + inline CSS sadece unique stiller

### 28. Magic Numbers
- **Örnekler:** `60_000` (idle timeout), `30_000` (health check), `90_000` (ngrok timeout)
- **Konum:** `colab-manager.ts` — sabit olarak tanımlı (iyi)
- **Kontrol:** Diğer dosyalarda dağılmış magic number'lar env değişkenine alınmalı

### 29. Error Handling Inconsistency
- **Durum:** Bazı yerlerde try/catch var, bazı yerlerde unhandled promise rejection
- **Çözüm:** Global error middleware + tüm async route'lar uniform error handling

### 30. TypeScript Strict Mode
- **Durum:** `strict: true` muhtemelen aktif ama bazı yerlerde `any` kullanımı var
- **Çözüm:** Tüm `any`'leri narrow et (audit için `grep ": any" src/`)

---

## 📋 DIŞ ÖNCELİKLER (Kullanıcı/İş Kararları)

- [ ] **Acil:** Kullanıcı leaked ngrok token'ı iptal edecek ve yenisiyle değiştirecek
- [ ] **Acil:** Takım biri `wav2lip.pth`'yi HuggingFace'e yükleyecek
- [ ] **Kısa vade:** Gerçek Colab GPU bütçesi planlanmalı (kullanıcı sayısına göre)
- [ ] **Kısa vade:** Cloudflare Tunnel alternatifi değerlendirilmeli (ngrok bandwidth)
- [ ] **Orta vade:** Production deployment stratejisi (VPS, Kubernetes, vs.)
- [ ] **Uzun vade:** Kendi GPU sunucusu maliyet/fayda analizi

---

## 🔗 İLGİLİ DOSYALAR

- [TODO.md](TODO.md) — Temel proje checklist
- [CLAUDE.md](CLAUDE.md) — Proje dokümantasyonu (güncel)
- [PROJECT_STATUS.md](PROJECT_STATUS.md) — Sprint durumları
- [docs/superpowers/specs/](docs/superpowers/) — Tasarım şartnameleri
- [docs/adr/](docs/adr/) — Mimari karar kayıtları

