# Prod Plan 1 — Colab → GCP Multi-Container Migrasyonu

## Hedef

Colab bağımlılığını tamamen kaldırmak. Tüm GPU işleri GKE'de Docker worker container'lara, CPU işleri Node.js tarafına taşınır.

---

## Mevcut Durum

```
Node.js (Express + queue) ──HTTP──→ Python Flask (colab_server.py)
                                      ├── CogVideoX (GPU)
                                      ├── XTTS-v2 (GPU)
                                      ├── AudioLDM2 (GPU)
                                      ├── Wav2Lip (GPU)
                                      ├── MuseTalk (GPU)
                                      ├── SD Inpaint (GPU)
                                      ├── SD/Flux Image (GPU)
                                      ├── faster-whisper (GPU)
                                      ├── rembg (CPU/GPU)
                                      ├── GFPGAN (GPU)
                                      └── Edge TTS (CPU)
```

Colab'a ~50 HTTP call. Her iş sırayla Python'a gidip gelir.

---

## Hedef Mimari

```
┌────────────────────────────────────────────────────────────────┐
│  GKE Cluster                                                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  CPU Pool (e2-standard-4, spot, ~$50/ay)                    ││
│  │                                                              ││
│  │  Node.js Server (replica: 2-3)                              ││
│  │  ├── Express + Job Queue + SSE                              ││
│  │  ├── Edge TTS (npm edge-tts)                ◄── YENİ       ││
│  │  ├── OpenAI TTS (npm openai, zaten var)                     ││
│  │  ├── rembg (npm @imgly/background-removal)  ◄── YENİ       ││
│  │  ├── Whisper (Gemini fallback, zaten var)                   ││
│  │  └── FFmpeg (tümü, zaten CPU)                              ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  GPU Pool (g2-standard-8, T4, ~$350/ay spot)                ││
│  │                                                              ││
│  │  video-worker (warm pool: 1 replica)                        ││
│  │  └── Flask: CogVideoX-5b/2b, Wan, Hunyuan, LTX             ││
│  │                                                              ││
│  │  audio-worker (on-demand: 0-1 replica)                      ││
│  │  └── Flask: XTTS-v2, AudioLDM2                              ││
│  │                                                              ││
│  │  lipsync-worker (on-demand: 0-1 replica)                    ││
│  │  └── Flask: Wav2Lip, MuseTalk                               ││
│  │                                                              ││
│  │  vision-worker (on-demand: 0-1 replica)                     ││
│  │  └── Flask: SD Inpaint, GFPGAN, RealESRGAN                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  GCS Bucket (dosya paylaşımı)                                   │
│  ├── /jobs/{jobId}/scenes/{sceneNum}/video.mp4                 │
│  ├── /jobs/{jobId}/scenes/{sceneNum}/speech.mp3                │
│  ├── /jobs/{jobId}/scenes/{sceneNum}/sfx.wav                   │
│  ├── /jobs/{jobId}/final.mp4                                   │
│  └── /jobs/{jobId}/covers/                                     │
└────────────────────────────────────────────────────────────────┘
```

---

## Bölüm 1: Node.js Tarafına Çekilecek Python İşleri

### 1.1 Edge TTS (Şu an: Colab Python edge-tts)

**Mevcut**: `queue.ts:648` — `tts_provider: 'edge'` parametresiyle Colab'a gider.

**Yeni**: `npm i edge-tts` — direkt Node.js'de Edge TTS API.

```typescript
// src/lib/tts.ts
import { createClient } from 'edge-tts';

export async function synthesizeEdgeTTS(
  text: string,
  voice: string = 'tr-TR-EmelNeural',
  outputPath: string
): Promise<void> {
  const tts = await createClient();
  await tts.synthesize(text, outputPath, { voice });
}
```

**queue.ts**: `if (tts_provider === 'edge') → synthesizeEdgeTTS()` else → audio-worker.

### 1.2 OpenAI TTS (Şu an: Colab Python openai)

**Mevcut**: Colab'da `generate_tts_openai()`.

**Yeni**: `@ai-sdk/openai` zaten kurulu (v3.0.68). Direkt Node.js'den:

