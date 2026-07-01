# Uyumluluk Analizi â€” Mevcut YapÄ± ile Ã‡akÄ±ÅŸma Matrisi

**Kural:** HiÃ§bir yeni Ã¶zellik mevcut dosyayÄ± silmez/taÅŸÄ±maz. Her ÅŸey **ekleme** veya **opsiyonel geniÅŸletme** ÅŸeklindedir.

---

## Ã‡akÄ±ÅŸma Matrisi

| Yeni Ã–zellik (Job) | Mevcut KarÅŸÄ±lÄ±ÄŸÄ± | Ã‡akÄ±ÅŸma? | Strateji |
|---|---|---|---|
| **SwiftClip (32 template)** (1A) | `RemotionVideo.tsx` (1 kompozisyon) | âŒ YOK | YanÄ±na yeni `.tsx` dosyalarÄ± |
| **Niche Profile** (1B) | Mevcut prompt mÃ¼hendisliÄŸi | âŒ YOK | ÃœstÃ¼ne konfigÃ¼rasyon katmanÄ± |
| **SD/Flux GÃ¶rsel Motor** (1C) | `src/routes/bRoll.ts` (Pexels) | âŒ YOK | Docker SD geniÅŸletilir, API baÄŸÄ±mlÄ±lÄ±ÄŸÄ± kalkar |
| **LangGraph grafiÄŸi** (2A) | `multiAgentPipeline.ts` | âŒ YOK | Alternatif pipeline, mevcut deÄŸiÅŸmez |
| **Edit Agent + Undo** (2B) | `chatToEdit.ts` | âŒ YOK | Mevcut servisi geniÅŸletir |
| **Storyboard Agent** (2C) | `mllmValidator.ts`, `ragScriptGenerator.ts` | âŒ YOK | Yeni servis, mevcutlarÄ± kullanÄ±r |
| **Task State Machine** (3A) | `queue.ts` state yÃ¶netimi | âŒ YOK | Mevcut yapÄ±yÄ± formalize eder |
| **Split + MuseTalk** (3B = Job-2) | Faz C (planlanmÄ±ÅŸ) | âŒ YOK | HeyGen/Tavus yerine MuseTalk self-hosted |
| **Cut & Color** (3C = Job-4) | `colorGrader.ts` (mevcut) | âŒ YOK | Sessizlik kesici + NL renk + LUT |
| **Smart Dubbing** (4A = Job-3) | `beatSyncEditor.ts`, `transcriptEditor.ts`, `autoDubbing.ts` | âŒ YOK | 3 servis de mevcut, queue baÄŸlanacak |
| **Dynamic Subtitles** (4B = Job-5) | `DynamicCaptions.tsx`, `subtitleRenderer.ts` | âŒ YOK | V2 animasyon + faster-whisper + ASS fix |
| **AI Studio** (4C = Job-6) | Docker eye-contact/inpaint endpoint'leri | âŒ YOK | Eye contact, studio sound, reframe, inpaint |
| **Viral Engine** (5A = Job-7) | `aiBroll.ts`, `viralHookGenerator.ts` | âŒ YOK | B-Roll + hook + duygu + hashtag |
| **Multi-Brand Theming** (5B) | UI tema sistemi | âŒ YOK | FarklÄ± domain (UI vs video temasÄ±) |
| **MCP Tools v2** (5B) | `mcpServer.ts` (5 tool) | âŒ YOK | 10 yeni tool eklenir |
| **Production Checklist** (5C) | TODO.md prod check list | âŒ YOK | 17 yeni test dosyasÄ± |
| **Faz 7A** (Statik Analiz) | `scripts/scan-*.ts` | âŒ YOK | Yeni script, mevcut kodu okur |
| **Faz 7B** (Birim Test) | `tests/unit/faz*/` | âŒ YOK | Yeni dosyalar, mevcut deÄŸiÅŸmez |
| **Faz 7C** (Entegrasyon) | `tests/integration/` | âŒ YOK | Yeni dosya |
| **Faz 7D** (E2E) | `tests/e2e/` | âŒ YOK | Yeni dosya |
| **Faz 7E** (CI) | `.github/workflows/test.yml` | âŒ YOK | Yeni dosya + vitest.config geniÅŸleme |

---

## Dosya BazÄ±nda DeÄŸiÅŸim Analizi

### HiÃ§ Dokunulmayacak Dosyalar
```
docker_image/server.py      (Docker container â€” minor geniÅŸleme: Flux/MuseTalk endpoint)
docker_image/setup.py       (Docker kurulum â€” deÄŸiÅŸmez)
src/publisher.ts            (Playwright â€” deÄŸiÅŸmez)
src/server.ts               (Express giriÅŸ â€” route mount eklenir)
src/db.ts                   (VeritabanÄ± ÅŸemasÄ± â€” minor geniÅŸleme)
```

