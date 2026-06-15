# Video Özgünleştirme ve Esnek Stüdyo Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sisteme YouTube video linki veya yerel video yüklenerek özgünleştirme (farklılaştırma) yapılmasını, Colab tarafında doğrudan indirme optimizasyonuyla CogVideoX-5b kullanılmasını ve sıfırdan prompt tabanlı üretim desteğini kazandırmak.

**Architecture:** Node.js backend üzerinde RabbitMQ kuyruğu kullanılarak hazırlık (Phase 1) paralel çalıştırılır. Colab sunucusunda `yt-dlp` ile YouTube videosu doğrudan indirilip OpenCV ile sahnelerin başlangıç kareleri çıkarılır. Bu kareler CogVideoX-5b-I2V modeline beslenir. Son montajda FFmpeg ile küçültme, bulanık arka plan, vinyet/renk filtreleri ve çapraz geçişler (crossfade) eklenir.

**Tech Stack:** Node.js, TypeScript, Express, SQLite/PostgreSQL, RabbitMQ, FFmpeg, Python (Flask), Hugging Face Diffusers (CogVideoX-5b-I2V, CogVideoX-5b-T2V), Wav2Lip.

---

### Task 1: Veritabanı Şeması ve Tip Tanımları Güncellemeleri

**Files:**
- Modify: `src/db.ts`
- Modify: `src/types/index.ts` (veya ilgili tip tanım dosyaları)

- [ ] **Step 1: Şemaya yeni kolon ekleme**
  `video_jobs` tablosuna `differentiation_duration_mode` (aynı, daha kısa, daha uzun tercihini saklamak için) ve `differentiation_layout` (bulanık arka plan vb. tercihini saklamak için) kolonlarını eklemek üzere `src/db.ts` içerisindeki `initDatabase` fonksiyonunu güncelleyin.
  ```typescript
  // src/db.ts güncellenecek kod kesiti:
  // ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS differentiation_duration_mode TEXT DEFAULT 'same';
  // ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS differentiation_layout INTEGER DEFAULT 1;
  ```

- [ ] **Step 2: TypeScript tiplerini güncelleme**
  `src/types/` altındaki job tiplerini bu yeni kolonları destekleyecek şekilde güncelleyin.

- [ ] **Step 3: Commit**
  ```bash
  git add src/db.ts
  git commit -m "db: add differentiation duration and layout preferences to database schema"
  ```

---

### Task 2: Colab Sunucusu CogVideoX-5b Entegrasyonu (`colab_server.py`)

**Files:**
- Modify: `colab_server.py`

- [ ] **Step 1: Gerekli Python paketlerini kontrol etme**
  `yt-dlp` paketinin `colab_server.py` başlatılırken yüklendiğinden veya kurulduğundan emin olmak için importları ekleyin.
  ```python
  import subprocess
  try:
      import yt_dlp
  except ImportError:
      subprocess.run(["pip", "install", "yt-dlp"])
      import yt_dlp
  ```

- [ ] **Step 2: CogVideoX-5b-I2V Lazy-Loading Metodunu Ekleme**
  Görselden video üreten `CogVideoXImageToVideoPipeline` lazy-loading ile yükleyen fonksiyonu yazın:
  ```python
  def generate_video_image_5b_lazy(prompt: str, image_path: str) -> list:
      from diffusers import CogVideoXImageToVideoPipeline
      from diffusers.utils import load_image
      flush_memory()
      pipe = CogVideoXImageToVideoPipeline.from_pretrained(
          "THUDM/CogVideoX-5b-I2V",
          torch_dtype=torch.float16
      )
      pipe.enable_model_cpu_offload()
      pipe.vae.enable_tiling()
      
      init_image = load_image(image_path)
      with torch.inference_mode():
          output = pipe(
              prompt=prompt,
              image=init_image,
              num_frames=49, # 6 saniye @ 8fps
              num_inference_steps=30
          )
      frames = output.frames[0]
      del pipe
      flush_memory()
      return frames
  ```

- [ ] **Step 3: CogVideoX-5b Text-to-Video Metodunu Ekleme**
  Görsel referansı olmayan sıfırdan üretim durumlarında metinden video üreten `CogVideoXPipeline` lazy-load fonksiyonunu ekleyin:
  ```python
  def generate_video_text_5b_lazy(prompt: str) -> list:
      from diffusers import CogVideoXPipeline
      flush_memory()
      pipe = CogVideoXPipeline.from_pretrained(
          "THUDM/CogVideoX-5b",
          torch_dtype=torch.float16
      )
      pipe.enable_model_cpu_offload()
      pipe.vae.enable_tiling()
      with torch.inference_mode():
          output = pipe(
              prompt=prompt,
              num_frames=49, # 6 saniye
              num_inference_steps=30
          )
      frames = output.frames[0]
      del pipe
      flush_memory()
      return frames
  ```

- [ ] **Step 4: Doğrudan İndirme ve Kare Çıkarma (yt-dlp ve OpenCV) Mantığını Ekleme**
  `/generate-media` rotasında, `source_video_id` varsa `yt-dlp` ile indirme ve OpenCV ile `(scene_number - 1) * 6` saniyesindeki kareyi diske kaydetme mantığını uygulayın:
  ```python
  # yt-dlp ile indirme
  ydl_opts = {
      'outtmpl': '/content/source_videos/%(id)s.%(ext)s',
      'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
  }
  # OpenCV frame çıkarma
  cap = cv2.VideoCapture(video_file)
  fps = cap.get(cv2.CAP_PROP_FPS)
  target_frame = int((scene_number - 1) * 6 * fps)
  cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
  ret, frame = cap.read()
  if ret:
      cv2.imwrite(output_image_path, frame)
  ```

