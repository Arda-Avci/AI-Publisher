import asyncio
import json
import os
import sys
import logging
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("pipecat-server")

app = FastAPI(title="Pipecat Bridge Server")

active_pipelines: dict[str, dict] = {}
connected_clients: dict[str, WebSocket] = {}


class PipelineRequest(BaseModel):
    pipeline_id: str
    scenes: list[dict]
    avatar_provider: str = "heygen"
    avatar_id: Optional[str] = None
    voice_id: Optional[str] = None
    language: str = "tr"
    tts_provider: str = "xtts"
    callback_url: Optional[str] = None


class BroadcastMessage(BaseModel):
    pipeline_id: str
    message: str
    role: str = "system"
    metadata: Optional[dict] = None


def get_env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


@app.get("/health")
async def health():
    return {
        "status": "running",
        "active_pipelines": len(active_pipelines),
        "connected_clients": len(connected_clients),
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client_id = f"client_{id(websocket)}"
    connected_clients[client_id] = websocket
    logger.info(f"WebSocket client connected: {client_id}")

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            action = msg.get("action", "")

            if action == "ping":
                await websocket.send_json({"action": "pong"})

            elif action == "pipeline_status":
                pipeline_id = msg.get("pipeline_id")
                if pipeline_id in active_pipelines:
                    await websocket.send_json({
                        "action": "pipeline_status",
                        "pipeline_id": pipeline_id,
                        **active_pipelines[pipeline_id],
                    })
                else:
                    await websocket.send_json({
                        "action": "pipeline_status",
                        "pipeline_id": pipeline_id,
                        "status": "not_found",
                    })

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error [{client_id}]: {e}")
    finally:
        connected_clients.pop(client_id, None)


async def broadcast_to_clients(message: dict):
    disconnected = []
    for cid, ws in connected_clients.items():
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.append(cid)
    for cid in disconnected:
        connected_clients.pop(cid, None)


async def simulate_pipeline(pipeline_id: str, request: PipelineRequest):
    total_scenes = len(request.scenes)
    logger.info(f"Pipeline [{pipeline_id}] started with {total_scenes} scenes")

    active_pipelines[pipeline_id] = {
        "status": "processing",
        "current_scene": 0,
        "total_scenes": total_scenes,
        "progress": 0,
        "message": "Initializing pipeline...",
        "avatar_provider": request.avatar_provider,
    }

    await broadcast_to_clients({
        "action": "pipeline_update",
        "pipeline_id": pipeline_id,
        **active_pipelines[pipeline_id],
    })

    for i, scene in enumerate(request.scenes):
        if active_pipelines.get(pipeline_id, {}).get("status") == "cancelled":
            logger.info(f"Pipeline [{pipeline_id}] cancelled")
            return

        scene_num = i + 1
        scene_text = scene.get("speech_text", "")

        logger.info(f"  Scene {scene_num}/{total_scenes}: {scene_text[:50]}...")
        active_pipelines[pipeline_id].update({
            "current_scene": scene_num,
            "message": f"Processing scene {scene_num}/{total_scenes}...",
            "progress": int((scene_num - 1) / total_scenes * 100),
        })
        await broadcast_to_clients({
            "action": "pipeline_update",
            "pipeline_id": pipeline_id,
            **active_pipelines[pipeline_id],
        })

        await asyncio.sleep(0.5)

        if request.avatar_provider == "heygen":
            await simulate_heygen_avatar(pipeline_id, scene_text, scene_num, total_scenes)
        elif request.avatar_provider == "tavus":
            await simulate_tavus_avatar(pipeline_id, scene_text, scene_num, total_scenes)
        else:
            await asyncio.sleep(0.3)

        active_pipelines[pipeline_id].update({
            "progress": int(scene_num / total_scenes * 100),
        })
        await broadcast_to_clients({
            "action": "pipeline_update",
            "pipeline_id": pipeline_id,
            **active_pipelines[pipeline_id],
        })

    active_pipelines[pipeline_id].update({
        "status": "completed",
        "message": "All scenes processed",
        "progress": 100,
    })
    await broadcast_to_clients({
        "action": "pipeline_completed",
        "pipeline_id": pipeline_id,
        **active_pipelines[pipeline_id],
    })
    logger.info(f"Pipeline [{pipeline_id}] completed")


async def simulate_heygen_avatar(
    pipeline_id: str, text: str, scene_num: int, total_scenes: int
):
    api_key = get_env("HEYGEN_API_KEY")
    if not api_key:
        logger.warning(f"  [{pipeline_id}] HEYGEN_API_KEY not set, skipping avatar")
        return

    logger.info(f"  [{pipeline_id}] HeyGen avatar generating for scene {scene_num}")
    for step in range(3):
        await asyncio.sleep(0.5)
        sub_progress = int((scene_num - 1) / total_scenes * 100 + (step + 1) * 10 / total_scenes)
        active_pipelines[pipeline_id].update({
            "progress": min(sub_progress, 99),
            "message": f"Scene {scene_num}: HeyGen lip-sync {step * 33}%",
            "sub_stage": f"heygen_render_{step}",
        })
        await broadcast_to_clients({
            "action": "pipeline_update",
            "pipeline_id": pipeline_id,
            **active_pipelines[pipeline_id],
        })


async def simulate_tavus_avatar(
    pipeline_id: str, text: str, scene_num: int, total_scenes: int
):
    api_key = get_env("TAVUS_API_KEY")
    if not api_key:
        logger.warning(f"  [{pipeline_id}] TAVUS_API_KEY not set, skipping Tavus avatar")
        return

    logger.info(f"  [{pipeline_id}] Tavus avatar generating for scene {scene_num}")
    for step in range(2):
        await asyncio.sleep(0.5)
        sub_progress = int((scene_num - 1) / total_scenes * 100 + (step + 1) * 15 / total_scenes)
        active_pipelines[pipeline_id].update({
            "progress": min(sub_progress, 99),
            "message": f"Scene {scene_num}: Tavus rendering {step * 50}%",
            "sub_stage": f"tavus_render_{step}",
        })
        await broadcast_to_clients({
            "action": "pipeline_update",
            "pipeline_id": pipeline_id,
            **active_pipelines[pipeline_id],
        })


@app.post("/api/pipeline/start")
async def start_pipeline(request: PipelineRequest, background_tasks: BackgroundTasks):
    if request.pipeline_id in active_pipelines:
        raise HTTPException(
            status_code=409,
            detail=f"Pipeline '{request.pipeline_id}' already exists",
        )

    active_pipelines[request.pipeline_id] = {
        "status": "starting",
        "current_scene": 0,
        "total_scenes": len(request.scenes),
        "progress": 0,
        "message": "Queued...",
        "avatar_provider": request.avatar_provider,
    }

    background_tasks.add_task(simulate_pipeline, request.pipeline_id, request)

    return {
        "success": True,
        "pipeline_id": request.pipeline_id,
        "total_scenes": len(request.scenes),
        "status": "started",
    }


@app.post("/api/pipeline/cancel")
async def cancel_pipeline(data: dict):
    pipeline_id = data.get("pipeline_id")
    if pipeline_id not in active_pipelines:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    active_pipelines[pipeline_id]["status"] = "cancelled"
    await broadcast_to_clients({
        "action": "pipeline_cancelled",
        "pipeline_id": pipeline_id,
        "status": "cancelled",
    })
    return {"success": True, "pipeline_id": pipeline_id, "status": "cancelled"}


@app.get("/api/pipeline/{pipeline_id}")
async def get_pipeline(pipeline_id: str):
    pipeline = active_pipelines.get(pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return {"success": True, "pipeline_id": pipeline_id, **pipeline}


@app.get("/api/pipelines")
async def list_pipelines():
    return {
        "success": True,
        "pipelines": [
            {"pipeline_id": pid, **data}
            for pid, data in active_pipelines.items()
        ],
    }


if __name__ == "__main__":
    port = int(os.environ.get("PIPECAT_PORT", "8765"))
    logger.info(f"Starting Pipecat Bridge Server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
