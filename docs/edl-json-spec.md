# EDL JSON Specification — AI Publisher RunPod Integration

## Overview

EDL (Edit Decision List) JSON is the contract between Node.js orchestrator and RunPod GPU worker. When a user triggers "Export" from the Timeline, the frontend generates a Scene array, Node.js enriches it with AI prompts, and sends this EDL JSON to RunPod for final assembly.

## Flow

```
Timeline (React) → Scene[] → Node.js POST /api/v1/edl/submit
  → Node.js enriches prompts via Gemini
  → Sends EDL JSON to RunPod /api/v1/render
  → RunPod processes (trim + concat + subtitle + audio mix)
  → Uploads final video to B2
  → POST callback to Node.js /api/v1/callback/b2
```

## EDL JSON Schema

```json
{
  "project_id": "job_123",
  "format": "edl_v1",
  "audio_track": {
    "url": "b2://bucket/audio/bg.mp3",
    "volume": 0.4,
    "fade_in": 0.5,
    "fade_out": 2.0
  },
  "timeline": [
    {
      "scene_id": 1,
      "video_url": "b2://bucket/raw/scene_1.mp4",
      "trim_start": 0.0,
      "trim_end": 4.5,
      "subtitle": {
        "text": "Bugün çok özel bir konuğumuz var",
        "position": "bottom",
        "color": "#FFD700",
        "font_size": 28,
        "style": "kinetic"
      },
      "transition": {
        "type": "crossfade",
        "duration": 0.5
      }
    }
  ],
  "output": {
    "bucket": "ai-publisher-videos",
    "key": "final/job_123.mp4",
    "format": "mp4",
    "resolution": "1080x1920",
    "fps": 30
  },
  "callback": {
    "url": "https://node-server:4000/api/v1/callback/b2",
    "token": "wh_psk_secret"
  }
}
```

## B2 Key Convention

| Prefix | Purpose | TTL |
|--------|---------|-----|
| `raw/job_{id}/` | Scene videos (temporary) | 24h auto-delete |
| `final/job_{id}.mp4` | Final output (permanent) | — |
| `docker/` | Docker image archives | — |
| `auth/` | Encrypted session cookies | — |

## Endpoints

### POST /api/v1/edl/submit
Submit EDL job to RunPod worker.

**Request:**
```json
{
  "jobId": 123,
  "scenes": [...],
  "bgMusicUrl": "b2://...",
  "settings": {
    "subtitleStyle": "kinetic",
    "resolution": "1080x1920"
  }
}
```

**Response:**
```json
{
  "success": true,
  "runpodTaskId": "rp_task_abc123",
  "estimatedSeconds": 45
}
```

### POST /api/v1/callback/b2
Called by RunPod worker when video is ready.

**Request:**
```json
{
  "jobId": 123,
  "status": "completed",
  "outputPath": "b2://bucket/final/job_123.mp4",
  "duration": 30.5,
  "fileSize": 15728640
}
```

**Response:** `200 OK`
