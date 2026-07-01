# Sprint 18+ Yol HaritasÄ± â€” React Migration (S4.C) SonrasÄ± BaÅŸlanacak Ä°ÅŸler

Bu dokÃ¼manda, Sprint 4.C (React Migration) tamamlandÄ±ktan sonra baÅŸlanacak 7 ana iÅŸ parÃ§asÄ± (job) listelenmiÅŸtir. Her job kendi iÃ§inde baÄŸÄ±msÄ±z olup paralel yÃ¼rÃ¼tÃ¼lebilir.

---

## Job-1: Otonom Clipping Motoru GeliÅŸtirme (Faz C - v2)

**Hedef:** Mevcut clipper altyapÄ±sÄ±nÄ± geliÅŸtirerek uzun yatay videolarÄ± analiz edip otonom dikey Shorts formatÄ±nda kÄ±rpan motor.

### Alt GÃ¶revler
- [ ] Whisper transkript + LLM (Gemini 2.5 Flash) ile viral segment tespiti
- [ ] FFmpeg smart crop: konuÅŸmacÄ± yÃ¼z takibi ile dinamik 9:16 kÄ±rpma
- [ ] KÄ±rpÄ±lan bÃ¶lÃ¼mlere otomatik altyazÄ± gÃ¶mme + BGM miksajÄ±
- [ ] `/api/v1/clipper/extract` ve `/list` rotalarÄ±nÄ±n RabbitMQ kuyruk entegrasyonu

---

## Job-2: A/B Split Screen & Maskot Overlay (Faz C - v2)

**Hedef:** Ä°zleyici retention'Ä±nÄ± artÄ±rmak iÃ§in bÃ¶lÃ¼nmÃ¼ÅŸ ekran ve maskot/avatar bindirme.

### Alt GÃ¶revler
- [ ] FFmpeg `vstack` ile Ã¼stte AI video + altta Minecraft/ASMR layout
- [ ] Åeffaf PNG maskot/avatar bindirme ÅŸablonu
- [ ] KullanÄ±cÄ± tarafÄ±ndan seÃ§ilebilir split-screen oranlarÄ± (70/30, 50/50, 60/40)
- [ ] Dashboard'tan split-screen preview ve konfigÃ¼rasyon

---

## Job-3: AkÄ±llÄ± Kurgu & Dublaj (Faz D - v2)

**Hedef:** Ritim tabanlÄ± otomatik kesim, transkript kurgusu ve Ã§ok dilli dublaj.

### Alt GÃ¶revler
- [ ] FFmpeg + ses analizi ile BPM/peak noktalarÄ±na gÃ¶re beat-synced cuts
- [ ] Transkript metninden kelime silme â†’ otomatik FFmpeg kÄ±rpma
- [ ] Whisper transkript â†’ XTTS-v2 ses klonlama â†’ rubberband time-stretch ile dublaj
- [ ] Ã‡oklu dil desteÄŸi (TR/EN/DE/FR/AR)

---

## Job-4: Kurgu & Renk AjanÄ± (Faz E - v2)

**Hedef:** Sessizlik kesici, hareket algÄ±lama ve doÄŸal dil renk derecelendirme.

### Alt GÃ¶revler
- [ ] KonuÅŸma boÅŸluklarÄ±nÄ± ve hareketsiz kareleri tespit eden FFmpeg filtresi
- [ ] KullanÄ±cÄ±dan "sÄ±cak sinematik tonlar", "neon mor" gibi doÄŸal dil komutlarÄ±
- [ ] `colorbalance`, `eq`, LUT `.cube` dosyalarÄ±nÄ±n dinamik uygulanmasÄ±
- [ ] AI asistan panelinden renk Ã¶n izleme

---

## Job-5: Dinamik AltyazÄ± & HÄ±zlÄ± Transkript (Faz F - v2)

**Hedef:** Hormozi tarzÄ± modern dinamik altyazÄ±lar, faster-whisper ile hÄ±zlÄ± deÅŸifre.

### Alt GÃ¶revler
- [ ] Kelime zaman damgalÄ± bounce/pulse/shake animasyonlu altyazÄ± bileÅŸeni
- [ ] faster-whisper C++ motoru (Colab) ile 4x hÄ±zlÄ± deÅŸifre
- [ ] openai-whisper fallback zinciri
- [ ] ASS altyazÄ± formatÄ±nda `original_size` Windows FFmpeg bug fix

---

## Job-6: Premium AI Kurgu & Ses Ä°yileÅŸtirme (Faz G - v2)

**Hedef:** AI gÃ¶z temasÄ±, stÃ¼dyo kalitesinde ses, akÄ±llÄ± reframe, nesne silme.

