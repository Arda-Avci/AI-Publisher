# Modal.com Araştırma Dokümanı

## JS/TS SDK (`npm install modal` v0.8.1)

**Node 22+ gerekli.** Özel HTTP bridge gerekmez — Node.js'den doğrudan Modal function çağrısı.

### Auth
```env
MODAL_TOKEN_ID=ak-xxx
MODAL_TOKEN_SECRET=as-xxx
```
JS SDK bu env'leri otomatik okur. Bizim `src/env.ts`'de `MODAL_TOKEN_ID` + `MODAL_TOKEN_SECRET` getter'ları yeterli.

### Temel Kullanım

```typescript
import { ModalClient } from "modal";

const modal = new ModalClient();

// Function lookup
const fn = await modal.functions.fromName("app-name", "function-name");

// 1) SYNC call — bekle, sonucu al
const result = await fn.remote(["arg1", "arg2"], { kwarg: "val" });

// 2) ASYNC spawn — hemen dön, FunctionCall ile takip et
const fc = await fn.spawn(["arg1"], { kwarg: "val" });
const callId = fc.objectId; // DB'ye kaydet

// 3) Poll — sonucu kontrol et
const result = await fc.get({ timeout: 0 }); // throw TimeoutError if not ready

// 4) Block — sonucu bekle (timeout yok)
const result = await fc.get();

// 5) Resume — daha önce spawn edilmiş çağrıyı ID'den bul
import { FunctionCall } from "modal";
const fc2 = FunctionCall.fromId("fc-xxx");
const result = await fc2.get();

// 6) Cancel — durdur
await fc.cancel({ terminateContainers: true });
```

### Sandbox (izole container yönetimi)

```typescript
const image = modal.images.fromRegistry("python:3.13-slim");
const sb = await modal.sandboxes.create(app, image, {
  gpu: "A100",
  timeout: 3600,
  volumes: { "/vol/models": volume },
  secrets: [b2Secret],
});

// Komut çalıştır
const p = await sb.exec(["python", "train.py"], { timeout: 300 });
console.log(await p.stdout.readText());

// Durum kontrol
const exitCode = await sb.poll(); // null = running

// Durdur
await sb.terminate();
await sb.detach();
```

### Volume

```typescript
const volume = modal.volumes.fromName("ai-video-weights");
// Function'a mount:
await fn.remote(args, { volumes: { "/vol/models": volume } });
```

---

## FunctionCall Lifecycle

```
Node.js                          Modal Cloud
  │                                 │
  ├─ fn.spawn(args) ────────────────→ FunctionCall oluşur
  │   ← { objectId: "fc-xxx" }      │ container başlar (cold start)
  │                                 │ model weights Volume'den yüklenir
  │                                 │ inference çalışır
  ├─ fc.get(timeout=0) ────────────→ poll
  │   ← TimeoutError (running)      │
  │   ...                           │
  ├─ fc.get(timeout=0) ────────────→ poll
  │   ← result (completed)          │
  │                                 │
  ├─ fc.cancel() ──────────────────→ container terminate
```

---

## 3 Servis Mimarisi (JS SDK ile)

### Görsel GPU Servisi
- **Python**: `modal_apps/image_service.py`
- **JS SDK call**:
```typescript
const imageFn = await modal.functions.fromName("ai-publisher", "generate_image");
const fc = await imageFn.spawn([], { prompt, b2_credentials });
// fc.objectId → DB'ye kaydet
```

### Video GPU Servisi
- **Python**: `modal_apps/video_service.py`
- **JS SDK call**:
```typescript
const videoFn = await modal.functions.fromName("ai-publisher", "generate_video");
const fc = await videoFn.spawn([], { prompt, b2_credentials, scene_number });
```

### Ses CPU Servisi
- **Python**: `modal_apps/audio_service.py`
- **JS SDK call**:
```typescript
const audioFn = await modal.functions.fromName("ai-publisher", "generate_audio");
const fc = await audioFn.spawn([], { text, voice_id, b2_credentials });
```

---

## Progress Tracking (SSE)

Mevcut SSE sistemi korunacak:
1. Scene render start: SSE `{ stage: "rendering", scene: 1, total: 10 }`
2. Modal `fc.get()` resolves → output URL B2'ye yazıldı
3. DB update → SSE broadcast
4. Her scene için tekrar

