# RunPod Deployment Planı v2 - AI Publisher

## Mimari (3 Katman)

```
┌─────────────────────────────────────────────────────┐
│  BEYİN (Host - Lokal PC / VPS)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ React UI │ │PostgreSQL│ │  Redis   │            │
│  │(Timeline)│ │          │ │(Memorai) │            │
│  └────┬─────┘ └──────────┘ └──────────┘            │
│       │                                             │
│  ┌────▼─────┐                                       │
│  │ Node.js  │  → Gemini API (senaryo/storyboard)    │
│  │ Server   │  → Kuyruk yönetimi                    │
│  └──────────┘  → EDL JSON üretir, RunPod'a yollar   │
│  7/24 açık, ağır render YAPMAZ                      │
└─────────────────────────────────────────────────────┘
         │ HTTP (EDL JSON)
         ▼
┌─────────────────────────────────────────────────────┐
│  KAS (İşçi - RunPod RTX 3090 Community)             │
│  ┌──────────────────────────────────────────────┐   │
│  │  Tek Docker Konteyner                        │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐   │   │
│  │  │Video │ │ TTS  │ │ SFX  │ │FFmpeg    │   │   │
│  │  │Models│ │      │ │      │ │Mix/Trim  │   │   │
│  │  └──────┘ └──────┘ └──────┘ │Subtitle  │   │   │
│  │                             │Burn-in   │   │   │
│  │                             └──────────┘   │   │
│  └──────────────────────────────────────────────┘   │
│  - İş gelince uyanır, sıra boşalınca kapanır        │
│  - Lazy load + CPU offload + job sonu RAM unload   │
│  - Network volume'da (/runpod-volume) model cache    │
└─────────────────────────────────────────────────────┘
         │ Final video upload
         ▼
┌─────────────────────────────────────────────────────┐
│  DEPO (Backblaze B2 + Cloudflare)                   │
│  ┌────────────────┐ ┌──────────────────┐           │
│  │ Docker imajları │ │  Final videolar  │           │
│  │ (model .tar.gz) │ │  (CDN'den serve) │           │
│  └────────────────┘ └──────────────────┘           │
│  ~$0.006/GB/ay + Cloudflare eğer ücretsiz          │
└─────────────────────────────────────────────────────┘
```

## Maliyet

| Katman | Bileşen | Aylık Maliyet |
|--------|---------|--------------|
| **Beyin** | Lokal PC / VPS | ~$0-10 |
| **Kas** | RunPod RTX 3090 Community (4saat/gün) | ~$25 |
| **Kas** | Network Volume 100 GB | ~$7 |
| **Depo** | B2 Docker imajları ~50GB | ~$0.30 |
| **Depo** | B2 Videolar + egress | ~$1-5 |
| **Toplam** | | **~$33-47/ay** |

## Adım Adım

### 1. B2'ye Docker İmajlarını Yükle
- Backblaze B2 bucket aç (`ai-publisher-models`)
- 16 .tar.gz imajını B2'ye yükle (veya s5cmd ile paralel)
- RunPod startup script'inde `s5cmd sync` + `docker load`

> **Neden B2?** Google Drive: rate limit, yavaş, kotası belli değil.  
> B2: $0.006/GB/ay, sınırsız bant, s5cmd ile 10Gbps download.

### 2. RunPod Pod Oluştur
- GPU: RTX 3090 Community ($0.21/hr)
- Container Disk: 200 GB
- Port aç: 5000 (Flask API)
- Network Volume: 100 GB, mount `/runpod-volume`
- Image: `pytorch/pytorch:2.2.1-cuda12.1-cudnn8-runtime` (base)
- Startup script: imajları B2'den çek + docker load + docker compose up

### 3. Tek Konteyner, Lazy Load
- Docker Compose ile 16 servis çalışır (port 5001-5016)
- Her servis Flask, model lazy load
- **Unload zinciri**: İşleyen model GPU VRAM'den CPU RAM'e taşınır (`torch.cuda.empty_cache()`). İş tamamen bitince model CPU RAM'den de silinir (`del model; gc.collect()`) — sistem RAM'inde gereksiz model ağırlığı kalmaz
- Sıra boşalınca pod kapanır (idle timeout)

### 4. Video Editör (EDL) Çalışma Akışı
```
Kullanıcı Timeline'da düzenler → "Export" butonu
  → Frontend Scene[] → EDL JSON üretir
  → Node.js'e POST
  → Node.js Gemini'den eksik promptları tamamlar
  → EDL JSON'u RunPod API'sine gönder
  → RunPod FFmpeg ile trim + concat + subtitle + audio mix
  → Final video B2'ye yüklenir
  → Node.js'e callback: "video B2'de hazır"
```

### 5. EDL JSON Yapısı
```json
{
  "project_id": "job_123",
  "format": "edl_v1",
  "audio_track": "b2://bucket/audio/bg.mp3",
  "audio_volume": 0.4,
  "timeline": [
    {
      "scene_id": 1,
      "video_url": "b2://bucket/raw/scene_1.mp4",
      "trim_start": 0.0,
      "trim_end": 4.5,
      "subtitle": "Metin burada",
      "subtitle_position": "bottom",
      "subtitle_color": "#FFD700"
    }
  ]
}
```

### 6. B2 Yapısı
```
ai-publisher-bucket/
├── docker/                    # Docker imajları (.tar.gz)
│   ├── base.tar.gz
│   ├── cogvideox.tar.gz
│   ├── xtts.tar.gz
│   └── ...
├── raw/                       # Ham sahne videoları (geçici)
│   ├── job_123_scene_1.mp4
│   └── ...
├── final/                     # Nihai videolar (CDN)
│   ├── job_123_final.mp4
│   └── ...
└── auth/                      # Social media session cookies (encrypted)
    ├── youtube.json.enc
    ├── tiktok.json.enc
    └── ...
```