```typescript
import { openai } from '@ai-sdk/openai';
const audioResponse = await openai.audio.speech.create({
  model: 'tts-1', voice: 'alloy', input: text,
});
```

### 1.3 Arkaplan Temizleme - rembg (Şu an: Colab Python rembg)

**Mevcut**: `aiStudio.ts:204`, `editor.ts:43` — HTTP POST `/remove-background`.

**Yeni**: `npm i @imgly/background-removal-node`

```typescript
// src/services/removeBackground.ts
import { removeBackground } from '@imgly/background-removal-node';

export async function removeBg(imagePath: string, outputPath: string): Promise<void> {
  const result = await removeBackground(imagePath);
  await fs.writeFile(outputPath, result);
}
```

### 1.4 Transkripsiyon - Whisper (Şu an: Colab faster-whisper + Gemini fallback)

**Mevcut**: `audio-transcriber.ts:63` — önce Colab'a dener, başarısız olursa Gemini.

**Yeni**: Gemini fallback yeterli. Colab çağrısı kalkar:

```typescript
// audio-transcriber.ts
// ESKİ: colabUrl && colabUrl !== 'https://ngrok-free.app' → colab /transcribe
// YENİ: doğrudan Gemini'ye git
const transcript = await geminiTranscribe(audioPath, language);
```

### 1.5 Ses Esnetme (Zaten FFmpeg)

**Mevcut**: `autoDubbing.ts:188,191` — FFmpeg `rubberband` filter. Python çağrılmıyor.

**Değişiklik yok**.

### 1.6 FFmpeg (Tümü, Zaten CPU)

~80+ FFmpeg çağrısı, hepsi `exec()`/`execFile()`. Değişiklik gerekmez.

---

## Bölüm 2: Docker Worker Container'lar

### 2.1 video-worker (GPU)

| Alan | Değer |
|------|-------|
| Modeller | CogVideoX-5b-I2V (~10GB), CogVideoX-2b-I2V (~5GB), Wan (~14GB), Hunyuan, LTX |
| VRAM | 10-16 GB |
| Port | 5010 |

```dockerfile
# Dockerfile.video-worker
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

RUN pip install --no-cache-dir \
    transformers>=4.46 diffusers>=0.35,<0.36 \
    accelerate flask imageio imageio-ffmpeg \
    scipy opencv-python-headless sentencepiece \
    google-cloud-storage

COPY video_worker.py /
CMD ["python", "-u", "/video_worker.py"]
```

**video_worker.py endpoint'leri**:

| Endpoint | İşlev |
|----------|-------|
| `POST /render` | Video üret (I2V veya T2V, model seçimi) |
| `GET /status/{taskId}` | Task polling |
| `POST /preload` | Model ön yükleme (warm pool) |
| `GET /health` | Sağlık kontrolü |

### 2.2 audio-worker (GPU)

| Alan | Değer |
|------|-------|
| Modeller | XTTS-v2 (~2GB), AudioLDM2 (~2GB) |
| VRAM | ~4 GB |
| Port | 5020 |

```dockerfile
# Dockerfile.audio-worker
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

RUN apt-get update && apt-get install -y espeak-ng espeak \
    libsndfile1 rubberband-cli && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    coqui-tts edge-tts diffusers scipy flask \
    pyrubberband soundfile google-cloud-storage

COPY audio_worker.py /
CMD ["python", "-u", "/audio_worker.py"]
```

**audio_worker.py endpoint'leri**:

| Endpoint | İşlev |
|----------|-------|
| `POST /tts` | XTTS-v2 ses sentezi (ses klonlama) |
| `POST /sfx` | AudioLDM2 ses efekti |
| `POST /dub` | Dubbing (konuşma çevirisi + TTS) |
| `GET /health` | Sağlık kontrolü |

### 2.3 lipsync-worker (GPU)

| Alan | Değer |
|------|-------|
| Modeller | Wav2Lip (~400MB), MuseTalk |
| VRAM | ~2-4 GB |
| Port | 5030 |

```dockerfile
# Dockerfile.lipsync-worker
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

RUN pip install --no-cache-dir \
    opencv-python-headless face_recognition \
    flask librosa scipy google-cloud-storage

COPY Wav2Lip/ /app/Wav2Lip/
COPY lipsync_worker.py /
CMD ["python", "-u", "/lipsync_worker.py"]
```

