# orkunisitmak Repoları - Entegrasyon Analizi

> Kaynak: https://github.com/orkunisitmak?tab=repositories
> Tarih: 11 Haziran 2026
> Amaç: AI-Publisher projesine entegre edilebilecek alt yapıların tespiti

---

## 1. Mevcut Repolar (13 adet)

| # | Repo | Dil | Fork/Original | Açıklama |
|---|------|-----|---------------|----------|
| 1 | **lobe-chat** | TypeScript | Fork | Multi-LLM chat framework (OpenAI, Claude, Gemini, Ollama, TTS/STT, Vision) |
| 2 | **aider** | Python | Fork | GPT-powered terminal coding assistant |
| 3 | **ChatGPT-Next-Web** | TypeScript | Fork | ChatGPT web UI (Next.js) |
| 4 | **midjourney-proxy** | Java | Fork | MidJourney Discord API proxy |
| 5 | **my-SuperAGI** | Python | Fork | Otonom AI agent framework (Docker, Celery) |
| 6 | **Auto-GPT** | Python | Fork | GPT-4 tam otonom deney |
| 7 | **AgentGPT** | TypeScript | Fork | Browser tabanlı otonom AI ajanlar (Next.js, Prisma) |
| 8 | **Feishu-OpenAI** | Go | Fork | Feishu × GPT-3.5 + DALL·E + Whisper entegrasyonu |
| 9 | **Auto-Synced-Translated-Dubs** | Python | Fork | Video altyazı çevirisi + AI dubbing + senkronizasyon |
| 10 | **orkai-chatgpt-clone** | JavaScript | Fork | LibreChat tabanlı ChatGPT klonu |
| 11 | **stable-diffusion-webui** | Python | Fork | SD Web UI (Gradio, GFPGAN, RealESRGAN) |
| 12 | **text2img-index** | - | **Original** | Text-to-image araçları dizini (⭐53) |
| 13 | **instant-ngp** | Cuda | Fork | NVIDIA hızlı NeRF/SDF/Volume render |

---

## 2. Entegrasyon Analizi

### 🟢 YÜKSEK ÖNCELİKLİ — Doğrudan Entegre Edilebilir

#### 1. Auto-Synced-Translated-Dubs
- **Ne işe yarar:** Video altyazısını çevirir, AI sesle dublaj yapar, altyazı zamanlamasına göre sesi senkronize eder.
- **AI-Publisher'a entegrasyon:**
  - Zaten `colab_server.py`'de OpenCV tabanlı lip-sync var. Bu repodaki `rubberband` ile ses uzatma/kısaltma ve 2-pass TTS sentezleme yaklaşımı çok daha kaliteli dublaj sağlar.
  - Google Cloud / Azure TTS + DeepL çeviri desteği, çoklu dilde içerik üretimi için kullanılabilir.
  - "Two-pass" ses sentezleme özelliği — önce konuşma hızı hesaplanır, sonra doğru hızda yeniden sentezlenir. Lip-sync kalitesini artırır.
  - TrackAdder.py scripti — çoklu dil ses tracklerini tek MP4'e gömer. YouTube çoklu dil desteği için ideal.
- **Entegrasyon zorluğu:** Düşük. Mevcut FFmpeg montaj zincirine rubberband ve 2-pass TTS eklenebilir.

### 🟡 ORTA ÖNEMLİ — Mimari İlham / Kısmi Entegrasyon

#### 2. Lobe Chat
- **Ne işe yarar:** 15+ AI sağlayıcıyı tek arayüzde toplayan chat framework (OpenAI, Claude, Gemini, Ollama, Groq vs.). TTS/STT, Vision, plugin sistemi var.
- **AI-Publisher'a entegrasyon:**
  - Multi-provider AI mimarisi (bizde zaten Zen Free → Minimax → Gemini var, daha da genişletilebilir)
  - TTS/STT altyapısı (OpenAI Audio, Microsoft Edge Speech) — mevcut XTTS-v2'ye alternatif sağlayabilir
  - Plugin sistemi (Function Calling) — AI-Publisher'ın sosyal medya yayın motoru plugin olarak entegre edilebilir
  - Agent Market (GPTs) yapısı — AI-Publisher'da "içerik stratejisti" ajanları için ilham