> Modal'dan progress callback almak için 2 seçenek:
> - **Polling** (önerilen): Node.js'de `fc.get(timeout=0)` ile 5sn aralıklarla poll
> - **Webhook**: Modal function bittiğinde Node.js callback URL'ine HTTP POST

---

## Cancel / Terminate

```typescript
// Kullanıcı iptal ettiğinde
await fc.cancel({ terminateContainers: true });
// → Container force terminate
// → GPU billing durur
// → DB status = "cancelled"
```

---

## Örnek: queue.ts'de Modal Kullanımı

```typescript
// Mevcut RunPodClient.runJob() yerine:
import { ModalClient, FunctionCall } from "modal";

const modal = new ModalClient();

async function renderScene(job: VideoJob, scene: Scene) {
  const fn = await modal.functions.fromName("ai-publisher", "generate_video");
  const fc = await fn.spawn([], {
    prompt: scene.prompt,
    b2_credentials: getB2Credentials(),
    scene_number: scene.scene_number,
    job_id: job.id,
    callback_url: `${PUBLIC_URL}/api/webhook/modal?token=${CALLBACK_TOKEN}`,
  });

  // objectId'yi DB'ye kaydet (poll/resume için)
  await db.run("UPDATE video_scenes SET modal_call_id = ?", [fc.objectId]);

  // Poll loop (mevcut mantık)
  return pollForCompletion(fc.objectId);
}

async function pollForCompletion(callId: string) {
  const deadline = Date.now() + 12 * 60 * 1000; // 12dk timeout
  while (Date.now() < deadline) {
    try {
      const fc = FunctionCall.fromId(callId);
      const result = await fc.get({ timeout: 0 });
      return result; // completed
    } catch (e) {
      if (e instanceof TimeoutError) {
        await sleep(5000);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Scene render timeout");
}
```

---

## Maliyet (Güncel, Haziran 2026)

| GPU | Base Rate | Preemptible | En Uygun |
|-----|-----------|-------------|----------|
| A10 24GB | $1.10/hr | ~$0.55/hr | Görsel (SD/FLUX) |
| L40S 48GB | $1.95/hr | ~$0.98/hr | Görsel (büyük) |
| A100 80GB | $2.50/hr | ~$1.25/hr | Video (Wan/Cog) |
| H100 80GB | $3.95/hr | ~$1.98/hr | Video (hızlı) |
| CPU | $0.047/core-hr | — | Ses/efekt |

keep_warm=0 → sadece aktif render süresi kadar ödeme.
5dk video render = H100 ~$0.33 (preemptible ~$0.16).

---

## Volume Detayları

| Özellik | Değer |
|---------|-------|
| Create | `modal.Volume.fromName("name", {createIfMissing: true})` |
| Upload | `modal volume put name local/path remote/path` |
| Mount | `{ "/vol/models": volume }` — read-only desteği var |
| Bandwidth | 2.5 GB/s |
| Snapshot | Günlük otomatik, per-GB-month ücretlendirme |
| Commit | `volume.commit()` — değişiklikleri kalıcı yap |
| Reload | `volume.reload()` — güncel halini oku |

---

## Secret Yönetimi

Modal Secrets → env olarak container'a enjekte edilir:
```typescript
const b2Secret = modal.secrets.fromName("b2-credentials");
// Container'da process.env.B2_KEY_ID, process.env.B2_KEY olarak kullanılabilir
```

---

## Sonuç: RunPod → Modal Farkları

| Özellik | RunPod | Modal (JS SDK) |
|---------|--------|----------------|
| Auth | API Key (header) | MODAL_TOKEN_ID + MODAL_TOKEN_SECRET |
| Sync call | REST POST /run | `fn.remote(args)` |
| Async call | POST + webhook | `fn.spawn(args)` → `fc.objectId` |
| Poll | DB poll 5sn | `fc.get(timeout=0)` |
| Cancel | Yok (timeout) | `fc.cancel(terminateContainers=true)` |
| Progress | Webhook callback | Poll + opsiyonel webhook |
| Weights | Docker image içinde | Volume mount |
| Cold start | 10-30sn | 2-5sn |
| keep_warm | Yok | Scale-to-zero (varsayılan) |
| GPU types | Sınırlı | 30+ GPU |
| Dockerfile | Zorunlu | Python SDK yeterli |
