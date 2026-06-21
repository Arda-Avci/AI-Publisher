# AI-Publisher Otonom Çoklu Sosyal Medya Destekli AI Video Üretim ve Pazarlama Platformu Proje Planı

Bu sistem; tek bir master senaryodan video (sahneler arası devamlılıkla), karakter seslendirmesi (TTS), ses efektleri (SFX) üretecek, dudak senkronizasyonu yapacak, videonun altına altyazı basacak, her şeyi iş kuyruğuna sokup sırayla işleyecek, ön yüzde canlı ilerleme çubuğu gösterecek, biter bitmez videoyu otomatik indirecek ve tek tıkla çerezli (güvenli) yöntemle çoklu sosyal medyada (YouTube, TikTok vb.) yayınlamanızı sağlayacaktır.

Bu yeni v7.0 mimarisinde, ağır FFmpeg video kurgusu, kinetic altyazı yakma, renk derecelendirme (color grading) ve logo yerleştirme süreçleri yerel sunucudan alınarak tamamen **Google Colab katmanına** kaydırılmıştır. Yerel sunucu ise sadece hafif `-c copy` concat (demuxer) yapacak şekilde hafifletilmiştir.

---

## ☁️ BÖLÜM 1: Google Colab Kurulumu & Kaniko Docker Derleme Aşamaları

Ağır yapay zekâ render yükünü Google'ın High-RAM / High-CPU (veya GPU) ortamlarında Docker konteynerleri kullanarak çalıştıracağız.

### 1. Adım: Google Drive Bağlantısı ve Hazırlık
Google Colab'da yeni bir notebook açın ve Google Drive'ınızı mount edin. Modellerin Docker imajları Google Drive üzerinde sıkıştırılmış olarak yedeklenecektir:
```python
from google.colab import drive
drive.mount('/content/drive')
```

### 2. Adım: Kaniko ve Yerel Registry Kurulumu
Colab ortamında cgroup read-only kısıtlamalarını aşmak amacıyla daemonless **Kaniko** motoru ve localhost:5000 portunda çalışan Go-tabanlı yerel Registry kurulacaktır.
`colab_setup.py` dosyası ile kurulumlar otomatik tamamlanır:
```bash
python colab_setup.py
```

### 3. Adım: Docker Imajlarının CPU Üzerinde Derlenmesi ve Drive'a Aktarılması
Colab CPU High-RAM ortamı kullanılarak 11 adet Docker imajı (base + 10 yapay zekâ modeli) paralel `pigz` sıkıştırma desteğiyle inşa edilir:
*   Derlenen imajlar `.tar.gz` formatında `/content/drive/MyDrive/Colab Notebooks/docker/images/` dizinine otomatik olarak gönderilir.
*   İşlem sonunda `verify_images.py --drive-only` ile Drive bütünlük denetimi yapılır ve `runtime.unassign()` ile Colab VM'i otomatik sonlandırılır.

---

## 🛠️ BÖLÜM 2: Node.js & TypeScript Komut Merkezi

Yerel makineniz bir orkestratör (beyin) olarak çalışır.

### 1. Ayar Dosyaları ve Çevre Değişkenleri (`.env`)
```env
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyYourGeminiKey
DOCKER_URL=http://localhost:5001
MOCK_COLAB=false
B2_ENDPOINT_URL=https://s3.us-west-004.backblazeb2.com
B2_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_application_key
```

### 2. Veritabanı Mimarisi (`src/db.ts`)
SQLite / PostgreSQL kullanılarak kullanıcılar, iş kuyrukları ve sosyal medya yayın durumları takip edilir. Kredi sistemi entegre edilmiştir.

### 3. Sıralı İş Kuyruğu ve Akış (`src/queue.ts`)
*   **Yönetmen Planlaması:** Gemini 2.5 Flash ile master prompt sahnelere bölünür, pazarlama yazıları (başlık, açıklama, tag) otomatik oluşturulur.
*   **Parametre Gönderimi:** Colab'a sahne bazında `differentiation_duration_mode`, `differentiation_layout`, logo/watermark URL'leri, arka plan müziği ve altyazı stilleri gönderilir.
*   **Callback / Webhook Bekleme (Bypass Logic):** Colab pre-mixed video üretimini bitirdiğinde, çıktıyı doğrudan Node.js callback endpoint'ine POST (push) eder. `MOCK_COLAB === 'false'` iken local FFmpeg mix adımları bypass edilir.
*   **Hızlı Concat:** Node.js backend'inde herhangi bir FFmpeg re-encode işlemi yapılmaz. Gelen sahneler `ffmpeg -y -f concat -safe 0 -i list.txt -c copy` komutuyla 1 saniyeden kısa sürede birleştirilir.

---

## 💻 BÖLÜM 3: Playwright Çoklu Sosyal Medya Yayın Motoru

Google bot engellemelerini aşmak için çerezli (cookie) ve tarayıcı profili destekli oturum mekanizması kurulmuştur:
*   `auth_youtube.json`, `auth_tiktok.json` çerez dosyaları tarayıcı context'ine giydirilir.
*   `src/publisher.ts` içindeki `uploadToYouTube`, `uploadToTikTok` metotları Playwright ile ilgili platformların yükleme sayfalarını simüle ederek otomatik yükleme ve yayınlama yapar.