**lipsync_worker.py endpoint'leri**:

| Endpoint | İşlev |
|----------|-------|
| `POST /lipsync` | Wav2Lip (video+audio → lip-synced video) |
| `POST /musetalk` | MuseTalk talking head (face+audio → talking video) |
| `GET /health` | Sağlık kontrolü |

### 2.4 vision-worker (GPU)

| Alan | Değer |
|------|-------|
| Modeller | SD Inpainting (~2GB), GFPGAN (~1GB), RealESRGAN (~1GB) |
| VRAM | ~4 GB |
| Port | 5040 |

```dockerfile
# Dockerfile.vision-worker
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

RUN pip install --no-cache-dir \
    diffusers transformers accelerate flask \
    opencv-python-headless gfpgan realesrgan basicsr \
    google-cloud-storage

COPY vision_worker.py /
CMD ["python", "-u", "/vision_worker.py"]
```

**vision_worker.py endpoint'leri**:

| Endpoint | İşlev |
|----------|-------|
| `POST /inpaint` | SD Inpaint (image+mask+prompt) |
| `POST /enhance-face` | GFPGAN yüz düzeltme |
| `POST /upscale` | RealESRGAN upscale |
| `GET /health` | Sağlık kontrolü |

### 2.5 asr-worker (CPU opsiyonel)

| Alan | Değer |
|------|-------|
| Model | faster-whisper (~1GB) |
| Port | 5050 |

Opsiyonel. Gemini fallback yeterliyse gerekmez. faster-whisper Türkçe'de daha hızlı/doğru ise eklenir.

---

## Bölüm 3: Dosya Paylaşım Stratejisi

Worker'lar aynı diskte değil. **GCS Bucket** üzerinden:

```
Node.js orchestrator
  │
  ├── Upload input → gs://bucket/jobs/{jobId}/scenes/{n}/input.mp4
  │
  ├── POST video-worker:5010/render
  │   { inputGcs, outputGcs: "gs://..." }
  │
  ├── Worker: gsutil cp → /tmp/input.mp4 → işle → gsutil cp output → GCS
  │
  └── Node.js: downloadFromGcs(outputGcs) → local disk
```

```typescript
// src/lib/gcs.ts
import { Storage } from '@google-cloud/storage';
const storage = new Storage();
const bucket = storage.bucket('ai-publisher-media');

export async function uploadToGcs(localPath: string, gcsPath: string): Promise<void> {
  await bucket.upload(localPath, { destination: gcsPath });
}

export async function downloadFromGcs(gcsPath: string, localPath: string): Promise<void> {
  await bucket.file(gcsPath).download({ destination: localPath });
}
```

Worker'lar aynı service account ile bucket'a erişir.

---

## Bölüm 4: Node.js Orchestrator

### 4.1 src/services/orchestrator.ts (yeni)

```typescript
export class Orchestrator {
  async renderVideo(jobId: number, scene: Scene, model: string): Promise<string> {
    const inputGcs = await this.uploadToGcs(scene.materialPath);
    const outputGcs = `gs://bucket/jobs/${jobId}/scenes/${scene.number}/video.mp4`;

    await this.callWorker('video-worker:5010', '/render', {
      jobId, sceneNumber: scene.number, model,
      prompt: scene.videoPrompt, inputImageGcs: inputGcs, outputVideoGcs: outputGcs,
    });

    return this.downloadFromGcs(outputGcs);
  }

  async synthesizeTTS(text: string, provider: string): Promise<string> {
    if (provider === 'edge') {
      return synthesizeEdgeTTS(text);
    }
    return this.callWorker('audio-worker:5020', '/tts', { text });
  }

  async removeBg(imagePath: string): Promise<string> {
    return removeBg(imagePath); // direkt Node.js, @imgly ile
  }
}
```

### 4.2 queue.ts değişikliği

Tüm `COLAB_URL` çağrıları `orchestrator` çağrılarıyla değişir:

```
ESKİ: await axios.post(`${COLAB_URL}/generate-media`, {...})
YENİ: await orchestrator.renderVideo(job.id, scene, model)