- **Entegrasyon zorluğu:** Orta. Büyük bir Next.js projesi, temel mimarisi ödünç alınabilir.

#### 3. my-SuperAGI / Auto-GPT / AgentGPT
- **Ne işe yarar:** Otonom AI ajanları oluşturma, yönetme ve çalıştırma frameworkleri.
- **AI-Publisher'a entegrasyon:**
  - SuperAGI'deki tool sistemi (Slack, Email, Jira, Google Search, GitHub, Dall-E) — AI-Publisher'ın yeteneklerini genişletmek için referans
  - AgentGPT'deki Next.js + Prisma + tRPC stack'i — dashboard yeniden yazımı için referans
  - Auto-GPT'deki memory management (Redis/Pinecone) — uzun süreli içerik stratejisi hafızası için
  - Agent trajectory fine-tuning — AI üretim sürecinin iyileştirilmesi
- **Entegrasyon zorluğu:** Yüksek. Framework'ün tamamını değil, belirli desenleri almak daha mantıklı.

#### 4. Feishu-OpenAI
- **Ne işe yarar:** GPT-3.5 + DALL·E + Whisper'ı Feishu (Lark) mesajlaşma platformuna entegre eder.
- **AI-Publisher'a entegrasyon:**
  - Multi-API orchestration deseni (aynı anda GPT + DALL·E + Whisper) — Colab'daki çoklu model yönetimine benzer
  - Sesli komut + görsel üretim + yazılı sohbet akışı — AI-Publisher'ın "sesle video üret" özelliği için ilham
  - Reverse proxy ve multi-token load balancing — AI sağlayıcı yük dengeleme için referans
- **Entegrasyon zorluğu:** Düşük. Desen seviyesinde ilham alınabilir.

#### 5. midjourney-proxy
- **Ne işe yarar:** MidJourney'i Discord API üzerinden REST API olarak kullanmayı sağlar.
- **AI-Publisher'a entegrasyon:**
  - Colab sunucumuzdaki `/generate-media` endpoint'ine benzer proxy mantığı
  - Imagine/Upscale/Variation işlem kuyruğu — bizim RabbitMQ job queue yapımıza çok benzer
  - Discord WSS yerine bot-token alternatifi — Colab sağlık kontrolü için referans
  - Task queue (default 10, concurrency 3) — mevcut ColabMutex mantığına benzer
- **Entegrasyon zorluğu:** Düşük. Queue + Proxy deseni olarak referans.

#### 6. stable-diffusion-webui
- **Ne işe yarar:** Gradio tabanlı Stable Diffusion arayüzü (txt2img, img2img, GFPGAN, RealESRGAN).
- **AI-Publisher'a entegrasyon:**
  - GFPGAN yüz düzeltme — mevcut DreamShaper kapak üretimine entegre edilebilir
  - RealESRGAN çözünürlük yükseltme — video/output kalitesini artırmak için
  - Prompt matrix yapısı — A/B test varyasyonları için kullanılabilir
  - Loopback img2img — video frame iyileştirme zinciri için
- **Entegrasyon zorluğu:** Düşük. Belirli modüller (GFPGAN, ESRGAN) Colab'a eklenebilir.

### 🔵 DÜŞÜK ÖNCELİKLİ / KAPSAM DIŞI

#### 7. instant-ngp
- NeRF, SDF, Volume render — 3D/görsel efekt. AI-Publisher'ın video üretim hattına doğrudan uymaz. Çok özel 3D içerik üretimi için kullanılabilir ama mevcut roadmap dışı.

#### 8. aider / ChatGPT-Next-Web / orkai-chatgpt-clone
- Genel AI chat arayüzleri. AI-Publisher'ın video üretim odağıyla doğrudan ilgisi yok. Lobe Chat zaten bunların çoğunu kapsıyor.

#### 9. text2img-index
- Text-to-image araç linkleri koleksiyonu. Üretim kodu değil, referans listesi. Mevcut DreamShaper + DALL·E entegrasyonunun ötesinde ek değer sağlamaz.

---

## 3. Önerilen Entegrasyonlar (Öncelik Sırası)

### Hemen Yapılabilecekler (Patch - Minor)