### Alt GÃ¶revler
- [ ] Gaze-correction modeli ile konuÅŸmacÄ± gÃ¶z temasÄ± dÃ¼zeltme
- [ ] Arka plan gÃ¼rÃ¼ltÃ¼ silme, yankÄ± temizleme (Studio Sound)
- [ ] OpenCV yÃ¼z takibi ile 16:9 â†’ 9:16 dinamik crop (smart reframe)
- [ ] Hafif inpainting modeli ile nesne/maske silme

---

## Job-7: Viral Optimizasyon & B-Roll Sentezi (Faz H - v2)

**Hedef:** Otonom B-Roll sentezi, viral hook analizi, duygu odaklÄ± altyazÄ±.

### Alt GÃ¶revler
- [ ] CogVideoX ile anahtar kelime tabanlÄ± 3-4 sn B-Roll sentezi
- [ ] Ä°lk 3 saniye hook kalitesini deÄŸerlendiren LLM analizi
- [ ] Ses frekansÄ± + tonlama analizi ile vurgulu kelimeleri renklendirme
- [ ] Viral hashtag ve baÅŸlÄ±k Ã¶neri motoru

---

## Ã–ncelik SÄ±rasÄ± (Ã–nerilen)

1. **Job-1** (Otonom Clipper) â€” En yÃ¼ksek kullanÄ±cÄ± talebi
2. **Job-5** (Dinamik AltyazÄ±) â€” HÄ±zlÄ± kazanÄ±m, dÃ¼ÅŸÃ¼k efor
3. **Job-4** (Renk AjanÄ±) â€” Mevcut altyapÄ±ya kolay entegrasyon
4. **Job-3** (Dublaj) â€” Orta efor, yÃ¼ksek etki
5. **Job-6** (AI Kurgu) â€” BaÄŸÄ±mlÄ±lÄ±k var
6. **Job-7** (Viral) â€” Analitik altyapÄ± gerektirir
7. **Job-2** (Split Screen) â€” En dÃ¼ÅŸÃ¼k Ã¶ncelik

---

*Not: Bu iÅŸlerin v1 MVP'leri halihazÄ±rda tamamlanmÄ±ÅŸtÄ±r. v2 geliÅŸtirmeleri mevcut implementasyonlarÄ±n Ã¼zerine inÅŸa edilecektir.*

---

## âœ… Batch 5: VideoCrafter Docker + Cloud API EntegrasyonlarÄ± (TamamlandÄ± â€” 2026)

8 yeni video modeli entegre edildi. Tek platform API key + %50 markup Ã¼zerinden kredi sistemi entegre.

### VideoCrafter (Self-Hosted Docker, Port 5024)
- [x] `docker_image/videocrafter/app.py` â€” Flask T2V + I2V endpoint'leri
- [x] `docker_image/videocrafter/Dockerfile` â€” custom PyTorch LV-DM
- [x] `docker-compose.yml` â€” port 5024
- [x] `build_all_v2.sh` â€” "videocrafter" modeli eklendi
- [x] `RUNPOD_VIDEOCRAFTER_ENDPOINT_ID` env var
- [x] `src/queue.ts` â€” endpoint routing

### Cloud API Servisleri
- [x] `src/services/apiVideoService.ts` â€” IVideoAPIService factory
- [x] `src/services/runwayService.ts` â€” Runway Gen-4.5 Turbo
- [x] `src/services/klingService.ts` â€” Kling AI 2.0
- [x] `src/services/pikaService.ts` â€” Pika Labs 2.5
- [x] `src/services/lumaService.ts` â€” Luma Dream Machine 1.6
- [x] `src/services/haiperService.ts` â€” Haiper Turbo
- [x] `src/services/pixverseService.ts` â€” PixVerse v3
- [x] `src/services/veo2Service.ts` â€” Google Veo 2 (Vertex AI)
- [x] `src/services/creditService.ts` â€” MODEL_COSTS gÃ¼ncellendi (Ã—1.5 markup)
- [x] `src/queue.ts` â€” cloud API bypass (RunPod zinciri atlanÄ±r, `generateViaAPI()`)
- [x] `.env.example` â€” tÃ¼m API key env var'larÄ±

### Browser-Use Remote Publishing
- [x] `src/services/browserUseService.ts` â€” RunPod endpoint / local Flask fallback
- [x] `src/lib/publish-queue.ts` â€” `USE_BROWSER_REMOTE` env var

### DokÃ¼mantasyon
- [x] `docs/docker-images-inventory.md` â€” VideoCrafter satÄ±rÄ± + VRAM tablosu
- [x] `docs/video-models-research-2025.md` â€” Entegrasyon durumu (2026)
- [x] `CLAUDE.md` â€” Architecture + Model Routing gÃ¼ncellendi