ESKİ: await axios.post(`${COLAB_URL}/transcribe`, {...})
YENİ: await geminiTranscribe(audioPath, 'tr')

ESKİ: await axios.post(`${COLAB_URL}/remove-background`, {...})
YENİ: await orchestrator.removeBg(imagePath)
```

### 4.3 colab-manager.ts → worker-manager.ts

Ngrok yok, Python subprocess yok. Sadece worker health check kalır:

```typescript
export class WorkerManager {
  private workers = {
    'video': 'http://video-worker:5010',
    'audio': 'http://audio-worker:5020',
    'lipsync': 'http://lipsync-worker:5030',
    'vision': 'http://vision-worker:5040',
  };

  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [name, url] of Object.entries(this.workers)) {
      try {
        await axios.get(`${url}/health`, { timeout: 5000 });
        results[name] = true;
      } catch { results[name] = false; }
    }
    return results;
  }
}
```

---

## Bölüm 5: GKE Manifest

### 5.1 video-worker deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: video-worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: video-worker
  template:
    metadata:
      labels:
        app: video-worker
    spec:
      nodeSelector:
        cloud.google.com/gke-accelerator: nvidia-tesla-t4
      containers:
      - name: video-worker
        image: gcr.io/PROJECT_ID/video-worker:latest
        ports:
        - containerPort: 5010
        resources:
          limits:
            nvidia.com/gpu: 1
            memory: "32Gi"
            cpu: "8"
          requests:
            memory: "16Gi"
            cpu: "4"
        env:
        - name: GOOGLE_APPLICATION_CREDENTIALS
          value: "/secret/key.json"
        - name: MODEL_CACHE_DIR
          value: "/cache"
        volumeMounts:
        - name: model-cache
          mountPath: /cache
        - name: gcp-key
          mountPath: /secret
          readOnly: true
      volumes:
      - name: model-cache
        persistentVolumeClaim:
          claimName: model-cache-pvc
      - name: gcp-key
        secret:
          secretName: gcp-service-account
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: video-worker-hpa
spec:
  minReplicas: 1
  maxReplicas: 3
  metrics:
  - type: External
    external:
      metric:
        name: pubsub_queue_depth
      target:
        type: AverageValue
        averageValue: 2
---
apiVersion: v1
kind: Service
metadata:
  name: video-worker
spec:
  ports:
  - port: 5010
    targetPort: 5010
  selector:
    app: video-worker
```

### 5.2 Node.js deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: node-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: node-server
  template:
    metadata:
      labels:
        app: node-server
    spec:
      nodeSelector:
        cloud.google.com/gke-nodepool: cpu-pool
      containers:
      - name: node-server
        image: gcr.io/PROJECT_ID/node-server:latest
        ports:
        - containerPort: 3010
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        env:
        - name: WORKER_VIDEO_URL
          value: "http://video-worker:5010"
        - name: WORKER_AUDIO_URL
          value: "http://audio-worker:5020"
        - name: WORKER_LIPSYNC_URL
          value: "http://lipsync-worker:5030"
        - name: WORKER_VISION_URL
          value: "http://vision-worker:5040"
        - name: GOOGLE_APPLICATION_CREDENTIALS
          value: "/secret/key.json"
        volumeMounts:
        - name: gcp-key
          mountPath: /secret
          readOnly: true
      volumes:
      - name: gcp-key
        secret:
          secretName: gcp-service-account
---
apiVersion: v1
kind: Service
metadata:
  name: node-server
spec:
  ports:
  - port: 3010
    targetPort: 3010
  selector:
    app: node-server
```

### 5.3 Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    kubernetes.io/ingress.global-static-ip-name: ai-publisher-api
    networking.gke.io/managed-certificates: api-cert
spec:
  defaultBackend:
    service:
      name: node-server
      port:
        number: 3010
```

---

## Bölüm 6: CI/CD (cloudbuild.yaml)