### Sadece Queue/UI BaÄŸlantÄ±sÄ± Eklenecek Dosyalar (6 Job)
| Dosya | Ne Eklenecek |
|---|---|
| `src/routes/bRoll.ts` | SD/Flux gÃ¶rsel endpoint |
| `src/services/colorGrader.ts` | LUT yÃ¼kleme, NL color queue |
| `src/services/beatSyncEditor.ts` | RabbitMQ queue entegrasyonu |
| `src/services/transcriptEditor.ts` | RabbitMQ queue entegrasyonu |
| `src/services/autoDubbing.ts` | Ã‡oklu dil UI |
| `src/services/subtitleRenderer.ts` | ASS Windows fix |
| `src/services/aiBroll.ts` | Multi-model B-Roll |
| `src/services/viralHookGenerator.ts` | Frontend baÄŸlantÄ±sÄ± |

### Yeni Servis DosyalarÄ±
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

## Paralel Ã‡alÄ±ÅŸma Garantisi

```
Grup 1 (AnÄ±nda â€” 6 track):
  â”œâ”€â”€ 1A (Templates)      â†’ yeni .tsx dosyalarÄ±
  â”œâ”€â”€ 1B (Niche Profile)  â†’ yeni servis
  â”œâ”€â”€ 1C (SD/Flux)        â†’ Docker endpoint + yeni servis
  â”œâ”€â”€ 3B (Split/Job-2)    â†’ yeni servis
  â”œâ”€â”€ 3C (Cut&Color/Job-4) â†’ mevcut + yeni servis
  â””â”€â”€ 4B (AltyazÄ±/Job-5)  â†’ mevcut + yeni servis
  â†’ FarklÄ± domain'ler, aynÄ± dosyaya yazmaz

Grup 2 (Grup 1 ile paralel â€” 5 track):
  â”œâ”€â”€ 2A (LangGraph)      â†’ yeni pipeline
  â”œâ”€â”€ 2B (Edit Agent)     â†’ mevcut servisi geniÅŸletir
  â”œâ”€â”€ 2C (Storyboard)     â†’ yeni servis
  â”œâ”€â”€ 4A (Dublaj/Job-3)   â†’ mevcut 3 servisi queue'ya baÄŸla
  â””â”€â”€ 4C (AI Studio/Job-6)â†’ mevcut Docker endpoint'leri + yeni servis

Grup 3 (Grup 2 sonrasÄ± â€” 2 track):
  â”œâ”€â”€ 3A (State Machine)  â†’ queue geniÅŸletme
  â””â”€â”€ 5A (Viral/Job-7)    â†’ mevcut + yeni servis

Grup 4 (Hepsi sonrasÄ± â€” 2 track):
  â”œâ”€â”€ 5B (Brand+MCP)      â†’ yeni servis + MCP geniÅŸletme
  â””â”€â”€ 5C (Prod Checklist) â†’ 17 yeni test dosyasÄ±
```

## Faz 7 â€” Test Dosya YapÄ±sÄ±

Faz 7 tÃ¼m mevcut dosyalarÄ± **okur** ama hiÃ§birini **deÄŸiÅŸtirmez**. Sadece `tests/` dizinine yeni dosyalar ekler.

| Track | Yeni Dosyalar | Mevcut Dosyalara MÃ¼dahale |
|---|---|---|
| **7A** | `scripts/scan-hardcoded-strings.ts`, `scripts/scan-typos.ts` | âŒ Yok (sadece okur) |
| **7B** | `tests/unit/faz1/`, `faz2/`, `faz3/`, `faz4/`, `faz5/`, `core/` | âŒ Yok |
| **7C** | `tests/integration/full-pipeline.test.ts` | âŒ Yok |
| **7D** | `tests/e2e/user-flows.spec.ts` | âŒ Yok |
| **7E** | `tests/factories/jobFactory.ts`, `tests/mocks/dockerServer.ts`, `.github/workflows/test.yml` | âŒ Yok (vitest.config.ts minor geniÅŸleme) |

**Ã‡akÄ±ÅŸma:** Yok. TÃ¼m Faz 7 track'leri sadece `tests/` ve `scripts/` dizinlerine yazar. Faz 1-6 ile aynÄ± anda paralel Ã§alÄ±ÅŸtÄ±rÄ±labilir.

---

HiÃ§bir track aynÄ± dosyaya aynÄ± anda yazmaz.
