# YapÄ±lacaklar Listesi (TODO)

## ğŸ”´ Frontend Eksik Ã–zellikler (28 Haz 2026)

### Faz 1 â€” Kredi/Ã–deme Sistemi (Paralel)
- [x] CreditsPanel.tsx â€” Kredi bakiyesi, limit, iÅŸlem geÃ§miÅŸi
- [x] PaymentsPanel.tsx â€” iyzico Ã¶deme planlarÄ± ve checkout
- [x] SubscriptionsPanel.tsx â€” Abonelik yÃ¶netimi

### Faz 2 â€” Admin Panelleri (Paralel)
- [x] AuditLogPanel.tsx â€” Admin denetim kayÄ±tlarÄ±
- [x] DockerStatusPanel.tsx â€” Docker container durumlarÄ±

### Faz 3 â€” EditÃ¶r Ã–zellikleri (Paralel)
- [x] BeatSyncPanel.tsx â€” Beat senkronizasyonu
- [x] BRollPanel.tsx â€” B-Roll yÃ¶netimi
- [x] CutPanel.tsx â€” Video kÄ±rpma
- [x] TranscriptEditorPanel.tsx â€” Transkript dÃ¼zenleme

### Faz 4 â€” AI Ã–zellikleri (Paralel)
- [x] PipecatPanel.tsx â€” Ses/Video pipeline
- [x] LoRAPanel.tsx â€” LoRA model yÃ¶netimi
- [x] DocumentUploadPanel.tsx â€” DokÃ¼man yÃ¼kleme
- [x] NichePanel.tsx â€” Niche profilleri

### Faz 5 â€” Entegrasyon
- [x] Progress SSE â€” zaten mevcut (App.tsx, GalleryPanel, TalkShowEditor)

