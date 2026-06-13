# Yapılacaklar Listesi (TODO)

## 📋 Hazırlık & Yapılandırma
- [x] TypeScript yapılandırma dosyasını (`tsconfig.json`) kontrol et ve NodeNext moduna uyarla.
- [x] `.env.example` ve `.env` şablonunu oluştur.
- [x] Dizin yapısını oluştur (`src/`, `uploads/`, `videolar/`).

## ☁️ Bölüm 1: Google Colab Katmanı
- [x] Google Colab için Flask sunucusu (`colab_server.py`) kodunu hazırla (Image-to-Video, XTTS, AudioLDM2 entegrasyonu, Dudak senkronizasyonu).
- [x] Stable Diffusion 1.5 (`DreamShaper 8`) ile 3 alternatif kapak üretme endpoint'i ve lazy loading bellek optimizasyonu entegrasyonu.
- [x] Colab sunucu başlatma betiğindeki (`colab_setup.py`) `UnsupportedOperation: fileno` hatasını log dosyası yönlendirmesiyle giderme, çalışmayan Wav2Lip/GAN indirme linklerini güncel Hugging Face adresleriyle güncelleme, SymPy çakışmasını önlemek için oturum yeniden başlatma uyarısı eklemek, `colab_server.py`'a Colab Secrets üzerinden `NGROK_TOKEN` desteği ekleme, Ngrok URL'ini otomatik olarak hücre çıktısına yazdırma, bekleme süresini 30 saniyeye çıkarma, hata durumunda logları ekrana basma, Python 3.12 uyumluluğu için `coqui-tts` geçişi yapma, mükerrer `git clone` hatalarını giderme, eksik `colab_server.py` için otomatik dosya yükleme istemi (files.upload) tetikleme, unbuffered (-u) loglama sağlama, PyTorch 2.9+ `torchcodec` bağımlılık hatasını önlemek için PyTorch sürümünü stabil 2.5.1 sürümüne düşürme ve gereksiz `colab_install.py` dosyasını silme.
- [x] Colab sunucusunda kütüphane import doğruluğunu test eden `/verify-libs` endpoint'inin sunulması ve mükerrer `/health` rotasının temizlenmesi.
- [x] `colab_server.py` başlatılırken oluşan `NameError: name 'health' is not defined` hatasını main bloğundaki `health._start_time` satırını temizleyerek giderme.
- [x] `colab_setup.py` ve `colab_server.py` dosyalarının her zaman git reposundaki en son dağıtımdan (git clone/pull yöntemiyle önbelleksiz) indirilmesi mantığının kurulması, Google_Colab_AI_Publisher.ipynb defterinin sıfırdan yazılarak git'e push edilmesi ve Colab entegrasyonunun tamamlanması.
- [x] Google Colab Jupyter notebook dosyasındaki `/content/colab_setup.py` ezilme hatasının `/content/colab_server.py` şeklinde düzeltilmesi, `git clone 128` hatasını aşmak için `rm -rf` zorla temizleme adımı ve `colab_setup.py`'ın ana kernel'i çökertmesini engellemek için `subprocess.run` üzerinden çalıştırılmasıyla güncellenip git'e push edilmesi.
- [x] Özel repolara erişim için `GITHUB_TOKEN` entegrasyonu ve alt sürecin SIGKILL ile sonlanması durumunda ana kernel'i otomatik tetikleyen `try-except` CalledProcessError yönetimi notebook'a eklendi.
- [x] `colab_setup.py` pip quiet kurulum bayraklarının kaldırılması ve notebook'a canlı log akışı için `subprocess.Popen` sarmalayıcısının entegrasyonu.
- [x] `colab_setup.py` alt sürecinin kendini öldürmesi sonucu oluşan `CalledProcessError` hatasını önlemek için `sys.exit(100)` çıkış kodu kullanımı ve notebook'un bu çıkış koduna göre ana kernel'i yeniden başlatması.
- [x] Notebook hücresinin en üstüne `GITHUB_TOKEN` ve `NGROK_TOKEN` form alanlarının eklenip çevre değişkenleri ile alt sürece aktarılarak kilitlenmelerin önlenmesi.

## 💻 Bölüm 2: Node.js / TypeScript Komut Merkezi Katmanı
- [x] SQLite Veritabanı Mimarisi (`src/db.ts`) genişletilmiş ayar/playlist sütunları.
- [x] Node.js ColabManager'ın (`src/lib/colab-manager.ts`) yerel Python çalıştırma süreçleri yerine `.env` üzerindeki `COLAB_URL` bağlantısını doğrudan benimsemesi (zaman aşımı hatası düzeltildi) ve `/verify-libs` dry-run doğrulama kontrolünün entegrasyonu.
- [x] Zod şeması ve Gemini entegrasyonlu Hikaye Bölücü / Pazarlama Metni Üretici.
- [x] Sıralı İş Kuyruğu ve FFmpeg Mix/Altyazı Gömme Motoru (`src/queue.ts`).
- [x] FFmpeg dikey video (Shorts 9:16) boxblur ve Like/Abone ol callout motoru entegrasyonu.
- [x] Playwright Sosyal Medya Yayın Motoru (`src/publisher.ts` - YouTube Playlist entegreli).
- [x] Fırsatlar Hunisi horizontal scroll ve profil ayarları dashboard tasarımı (`src/server.ts`).
- [x] D-Note premium tema ve i18n (çoklu dil) desteğinin modüler olarak entegrasyonu (JSON dosyaları, `themes.ts` modülü, `i18n` ve `theme` middleware katmanları ile).
- [x] Gemini API çağrıları için 429 hatersına karşı `withRetry` (Exponential Backoff) entegrasyonu (`src/lib/ai-utils.ts`).
- [x] Kuyruk (`src/queue.ts`) yapısında bellek tabanlı (`isProcessing`) kilit yerine SQL atomic update kilidi.
- [x] Frontend (`dashboard.ts`) Job Progress SSE bağlantısı için koptuğunda yeniden bağlanma (`onerror`) yeteneği.
- [x] Minimax M3 alternatif AI model entegrasyonu (`src/lib/ai-provider.ts`, `@ai-sdk/openai`).
- [x] Fırsatlar Hunisi → Dashboard "Yeni Proje" formu otomatik prompt aktarımı (Özgünleştirme onayı sonrası `fillJobForm()` ile form doldurma).
- [x] Fırsat kartlarına "📝 Prompt Olarak Kullan" kısa yol butonu eklenmesi.
- [x] Tema uyumsuzluklarının CSS `hsla` fonksiyon formatındaki geçersiz sözdizimi hatalarının giderilmesi.
- [x] `video_scenes` tablosunu destekleyen, sahnelerin asenkron kuyruk durumunu yöneten ve tekil sahne yeniden üretme (`regenerate`), ekleme, silme, sıralama işlemlerini yöneten API rotalarını (`src/routes/jobs.ts`) entegre et.
- [x] Kamera hareket şablonlarının (Zoom in/out, Pan Left/Right, Breathing) prompt mühendisliğiyle VRAM harcamadan asenkron video kuyruğunda (`src/queue.ts`) işlenmesi ve tamamlanan sahnelerin atlanması mantığını tamamla.

