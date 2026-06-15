# Uyumluluk Analizi — Mevcut Yapı ile Çakışma Matrisi

**Kural:** Hiçbir yeni özellik mevcut dosyayı silmez/taşımaz. Her şey **ekleme** veya **opsiyonel genişletme** şeklindedir.

---

## Çakışma Matrisi

| Yeni Özellik (Job) | Mevcut Karşılığı | Çakışma? | Strateji |
|---|---|---|---|
| **SwiftClip (32 template)** (1A) | `RemotionVideo.tsx` (1 kompozisyon) | ❌ YOK | Yanına yeni `.tsx` dosyaları |
| **Niche Profile** (1B) | Mevcut prompt mühendisliği | ❌ YOK | Üstüne konfigürasyon katmanı |
| **SD/Flux Görsel Motor** (1C) | `src/routes/bRoll.ts` (Pexels) | ❌ YOK | Colab SD genişletilir, API bağımlılığı kalkar |
| **LangGraph grafiği** (2A) | `multiAgentPipeline.ts` | ❌ YOK | Alternatif pipeline, mevcut değişmez |
| **Edit Agent + Undo** (2B) | `chatToEdit.ts` | ❌ YOK | Mevcut servisi genişletir |
| **Storyboard Agent** (2C) | `mllmValidator.ts`, `ragScriptGenerator.ts` | ❌ YOK | Yeni servis, mevcutları kullanır |
| **Task State Machine** (3A) | `queue.ts` state yönetimi | ❌ YOK | Mevcut yapıyı formalize eder |
| **Split + MuseTalk** (3B = Job-2) | Faz C (planlanmış) | ❌ YOK | HeyGen/Tavus yerine MuseTalk self-hosted |
| **Cut & Color** (3C = Job-4) | `colorGrader.ts` (mevcut) | ❌ YOK | Sessizlik kesici + NL renk + LUT |
| **Smart Dubbing** (4A = Job-3) | `beatSyncEditor.ts`, `transcriptEditor.ts`, `autoDubbing.ts` | ❌ YOK | 3 servis de mevcut, queue bağlanacak |
| **Dynamic Subtitles** (4B = Job-5) | `DynamicCaptions.tsx`, `subtitleRenderer.ts` | ❌ YOK | V2 animasyon + faster-whisper + ASS fix |
| **AI Studio** (4C = Job-6) | Colab eye-contact/inpaint endpoint'leri | ❌ YOK | Eye contact, studio sound, reframe, inpaint |
| **Viral Engine** (5A = Job-7) | `aiBroll.ts`, `viralHookGenerator.ts` | ❌ YOK | B-Roll + hook + duygu + hashtag |
| **Multi-Brand Theming** (5B) | UI tema sistemi | ❌ YOK | Farklı domain (UI vs video teması) |
| **MCP Tools v2** (5B) | `mcpServer.ts` (5 tool) | ❌ YOK | 10 yeni tool eklenir |
| **Production Checklist** (5C) | TODO.md prod check list | ❌ YOK | 17 yeni test dosyası |
| **Faz 7A** (Statik Analiz) | `scripts/scan-*.ts` | ❌ YOK | Yeni script, mevcut kodu okur |
| **Faz 7B** (Birim Test) | `tests/unit/faz*/` | ❌ YOK | Yeni dosyalar, mevcut değişmez |
| **Faz 7C** (Entegrasyon) | `tests/integration/` | ❌ YOK | Yeni dosya |
| **Faz 7D** (E2E) | `tests/e2e/` | ❌ YOK | Yeni dosya |
| **Faz 7E** (CI) | `.github/workflows/test.yml` | ❌ YOK | Yeni dosya + vitest.config genişleme |

---

## Dosya Bazında Değişim Analizi

### Hiç Dokunulmayacak Dosyalar
```
colab_server.py             (Colab katmanı — minor genişleme: Flux/MuseTalk endpoint)
colab_setup.py              (Colab kurulum — değişmez)
src/publisher.ts            (Playwright — değişmez)
src/server.ts               (Express giriş — route mount eklenir)
src/db.ts                   (Veritabanı şeması — minor genişleme)
```

