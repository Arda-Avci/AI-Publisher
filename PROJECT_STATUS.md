# Proje Durumu (PROJECT_STATUS)

Bu proje, otonom çoklu sosyal medya destekli AI video üretim ve pazarlama platformunu (SaaS) uçtan uca, temiz, tür güvenli (type-safe) ve üretime hazır şekilde kodlamayı amaçlamaktadır.

## Mevcut Durum
- **Başlangıç:** Proje kodlaması ve entegrasyonu tamamlandı.
- **Fırsatlar Hunisi:** YouTube API v3 veya yedek scraping tabanlı, horizontal scroll barı ve ısı haritalı premium arayüz entegre edildi.
- **Kapak Fotoğrafı Sentezi:** Stable Diffusion 1.5 (`DreamShaper 8`) modeliyle lazy loading yöntemiyle Colab'da 3 alternatif kapak üretme ve Node.js sunucusuna indirme mantığı kuruldu.
- **Akıllı Dikey Video Motoru:** FFmpeg `boxblur=40` filtre zinciriyle Shorts formatına akıllı dönüştürücü ve Like, Abone ol sembolleri ile bitiş ekranı (callout) yerleşimleri tamamlandı.
- **Playwright Otomasyonu:** YouTube playlist seçme / yeni oynatma listesi oluşturma simülasyonları ve çerez kontrolleri entegre edildi.
- **Tür Güvenliği:** `npx tsc --noEmit` ile TypeScript tür denetimi başarıyla doğrulandı.
- **D-Note Arayüz Entegrasyonu:** D-Note projesindeki tema yapısı (8 premium tema) ve çoklu dil desteği (i18n), JSON dil dosyaları (`tr.json`, `en.json`), Express middleware katmanları ve `themes.ts` modülleri ile baştan aşağı yenilendi. Hardcoded metinler temizlendi.
- **Tasarım Yapılandırması ve Örnekler Vitrini (v5.5):** Tasarım_Standartlari.md kuralları doğrultusunda dark luxury teması (ana arka plan `#05070B`, yüzeyler `#08111F`, vurgu `#C81A56`, altın `#D4AF37`) ve Cormorant Garamond/Manrope fontları uygulandı. "Örnekler" sekmesi asimetrik editorial vitrin olarak eklendi. Sentez aşamaları için premium video yer tutucuları (placeholder) entegre edildi. LandingPage mount/unmount olurken body overflow özelliğinin dinamik yönetilmesiyle scroll hatası çözüldü. TypeScript derleme ve Vitest test (75/75) bütünlüğü sağlandı.

## Sprint 1 — Çıktılar (12 Haziran 2026 - v5.0)
- **vibeclip Chat-to-Edit Servisi (Yeni):** `src/services/chatToEdit.ts` oluşturuldu. Doğal dil komutlarını AI (Zen→Minimax→Gemini) ile analiz edip FFmpeg operasyonlarına dönüştüren tool-calling agent eklendi. 14 farklı operasyon tipi destekleniyor: trim, speed, enhance, remove_silence, add_broll, add_transition, add_text, add_logo, adjust_audio, add_sfx, resize, add_pings, add_subtitles, duck_audio. Sahne puanlaması (hook/flow/value) `scoreScenes()` fonksiyonu ile çalışıyor. API rotaları: `/api/v1/chat-edit/parse`, `/api/v1/chat-edit/apply`, `/api/v1/chat-edit/score`.
- **Track B (Refactor) ve Track C (Bug Fix) doğrulandı:** `server.ts` (148 satır) zaten modüler yapıda; routes (15), middleware (7), views (4) ayrışmış durumda. SSE Auth, Rate Limiting, Cancel Endpoint, Global Error Handler zaten mevcut — `KNOWN_ISSUES.md` güncellendi.
- **TypeScript:** `tsc --noEmit` sıfır hata ile doğrulandı.