1. **Auto-Synced-Translated-Dubs → Rubberband + 2-pass TTS**: Mevcut lip-sync motoruna `rubberband` ile ses hızı düzeltme ve 2-pass TTS sentezleme ekle. Çoklu dil dublajı için altyapı hazırla.
   - `colab_server.py`'daki `apply_lipsync()` fonksiyonuna entegre edilebilir
   - Mevcut XTTS-v2 + FFmpeg montaj zincirine ek bir adım

2. **stable-diffusion-webui → GFPGAN/RealESRGAN**: Kapak fotoğrafı üretimine yüz düzeltme ve çözünürlük yükseltme ekle.
   - `colab_server.py`'daki thumbnail generation endpoint'ine entegre

3. **Feishu-OpenAI → Whisper entegrasyon deseni**: Sesli komutla video üretimi için referans. Bizde zaten `faster-whisper` var ama Feishu-OpenAI'in Go'daki multi-API orchestration deseni ilham verici.

### Orta Vadeli (Minor - Major)

4. **Lobe Chat → Multi-Provider AI paneli**: Dashboard'a Lobe Chat benzeri bir AI sağlayıcı seçme paneli ekle. Kullanıcı hangi AI'nın senaryo bölme, hangisinin thumbnail üretme gibi görevleri yapacağını seçebilsin.

5. **AgentGPT / SuperAGI → Agent tool sistemi**: AI-Publisher'ın "içerik stratejisti" ajanları için SuperAGI'deki tool ekleme/çıkarma mimarisini kullan. Her ajanın (Video Üretici, Sosyal Medya Yöneticisi, SEO Uzmanı) kendi tool seti olsun.

### Uzun Vadeli (Major - Onay Gerekli)

6. **midjourney-proxy → Görsel üretim proxy'si**: Eğer MidJourney entegrasyonu istenirse, bu proxy yapısı doğrudan kullanılabilir.

7. **instant-ngp → 3D/NeRF içerik**: Eğer video üretiminde 3D sahnelere geçilirse.

---

## 4. Alakasız Repolar

| Repo | Neden Alakasız |
|------|----------------|
| aider | Kod yazma asistanı, video üretimiyle ilgisi yok |
| ChatGPT-Next-Web | Lobe Chat daha kapsamlı |
| orkai-chatgpt-clone | LibreChat fork, video üretimi yok |
| text2img-index | Link koleksiyonu, üretim kodu değil |

---

## 5. Repo İçerik Detayları (Dizin Yapıları)

### 1. lobe-chat (TypeScript, Fork)
```
/          .bunfig.toml, Dockerfile, package.json, next.config.mjs
/src       Ana kod (components, app router, services)
/locales   Çoklu dil dosyaları
/public    Statik dosyalar
/scripts   Build/test scriptleri
/tests     Test dosyaları
/docs      Dokümantasyon
/__mocks__ Test mock'ları
```
**Stack:** Next.js, Bun, Sentry, Vitest, ESLint, Stylelint, i18n, Semantic Release
**Boyut:** Büyük (7000+ star orijinal), CHANGELOG.md 427KB

### 2. aider (Python, Fork)
```
/          setup.py, requirements.txt, pytest.ini
/aider     Ana Python paketi (AI kod asistanı)
/tests     Testler (pytest)
/docs      Dokümantasyon
/benchmark Performans testleri
/scripts   Yardımcı scriptler
/assets    Medya dosyaları
/examples  Örnek kullanımlar
```
**Stack:** Python, pytest, pre-commit, flake8, Docker
**Boyut:** Orta

### 3. ChatGPT-Next-Web (TypeScript, Fork)
```
/          package.json, next.config.mjs, Dockerfile
/app       Ana Next.js uygulaması (sayfalar, API routes)
/public    Statik dosyalar
/scripts   Build scriptleri
/docs      Dokümantasyon
/src-tauri Tauri desktop uygulaması
```
**Stack:** Next.js, Tauri (desktop), Docker, ESLint, Husky
**Boyut:** Orta-Büyük

### 4. midjourney-proxy (Java, Fork)
```
/          pom.xml, Dockerfile
/src       Maven Java projesi (controller, service, model)
/docker    Docker konfigürasyonu
/docs      API dokümantasyonu
```
**Stack:** Java, Spring Boot, Maven, Docker
**Boyut:** Küçük-Orta
**Ana mantık:** Discord WSS → REST API proxy, task queue (concurrency=3)