```yaml
steps:
# Build all workers in parallel
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/$PROJECT_ID/video-worker:$SHORT_SHA', '-f', 'Dockerfile.video-worker', '.']
  id: video-worker
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/$PROJECT_ID/audio-worker:$SHORT_SHA', '-f', 'Dockerfile.audio-worker', '.']
  id: audio-worker
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/$PROJECT_ID/lipsync-worker:$SHORT_SHA', '-f', 'Dockerfile.lipsync-worker', '.']
  id: lipsync-worker
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/$PROJECT_ID/vision-worker:$SHORT_SHA', '-f', 'Dockerfile.vision-worker', '.']
  id: vision-worker

# Push all images
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', 'gcr.io/$PROJECT_ID/video-worker:$SHORT_SHA']
  waitFor: [video-worker]
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', 'gcr.io/$PROJECT_ID/audio-worker:$SHORT_SHA']
  waitFor: [audio-worker]
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', 'gcr.io/$PROJECT_ID/lipsync-worker:$SHORT_SHA']
  waitFor: [lipsync-worker]
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', 'gcr.io/$PROJECT_ID/vision-worker:$SHORT_SHA']
  waitFor: [vision-worker]

# Deploy to GKE
- name: 'gcr.io/cloud-builders/gke-deploy'
  args:
  - 'run'
  - '--filename=kubernetes/'
  - '--image=gcr.io/$PROJECT_ID/video-worker:$SHORT_SHA'
  - '--image=gcr.io/$PROJECT_ID/audio-worker:$SHORT_SHA'
  - '--image=gcr.io/$PROJECT_ID/lipsync-worker:$SHORT_SHA'
  - '--image=gcr.io/$PROJECT_ID/vision-worker:$SHORT_SHA'
  - '--location=us-central1'
  - '--cluster=ai-publisher'
```

---

## Bölüm 7: Migration Adımları (Sıralı)

### Aşama 1: Node.js CPU işlerini devralır (Colab hâlâ çalışırken)

| # | İş | Dosyalar |
|---|----|----------|
| 1 | `npm i edge-tts @imgly/background-removal-node @google-cloud/storage` | package.json |
| 2 | `src/lib/tts.ts` yaz — Edge TTS + OpenAI TTS wrapper | Yeni |
| 3 | `src/services/removeBackground.ts` yaz — @imgly rembg | Yeni |
| 4 | `audio-transcriber.ts` — Colab /transcribe çağrısını kaldır, sadece Gemini | Değişiklik |
| 5 | `queue.ts` — TTS routing: edge → direkt, xtts → Colab | Değişiklik |
| 6 | `aiStudio.ts` — removeBackground → @imgly | Değişiklik |
| 7 | Test: Edge TTS, rembg, Gemini transkripsiyon çalışıyor | Test |

### Aşama 2: Docker worker Python kodları

| # | İş | Dosyalar |
|---|----|----------|
| 8 | `video_worker.py` yaz — Flask + CogVideoX/Wan/Hunyuan/LTX | Yeni |
| 9 | `audio_worker.py` yaz — Flask + XTTS-v2/AudioLDM2 | Yeni |
| 10 | `lipsync_worker.py` yaz — Flask + Wav2Lip/MuseTalk | Yeni |
| 11 | `vision_worker.py` yaz — Flask + SD Inpaint/GFPGAN/RealESRGAN | Yeni |
| 12 | Dockerfile'lar yaz (Dockerfile.video-worker, .audio-worker, .lipsync-worker, .vision-worker) | Yeni |
| 13 | `.dockerignore` yaz | Yeni |

### Aşama 3: GCP altyapısı

| # | İş |
|---|----|
| 14 | GCS bucket oluştur (`ai-publisher-media`) |
| 15 | Service account oluştur + bucket/GKE erişimi |
| 16 | `src/lib/gcs.ts` yaz — upload/download wrapper |
| 17 | GKE cluster oluştur (CPU pool + GPU node pool) |
| 18 | PVC oluştur (model cache, 50GB SSD) |
| 19 | K8s manifest yaz (kubernetes/ klasörü) |
| 20 | cloudbuild.yaml yaz |
| 21 | Docker image'ları build + push |

### Aşama 4: Orchestrator geçişi

| # | İş | Dosyalar |
|---|----|----------|
| 22 | `src/services/orchestrator.ts` yaz — worker çağrıları + GCS | Yeni |
| 23 | `queue.ts` — Colab çağrılarını orchestrator ile değiştir | Değişiklik |
| 24 | `colab-manager.ts` → `worker-manager.ts` refactor | Yeniden adlandırma |
| 25 | `routes/colab*.ts` → worker health route'ları | routes/ |
| 26 | `.env` güncelle: `COLAB_URL` → `WORKER_*_URL` | .env |