### Sadece Queue/UI Bağlantısı Eklenecek Dosyalar (6 Job)
| Dosya | Ne Eklenecek |
|---|---|
| `src/routes/bRoll.ts` | SD/Flux görsel endpoint |
| `src/services/colorGrader.ts` | LUT yükleme, NL color queue |
| `src/services/beatSyncEditor.ts` | RabbitMQ queue entegrasyonu |
| `src/services/transcriptEditor.ts` | RabbitMQ queue entegrasyonu |
| `src/services/autoDubbing.ts` | Çoklu dil UI |
| `src/services/subtitleRenderer.ts` | ASS Windows fix |
| `src/services/aiBroll.ts` | Multi-model B-Roll |
| `src/services/viralHookGenerator.ts` | Frontend bağlantısı |

### Yeni Servis Dosyaları
| Dizin | Track |
|---|---|
| `src/services/splitScreen/` | 3B (Job-2) |
| `src/services/silenceCutter/` | 3C (Job-4) |
| `src/services/dubbing/` | 4A (Job-3) |
| `src/services/subtitleEngine/` | 4B (Job-5) |
| `src/services/aiStudio/` | 4C (Job-6) |
| `src/services/viralEngine/` | 5A (Job-7) |
| `src/services/brandManager/` | 5B |
| `src/services/taskManager/` | 3A |

---

## Paralel Çalışma Garantisi

```
Grup 1 (Anında — 6 track):
  ├── 1A (Templates)      → yeni .tsx dosyaları
  ├── 1B (Niche Profile)  → yeni servis
  ├── 1C (SD/Flux)        → Colab endpoint + yeni servis
  ├── 3B (Split/Job-2)    → yeni servis
  ├── 3C (Cut&Color/Job-4) → mevcut + yeni servis
  └── 4B (Altyazı/Job-5)  → mevcut + yeni servis
  → Farklı domain'ler, aynı dosyaya yazmaz

Grup 2 (Grup 1 ile paralel — 5 track):
  ├── 2A (LangGraph)      → yeni pipeline
  ├── 2B (Edit Agent)     → mevcut servisi genişletir
  ├── 2C (Storyboard)     → yeni servis
  ├── 4A (Dublaj/Job-3)   → mevcut 3 servisi queue'ya bağla
  └── 4C (AI Studio/Job-6)→ mevcut Colab endpoint'leri + yeni servis

Grup 3 (Grup 2 sonrası — 2 track):
  ├── 3A (State Machine)  → queue genişletme
  └── 5A (Viral/Job-7)    → mevcut + yeni servis

Grup 4 (Hepsi sonrası — 2 track):
  ├── 5B (Brand+MCP)      → yeni servis + MCP genişletme
  └── 5C (Prod Checklist) → 17 yeni test dosyası
```

## Faz 7 — Test Dosya Yapısı

Faz 7 tüm mevcut dosyaları **okur** ama hiçbirini **değiştirmez**. Sadece `tests/` dizinine yeni dosyalar ekler.

| Track | Yeni Dosyalar | Mevcut Dosyalara Müdahale |
|---|---|---|
| **7A** | `scripts/scan-hardcoded-strings.ts`, `scripts/scan-typos.ts` | ❌ Yok (sadece okur) |
| **7B** | `tests/unit/faz1/`, `faz2/`, `faz3/`, `faz4/`, `faz5/`, `core/` | ❌ Yok |
| **7C** | `tests/integration/full-pipeline.test.ts` | ❌ Yok |
| **7D** | `tests/e2e/user-flows.spec.ts` | ❌ Yok |
| **7E** | `tests/factories/jobFactory.ts`, `tests/mocks/colabServer.ts`, `.github/workflows/test.yml` | ❌ Yok (vitest.config.ts minor genişleme) |

**Çakışma:** Yok. Tüm Faz 7 track'leri sadece `tests/` ve `scripts/` dizinlerine yazar. Faz 1-6 ile aynı anda paralel çalıştırılabilir.

---

Hiçbir track aynı dosyaya aynı anda yazmaz.
