"""
Modal App: Video Generation (GPU)
Models: Wan 2.1, Wan 2.5, CogVideoX, Hunyuan, LTX, Mochi,
        AnimateDiff, DynamiCrafter, Pyramid-Flow, SVD, VideoCrafter, ZeroScope
GPU: H100 or A100
Volume: ai-publisher-weights at /vol/weights
"""
import modal
import os
import sys
import json
from pathlib import Path
from fastapi import Request, HTTPException

from . import check_auth

app = modal.App("ai-publisher-video")
VOLUME_PATH = Path("/vol/weights")

# --- Secrets ---
sec_ghcr = modal.Secret.from_name("ghcr-secret")
sec_hf = modal.Secret.from_name("hf-token")
sec_b2 = modal.Secret.from_name("b2-credentials")
sec_auth = modal.Secret.from_name("modal-auth-token")
ALl_SECRETS = [sec_ghcr, sec_hf, sec_b2, sec_auth]

# --- GHCR Image References (runtime only, no weights) ---
IMAGES = {
    "wan":         modal.Image.from_registry("ghcr.io/arda-avci/wan:latest",         secret=sec_ghcr),
    "wan25":       modal.Image.from_registry("ghcr.io/arda-avci/wan25:latest",       secret=sec_ghcr),
    "cogvideox":   modal.Image.from_registry("ghcr.io/arda-avci/cogvideox:latest",   secret=sec_ghcr),
    "hunyuan":     modal.Image.from_registry("ghcr.io/arda-avci/hunyuan:latest",     secret=sec_ghcr),
    "ltx":         modal.Image.from_registry("ghcr.io/arda-avci/ltx:latest",         secret=sec_ghcr),
    "mochi":       modal.Image.from_registry("ghcr.io/arda-avci/mochi:latest",       secret=sec_ghcr),
    "animatediff": modal.Image.from_registry("ghcr.io/arda-avci/animatediff:latest", secret=sec_ghcr),
    "dynamicrafter": modal.Image.from_registry("ghcr.io/arda-avci/dynamicrafter:latest", secret=sec_ghcr),
    "pyramidflow": modal.Image.from_registry("ghcr.io/arda-avci/pyramid-flow:latest", secret=sec_ghcr),
    "svd":        modal.Image.from_registry("ghcr.io/arda-avci/svd:latest",          secret=sec_ghcr),
    "videocrafter": modal.Image.from_registry("ghcr.io/arda-avci/videocrafter:latest", secret=sec_ghcr),
    "zeroscope":  modal.Image.from_registry("ghcr.io/arda-avci/zeroscope:latest",    secret=sec_ghcr),
}

# --- Volume ---
models_volume = modal.Volume.from_name("ai-publisher-weights")

# --- GPU Config ---
GPU_CONFIG = {
    "wan": "H100", "wan25": "H100", "cogvideox": "A100",
    "hunyuan": "A100", "ltx": "A100", "mochi": "A100",
    "animatediff": "A10", "dynamicrafter": "A10",
    "pyramidflow": "A100", "svd": "A10",
    "videocrafter": "A10", "zeroscope": "A10",
}

MODEL_WEIGHT_DIRS = {
    "wan": "Wan-AI/Wan2.1-T2V-1.3B-Diffusers",
    "wan25": "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers",
    "cogvideox": "THUDM/CogVideoX-5b",
    "hunyuan": "hunyuanvideo-community/HunyuanVideo",
    "ltx": "Lightricks/LTX-Video",
    "mochi": "genmo/mochi-1-preview",
    "animatediff": "guoyww/animatediff-motion-adapter-v1-5-2",
    "dynamicrafter": "DynamiCrafter/dynamicrafter_512_interp_512",
    "pyramidflow": "pyramid-flow/pyramid-flow",
    "svd": "stabilityai/stable-video-diffusion-img2vid-xt",
    "videocrafter": "videocrafter/videocrafter2",
    "zeroscope": "cerspense/zeroscope_v2_576w",
}