## âœ… Tamamlananlar
- [x] Tema altyapÄ±sÄ± (d-note'dan uyarlandÄ±)
- [x] CSRF token login fix
- [x] ENCRYPTION_KEY eklendi
- [x] 3 base image stratejisi
- [x] HF_TOKEN entegrasyonu
- [x] Prompt parametre eÅŸleÅŸtirme
- [x] B2 dosya yolu fix
- [x] ModalClient entegrasyonu (queue.ts zaten kullanÄ±yor)
- [x] 13 yeni frontend bileÅŸeni + App.tsx entegrasyonu

## ğŸŸ¢ Faz Z4 â€” Modal 3-Service Architecture (1 Tem 2026)
- [x] Karar: 25 per-model â†’ 3 servis (audio/image/video)
- [x] `_run_generate` Flask test_client fix (core bug: `app.generate()` yoktu)
- [x] Weight download graceful skip (`except Exception` ile HF auth hatasÄ± yut)
- [x] `HF_TOKEN` case-insensitive fix (`__init__.py`)
- [x] TÃ¼m 3 servis deploy edildi (modal deploy basarili)
- [x] Test: 8 model PASS (kokoro, xtts, whisper, f5tts, audioldm2, wav2lip, sadtalker, musetalk)
- [x] Test: 6 model FAIL (geneface, videoretalking, browseruse, stablediffusion, 2 untested)
- [x] geneface fix: subprocess timeout 120s, checkpoint kontrol, boto3 eklendi
- [x] video-retalking fix: boto3+botocore eklendi
- [x] browser-use fix: flask eklendi, CMD eklendi
- [x] Test timeout 300â†’600s
- [x] TÃ¼m fix'ler commit+push â†’ GH Actions build tetiklendi

## ğŸ”´ Faz Z5 â€” Remaining Model Testing (18 model)

### Build Success Verification
- [ ] GH Actions build #138 sonucu kontrol et (geneface, video-retalking, browser-use)
- [ ] Yeni build'lerle yeniden test et

### Face Group (4 model)
- [ ] geneface â€” checkpoint download fix sonrasi test
- [ ] videoretalking â€” build fix sonrasi test
- [ ] realesrgan â€” ilk test
- [ ] wav2lip âœ… (zaten gecti)

### Image Group (2 model)
- [ ] stablediffusion â€” transformers MT5Tokenizer fix gerektirir
- [ ] realesrgan

### Video Group (11 model)
- [ ] wan
- [ ] wan25
- [ ] cogvideox
- [ ] hunyuan
- [ ] ltx
- [ ] mochi
- [ ] animatediff
- [ ] dynamicrafter
- [ ] pyramidflow
- [ ] svd
- [ ] videocrafter
- [ ] zeroscope

### Browser Group (1 model)
- [ ] browseruse â€” build fix sonrasi test

## ğŸ”´ Faz 4 â€” Node.js Entegrasyonu
- [ ] `src/services/modalBridge.ts` â€” ModalClient wrapper
- [ ] `src/queue.ts` gÃ¼ncelle â€” RunPodClient â†’ ModalClient
- [ ] SSE poll integration (`fc.get(timeout=0)`)

## â³ Faz 5 â€” Deploy & Production
- [x] Production deploy pipeline (GitHub Actions â†’ Modal)
- [ ] Load test (concurrent model calls)

## â³ Faz 6 â€” RunPod/Colab Kod TemizliÄŸi
- [x] `.env.example` RUNPOD_* temizle, MODAL_* eklendi
- [x] `src/env.ts` RUNPOD_API_KEY kaldÄ±rÄ±ldÄ±
- [x] `deploy-production.sh` Modal tabanlÄ± gÃ¼ncellendi
- [x] `deploy-modal.yml` GitHub Actions workflow oluÅŸturuldu
- [ ] `docker_image/` arÅŸiv (henÃ¼z yapÄ±lmadÄ±, manuel karar gerekli)
- [ ] Eski RunPod kodlarÄ±nÄ± temizle (`runpod.ts` deprecated olarak iÅŸaretli, silinebilir)

## ğŸŸ¢ Faz Z6 â€” TasarÄ±m AjanÄ± Entegrasyonu (01 Tem 2026)
- [x] TasarÄ±m AjanÄ± Skill klasÃ¶r yapÄ±sÄ±nÄ± ve `SKILL.md` yÃ¶nergelerini oluÅŸturma
- [x] `analyze_pages.js` betiÄŸini yazma ve mevcut sayfalarÄ± tarama
- [x] `generate_proposal.js` betiÄŸini yazma (Alternatif tasarÄ±m teklifleri hazÄ±rlama aracÄ±)
- [x] `apply_design.js` betiÄŸini yazma (Onaylanan tasarÄ±mÄ± entegre etme aracÄ±)
- [x] GiriÅŸ sayfasÄ± (`LoginPage.tsx`) iÃ§in Alternatif B (C glow/glassmorphism entegrasyonlu) uygulandÄ±
- [x] KarÅŸÄ±lama sayfasÄ± (`LandingPage.tsx`) iÃ§in Alternatif B (editorial grid + glow) uygulandÄ±

- [x] API Keys sekmesini Ayarlar modalÄ± altÄ±na taÅŸÄ±ma (ApiKeyManager modal uyumluluÄŸu, z-index 1100)
- [x] Ayarlar modalÄ± Hesap tabÄ±na Ã‡Ä±kÄ±ÅŸ (Logout) seÃ§eneÄŸi ekleme
- [x] 6 dildeki Ã§eviri dosyalarÄ±nÄ± gÃ¼ncelleyerek hardcoded metin bÄ±rakmama

## Referans
- ADR-008: RunPod â†’ Modal Migration
- `modal_apps/audio_service.py`: Audio grubu (11 model)
- `modal_apps/image_service.py`: Image grubu (2 model)
- `modal_apps/video_service.py`: Video grubu (12 model)
- `scripts/test_modal_sequential.py`: Sequential test script (TIMEOUT=600)
- `scripts/deploy_modal_serial.ps1`: Sequential Modal deploy