## 🧪 Test & Doğrulama
- [x] SQLite ve iş akışının entegrasyon testlerini yaz ve Vitest ile doğrula (`src/test_integration.spec.ts`).
- [x] PostgreSQL INSERT `lastID` regex hatasını gidererek entegrasyon testlerinin tamamını (13/13) yeşile döndür.
- [x] Testlerdeki implicit any ve emitter tip uyumsuzluklarını onar, projeyi sıfır hata ile typecheck edilebilir hale getir.
- [x] Windows ortamı FFmpeg metin basma (drawtext) hatasına karşı dinamik font belirleme mekanizması ekle.
- [x] Playwright session yükleme kodlarının doğruluğunu denetle.
- [x] Veritabanı kuyruk temizliğini gerçekleştir ve 2 aktif pending iş hazırla.
- [x] Playwright tabanlı canlı/görsel E2E tarayıcı testlerini hazırlama ve `scripts/run-e2e.ts` üzerinden doğrulama.

## 🗒️ Dokümantasyon & Mimari Kararlar
- [x] VoxCPM seslendirme modeli değerlendirmesini ve gelecek yol haritası kararını `docs/adr/ADR-001-TTS-Engine-Evaluation.md` dosyasına kaydet.
- [x] **Aşama 4: Seçenek B İyileştileri**
  - [x] [db.ts](file:///c:/Users/Damla/Proje/AI-Publisher/src/db.ts) içerisindeki SQL parametre dönüştürücünün state-machine tabanlı güncellenmesi
  - [x] [publisher.ts](file:///c:/Users/Damla/Proje/AI-Publisher/src/publisher.ts) içerisindeki statik `waitForTimeout` beklemelerinin olay tabanlı seçicilere dönüştürülmesi ve insan davranışı (humanClick, humanType, miss-click) simülasyonları
  - [x] [dashboard.ts](file:///c:/Users/Damla/Proje/AI-Publisher/src/views/dashboard.ts) dosyasından CSS ve client-side JS kodlarının `dashboardStyles.ts` ve `dashboardScripts.ts` olarak ayrıştırılması bağla.
- [x] RAM tüketimi aşımını (OOM) engellemek için Playwright publish işlemlerini Concurrency=1 ile `publish-queue.ts` üzerinden çalıştır.
- [x] PostgreSQL Veritabanı Pool entegrasyonunu tamamla (`pg` kütüphanesi).
- [x] Redis Pub/Sub üzerinden SSE mesajlaşmasını state-free olarak bağla.
- [x] RabbitMQ ile Event-Driven mesaj tüketim kuyruğu sistemini ayağa kaldır.
- [x] Colab Asenkron Polling (Webhook) altyapısını tamamla ve aktif Callback POST mimarisine geçiş yap (Node.js beklemeden serbest kalsın).
- [x] Storage Service arayüzünü (Local/S3/MinIO) hazırla ve fs işlemlerini kapsülle.
- [x] Otonom İş Kuyruğunda prefetch(3) ile Node tarafı paralel hazırlığı, Colab tarafı SimpleMutex ile sıralı işlemleri sağla.
- [x] RabbitMQ kuyruğu boşaldığında (`remainingCount === 0`) Colab sunucusunu otonom olarak kapat (idle değil doğrudan stop).
- [x] Arayüzdeki SSE yayınlarında (Colab başlatılıyor vb.) hardcoded metinleri i18n stageKey ile bağla.
- [x] AI Code Review sonrasında tespit edilen X/Twitter CSS seçici hatasının ve Playwright headless parametrelerinin dinamik hale getirilerek onarılması.
- [x] Sosyal medya paylaşımı (Playwright) sırasında iptal etme butonu ve arka planda çalışan tarayıcıyı kapatma mekanizmasını entegre et. Video üretimi kuyruğundaki iptal et butonunu kaldır.
- [x] Google Colab sunucu sağlık denetimlerindeki `/health` ve zaman aşımı kısıtlarını esnet, sunucu yanıt verdiği sürece sağlıklı kabul et.

## 🎥 Bölüm 3: Video Özgünleştirme (Differentiation) ve Esnek Stüdyo Mimarisi
- [x] SQLite/PostgreSQL veritabanı şemasına `differentiation_duration_mode` and `differentiation_layout` kolonlarının ve migration'larının eklenmesi (`src/db.ts`).
- [x] Google Colab Flask sunucusunda `yt-dlp` indirme, OpenCV frame-cutter, CogVideoX-5b I2V ve T2V modellerinin lazy load entegrasyonu (`colab_server.py`).
- [x] Node.js iş kuyruğunda (RabbitMQ) Phase 1 hazırlığının `colabMutex` kilitlenmesinden önce paralel çalıştırılması ve parametrelerin optimize edilmesi (`src/queue.ts`).
- [x] Yerel FFmpeg özgünlük filtreleri (`applyVideoDifferentiationFilters` vinyet, boxblurred background, foreground scale) ve dinamik crossfade geçişli birleştirme (`concatVideosWithCrossfade`) modülünün eklenmesi (`src/services/videoService.ts`, `src/queue.ts`).
- [x] Web stüdyo formuna süre modları ve farklılaştırma filtre checkbox seçeneklerinin entegrasyonu, i18n çevirilerinin `tr.json` / `en.json` dosyalarına eklenmesi.
- [x] AJAX FormData `/create-job` ile dosya yükleme ve `/start-job` / `/approve-translation` entegrasyonlarının yapılması (`dashboard.ts`, `dashboardScripts.ts`, `routes/jobs.ts`, `routes/differentiation.ts`).
- [x] Video özgünleştirme akışını ve FFmpeg filtrelerini tam mock'lı olarak test eden 6 entegrasyon testinin Vitest ile yazılıp doğrulanması (`src/test_differentiation.spec.ts`).
- [x] Fırsatlar Hunisi hover detay pop-up'ının konumunu kart üzerine sabitleme ve mouse takibini kaldırma.
- [x] Eski veya test işlerinin (Örn: #44, #45) silinebilmesi için API rotalarındaki SQL sahiplik kısıtlamalarını kaldırma.
- [x] Zen API kaynaklı Invalid time value hatalarını, response body'deki standart dışı alanları (reasoning, reasoning_details, refusal) custom fetch interceptor ile temizleyerek ve doğrudan chat API'sini (.chat) kullanarak kökten çözme.
- [x] Zen Free modellerini (nemotron-3-ultra-free, mimo-v2.5-free, big-pickle) model zincirinin ilk sırasına geri yerleştirme ve Minimax -> Gemini -> OpenRouter fallback yapısını kurma.
- [x] Arka planda asılı kalmış kilitli Node.js süreçlerini temizleyerek Job 47 otonom akışının duraksamasını giderme.
- [x] Zen API kaynaklı Node.js global fetch yerine Axios tabanlı istemciye geçerek Windows socket hang kilitlenmesini çözme.
- [x] Zen API custom fetch sarmalayıcısının timeout limitini 25 saniyeye çekerek optimizasyon sağlama.
- [x] Zen API'nin geçici hata/timeout durumlarında tüm modelleri kilitleyen global Circuit Breaker'ı kaldırma ve model bazlı otonom fallback sağlama.
- [x] Minimax base URL adresine `/v1` ekleyerek Anthropic SDK (/v1/messages) proxy 404 hatasını çözme.
- [x] OpenRouter bakiye blokajı (65k token rezervasyonu) hatasını çözmek için translation modülündeki tüm AI çağrılarına maxTokens limitleri tanımlama.
- [x] Zen Free modellerinin (big-pickle, mimo-v2.5-free, nemotron-3-ultra-free) canlı bağlantı testlerinin gerçekleştirilmesi ve hepsinin online/aktif olduğunun doğrulanması.
- [x] Zen API fetch interceptor'ına axios AbortSignal entegrasyonu yapılarak zaman aşımı ve iptal işlemlerinin optimize edilmesi.
- [x] Model fallback sırasının kesin olarak **Zen Free -> Minimax -> Gemini** olarak yapılandırılması (OpenRouter'ın tamamen çıkarılması).
- [x] Zen Free modellerinin (`big-pickle`, `mimo-v2.5-free`, `nemotron-3-ultra-free`) istek esnasında peşinen elenmesini ve atlanmasını önleyen otonom fallback onarımının yapılması.
- [x] Düşünen Minimax modeli için promptların ve sistem yönergelerinin sadeleştirilip gereksiz yorum yapmasının engellenmesi.
- [x] Zen API isteklerinin Cloudflare/Gateway engellemelerini aşması için Axios bağlantı yönteminin (User-Agent, headers kopyalama ve düz JSON payload) optimize edilmesi.

## 🚀 Bölüm 4: Kapsamlı Altyapı, Fallback ve UX Geliştirmeleri (Faz 2-5)
- [x] **Colab RAM/VRAM Yönetimi:** Lazy Loading (Sıralı Yükleme), GPU'dan CPU'ya zorunlu Offloading (`.to("cpu")`), GC ve Cuda önbellek temizleme rutinleri eklendi.
- [x] **Dinamik Mikro-Parça (Chunk) Mimarisi:** Videoların 6 saniyelik parçalarla işlenmesi sağlandı.
- [x] **Node.js Darboğaz Koruması:** FFmpeg Worker Pool, Timeout-Safe Encoder (GPU asılı kalma önlemi), Disk yarışı asenkron sarmalayıcı ve Transkript RAM sızıntısı regex temizleyicisi eklendi.
- [x] **Transkript Kurtarma Hattı:** Videoyu indirmeden Light Scraper -> Resmi API -> Audio-to-Text Gemini fallback zinciri kodlandı.
- [x] **Akıllı LLM Zinciri:** Zen Free -> MiniMax-M3 -> Gemini otonom hata yakalama zinciri kuruldu.
- [x] **UX & Kurumsal Kimlik:** Ön Onay Ekranı (Uzunluk / Pozisyon / Başlık düzenleme), 9 Olasılıklı Zıt Ton Başlık Matrisi (`box=1`), Kurumsal Logo overlay (Base64) ve tam izlenebilir SSE Sayaçlı İlerleme Görünürlüğü (örn: "278/542") eklendi.
- [x] **i18n Çok Dilli Altyapı:** Türkçe ve İngilizce dil paketleri ile React Hooks (`useLanguage`) tabanlı yerelleştirme sisteme entegre edildi.

## 🛠️ RabbitMQ Widget ve Tema Sıfırlanması Sorunlarının Çözümü
- [x] activeJobs listesinin filtrelenerek failed/awaiting_approval işlerin SSE progress dinlemesinin engellenmesi.
- [x] RabbitMQ terminal widget'ının varsayılan olarak display: block yapılması ve placeholder logu eklenmesi.
- [x] DashboardParams ve buildDashboardHTML arayüzlerinin isDark parametresiyle genişletilmesi.
- [x] html etiketine theme ve dark sınıflarının sunucu tarafında giydirilmesi.

## 🛠️ ngrok SSE Kararlılığı ve RabbitMQ Dayanıklılık İyileştirmeleri
- [x] dashboardScripts.ts içindeki EventSource URL'lerine ngrok bypass query parametresi eklenmesi.
- [x] progress.ts içindeki SSE response header'larının ngrok tüneli için optimize edilmesi.
- [x] rabbitmq.ts içinde otomatik yeniden bağlanma (auto-reconnect) döngüsünün kurulması.
- [x] queue.ts worker'ının RabbitMQ yeniden bağlanma event'ine abone edilmesi.
- [x] publish-queue.ts worker'ının RabbitMQ yeniden bağlanma event'ine abone edilmesi.

## 🛠️ Colab Video Üretim İlerleme Durumu Donma Sorununun Giderilmesi
- [x] `colab_server.py` dosyasında video generation fonksiyonlarına `task_id` parametresinin eklenmesi.
- [x] `colab_server.py` içinde diffusers kütüphanesi sürümüne göre dinamik callback yapısının kurulması (modern `callback_on_step_end` ve eski `callback`).
- [x] Callback fonksiyonunda adım bazlı ilerlemenin (`stagePercent`) `%15` ile `%30` arasında güncellenmesi ve `time.sleep(0.01)` ile GIL kilitlenmesinin önlenmesi.
- [x] `src/queue.ts` polling döngüsündeki `axios.get` çağrısına `timeout: 10000` (10 saniye) ve 12 dakikalık render zaman aşımı limiti eklenmesi.
- [x] `npm run check:types` ile sürecin doğrulanması.

## 🛠️ Google Colab Hücrelerinde Canlı Log Takibi
- [x] `colab_setup.py` dosyasına canlı log okuyucu döngüsünün eklenmesi.
- [x] `colab_hucre2_server.py` dosyasına canlı log okuyucu döngüsünün eklenmesi.

## 🛠️ Dinamik Watchdog Zaman Aşımı ve Gerçek ETA Entegrasyonu
- [x] `src/queue.ts` polling döngüsüne `dynamicTimeoutMs` watchdog kontrolünün eklenmesi.
- [x] Polling döngüsünde Colab'dan gelen gerçek `etaSeconds` bilgisine göre watchdog süresinin dinamik güncellenmesi.
- [x] SSE broadcast yayınında gerçek `etaSeconds` verisinin kullanılması ve dashboard arayüzüne doğru şekilde yansıtılması.

## 🛠️ L4 GPU Hız Optimizasyonları ve Otonom Dosya Push Mimarisi
- [x] `colab_server.py` içerisinde total GPU VRAM miktarına göre dinamik model offload kontrolünün yapılması.
- [x] L4 GPU (24GB VRAM) algılandığında modelin CPU offload olmadan doğrudan GPU (`to("cuda")`) üzerinde çalıştırılması.
- [x] L4 GPU üzerinde frame decoding (kod çözme) aşamasında oluşan VAE OOM hatasını engellemek için `vae.enable_tiling()` özelliğinin aktif tutulması.
- [x] `CogVideoX-2b` ve `CogVideoX-2b-I2V` modellerinin `/generate-media` üzerinden dinamik seçilebilmesi.
- [x] Kapak sentezi ve video çıktıları (sfx dahil) üretimi tamamlandığında Node.js callback URL'sine POST (push) edilmesi.
- [x] Node.js Express callback rotasının genişletilerek gelen tüm medyaları ve kapakları diske kaydetmesi.
- [x] Node.js yerel sunucusunun (PORT 3016) `src/lib/ngrok-tunnel.ts` aracılığıyla otomatik localtunnel tüneli (ngrok çift tünel çakışması çözümü için) ile dış dünyaya açılması ve `colab_server.py` text-to-video `UnboundLocalError` hatasının giderilmesi.
- [x] `src/queue.ts` içinde disk kontrolü (`pathExists`) eklenerek push edilmiş dosyaların indirilmeden atlanması.
- [x] `colab_server.py` ve `colab_setup.py` dosyalarına `transformers.pytorch_utils` modülünden `isin_mps_friendly` import hatasını çözen monkey patch entegrasyonu.

## 🚀 v4 Colab Sunucu Geliştirmeleri (Rubberband + GFPGAN/RealESRGAN + Alternatif TTS)
- [x] `colab_server.py` v4: `stretch_audio_to_duration()` pyrubberband time-stretch fonksiyonu (perde korur, 0.5x-2.0x).
- [x] `colab_server.py` v4: `synthesize_speech()` unified API — XTTS / OpenAI TTS / Edge Speech desteği + 2-pass rubberband entegrasyonu.
- [x] `colab_server.py` v4: `enhance_face_gfpgan()` GFPGANv1.4 yüz restorasyonu.
- [x] `colab_server.py` v4: `upscale_image_realesrgan()` RealESRGAN 2x upscale.
- [x] `colab_server.py` v4: Kapak üretim döngüsüne GFPGAN + RealESRGAN otomatik uygulama.
- [x] `colab_setup.py`: `pyrubberband soundfile`, `openai edge-tts`, `gfpgan realesrgan basicsr` bağımlılıkları eklendi.
- [x] `src/db.ts`: `tts_provider`, `tts_voice` kolonları migration'a eklendi.
- [x] `src/routes/jobs.ts`: `/create-job` `tts_provider` / `tts_voice` alanlarını kabul edip DB'ye yazıyor.
- [x] `src/queue.ts`: Colab payload'ına `tts_provider` / `tts_voice` parametreleri eklendi.
- [x] `dashboard_direct.html`: TTS sağlayıcı dropdown + ses adı inputu + `ttsVoiceHint()` JS fonksiyonu eklendi.

## 🛠️ Teknik Borç Temizliği ve Standartlaştırma
- [x] Node.js backend seviyeli merkezi loglama modülünün (`src/lib/logger.ts`) kurulması ve tüm modüllerin (`queue.ts`, `publisher.ts`, `server.ts`, `ngrok-tunnel.ts`) güncellenmesi.
- [x] İş kuyruğu ve veritabanı sorgularında tip güvenliğinin artırılması için `VideoJob` arayüzünün (`src/types/job.ts`) oluşturulması ve gevşek tip kullanımlarının temizlenmesi.
- [x] Localtunnel bağlantısının beklenmedik kopma durumları için `ngrok-tunnel.ts` içinde auto-recovery/otomatik yeniden başlatma mekanizmasının kurulması.
- [x] TypeScript doğruluğunun (`tsc --noEmit`) ve Vitest entegrasyon testlerinin (14/14) başarıyla tamamlanması.

## 🔒 İstemci ve Sunucu (Backend) Güvenlik Sıkılaştırmaları
- [x] Web arayüzünde (dashboard) olası XSS açıklarını önlemek için kullanıcı girdilerinin (`master_prompt`, `yt_title` vb.) `escapeHtml` fonksiyonu ile sanitize edilerek basılması.
- [x] Clickjacking ve MIME-sniffing saldırılarını engellemek amacıyla Express web sunucusuna HTTP Güvenlik Başlıklarının (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff` vb.) entegre edilmesi.
- [x] CSRF koruma middleware'inin (`src/middleware/csrf.ts`) ve form/fetch interceptor entegrasyonlarının tamamlanması.
- [x] `Content-Security-Policy` (CSP) yanıt başlıklarının dynamic script nonce ile ayarlanması.
- [x] Colab callback webhook `/api/v1/video/callback` endpoint'inin query token PSK kontrolüyle güvenli hale getirilmesi.
- [x] Sıfır bağımlılıklı request body validation modülünün (`src/lib/validation.ts`) oluşturulması ve `/create-job` ile `/save-meta/:id` rotalarına entegre edilmesi.
- [x] Session cookie ayarlarının `httpOnly: true`, `secure: production` ve `sameSite: lax` ile sıkılaştırılması.

## 💰 SaaS Kredilendirme Sistemi ve Dinamik i18n Entegrasyonu (Yeni)
- [x] `users` tablosuna `credits`, `monthly_credit_limit` ve `credit_reset_date` kolonlarının eklenmesi.
- [x] Kredi harcama işlemlerinin ve loglarının tutulacağı `credit_transactions` tablosunun ve transaction loglama mekanizmasının kurulması.
- [x] Video sentezleme, kapak sentezi ve video özgünleştirme işlemlerinde kredi düşüşü kontrolü ve hata/iptal durumlarında kredi iade (`refundCredits`) mekanizmasının entegrasyonu.
- [x] `/api/v1/user/credits` kredi API ucunun ve `/api/v1/locales` dinamik locales servisinin kodlanması.
- [x] `App.tsx` içindeki hardcoded metinlerin temizlenmesi, locales fetch edilerek dinamik i18n yapısına geçiş.
- [x] Arayüze modern glassmorphic Kredi Göstergesinin eklenmesi ve yetersiz kredi durumunda form kilitlenmesi.
- [x] Vitest birim testlerinin (`src/test_credits.spec.ts`) yazılması ve doğrulanması.

## 🛠️ Otomatik Model Seçimi ve Wan 2.1 Entegrasyonu (v4.7)
- [x] `VideoJob` arayüzüne `production_template` alanının eklenmesi (`src/types/job.ts`).
- [x] `startProduction` kuyruk işleyicisine `production_template` değerine göre dinamik model tipi belirleme mantığının yazılması (cinematic -> HunyuanVideo, dynamic -> Wan 2.1, simple -> LTX-Video) (`src/queue.ts`).
- [x] Dil dosyalarına (`tr.json`, `en.json`) şablon isimleri ve dinamik açıklamalarının eklenmesi (`src/locales/`).
- [x] Frontend `App.tsx` dosyasından `modelType` state'inin temizlenerek yerine `productionTemplate` state'inin getirilmesi ve formda `production_template` parametresinin gönderilmesi (`client/src/App.tsx`).
- [x] Frontend form arayüzünün modern şablon seçici kartlar ve dinamik i18n açıklamalarıyla yenilenmesi.
- [x] Backend Express dashboard şablonunun (`src/views/dashboard.ts`) HTML formuna production_template seçicisinin ve dinamik JS ipucunun yerleştirilmesi.
- [x] AI Video Üretim Stüdyosu 2026 Vizyon Belgesinin oluşturulması (`video_studyo_vizyon_2026.md`).

## 🧹 Otonom Temizlik, Erken Polling Çıkışı ve Ses Klonlama Entegrasyonu (v4.8)
- [x] Sahne 1 üretimi bittiğinde `job.material_path` dosyasını diskten erkenden asenkron olarak silen yapının kurulması (`src/queue.ts`).
- [x] Polling döngüsünde callback ile push edilen dosyaların disk kontrolünün yapılması ve early exit (erken çıkış) sağlanması (`src/queue.ts`).
- [x] Google Colab katmanına dinamik XTTS-v2 ses klonlama (voice cloning) desteğinin getirilmesi (`colab_server.py`).
- [x] Node.js `users` tablosuna `personal_voice_base64` kolonu ve migration eklenmesi (`src/db.ts`).
- [x] Ayarlar paneline ve dashboard scripts'e referans ses yükleme (Audio file-to-base64 encoder) desteğinin eklenmesi (`src/views/dashboard.ts`, `dashboardScripts.ts`, `src/routes/settings.ts`).
- [x] İş kuyruğu post payload'ına `reference_audio_base64` parametresinin eklenerek Colab'a gönderilmesi (`src/queue.ts`).
- [x] Projenin tüm kurulum gereksinimlerini içeren `KURULUM_VE_GEREKSINIMLER.md` kılavuzunun oluşturulması ve `README.md` ile `CLAUDE.md` dosyalarının güncellenmesi.
- [x] Vitest entegrasyon testlerinin (18/18) sıfır hata ile geçmesinin doğrulanması.

## 🚀 Bölüm 5: Colab Optimizasyonları ve Yeni Entegrasyon Testleri (Yeni)
- [x] **Colab Hızlı Başlatma (`colab_setup.py`)**: `pip` yerine `uv pip install --system --prefer-binary` entegrasyonuyla kurulum süresinin optimize edilmesi.
- [x] **Otonom Kapanma / Shutdown Endpoint'i (`colab_server.py`)**: Kuyruk bittiğinde Colab VM'in unassign edilmesi için Flask sunucusuna `/shutdown` endpoint'inin eklenmesi.
- [x] **Node.js ColabManager Entegrasyonu (`colab-manager.ts`)**: `doStop()` adımında Colab sunucusundaki `/shutdown` endpoint'ine POST çağrısı atılmasının sağlanması.
- [x] **Vitest Entegrasyon Testleri (`src/test_characters.spec.ts`)**: iyzico webhook ödeme/abonelik, timeline amix müzik miksajı ve çoklu karakter Lipsync tag parsing akışlarını mock'layan ve doğrulayan 4 yeni Vitest testinin yazılması ve 22/22 testin başarıyla yeşillenmesi.

## 🚀 Bölüm 6: Premium Landing Page, 20 Video Vitrini ve Lansman Entegrasyonu (Yeni)
- [x] **TypeScript Tip Hatasının Düzeltilmesi**: `src/test_characters.spec.ts` dosyasındaki `runFFmpegSpy` mock tip uyuşmazlığının giderilmesi.
- [x] **Backend Public API**: Demo videoları ve sahnelerini listeleyen `/api/v1/public/demo-videos` API rotasının eklenmesi (`src/routes/public.ts` ve `src/server.ts`).
- [x] **Frontend Landing Page**: Neon cyan/mor gradyanlı, glassmorphic tasarımlı, video player modallı ve entegre giriş panelli Landing Page bileşeninin kodlanması (`client/src/components/LandingPage.tsx`).
- [x] **App.tsx Entegrasyonu**: isLoggedIn durumuna göre Landing Page render kontrolünün yapılması ve i18n locales güncellemeleri.
- [x] **Demo Videoların Tohumlanması**: `scripts/seed-demo-videos.ts` üzerinden 20 demo video kaydının veritabanına ve diske kopyalanması.

## 🚀 Sprint 1 (Hafta 1-2) — Temel & Chat-to-Edit v1

### Track A: vibeclip — Chat-to-Edit Servisi
- [x] `src/services/chatToEdit.ts` — Tool-calling agent ile doğal dil → FFmpeg komutları
- [x] Sahne puanlaması (hook/flow/value analizi) — mevcut AI servisine entegrasyon
- [x] "Uhh/Eee'leri sil", "İkinci klibi vurucu yap" gibi doğal dil komutları
- [x] BYOK (Bring Your Own Key) — mevcut Zen/Minimax/Gemini zinciriyle uyum
- [x] Vitest testleri (Sprint 4 kapsamında - test_e2e_features.spec.ts içinde tamamlandı)

### Track B: server.ts Modüler Refactoring ✅ (Zaten Tamam)
- [x] `src/routes/` — Tüm rotalar ayrı dosyalarda (15 route dosyası)
- [x] `src/middleware/` — Auth, CSRF, error handling, rate-limit, i18n, theme, utf8
- [x] `src/views/` — Dashboard template'leri ayrıştırılmış (dashboard.ts, dashboardScripts.ts, dashboardStyles.ts, login.ts)
- [x] Magic number'lar `.env` ve rate-limit.ts'de sabitlenmiş
- [x] Global Error Middleware (`src/middleware/error.ts`)
- [x] `npm run check:types` ile doğrulandı (sıfır hata)

### Track C: Kritik Bug Fix'ler ✅ (Zaten Tamam)
- [x] **SSE Auth:** `/progress/:id` rotasında `requireAuth` + `WHERE user_id = ?` kontrolü mevcut
- [x] **Rate Limiting:** `express-rate-limit` ile 4 farklı limiter (heavy:5, medium:20, sse:10, auth:10 failed/15dk)
- [x] **Cancel Endpoint:** `POST /cancel-job/:id` + ownership check + SSE broadcast + audit log
- [x] **Global Error Handler:** `src/middleware/error.ts` — JSON/HTML dual response
- [x] **Phase 1 Async:** Background differentiation + SSE bildirimi (Bölüm 3 kapsamında tamamlandı)

---

## 🚀 Sprint 2 (Hafta 3-4) — Karakter Tutarlılığı & Remotion ✅ TAMAMLANDI

### Track A: ViMax — Multi-Agent Pipeline
- [x] Director/Screenwriter/Producer/Video Generator multi-agent pipeline (`src/services/multiAgentPipeline.ts`)
- [x] AutoCameo — fotoğraftan video karakteri oluşturma, Colab avatar endpoint entegrasyonu (`src/services/autoCameo.ts`)
- [x] MLLM/VLM ile frame doğrulama — sahne tutarlılığı (7 kriter) + final video kalite kontrolü (`src/services/mllmValidator.ts`)
- [x] RAG-based script generation — SQLite geçmiş projelerden RAG taraması (`src/services/ragScriptGenerator.ts`)
- [x] 5 API endpoint (`src/routes/viMax.ts`): pipeline, auto-cameo, validate-consistency, quality-inspect, rag-script
- [x] Mevcut Gemini storyboard'un alternatifi olarak entegrasyon

### Track B: short-video-maker — Remotion & Kokoro TTS
- [x] Remotion React bileşeni — sahneleri kademeli katmanlar halinde render, SceneLayer yapısı (`client/src/components/RemotionVideo.tsx`)
- [x] Kokoro TTS — Colab `/generate-media?mode=kokoro_tts` endpoint entegrasyonu (`src/services/kokoroTts.ts`)
- [x] Pexels B-roll route — `POST /api/v1/broll/generate-broll` + `GET /api/v1/broll/broll/list` (`src/routes/bRoll.ts`)
- [x] MCP Server — 5 MCP tool, chat endpoint, port 3099 (`src/services/mcpServer.ts`)

---

## 🚀 Sprint 3 (Hafta 5-6) — Pipecat & Known Issues ✅ TAMAMLANDI

### Track A: Pipecat — Multi-Agent Voice/Video Pipeline
- [x] Python → Node.js bridge katmanı (`services/pipecat_server.py` + `src/services/pipecatBridge.ts`)
- [x] WebRTC/WebSocket gerçek zamanlı ses/video akışı (FastAPI + ws kütüphanesi)
- [x] HeyGen, Tavus video avatar entegrasyonu (`src/services/avatarService.ts`)
- [x] Multi-agent handoff, parallel fan-out (RabbitMQ üstüne konuşturma katmanı)

### Track C: Known Issues
- [x] Audit Log (`src/routes/audit.ts` — GET audit-logs + actions)
- [x] Toplu Yayın (`src/routes/publish.ts` — POST /publish-all/:id)
- [x] Prettier / ESLint standardı (`.prettierrc`, eslint-config-prettier, format:check/write)

---

## 🚀 Sprint 4 (Hafta 7-8) — CI/CD & React Migration

### Track B: CI/CD
- [x] GitHub Actions — otomatik typecheck + test (`.github/workflows/ci.yml`)
- [x] Pre-commit hooks (`.husky/pre-commit` — tsc + vitest)
- [x] `.github/workflows/ci.yml` — PostgreSQL, Redis servisleriyle tam workflow

### Track C: React Migration (Opsiyonel — onay bekliyor)
- [x] Frontend framework'e geçiş başlangıcı
- [x] Bileşen tabanlı mimariye ilk adım

---

## ⏳ Sonraya Bırakılanlar

### Top Yuvarlak AI Talk-Show MVP (Sprint 3.B)
- [ ] **Sunucu (Meta-Orchestrator):** Masanın lideri, trafiği yönetir
- [ ] **Maç Yorumcusu (Gemini):** Rasyonel veriler, xG beklentileri ve taktik haritalar
- [ ] **Eski Futbolcu (Claude):** Saha içi stres, derbi psikolojisi ve tribün baskısı
- [ ] **Kumarbaz (DeepSeek):** Oran hareketleri ve Kelly Kriteri ile Value bahis anomalileri
- [ ] **DataScout (Siber Keşif Subayı):** Uydu hava durumu, sakatlık matrisleri
- [ ] Grup sohbetinden video üretimi (her karakter için ayrı ses/video → kronolojik montaj)

---

## ✅ Sprint 4.A — E2E Entegrasyon Testleri
- [x] `src/test_e2e_features.spec.ts` — 20/20 test
- [x] vibeclip Chat-to-Edit (`/api/v1/chat-edit/parse|apply|score`)
- [x] ViMax multi-agent pipeline (`/api/v1/vimax/pipeline|auto-cameo|validate-consistency|quality-inspect|rag-script`)
- [x] Pipecat (`/api/v1/pipecat/start-server|stop-server|pipeline|pipelines|avatar/generate|broadcast|health`)
- [x] B-Roll + Kokoro TTS (`/api/v1/broll/generate-broll|broll/list`)
- [x] DB `video_scenes.sort_order` + `status` NOT NULL uyumu
- [x] `ai` SDK, `avatarService`, `axios`, `pipecatBridge` mock'ları vitest ile yalıtıldı

---

## ✅ Sprint 5 — Frontend Modüler Refactor
- [x] `client/src/types.ts` — Paylaşılan TS arayüzleri (`Job`, `UserCredits`, `Language`, `Tab`, `ProductionTemplate`, `TtsProvider`, `Platform`)
- [x] `client/src/components/Header.tsx` — Navbar (tema, dil, dark mode, fırsatlar, grup sohbeti, krediler, çıkış)
- [x] `client/src/components/ProjectForm.tsx` — Sol form (master prompt, şablonlar, TTS, 6 checkbox, platform seçici)
- [x] `client/src/components/StudioPanel.tsx` — Orta panel (tab bar, önizleme, timeline, fırsatlar, sohbet)
- [x] `client/src/components/GalleryPanel.tsx` — Sağ panel (progress, meta editör, galeri, status badge)
- [x] `App.tsx` monolitik 1208 satırdan → ince orkestratöre (~500 satır) düşürüldü
- [x] `verbatimModuleSyntax` uyumlu `import type` standardı
- [x] `tsc --noEmit` sıfır hata, `vite build` 809 ms başarılı
- [x] 42/42 vitest testi geçti
- [x] GitHub Actions CI workflow (Sprint 4.B'den gelen `.github/workflows/ci.yml`)

---

## ✅ Sprint 6 — FFmpeg Coworker Pool (worker_threads)
- [x] `src/services/videoService.ts` — `runInWorker<T>()` ve `runFFmpeg()` yardımcıları eklendi
- [x] Otomatik ts-node/dev vs production `.ts` / `.js` yükleme ayrımı (eval tabanlı)
- [x] `runFFmpegWithFallback` basit `runFFmpeg` döngüsüne sadeleştirildi
- [x] `FFmpegCommand.timeoutMs` opsiyonel alanı eklendi
- [x] `ensurePingSound`, `addCalloutPings`, `generateEndScreenImage`, `applyEndScreen`, `getVideoDuration`, `applyBrandKit` çağrıları `runFFmpeg`'e taşındı
- [x] Kullanılmayan `child_process.execFile` ve `url.fileURLToPath` import'ları kaldırıldı
- [x] `tsc --noEmit` sıfır hata, 42/42 vitest testi geçti

---

## ✅ Sprint 7 — Mimari Karar Kayıtları (ADR)
- [x] `docs/adr/ADR-001-TTS-Engine-Evaluation.md` (XTTS-v2 vs VoxCPM2 değerlendirmesi) — git'e eklendi
- [x] `docs/adr/ADR-002-Frontend-Component-Architecture.md` (App.tsx modüler refactor gerekçesi)
- [x] `docs/adr/ADR-003-FFmpeg-Worker-Pool.md` (worker_threads izolasyonu gerekçesi)
- [x] Tüm ADR'ler standart format: Durum / Bağlam / Karar / Sonuçlar

---

## ✅ Sprint 8 — Lint Temizliği
- [x] `src/routes/payments.ts` — `@ts-ignore` → `@ts-expect-error` (iyzipay için)
- [x] `src/views/dashboardScripts.ts` — `\'` gereksiz kaçışları kaldırıldı
- [x] `npm run check:lint` 0 hata
- [x] `tsc --noEmit` 0 hata
- [x] 42/42 vitest testi geçti

---
> **Not:** Docker bu geliştirme makinesinde çalışmadığı için Docker Compose ve container planları raftan kaldırılmıştır.


## ✅ Sprint 9 - Multi-Agent Talk-Show Orchestrator (MVP)
- [x] src/services/talkShow/ - types, dataSources, orchestrator (5 agents AI + fallback)
- [x] src/routes/talkShow.ts - POST /orchestrate + GET /health
- [x] src/test_talkShow.spec.ts - 16 tests
- [x] tsc --noEmit 0 errors, 58/58 vitest passed

---

## ✅ Sprint 10 - Production Audit and Fixes
- [x] queue.ts: unused DEFAULT_IDLE_STOP_MS import + dead clients export removed
- [x] colab_server.py: GPU size check added to SFX and cover generators
- [x] jobs.ts: English error messages -> Turkish for consistency
- [x] queue.ts: auto-retry on transient Colab errors (up to 3 attempts)
- [x] db.ts: retry_count INTEGER DEFAULT 0 migration + VideoJob type update
- [x] src/test_audit_fixes.spec.ts - 4 tests (schema, retry_count, type)
- [x] Full audit: Colab lazy loading OK, L4 GPU OK, callback/polling OK, queue lifecycle OK, local->colab ordering OK, fallback mechanisms OK
- [x] 62/62 vitest (7 files) GREEN - tsc --noEmit 0 - lint 0 - vite build 1.03s
- [x] queue.ts: startProduction fonksiyonunda otonom akış sonrası job nesnesinin undefined ile ezilerek TypeError fırlatması engellendi, reload işlemi veritabanı kontrollü olarak sıkılaştırıldı.
- [x] videoService.ts: ffmpeg-pool-worker.js modülünün geliştirme/test ortamında bulunamama uyarısı fs.existsSync ve child_process.execFile fallback mekanizmasıyla çözüldü, Vitest mock mimarisi optimize edildi.
- [x] 72/72 vitest (9 files) GREEN - tsc --noEmit 0 - lint 0 - vite build başarılı

---

## 🚀 Faz A - Infinite Canvas + Smart Caching + Task Controls + Schedule Publishing
*(Kaynak: https://github.com/869413421/ai-moive-studio)*

- [x] **Infinite Canvas:** Text, image ve video node'larını tek canvas üzerinde serbestçe düzenleme, node'ları çizgilerle bağlayarak bağımlılık oluşturma. Canvas Assistant ile karakter referans görseli, storyboard, keyframe ve video node'ları oluşturma. Shift+sürükle ile çoklu seçim ve toplu silme.
- [x] **Smart Caching:** Canvas açıldığında hafif snapshot döndürerek büyük canvas yükleme ve düzenleme deneyimini dengeleme.
- [x] **Task Controls:** Uzun zincirli üretim, toplu görevler ve medya işleme görevleri için asenkron görev mimarisi. Workflow modunda node'lar otomatik gönderilmeden oluşturulur, kullanıcı manuel tetikler.
- [x] **Schedule Publishing:** Dağıtım özelliği (YouTube/Bilibili API entegrasyonu), video yükleme, başlık/özet/tag önerisi üretimi, planlı yayınlanma zamanı desteği.

### Paralel Yapılacak Alt Görevler (Faz A)
1. [x] Canvas mimarisi için `src/services/canvas/` dizini ve temel tipler oluştur
2. [x] `src/services/canvas/InfiniteCanvas.ts` - Canvas state, node graph, dependency lines
3. [x] `src/services/canvas/SmartCache.ts` - Snapshot caching mekanizması
4. [x] `src/services/canvas/TaskController.ts` - Asenkron görev yönetimi
5. [x] `src/routes/canvas.ts` - Canvas CRUD API endpoints
6. [x] Dashboard'a Canvas panel bileşeni ekle (React) - **Frontend'de yapılacak**
7. [x] Schedule publishing backend entegrasyonu (`src/services/scheduler.ts`)
8. [x] `/api/v1/schedule-publish` endpoint'i

---

## 🚀 Faz B - Picture Narration + API Key UI + YouTube Upload İyileştirme
*(Kaynak: https://github.com/wanghaisheng/tiktoka-studio-uploader)*

- [x] **Picture Narration:** Bölüm ve paragraf yapısını otomatik tanıma, eşleşen görsel promptları ve kompozisyon açıklamaları üretme, görsel/ses/altyazı malzemelerini paralel üretme, doğrudan yayınlanabilir video içeriğine birleştirme.
- [x] **API Key UI:** Backend "API Key Management" sayfası (anahtar ekleme), frontend API key yönetim sayfası, özel sağlayıcı desteği (yapılandırılabilir Base URL).
- [x] **YouTube Upload İyileştirme:** Firefox profile desteği (cookie dosyası yerine "browser is insecure" uyarısını önleme), proxy desteği (SOCKS5 dahil), otomatik cookie export, batch video desteği (Excel şablonu veya klasör izleme), AI oluşturulmuş tag'ler, görünmez watermark, çoklu hesap desteği.

### Paralel Yapılacak Alt Görevler (Faz B)
1. [x] API Key yönetim sayfası (`client/src/components/ApiKeyManager.tsx`) - [x]
2. [x] `src/routes/apiKeys.ts` - API key CRUD endpoints
3. [x] Picture narration servis (`src/services/pictureNarration.ts`)
4. [x] YouTube upload iyileştirmeleri (`src/publisher.ts` - profile, proxy, cookie export)
5. [x] Batch upload desteği (`src/routes/batch.ts`)
6. [x] Schedule publish frontend bileşeni - [x]

---

## 🪨 Caveman Skill Entegrasyonu (v5.3)
- [x] JuliusBrussee/caveman unified installer ve local init süreçlerini çalıştır.
- [x] Google Antigravity için 7 adet caveman skill dosyasını `.agents/skills/` dizinine kur.
- [x] Claude Code, opencode ve OpenClaw için global kurulumları yap.
- [x] Cursor, Windsurf, Cline ve GitHub Copilot için proje içi kural dosyalarını (.cursor/rules/caveman.mdc, .windsurf/rules/caveman.md, .clinerules/caveman.md, .github/copilot-instructions.md) oluştur.
- [x] `AGENTS.md` dosyasındaki orijinal içeriği muhafaza ederek kural doğruluğunu koru.

## 🚀 Faz C - Otonom Kırpıcı ve Clipping Motoru (SamurAIGPT Benzeri)
- [x] **Otonom Segmentasyon & Highlight Analizi:** Whisper transkripti ve LLM (Gemini 2.5 Flash) ile uzun yatay videoların en viral olabilecek 30-60 saniyelik kısımlarını belirleyen analiz motorunun yazılması.
- [x] **Akıllı 9:16 Kırpıcı (Smart Cropper):** FFmpeg ve OpenCV yardımıyla yatay videonun konuşmacıyı veya merkez odak noktasını otomatik takip ederek (face tracking/crop) dikey Shorts formatına getirilmesi.
- [x] **Altyazı & Ses Miksajı:** Kırpılan bölümlere otomatik altyazı gömülmesi ve arka plan müzik miksajının yapılması.
- [x] **Toplu İşleme & API Entegrasyonu:** `/api/v1/clipper/extract` ve `/api/v1/clipper/list` rotalarıyla sistemin asenkron kuyruğa (RabbitMQ) entegre edilmesi.
- [x] **A/B Split Screen & Maskot Overlay (SaarD00 Benzeri):** İzleyici retention'ını artırmak amacıyla dikey bölünmüş ekran (FFmpeg `vstack` ile üstte AI video, altta Minecraft/ASMR) ve şeffaf maskot/avatar bindirme şablonunun entegre edilmesi.

## 🚀 Faz D - Akıllı Kurgu ve Yerelleştirme Entegrasyonları (Montage-AI / FunClip / KrillinAI Benzeri)
- [x] **Müzik Ritmine Göre Otomatik Kesim (Beat-Synced Cuts):** FFmpeg ve ses analiz modülleriyle, sahnelerin kurgu geçişlerini arka plan müziğinin ritmine (BPM ve peak noktaları) göre otomatik senkronize eden motorun yazılması.
- [x] **Transkript Tabanlı Kurgu (Transcript-Based Editing):** Panel üzerinden transkript metnindeki kelimelerin silinmesiyle, videonun o saniyelerdeki kısımlarının FFmpeg ile otonom kırpılıp birleştirilmesi.
- [x] **Çok Dilli Otomatik Dublaj (Auto-Dubbing):** Whisper transkriptinin çevrilmesi, XTTS-v2 ses klonlama ile hedef dilde seslendirilmesi ve rubberband ile video süresine göre esnetilip dublajlanması.

## 🚀 Faz E - Akıllı Kurgu ve Renk Derecelendirme (auto-editor / video-use Benzeri)
- [x] **Akıllı Sessizlik ve Hareketsizlik Kesici (Auto-Cuts & Motion Detection):** Konuşmadaki boşlukları ve video karelerindeki hareketsiz sabit anları otomatik tespit edip otonom kırpan FFmpeg filtre entegrasyonu.
- [x] **Doğal Dil ile Renk Derecelendirme (Natural Language Color Grading):** Kullanıcının "sıcak sinematik tonlar", "neon mor" gibi doğal dil komutlarıyla video renk filtrelerini (`colorbalance`, `eq`, LUT `.cube`) dinamik uygulayan kurgu ajanının geliştirilmesi.

## 🚀 Faz F - Dinamik Altyazılar ve Hızlı Transkript (SubtitleAI / AI-Video-Editor Benzeri)
- [x] **Hormozi Tarzı Dinamik Altyazılar (Dynamic Captions):** Kelime bazlı zaman damgaları (word-level timestamp) ile bounce, pulse, shake ve renkli dolgu animasyonları içeren modern altyazı bileşeni (`DynamicCaptions.tsx`).
- [x] **`faster-whisper` ile Hızlı Deşifre:** Colab Flask sunucusunda yer alan konuşma tanıma motorunun `faster-whisper` C++ kütüphanesi ve `openai-whisper` fallback yapısıyla güncellenerek deşifre süresinin 4 kat kısaltılması.

## 🚀 Faz G - Premium AI Kurgu & Ses İyileştirme Entegrasyonları (Descript / Runway Benzeri)
- [x] **AI Göz Teması Düzeltici (Eye Contact Correction):** Konuşmacı veya üretilen avatarın göz bebeklerini ekrana sabitleyerek izleyiciyle doğrudan göz teması kurmasını sağlayan AI modelinin (örn: Gaze-correction) entegrasyonu.
- [x] **AI Stüdyo Ses İyileştirici (Studio Sound / Enhance Audio):** Yüklenen referans konuşma kayıtlarındaki arka plan gürültüsünü, yankıyı ve dip sesleri silerek stüdyo kalitesinde ses üreten ses temizleme filtresinin yazılması.
- [x] **Dinamik Otomatik Yeniden Çerçeveleme (Smart Auto-Reframe):** Yatay (16:9) videoları dikey (9:16) formata çevirirken, konuşmacının yüzünü veya ana odak noktasını OpenCV ile takip ederek (active tracking) dinamik crop yapan FFmpeg şablonu.
- [x] **AI Nesne Silici (Inpainting & Object Removal):** Sahnelerden istenmeyen objeleri veya bozulmaları maskeleyerek temizleyen Runway tarzı hafif inpainting modelinin sunulması.

## 🚀 Faz H - İleri Düzey Viral Optimizasyon & B-Roll Sentezi (OpusClip / Captions Benzeri)
- [x] **Otonom Yapay Zeka B-Roll Sentezi (AI B-Roll Generation):** Sahnelerdeki anahtar kelimelere göre Pexels stok videoları yerine yerel CogVideoX modelleriyle doğrudan 3-4 saniyelik özgün B-Roll video parçaları sentezleyip kurguya dahil eden motor.
- [x] **Viral Hook & Trend Analiz Motoru (Viral Hook Generator):** Üretilen videonun ilk 3 saniyesindeki "Hook" kalitesini değerlendirip, sosyal medya trendlerine göre yüksek etkileşimli alternatif başlıklar ve viral hashtag'ler üreten LLM modülü.
- [x] **Duygu ve Vurgu Odaklı Altyazı Efektleri (Emotion & Highlight Captions):** Ses frekansı ve transkript tonlama analizine göre vurgulu kelimeleri tespit edip, altyazıda farklı renkler (örn: sarı/kırmızı) ve dinamik shake/pop efektleriyle öne çıkaran sistem.

## 🚀 Sprint 12 - Akıllı Prompt ve Tema Servisleri (v5.4)
- [x] Kullanıcı promptlarını genişleten `enhanceVideoPrompt` fonksiyonunun yazılması
- [x] Eğitim/Öğretici video sahne ve promptlarını planlayan `generateTutorialPrompts` fonksiyonunun yazılması
- [x] Landing Page ve Vitrin görselleri/videoları için prompt planı üreten `generateLandingPageAssets` fonksiyonunun yazılması
- [x] Dinamik HSL renk temaları tasarlayan `generateCustomThemes` fonksiyonunun yazılması
- [x] `src/test_prompt_services.spec.ts` üzerinde 4 adet Vitest entegrasyon testinin doğrulanması
- [x] AI Yardımcı API Rotalarının (`/api/v1/ai-helper/*`) kodlanması ve express sunucusuna bağlanması
- [x] `client/src/components/AiAssistantPanel.tsx` panel bileşeninin oluşturulması ve Stüdyoya "AI Asistan" sekmesi olarak entegrasyonu
- [x] `ProjectForm` masterPrompt alanına AI zenginleştirme butonu ("Yapay Zeka ile Geliştir") eklenmesi
- [x] `src/test_ai_helper.spec.ts` entegrasyon testlerinin yazılması ve doğrulanması

## 🚀 Sprint 13 - Görsel Tasarım & Örnekler Entegrasyonu (v5.5)
- [x] Cormorant Garamond ve Manrope Google Fonts bağlantılarını index.html içerisine ekle.
- [x] index.css dosyasını Tasarım_Standartlari.md kuralları doğrultusunda dark luxury temasıyla güncelle (arka plan `#05070B`, yüzeyler `#08111F`, vurgu `#C81A56`, altın `#D4AF37`).
- [x] Örnek videoları editorial asimetrik bir Hero layout ile sergileyen `ExamplesPanel.tsx` bileşenini oluştur.
- [x] `App.tsx` dosyasında `mainTabs` listesinin en başına `Örnekler` sekmesini ekle ve varsayılan olarak seçili gelmesini sağla.
- [x] `StudioPanel.tsx` içindeki `VideoPreview` bileşenini güncelleyerek pending, failed, awaiting_approval, processing durumları için premium dark luxury yer tutucu (placeholder) arayüzleri ve animasyonları entegre et.
- [x] LandingPage bileşeni mount/unmount olurken body overflow ve height değerlerinin dinamik olarak set edilmesini sağlayarak scroll kilitlenme hatasını çöz.
- [x] TypeScript / Vite build hatalarını (`AIStoryAssistant`, `HelpVideoPanel`, `TemplatePreview`, `LandingPageAnimations`, `StudioPanel`) tamamen gider.
- [x] Tüm sistemin derlemesini (`npm --prefix client run build`) ve Vitest entegrasyon testlerinin (75/75) hatasız geçtiğini doğrula.

## ✅ Sprint 16 — Çıktılar (Scroll Düzeltmesi ve TypeScript Tip Temizliği)
- [x] `StudioPanel.tsx` içerisinde 'Stüdyo' dışındaki tab'lerde render edilme çakışmasının engellenmesi (null dönülerek temizlendi).
- [x] `index.css` webkit-scrollbar genişliğinin `8px` yapılması ve premium tasarım kazandırılması.
- [x] Tüm backend ve frontend TypeScript tip hatalarının (helpVideos, storyBibleService, storyChatService, templatePromptService, LandingPage import) giderilmesi.

## ✅ Sonraki Adımlar
- [x] Tüm Faz A, Faz B, Faz C, Faz D, Faz E, Faz F, Faz G ve Faz H işleri tamamlandı (Faz C-H agentic parallel yürütüldü)
- [ ] Code review çalıştırma
- [ ] Git push ve raporlama