- [ ] **Step 5: `/generate-media` Endpoint Güncellemesi**
  Eğer `source_video_id` veya `reference_image_base64` varsa I2V, yoksa T2V motorlarını tetikleyecek şekilde yönlendirme yapısını tamamlayın.

- [ ] **Step 6: Commit**
  ```bash
  git add colab_server.py
  git commit -m "colab: integrate CogVideoX-5b T2V/I2V models and local yt-dlp downloader with frame extractor"
  ```

---

### Task 3: Node.js İş Kuyruğu Hazırlık Aşaması ve Paralelleştirme (`src/queue.ts`)

**Files:**
- Modify: `src/queue.ts`
- Modify: `src/lib/differentiate.ts`

- [ ] **Step 1: RabbitMQ prefetch ve Phase 1 hazırlığı**
  Kuyruktan bir iş alındığında `startProduction` başlar başlamaz `colabMutex.acquire()` kilitlenmeden *önce* eğer iş bir YouTube özgünleştirmesi ise `source_video_id` kullanarak transkript, çeviri ve planlama işlemlerinin Node.js tarafında hazırlandığından emin olun.
  ```typescript
  // src/queue.ts içerisinde colabMutex.acquire() satırından hemen önce:
  if (job.source_video_id && !job.scene_prompts) {
      // transkript çekme, çeviri ve sahne promptlarını oluşturma adımları (Phase 1)
      // bu aşama Colab GPU'sunu kilitlemez!
  }
  ```

- [ ] **Step 2: Colab API istek gövdesini güncelleme**
  Node.js'ten Colab `/generate-media` endpoint'ine giden post body'sine `source_video_id` değerini doğrudan ekleyin. Yerel video uploads ise `reference_image_base64` gönderilmesini sağlayın.

- [ ] **Step 3: Commit**
  ```bash
  git add src/queue.ts src/lib/differentiate.ts
  git commit -m "queue: delegate YouTube download to Colab and parallelize Phase 1 preparations"
  ```

---

### Task 4: Yerel FFmpeg Özgünlük Filtreleri Entegrasyonu (`src/services/videoService.ts`)

**Files:**
- Modify: `src/services/videoService.ts`

- [ ] **Step 1: `applyVideoDifferentiationFilters` Fonksiyonunu Ekleme**
  Uretilen sahne videolarını teliften kurtarmak için %90 boyutuna düşüren, arkasına kendi görüntüsünü 40px bulanıklaştıran, hafif kontrast ve vinyet filtresi ekleyen FFmpeg komutunu yazın:
  ```typescript
  export async function applyVideoDifferentiationFilters(inputPath: string, outputPath: string): Promise<void> {
      const args = [
          '-y', '-i', inputPath,
          '-filter_complex',
          '[0:v]split[orig][bg];[bg]scale=1080:1920,boxblur=40[blurred];[orig]scale=972:-1,eq=contrast=1.05:saturation=1.1[scaled];[blurred][scaled]overlay=(W-w)/2:(H-h)/2,vignette=pi/8[outv]',
          '-map', '[outv]', '-map', '0:a', '-c:a', 'copy', outputPath
      ];
      await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);
  }
  ```

- [ ] **Step 2: Sahneler arası çapraz geçiş (crossfade) veya fade geçişlerini montaj aşamasına entegre edin**

- [ ] **Step 3: Commit**
  ```bash
  git add src/services/videoService.ts
  git commit -m "video: add FFmpeg video size shrink, boxblur background, eq and vignette filters"
  ```

---

### Task 5: Web Ön Yüzü ve Form Kontrolleri (`src/views/dashboard.ts` & `dashboardScripts.ts`)

**Files:**
- Modify: `src/views/dashboard.ts`
- Modify: `src/views/dashboardScripts.ts`
- Modify: `src/routes/jobs.ts`

- [ ] **Step 1: Süre modunu ana stüdyo formuna ekleme**
  `src/views/dashboard.ts` dosyasında `jobForm` içerisine `differentiation_duration_mode` adında bir `select` elementi yerleştirin (Değerler: `same`, `shorter`, `longer`).

- [ ] **Step 2: SSE Durum Takip Etiketlerinin Çevirisini Ekleme**
  Yeni SSE aşamalarını (`stageVideoDownloading`, `stageTranscriptExtracting` vb.) kullanıcıya göstermek için i18n entegrasyonunu yapın.

- [ ] **Step 3: Form kaydetme ve start job rotalarını güncelleme**
  `src/routes/jobs.ts` içinde `/create-job` rotasında gelen duration_mode değerini veritabanına kaydedin.

- [ ] **Step 4: Commit**
  ```bash
  git add src/views/dashboard.ts src/views/dashboardScripts.ts src/routes/jobs.ts
  git commit -m "ui: add duration mode selector to project form and update real-time progress layout"
  ```

---

### Task 6: Entegrasyon Testleri ve Doğrulama

**Files:**
- Create: `src/test_differentiation.spec.ts`

- [ ] **Step 1: Farklılaştırma akışını test eden Vitest dosyası yazma**
  Videonun indirilmeden direct link olarak işleme girmesini, duration modların doğruluğunu ve FFmpeg filtrelerinin çökmeden çalıştığını doğrulayın.

- [ ] **Step 2: Testleri Çalıştırma**
  Run: `npx vitest run src/test_differentiation.spec.ts`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add src/test_differentiation.spec.ts
  git commit -m "test: add integration tests for differentiation modes and FFmpeg filters"
  ```
