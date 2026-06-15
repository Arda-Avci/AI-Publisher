# Faz 7: Testing & Quality Assurance

**Bağımlılık:** Faz 1-6 tamamlandıktan sonra (veya paralel)
**Süre:** 5-7 gün
**Paralel Grup:** Grup 5 (hepsi sonrası, Faz 5 ile kısmen paralel)

---

## Genel Bakış

Tüm Faz 1-6 özelliklerini kapsayan 5 katmanlı test mimarisi. Her track farklı test türüne odaklanır, aynı dosyaya yazmaz.

```
Faz 7 Test Piramidi:
        ┌──────────┐
        │  7D E2E  │  ← Playwright ile UI + publishing
        ├──────────┤
        │ 7C Ent.  │  ← Colab mock, queue, SSE, API routes
        ├──────────┤
        │ 7B Birim │  ← Vitest ile tüm servisler
        ├──────────┤
        │ 7A Statik│  ← ESLint, hardcoded text, typo, tsc
        └──────────┘
```

---

## Track 7A: Statik Analiz & Kod Kalitesi (Grup 5)

**Ne test edilir:** Kaynak kod kalitesi, sabit kontroller, tip güvenliği

| Test | Araç | Kapsam | Hedef |
|---|---|---|---|
| ESLint strict | `eslint --quiet` | Tüm `src/` | 0 warning, 0 error |
| TypeScript strict | `tsc --noEmit` strict | Tüm `src/` | 0 error |
| Hardcoded metin tarama | Custom script | `src/**/*.ts`, `src/**/*.tsx` | Tüm kullanıcı metinleri i18n/DB |
| Typo/bug dedektörü | Custom regex | `src/**/*.ts` | `console.log`, `as any`, `!` non-null |
| Bağımlılık güncelleme | `npm audit` | `package.json` | 0 critical, 0 high |
| Format kontrolü | Prettier | Tüm `src/` | Fark yok |

**Hardcoded Metin Tarama Kuralı:** Kullanıcıya gösterilen her metin ya i18n fonksiyonundan (`t()`) ya da DB'den gelmeli. `"Hata oluştu"`, `"İşlem başarılı"` gibi doğrudan JSX/TS içindeki string'ler flag'lenir.

**Çıktı:** `scripts/scan-hardcoded-strings.ts` + `scripts/scan-typos.ts`

---

## Track 7B: Birim Testleri — Vitest (Grup 5)

**Ne test edilir:** Her servis için izole birim testleri

| Test Grubu | Dosya | Test Sayısı (tahmini) |
|---|---|---|
| **Faz 1 — Remotion Studio** | `tests/unit/faz1/*.test.ts` | 12 |
| Template rendering | `templates.test.ts` | 4 |
| Niche profile engine | `nicheProfile.test.ts` | 4 |
| SD/Flux integration | `sdFlux.test.ts` | 4 |
| **Faz 2 — LangGraph Agent** | `tests/unit/faz2/*.test.ts` | 15 |
| Graph state machine | `langGraph.test.ts` | 5 |
| Edit agent | `editAgent.test.ts` | 5 |
| Storyboard agent | `storyboard.test.ts` | 5 |
| **Faz 3 — Production Pipeline** | `tests/unit/faz3/*.test.ts` | 18 |
| Task state machine | `taskStateMachine.test.ts` | 6 |
| Split screen + MuseTalk | `splitScreen.test.ts` | 6 |
| Cut & Color | `cutColor.test.ts` | 6 |
| **Faz 4 — Premium AI** | `tests/unit/faz4/*.test.ts` | 18 |
| Smart dubbing | `dubbing.test.ts` | 6 |
| Dynamic subtitles | `subtitles.test.ts` | 6 |
| AI Studio | `aiStudio.test.ts` | 6 |
| **Faz 5 — Production Ready** | `tests/unit/faz5/*.test.ts` | 15 |
| Viral engine | `viralEngine.test.ts` | 5 |
| Brand manager | `brandManager.test.ts` | 5 |
| MCP tools | `mcpTools.test.ts` | 5 |
| **Çekirdek (Core)** | `tests/unit/core/*.test.ts` | 20 |
| DB operations | `db.test.ts` | 5 |
| Queue logic | `queue.test.ts` | 5 |
| SSE broadcast | `sse.test.ts` | 5 |
| Publisher | `publisher.test.ts` | 5 |
| **Toplam** | | **~98 test** |

**Her test şunları içermeli:**
- Normal akış (happy path)
- Hata senaryosu (error path)
- Edge case (boş girdi, sınır değer)
- Mock veri ile izolasyon (Colab çağrısı yok)