def _ensure_weights(model_name: str) -> Path:
    """Check Volume for model weights; download from HF if missing."""
    hf_repo = MODEL_WEIGHT_DIRS[model_name]
    model_dir = VOLUME_PATH / "video" / hf_repo
    snapshot_file = model_dir / ".snapshot_done"

    if snapshot_file.exists():
        return model_dir

    import huggingface_hub
    from . import HF_TOKEN

    print(f"[{model_name}] Weights not in Volume. Downloading from HF: {hf_repo}")
    model_dir.mkdir(parents=True, exist_ok=True)

    huggingface_hub.snapshot_download(
        repo_id=hf_repo,
        local_dir=str(model_dir),
        token=HF_TOKEN or None,
        max_workers=8,
    )
    snapshot_file.touch()
    models_volume.commit()
    print(f"[{model_name}] Weights downloaded and committed to Volume.")
    return model_dir


def _run_generate(model_name: str, prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    try:
        _ensure_weights(model_name)
    except Exception as e:
        return {"status": "error", "error": f"Weight load failed: {e}", "model": model_name}

    os.environ["HF_HOME"] = str(VOLUME_PATH / "hf_cache")
    os.environ["TORCH_HOME"] = str(VOLUME_PATH / "torch_cache")
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
    args["prompt"] = prompt
    result = model_app.generate(**args)
    return {"status": "completed", "result": result, "model": model_name}


@app.function(name="wan", image=IMAGES["wan"], gpu=GPU_CONFIG.get("wan", "A100"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_wan(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("wan", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="wan25", image=IMAGES["wan25"], gpu=GPU_CONFIG.get("wan25", "A100"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_wan25(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("wan25", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="cogvideox", image=IMAGES["cogvideox"], gpu=GPU_CONFIG.get("cogvideox", "A100"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_cogvideox(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("cogvideox", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="hunyuan", image=IMAGES["hunyuan"], gpu=GPU_CONFIG.get("hunyuan", "A100"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_hunyuan(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("hunyuan", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="ltx", image=IMAGES["ltx"], gpu=GPU_CONFIG.get("ltx", "A100"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_ltx(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("ltx", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="mochi", image=IMAGES["mochi"], gpu=GPU_CONFIG.get("mochi", "A100"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_mochi(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("mochi", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="animatediff", image=IMAGES["animatediff"], gpu=GPU_CONFIG.get("animatediff", "A10"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_animatediff(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("animatediff", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="dynamicrafter", image=IMAGES["dynamicrafter"], gpu=GPU_CONFIG.get("dynamicrafter", "A10"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_dynamicrafter(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("dynamicrafter", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="pyramidflow", image=IMAGES["pyramidflow"], gpu=GPU_CONFIG.get("pyramidflow", "A100"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_pyramidflow(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("pyramidflow", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="svd", image=IMAGES["svd"], gpu=GPU_CONFIG.get("svd", "A10"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_svd(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("svd", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="videocrafter", image=IMAGES["videocrafter"], gpu=GPU_CONFIG.get("videocrafter", "A10"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_videocrafter(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("videocrafter", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="zeroscope", image=IMAGES["zeroscope"], gpu=GPU_CONFIG.get("zeroscope", "A10"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALl_SECRETS, timeout=900, min_containers=0)
def generate_zeroscope(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("zeroscope", prompt, b2_key_id, b2_key, **kwargs)


@modal.fastapi_endpoint(method="POST")
def api_generate(request: Request):
    auth_err = check_auth(request.headers.get("Authorization", ""))
    if auth_err:
        raise HTTPException(status_code=401, detail=auth_err)

    body = request.json()
    model = body.get("model", "")
    if model not in IMAGES:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model}")

    prompt = body.get("prompt", "")
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt missing")

    fn_map = {
        "wan": generate_wan, "wan25": generate_wan25,
        "cogvideox": generate_cogvideox, "hunyuan": generate_hunyuan,
        "ltx": generate_ltx, "mochi": generate_mochi,
        "animatediff": generate_animatediff, "dynamicrafter": generate_dynamicrafter,
        "pyramidflow": generate_pyramidflow, "svd": generate_svd,
        "videocrafter": generate_videocrafter, "zeroscope": generate_zeroscope,
    }

    result = fn_map[model].remote(
        prompt=prompt,
        b2_key_id=body.get("b2_key_id", ""),
        b2_key=body.get("b2_key", ""),
    )
    return {"status": "success", "result": result}
