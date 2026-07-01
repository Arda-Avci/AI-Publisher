# Ölü Kod Denetim Raporu

**Tarih:** 28 Haziran 2026
**Kapsam:** `src/` dizini (spec dosyaları hariç)

---

## 1. Orphan Dosyalar (Hiçbir yerde import edilmeyen)

| # | Dosya | Açıklama |
|---|-------|----------|
| 1 | `src/AdvancedVideoQueueManager.ts` | Eski video kuyruk yöneticisi, hiçbir yerde referans yok |
| 2 | `src/ffmpeg-worker.ts` | Worker thread, hiçbir yerde import edilmemiş |
| 3 | `src/testServer.ts` | Kendi içeriğinde "obsolete" olarak işaretlenmiş |
| 4 | `src/hooks/useLanguage.ts` | React hook, hiçbir bileşende kullanılmıyor |
| 5 | `src/lib/transcript.ts` | YouTube transcript fonksiyonu, import eden yok |
| 6 | `src/lib/storage.ts` | Storage helper, import eden yok |
| 7 | `src/lib/metrics.ts` | Metrics helper, import eden yok |
| 8 | `src/workers/ffmpeg-pool-worker.ts` | Worker thread, referanssız |
| 9 | `src/workers/face-track-worker.ts` | Worker thread, referanssız |
| 10 | `src/components/PreProductionApprovalModal.tsx` | React bileşeni, hiçbir yerde kullanılmıyor |

---

## 2. Kullanılmayan Export'lar

### `src/constants.ts`
- `FILE_LIMITS`
- `SCENE_DEFAULTS`
- `AI_DEFAULTS`
- `CREDIT_COSTS`
- `MODEL_DEFAULTS`
- `PLATFORM_DEFAULTS`

---

## 3. Kullanılmayan Import

Tüm import'lar kullanılıyor — sorun yok.

---

## Not

- `*.spec.ts` dosyaları kapsam dışı bırakıldı (test import'ları beklenen davranış)
- `*.d.ts` dosyaları kapsam dışı bırakıldı (TypeScript deklarasyon dosyaları)
- `__fixtures__/` ve `test-utils/` dizinleri kapsam dışı bırakıldı
