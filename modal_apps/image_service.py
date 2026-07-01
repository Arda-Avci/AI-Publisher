"""
Modal App: Image Generation (GPU)
Models: Stable Diffusion, FLUX, SDXL, RealESRGAN, LoRA Trainer
GPU: A10 or L4
Volume: ai-publisher-weights at /vol/weights
"""
import modal
import os
import sys
from pathlib import Path

from . import check_auth

app = modal.App("ai-publisher-image")
VOLUME_PATH = Path("/vol/weights")

sec_ghcr = modal.Secret.from_name("ghcr-secret")
sec_hf = modal.Secret.from_name("hf-token")
sec_b2 = modal.Secret.from_name("b2-credentials")
sec_auth = modal.Secret.from_name("modal-auth-token")
ALL_SECRETS = [sec_ghcr, sec_hf, sec_b2, sec_auth]

IMAGES = {
    "stablediffusion": modal.Image.from_registry("ghcr.io/arda-avci/stablediffusion:latest", secret=sec_ghcr),
    "realesrgan":      modal.Image.from_registry("ghcr.io/arda-avci/realesrgan:latest",      secret=sec_ghcr),
}
GPU_CONFIG = {"stablediffusion": "A10", "realesrgan": "A10"}

models_volume = modal.Volume.from_name("ai-publisher-weights")

MODEL_WEIGHT_DIRS = {
    "stablediffusion": "",
    "realesrgan": "",
}


def _ensure_weights(model_name: str) -> Path:
    hf_repo = MODEL_WEIGHT_DIRS.get(model_name)
    if not hf_repo:
        return VOLUME_PATH

    model_dir = VOLUME_PATH / "image" / hf_repo.replace("/", "_")
    snapshot_file = model_dir / ".snapshot_done"

    if snapshot_file.exists():
        return model_dir

    import huggingface_hub

    hf_token = os.environ.get("HF_TOKEN")

    print(f"[{model_name}] Weights not in Volume. Downloading from HF: {hf_repo}")
    model_dir.mkdir(parents=True, exist_ok=True)
    try:
        huggingface_hub.snapshot_download(repo_id=hf_repo, local_dir=str(model_dir), token=hf_token, max_workers=8)
        snapshot_file.touch()
        models_volume.commit()
        print(f"[{model_name}] Weights committed to Volume.")
    except Exception as e:
        print(f"[{model_name}] Weight download skipped ({e}). Using Docker-bundled weights.")
    return model_dir


def _run_generate(model_name: str, prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    try:
        _ensure_weights(model_name)
    except Exception as e:
        return {"status": "error", "error": f"Weight load failed: {e}", "model": model_name}

    os.environ["HF_HOME"] = str(VOLUME_PATH / "hf_cache")
    os.environ["B2_KEY_ID"] = b2_key_id
    os.environ["B2_APPLICATION_KEY"] = b2_key

    sys.path.insert(0, "/app")
    try:
        import app as flask_mod
    except ImportError as e:
        import traceback
        return {"status": "error", "error": f"app.py import failed: {e}", "traceback": traceback.format_exc(), "model": model_name}

    if not hasattr(flask_mod, "app"):
        return {"status": "error", "error": "app.py has no Flask app", "model": model_name}

    route = None
    for rule in flask_mod.app.url_map.iter_rules():
        if 'POST' in rule.methods:
            route = rule.rule
            break
    if not route:
        return {"status": "error", "error": "No POST route in Flask app", "model": model_name}

    args = kwargs.copy()
    args["prompt"] = prompt
    with flask_mod.app.test_client() as client:
        resp = client.post(route, json=args)
        result = resp.get_json()
        return {"status": "completed", "result": result, "model": model_name}


@app.function(name="stablediffusion", image=IMAGES["stablediffusion"], gpu=GPU_CONFIG.get("stablediffusion", "A10"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=600, min_containers=0)
def generate_stablediffusion(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("stablediffusion", prompt, b2_key_id, b2_key, **kwargs)


@app.function(name="realesrgan", image=IMAGES["realesrgan"], gpu=GPU_CONFIG.get("realesrgan", "A10"),
    volumes={str(VOLUME_PATH): models_volume}, secrets=ALL_SECRETS, timeout=600, min_containers=0)
def generate_realesrgan(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    return _run_generate("realesrgan", prompt, b2_key_id, b2_key, **kwargs)


@modal.fastapi_endpoint(method="POST")
def api_generate(request):
    from fastapi import Request, HTTPException
    auth_err = check_auth(request.headers.get("Authorization", ""))
    if auth_err:
        raise HTTPException(status_code=401, detail=auth_err)

    body = request.json()
    model = body.get("model", "")
    if model not in IMAGES:
        raise HTTPException(status_code=400, detail=f"Unknown model: {model}")

    fn_map = {
        "stablediffusion": generate_stablediffusion,
        "realesrgan": generate_realesrgan,
    }

    result = fn_map[model].remote(
        prompt=body.get("prompt", ""),
        b2_key_id=body.get("b2_key_id", ""),
        b2_key=body.get("b2_key", ""),
    )
    return {"status": "success", "result": result}