### 5. my-SuperAGI (Python, Fork)
```
/          main.py, requirements.txt, Dockerfile, docker-compose.yaml
/superagi  Ana framework modülü (agent, tools, worker)
/gui       Web arayüzü (Flask)
/static    Statik dosyalar
/migrations Veritabanı migrasyonları (Alembic)
/tests     Testler
/workspace Agent çalışma alanı
```
**Stack:** Python, Flask, Celery, Redis, Docker, Alembic
**Boyut:** Büyük (16KB main.py, 2.2KB requirements.txt)
**Ana mantık:** Tool sistemi (Slack, Email, Jira, Google, GitHub, Dall-E)

### 6. Auto-GPT (Python, Fork)
```
/          main.py, requirements.txt, Dockerfile
/autogpt   Ana modül (agent, memory, commands, llm)
/scripts   Yardımcı scriptler
/tests     Testler (pytest)
/outputs   Çıktılar
```
**Stack:** Python, Docker, pytest
**Boyut:** Orta
**Ana mantık:** Otonom GPT-4 agent, Redis/Pinecone memory

### 7. AgentGPT (TypeScript, Fork)
```
/          package.json, next.config.mjs, Dockerfile, setup.sh
/src       Next.js + Prisma backend (pages, api, components)
/prisma    DB schema (PostgreSQL)
/__tests__ Jest testleri
/public    Statik dosyalar
/aws       AWS deploy konfigürasyonu
```
**Stack:** Next.js, TypeScript, Prisma, tRPC, TailwindCSS, Jest

### 8. Feishu-OpenAI (Go, Fork)
```
/          Dockerfile, docker-compose.yaml, s.yaml
/code      Go kaynak kodu (main.go, handler, service)
/docs      Dokümantasyon
```
**Stack:** Go, Docker, Serverless (Aliyun)
**Boyut:** Küçük
**Ana mantık:** GPT-3.5 + DALL·E + Whisper entegrasyonu

### 9. Auto-Synced-Translated-Dubs (Python, Fork) ← **KRİTİK**
```
/          main.py, requirements.txt, config.ini, batch.ini
/Scripts   Ana Python scriptleri (dubbing, translation, sync)
/Tools     Yardımcı araçlar (rubberband, TrackAdder.py)
/SSML_Customization SSML şablonları
```
**Stack:** Python, rubberband, FFmpeg, Google/Azure TTS
**Boyut:** Küçük (14KB main.py)
**Ana mantık:** Altyazı çevirisi → 2-pass TTS → rubberband ses senkronizasyonu → TrackAdder çoklu dil MP4

### 10. orkai-chatgpt-clone (JavaScript, Fork)
```
/          Dockerfile, docker-compose.yml, meilisearch.yml
/api       Express API backend
/client    React frontend
/images    Görseller
```
**Stack:** Node.js, Express, React, MongoDB, Docker, MeiliSearch
**Boyut:** Orta (LibreChat fork)

### 11. stable-diffusion-webui (Python, Fork) ← **KRİTİK**
```
/          setup.py, Dockerfile, environment.yaml
/ldm       Latent Diffusion Models (core)
/scripts   Inference scriptleri
/configs   Model konfigürasyonları
/models    Model deposu
/data      Veri
/frontend  Web arayüzü (Streamlit)
/optimizedSD OptimizedSD (bellek optimizasyonu)
```
**Stack:** Python, PyTorch, Streamlit/Gradio, Docker
**Boyut:** Orta
**Ana mantık:** txt2img, img2img, GFPGAN (yüz düzeltme), RealESRGAN (upscale), prompt matrix

### 12. text2img-index (-, Original ⭐53)
```
/          readme.md (sadece README)
```
**Stack:** Yok (link koleksiyonu)
**Boyut:** Çok küçük

### 13. instant-ngp (Cuda/C++, Fork)
```
/          CMakeLists.txt, requirements.txt
/src       C++/CUDA kaynak kodları
/include   Header dosyaları
/configs   NeRF/SDF/Volume konfigürasyonları
/data      Örnek veri
/scripts   Python scriptler
/dependencies Bağımlılıklar (submodules)
/docs      Dokümantasyon
```
**Stack:** CUDA, C++, CMake, Python bindings
**Boyut:** Orta-Büyük
**Ana mantık:** Neural Graphics Primitives (NeRF, SDF, Volume rendering)

