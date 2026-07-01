"""
Modal App: Audio & Face Processing (GPU + CPU)
GPU models: Wav2Lip, SadTalker, MuseTalk, GeneFace, Video-Retalking, AudioLDM2, Browser-Use
CPU models: Kokoro TTS, F5-TTS, XTTS, Whisper
Volume: ai-publisher-weights at /vol/weights
"""
import modal
import os
import sys
from pathlib import Path
from fastapi import Request, HTTPException

from . import check_auth

app = modal.App("ai-publisher-audio")
VOLUME_PATH = Path("/vol/weights")

sec_ghcr = modal.Secret.from_name("ghcr-secret")
sec_hf = modal.Secret.from_name("hf-token")
sec_b2 = modal.Secret.from_name("b2-credentials")
sec_auth = modal.Secret.from_name("modal-auth-token")
ALL_SECRETS = [sec_ghcr, sec_hf, sec_b2, sec_auth]

REPO = "ghcr.io/arda-avci"

GPU_IMAGES = {
    "wav2lip":       modal.Image.from_registry(f"{REPO}/wav2lip:latest", secret=sec_ghcr),
    "sadtalker":     modal.Image.from_registry(f"{REPO}/sadtalker:latest", secret=sec_ghcr),
    "musetalk":      modal.Image.from_registry(f"{REPO}/musetalk:latest", secret=sec_ghcr),
    "geneface":      modal.Image.from_registry(f"{REPO}/geneface:latest", secret=sec_ghcr),
    "videoretalking": modal.Image.from_registry(f"{REPO}/video-retalking:latest", secret=sec_ghcr),
    "audioldm2":     modal.Image.from_registry(f"{REPO}/audioldm2:latest", secret=sec_ghcr),
    "browseruse":    modal.Image.from_registry(f"{REPO}/browser-use:latest", secret=sec_ghcr),
}

CPU_IMAGES = {
    "kokoro":  modal.Image.from_registry(f"{REPO}/kokorotts:latest", secret=sec_ghcr),
    "f5tts":   modal.Image.from_registry(f"{REPO}/f5tts:latest", secret=sec_ghcr),
    "xtts":    modal.Image.from_registry(f"{REPO}/xtts:latest", secret=sec_ghcr),
    "whisper": modal.Image.from_registry(f"{REPO}/whisper:latest", secret=sec_ghcr),
}

models_volume = modal.Volume.from_name("ai-publisher-weights")

GPU_CONFIG = {
    "wav2lip": "A10", "sadtalker": "A10", "musetalk": "A10",
    "geneface": "A10", "videoretalking": "A10", "audioldm2": "A10", "browseruse": "A10",
}

MODEL_WEIGHT_DIRS = {
    "wav2lip": "Rudrabha/Wav2Lip",
    "sadtalker": "vinthony/SadTalker",
    "musetalk": "TMElyralab/MuseTalk",
    "geneface": "geneface/geneface",
    "videoretalking": "OpenTalker/video-retalking",
    "audioldm2": "cvssp/audioldm2",
    "kokoro": "hexgrad/Kokoro-82M",
    "f5tts": "f5tts/F5-TTS",
    "xtts": "coqui/XTTS-v2",
    "whisper": "openai/whisper-small",
}


def _ensure_weights(model_name: str) -> Path:
    hf_repo = MODEL_WEIGHT_DIRS.get(model_name)
    if not hf_repo:
        return VOLUME_PATH

    model_dir = VOLUME_PATH / "audio" / hf_repo.replace("/", "_")
    snapshot_file = model_dir / ".snapshot_done"

    if snapshot_file.exists():
        return model_dir

    import huggingface_hub

    print(f"[{model_name}] Weights not in Volume. Downloading from HF: {hf_repo}")
    model_dir.mkdir(parents=True, exist_ok=True)
    huggingface_hub.snapshot_download(repo_id=hf_repo, local_dir=str(model_dir), token=None, max_workers=8)
    snapshot_file.touch()
    models_volume.commit()
    print(f"[{model_name}] Weights committed to Volume.")
    return model_dir


