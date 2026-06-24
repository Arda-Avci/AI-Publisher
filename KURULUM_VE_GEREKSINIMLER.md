# AI-Publisher: Kurulum ve Çalışma Gereksinimleri Kılavuzu

Bu belge, **Otonom Çoklu Sosyal Medya Destekli AI Video Üretim ve Pazarlama Platformu** projesinin geliştirme ve üretim ortamlarında sorunsuz çalışması için gerekli olan tüm bileşenleri, bağımlılıkları ve sistem şartlarını bir araya toplamaktadır.

---

## 🛠️ 1. Sistem ve Çalışma Ortamı Gereksinimleri

Projenin çalıştırılabilmesi için yerel bilgisayarda ve Docker GPU container'larında aşağıdaki temel yazılımların kurulu olması gerekir:

*   **Node.js:** v18.0.0 veya üzeri (ES Modül ve NodeNext desteğiyle).
*   **FFmpeg & FFprobe:** Sistem PATH yoluna eklenmiş, altyazı ve font render desteğine sahip güncel sürüm. (Yerel makinede sadece hızlı concat işlemi için kullanılır).
*   **Python:** v3.10 veya v3.11/v3.12 (Docker GPU container katmanı için).
*   **PostgreSQL:** Ana veritabanı deposu (Üretim ortamı için).
*   **SQLite:** Geliştirme ve hızlı yerel testler için entegre veritabanı.
*   **Redis Server:** SSE durum yayınları ve Pub/Sub mimarisi için.
*   **RabbitMQ Server:** Video üretim ve sosyal medya paylaşım iş kuyruklarının otonom yönetimi için.

---

## 🔑 2. Ortam Değişkenleri (`.env` Yapılandırması)

Proje kök dizininde yer alan `.env` dosyasında aşağıdaki çevre değişkenlerinin tanımlanması zorunludur:

```env
# Sunucu Ayarları
PORT=3016
NODE_ENV=development

# SQLite / PostgreSQL Veritabanı
DATABASE_URL=file:./data.db?mode=memory&cache=shared  # Veya postgresql://user:pass@localhost:5432/db
DEFAULT_ADMIN_PASSWORD=admin1234!!

# Tünel ve Callback Güvenliği
CALLBACK_TOKEN=local_callback_secure_token_2026
PUBLIC_URL=https://your-localtunnel-subdomain.loca.lt

# Docker GPU Container Ayarları
DOCKER_HOST=http://localhost
MOCK_DOCKER=false  # Gerçek AI video üretimi için false, testler için true yapılmalıdır

# Yapay Zeka Servis Sağlayıcıları (Fallback Hiyerarşisi için)
ZEN_FREE_API_KEY=your_zen_free_key
MINIMAX_API_KEY=your_minimax_key
GEMINI_API_KEY=your_gemini_key

# Sosyal Medya Otomasyonu (Playwright)
X_HEADLESS=true
YT_PLAYLIST_ID=your_youtube_playlist_id
```

---

## ☁️ 3. Google Colab Katmanı Gereksinimleri (Render Sunucusu)

Ağır yapay zeka modelleri (HunyuanVideo, Wan2.1, LTX-Video, coqui-tts XTTS-v2, AudioLDM2 ve Wav2Lip) GPU üzerinde çalışmaktadır.
*   **Minimum Donanım:** 15 GB+ VRAM (Tesla T4 / L4 veya A100 GPU).
*   **Gerekli Tokenlar:** Colab Secrets (`userdata`) veya Notebook form alanları üzerinden **NGROK_TOKEN** ve **GITHUB_TOKEN** sağlanmalıdır.
*   **Google Drive Mount:** Modellerin yedeklenmesi ve Docker imajlarının depolanması için Google Drive bağlantısı zorunludur.
*   **Kaniko ve Yerel Registry:** Colab VM üzerinde cgroup yetki hatalarını aşmak için Kaniko ve yerel localhost:5000 Registry ayağa kaldırılmalıdır. `colab_setup.py` bu kurulumları otomatik olarak yönetir.

---

## 📦 4. Bağımlılık Paketleri ve Kurulum

### Node.js Backend Kurulumu:
```bash
npm install
```

### CrewAI AI Agent Altyapısı (v0.8.0+):
Senaryo yazma pipeline'ı `@crewai-ts/core` üzerinde çalışır:
```bash
npm install @crewai-ts/core @crewai-ts/gemini
```
- **4-agent pipeline:** Outliner → Scene Architect → Scriptwriter → Reviewer
- **LLM:** Mevcut Gemini client (`src/lib/ai-provider.ts`) fonksiyon olarak CrewAI'ya bağlanır
- **Process:** `Process.sequential` ile sıralı çalışma, Scriptwriter ↔ Reviewer arası revision loop (max 3 iterasyon)
- **Çıktı:** Markdown senaryo + JSON yapı (video pipeline'a beslenmek için)

### Google Colab Python Kurulumu (Otonom):
Colab hücresi çalıştırıldığında `colab_setup.py` aşağıdaki kütüphaneleri otomatik olarak kurar:
*   `diffusers`, `transformers`, `torch` (stabil v2.5.1).
*   `coqui-tts` (alternatif TTS ve ses klonlama için).
*   `pyrubberband`, `edge-tts`, `soundfile` (hız ve perde esnetme için).
*   `gfpgan`, `realesrgan` (yüz restorasyonu ve kapak upscale için).
*   `yt-dlp` (video indirme/özgünleştirme için).
*   `libass-dev` ve sistem yazı tipleri (ASS kinetik altyazı gömme işlemleri için).

---

## 🚀 5. Projeyi Başlatma ve Çalıştırma Adımları

1.  **Servisleri Başlatın:** PostgreSQL (veya SQLite kullanılıyorsa yerel dosya), Redis ve RabbitMQ servislerinin ayakta olduğundan emin olun.
2.  **Yerel Tüneli Açın (Localtunnel):** Node.js sunucusunun Colab callback isteklerini alabilmesi için localtunnel otomatik tetiklenecektir (`src/lib/ngrok-tunnel.ts`).
3.  **Backend Sunucusunu Çalıştırın:**
    ```bash
    npm run dev
    ```
4.  **Google Colab Sunucusunu Başlatın:** [Google_Colab_AI_Publisher.ipynb](file:///c:/Users/Damla/Proje/AI-Publisher/Google_Colab_AI_Publisher.ipynb) dosyasını Google Colab'da açıp tüm hücreleri sırayla çalıştırın. Konsola basılan Ngrok URL'sini backend ayarlarından güncelleyin.
5.  **Giriş Yapın:** Tarayıcıdan `http://localhost:3016` adresine gidin. Kullanıcı adı: `arda.avci@gmail.com`, şifre: `.env`'deki admin şifresidir.