---

## Track 7C: Entegrasyon Testleri (Grup 5)

**Ne test edilir:** Servisler arası iletişim, Colab mock, RabbitMQ, SSE, API route'ları

| Test | Açıklama | Süre |
|---|---|---|
| **Colab Mock Testi** | `MOCK_COLAB=true` ile tüm pipeline | ~30sn |
| **Queue Sıralama** | 3 iş ardışık → doğru sırada çalıştığını doğrula | ~10sn |
| **SSE Broadcast** | 2 client → her ikisi de progress alıyor mu | ~5sn |
| **FFmpeg Montaj** | 3 sahne → concat + subtitle burn-in doğrula | ~15sn |
| **API Route'ları** | Her endpoint 200/400/401 döndürüyor mu | ~10sn |
| **Session/Cookie** | Login → session → logout → 401 bekleniyor | ~5sn |
| **Dosya Yükleme** | Multer ile 10MB video yükleme testi | ~5sn |
| **RabbitMQ** | Mesaj gönder/al, kuyruk boş | ~10sn |

**Test Dosyası:** `tests/integration/full-pipeline.test.ts`

---

## Track 7D: E2E Testleri — Playwright (Grup 5)

**Ne test edilir:** Tarayıcıda gerçek kullanıcı akışları

| Senaryo | Açıklama |
|---|---|
| **Login akışı** | Login formu → dashboard görünüyor |
| **Yeni proje oluşturma** | Form doldur → queue'ya ekle → SSE progress gör |
| **Video galerisi** | Tamamlanan videolar listeleniyor |
| **Başlık/hashtag düzenleme** | AI üretilen metni değiştir → DB'ye kaydet |
| **Platform publishing** | Yayınla butonu → publisher tetikleniyor |
| **Progress bar** | Canlı ilerleme çubuğu doğru yüzde gösteriyor |
| **Responsive** | 375px, 768px, 1440px breakpoint'ler |

**Test Dosyası:** `tests/e2e/user-flows.spec.ts`

---

## Track 7E: Test Altyapısı & CI (Grup 5)

**Ne kurulur:** Mock veri fabrikası, CI pipeline, coverage raporu

| Bileşen | Açıklama |
|---|---|
| **Mock Data Factory** | `tests/factories/jobFactory.ts` — test verisi üretme |
| **Colab Mock Server** | `tests/mocks/colabServer.ts` — Express ile sahte Colab |
| **CI Pipeline** | `.github/workflows/test.yml` — push/PR'de test |
| **Coverage Threshold** | `vitest.config.ts` — `branches: 80, functions: 80, lines: 85` |
| **Test Raporu** | `scripts/generate-test-report.ts` — HTML rapor |

---

## Test Dosya Yapısı

```
tests/
├── unit/
│   ├── core/
│   │   ├── db.test.ts
│   │   ├── queue.test.ts
│   │   ├── sse.test.ts
│   │   └── publisher.test.ts
│   ├── faz1/
│   │   ├── templates.test.ts
│   │   ├── nicheProfile.test.ts
│   │   └── sdFlux.test.ts
│   ├── faz2/
│   │   ├── langGraph.test.ts
│   │   ├── editAgent.test.ts
│   │   └── storyboard.test.ts
│   ├── faz3/
│   │   ├── taskStateMachine.test.ts
│   │   ├── splitScreen.test.ts
│   │   └── cutColor.test.ts
│   ├── faz4/
│   │   ├── dubbing.test.ts
│   │   ├── subtitles.test.ts
│   │   └── aiStudio.test.ts
│   └── faz5/
│       ├── viralEngine.test.ts
│       ├── brandManager.test.ts
│       └── mcpTools.test.ts
├── integration/
│   └── full-pipeline.test.ts
├── e2e/
│   └── user-flows.spec.ts
├── factories/
│   └── jobFactory.ts
├── mocks/
│   └── colabServer.ts
└── vitest.config.ts
```

---

## Çalıştırma Komutları

```bash
# Tüm testler
npm run check

# Sadece Faz 7
npx vitest run tests/unit/faz7/ tests/integration/ tests/e2e/

# Coverage
npx vitest run --coverage

# Tek faz
npx vitest run tests/unit/faz3/

# E2E (Playwright görünür tarayıcı)
npx playwright test tests/e2e/
```

---

## Başarı Kriteri

- `npm run check` (typecheck + lint + test) → 0 hata
- Coverage: en az %80 branch, %85 line
- Hardcoded metin: 0 flag
- Tüm E2E senaryolar yeşil
- CI pipeline'da 3 platform (ubuntu, mac, windows) geçiyor
