# Memory Bank — 2026-06-29

## Son Oturum
- Konu: Guideline entegrasyonu (3 side-effect, TDE, Fresh Chat, diff.md, Memory_Bank)
- Değişen dosyalar:
  - `AGENTS.md` — yeni kurallar eklendi (3 side-effect, TDE, Fresh Chat, Memory_Bank, diff.md)
  - `AI_GUIDELINES.md` — diff format + diff.md loglama kuralı
  - `Memory_Bank.md` — yeni dosya (oluşturuldu)
  - `diff.md` — yeni dosya (boş log)
  - `.gitignore` — Memory_Bank.md, diff.md, AI_GUIDELINES.md exception eklendi
  - `PROJECT_STATUS.md` — güncellendi
  - `TODO.md` — güncellendi
- commit: (bekliyor)

## Mevcut Durum
- Tüm testler geçiyor
- tsc --noEmit: 0 hata
- eslint --quiet: 0 hata (pre-existing hatalar SplitScreenPanel.tsx + fix_all_remaining.mjs)
- Toplam test: 500+

## Bilinen Sorunlar
- model_parameters_and_prompts.md gitignored (değişiklikler diskte kalır, commitlenmez)
- TEST_AND_MOCK_GUARDRAILS.md'ye rağmen mock kullanan testler var (ayrı fazda çözülecek)
- RunPod eksi bakiye, canlı testler bekliyor

## Sonraki Adım
1. Barrel exports Python script — services/index.ts + import refactor
2. Internal constants — magic number/timeout/API URL'leri tek dosyada
3. Config consolidation — .env mantıksal gruplama
4. diff.md'ye bu değişiklikleri yaz