def _run_generate(model_name: str, text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    try:
        _ensure_weights(model_name)
    except Exception as e:
        return {"status": "error", "error": f"Weight load failed: {e}", "model": model_name}

    os.environ["HF_HOME"] = str(VOLUME_PATH / "hf_cache")
    os.environ["B2_KEY_ID"] = b2_key_id
    os.environ["B2_APPLICATION_KEY"] = b2_key

    sys.path.insert(0, "/app")
    try:
        import app as model_app
    except ImportError:
        return {"status": "error", "error": "app.py not found in image", "model": model_name}

    if not hasattr(model_app, "generate"):
        return {"status": "error", "error": "app.py has no generate() function", "model": model_name}

    args = kwargs.copy()
    args["text"] = text
    result = model_app.generate(**args)
    return {"status": "completed", "result": result, "model": model_name}


# GPU model functions — explicit global scope
@app.function(name="wav2lip", image=GPU_IMAGES["wav2lip"], gpu="A10",
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=600, min_containers=0)
def wav2lip_fn(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("wav2lip", text, b2_key_id, b2_key, **kwargs)

@app.function(name="sadtalker", image=GPU_IMAGES["sadtalker"], gpu="A10",
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=600, min_containers=0)
def sadtalker_fn(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("sadtalker", text, b2_key_id, b2_key, **kwargs)

@app.function(name="musetalk", image=GPU_IMAGES["musetalk"], gpu="A10",
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=600, min_containers=0)
def musetalk_fn(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("musetalk", text, b2_key_id, b2_key, **kwargs)

@app.function(name="geneface", image=GPU_IMAGES["geneface"], gpu="A10",
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=600, min_containers=0)
def geneface_fn(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("geneface", text, b2_key_id, b2_key, **kwargs)

@app.function(name="videoretalking", image=GPU_IMAGES["videoretalking"], gpu="A10",
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=600, min_containers=0)
def videoretalking_fn(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("videoretalking", text, b2_key_id, b2_key, **kwargs)

@app.function(name="audioldm2", image=GPU_IMAGES["audioldm2"], gpu="A10",
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=600, min_containers=0)
def audioldm2_fn(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("audioldm2", text, b2_key_id, b2_key, **kwargs)

@app.function(name="browseruse", image=GPU_IMAGES["browseruse"], gpu="A10",
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=600, min_containers=0)
def browseruse_fn(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("browseruse", text, b2_key_id, b2_key, **kwargs)

@app.function(name="kokoro", image=CPU_IMAGES["kokoro"],
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=300, min_containers=0)
def kokoro_fn(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("kokoro", text, b2_key_id, b2_key, **kwargs)

@app.function(name="f5tts", image=CPU_IMAGES["f5tts"],
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=300, min_containers=0)
def f5tts_fn(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("f5tts", text, b2_key_id, b2_key, **kwargs)

@app.function(name="xtts", image=CPU_IMAGES["xtts"],
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=300, min_containers=0)
def xtts_fn(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("xtts", text, b2_key_id, b2_key, **kwargs)

@app.function(name="whisper", image=CPU_IMAGES["whisper"],
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=300, min_containers=0)
def whisper_fn(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("whisper", text, b2_key_id, b2_key, **kwargs)


FN_MAP = {
    "wav2lip": wav2lip_fn, "sadtalker": sadtalker_fn,
    "musetalk": musetalk_fn, "geneface": geneface_fn,
    "videoretalking": videoretalking_fn, "audioldm2": audioldm2_fn,
    "browseruse": browseruse_fn,
    "kokoro": kokoro_fn, "f5tts": f5tts_fn,
    "xtts": xtts_fn, "whisper": whisper_fn,
}


@modal.fastapi_endpoint(method="POST")
def api_generate(request: Request):
    auth_err = check_auth(request.headers.get("Authorization", ""))
    if auth_err:
        raise HTTPException(status_code=401, detail=auth_err)

    body = request.json()
    model = body.get("model", "")
    fn = FN_MAP.get(model)
    if not fn:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model}")

    payload = {k: v for k, v in body.items() if k != "model"}
    result = fn.remote(**payload)
    return result
