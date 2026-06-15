# v6.0 Yol Haritası — AI Publisher

**Tarih:** 15 Haziran 2026 (Güncellendi)
**Versiyon:** v5.9 → v6.0 (5 Faz, 15 Paralel Track)

---

## Genel Bakış

Projenin mevcut güçlü temeli üzerine (multi-agent pipeline, Remotion, Playwright, Colab GPU) rakiplerden ayrışmak için 5 fazlı geliştirme planı. Her faz paralel işlenebilen 3 track içerir.

## Mimari Kararlar (15 Haziran 2026)

| Karar | Seçim | Alternatif(ler) | Gerekçe |
|---|---|---|---|
| **Cloud Platform** | **GCP** | AWS | T4 GPU $0.16/hr (AWS $0.53), Gemini native, TPU opsiyonu, scale-to-zero |
| **Ödeme** | **Iyzico** | Stripe | Stripe Türkiye'de desteklenmez. Iyzico %2.39+0.25TL, taksit, subscription |
| **Avatar/Lip-Sync** | **MuseTalk + Wav2Lip** (self-hosted) | HeyGen ($24/ay), Tavus (~$30/ay) | Sıfır maliyet, Colab GPU'da çalışır, Wav2Lip zaten mevcut |
| **Video Kişiselleştirme** | **Remotion** (self-hosted) | Tavus | Zaten projede var, ek maliyet yok |
| **Görsel Kaynak** | **Stable Diffusion / Flux** (Colab) | Pexels (rate limited) | Sıfır API bağımlılığı, sınırsız üretim |
| **LLM Fallback** | Anthropic/Minimax M3 | — | Gemini yetersiz kalırsa yedek |
| **TalkShow Çoklu Karakter** | OpenRouter + ZEN (free modeller) | — | Her karakter farklı model, halüsinasyon önleme |
| **DeepSeek** | **KALDIRILDI** | — | Kullanılmıyor |

## Fazlar

| Faz | Odak | Track Sayısı | Kapsadığı Job'lar |
|---|---|---|---|
| **Faz 1** | Remotion Stüdyo & Görsel Motor | 3 | — |
| **Faz 2** | LangGraph Multi-Agent Grafiği | 3 | — |
| **Faz 3** | Split Screen & Color Suite | 3 | **Job-2** (Split+Avatar), **Job-4** (Cut&Color) |
| **Faz 4** | Dubbing, Altyazı & AI Stüdyo | 3 | **Job-3** (Dublaj), **Job-5** (Altyazı), **Job-6** (AI Kurgu) |
| **Faz 5** | Viral & Production Readiness | 3 | **Job-7** (Viral), Multi-Brand, Prod Checklist |
| **Faz 7** | Testing & QA | 5 | Statik analiz, birim test, entegrasyon, E2E, CI |

## Bağımlılık Haritası

```
Faz 1 ──────────────────────────────────┐
  ├─ 1A (Remotion Templates) ──┐        │
  ├─ 1B (Niche Profiles) ──────┤ (bağımsız)
  └─ 1C (SD/Flux Görsel Motor) ┘        │
                                         ▼
Faz 2 ──── 2A (LangGraph) ← opsiyonel   Faz 3 ──── 3A (State Machine) ← 2A
  ├─ 2B (Edit Agent) ─────────┤            ├─ 3B (Split+Avatar/Job-2) ← bağımsız
  └─ 2C (Storyboard) ─────────┤            └─ 3C (Cut&Color/Job-4) ← bağımsız
                               ▼
                         Faz 4 ──── 4A (Dublaj/Job-3) ← 3C
                           ├─ 4B (Altyazı/Job-5) ← bağımsız
                           └─ 4C (AI Stüdyo/Job-6) ← bağımsız
                               ▼
                         Faz 5 ──── 5A (Viral/Job-7) ← 4A + 4B
                           ├─ 5B (Brand+MCP) ← 1A + 2A
                           └─ 5C (Prod Checklist) ← her şey
                               ▼
                         Faz 7 ──── 7A (Statik) ← her şey
                           ├─ 7B (Birim Test) ← her şey
                           ├─ 7C (Entegrasyon) ← 7B
                           ├─ 7D (E2E) ← 7C
                           └─ 7E (CI Altyapı) ← her şey
```

## Paralel Başlatılabilir Track'ler

| Grup | Track'ler | Açıklama |
|---|---|---|
| **Grup 1** (anında) | **1A, 1B, 1C, 3B, 3C, 4B** | 6 track paralel — hiçbir bağımlılığı yok |
| **Grup 2** (Grup 1 ile paralel) | **2A, 2B, 2C, 4A, 4C** | LangGraph + dublaj + AI stüdyo |
| **Grup 3** (Grup 2 sonrası) | **3A, 5A** | State machine + viral motor |
| **Grup 4** (hepsi sonrası) | **5B, 5C, 7A, 7B, 7E** | Brand + prod checklist + statik test + birim test + CI altyapı |
| **Grup 5** (Faz 5 ile paralel) | **7C, 7D** | Entegrasyon testi (7B sonrası), E2E testi (7C sonrası) |

## Referans Repolar
