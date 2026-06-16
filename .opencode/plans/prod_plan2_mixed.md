# Prod Plan 2 — Mixed Mode (Colab + GCP)

## Amaç

Mevcut monolitik Colab yapısını, **Colab üzerinde Docker container** mimarisine taşımak. Her model ayrı container'da, Node.js ise GCP'de. İleride sadece worker URL'lerini değiştirerek tam GCP'ye geçilir.

---

## Neden Mixed?

| Yaklaşım | GPU | Node.js | Yönetim | Aylık |
|----------|:---:|:-------:|:-------:|:-----:|
| **Şu an (monolitik Colab)** | Colab T4 | Localhost | Elle, kırılgan | $0 |
| **Prod Plan 1 (tam GCP)** | GKE T4 | GKE | Otomatik, sağlam | ~$425 |
| **Prod Plan 2 (mixed)** | Colab T4 | **GCP** | Colab elle, GCP otomatik | ~$60 |

Mixed mod: **en pahalı GPU'yu Colab'dan ücretsiz al**, CPU/Node.js tarafı GCP'de olsun.

---

## Hedef Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│  GCP                                                              │
│                                                                   │
│  Cloud Run / GKE CPU Pool                                        │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  Node.js Server (CPU)                                        ││
│  │  ├── Express + Job Queue + SSE                               ││
│  │  ├── Edge TTS (npm edge-tts)              ◄── CPU, Node.js  ││
│  │  ├── OpenAI TTS (npm openai)              ◄── CPU, Node.js  ││
│  │  ├── rembg (npm @imgly/bg-removal)         ◄── CPU, Node.js ││
│  │  ├── Whisper (Gemini API)                 ◄── CPU, Node.js  ││
│  │  ├── FFmpeg (tümü)                        ◄── CPU, Node.js  ││
│  │  └── Orchestrator (worker router)                            ││
│  │      ├── GPU işi → Colab (Ngrok)                             ││
│  │      └── CPU işi → kendi yapar                               ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  GCS Bucket (dosya köprüsü)                                     │
│  Node.js yükler → Colab okur / Colab yazar → Node.js indirir    │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Google Colab (T4 GPU, ücretsiz)                                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  docker-compose (4 container, T4 GPU paylaşımı)              ││
│  │                                                               ││
│  │  ┌────────────────────┐  ┌────────────────────┐             ││
│  │  │  video-worker      │  │  audio-worker      │             ││
│  │  │  :5010             │  │  :5020             │             ││
│  │  │  CogVideoX/Wan     │  │  XTTS-v2/AudioLDM2 │             ││
│  │  └────────────────────┘  └────────────────────┘             ││
│  │                                                               ││
│  │  ┌────────────────────┐  ┌────────────────────┐             ││
│  │  │  lipsync-worker    │  │  vision-worker     │             ││
│  │  │  :5030             │  │  :5040             │             ││
│  │  │  Wav2Lip/MuseTalk  │  │  SD Inpaint/GFPGAN │             ││
│  │  └────────────────────┘  └────────────────────┘             ││
│  │                                                               ││
│  │  ┌──────────────────────────────────────────────────────────┐││
│  │  │  router (nginx/Caddy) :5000                              │││
│  │  │  /video/* → video-worker:5010                            │││
│  │  │  /audio/* → audio-worker:5020                            │││
│  │  │  /lipsync/* → lipsync-worker:5030                        │││
│  │  │  /vision/* → vision-worker:5040                          │││
│  │  └──────────────────────────────────────────────────────────┘││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  Ngrok → router:5000 (tek tunnel)                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Bölüm 1: Dockerfile'lar (Ortak)

Her model kendi container'ında. Gerekli kütüphaneler image'a gömülü, modeller volume'da cache'lenir.

### 1.1 video-worker

```dockerfile
# Dockerfile.video-worker
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg git wget curl && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    torch==2.5.1 torchvision --index-url https://download.pytorch.org/whl/cu124
RUN pip install --no-cache-dir \
    transformers>=4.46 diffusers>=0.35,<0.36 \
    accelerate flask imageio imageio-ffmpeg \
    scipy opencv-python-headless sentencepiece \
    google-cloud-storage

ENV MODEL_CACHE=/cache
ENV PORT=5010
EXPOSE 5010

COPY video_worker.py /
CMD ["python3", "-u", "/video_worker.py"]
```

### 1.2 audio-worker

```dockerfile
# Dockerfile.audio-worker
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg espeak-ng espeak \
    libsndfile1 rubberband-cli && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    torch==2.5.1 torchvision --index-url https://download.pytorch.org/whl/cu124
RUN pip install --no-cache-dir \
    transformers>=4.46 diffusers>=0.35,<0.36 \
    accelerate flask scipy \
    coqui-tts pyrubberband soundfile \
    google-cloud-storage

ENV MODEL_CACHE=/cache
ENV PORT=5020
EXPOSE 5020

COPY audio_worker.py /
CMD ["python3", "-u", "/audio_worker.py"]
```

### 1.3 lipsync-worker

```dockerfile
# Dockerfile.lipsync-worker
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg wget && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    torch==2.5.1 torchvision --index-url https://download.pytorch.org/whl/cu124
RUN pip install --no-cache-dir \
    opencv-python-headless face_recognition \
    flask librosa scipy google-cloud-storage

RUN mkdir -p /app/Wav2Lip/checkpoints && \
    wget -q -O /app/Wav2Lip/checkpoints/wav2lip.pth \
    "https://huggingface.co/vinthony/SadTalker/resolve/main/wav2lip.pth"

ENV MODEL_CACHE=/cache
ENV PORT=5030
EXPOSE 5030

COPY lipsync_worker.py /
CMD ["python3", "-u", "/lipsync_worker.py"]
```

### 1.4 vision-worker

```dockerfile
# Dockerfile.vision-worker
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    torch==2.5.1 torchvision --index-url https://download.pytorch.org/whl/cu124
RUN pip install --no-cache-dir \
    transformers>=4.46 diffusers>=0.35,<0.36 \
    accelerate flask opencv-python-headless \
    gfpgan realesrgan basicsr rembg \
    google-cloud-storage

ENV MODEL_CACHE=/cache
ENV PORT=5040
EXPOSE 5040

COPY vision_worker.py /
CMD ["python3", "-u", "/vision_worker.py"]
```

---

## Bölüm 2: Worker Python Kodları (Özet)

Her worker Flask ile tek bir GPU modelini yükler, aynı portta dinler.

### 2.1 video_worker.py

```python
import os, torch, flask, uuid, json, threading
from diffusers import CogVideoXImageToVideoPipeline, WanAnimatePipeline, \
                       LTXImageToVideoPipeline, HunyuanVideoPipeline

app = Flask(__name__)
TASKS = {}
PIPE = None
MODEL_NAME = None

def load_model(model_name: str):
    global PIPE, MODEL_NAME
    if MODEL_NAME == model_name and PIPE:
        return PIPE
    PIPE = None
    torch.cuda.empty_cache()
    if 'wan' in model_name.lower():
        PIPE = WanAnimatePipeline.from_pretrained(
            "Wan-AI/Wan2.1-I2V-14B-480P", torch_dtype=torch.bfloat16)
    elif 'ltx' in model_name.lower():
        PIPE = LTXImageToVideoPipeline.from_pretrained(
            "Lightricks/LTX-Video", torch_dtype=torch.bfloat16)
    elif 'hunyuan' in model_name.lower():
        PIPE = HunyuanVideoPipeline.from_pretrained(
            "hunyuanvideo-community/HunyuanVideo", torch_dtype=torch.bfloat16)
    else:
        m = "THUDM/CogVideoX-2b-I2V" if "2b" in model_name.lower() else "THUDM/CogVideoX-5b-I2V"
        PIPE = CogVideoXImageToVideoPipeline.from_pretrained(m, torch_dtype=torch.float16)
    PIPE.to("cuda")
    MODEL_NAME = model_name
    return PIPE

def upload_to_gcs(local_path, gcs_path):
    from google.cloud import storage
    client = storage.Client()
    bucket = client.bucket(os.environ['GCS_BUCKET'])
    blob = bucket.blob(gcs_path.replace(f'gs://{os.environ["GCS_BUCKET"]}/', ''))
    blob.upload_from_filename(local_path)

def download_from_gcs(gcs_path, local_path):
    from google.cloud import storage
    client = storage.Client()
    bucket = client.bucket(os.environ['GCS_BUCKET'])
    blob = bucket.blob(gcs_path.replace(f'gs://{os.environ["GCS_BUCKET"]}/', ''))
    blob.download_to_filename(local_path)

@app.route("/render", methods=["POST"])
def render():
    data = request.get_json()
    task_id = str(uuid.uuid4())
    threading.Thread(target=_render_worker, args=(task_id, data)).start()
    return jsonify({"task_id": task_id}), 202

def _render_worker(task_id, data):
    TASKS[task_id] = {"status": "processing", "stage": "loading_model"}
    try:
        pipe = load_model(data.get("model", "cogvideox-5b-i2v"))
        TASKS[task_id]["stage"] = "rendering"
        input_local = f"/tmp/input_{task_id}.png"
        output_local = f"/tmp/output_{task_id}.mp4"
        download_from_gcs(data["inputImageGcs"], input_local)
        from diffusers.utils import load_image
        init_image = load_image(input_local)
        with torch.inference_mode():
            output = pipe(
                prompt=data["prompt"],
                image=init_image,
                num_frames=49,
                num_inference_steps=30,
            )
            frames = output.frames[0]
        from imageio import mimwrite
        mimwrite(output_local, frames, fps=8, codec='libx264')
        upload_to_gcs(output_local, data["outputVideoGcs"])
        os.remove(input_local); os.remove(output_local)
        TASKS[task_id] = {"status": "completed", "outputGcs": data["outputVideoGcs"]}
    except Exception as e:
        TASKS[task_id] = {"status": "failed", "error": str(e)}

@app.route("/status/<task_id>")
def status(task_id):
    return jsonify(TASKS.get(task_id, {"status": "not_found"}))

@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME})

@app.route("/preload", methods=["POST"])
def preload():
    model = request.get_json().get("model", "cogvideox-5b-i2v")
    threading.Thread(target=load_model, args=(model,)).start()
    return jsonify({"status": "loading"})
```

### 2.2 audio_worker.py (endpoint özeti)

```python
@app.route("/tts", methods=["POST"])
def tts():
    """XTTS-v2 ses sentezi"""
    data = request.get_json()
    text, voice, lang = data["text"], data.get("voice", "tr-TR-EmelNeural"), data.get("lang", "tr")
    output_gcs = data["outputGcs"]
    local_path = f"/tmp/tts_{uuid.uuid4()}.wav"
    tts = load_xtts()
    tts.tts_to_file(text=text, speaker=voice, language=lang, file_path=local_path)
    upload_to_gcs(local_path, output_gcs)
    os.remove(local_path)
    return jsonify({"outputGcs": output_gcs})

@app.route("/sfx", methods=["POST"])
def sfx():
    """AudioLDM2 ses efekti"""
    ...

@app.route("/preload", methods=["POST"])
def preload():
    threading.Thread(target=load_xtts).start()
    return jsonify({"status": "loading"})
```

### 2.3 lipsync_worker.py (endpoint özeti)

```python
@app.route("/lipsync", methods=["POST"])
def lipsync():
    """Wav2Lip"""
    data = request.get_json()
    video_gcs = data["videoGcs"]; audio_gcs = data["audioGcs"]; output_gcs = data["outputGcs"]
    video_local = f"/tmp/v_{uuid.uuid4()}.mp4"
    audio_local = f"/tmp/a_{uuid.uuid4()}.wav"
    output_local = f"/tmp/o_{uuid.uuid4()}.mp4"
    download_from_gcs(video_gcs, video_local)
    download_from_gcs(audio_gcs, audio_local)
    model = load_wav2lip()
    result = apply_lipsync(video_local, audio_local, model, output_local)
    upload_to_gcs(output_local, output_gcs)
    for f in [video_local, audio_local, output_local]: os.remove(f)
    return jsonify(result)

@app.route("/musetalk", methods=["POST"])
def musetalk():
    """MuseTalk talking head"""
    ...
```

### 2.4 vision_worker.py (endpoint özeti)

```python
@app.route("/inpaint", methods=["POST"])
def inpaint():
    """SD Inpaint"""
    ...

@app.route("/enhance-face", methods=["POST"])
def enhance_face():
    """GFPGAN yüz düzeltme"""
    ...

@app.route("/upscale", methods=["POST"])
def upscale():
    """RealESRGAN upscale"""
    ...
```

---

## Bölüm 3: Colab Docker Setup

### 3.1 colab_docker_setup.py

```python
"""
Colab'da Docker kur + worker container'ları başlat + Ngrok
"""
import subprocess, os, time, json, urllib.request

print("[1/7] Docker kuruluyor...")
subprocess.run("apt-get update && apt-get install -y docker.io docker-compose-v2",
               shell=True, check=True)
subprocess.run("service docker start", shell=True, check=True)
time.sleep(2)

print("[2/7] NVIDIA container toolkit...")
r = subprocess.run("docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi",
                   shell=True, capture_output=True)
if r.returncode != 0:
    subprocess.run("apt-get install -y nvidia-container-toolkit && service docker restart",
                   shell=True, check=True)
    time.sleep(2)

print("[3/7] Image'lar çekiliyor...")
for img in ["ai-publisher/video-worker", "ai-publisher/audio-worker",
            "ai-publisher/lipsync-worker", "ai-publisher/vision-worker"]:
    subprocess.run(f"docker pull {img}:latest", shell=True)

print("[4/7] Model cache volume...")
subprocess.run("docker volume create model-cache", shell=True)

print("[5/7] Container'lar başlatılıyor...")
containers = [
    ("video-worker", "5010"),
    ("audio-worker", "5020"),
    ("lipsync-worker", "5030"),
    ("vision-worker", "5040"),
]
for name, port in containers:
    subprocess.run(f"""
        docker run -d --gpus all --name {name} \\
            -p {port}:{port} -v model-cache:/cache \\
            -e PORT={port} -e GCS_BUCKET=ai-publisher-media \\
            -v /content/gcp-key.json:/secret/key.json:ro \\
            ai-publisher/{name}:latest
    """, shell=True)
    # Model ön yükleme
    subprocess.run(f"curl -X POST http://localhost:{port}/preload "
                   f"-H 'Content-Type: application/json'", shell=True)

print("[6/7] Router (Caddy)...")
caddyfile = """
:5000 {
    reverse_proxy /video/* localhost:5010
    reverse_proxy /audio/* localhost:5020
    reverse_proxy /lipsync/* localhost:5030
    reverse_proxy /vision/* localhost:5040
    reverse_proxy /health localhost:5010/health
}
"""
with open("/content/Caddyfile", "w") as f:
    f.write(caddyfile)
subprocess.run("docker run -d --name router -p 5000:5000 "
               "-v /content/Caddyfile:/etc/caddy/Caddyfile caddy:alpine", shell=True)

print("[7/7] Ngrok...")
ngrok_token = os.environ.get("NGROK_TOKEN")
if not ngrok_token:
    try:
        from google.colab import userdata
        ngrok_token = userdata.get("NGROK_TOKEN")
    except: pass
subprocess.run(f"ngrok authtoken {ngrok_token}", shell=True)
subprocess.run("ngrok http 5000 --log=stdout > /content/ngrok.log 2>&1 &", shell=True)

for _ in range(30):
    try:
        data = urllib.request.urlopen("http://localhost:4040/api/tunnels").read()
        url = json.loads(data)["tunnels"][0]["public_url"]
        print(f"✅ Ngrok URL: {url}")
        break
    except: time.sleep(1)

print("✅ Tüm worker'lar hazır!")
```

### 3.2 docker-compose.yml

```yaml
version: "3.9"

services:
  video-worker:
    image: ai-publisher/video-worker:latest
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - PORT=5010
      - MODEL_CACHE=/cache
      - GCS_BUCKET=ai-publisher-media
    ports: ["5010:5010"]
    volumes:
      - model-cache:/cache
      - ./gcp-key.json:/secret/key.json:ro

  audio-worker:
    image: ai-publisher/audio-worker:latest
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - PORT=5020
      - GCS_BUCKET=ai-publisher-media
    ports: ["5020:5020"]
    volumes:
      - model-cache:/cache

  lipsync-worker:
    image: ai-publisher/lipsync-worker:latest
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - PORT=5030
      - GCS_BUCKET=ai-publisher-media
    ports: ["5030:5030"]
    volumes:
      - model-cache:/cache

  vision-worker:
    image: ai-publisher/vision-worker:latest
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - PORT=5040
      - GCS_BUCKET=ai-publisher-media
    ports: ["5040:5040"]
    volumes:
      - model-cache:/cache

  router:
    image: caddy:alpine
    ports: ["5000:5000"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    depends_on:
      - video-worker
      - audio-worker
      - lipsync-worker
      - vision-worker

volumes:
  model-cache:
```

---

## Bölüm 4: Node.js Orchestrator (Dual Backend)

### 4.1 src/services/orchestrator.ts

```typescript
export type WorkerMode = 'colab' | 'gcp';
export type WorkerType = 'video' | 'audio' | 'lipsync' | 'vision';

class Orchestrator {
  private mode: WorkerMode = (process.env.WORKER_MODE as WorkerMode) || 'colab';

  private getWorkerUrl(type: WorkerType): string {
    if (this.mode === 'colab') {
      const base = process.env.COLAB_URL!;
      const suffixes: Record<WorkerType, string> = {
        video: '/video/5010',
        audio: '/audio/5020',
        lipsync: '/lipsync/5030',
        vision: '/vision/5040',
      };
      return `${base}${suffixes[type]}`;
    }
    const ports: Record<WorkerType, number> = {
      video: 5010, audio: 5020, lipsync: 5030, vision: 5040,
    };
    return `http://${type}-worker:${ports[type]}`;
  }

  async renderVideo(params: {
    jobId: number; sceneNumber: number; model: string;
    prompt: string; inputImageGcs: string; outputVideoGcs: string;
  }): Promise<void> {
    await this.callWorker('video', '/render', params);
  }

  async synthesizeTTS(params: {
    text: string; voice: string; lang: string; outputGcs: string;
  }): Promise<void> {
    if (process.env.TTS_PROVIDER === 'edge') {
      return synthesizeEdgeTTS(params.text, params.voice, params.outputGcs);
    }
    await this.callWorker('audio', '/tts', params);
  }

  async synthesizeSFX(params: {
    prompt: string; duration: number; outputGcs: string;
  }): Promise<void> {
    await this.callWorker('audio', '/sfx', params);
  }

  async lipSync(params: {
    videoGcs: string; audioGcs: string; outputGcs: string;
  }): Promise<void> {
    await this.callWorker('lipsync', '/lipsync', params);
  }

  async museTalk(params: {
    faceImageGcs: string; audioGcs: string; outputGcs: string;
  }): Promise<void> {
    await this.callWorker('lipsync', '/musetalk', params);
  }

  async inpaint(params: {
    imageGcs: string; maskGcs: string; prompt: string; outputGcs: string;
  }): Promise<void> {
    await this.callWorker('vision', '/inpaint', params);
  }

  async enhanceFace(params: {
    imageGcs: string; outputGcs: string;
  }): Promise<void> {
    await this.callWorker('vision', '/enhance-face', params);
  }

  private async callWorker(type: WorkerType, endpoint: string, body: any): Promise<any> {
    const url = `${this.getWorkerUrl(type)}${endpoint}`;
    const response = await axios.post(url, body, { timeout: 300000 });

    if (response.status === 202) {
      const taskId = response.data.task_id;
      return this.pollTask(type, taskId);
    }
    return response.data;
  }

  private async pollTask(type: WorkerType, taskId: string): Promise<any> {
    const base = this.getWorkerUrl(type);
    for (let i = 0; i < 120; i++) {
      const res = await axios.get(`${base}/status/${taskId}`);
      if (res.data.status === 'completed') return res.data;
      if (res.data.status === 'failed') throw new Error(res.data.error);
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error(`Task ${taskId} timeout`);
  }
}

export const orchestrator = new Orchestrator();
```

### 4.2 queue.ts değişikliği

```
ESKİ:
  const COLAB_URL = process.env.COLAB_URL;
  await axios.post(`${COLAB_URL}/generate-media`, {...})

YENİ:
  const { orchestrator } = await import('./services/orchestrator.js');
  await orchestrator.renderVideo({ jobId, sceneNumber, model, ... });
```

---

## Bölüm 5: GCS Dosya Paylaşımı

```typescript
// src/lib/gcs.ts
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const BUCKET = 'ai-publisher-media';

export async function uploadToGcs(localPath: string, gcsKey: string): Promise<string> {
  const dest = gcsKey;
  await storage.bucket(BUCKET).upload(localPath, { destination: dest });
  return `gs://${BUCKET}/${dest}`;
}

export async function downloadFromGcs(gcsUrl: string, localPath: string): Promise<void> {
  const key = gcsUrl.replace(`gs://${BUCKET}/`, '');
  await storage.bucket(BUCKET).file(key).download({ destination: localPath });
}
```

**Akış**:

```
queue.ts
  │
  ├── Node.js: uploadToGcs(inputVideo) → gs://bucket/jobs/42/scenes/3/input.mp4
  │
  ├── POST video-worker:5010/render
  │   { inputImageGcs, outputVideoGcs }
  │
  ├── Worker: download_from_gcs(inputGcs) → /tmp/input.mp4
  ├── Worker: CogVideoX → /tmp/output.mp4
  ├── Worker: upload_to_gcs(output.mp4, outputGcs)
  │
  └── Node.js: downloadFromGcs(outputGcs) → local
```

---

## Bölüm 6: Migration Yolu (Mixed → Full GCP)

| Aşama | Colab | GCP | WORKER_MODE |
|-------|:-----:|:---:|:-----------:|
| **0 (şu an)** | Monolitik Flask | Yok | colab |
| **1** | Docker container'lar | Node.js + GCS kurulumu | colab |
| **2** | Docker container'lar | **Node.js GCP'de** | colab |
| **3** | Gerekirse çalışır | Node.js + GPU worker'lar | **gcp** |
| **4** | Kapatılır | Tamamen GCP | gcp |

Aşama 2 → 3 geçiş: tek `.env` değişikliği:

```env
# Mixed (Aşama 2)
WORKER_MODE=colab
COLAB_URL=https://abc123.ngrok-free.app
GCS_BUCKET=ai-publisher-media

# Full GCP (Aşama 3)
WORKER_MODE=gcp
# worker URL'leri K8s Service DNS
GCS_BUCKET=ai-publisher-media
```

---

## Bölüm 7: Maliyet

| Bileşen | Açıklama | Aylık |
|---------|----------|:-----:|
| Colab T4 GPU | Ücretsiz (12 saat reset) | $0 |
| GCP Cloud Run | 2 vCPU 4GB, her zaman açık | ~$30 |
| GCS Bucket | 50GB + egress | ~$5 |
| GCP Load Balancer | HTTPS + SSL | ~$20 |
| Ngrok | Ücretsiz (20 conn/dk) | $0 |
| **Toplam** | | **~$55/ay** |

---

## Bölüm 0: Model Kataloğu

### Video Generation

#### Tier 1 (Garantili, L4 24GB FP8 ile sorunsuz)

| Model | Parametre | FP8 VRAM | Çözünürlük | Kalite | Lisans | Not |
|-------|:---------:|:--------:|:----------:|:------:|:------:|-----|
| CogVideoX 2B | 2B | ~8 GB | 720×480 | ⭐⭐⭐ | Apache 2.0 | Mevcut, 6sn klip |
| CogVideoX 5B | 5B | ~16 GB | 720×480 | ⭐⭐⭐⭐ | Apache 2.0 | Mevcut, daha iyi kalite |
| LTX Video 2B | 2B | ~6-8 GB | 768×512 | ⭐⭐⭐ | Apache 2.0 | Hızlı, 720p |
| Wan 2.1 1.3B | 1.3B | ~4-6 GB | 480×832 | ⭐⭐⭐ | Apache 2.0 | Ultra hafif, GGUF |
| AnimateDiff | ~1.5B | ~6 GB | 512×768 | ⭐⭐ | Apache 2.0 | SD 1.5 animasyon |
| Stable Video Diffusion | 1.4B | ~14 GB (FP16) | 576×1024 | ⭐⭐⭐ | Stability | Sadece I2V, 25 frame |

#### Tier 2 (FP8 ile L4'e sığar, önerilen)

| Model | Parametre | FP8 VRAM | Çözünürlük | Kalite | Lisans | Not |
|-------|:---------:|:--------:|:----------:|:------:|:------:|-----|
| **HunyuanVideo 1.5** | **8.3B** | **~14-16 GB** | **720p** | **⭐⭐⭐⭐⭐** | Community | **T2V+I2V, en iyi kalite/VRAM oranı** |
| **Wan 2.2 14B** | **14B** | **~18 GB** | **720p** | **⭐⭐⭐⭐⭐** | Apache 2.0 | **ByteDance SOTA, 32GB RAM önerilir** |
| Wan 2.1 14B | 14B | ~18 GB | 720p | ⭐⭐⭐⭐⭐ | Apache 2.0 | Wan 2.2 ile benzer, kararlı |
| LTX Video 13B | 13B | ~14-18 GB | 720p | ⭐⭐⭐⭐ | Apache 2.0 | Hızlı, kaliteli |
| CogVideoX 5B (FP16) | 5B | ~22 GB | 720×480 | ⭐⭐⭐⭐ | Apache 2.0 | Native, quantizasyon yok |

#### Tier 3 (Deneysel, agresif optimizasyonla)

| Model | Parametre | Optimize VRAM | Çözünürlük | Kalite | Lisans | Not |
|-------|:---------:|:-------------:|:----------:|:------:|:------:|-----|
| Alive VideoDiT | 12B | ~20 GB (FP8) | 480p→1080p | ⭐⭐⭐⭐⭐ | Apache 2.0? | ByteDance açık kaynak, ses+video tek model |
| Alive AudioDiT | 2B | ~4 GB | - | ⭐⭐⭐⭐ | Apache 2.0? | Alive'ın ses branch'i |
| Mochi 1 Preview | 10B | ~20-22 GB (FP8) | 848×480 | ⭐⭐⭐⭐⭐ | Apache 2.0 | Genmo, 5-15 dk/klip |
| HunyuanVideo 13B | 13B | ~8 GB (FP8+tiling) | 540p | ⭐⭐⭐⭐⭐ | Community | Agresif optimizasyon, kalite düşüşü |

#### Tier 4 (GCP/API, L4'e sığmaz)

| Model | VRAM Gerek | Kalite | Erişim | Maliyet |
|-------|:----------:|:------:|:------:|:-------:|
| Seedance 2.0 | 96 GB | ⭐⭐⭐⭐⭐ | API (Replicate/Runware) | $0.06-0.13/s |
| HunyuanVideo 13B FP16 | 47-58 GB | ⭐⭐⭐⭐⭐ | GCP A100 80GB | ~$1.50/saat |
| Mochi 1 FP16 | 42-60 GB | ⭐⭐⭐⭐⭐ | GCP A100 80GB | ~$1.50/saat |
| Wan 14B FP16 | 54-65 GB | ⭐⭐⭐⭐⭐ | GCP A100 80GB | ~$1.50/saat |

---

### Image Generation

Tümü L4 24GB'e sığar.

| Model | Parametre | VRAM | Çözünürlük | Kalite | Lisans |
|-------|:---------:|:----:|:----------:|:------:|:------:|
| FLUX.2 Klein 4B | 4B | ~8 GB (FP8) | 1024×1024 | ⭐⭐⭐⭐⭐ | Apache 2.0 |
| FLUX.1 Dev | 12B | ~12 GB (FP8) | 1024×1024 | ⭐⭐⭐⭐⭐ | Apache 2.0 |
| FLUX.1 Schnell | 12B | ~10 GB (FP8) | 1024×1024 | ⭐⭐⭐⭐ | Apache 2.0 |
| SD 3.5 Medium | 2.5B | ~8 GB | 1024×1024 | ⭐⭐⭐⭐ | Stability |
| SDXL | 2.6B | ~8 GB | 1024×1024 | ⭐⭐⭐⭐ | MIT |
| DreamShaper 8 | 1.5B | ~4 GB | 512×768 | ⭐⭐⭐⭐ | Mevcut |
| RealESRGAN 4x | - | ~2 GB | 4x upscale | ⭐⭐⭐⭐ | Mevcut |
| GFPGAN v1.4 | - | ~2 GB | yüz restorasyon | ⭐⭐⭐⭐ | Mevcut |
| CodeFormer | - | ~4 GB | yüz restorasyon | ⭐⭐⭐⭐ | GFPGAN alternatifi |

---

### Audio Generation

Tümü L4 24GB'e sığar.

#### TTS (Text-to-Speech)

| Model | Parametre | VRAM | Kalite | Not |
|-------|:---------:|:----:|:------:|-----|
| XTTS-v2 | 1.8B | ~4 GB | ⭐⭐⭐⭐⭐ | Ses klonlama, mevcut |
| Kokoro TTS | 82M | <1 GB | ⭐⭐⭐⭐ | Çok hızlı, 8kHz |
| Edge TTS | API | 0 (CPU/Node.js) | ⭐⭐⭐⭐ | Node.js native, CPU |
| OpenAI TTS | API | 0 (cloud) | ⭐⭐⭐⭐⭐ | API maliyetli |
| Bark | 1.2B | ~4 GB | ⭐⭐⭐ | TTS + müzik |

#### SFX (Sound Effects)

| Model | Parametre | VRAM | Maks Süre | Kalite | Not |
|-------|:---------:|:----:|:---------:|:------:|-----|
| AudioLDM 2 | 0.9B | ~2 GB | ~10sn | ⭐⭐⭐ | Mevcut |
| **Stable Audio Open 1.0** | **1.3B** | **~6 GB** | **~47sn** | **⭐⭐⭐⭐** | **44.1kHz stereo** |
| **Stable Audio 3 Medium** | **1.4B** | **~5 GB** | **~6dk** | **⭐⭐⭐⭐⭐** | **Lisanslı data, çok hızlı** |
| **MusicGen Large** | **3.3B** | **~8 GB** | **~30sn** | **⭐⭐⭐⭐** | **Meta, melodi koşullandırma** |

#### Müzik Üretimi

| Model | Parametre | VRAM | Kalite | Not |
|-------|:---------:|:----:|:------:|-----|
| ACE-Step 1.5 | <4B | <4 GB | ⭐⭐⭐⭐ | Sözlerden şarkı, 51 dil |
| DiffRhythm | ~1B | ~8 GB | ⭐⭐⭐⭐ | Diffusion full song |
| HeartMuLa 3B | 3B | ~16 GB | ⭐⭐⭐⭐ | RL optimize, sözlerden müzik |

---

### Lip-Sync & Avatar

| Model | VRAM | Kalite | Not |
|-------|:----:|:------:|-----|
| MuseTalk | ~6 GB | ⭐⭐⭐⭐⭐ | Mevcut, talking head |
| Wav2Lip | ~3 GB | ⭐⭐⭐⭐ | Mevcut, lip sync |
| Alive Referans Animasyon | ~20 GB (VideoDiT ile) | ⭐⭐⭐⭐⭐ | Karakter referansıyla konuşturma |

---

### Video Enhancement

| Model | VRAM | Kullanım | Not |
|-------|:----:|:---------|-----|
| GFPGAN v1.4 | ~2 GB | Yüz restorasyonu | Mevcut |
| RealESRGAN 4x | ~2 GB | Upscale | Mevcut |
| CodeFormer | ~4 GB | Alternatif yüz restorasyonu | GFPGAN'dan iyi sonuç |
| RIFE | ~2 GB | Frame interpolasyon | 2x-4x FPS artışı |

---

### Worker-Model Eşleme (Güncellenmiş)

```
video-worker (5010): scene render
  ├── production_template "cinematic" → HunyuanVideo 1.5 (FP8)
  ├── production_template "dynamic"   → Wan 2.2 14B (FP8)
  ├── production_template "simple"    → CogVideoX 2B (FP8)
  ├── production_template "premium"   → Tier 3 dene (Alive/Mochi)
  │                                      → başaramazsa Tier 2 fallback
  └── Model load/unload: dynamic, lazy, task bazlı

audio-worker (5020):
  ├── TTS: XTTS-v2 (primary) → Kokoro (hızlı) → Edge TTS (CPU fallback)
  ├── SFX: AudioLDM 2 → Stable Audio Open → Stable Audio 3 (kalite kademeli)
  └── Müzik: Stable Audio 3 Medium (gerekirse)

vision-worker (5040):
  ├── Kapak: FLUX.2 Klein (birincil) → DreamShaper (fallback)
  ├── Yüz: GFPGAN → CodeFormer
  ├── Upscale: RealESRGAN 4x
  └── Inpaint: SD Inpaint / FLUX Fill

lipsync-worker (5030):
  ├── Talking head: MuseTalk
  ├── Lip sync: Wav2Lip
  └── Animasyon: Alive reference animation (Tier 3)
```

### Model Seçim Mantığı

#### Fallback Zinciri

Her `production_template` için bir **fallback zinciri** tanımlanır. Model yüklenemezse (OOM, CUDA error, timeout) zincirde bir alt model dene.

```
Template      ┌── Tier 1 deneme → başaramazsa
              │     ┌── Tier 2 deneme → başaramazsa
              │     │     ┌── Tier 3 deneme → başaramazsa
              │     │     │     ┌── HATA (job failed)
              ▼     ▼     ▼     ▼
cinematic → Hunyuan1.5 → Wan14B → Cog5B → Cog2B
dynamic   → Wan14B     → Hunyuan1.5 → Cog5B → Cog2B
premium   → Alive      → Mochi → Hunyuan1.5 → Cog5B → Cog2B
simple    → Cog5B      → Cog2B → LTX2B
```

#### Worker'da Implementasyon

```python
# video_worker.py — fallback chain
FALLBACK_CHAINS = {
    "cinematic": ["hunyuan-video-1.5-fp8", "wan-2.2-14b-fp8",
                  "cogvideox-5b-fp8", "cogvideox-2b-fp8"],
    "dynamic":   ["wan-2.2-14b-fp8", "hunyuan-video-1.5-fp8",
                  "cogvideox-5b-fp8", "cogvideox-2b-fp8"],
    "premium":   ["alive", "mochi-1-fp8", "hunyuan-video-1.5-fp8",
                  "cogvideox-5b-fp8", "cogvideox-2b-fp8"],
    "simple":    ["cogvideox-5b-fp8", "cogvideox-2b-fp8", "ltx-video-2b-fp8"],
}

# Her model için minimum VRAM eşiği (GB)
MODEL_MIN_VRAM = {
    "alive": 22, "mochi-1-fp8": 20,
    "hunyuan-video-1.5-fp8": 14, "wan-2.2-14b-fp8": 18,
    "cogvideox-5b-fp8": 10, "cogvideox-2b-fp8": 6,
    "ltx-video-2b-fp8": 4,
}

def load_model(template: str):
    chain = FALLBACK_CHAINS[template]
    free_vram = get_free_vram_gb()  # torch.cuda.get_device_properties

    for model_name in chain:
        min_vram = MODEL_MIN_VRAM.get(model_name, 99)
        if free_vram < min_vram:
            log(f"[WARN] {model_name} needs {min_vram}GB, only {free_vram}GB free — skip")
            continue
        try:
            pipe = _load_model_weights(model_name)
            log(f"[INFO] Loaded {model_name} ({free_vram:.1f}GB free)")
            return pipe
        except torch.cuda.OutOfMemoryError:
            log(f"[WARN] OOM loading {model_name}, cleaning cache...")
            torch.cuda.empty_cache()
            free_vram = get_free_vram_gb()  # refresh
            continue
        except Exception as e:
            log(f"[WARN] {model_name} failed: {e}")
            continue

    raise RuntimeError(f"All models failed for template '{template}'")
```

#### Orchestrator'da Implementasyon

```typescript
// src/services/orchestrator.ts
const FALLBACK_CHAINS: Record<string, string[]> = {
  cinematic: ['hunyuan-video-1.5-fp8', 'wan-2.2-14b-fp8',
              'cogvideox-5b-fp8', 'cogvideox-2b-fp8'],
  dynamic:   ['wan-2.2-14b-fp8', 'hunyuan-video-1.5-fp8',
              'cogvideox-5b-fp8', 'cogvideox-2b-fp8'],
  premium:   ['alive', 'mochi-1-fp8', 'hunyuan-video-1.5-fp8',
              'cogvideox-5b-fp8', 'cogvideox-2b-fp8'],
  simple:    ['cogvideox-5b-fp8', 'cogvideox-2b-fp8', 'ltx-video-2b-fp8'],
};

async function renderVideo(params: {
  jobId: number; sceneNumber: number;
  template: string; prompt: string;
  inputImageGcs: string; outputVideoGcs: string;
}): Promise<void> {
  const chain = FALLBACK_CHAINS[params.template] ?? FALLBACK_CHAINS.simple;
  let lastError: Error | null = null;

  for (const model of chain) {
    try {
      // Worker'a model adını da gönder, worker kendi VRAM kontrolünü yapar
      const result = await orchestrator.callWorker('video', '/render', {
        ...params, model,
      });
      broadcastProgress(params.jobId, {
        stage: `model:${model}`, progress: 30,
      });
      return result;
    } catch (err: any) {
      lastError = err;
      logger.warn(`[Orchestrator] Model ${model} failed for job ${params.jobId
        }, trying next...`, err.message);
      // Worker'a cache temizleme sinyali
      await orchestrator.callWorker('video', '/clear-cache', {}).catch(() => {});
    }
  }

  throw new Error(`All models failed for template '${params.template
    }'. Last error: ${lastError?.message}`);
}
```

> Colab 12 saat reset → `colab_docker_setup.py` tekrar çalıştırılır (~10dk).

---

## Bölüm 8: Frontend Güncellemeleri

### 8.1 Template-Model Eşleme Göstergesi

Her `production_template` kartı, altında hangi model zincirinin çalışacağını gösterir.

```
┌──────────────────────────────────────┐
│  🎬 Cinematic                         │
│  Sinematik kalite, uzun sahneler      │
│                                       │
│  Model Zinciri:                       │
│  HunyuanVideo 1.5  →  Wan 14B        │
│  → CogVideoX 5B  →  CogVideoX 2B     │
│  └─ İlk model yüklenemezse otomatik  │
│      bir alt modele geçilir           │
│                                       │
│  ⏱ ~3-5 dk/sahne   🎯 Kalite: ⭐⭐⭐⭐⭐ │
└──────────────────────────────────────┘
```

**Veri yapısı (frontend):**

```typescript
// client/src/types.ts
interface TemplateModelInfo {
  key: ProductionTemplate;
  label: string;
  labelTr: string;
  description: string;
  descriptionTr: string;
  modelChain: { name: string; vramGb: number; quality: number }[];
  estimatedSeconds: number;  // sahne başına
  qualityStars: number;
}
```

**Backend'den dinamik çekilir:**

```
GET /api/v1/template-models
→ { templates: TemplateModelInfo[] }
```

### 8.2 Fallback Bildirimi (SSE)

İş kuyruğu SSE akışında model değişikliği anında bildirilir.

```typescript
// queue.ts / orchestrator.ts
// Model fallback olduğunda:
broadcastProgress(jobId, {
  stage: 'model_fallback',
  detail: {
    attempted: 'hunyuan-video-1.5-fp8',   // denenip başarısız olan
    fallbackTo: 'cogvideox-5b-fp8',        // geçilen model
    reason: 'OOM',                          // sebep
  },
  progress: currentProgress,
});
```

**Frontend'de gösterim:**

```typescript
// client/src/components/StudioPanel.tsx
// SSE mesaj tipi 'model_fallback' gelince:
if (event.type === 'model_fallback') {
  setFallbackNotice({
    from: event.detail.attempted,
    to: event.detail.fallbackTo,
    reason: event.detail.reason,
    timestamp: Date.now(),
  });
  // 5 saniye sonra kaybolan bir uyarı bildirimi göster
  setTimeout(() => setFallbackNotice(null), 5000);
}
```

**Progress Bar'daki gösterim:**

```
[████████████░░░░░░░░░░] %60
                         ↑ Küçük etiket
                    "⚠️ Wan14B → Cog5B (VRAM)"
```

### 8.3 GPU Durum Paneli (Admin)

Sadece admin kullanıcıya gösterilir. Şu anki GPU durumunu canlı verir.

```
┌─────────────────────────────────────────┐
│  🖥️ GPU Monitor                    ↻ 5sn │
│                                           │
│  GPU: NVIDIA L4 24GB                      │
│  Kullanılan: 14.2 GB / 24 GB  [████░░]  │
│  Boş: 9.8 GB                              │
│                                           │
│  Aktif Model: hunyuan-video-1.5-fp8      │
│  Son Fallback: 2 dk önce                  │
│    Wan14B → Cog5B (OOM)                  │
│                                           │
│  Worker: video-worker (5010) ✅           │
│  Worker: audio-worker (5020) ✅           │
│  Worker: vision-worker (5040) ⚠️ idle    │
│  Worker: lipsync-worker (5030) ✅         │
└─────────────────────────────────────────┘
```

**Backend endpoint:**

```
GET /api/v1/admin/gpu-status
→ {
    gpuName: string;
    totalVramGb: number;
    usedVramGb: number;
    freeVramGb: number;
    activeModel: string | null;
    workers: { name: string; status: 'healthy'|'idle'|'error'; }[];
    recentFallbacks: { from: string; to: string; reason: string; timestamp: string; }[];
  }
```

**Worker'da GPU metrik endpoint'i:**

```python
# video_worker.py
@app.route("/gpu-stats")
def gpu_stats():
    return jsonify({
        "gpu_name": torch.cuda.get_device_name(0),
        "total_vram_gb": torch.cuda.get_device_properties(0).total_memory / 1e9,
        "used_vram_gb": (torch.cuda.get_device_properties(0).total_memory
                         - torch.cuda.memory_reserved(0)) / 1e9,
        "free_vram_gb": torch.cuda.memory_reserved(0) / 1e9,
        "active_model": MODEL_NAME,
        "fallback_count": FALLBACK_COUNT,
    })
```

### 8.4 Model Seçici (Manuel)

Opsiyonel olarak kullanıcı template yerine doğrudan model seçebilir.

```
Template Seç: [Cinematic ▼]  veya  [🧠 Manuel Model Seç]

Manuel seçildiğinde:
┌──────────────────────────────────────────────────────┐
│  Model: [HunyuanVideo 1.5 (FP8) ▾]                    │
│         ├── HunyuanVideo 1.5 (FP8)  ~14GB  ⭐⭐⭐⭐⭐  │
│         ├── Wan 2.2 14B (FP8)       ~18GB  ⭐⭐⭐⭐⭐  │
│         ├── CogVideoX 5B (FP8)      ~10GB  ⭐⭐⭐⭐   │
│         ├── CogVideoX 2B (FP8)      ~6GB   ⭐⭐⭐    │
│         └── LTX Video 2B (FP8)      ~4GB   ⭐⭐⭐    │
│                                                       │
│  ⚠️ GPU: 14.2 GB boş — önerilen modeller yeşil      │
│  🔴 Kırmızı modeller VRAM yetmez                     │
└──────────────────────────────────────────────────────┘
```

**Endpoint:**

```
POST /api/v1/jobs/check-model
  { jobId: number; modelName: string }
→ { fits: boolean; freeVramGb: number; requiredVramGb: number; }
```

### 8.5 Kalite/Hız Skoru

Her template/model için tahmini süre ve kalite bilgisi gösterilir.

```typescript
const TEMPLATE_STATS: Record<ProductionTemplate, {
  quality: number;        // 1-5 yıldız
  estimatedSecondsPerScene: number;
  vramRequired: number;   // GB
  bestFor: string;        // hangi durumda önerilir
}> = {
  cinematic: {
    quality: 5,
    estimatedSecondsPerScene: 300,  // 5 dk
    vramRequired: 14,
    bestFor: 'Yüksek kaliteli hikaye anlatımı, marka videoları',
  },
  dynamic: {
    quality: 5,
    estimatedSecondsPerScene: 240,
    vramRequired: 18,
    bestFor: 'Aksiyon, hızlı geçişler, sosyal medya viral',
  },
  premium: {
    quality: 5,
    estimatedSecondsPerScene: 480,
    vramRequired: 22,
    bestFor: 'En iyi kalite, deneysel, düşük VRAM riski',
  },
  simple: {
    quality: 3,
    estimatedSecondsPerScene: 120,
    vramRequired: 6,
    bestFor: 'Hızlı üretim, düşük GPU, test',
  },
};
```

**Proje formunda gösterim:**

```
┌──────────────────────────────────────────────────────────┐
│  🎞️ Cinematic                    ⭐⭐⭐⭐⭐              │
│  Sinematik kalite, uzun sahneler   ⏱ ~5dk/sahne        │
│  🔵 Tahmini: 12 sahne × 5dk = ~60dk                     │
│  ████████████████░░░░░░░ GPU: 14/24 GB                  │
│                                                           │
│  ⚡ Simple seçersen: 12 sahne × 2dk = ~24dk (hızlı)    │
└──────────────────────────────────────────────────────────┘
```

### 8.6 Gerekli Frontend Değişiklik Özeti

| # | Değişiklik | Dosya | Süre |
|---|-----------|-------|:----:|
| 1 | `TemplateModelInfo` tipi ekle | `client/src/types.ts` | 15dk |
| 2 | Template kartlarına model zinciri tooltip ekle | `client/src/components/ProjectForm.tsx` | 1 saat |
| 3 | Fallback bildirim bileşeni ekle | `client/src/components/StudioPanel.tsx` | 1 saat |
| 4 | GPU Monitor paneli ekle (admin) | `client/src/components/GpuMonitor.tsx` | 2 saat |
| 5 | Manuel model seçici dropdown | `client/src/components/ProjectForm.tsx` | 1 saat |
| 6 | Kalite/süre/skor kartları | `client/src/components/ProjectForm.tsx` | 1 saat |
| 7 | Backend `/api/v1/template-models` | `src/routes/jobs.ts` | 30dk |
| 8 | Backend `/api/v1/admin/gpu-status` | `src/routes/admin.ts` | 30dk |
| 9 | Backend `/api/v1/jobs/check-model` | `src/routes/jobs.ts` | 15dk |
| | **Toplam** | | **~7.5 saat** |

---

## Bölüm 9: Avantajlar ve Riskler

### Avantajlar

| Konu | Detay |
|------|-------|
| **GPU ücretsiz** | T4 için ayda ~$350 tasarruf |
| **Model izolasyonu** | Bir model OOM verse diğerini etkilemez |
| **GCP hazırlık** | Worker kodları, Dockerfile'lar, GCS entegrasyonu hazır |
| **Dual backend** | `WORKER_MODE=colab|gcp` arası tek env var |
| **Node.js GCP'de** | CPU işleri profesyonel altyapıda, Playwright stabil |

### Riskler

| Risk | Çözüm |
|------|-------|
| Colab 12 saat reset | Supervisor script otomatik yeniden başlatır |
| Docker-in-Docker performans | Test edilmeli. Alternatif: Colab'da process-based worker |
| Tek GPU, 4 container | GPU zaman paylaşımı. Aynı anda sadece 1 GPU worker çalışır |
| Ngrok 20 conn/dk limit | Cloudflare Tunnel alternatifi. Veya Colab'da direkt port forwarding |
| GCS egress ücreti | Worker yüklemesi ücretsiz (same region), Node.js indirmesi ücretli |

---

## Bölüm 10: Uygulama Sırası

| # | İş | Süre |
|---|----|:----:|
| 1 | Worker Dockerfile'ları yaz (video/audio/lipsync/vision) | 1 gün |
| 2 | Worker Python kodlarını yaz (Flask + endpoint'ler) | 2 gün |
| 3 | Docker image build + push | 1 gün |
| 4 | `colab_docker_setup.py` yaz | 1 gün |
| 5 | `src/lib/gcs.ts` yaz | 1 saat |
| 6 | `src/services/orchestrator.ts` yaz (dual backend) | 1 gün |
| 7 | `queue.ts`'de Colab çağrılarını değiştir | 1 gün |
| 8 | GCP Cloud Run + GCS + Service Account kur | 1 gün |
| 9 | Node.js deploy + test | 1 gün |
| **Toplam** | | **~9 gün** |