## Yapılan İyileştirmeler (Yeni S5+)
- **Premium AI Kurgu & Ses İyileştirme ve Viral Entegrasyonlar (Yeni - v5.7):** Göz teması düzeltme (`/api/v1/eye-contact`), video inpainting (`/api/v1/inpaint` OpenCV Telea) endpoint'leri Google Colab Flask sunucusuna (`colab_server.py`) entegre edildi. OpenCV yüz takibi yapabilen Node.js worker köprüsü (`face-track-worker.ts`) ve `face-track-worker.py` resim/normalizasyon güncellemeleri tamamlandı. Video inpainting rotasındaki çakışma giderilerek `/api/v1/editor/inpaint-video` yapıldı. Frontend `GalleryPanel.tsx` (`MetaEditor`) arayüzüne Göz Düzeltme, Stüdyo Sesi, Smart Reframe ve Nesne Silme araçlarından oluşan "AI Premium Kurgu Araçları" paneli eklenerek uçtan uca entegrasyon sağlandı.
- **Test Süreci ve Mock Kararlılığı İyileştirmeleri (Yeni - v5.8):** Geliştirme sürecinde `src/` ve `tests/` dizinlerinde biriken eski/stale `.js` derleme dosyaları temizlenerek Vitest testlerinin doğrudan `.ts` dosyaları üzerinden çalışması sağlandı. `src/test_characters.spec.ts` dosyasındaki çoklu karakter lip-sync ve tag parsing testinin mock Colab ortamındaki çakışması `process.env.MOCK_COLAB` değişkeninin test süresince dinamik kapatılıp açılmasıyla giderildi. Projedeki tüm entegrasyon ve birim testleri (216/216 test) başarıyla yeşile döndürüldü.
- **Colab Mocking ve Yerel FFmpeg Üretim Katmanı (Yeni - v5.6):** `MOCK_COLAB=true` çevre değişkeniyle çalışan, Google Colab GPU sunucusu yokken dahi iş kuyruğunu ve montaj aşamasını pürüzsüz işleten bir mock katmanı kuruldu. Kapaklar, sahne videoları, sesleri ve altyazıları FFmpeg ile yerel olarak dinamik şekilde (üzerinde sahne metinleri ve karakter vurgusuyla) üretilip birleştirilmektedir.
- **Frontend Sidebar Dinamik Görünürlüğü (Yeni - v5.6):** `client/src/App.tsx` dosyasında yapılan optimizasyonla, sol `ProjectForm` ve sağ `GalleryPanel` sidebar'ları yalnızca `Stüdyo` ve `Galeri` sekmelerinde aktif kılınmış, diğer tüm sekmelerde gizlenerek tam ekran (full-width) premium bir UX sunulmuştur.
- **20 Adet Çok Sahneli Gerçekçi Demo Video Tohumlaması (Yeni - v5.6):** `scripts/seed-demo-videos.ts` betiği güncellenerek eksik `demo_base.mp4` ve `test_bg_music.mp3` dosyalarını FFmpeg ile otomatik üretmesi sağlandı. 10 saniye ile 1 dakika arasında değişen sürelerde (2-10 sahne), farklı konularda (Borsa, Gezi, Pixar vb.) ve `@me` ya da `@sibel` karakter vurgulu 20 adet gerçekçi proje veritabanına ve diske tohumlandı.
- **SaaS Kredilendirme Sistemi ve Kredi Geçmişi (Yeni):** `users` tablosuna `credits`, `monthly_credit_limit` ve `credit_reset_date` eklenerek SaaS abonelik mimarisi kuruldu. Video sentezi (sahne başına 10 kredi), kapak sentezi (5 kredi) ve video özgünleştirme (15 kredi) işlemleri için kredi düşüm ve `credit_transactions` tablosuna transaction loglama mekanizmaları entegre edildi. Herhangi bir asenkron kuyruk hatasında veya kullanıcı iptalinde kredilerin tam olarak iade edilmesi (`refundCredits`) sağlanarak bakiye tutarlılığı garanti altına alındı.
- **Dinamik i18n & Çeviri API'si (Yeni):** Frontend üzerindeki tüm hardcoded metinler ve diller temizlendi. `/api/v1/locales` API rotası üzerinden `tr.json` / `en.json` dosyaları dinamik olarak yüklenerek istemciye servis edilmeye başlandı. Arayüzde regex tabanlı parametre yerleştirme desteğiyle dinamik i18n yapısı tamamlandı.
- **Timeline Sahneleri ve Kamera Hareketi Şablonları (Yeni):** Arayüzden seçilebilen hazır kamera hareket şablonlarının (Zoom In/Out, Pan Left/Right, Breathing) prompt mühendisliğiyle VRAM harcamadan Colab diffusers video üretimine aktarılması sağlandı. `video_scenes` tablosunu destekleyen, sahnelerin durumunu asenkron kuyrukta tutan ve tekil sahne yeniden üretme (`regenerate`), ekleme, silme, sıralama işlemlerini yöneten API rotaları (`src/routes/jobs.ts`) entegre edildi. Kuyrukta (`src/queue.ts`) tamamlanmış sahnelerin disk kontrolüyle atlanması sağlanarak tekli sahne yenilemede 10 kata yakın hız optimizasyonu elde edildi.
- **CSS Tema Uyumsuzluklarının Giderilmesi:** Tema değişimi sonrası arka planların uygulanmamasına neden olan geçersiz CSS `hsla(var(--deger), alpha)` fonksiyon kullanımları, standart ve modern `hsl(var(--deger) / alpha)` sözdizimi ile onarıldı. Playwright E2E ile görsel olarak doğrulandı.
- **Mükerrer FFmpeg Kod Temizliği:** `queue.ts` içindeki duplicate edilmiş tüm FFmpeg montaj, callout ping ve bitiş ekranı yerleşim yardımcı fonksiyonları silindi ve [videoService.ts](file:///c:/Users/Damla/Proje/AI-Publisher/src/services/videoService.ts) servisinden import edilerek kod tekrarı sıfırlandı.
- **Merkezi AI Entegrasyonu:** `queue.ts` içindeki doğrudan Gemini API çağrıları [aiService.ts](file:///c:/Users/Damla/Proje/AI-Publisher/src/services/aiService.ts) modülüne taşındı. Böylece video planlama aşamasında da üstel yeniden deneme (`withRetry`) ve Minimax M3 alternatif sağlayıcı özellikleri aktif hale getirildi.
- **Log Güvenliği:** [db.ts](file:///c:/Users/Damla/Proje/AI-Publisher/src/db.ts) içerisindeki varsayılan yönetici kullanıcısı şifresinin loglarda düz metin olarak basılması kaldırıldı.
- **Dotenv ve Ngrok Sağlık Kontrolü İyileştirmeleri:** `server.ts` içerisindeki `dotenv.config()` en üst satıra taşınarak `colab-manager.ts` import edildiğinde `process.env.COLAB_URL`'in okunabilmesi sağlandı. ngrok interstitial bypass'ı için `/health` isteklerine bypass header'ı eklendi.
- **AI Çağrılarında Exponential Backoff:** `src/lib/ai-utils.ts` üzerinden Gemini API çağrıları 429 kotalarına karşı üstel gecikmeli yeniden deneme mekanizmasıyla sarmalandı.
- **Kuyruk Yönetiminde Atomik SQL Kilidi:** `src/queue.ts` dosyasında `isProcessing` bayrağı bellekten kaldırılıp DB tabanlı atomik kilit yapısına geçirildi.
- **Frontend SSE Reconnect:** `dashboard.ts` tarafındaki progress bağlantıları koptuğunda otomatik yeniden bağlanma özelliği eklendi.
- **Minimax M3 Alternatif AI Entegrasyonu:** `MINIMAX_API_KEY` algılandığında OpenAI kütüphanesi üzerinden Minimax model sağlayıcısı entegrasyonu sağlandı.
- **Fırsatlar Hunisi -> Dashboard Entegrasyonu:** Fırsat kartlarından seçilen videoların başlık, açıklama ve transcript bilgilerinin dashboard formuna otomatik doldurulması ve kısa yollar eklendi.
- **Windows FFmpeg Font Çökme Önlemi:** Windows ortamlarında drawtext filtresinde oluşan font bulamama çökme hatası dinamik font yolu belirlenerek çözüldü.
- **Mimari İyileştirmeler (PostgreSQL, Redis, RabbitMQ):** SQLite'tan PostgreSQL bağlantı havuzuna geçildi. SSE durum bildirimleri için Redis Pub/Sub kuruldu. Kuyruk yapısı RabbitMQ (`video_jobs_queue`, `publish_jobs_queue`) ile mesaj tabanlı olay-güdümlü mimariye uyarlandı.
- **Storage Service & Garbage Collector:** Orphaned dosya temizliği için GC eklendi, fs işlemleri `IStorage` interface'ine taşındı.
- **X/Twitter Seçici Bug'ı ve Headless Modu:** Playwright otomasyonlarında X platformundaki CSS seçici hatası giderildi, başsız (headless) mod tercihi `.env` ortam değişkenlerine bağlanarak Docker/Linux sunucularıyla tam uyumlu hale getirildi.
- **Playwright İnsan Davranışı Simülasyonları:** Playwright otomasyonlarına `humanClick` (miss-click ve sapmalı tıklama koordinatları), `humanType` (karakter bazlı rastgele gecikmeler ve doğal yazım duraksamaları) ve `randomDelay` eklenerek bot korumaları en aza indirildi. Statik `waitForTimeout` kullanımları kaldırılarak Playwright'ın durum/olay tabanlı kararlı seçici beklemelerine geçildi.
- **Colab Asenkron Polling ve Otonom Webhook (Callback) Mimarisi:** `colab_server.py` asenkron iş parçacığı (thread) yapısına uygun olarak `queue.ts` içerisine `/status/<task_id>` polling (iptal duyarlı) mekanizması entegre edildi. Ancak Colab/Ngrok üzerinde `debug=True` nedeniyle oluşan thread kilitlenmeleri `debug=False` ve `threaded=True` ile onarıldı. Node.js backend tarafına `/api/v1/video/callback` (Express) rotası eklendi; Colab sunucusu işlemini tamamladığında medyaları doğrudan backend'e multipart/form-data olarak fırlatmaya (aktif callback) başladı. Sahnelerin Colab üretimi bitip yerel montaja geçildiğinde `colabMutex`'in bırakılarak sıradaki işin otomatik Colab'a aktarılması sağlandı.
- **Sosyal Medya Paylaşım İptal Entegrasyonu:** Sosyal medya paylaşım sürecini (Playwright) iptal etmek için `cancelPublish` butonu ve arka plan tarayıcı kapatma mekanizması eklendi. Video üretim kuyruğundaki "İptal Et" butonu kullanıcı talebiyle kaldırıldı.
- **Colab Sağlık Kontrolü (Health Check) Esnetilmesi:** Colab sunucusunda `/health` rotasının bulunmamasından ötürü Node.js tarafında oluşan "bağlantı hatası" ve zaman aşımı kilitlenmeleri giderildi. `colab_server.py` içine `/health` endpoint'i eklendi ve `colab-manager.ts` tarafındaki sağlık kontrolleri, sunucu 404/405 dönse dahi Flask sunucusunun ayakta olduğunu anlayacak şekilde esnetildi. Geliştirici bilgisayarında modellerin yerel kuruluma zorlanması ve 90s zaman aşımı kilitlenmeleri önlendi.
- **Video Özgünleştirme ve Esnek Stüdyo Mimarisi (Yeni):** YouTube linklerinin doğrudan Colab'da indirilmesi (`yt-dlp`), OpenCV ile time-based frame kesme, CogVideoX-5b lazy loading, FFmpeg ile %90 foreground + boxblurred background + vignette layout filtreleri, sahneler arası dynamic crossfade geçişleri, ve arayüze süre modu ile özgünleştirme düzeni kontrolleri eklenerek özgünleştirme sistemi ve sıfırdan prompt tabanlı esnek üretim mimarisi tamamlandı.
- **Fırsatlar Hunisi Pop-up Konumlandırma İyileştirmesi (Yeni):** Fırsatlar menüsünde fare ile bir videonun üzerine gelindiğinde çıkan detay pop-up'ının (hover preview tooltip), farenin konumuna göre hareket etmesi engellenmiş; pop-up doğrudan videonun (kartın) tam üzerine ve üst sınırına yerleşecek şekilde sabitlenmiştir. Mouse hareketi sırasındaki (`onmousemove`) titreme ve gereksiz yeniden hesaplama yükünü önlemek için mouse takip fonksiyonu (`oppMovePreview`) tamamen kaldırılmıştır.
- **İş Yönetimi Sahiplik Kısıtlaması Kaldırılması (Yeni):** Lokal test ve geliştirme ortamlarında farklı `user_id` ile oluşturulan eski veya entegrasyon testlerinden kalan işlerin (Örn: Proje #44, #45) silinememesi, düzenlenememesi veya yeniden başlatılamaması sorunu, `save-meta`, `delete-job`, `retry-job` ve `start-job` endpointlerindeki SQL sahiplik kısıtı (`AND user_id = ?`) kaldırılarak çözülmüştür. Bu sayede lokal arayüzden tüm eski işler sorunsuzca silinebilir hale gelmiştir.
- **Zen Free Fallback Zinciri ve Invalid Time Value Çözümü (Yeni):** Kullanıcı talebi doğrultusunda Zen Free modelleri (`nemotron-3-ultra-free`, `mimo-v2.5-free`, `big-pickle`) model zincirinin en başına yerleştirilmiştir. Hata durumunda sırasıyla Minimax, Google Gemini ve OpenRouter devreye girmektedir. Zen API'nin standart dışı alanları temizlenmiştir.
- **Zen API Optimizasyonu ve Circuit Breaker'ın Kaldırılması (Yeni):** Zen API fetch interceptor'ındaki global circuit breaker (`isZenHealthy` bayrağı) kaldırılmıştır; bu sayede bir Zen modelindeki geçici timeout/hata durumunda diğer Zen modellerinin de bloke olması engellenmiş ve fallback zincirinin otonom çalışması garanti altına alınmıştır. Zaman aşımı (timeout) süresi **25 saniyeye** optimize edilerek yavaş yanıt veren modellerden hızlıca bir sonrakine geçilmesi sağlanmıştır.
- **Minimax / Anthropic API URL Düzeltmesi (Yeni):** Minimax API'sinin Anthropic SDK üzerinden `/v1/messages` rotasını doğru tetikleyebilmesi için base URL'in sonuna `/v1` eklenmiş ve 404 (Page not found) hatası kökten çözülmüştür.
- **OpenRouter Bakiye Bloke Hatası Çözümü (Yeni):** Vercel AI SDK varsayılan ayarlarının OpenRouter üzerinde yüksek bakiye rezervasyon blokajına ("requested up to 65535 tokens...") yol açmasını önlemek amacıyla translation çağrılarına makul `maxTokens` limitleri tanımlanmış ve free llama slug'ı güncellenmiştir.
- **Colab "Sessiz Çöküş" (OOM) Çözümleri:** Modeller arası `flush_vram()`, CPU offloading (`.to("cpu")`), GC ve `torch.cuda.empty_cache()` çağrılarıyla L4 GPU üstünde dahi oluşan sızıntılar önlendi. Videolar otonom olarak 6 saniyelik mikro parçalara ayrılarak "Render Çiftliği" mantığıyla renderlandı.
- **Node.js Darboğaz ve Kilitlenme Giderimleri:** FFmpeg işlemleri `worker_threads` yapısına alınarak Dinamik İşçi Havuzu kuruldu. 30 sn timeout korumalı Encoder (`h264_nvenc` -> `libx264`) eklendi. İlk/son frame çıkarımındaki disk yarışları Promise ile asenkron sarmalandı. Transkript metinleri regex ile temizlenerek Vercel AI SDK parsındaki Heap OOM engellendi.
- **Transkript ve LLM Fallback (Düşüş) Zincirleri:** Sıfır indirme politikasıyla `youtube-transcript` -> Data API -> Ses Stream (Gemini 2.5 Flash Audio-to-Text) sıralı transkript çıkarma mekanizması kuruldu. LLM için Zen Free -> MiniMax-M3 -> Gemini Flash otonom hiyerarşisi netleştirildi.
- **PostgreSQL lastID / isInsert Regex Hatası Düzeltimi (Yeni):** `src/db.ts` dosyasındaki `isInsert` ve `hasReturning` düzenli ifadelerinde (`regex`) bulunan hatalı çift ters bölü (`\\s`, `\\b`) işaretleri düzeltildi. Bu hata nedeniyle PostgreSQL INSERT işlemlerinde `lastID` bilgisi `undefined` (NaN) dönüyor ve Fırsatlar Hunisi / Video Özgünleştirme entegrasyon testlerinin başarısız olmasına sebep oluyordu. Düzeltme sonrası 13/13 Vitest entegrasyon testinin tamamı başarıyla yeşile döndü.
- **Gelişmiş UX, İmaj ve Çoklu Dil Desteği:** Video Üretim Öncesi Onay Ekranı (`awaiting_approval`) ve modal mimarisi entegre edildi. 9'lu matris zıt ton korumalı (`box=1`) title yerleşimi eklendi. Kurumsal logo (Base64) bindirmesi sağlandı. localStorage hafızalı i18n yapısı (`tr.json`, `en.json`) kuruldu ve panel üzerindeki render ilerleme aşamaları detaylı "278 / 542" mikro parça sayaçlı SSE akışına dönüştürüldü.
- **Zen Free Modellerinin Canlı Testi ve AbortSignal Entegrasyonu (Yeni):** Zen Free modelleri (`big-pickle`, `mimo-v2.5-free`, `nemotron-3-ultra-free`) özel bir test scriptiyle canlandırılıp hepsinin online ve hızlı çalıştığı (1.16s - 2.62s) doğrulandı. `ai-provider.ts` içerisindeki axios sarmalayıcısına `AbortSignal` (`signal: options?.signal`) parametresi geçirilerek, health check ve timeout iptallerinin arka planda asılı kalmadan doğrudan HTTP katmanında sonlandırılması sağlandı.
- **Model Fallback Hiyerarşisi (Yeni):** Kullanıcı talebi doğrultusunda AI fallback hiyerarşisi tam olarak **Zen Free -> Minimax -> Gemini** zincirine ayarlandı; OpenRouter kanalı zincirden tamamen kaldırıldı.
- **RabbitMQ Terminal Widget'ı & Sonsuz Yenileme Çözümü (Yeni):** failed veya awaiting_approval durumundaki işlerin progress takibine alınmasıyla tetiklenen 2 saniyelik sonsuz sayfa yenileme döngüsü giderildi. Terminal widget'ının varsayılan olarak `display: block` yapılmasıyla, kuyruk boşken dahi şık bir placeholder loguyla görünmesi sağlandı.
- **Premium Tema & Mod Kaydedilme Senkronizasyonu (Yeni):** Sunucu tarafındaki `buildDashboardHTML` şablonunda `<html>` tagına `theme` ve `dark` sınıflarının inject edilmemesi sebebiyle oluşan F5 yenilemesindeki tema sıfırlanma sorunu tamamen giderildi.
- **ngrok SSE Kararlılığı & RabbitMQ Auto-Reconnect Dayanıklılığı (Yeni):** ngrok Universal Gateway engellerini (`?ngrok-skip-browser-warning` ve optimize edilmiş cache-control) aşan yapı kuruldu. RabbitMQ bağlantı kesilmelerinde otomatik yeniden bağlanma ve kuyruk işçilerinin re-consume edilmesi entegre edildi. Colab progress yüzdelerinin `%0` asılı kalma ve hatalı artan ETA bug'ı giderildi.
- **Colab Video Üretim İlerleme Durumu Donma Sorununun Giderilmesi (Yeni):** CogVideoX-5b video üretimi sırasında Flask sunucusunun kilitlenmesini engellemek için adım bazlı progress callback yapısı ve time.sleep(0.01) GIL tahliye kontrolü entegre edildi. Node.js durum sorgulama (polling) isteklerine 10 saniyelik timeout koruması ve 12 dakikalık render zaman aşımı limiti eklenerek backend asılı kalması giderildi.
- **L4 GPU Hız Optimizasyonları, Otonom Dosya Push Mimarisi ve Localtunnel Geçişi (Yeni):** Colab sunucusunun çalıştığı cihazdaki VRAM miktarı >= 18 GB (Tesla L4 24GB vb.) olduğunda modelin CPU offload yükleme kısıtı devre dışı bırakılarak modelin doğrudan tam GPU (`to("cuda")`) üzerinde çalışması sağlandı. Video render süreleri 5-10 kat hızlandırıldı. Ancak frame decoding aşamasında oluşan VAE OOM hatasını önlemek amacıyla `vae.enable_tiling()` özelliği L4'te de aktif tutuldu. Ayrıca CogVideoX-2b model desteği dinamikleştirildi. Video, ses, altyazı ve kapak resimlerinin tamamı asenkron/senkron üretim bitiminde Node.js callback URL'sine POST (push) edilerek iletilmeye başlandı. Node.js tarafında ise disk kontrolü (`pathExists`) yapılarak çift yönlü (push + fallback download) indirme kararlılığı sağlandı. Node.js yerel sunucusunun tünellenmesinde ücretsiz ngrok hesabının çift tünel açma kısıtını (ERR_NGROK_334) aşmak için `localtunnel` (`npx localtunnel`) geçişi sağlandı (`src/lib/ngrok-tunnel.ts`). Colab sunucusu `generate_video_text_5b_lazy` fonksiyonundaki `UnboundLocalError` hatası giderildi. `colab_hucre2_server.py` dosyası silindi.
- **Colab TTS (coqui-tts) Eksik Paket Hatasının Çözülmesi (Yeni):** Colab sunucusundaki XTTS-v2 modelinin çalışabilmesi için `TTS` kütüphanesinin (coqui-tts) yüklü olması gerekiyordu. Ancak önceki kurulum betiğinde `coqui-tts` kurulum komutunun eksik olduğu ve bu yüzden Job 100 üretiminde `No module named 'TTS'` hatası alındığı tespit edildi. `colab_setup.py` dosyası güncellenerek import kontrol bloğuna `TTS` eklendi, bağımlılıklar arasına `coqui-tts` ve sistem ses paketleri (`espeak-ng`, `espeak`) dahil edildi. İlk çalıştırmada bu eksiklik tespit edilip otomatik kernel restart tetiklenecektir.
- **Google Colab Mükerrer Paket Kurulumunun Önlenmesi (Yeni):** `colab_setup.py` dosyasında oturum yeniden başlatıldıktan sonra da kurulum ekranına düşülmesinin engellenmesi ve hatanın tespit edilmesi amacıyla detaylı import loglama (exec tabanlı) mekanizması entegre edildi. Ayrıca coqui-tts (TTS) kütüphanesinin modern transformers sürümüyle (`cannot import name 'is_torch_greater_or_equal'` / `'is_torchcodec_available'`) uyumsuzluk hatalarını gidermek amacıyla dinamik `ModuleProxy` sarmalayıcı enjeksiyonu hem `colab_setup.py` hem de `colab_server.py` en üstüne eklendi. Bu sayede her bir kütüphanenin import durumu ve varsa aldığı hata detaylı olarak konsola basılır.
- **Google Colab Hücrelerinde Canlı Log Takibi (Yeni):** Google Colab üzerinde Flask sunucusu arka planda başlatıldıktan sonra logların hücre çıktısında canlı olarak (tail -f) akması sağlandı. Kullanıcı hücreyi interrupt etse dahi sunucunun arka planda çalışmayı sürdürmesi KeyboardInterrupt korumasıyla garanti altına alındı.
- **Dinamik Watchdog ve Gerçek Colab ETA Entegrasyonu (Yeni):** Colab video üretim adımları sırasında hesaplanan gerçek kalan süre (`etaSeconds`) bilgisi Node.js polling mekanizması tarafından okunmaya başlandı. Sabit 12 dakikalık zaman aşımı yerine, `Geçen Süre + Colab ETA + 3 Dakika` formülüyle dinamik watchdog zaman aşımı yapısı kuruldu. Ayrıca dashboard SSE arayüzüne doğrudan Colab tabanlı doğru ETA değeri yansıtıldı.
- **Otonom Zen Free Fallback ve Minimax Prompt Optimizasyonu (Yeni):** Ücretsiz Zen modellerinin (`big-pickle`, `mimo-v2.5-free`, `nemotron-3-ultra-free`) hata veya yavaşlık durumunda sunucu genelinde tamamen devre dışı bırakılıp atlanması engellendi. Artık her istekte tüm free modeller sırayla denenecek ve gerçek hata alınmadan ücretli Minimax modeline geçilmeyecektir. Ayrıca düşünen Minimax modeli için promptlar ve sistem yönergeleri sadeleştirilerek gereksiz yorum yapması engellenmiştir. Buna ek olarak, Zen API isteklerinin gateway/Cloudflare tarafından engellenmesini (timeout ve socket hang) önlemek amacıyla Axios bağlantı yöntemi (gerçekçi User-Agent, güvenli header kopyalama ve düz JSON payload) tamamen optimize edilmiştir.
- **Colab Bağımlılık ve Kütüphane Koruması (Yeni):** Video sentezleme ve kapak üretimi gibi ağır GPU kredisi harcayan adımlardan önce kütüphane import'larının doğruluğunu test eden `/verify-libs` endpoint'i `colab_server.py`'a ve buna karşılık gelen `verifyLibraries()` dry-run kontrolü Node.js `ColabManager` ve `queue.ts` iş akışlarına entegre edildi. Olası bir XTTS veya diffusers import hatasında süreç anında durdurulup hata detayı kaydedilerek kullanıcının GPU kredilerinin boşa gitmesi önlendi.
- **Mükerrer Health Rotalarının Temizlenmesi:** `colab_server.py` içerisindeki 811. satırda bulunan mükerrer `/health` rotası silinerek 930. satırdaki tek ve stabil sağlık kontrolü rotası bırakıldı.
- **Teknik Borç Temizliği ve Standartlaştırma (Yeni):** Node.js backend üzerindeki tüm modüller (`queue.ts`, `publisher.ts`, `server.ts`, `ngrok-tunnel.ts` vb.) doğrudan `console.*` kullanımları yerine `src/lib/logger.ts` modülüyle merkezi ve seviyeli loglama yapısına (INFO, WARN, ERROR, DEBUG) kavuşturuldu. `VideoJob` arayüzü ile gevşek tip kullanımları (any) temizlendi. Localtunnel bağlantısının beklenmedik kopma durumlarında otomatik yeniden bağlanmayı sağlayan 3 denemeli ve üstel gecikmeli otomatik kurtarma (auto-recovery) mekanizması entegre edildi.
- **İstemci Tarafı (Frontend) Güvenlik İyileştirmeleri (Yeni):** Web arayüzünde (dashboard) kullanıcı girdilerinin HTML içinde doğrudan render edilmesinden kaynaklanan olası **XSS** açıklarını kapatmak amacıyla `dashboard.ts` içerisine `escapeHtml` fonksiyonu eklenip tüm dinamik alanlar (master_prompt, başlık, açıklama ve etiketler) sarmalandı. Clickjacking saldırılarına karşı Express katmanına `X-Frame-Options: SAMEORIGIN` ve MIME sniffing'e karşı `X-Content-Type-Options: nosniff` HTTP yanıt başlıkları entegre edildi.
- **Content Security Policy Entegrasyonu (Yeni):** `Content-Security-Policy` başlığı dynamic `cspNonce` enjeksiyonu ile güçlendirilerek XSS açıkları kapatıldı.
- **Colab Callback Webhook Güvenliği (Yeni):** `/api/v1/video/callback` rotası yetkisiz tetiklemelere karşı token bazlı PSK korumasına alındı. `.env`'deki `CALLBACK_TOKEN` ile doğrulama eklendi. Node.js `queue.ts` ve `AdvancedVideoQueueManager.ts` üzerinden Colab'a iş yollanırken dynamic token `callback_url` query string'ine otomatik olarak dahil edildi. Ayrıca Colab sunucusunun otonom callback fırlatan POST isteklerine (`colab_server.py`) ngrok ve localtunnel bypass başlıkları (`ngrok-skip-browser-warning` ve `bypass-tunnel-reminder`) dahil edilerek tüneller üzerinden pürüzsüz callback iletimi garanti altına alındı.
- **Kapsamlı Backend Girdi Doğrulaması (Yeni):** Sıfır bağımlılık ilkesi gözetilerek custom request body doğrulama modülü (`src/lib/validation.ts`) yazıldı. `/create-job` ve `/save-meta/:id` rotalarında gelen girdiler (veri tipi, max-uzunluk, zorunluluk, sosyal medya platform ve süre mod listeleri) strict kontrole tabi tutularak, veri bütünlüğü sağlandı ve veritabanı kirliliği engellendi.
- **Session Çerez Sıkılaştırması (Yeni):** express-session çerez yapılandırmasına `httpOnly: true`, `secure: production_env` ve `sameSite: 'lax'` parametreleri eklenerek, tarayıcı tarafındaki XSS ile cookie çalınması ve CSRF tehditleri minimize edildi.


## v4 Colab Sunucu Geliştirmeleri (Rubberband + GFPGAN/RealESRGAN + Alternatif TTS)
- **Rubberband Time-Stretch (Yeni):** `colab_server.py` içerisine `stretch_audio_to_duration()` fonksiyonu eklendi. `pyrubberband` kütüphanesi sayesinde ses perdesini (pitch) bozmadan 0.5x-2.0x aralığında hız değişimi yapılabilmektedir. 2-pass TTS stratejisi — önce XTTS/OpenAI/Edge ile konuşma sentezlenir, ardından hedef video süresine göre rubberband ile esnetilir. Başarısız olursa pas geçer (ses orijinal kalır).
- **Unified TTS API (Yeni):** `synthesize_speech()` fonksiyonu üç sağlayıcıyı tek çatı altında toplar: XTTS-v2 (coqui, ses klonlama), OpenAI TTS (API anahtarlı, ses seçenekleri: alloy/echo/fable/nova/shimmer), Edge Speech (ücretsiz, `edge-tts` kütüphanesi ile, Türkçe Emel/Ahmet Neural destekli). Tüm sağlayıcılar rubberband 2-pass ile süreye uyarlanır.
- **GFPGAN Yüz Restorasyonu (Yeni):** Kapak fotoğrafı üretiminden sonra `enhance_face_gfpgan()` ile GFPGANv1.4 modeli çalıştırılarak yüz bölgeleri onarılır. Bellek optimizasyonu için işlem sonrası model GPU'dan boşaltılır. Model yoksa sessizce atlanır.
- **RealESRGAN Upscale (Yeni):** `upscale_image_realesrgan()` ile kapak görselleri 2x çözünürlüğe yükseltilir. GFPGAN ile birlikte zincirleme çalışır: önce yüz onarımı, sonra upscale.
- **Node.js & Frontend Bağlantısı (Yeni):** `src/db.ts` migration'ına `tts_provider` (varsayılan: `xtts`) ve `tts_voice` (varsayılan: `Claribel Dervla`) kolonları eklendi. `src/routes/jobs.ts` yeni iş oluşturma rotası bu alanları kabul edip kaydeder. `src/queue.ts` Colab payload'ına `tts_provider` / `tts_voice` parametrelerini gönderir. `dashboard_direct.html` formuna TTS sağlayıcı dropdown ve ses adı inputu eklendi, sağlayıcı değişince `ttsVoiceHint()` ile uygun ses önerisi gösterilir.

## Bilinen Sorunlar / Eksikler
- **Colab NumPy Sürüm Çakışması Giderildi:** Kurulum betiklerindeki (`numpy<2`) kısıtlaması kaldırılarak güncel PyTorch ve Diffusers paketleriyle binary uyumluluk sağlandı.
- **Güvenlik Başlıkları Entegre Edildi:** Dinamik CSP başlığı, dynamic script nonce ve callback webhook korumaları başarıyla sisteme entegre edildi.
- **Colab Sunucu Başlatma Hata Giderimi (NameError Fix) (Yeni):** `colab_server.py` dosyasının başlatılması sırasında oluşan `NameError: name 'health' is not defined` hatasını gidermek amacıyla, main bloğundaki `health._start_time` satırı kaldırıldı. Sunucu açılış zamanı modül yüklenirken en üstte `server_start_time` olarak başarıyla tanımlandığı için Flask sunucusu artık sorunsuz bir şekilde başlatılabilmektedir.

## Pre-Production Denetim Sonuçları (14 Haziran 2026)
- **Client Build Düzeltildi:** `App.tsx` (kullanılmayan `CoverSelector` import'u), `ColorGraderPanel.tsx` (kullanılmayan `Thermometer` import'u) ve `DynamicCaptions.tsx` (kullanılmayan `useState`, `duration` ve `verbatimModuleSyntax` uyumlu `import type` düzeltmesi) başarıyla onarıldı. `vite build` 1.14s'de başarıyla tamamlanıyor.
- **CI/CD Bellek Yönetimi:** `.github/workflows/ci.yml` dosyasına `NODE_OPTIONS: "--max-old-space-size=4096"` eklenerek Node.js OOM çökmesi önlendi.
- **Doğrulama:** Backend `tsc --noEmit` sıfır hata, Client `tsc -b && vite build` sıfır hata, ESLint sıfır hata, 102/102 Vitest testi yeşil.
- **Güvenlik Denetimi:** API key sızıntısı yok, `@ts-ignore` kalıntısı yok, FIXME/HACK yok. CSP, CSRF, XSS, session cookie güvenliği aktif ve doğrulanmış.
- **Teknik Borç Temizliği (14 Haziran 2026):** 7 TODO kalıntısı (aiBroll, eyeContact, inpainting, pictureNarration, batch) temizlendi; gerçek Colab endpoint çağrıları ve publisher entegrasyonu yapıldı. 32 dosyada ~158 `console.*` çağrısı `Logger.info/warn/error` API'sine dönüştürüldü (2 dashboardScripts client-side çağrısı korundu). `vi.mock("axios")` hoisting uyarısı 5 test dosyasında çözüldü. `.gitignore` `*.md` → `/*.md` daraltıldı (CLAUDE.md artık tracked). Vitest config teardownTimeout eklendi. **189/189 test yeşil, tsc 0 hata.**
- **AI_PUBLISHER_API_KEY Entegrasyon Fix (14 Haziran 2026):** AI Publisher ↔ Sportoto arası API key entegrasyonu tamamlandı. Paylaşılan anahtar `.env` dosyalarına eklendi. Her iki projede de log warning + hata mesajı iyileştirmesi yapıldı. Plan dökümü: `docs/AI_PUBLISHER_API_KEY_FIX.md`.

## Colab Script Denetimi (14 Haziran 2026)
- **Kritik Bug Düzeltildi — `NameError: apply_lipsync`:** `colab_server.py` `/localize-dubbing` rotasında `apply_lipsync()` fonksiyonu çağrılıyordu ancak bu fonksiyon dosyada mevcut değildi. Doğru isim `apply_lipsync_internal()` olup imzası farklıydı (3 parametre yerine 2 zorunlu parametre). Düzeltme sonrası Wav2Lip lip-sync başarıyla uygulanabiliyor, başarısız olursa FFmpeg fallback devreye giriyor.
- **Kritik Eksiklik Düzeltildi — `coqui-tts` Paketi:** `colab_setup.py` kurulum betiğinde XTTS-v2 ses klonlama modelinin kullandığı `coqui-tts` paketi ne import kontrol listesinde ne de `pip install` komutlarında yer alıyordu. Bu durum XTTS-v2'nin hiçbir zaman çalışmamasına neden oluyordu. `coqui-tts` ve `espeak-ng` sistem bağımlılıkları kurulum betiğine eklendi.
- **24 Endpoint Doğrulandı:** Tüm Flask rotaları (`/health`, `/generate-media`, `/generate-covers`, `/generate-avatar`, `/transcribe`, `/localize-dubbing`, `/generate-broll`, `/shutdown` vb.) kod düzeyinde doğrulandı.
- **Potansiyel Uyarılar Belgelendi:** Callback fonksiyonlarındaki dosya tanıtıcı sızıntısı ve RealESRGAN model/scale uyumsuzluğu not edildi.


## Yapılan Testler ve Doğrulama
- **Görsel E2E Tarayıcı Testleri (Yeni):** Playwright kullanılarak headful modda çalışan `scripts/run-e2e.ts` betiği eklendi. Kullanıcı giriş akışı, tema değiştirme, ayarlar menüsü sekmeleri, Fırsatlar Hunisi ve yeni proje formu doldurma adımları görsel olarak ve başarıyla otomatik test edildi.
- **Farklılaştırma & Özgünleştirme Entegrasyon Testleri (Yeni):** `src/test_differentiation.spec.ts` oluşturuldu. `/differentiate-video`, `/differentiate-status/:jobId`, `/approve-translation/:jobId`, ve `/create-job` rotalarının entegrasyonu, asenkron Phase 1-2 iş akışları, veritabanı yazımları ve form veri popülasyonu Vitest ile doğrulandı. 6/6 test başarıyla tamamlandı.
- **Sistem Entegrasyon Testleri:** `/src/test_integration.spec.ts` ile birlikte toplamda 14/14 entegrasyon testi başarıyla doğrulandı.
- **Tarayıcı ve Arayüz Doğrulaması:** Giriş yapma, ayarlar arayüzü, YouTube API arama entegrasyonu, dikey/yatay filtre seçenekleri, süre modları ve Gemini tabanlı farklılaştırma (özgünleştirme) akışları başarıyla çalıştırıldı.
- **Colab Betiği Jupyter Hata Giderimi ve Ayrıştırma:** `colab_setup.py` bang komutları saf python standardına uyarlandı. `colab_hucre1_dependencies.py` (Hücre 1 - Bağımlılıklar) ve `colab_hucre2_server.py` (Hücre 2 - Sunucu Başlatıcı) dosyaları Jupyter Notebook hücre yapısına tam uygun şekilde ayrıştırılarak güncellendi. `sys.stdout`'un `fileno()` metodu olmamasından ötürü oluşan `UnsupportedOperation: fileno` hatası giderilerek sunucu logları `colab_server.log` dosyasına yönlendirildi. Wav2Lip/GAN indirme adresleri HF linkleri ile güncellendi.
- **Sistem Doğrulaması (11 Haziran 2026):** Proje başlangıç ve güvenlik doğrulaması kapsamında TypeScript tip kontrolleri ve 14/14 Vitest entegrasyon testinin tamamı başarıyla yeşile döndü.
- **Colab TTS (coqui-tts) Eksik Paket ve Transformers Import Hatasının Çözülmesi (11 Haziran 2026):** Google Colab'in varsayılan deneysel PyTorch 2.9+ sürümüyle gelen `torchcodec` hata ve uyumsuzluklarını aşmak amacıyla, `colab_setup.py` ve `Google_Colab_AI_Publisher.ipynb` içerisine PyTorch 2.5.1 ve torchaudio 2.5.1 stabil sürüm sabitlemeleri entegre edildi. Ayrıca transformers 4.45+ ve coqui-tts arasındaki import uyumsuzluğundan kaynaklanan `cannot import name 'isin_mps_friendly' from 'transformers.pytorch_utils'` hatasını gidermek amacıyla, `colab_server.py` and `colab_setup.py` dosyalarına dinamik `transformers.pytorch_utils.isin_mps_friendly` monkey patch'i eklenmiştir. Artık video/ses sentezleme adımları sorunsuzca tamamlanmaktadır.
- **Colab Entegrasyonu ve Otonom Git Dağıtımı (11 Haziran 2026):** `colab_setup.py` dosyası güncellenerek, `colab_server.py` dosyasını öncelikle yerel git reposundan kopyalama, yoksa GitHub raw URL üzerinden güncelleyip indirme mantığı kuruldu (hata durumunda yerel fallback desteğiyle). `Google_Colab_AI_Publisher.ipynb` Jupyter Notebook'u sıfırdan, temiz Türkçe açıklamalarla ve önbellekleme sorunlarını tamamen aşmak için doğrudan git clone/pull yöntemiyle en güncel `colab_setup.py` ve `colab_server.py` dosyalarını çekecek şekilde tamamen baştan yazıldı. Yapılan tüm geliştirmeler otomatik git push ile uzak depoya (main) gönderildi.
- **Google Colab Notebook Kopyalama Hatasının Giderilmesi ve Git Dağıtımı (11 Haziran 2026 - v4.2):** `Google_Colab_AI_Publisher.ipynb` içerisindeki `colab_server.py` kopyalama hedefinin `/content/colab_setup.py` olarak yazılması hatası `/content/colab_server.py` olarak düzeltildi. `git clone` aşamasında oluşan 128 hatasını çözmek için `rm -rf` zorla temizleme adımı ve `colab_setup.py` dosyasının ana kernel sürecini (ipykernel) çökertmesini engellemek amacıyla `subprocess.run` üzerinden çalıştırılması düzeltmesi eklendi. Yapılan tüm düzeltmeler uzak repoya başarıyla push edildi.
- **Google Colab GITHUB_TOKEN ve SIGKILL Yönetimi Entegrasyonu (11 Haziran 2026 - v4.3):** Özel repolara erişim sağlamak amacıyla Colab notebook kod hücresine `GITHUB_TOKEN` (userdata/Secrets) desteği eklendi. Ayrıca `colab_setup.py` dosyası kendini SIGKILL ile öldürdüğünde oluşan `CalledProcessError` hatasını yakalayarak ana kernel'i yeniden başlatan `try-except` sarmalayıcısı notebook'a dahil edildi ve güncel sürüm uzak repoya push edildi.
- **Google Colab Canlı Log Akışı ve Kurulum Görünürlüğü (11 Haziran 2026 - v4.4):** Arka planda olup bitenlerin ve kurulum hatalarının detaylıca görülebilmesi için `colab_setup.py` pip install komutlarındaki `-q` (quiet) sessizleştirme bayrakları temizlendi. Colab notebook hücresinde `subprocess.run` yerine canlı log akışını (stdout/stderr) doğrudan ekrana yazdıran `subprocess.Popen` tabanlı bir sarmalayıcı entegre edilerek tüm kurulum süreci anlık izlenebilir hale getirildi ve uzak repoya push edildi.
- **Colab GPU Kredi Yönetimi ve Hata İzleme (12 Haziran 2026 - v4.5):** Colab içerisinde `nvidia-smi` üzerinden anlık VRAM kullanımını takip eden ve %95 üstü dolulukta `flush_vram()` tetikleyen "GPU Memory Watchdog" eklendi. Ayrıca kurulum aşamasındaki `CalledProcessError` hataları için detaylı error-stack çıktısı log dosyasına eklenerek debugging süreci hızlandırıldı.
- **Otonom Kernel Sağlık Kontrolü ve Otomatik Restarter (12 Haziran 2026 - v4.6):** Colab kernel'inin "zombie process" durumuna düşmesi halinde bunu otomatik tespit edip `os.kill(os.getpid(), signal.SIGTERM)` ile kendini resetleyen `Heartbeat Monitor` mekanizması devreye alındı. Böylece 12 saatlik Colab oturumlarında sunucunun asılı kalması engellenerek `Google_Colab_AI_Publisher.ipynb` içerisindeki "Sonsuz Oturum" kararlılığı sağlandı.
- **Otomatik Model Seçimi ve Wan 2.1 Entegrasyonu (12 Haziran 2026 - v4.7):** Video Jobs tablosundaki `production_template` kolonunun seçimine göre `cinematic` (HunyuanVideo), `dynamic` (Wan 2.1), `simple` (LTX-Video) modellerinin otomatik olarak seçilip arka planda asenkron kuyrukta işletilmesi sağlandı. Teknik dropdown seçici arayüzden kaldırılarak yerine modern şablon seçici kartlar ve dinamik i18n açıklamaları eklendi. `tsc` tip denetimi sıfır hata ile doğrulandı.
- **Otonom Temizlik, Erken Polling Çıkışı ve Ses Klonlama Entegrasyonu (12 Haziran 2026 - v4.8):** Sahne 1 üretimi bittiğinde `job.material_path` dosyasını diskten anında silen optimizasyon eklendi. Polling döngüsünde callback ile push edilen dosyalar tamamlandığında beklemeden erken sonlandırmayı sağlayan early exit mantığı entegre edildi. Colab tarafına lazy XTTS-v2 yükleme, base64 referans ses ve Edge-TTS fallback dublaj/TTS desteği eklendi. Node.js backend'de `users` tablosuna `personal_voice_base64` kolonu, ayarlar paneline referans ses dosyası yükleme ve kuyruktan Colab'a otomatik ses base64 yollama özellikleri tamamlandı. Kurulum rehberi (`KURULUM_VE_GEREKSINIMLER.md`) oluşturuldu, `README.md` ve `CLAUDE.md` şemaları güncellendi. Vitest ile 18/18 testin tamamı başarıyla yeşile döndürülmüştü.
- **Colab Hızlı Başlatma, Otonom Kapanma ve Yeni Entegrasyon Testleri (12 Haziran 2026 - v4.9):** Google Colab sunucusunun fatura maliyetlerini düşürmek için kuyruk bittiğinde veya el ile durdurulduğunda Colab VM'ini unassign (`google.colab.runtime.unassign()`) eden `/shutdown` endpoint'i ve ColabManager entegrasyonu tamamlandı. Sunucu başlatma süresini 10 kat hızlandırmak için `pip` yerine `uv pip install --system --prefer-binary` geçişi yapıldı. iyzico webhook doğrulamaları, timeline amix müzik miksajı ve çoklu karakter lipsync tag parsing akışlarını mock'layıp doğrulayan yeni Vitest entegrasyon test dosyası (`src/test_characters.spec.ts`) yazıldı. Tüm testler (22/22) başarıyla yeşillendi.

---

## v6.0 — Mimari Kararlar (15 Haziran 2026)

| Karar | Seçim | Gerekçe |
|---|---|---|
| **Cloud** | **GCP** | T4 GPU $0.16/hr (AWS $0.53), Gemini native, TPU opsiyonu |
| **Ödeme** | **Iyzico** | Stripe TR'de desteklenmez, Iyzico %2.39+0.25TL taksit+subscription |
| **Avatar/Lip-Sync** | **MuseTalk + Wav2Lip** | Self-hosted Colab'da, HeyGen/Tavus ($54+/ay) yerine $0 |
| **Video Kişiselleştirme** | **Remotion** | Zaten projede var, Tavus yerine ücretsiz |
| **Görsel Kaynak** | **SD/Flux (Colab)** | Pexels rate limit yok, API bağımlılığı yok |
| **LLM** | **Gemini (birincil) + Minimax M3 (fallback)** | Google AI Ultra abonelik mevcut |
| **TalkShow** | OpenRouter + ZEN free modeller | Çoklu karakter halüsinasyon önleme |
| **DeepSeek** | KALDIRILDI | Kullanılmıyor |

Detaylı roadmap: `docs/v6_roadmap/README.md`

## v6.0 — Kalan İşler (Sprint 18 Roadmap'ten 6 Job)

Sprint 18'den kalan 6 Job (24 özellik) v6.0 planına entegre edildi:

| Job | Özellik | Faz/Track | Mevcut Servis |
|---|---|---|---|
| **Job-2** | Split Screen + MuseTalk Avatar | **Faz 3B** | Yeni (MuseTalk Colab) |
| **Job-3** | Smart Dubbing (beat-sync+transkript+dublaj) | **Faz 4A** | ✅ `beatSyncEditor.ts`, `transcriptEditor.ts`, `autoDubbing.ts` |
| **Job-4** | Cut & Color Agent | **Faz 3C** | ✅ `colorGrader.ts`, `chatToEdit.ts` |
| **Job-5** | Dynamic Subtitles + faster-whisper | **Faz 4B** | ✅ `DynamicCaptions.tsx`, `subtitleRenderer.ts` |
| **Job-6** | AI Studio (eye contact+sound+reframe+inpaint) | **Faz 4C** | ✅ Colab endpoint'leri mevcut |
| **Job-7** | Viral Engine (B-Roll+hook+hashtag) | **Faz 5A** | ✅ `aiBroll.ts`, `viralHookGenerator.ts` |

Toplam: 6 Job × 4 özellik = 24 özellik. Servislerin çoğu mevcut, sadece queue/UI bağlantısı gerekli.

Önerilen işleme sırası: **Job-5 (hızlı kazanım) → Job-4 (kolay) → Job-3 (orta) → Job-7 → Job-6 → Job-2**

### Faz 7 — Testing & QA (Yeni)

| Track | Odak | Araç | Hedef |
|---|---|---|---|
| **7A** | Statik Analiz & Kod Kalitesi | ESLint, tsc strict, custom script | 0 warning, 0 hardcoded string |
| **7B** | Birim Testleri | Vitest | ~98 test, tüm servisler |
| **7C** | Entegrasyon Testleri | Colab mock + Express | Full pipeline, queue, SSE, routes |
| **7D** | E2E Testleri | Playwright | Kullanıcı akışları, publishing |
| **7E** | CI Altyapı | GitHub Actions, coverage | >%80 branch, 3 platform |

Detay: `docs/v6_roadmap/Faz_7_Testing_QA.md`

### Grup 1 Uygulama Durumu (15 Haziran 2026)

| Track | Durum | Yapılan |
|---|---|---|
| **1B** | ✅ Tamam | `src/services/nicheProfile.ts` + `src/routes/niche.ts` — 3 built-in niche (gaming, comedy, education) + AI analysis fallback |
| **1C** | ✅ Tamam | `queue.ts` — SD/Flux pre-scene image gen (Flux + DreamShaper), Colab endpoint zaten mevcuttu |
| **3B** | ✅ Tamam (Split) | `src/services/splitScreen.ts` + `src/routes/splitScreen.ts` — 5 layout (50/50, 70/30, 60/40, 30/70, 40/60), 4 position (top/bottom/left/right) |
| **3B** | ⏳ Kısmi (MuseTalk) | Split screen hazır; MuseTalk Colab endpoint'i sonraki iterasyonda eklenecek |
| **3C** | ✅ Tamam | `queue.ts` — color grade post-processing stage, 7 preset (warm_cinematic, cool_moody, cinematic, neon_purple, vintage_warm, desaturated, high_contrast) |
| **4B** | ✅ Tamam | `queue.ts` — `kinetic_subtitles_style` desteği (bounce/pulse/shake/pop/wave), `videoService.ts` — ASS converter style parametresi |
| **1A** | ⏳ Kısmi | Template prompt servisi mevcut; SwiftClip 32 template genişletmesi sonraki iterasyonda |
| **DB** | ✅ Tamam | 10 yeni kolon: niche_profile, niche_enabled, split_layout, split_enabled, color_grade_preset, color_grade_enabled, sd_flux_enabled, sd_flux_prompt, kinetic_subtitles_style, transcript_word_timings |
| **Compile** | ✅ Geçti | `tsc --noEmit` 0 hata |

Kalan Grup 1: MuseTalk Colab endpoint (3B), SwiftClip 32 template genişletmesi (1A)

---

## Sprint Planı — Yeni Özellik Entegrasyonları (v5.0+)

### Sprint 1 (Hafta 1-2) — Temel & Chat-to-Edit v1

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — vibeclip** | Chat-to-Edit servisi (`src/services/chatToEdit.ts`), tool-calling agent ile doğal dil → FFmpeg kurgu, sahne puanlaması (hook/flow/value) | ✅ Tamam |
| **B — Refactor** | `server.ts` (5093 satır → modüler `routes/`, `middleware/`, `views/`), magic number'ları env'e taşıma | ✅ Zaten tamam |
| **C — Bug Fix** | SSE Auth, Rate Limiting, Global Error Middleware, Cancel Endpoint | ✅ Zaten tamam |

### Sprint 2 (Hafta 3-4) — Karakter Tutarlılığı & Remotion — ✅ TAMAMLANDI

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — ViMax** | Multi-agent pipeline (Director/Screenwriter/Producer/VideoGenerator), AutoCameo (fotoğraftan karakter, Colab avatar endpoint), MLLM frame validation (sahne tutarlılığı + final video), RAG script generation (Gemini storyboard alternatifi), 5 API endpoint | ✅ Tamam |
| **B — short-video-maker** | Remotion React komponenti (`client/src/components/RemotionVideo.tsx`), Pexels B-roll route (`src/routes/bRoll.ts` — POST generate + GET list), Kokoro TTS Colab entegrasyonu, MCP server (`src/services/mcpServer.ts` — 5 tool, chat, 3099 port), `src/server.ts` kayıtları | ✅ Tamam |

---

## Sprint 2 — Çıktılar (12 Haziran 2026 - v5.1)
- **ViMax Multi-Agent Pipeline (Yeni):** `src/services/multiAgentPipeline.ts` — Director (senaryo planlama), Screenwriter (diyalog/speech üretimi), Producer (kamera hareketi/SFX planlaması), VideoGenerator (Colab orchestration) ajanlarından oluşan pipeline. `qualityInspect()` ile final video frame-by-frame doğrulama. `src/routes/viMax.ts` — 5 endpoint: `/api/v1/vimax/pipeline`, `/auto-cameo`, `/validate-consistency`, `/quality-inspect`, `/rag-script`.
- **AutoCameo (Yeni):** `src/services/autoCameo.ts` — Karakter tasvirinden `@` tag parser ile karakter çıkarma, Colab avatar endpoint'ine görsel ürettirme, Base64 PNG olarak diske kaydetme.
- **MLLM Validator (Yeni):** `src/services/mllmValidator.ts` — `validateSceneConsistency()` ile 7 kriter (arkaplan, karakter görünümü, duygu durumu, saat/ışık, kamera açısı, renk paleti, mekan), `validateFinalVideo()` ile frame-by-frame kalite kontrolü.
- **RAG Script Generator (Yeni):** `src/services/ragScriptGenerator.ts` — SQLite'dan geçmiş projelerin senaryolarını RAG ile tarayıp Gemini storyboard alternatifi olarak prompt zenginleştirme.
- **B-Roll Route (Yeni):** `src/routes/bRoll.ts` — `POST /api/v1/broll/generate-broll` (Colab Pexels B-roll üretimi), `GET /api/v1/broll/broll/list` (mevcut B-roll'leri listeleme).
- **Kokoro TTS (Yeni):** `src/services/kokoroTts.ts` — Kokoro TTS'in Colab `/generate-media?mode=kokoro_tts` endpoint'i üzerinden kullanımı. Mevcut XTTS/OpenAI/Edge zincirine ek seçenek.
- **Remotion Video Composition (Yeni):** `client/src/components/RemotionVideo.tsx` — React bileşeni, sahneleri kademeli katmanlar halinde render eden SceneLayer yapısı, 1080×1920 portre modu.
- **MCP Server (Yeni):** `src/services/mcpServer.ts` — Model Context Protocol sunucusu (port 3099). 5 MCP tool: `list_jobs`, `get_job_details`, `get_colab_status`, `list_broll`, `get_job_progress`. `POST /mcp/v1/tools`, `/mcp/v1/execute`, `/mcp/v1/chat` endpoint'leri. AI ajanları (Claude Code vb.) ile etkileşim.
- **TypeScript:** `tsc --noEmit` sıfır hata ile doğrulandı.
- **Testler:** 22/22 Vitest başarıyla geçti.

---

## Sprint 3 — Çıktılar (12 Haziran 2026 - v5.2)

### Track A: Pipecat — Multi-Agent Voice/Video Pipeline
- **Pipecat Python Server (Yeni):** `services/pipecat_server.py` — FastAPI WebSocket sunucusu (port 8765). Pipeline yönetimi (start/cancel/status/list), HeyGen/Tavus avatar simülasyonu, AI broadcast endpoint. WebSocket üzerinden gerçek zamanlı ses/video akışı.
- **Pipecat Node.js Bridge (Yeni):** `src/services/pipecatBridge.ts` — Python subprocess yönetimi (spawn, auto-restart, health check). WebSocket client ile Python sunucusuna bağlantı. Callback pattern ile olay tabanlı iletişim.
- **Avatar Service (Yeni):** `src/services/avatarService.ts` — HeyGenService + TavusService. API key varsa gerçek çağrı, yoksa graceful skip ile simülasyon modu.
- **Pipecat Routes (Yeni):** `src/routes/pipecat.ts` — 8 REST endpoint: `POST /api/v1/pipecat/start-server`, `POST /stop-server`, `POST /pipeline/start`, `POST /pipeline/:id/cancel`, `GET /pipeline/:id/status`, `GET /pipelines`, `POST /avatar/generate`, `POST /ai-broadcast`.
- **server.ts Entegrasyonu:** Tüm pipecat rotaları server.ts'e kayıtlı, auto-start ile Python sunucusu otomatik başlatılıyor.

### Track C: Known Issues — Audit, Toplu Yayın, Prettier/ESLint
- **Audit Log API (Yeni):** `src/routes/audit.ts` — `GET /api/v1/audit-logs` (sayfalı, filtreli log listesi), `GET /api/v1/audit-logs/actions` (aksiyon tipleri). Her önemli işlem otomatik audit log'a kaydediliyor.
- **Toplu Yayın (Yeni):** `src/routes/publish.ts` — `POST /api/v1/publish-all/:id` endpoint'i. Bir videoyu tüm hedef platformlara (YouTube, TikTok, X, Meta) sırayla yayınlar.
- **Prettier/ESLint Standardı:** `.prettierrc` oluşturuldu (semi, singleQuote, trailingComma all). `prettier` + `eslint-config-prettier` kuruldu. `format:check` / `format:write` scriptleri package.json'a eklendi.
- **Husky Pre-commit Hook:** `.husky/pre-commit` — her committe otomatik `npx tsc --noEmit && npx vitest run --reporter=verbose`.
- **server.ts:** Audit ve publish-all rotaları kayıtlı.
- **TypeScript:** `tsc --noEmit` sıfır hata ile doğrulandı.
- **Testler:** 22/22 Vitest başarıyla geçti.

---

### Sprint 3 (Hafta 5-6) — Pipecat & Known Issues — ✅ TAMAMLANDI

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Pipecat** | Python → Node.js bridge, WebRTC/WebSocket streaming, HeyGen/Tavus avatar entegrasyonu, Multi-agent handoff / RabbitMQ fan-out | ✅ Tamam |
| **C — Known Issues** | Audit Log tablosu + middleware, Toplu Yayın butonu, Prettier/ESLint standartı | ✅ Tamam |

### Sprint 4 (Hafta 7-8) — CI/CD & React Migration

| Paralel Track | İçerik | Durum |
|---|---|---|
| **B — CI/CD** | GitHub Actions — otomatik typecheck + test (`.github/workflows/ci.yml`) | ✅ Tamam |
| **C — React Migration** | Express template → React/Vite bileşen tabanlı mimariye geçiş başlangıcı | ✅ Tamam |
| **A — E2E Testler** | Chat-to-Edit, ViMax, Pipecat, B-Roll, Kokoro TTS entegrasyon testleri (20/20) | ✅ Tamam |

### Sprint 5 (Hafta 9-10) — Frontend Modüler Refactor & Type-Güvenliği

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Bileşen Çıkarımı** | Monolitik `App.tsx` (1208 satır) → 4 ayrı bileşen: `Header`, `ProjectForm`, `StudioPanel`, `GalleryPanel` | ✅ Tamam |
| **B — Tip Güvenliği** | Paylaşılan `client/src/types.ts`, `verbatimModuleSyntax` uyumlu `import type` | ✅ Tamam |
| **C — Derleme Doğrulama** | `tsc --noEmit` sıfır hata, `vite build` başarılı, 42/42 Vitest testi geçti | ✅ Tamam |

### Sprint 6 (Hafta 11-12) — FFmpeg Coworker Pool Tamamlanması

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Worker Refactor** | Tüm `execFile(ffmpeg\|ffprobe)` çağrıları `worker_threads` üzerinden yeni `runFFmpeg()` / `runInWorker()` yardımcılarına taşındı | ✅ Tamam |
| **B — Refactor Temizliği** | `runFFmpegWithFallback` basit döngüye indirgendi, `child_process.execFile` ve `url.fileURLToPath` import'ları kaldırıldı | ✅ Tamam |
| **C — Doğrulama** | `tsc --noEmit` sıfır hata, 42/42 Vitest testi geçti | ✅ Tamam |

### Sprint 7 (Hafta 13) — Mimari Karar Kayıtları (ADR)

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Bileşen Mimarisi ADR** | `docs/adr/ADR-002-Frontend-Component-Architecture.md` — Sprint 5'teki 1208 satırlık App.tsx parçalanmasının gerekçesi | ✅ Tamam |
| **B — Worker Pool ADR** | `docs/adr/ADR-003-FFmpeg-Worker-Pool.md` — Sprint 6'daki ffmpeg çağrılarının worker_threads'e taşınmasının gerekçesi | ✅ Tamam |
| **C — ADR Takibi** | `docs/adr/ADR-001-TTS-Engine-Evaluation.md` dahil tüm ADR'ler git'e eklendi | ✅ Tamam |

### Sprint 8 (Hafta 14) — Lint Temizliği

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — `@ts-ignore` → `@ts-expect-error`** | `src/routes/payments.ts` iyzipay import'unda yüke bağlı (load-bearing) direktif | ✅ Tamam |
| **B — Useless escape temizliği** | `src/views/dashboardScripts.ts` — tek-tırnaklı JS string içindeki gereksiz `\'` kaçışları kaldırıldı (font adı zaten tırnaksız) | ✅ Tamam |
| **C — Doğrulama** | `npm run check:lint` 0 hata, `tsc --noEmit` 0 hata, 42/42 vitest geçti | ✅ Tamam |

### Sprint 9 (Hafta 15) — Multi-Agent Talk-Show Orchestrator (MVP)

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Orkestratör** | `src/services/talkShow/orchestrator.ts` — 5 ajanlı (meta-orchestrator + match_analyst + former_player + bookmaker + data_scout) | ✅ Tamam |
| **B — Veri Kaynakları** | `src/services/talkShow/dataSources.ts` — deterministik stub'lar (match feed, hava, sakatlık, oran) | ✅ Tamam |
| **C — Route'lar** | `src/routes/talkShow.ts` — POST `/orchestrate` + GET `/health`, server.ts'e kayıtlı | ✅ Tamam |
| **D — Test** | `src/test_talkShow.spec.ts` — 16 test (deterministik, AI fallback, API validasyonu, doğrulama) | ✅ Tamam |

### Sprint 10 (Hafta 16) — Production Audit & Fixes

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Ölü Kod Temizliği** | `queue.ts`: `DEFAULT_IDLE_STOP_MS` import + `clients` export kaldırıldı | ✅ Tamam |
| **B — GPU Boyut Kontrolü** | `colab_server.py`: SFX (`generate_sfx_lazy`) ve kapak (`generate_covers_lazy`) GPU boyut kontrolü (≥18GB→CUDA, <18GB→CPU offload) | ✅ Tamam |
| **C — Route Hata Dil Tutarlılığı** | `jobs.ts`: İngilizce `'Job not found'` → Türkçe `'Job bulunamadı.'` | ✅ Tamam |
| **D — Queue Retry Mekanizması** | `queue.ts`: Geçici Colab hatalarında (COLAB_NOT_READY, timeout, ağ) iş 2 kez yeniden denenir; `retry_count` kolonu eklendi | ✅ Tamam |
| **E — Test** | `src/test_audit_fixes.spec.ts` — 4 yeni test (schema migration, retry_count okuma/yazma, tip denetimi) | ✅ Tamam |
| **F — Doğrulama** | `tsc --noEmit` 0 hata, `npm run check:lint` 0 hata, `vite build` 1.03s, 62/62 vitest (7 dosya) | ✅ Tamam |

### Sprint 13 (Hafta 17) — Görsel Tasarım & Örnekler Entegrasyonu (v5.5)

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Tasarım Yapılandırması** | Dark luxury teması, Cormorant Garamond ve Manrope fontları, buton uppercase kuralları ve altın rengi detaylar. | ✅ Tamam |
| **B — Örnekler Vitrini** | `/demo-videos` API entegrasyonu, asimetrik editorial ExamplesPanel bileşeni, varsayılan sekme. | ✅ Tamam |
| **C — Video Yer Tutucular** | pending, failed, awaiting_approval, processing durumları için premium animasyonlu placeholder'lar. | ✅ Tamam |
| **D — TypeScript & Test** | AIStoryAssistant, TemplatePreview, HelpVideoPanel hataları onarıldı, 75/75 Vitest testi geçti. | ✅ Tamam |

### Sonraya Bırakılanlar

| Madde | Gerekçe |
|---|---|
| **Top Yuvarlak AI Talk-Show (S3.B)** | Sportoto API entegrasyonu gerektiriyor, harici bağımlılık yüksek |
| **Docker Compose** | Bu geliştirme makinesinde Docker çalışmıyor |
| **Faz C-H v2 Geliştirmeleri (7 Job)** | React Migration (S4.C) sonrası başlanmak üzere [`docs/Sprint_18_Roadmap.md`](./docs/Sprint_18_Roadmap.md) dosyasına taşındı |

---

---

## ✅ Sprint 4.C — Çıktılar (React Migration) (13 Haziran 2026)

- **React Router Kurulumu:** `react-router-dom` eklendi, `BrowserRouter` ile `main.tsx` sarmalandı. App.tsx artık `<Routes>` kullanıyor: `/login` rotası için `LoginPage`, `/*` rotası için LandingPage (çıkış) / Dashboard (giriş).
- **LoginPage Bileşeni (Yeni):** `client/src/components/LoginPage.tsx` — Express HTML template'inin React karşılığı. Türkçe/İngilizce dil desteği, form validasyonu, hata gösterimi. POST `/login` API'si ile çalışır.
- **SettingsModal Bileşeni (Yeni):** `client/src/components/SettingsModal.tsx` — 5 sekmeli (Appearance, Language, Account, Production, Characters) tam ayarlar modalı. Tema seçimi (9 tema), dil değiştirme, profil resmi yükleme, üretim ayarları (grid pozisyonu, anlatıcı tonu, YouTube API key, lip-sync, end screen, brand kit, voice cloning), karakter yönetimi (ekleme, SD avatar üretme, silme).
- **CoverSelector Bileşeni (Yeni):** `client/src/components/CoverSelector.tsx` — Tamamlanmış projeler için kapak fotoğrafı seçici. 3'lü grid, görsel önizleme, seçili kapak vurgusu.
- **GalleryPanel Güncellemesi:** `MetaEditor` bileşenine `CoverSelector` entegrasyonu, viral skor gösterimi ve AI Viralite Analizi butonu eklendi.
- **Express Template Temizliği:** `src/routes/auth.ts` GET `/login` artık redirect ediyor (React SPA'ya). `src/routes/dashboard.ts` GET `/` pasifleştirildi. Kullanılmayan `buildLoginHTML`/`buildDashboardHTML` import'ları kaldırıldı.
- **Server.ts Güncellemesi:** React SPA (`client/dist`) artık her ortamda serve ediliyor (NODE_ENV kontrolü kaldırıldı). Catch-all route her zaman aktif.
- **Doğrulama:** `tsc --noEmit` 0 hata, `vite build` 801ms başarılı, 165/165 Vitest testi yeşil.

---

## ✅ Sprint 4B — ScriptEngine + Script Routes Tests (14 Haziran 2026)
- **Test Dosyası:** `src/test_scripts.spec.ts` — 27 test, 4 describe bloğu
- **1. AI Methods (real class + spyOn):** `generateOutline` (structured scenes), `generateDialogue` (dialogue text)
- **2. generateFullScript (real class + mocked AI):** creates script+segments in DB, throws for non-existent show
- **3. CRUD operations (real class, DB):** listScripts, getScript (with segments + null), updateScript (with null), updateSegment (with null), deleteScript (with false)
- **4. REST API (spy on exports):** 14 endpoint test — POST generate (reject + success), GET list, GET by id (with 404), PUT update (with 404), PUT segment (with 404 + mismatch), POST regenerate (with 400), DELETE (with 404), 401 unauthenticated
- **Mock Mimarisi:** `rate-limit`, `audit`, `redis` mock'ları module-level. ScriptEngine metodlarına doğrudan `vi.spyOn`. Route handler'larda export edilen `scriptEngine` singleton'ı kullanıldı.
- **Önemli:** Stale `.js` derlemeleri vitest'i `.ts` kaynakları yerine compiled JS'e yönlendiriyordu — testlerde sorun yaşanırsa `src/routes/scripts.js` ve `src/services/talkShow/scriptEngine.js` temizlenmeli.
- **Sonuç:** `tsc --noEmit` 0 hata, 27/27 vitest yeşil.

---

## ✅ Sprint 3B — Sportoto Bridge + Script Engine Entegrasyonu (14 Haziran 2026)

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — DiscussionSource** | Interface (SportotoSource + StubSource), refactored sportotoBridge.ts | ✅ Tamam |
| **B — Script Engine Entegrasyonu** | `ScriptEngine.generateFromDiscussion()` — Sportoto utterance'larını AI ile zenginleştirip script'e dönüştürür | ✅ Tamam |
| **C — Endpoint** | `POST /sportoto/:week/generate-script` — Sportoto → ScriptEngine pipeline | ✅ Tamam |

**Yeni Dosyalar:**
- `src/services/talkShow/discussionSource.ts` — `DiscussionSource` interface, `SportotoUtterance`/`SportotoDiscussion` tipleri, `StubSource` sınıfı
- `src/services/talkShow/sportotoBridge.ts` — `SportotoSource` class (DiscussionSource implementasyonu), geriye uyumlu `fetchWeeklyDiscussion` fonksiyonu korundu

**Değişen Dosyalar:**
- `src/services/talkShow/scriptEngine.ts` — `generateFromDiscussion()` metodu eklendi
- `src/routes/talkShow.ts` — `POST /sportoto/:week/generate-script` endpoint'i, `DiscussionSource` tip import'ı
- `src/services/talkShow/videoProducer.ts` — `SportotoDiscussion` import'ı `discussionSource.ts`'e yönlendirildi

**Mimari:**
```
StudioPanel (React) → POST /sportoto/:week/generate-script
  → SportotoSource.fetchWeeklyDiscussion()  (Sportoto API)
  → ScriptEngine.generateFromDiscussion()   (utterance → AI zenginleştirme → DB)
  → scripts + script_segments tablolarına yazılır
```
- `DiscussionSource` interface: hem gerçek Sportoto API (SportotoSource) hem test/mock (StubSource) aynı arayüzden kullanılabilir
- `StubSource` deterministik hash tabanlı mock veri üretir — CI/test ortamlarında çalışır
- `generateFromDiscussion()` her utterance'ı karakter eşlemesi yaparak AI ile zenginleştirir, scene_type'ı pozisyona göre belirler (opening/talk/closing)

**Doğrulama:** `tsc --noEmit` 0 hata, 43/43 vitest (27 Sprint4B + 16 Sprint9) yeşil.

---

## ✅ Sprint 4.A — Çıktılar (E2E Testler)
- **E2E Test Suite:** `src/test_e2e_features.spec.ts` — 4 ana modül için 20 entegrasyon testi:
  - **vibeclip Chat-to-Edit:** `parse`, `apply`, `score`, geçersiz komut
  - **ViMax Multi-Agent:** `pipeline`, `auto-cameo`, `validate-consistency`, `quality-inspect`, `rag-script`, 404 doğrulama
  - **Pipecat:** `start-server`, `stop-server`, `pipeline`, `pipelines`, `avatar/generate`, `broadcast`, `health`
  - **B-Roll & Kokoro TTS:** `generate-broll`, `list`, Kokoro sentezi
- **Test İzolasyonu:** Her testin kendi admin ID'sini yakalayan `adminUserId` değişkeni, gerçek kullanıcı kimliği ile `WHERE user_id = ?` filtrelerini geçiyor.
- **Mock Mimari Standardı:** `ai` SDK (`generateText`), `avatarService` (sınıf + instance), `axios` (download_url), `pipecatBridge` (start/stop/healthCheck), `rabbitmq` (queue), `queue` (broadcast) modülleri vitest `vi.mock` ile yalıtıldı.
- **DB NOT NULL Çözümü:** `video_scenes.sort_order` ve `status` kolonları test INSERT'larına eklendi.
- **Sonuç:** 20/20 test geçti; tüm test paketi 42/42 yeşil.

---

## ✅ Sprint 5 — Çıktılar (Frontend Modüler Refactor)
- **Monolitik App.tsx Parçalanması:** 1208 satırlık tek dosya 4 ayrı bileşene ayrıldı.
  - `client/src/components/Header.tsx` — Navbar (tema seçici, dil toggle, karanlık mod, fırsatlar, grup sohbeti, krediler, çıkış).
  - `client/src/components/ProjectForm.tsx` — Sol kenar çubuğu (master prompt, notlar, karakter, dosya yükleme, 4 şablon, TTS, 6 özellik checkbox, 4 platform).
  - `client/src/components/StudioPanel.tsx` — Orta panel (tab bar, önizleme/timeline, fırsatlar hunisi, grup sohbeti placeholder).
  - `client/src/components/GalleryPanel.tsx` — Sağ kenar çubuğu (progress tracker, meta editör, galeri, durum badge'leri).
- **Paylaşılan Tipler:** `client/src/types.ts` — `Job`, `UserCredits`, `Language`, `Tab`, `ProductionTemplate`, `TtsProvider`, `Platform`. `Scene` ve `OpportunityVideo` tipleri ilgili bileşenlerden `import type` ile çekildi.
- **Type-Only Import Standardı:** `verbatimModuleSyntax: true` gereksinimi nedeniyle tüm tip import'ları `import type` ile güncellendi.
- **Mevcut Bileşen Temizliği:** `LandingPage`, `PhotoEditor`, `Opportunities`, `RemotionVideo` içindeki kullanılmayan lucide-react import'ları kaldırıldı; `Timeline` `_index` parametre uyarısı giderildi.
- **Sonuç:** `tsc --noEmit` sıfır hata, `vite build` 809 ms'de başarılı, tüm backend + frontend testleri 42/42 yeşil.

---

## ✅ Sprint 6 — Çıktılar (FFmpeg Coworker Pool)
- **`runInWorker<T>()` Yardımcısı:** `src/services/videoService.ts` içine eklendi. `worker_threads` üzerinden komut çalıştırır; ts-node / dev ortamında `.ts` kaynak dosyasını eval ile yükler, production'da derlenmiş `.js` dosyasını kullanır.
- **`runFFmpeg()` Sarmalayıcısı:** Tek komut için standartlaştırılmış Promise arayüzü (stdout/stderr döndürür, hata/timeout fırlatır). 30 sn varsayılan zaman aşımı korunur.
- **`runFFmpegWithFallback` Basitleştirildi:** Önceden Worker oluşturma mantığını manuel yöneten 30+ satırlık kod, `runFFmpeg`'i döngüde çağıran 15 satırlık basit bir yapıya indirildi.
- **`FFmpegCommand.timeoutMs` Alanı:** İsteğe bağlı zaman aşımı parametresi eklendi.
- **Tüm `execFile(ffmpeg|ffprobe)` Çağrıları Taşındı:** `ensurePingSound`, `addCalloutPings`, `generateEndScreenImage`, `applyEndScreen`, `getVideoDuration`, `applyBrandKit` artık tümüyle worker üzerinden çalışıyor; ana event loop bloke olmuyor.
- **Import Temizliği:** Kullanılmayan `child_process.execFile` ve `url.fileURLToPath` import'ları kaldırıldı.
- **Sonuç:** 104 satır eklendi, 100 satır silindi (net +4); tüm davranış korundu. `tsc --noEmit` sıfır hata, 42/42 vitest yeşil.

> **Not:** S3.B ve S4.A sprint planından çıkarıldı, ilerleyen aşamalarda değerlendirilmek üzere ertelendi.

---

## ✅ Sprint 11 — Çıktılar (Caveman Skill Entegrasyonu) (13 Haziran 2026 - v5.3)
- **Terse Chat/Prompts Optimizasyonu (Caveman):** AI asistanların çıktı token tüketimini %65-75 oranında düşürmek amacıyla JuliusBrussee/caveman skill'i globalde ve yerel projede entegre edildi.
- **Çoklu Platform Kurulumu:** Claude Code, opencode ve OpenClaw platformları için global yapılandırma entegre edildi.
- **Google Antigravity Entegrasyonu:** Proje dizini altında yer alan Google Antigravity için 7 adet `caveman` alt skill'i (`cavecrew`, `caveman`, `caveman-commit`, `caveman-compress`, `caveman-help`, `caveman-review`, `caveman-stats`) `.agents/skills/` altına kuruldu.
- **Yerel IDE Kural Entegrasyonu:** Cursor (`.cursor/rules/caveman.mdc`), Windsurf (`.windsurf/rules/caveman.md`), Cline (`.clinerules/caveman.md`), ve Copilot (`.github/copilot-instructions.md`) için kural dosyaları otomatik oluşturuldu.
- **Kural Korunumu:** `AGENTS.md` dosyasındaki kural bütünlüğü korunarak kurulum süreci temiz bir şekilde tamamlandı.

---

## ✅ Sprint 12 — Çıktılar (Akıllı Prompt ve Tema Servisleri) (13 Haziran 2026 - v5.4)
- **Akıllı Prompt Geliştirici:** Kullanıcının ham video promptunu kamera hareketi ve şablon seçimine göre optimize eden `enhanceVideoPrompt` fonksiyonu entegre edildi. Form arayüzündeki `masterPrompt` yanına "AI ile Geliştir" butonu eklenerek anlık zenginleştirme desteği sağlandı.
- **Öğretici Video Prompt Üretici:** Özelliklerin nasıl kullanılacağını gösteren sahne sahne tutorial promptları hazırlayan `generateTutorialPrompts` fonksiyonu entegre edildi.
- **Landing Page Asset Üretici:** Kategori bazlı Hero ve showcase videoları için prompt planlayan `generateLandingPageAssets` fonksiyonu entegre edildi.
- **Dinamik HSL Tema Üretici:** Arayüzde kullanılabilecek CSS/HSL uyumlu dynamic renk paletleri üreten `generateCustomThemes` fonksiyonu entegre edildi. Tema Sihirbazı panelinden tek tıkla arayüze canlı olarak uygulanma desteği eklendi.
- **AI Asistan Paneli:** `client/src/components/AiAssistantPanel.tsx` oluşturuldu ve Eğitim Planlayıcı, Vitrin Varlıkları Tasarımcısı ve Tema Sihirbazı araçları "AI Asistan" sekmesi altında kullanıcıya sunuldu.
- **API Rotaları:** `/api/v1/ai-helper/` altında 4 endpoint (`enhance-prompt`, `tutorial-prompts`, `landing-assets`, `custom-theme`) Express sunucusuna bağlandı.
- **Test ve Tip Denetimi:** `src/test_prompt_services.spec.ts` ve `src/test_ai_helper.spec.ts` (toplam 10 test) başarıyla geçti. TypeScript derlemesi (`tsc --noEmit`) ve Vite client build sıfır hata ile doğrulandı.

---

## ✅ Sprint 13 — Çıktılar (Kuyruk Kararlılığı ve FFmpeg Pool Worker Onarımı) (13 Haziran 2026 - v5.5)
- **Kuyruk Kararlılığı ve TypeError Onarımı:** `queue.ts` içinde `startProduction` fonksiyonunda Fırsatlar Hunisi otonom akışı sonrası `job` nesnesinin `undefined` ile ezilerek `TypeError: Cannot read properties of undefined (reading 'scene_prompts')` hatasıyla uygulamanın çökmesi engellendi. `updatedJob` veritabanı reload işlemlerinde nesne ve id varlık kontrolleri sıkılaştırıldı.
- **FFmpeg Pool Worker Hata Giderimi:** Geliştirme/test ortamlarında `.js` derlemesi bulunmadığı için `ffmpeg-pool-worker.js` modülünün bulunamaması uyarısı, `videoService.ts` üzerinde `fs.existsSync` kontrolü ve `execFile` fallback mekanizmasıyla çözüldü. Bu sayede üretim derlemesi olmayan lokal geliştirme süreçlerinde ve testlerde warning verilmesi önlendi.
- **Vitest Mock Optimizasyonu:** `test_characters.spec.ts` üzerinde `videoService` modülü Vitest mock katmanına alınarak, testlerin harici FFmpeg ve mock dosyaların eksik olmasından kaynaklı zaman aşımı (timeout) sorunları tamamen giderildi.
- **Test ve Tip Denetimi:** TypeScript derlemesi (`tsc --noEmit`) sıfır hata verdi. Vitest test paketi (`npx vitest run`) ile **72/72 testin tamamı başarıyla yeşile döndü**.

---

## ✅ Sprint 14 — Çıktılar (OpenAI Whisper ve Faster-Whisper Entegrasyonu) (13 Haziran 2026 - v5.6)
- **OpenAI Whisper ve Faster-Whisper Çoklu Entegrasyonu:** Google Colab katmanına (`colab_server.py` ve `colab_setup.py`) hem `openai-whisper` hem de C++ tabanlı yüksek hızlı deşifre sunan `faster-whisper` kütüphaneleri dahil edildi.
- **Güvenli Fallback Mekanizmalı `/transcribe` Endpoint:** Colab Flask sunucusuna eklenen `/transcribe` endpoint'i öncelikle en yüksek performansı sağlayan `faster-whisper` motorunu dener, hata veya kütüphane çakışması durumunda otomatik olarak `openai-whisper` motoruna geri düşer (fallback).
- **Canlı Segmentasyon & Kelime/Cümle Bazlı Zaman Damgaları:** Node.js backend katmanındaki `audio-transcriber.ts` servisi baştan yazılarak Colab tüneline multi-part form-data ile dosya gönderen ve Colab'dan gelen zaman damgalı transkript JSON çıktısını çözen yapı kuruldu.
- **Gemini 2.5 Flash Structured JSON Fallback:** Colab tünelinin kapalı veya sunucunun offline olması ihtimaline karşı, backend tarafına Gemini 2.5 Flash tabanlı ve `responseSchema` (start, end, text alanları zorunlu) tanımlı, yapılandırılmış transkript üreten kurtarma hattı (fallback) entegre edildi.
- **Clipper & Otonom Kırpıcı Entegrasyonu:** `/api/v1/clipper/extract` asenkron işleme rotası, mock veri üretiminden çıkarılarak bu yeni zaman damgalı transkript sistemine ve viral segment analiz motoruna başarıyla bağlandı.
- **Asenkron Test Tıkanıklığının Giderilmesi:** `test_clipper_whisper.spec.ts` entegrasyon testlerinde asenkron `/api/v1/clipper/extract` testinin dış Zen API completion çağrıları nedeniyle asılı kalması sorunu, `viralAnalyzer.analyze` metoduna mock uygulanarak çözüldü.
- **Test ve Tip Denetimi:** `tsc --noEmit` sıfır hata ile tamamlandı. Vitest test paketi (`npx vitest run`) üzerinde Whisper & Clipper entegrasyonu dahil **75/75 testin tamamı başarıyla yeşillendi**.

---

## ✅ Sprint 15 — Çıktılar (Bütünsel Frontend Entegrasyonu ve Gelecek Fazlar UI Altyapısı) (13 Haziran 2026 - v5.7)
- **Yeni Otonom Kırpıcı Paneli (`ClipperPanel.tsx`):** Arayüze "Clipper" (Otonom Kırpıcı) adında yeni bir ana sekme eklendi. Burada kullanıcılar uzun yatay videolarından viral dikey klipleri asenkron `/api/v1/clipper/extract` endpoint'i ile çıkarabilir, klipleri FFmpeg tabanlı `/export` API'si ile kırpıp diske kaydedebilir.
- **Yeni Yayın Planlayıcı Paneli (`SchedulePublishPanel.tsx`):** Kullanıcıların tamamlanan video projelerini belirli bir tarih-saatte YouTube, TikTok, X ve Meta platformlarında paylaşmak üzere planlayabilecekleri, zamanlama takvimi ve listesi arayüzü oluşturuldu.
- **Gelecek Fazlar Parametre Entegrasyonu:** Hem `ProjectForm.tsx` (Sol form) hem de `ClipperPanel.tsx` (Kırpıcı formu) bileşenlerine gelecek fazlarda (Faz D, E, F, G) backend'i yazılacak olan **Çok Dilli Dublaj Dili** (Select), **Altyazı Animasyon Stili ve Efektleri** (Select: bounce, pulse, shake) ve **Renk Derecelendirme Promptu** (Input) alanları eklendi. Bu alanlar state olarak tutulup `/create-job` veya `/extract` API'lerine gönderilen `FormData` ve JSON gövdelerine başarıyla entegre edildi.
- **App.tsx Sekme Orkestrasyonu:** `client/src/App.tsx` ana bileşenindeki `mainTabs` listesine 'Clipper' ve 'Yayın Planla' sekmeleri eklenerek dinamik render ve form resetleme mantıkları kuruldu.
- **Derleme ve Tip Doğrulaması:** Tip kontrolleri (`tsc -b && tsc --noEmit`) ve üretim derlemesi (`vite build`) **sıfır hatayla** başarıyla tamamlandı. Vitest test paketi (`npx vitest run`) ile **75/75 testin tamamı yeşilde kaldı**.
- **Test Onarımı ve Genişletme (13 Haziran 2026 - kritik):** `crypto.ts` modül seviyesindeki `scryptSync` çağrısı lazy init'e dönüştürülerek 4 test suite'inin Worker OOM ile çökmesi engellendi. Vitest config'ine `execArgv: --max-old-space-size=4096` eklenerek Windows'da modül yükleme OOM'ları kalıcı çözüldü. `test_editor_services.spec.ts` güncellenerek 13 testin tamamı güncel API'e uyarlandı (autoCutVideo, applyColorGrade, findWordTimestamps, applyBeatSyncCuts vb.). `test_dubbing_viral.spec.ts`'ye `ai`, `ai-provider` ve `ai-utils` mock'ları eklenerek AI timeout'ları çözüldü. `real_integration.spec.ts`'de `import.meta.url` → `process.cwd()` ve `musicPath` tip düzeltmesi yapıldı. **Toplam 165 testin tamamı yeşil, tsc --noEmit sıfır hata, ESLint sıfır uyarı.**

---

## ✅ Sprint 16 — Çıktılar (Scroll Düzeltmesi ve TypeScript Tip Temizliği) (13 Haziran 2026 - v5.8)
- **Genel Scroll ve Layout Çakışma Düzeltmesi:** `StudioPanel.tsx` içerisinde 'Stüdyo' dışındaki tab'lerde (AI Asistan, Canvas, Clipper vb.) video önizlemesi ve prompt formunun tekrar render edilerek diğer panellerin üzerine binmesi ve sayfa yüksekliğini aşarak scroll'un çalışmamasına yol açması engellendi (null dönülerek temizlendi).
- **Premium Scrollbar Tasarımı:** `index.css` içerisindeki webkit-scrollbar genişliği `8px` yapılarak modern, premium bir tasarım ve kolay kullanılabilirlik sağlandı.
- **TypeScript Tip Hatalarının Giderilmesi:** `LandingPage.tsx` dosyasındaki relative import hatası (LandingPageAnimations.js eksik uzantısı), `helpVideos.ts` dosyasındaki db metot adları ve dönüş tipleri, `storyBibleService.ts`, `storyChatService.ts` ve `templatePromptService.ts` dosyalarındaki implicit any ve fallback model zinciri tip uyuşmazlıkları giderilerek tür güvenliği tam olarak sağlandı.

---

## ✅ Sprint 17 — Çıktılar (Code Review, Security Audit & Test Onarımı) (13 Haziran 2026 - v5.9)
- **Security Audit:** Tüm kod tabanı `code-security-audit` skill'i ile tarandı. Hardcoded secret bulunamadı. SQL injection yok (parameterized queries). XSS yok. CORS wildcard yok. npm audit'te kalan 10 vuln (3 critical, 4 high, 3 moderate) tamamı `iyzipay` ve `yt-search` transitive bağımlılıkları — production etkilemez, breaking change gerektirir.
- **Test Onarımı (6 dosyada 11 hata → 165/165 yeşil):**
  - `crypto.ts`: `scryptSync` module-level → `getKey()` lazy init (4 suite "Deriving bits failed" çökmesi)
  - `vitest.config.ts`: `execArgv: ['--max-old-space-size=4096']` (Windows OOM)
  - `videoClipper.ts`: `filterPath()` helper ile Windows FFmpeg subtitles filter yol sorunu
  - `postCropService.ts`: `formatSRTTime` export
  - `faceTracker.ts`: `chunkStableSegments` export
  - `test_editor_services.spec.ts`: güncel API'ye uygun yeniden yazım (autoCutVideo, applyColorGrade, findWordTimestamps)
  - `test_dubbing_viral.spec.ts`: AI mockları (ai, ai-provider, ai-utils) timeout önlemi
  - `real_integration.spec.ts`: `import.meta.url` → `process.cwd()`, `musicPath: ''`, SubtitleMixer servis düzeltmeleri
- **TypeScript:** `tsc --noEmit` sıfır hata
- **ESLint:** `npm run check:lint` sıfır uyarı
- **Vitest:** 14 test dosyası, 165/165 test başarıyla geçti

---

## ✅ Sprint 4A — Frontend TalkShowEditor (14 Haziran 2026)

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Config Screen** | Gösteri seç/oluştur, karakter listesi, platform checkboxes, script oluşturma butonu | ✅ Tamam |
| **B — Edit Screen** | Script segment listesi, inline dialogue edit, regenerate butonu, produce video | ✅ Tamam |
| **C — Progress Screen** | SSE progress bar, stage indicator, job durumu, tamamlanma bildirimi | ✅ Tamam |

**Yeni Dosyalar:**
- `client/src/components/TalkShowEditor.tsx` — 3 ekranlı Talk-Show editörü:
  - Config: mevcut gösteriler dropdown, yeni gösteri oluşturma, karakter seçimi, platform checkboxes
  - Edit: script seçici, segment kartları (scene_type badge, karakter adı, dialogue_text + inline edit, regenerate butonu)
  - Progress: SSE EventSource ile canlı ilerleme, progress bar, yüzde, stageKey

**Değişen Dosyalar:**
- `client/src/components/StudioPanel.tsx` — Inline `TalkShowPanel` (648 satır) kaldırıldı, `<TalkShowEditor />` ile değiştirildi
- `client/src/types.ts` — `Script`, `ScriptSegment`, `ScriptWithSegments` tipleri eklendi

**Kullanıcı Akışı:**
```
Talk-Show sekmesi
  → Config: mevcut gösteri seç veya yeni oluştur
  → "AI ile Script Oluştur" → POST /scripts/generate
  → Edit: segmentleri görüntüle, düzenle, yeniden üret
  → "Video Üret" → POST /scripts/:id/produce → queue başlar
  → Progress: SSE ile canlı takip (%0 → %100)
  → Tamamlandı: "Yeni Proje" butonu
```

**Doğrulama:** `tsc --noEmit` 0 hata, `vite build` başarılı, 43/43 vitest yeşil.

---

## ✅ Sprint 3A — Video Producer (Script → Video Pipeline) (14 Haziran 2026)

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Script→Video Adapter** | `scriptToVideoAdapter.ts` — ScriptSegment[] → video_scenes + video_jobs | ✅ Tamam |
| **B — API Endpoint** | `POST /scripts/:scriptId/produce` — script onayı sonrası kuyruğa ekleme | ✅ Tamam |
| **C — Scene Composer** | sceneComposer.ts (BGM, crossfade, avatar overlay) zaten kullanıma hazır | ✅ Tamam |

**Yeni Dosyalar:**
- `src/services/talkShow/scriptToVideoAdapter.ts` — `scriptToVideo()` fonksiyonu:
  - `buildVideoPrompt()`: ScriptSegment içeriğinden video promptu oluşturur (scene_type + karakter özellikleri + camera_instruction)
  - `createVideoJob()`: video_jobs tablosuna kayıt ekler
  - `insertScenes()`: ScriptSegment[] → video_scenes satırlarına dönüştürür
  - `mapCameraInstruction()`: Kamera hareketini queue'ya uygun formata normalize eder

**Değişen Dosyalar:**
- `src/routes/scripts.ts` — `POST /scripts/:scriptId/produce` endpoint'i eklendi

**Mimari:**
```
POST /scripts/:scriptId/produce
  → scriptEngine.getScript() script + segmentler
  → scriptToVideoAdapter.scriptToVideo()
    → createVideoJob()     (video_jobs tablosu)
    → insertScenes()       (video_scenes tablosu, queue skip AI planning)
    → checkQueue()         (kuyruk tetiklenir)
```
- Queue.ts zaten `video_scenes` önceden doldurulmuşsa AI planlamayı atlar (line 139, 216)
- sceneComposer.ts `compose()` zaten BGM (`backgroundMusicPath`), crossfade (`concatScenes`), avatar overlay (`buildSceneFilter`) destekler
- Mevcut queue pipeline'ı her sahne için Colab video + TTS üretir, FFmpeg ile miksler

**Doğrulama:** `tsc --noEmit` 0 hata, 43/43 vitest yeşil.

---

## ✅ Sprint 2B — Avatar Style Transfer (14 Haziran 2026)

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Colab Avatar Pipeline** | `/generate-avatar` endpoint'ine `style` parametresi (realistic/animatic), prompt mühendisliği | ✅ Tamam |
| **B — PhotoEditor Entegrasyonu** | CharacterCreationPanel + SettingsModal'da PhotoEditor'a avatar yönlendirme | ✅ Tamam |
| **C — avatar_source UI** | AI/upload kaynak ayırımı gösterimi, stiller arası toggle | ✅ Tamam |

**Değişen Dosyalar:**
- `colab_server.py` — `/generate-avatar`: `style` parametresi, realistic/animatic prompt seçimi
- `src/routes/characters.ts` — `POST /generate-avatar`: `avatar_style` body parametresi Colab'a iletilir
- `client/src/components/CharacterCreationPanel.tsx` — Avatar stil toggle, AI üret butonu, PhotoEditor entegrasyonu, avatar_source gösterimi
- `client/src/components/SettingsModal.tsx` — Avatar stil toggle, PhotoEditor entegrasyonu

**Akış:**
```
Kullanıcı stil seçer (Gerçekçi / Animatik)
  → "AI Üret" butonu → POST /characters/generate-avatar (avatar_style ile)
  → Colab DreamShaper 8 (style'a göre prompt seçimi)
  → Base64 döner → önizleme + "Düzenle" butonu
  → PhotoEditor (arka plan kaldırma, bölgesel inpaint)
  → Kaydet → characters tablosuna yazılır
```

**Doğrulama:** `tsc --noEmit` 0 hata, 43/43 vitest yeşil.

---

## ✅ Top Yuvarlak AI Talk-Show MVP — Per-Agent Model Routing + Video (14 Haziran 2026)

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Model Routing** | Maç Yorumcusu→Gemini, Eski Futbolcu→Claude, Kumarbaz→DeepSeek, DataScout→Zen | ✅ Tamam |
| **B — Video Pipeline** | `orchestrateToVideo.ts` — FFmpeg drawtext scene render, concat, BGM mix | ✅ Tamam |
| **C — Endpoint** | `POST /talkshow/orchestrate/video` — orchestrator + video tek çağrıda | ✅ Tamam |

**Yeni Dosyalar:**
- `src/services/talkShow/orchestratorToVideo.ts` — `orchestrateToVideo()`:
  - Her ajan mesajı için renkli drawtext sahnesi (karakter adı + konuşma metni)
  - concat ile tüm sahneleri birleştirme
  - Opsiyonel background music mix (afade + volume 0.15)
  - Temp dosya temizliği

**Değişen Dosyalar:**
- `src/services/talkShow/orchestrator.ts` — `AGENT_META` provider routing (zen→gemini/claude/deepseek/zen), `aiGenerate()` model dispatch
- `src/routes/talkShow.ts` — `POST /orchestrate/video` endpoint'i

**Agent→Model Haritası:**
| Agent | Provider | API Key |
|---|---|---|
| Meta-Orchestrator (Sunucu) | Zen chain | Yok (ücretsiz) |
| Maç Yorumcusu | Gemini 2.5 Flash | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Eski Futbolcu | Claude (MiniMax M3) | `ANTHROPIC_API_KEY` |
| Kumarbaz | DeepSeek | `DEEPSEEK_API_KEY` |
| İstihbarat Subayı | Zen chain | Yok (ücretsiz) |
- Anahtar yoksa Zen chain fallback kullanılır

**Doğrulama:** `tsc --noEmit` 0 hata, 43/43 vitest yeşil.

---

## ✅ Sprint 2A — Script Engine (14 Haziran 2026)

| Paralel Track | İçerik | Durum |
|---|---|---|
| **A — Script Engine** | Showrunner LLM (outline) + per-character LLM (dialogue) + CRUD API + DB tabloları | ✅ Tamam |

**Yeni Dosyalar:**
- `src/types/script.ts` — `Script`, `ScriptSegment`, `ScriptWithSegments`, `ScriptStatus`, `SceneType` tipleri
- `src/services/talkShow/scriptEngine.ts` — `ScriptEngine` sınıfı:
  - `generateOutline()`: Showrunner LLM (model chain → `generateObject` + Zod) ile sahne planı çıkarır
  - `generateDialogue()`: Per-character LLM dispatch (`llm_provider`/`llm_model`'a göre `google`/`zen`/`claude`/`deepseek`)
  - `generateFullScript()`: Outline → per-scene dialogue → DB kaydetme pipeline'ı
  - `regenerateSegment()`: Tek segment yeniden üretme
  - CRUD: `listScripts`, `getScript`, `updateScript`, `deleteScript`, `updateSegment`
- `src/routes/scripts.ts` — 7 endpoint (`scriptsRouter`, `/api/v1/talkshow` altında mount):
  - `POST /scripts/generate` — Full script üretimi
  - `GET /:showId/scripts` — Show'a ait scriptleri listele
  - `GET /scripts/:scriptId` — Script detay + segmentler
  - `PUT /scripts/:scriptId` — Script meta güncelleme
  - `DELETE /scripts/:scriptId` — Script silme
  - `PUT /scripts/:scriptId/segments/:segmentId` — Segment düzenleme
  - `POST /scripts/:scriptId/regenerate/:segmentId` — Segment yeniden üretme

**Değişen Dosyalar:**
- `src/db.ts` — `scripts` + `script_segments` tabloları eklendi (CREATE TABLE + foreign keys)
- `src/server.ts` — `scriptsRouter` import ve `/api/v1/talkshow` altında mount

**Doğrulama:** `tsc --noEmit` 0 hata, ESLint 0 uyarı.

**Mimari Notlar:**
- Showrunner: mevcut model chain'i kullanır (Zen → Minimax → Gemini), `generateObject` + `OutlineSchema` (Zod) ile yapılandırılmış çıktı
- Karakter diyalogları: `character.llm_provider`'a göre otomatik model dispatch:
  - `zen` → chain'den ilk model
  - `gemini` → `@ai-sdk/google`
  - `claude` → `@ai-sdk/anthropic` (Minimax üzerinden)
  - `deepseek` → `@ai-sdk/openai` (DeepSeek API)
  - Herhangi bir hata durumunda fallback mesaj kullanılır (servis kesintisiz)
- `generateObject` için `skipZenModels=true` (Zen response_format desteklemez)

---

## Sprint 1 v2 — Clipper ViralAnalyzer & Token Tracking (15 Haziran 2026)

**Job-1: Otonom Clipper v2 — Feature 1 tamamlandı**

### Yapılan Değişiklikler

**1. ViralAnalyzer v2 — Gemini 2.5 Flash Structured Output**
- `src/services/clipper/viralAnalyzer.ts` — Tam yeniden yazım
- `generateText` + regex JSON parsing → `generateObject` + Zod şeması (ViralAnalysisSchema)
- Tek LLM çağrısı ile hem segment skorları hem metadata (caption, hashtags, highlights) üretiliyor
- Geliştirilmiş Türkçe viral analiz prompt'u: duygusal analiz, hook kalitesi, trend uyumu, paylaşılabilirlik
- Keyword fallback iyileştirildi: Puan ağırlıklı Türkçe kelime dağarcığı (+15/e +10/e +8/e)

**2. Token Tracker — Model Bazlı Token Kullanım Takibi**
- `src/lib/token-tracker.ts` — Yeni dosya
- Her model için promptTokens, completionTokens, totalTokens, callCount takibi
- `tokenTracker.getSnapshot()` ile anlık özet, `tokenTracker.logSummary()` ile loglama
- `ViralAnalyzer.getLastTokenUsage()` ile son çağrının detayları

**3. Testler**
- `src/test_clipper_v2.spec.ts` — 12 test (ViralAnalyzer v2 + TokenTracker)
- Mevcut `test_clipper_services.spec.ts` — 14 test (SmartCropper, SubtitleMixer, SplitScreen) sağlam

### Doğrulama
- `npx tsc --noEmit` — 0 hata ✅
- `npx vitest run` — 228/228 test geçti ✅
- 17 test dosyasının tamamı yeşil ✅

### Dosya Yapısı
```
src/
├── lib/token-tracker.ts          (YENİ — token usage tracker)
├── services/clipper/viralAnalyzer.ts  (YENİDEN YAZILDI — Zod + generateObject)
└── test_clipper_v2.spec.ts       (YENİ — 12 test)
```

---

## Sprint 1 v2 — Feature 2: Per-Frame Dinamik Yüz Takibi (15 Haziran 2026)

**Job-1: Otonom Clipper v2 — Feature 2 tamamlandı**

### Yapılan Değişiklikler

**1. PerFrameCropper Servisi**
- `src/services/clipper/perFrameCropper.ts` — Yeni dosya
- faceTracker'dan gelen per-frame CropFrame[] verisini alır
- Cubic ease-in-out interpolasyon ile yumuşak keyframe'ler oluşturur
- Videoyu 0.5sn chunk'lara böler, her birini ayrı ayrı kırpar ve birleştirir
- Yüz bulunamadığında merkez kırpma fallback'i

**2. SmartCropper.cropPerFrame()**
- `src/services/clipper/smartCropper.ts` — `cropPerFrame()` metodu eklendi
- Lazy import ile perFrameCropper modülünü yükler
- Tüm SmartCropOptions parametrelerini destekler

**3. Exports**
- `src/services/clipper/index.ts` — `cropPerFrame` ve ilgili tipler export edildi

**4. Testler**
- `src/test_clipper_v2.spec.ts` — 15 test (3 yeni perFrameCropper testi)

### Doğrulama
- `npx tsc --noEmit` — 0 hata ✅
- `npx vitest run` — 231/231 test geçti ✅
- 17 test dosyasının tamamı yeşil ✅

### Dosya Yapısı
```
src/
├── lib/token-tracker.ts              (YENİ)
├── services/clipper/
│   ├── perFrameCropper.ts            (YENİ — per-frame dynamic crop)
│   ├── smartCropper.ts               (GÜNCELLENDİ — cropPerFrame eklendi)
│   ├── viralAnalyzer.ts              (YENİDEN YAZILDI)
│   └── index.ts                      (GÜNCELLENDİ — export eklendi)
└── test_clipper_v2.spec.ts           (GÜNCELLENDİ — 15 test)
```

---

## Sprint 1 v2 — Feature 3: Otomatik Altyazı & BGM (15 Haziran 2026)

**Job-1: Otonom Clipper v2 — Feature 3 tamamlandı**

### Yapılan Değişiklikler

**1. autoSubtitleBgm Servisi**
- `src/services/clipper/autoSubtitleBgm.ts` — Yeni dosya
- `autoProcessClip()` fonksiyonu: SRT üret → altyazı göm → BGM bul/üret → ses-bandırma → miksle → temizle
- Kelime bazlı SRT: segment.suggestedCaption'dan kelime时间 damgalı SRT üretir
- Otomatik BGM: musicPath verilmezse sessiz döngü üretir (FFmpeg anullsrc)
- Ses bandırma (ducking): konuşmayan kısımlarda BGM sesini otomatik artırır

**2. Clipper Route — POST /:id/auto**
- `src/routes/clipper.ts` — Yeni endpoint
- Tek istekle tüm pipeline: kırp + altyazı + BGM + ducking
- faceTracking desteği, segment seçimi, stil özelleştirme

**3. Testler**
- `src/test_clipper_v2.spec.ts` — 18 test (3 yeni autoSubtitleBgm testi)

### Doğrulama
- `npx tsc --noEmit` — 0 hata ✅
- `npx vitest run` — 234/234 test geçti ✅

---

## Sprint 1 v2 — Feature 4: RabbitMQ Kuyruk Entegrasyonu (15 Haziran 2026)

**Job-1: Otonom Clipper v2 — Feature 4 tamamlandı (TAMAM)**

### Yapılan Değişiklikler

**1. DB Migration**
- `src/db.ts` — clip_jobs tablosuna 3 sütun eklendi: `retry_count`, `priority`, `max_retries`

**2. ClipQueue — Retry + Priority**
- `src/lib/clip-queue.ts` — Yeniden yazıldı
- `sendClipToQueue()`: Priority ile kuyruğa ekleme (RabbitMQ message priority)
- `retryClipJob()`: Başarısız işleri exponential backoff ile yeniden kuyruğa ekleme
- Worker: Hata durumunda `retry_count < max_retries` kontrolü ile otomatik retry
- Enhanced SSE progress: transcribe → analyze → retry → complete/error aşamaları

**3. Clipper Routes — Priority + Retry + SSE Progress**
- `src/routes/clipper.ts` — Güncellendi
- `/extract`: `priority` parametresi eklendi (1=en yüksek, 10=en düşük)
- `POST /:id/retry`: Başarısız clip işini yeniden kuyruğa ekle
- `GET /progress/:id`: SSE ile clip job ilerleme durumunu stream et

**4. Testler**
- `src/test_clipper_v2.spec.ts` — 28 test (10 yeni: sendClipToQueue, retryClipJob, route tests)

### Doğrulama
- `npx tsc --noEmit` — 0 hata ✅
- `npx vitest run` — 244/244 test geçti ✅
- 17 test dosyasının tamamı yeşil ✅

### Dosya Yapısı
```
src/
├── db.ts                              (GÜNCELLENDİ — clip_jobs migration)
├── lib/clip-queue.ts                  (YENİDEN YAZILDI — retry + priority)
├── routes/clipper.ts                  (GÜNCELLENDİ — priority, retry, SSE progress)
└── test_clipper_v2.spec.ts            (GÜNCELLENDİ — 28 test)
```

### Job-1 Özeti: 4/4 özellik tamamlandı ✅