### Aşama 5: Colab kapatma

| # | İş |
|---|----|
| 27 | Worker'lar prod'da test edilir |
| 28 | Colab sunucusu durdurulur |
| 29 | `colab_setup.py`, `colab_server.py` arşivlenir |
| 30 | `colab-manager.ts` tamamen temizlenir |
| 31 | `.env`'den Ngrok/Colab kaldırılır |

---

## Bölüm 8: Maliyet (Aylık)

| Bileşen | Detay | Maliyet |
|---------|-------|:-------:|
| GKE CPU pool | e2-standard-4 × 2 (spot) | ~$40 |
| GKE GPU pool | g2-standard-8 T4 × 1 warm | ~$350 |
| GCS Bucket | 100GB + egress | ~$15 |
| Load Balancer | HTTPS + SSL | ~$20 |
| **Toplam** | | **~$425/ay** |
| T4 spot ile | | ~$250/ay |

---

## Bölüm 9: Worker İletişim Akışı (Job Flow)

```
Kullanıcı form gönderir
      │
      ▼
queue.ts job başlatır
      │
      ├── 1. ORCHESTRATOR: vision-worker/enhance-face (opsiyonel)
      │
      ├── (her sahne için:)
      │   ├── 2a. Edge TTS → direkt Node.js (CPU)
      │   ├── 2b. video-worker/render (GPU)
      │   └── 2c. audio-worker/sfx (GPU)
      │
      ├── (tüm sahneler:)
      │   ├── 3. FFmpeg concat (CPU)
      │   └── 4. lipsync-worker/lipsync (GPU)
      │
      ├── (opsiyonel:)
      │   ├── 5a. vision-worker/enhance-face (GPU)
      │   └── 5b. vision-worker/upscale (GPU)
      │
      └── 6. Playwright publishing (CPU)
```

---

## Bölüm 10: Ne Değişiyor?

| Bileşen | Şu an (Colab) | Yeni (GCP) |
|---------|---------------|------------|
| Video üretimi | colab_server.py → CogVideoX | video-worker container → T4 |
| TTS (XTTS) | colab_server.py → XTTS-v2 | audio-worker container |
| TTS (Edge/OpenAI) | colab_server.py → Python lib | **Node.js tarafı** (npm) |
| SFX | colab_server.py → AudioLDM2 | audio-worker container |
| Wav2Lip / MuseTalk | colab_server.py | lipsync-worker container |
| SD Inpaint / GFPGAN | colab_server.py | vision-worker container |
| rembg (arkaplan) | colab_server.py → rembg | **Node.js tarafı** (npm) |
| Transkripsiyon | Colab whisper → Gemini fallback | **Node.js tarafı** (Gemini) |
| FFmpeg | Hepsi CPU (exec) | Aynı, değişiklik yok |
| Ses esnetme | FFmpeg rubberband | Aynı, değişiklik yok |
| Ngrok | Zorunlu | **Kalktı** — Service DNS |
| colab_setup.py | Her açılışta | **Kalktı** — Docker image |
| colab-manager.ts | Colab health/start/stop | WorkerManager olarak yeniden yazılır |

---

## Colab Tamamen Devre Dışı

| Colab bileşeni | Durum |
|----------------|:-----:|
| colab_server.py (2337 satır monolit) | 4 worker'a bölünür → silinir |
| colab_setup.py | **Silinir** |
| colab-manager.ts | WorkerManager olur, Colab referansı kalmaz |
| Ngrok + pyngrok | **Tamamen kalkar** |
| COLAB_URL env var | **Kalkar** — WORKER_URLS gelir |
| Google Colab notebook | **Kullanılmaz** |
| /download/* endpoint'leri | **Kalkar** — GCS geçer |
| colab route'ları | **Kalkar** — worker health gelir |

**Son durum**: Node.js (CPU) + Docker worker'lar (GPU) + GCS (dosya). Colab yok, Ngrok yok, Colab notebook yok.