---

## 6. Kategori Bazlı Değerlendirme

### Fork mı Original mı?
- **Original:** sadece `text2img-index` (link koleksiyonu)
- **Fork:** 12 repo
- Fork'ların orijinalleri: lobe-chat (lobehub), aider (paul-gauthier), AgentGPT (reworkd), Auto-GPT (significant-gravitas) → hepsi popüler ve bakımı yapılan projeler

### Hangi Fork'ta özel değişiklik var?
GitHub API'si fork farklarını göstermiyor ama commit geçmişine bakılırsa:
- `my-SuperAGI` (orkunisitmak'e özel `my-` öneki, muhtemelen kişisel tweak'ler var)
- `text2img-index` kişisel araştırma notları
- Diğerleri muhtemelen vanilla fork (sadece starsız kopya)

---

## Özet

**En yüksek entegrasyon potansiyeli:** `Auto-Synced-Translated-Dubs` (rubberband ses senkronizasyonu + 2-pass TTS) ve `stable-diffusion-webui` (GFPGAN/ESRGAN modülleri). Bunlar mevcut Colab/FFmpeg zincirine düşük maliyetle eklenebilir.

**Mimari ilham:** `Lobe Chat` (multi-provider), `SuperAGI` (tool/agent sistemi), `midjourney-proxy` (queue/proxy deseni).

**Toplam original repo:** 1 adet (`text2img-index`, ⭐53). Diğer 12'si fork.

---

## 7. Implementasyon Durumu (11 Haziran 2026)

### ✅ Implemente Edilenler

#### 1. Auto-Synced-Translated-Dubs → Rubberband + 2-pass TTS (`colab_server.py:330-404`)
**Ne eklendi:**
- `stretch_audio_to_duration()` — `pyrubberband.time_stretch()` ile sesi hedef süreye esnetir/kısaltır (perde korunur, 0.5x-2.0x aralığı)
- `synthesize_speech()` — Çoklu TTS sağlayıcısını (xtts/openai/edge) tek API'de birleştirir + otomatik 2-pass rubberband
- `_generate_media_worker()` içinde TTS çağrısı `synthesize_speech()`'e yönlendirildi; video süresine (6.125s) göre otomatik esnetme

**Nasıl çalışır:**
1. TTS önce normal hızda sentezlenir
2. `speed_factor = actual_duration / target_duration` hesaplanır
3. Rubberband ile ses hedef süreye çekilir → Wav2Lip lip-sync kalitesi artar

#### 2. stable-diffusion-webui → GFPGAN + RealESRGAN (`colab_server.py:1015-1069`)
**Ne eklendi:**
- `enhance_face_gfpgan()` — GFPGANv1.4 ile yüz restorasyonu
- `upscale_image_realesrgan()` — RealESRGAN 2x çözünürlük yükseltme
- Her kapak resmi üretildikten sonra otomatik GFPGAN + ESRGAN uygulanır

#### 3. Lobe Chat → Alternatif TTS Sağlayıcıları (`colab_server.py:357-404`)
**Ne eklendi:**
- `generate_tts_openai()` — OpenAI TTS API (`tts-1`, `alloy` vb. sesler)
- `generate_tts_edge()` — Microsoft Edge Speech (yerel, API anahtarı gerekmez)

### ⚙️ Kullanım

**TTS sağlayıcı seçimi** (Node.js tarafı `/generate-media` isteğinde):
```json
{
  "tts_provider": "xtts",     // "xtts" | "openai" | "edge"
  "tts_voice": "alloy"        // openai için: alloy, echo, fable, nova, shimmer
                              // edge için: tr-TR-EmelNeural, tr-TR-AhmetNeural
}
```

**Kapak iyileştirme** otomatiktir; ek parametre gerektirmez.

### 📦 Yeni Bağımlılıklar (`colab_setup.py`)
- `pyrubberband soundfile` — ses esnetme (rubberband Python bindings)
- `openai edge-tts` — alternatif TTS sağlayıcıları
- `gfpgan realesrgan basicsr` — yüz düzeltme ve upscale
