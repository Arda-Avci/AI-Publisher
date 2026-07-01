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
from fastapi import Request, HTTPException

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
    "stablediffusion": "stabilityai/stable-diffusion-xl-base-1.0",
    "realesrgan": "xinntao/RealESRGAN",
}


def _ensure_weights(model_name: str) -> Path:
    hf_repo = MODEL_WEIGHT_DIRS[model_name]
    model_dir = VOLUME_PATH / "image" / hf_repo.replace("/", "_")
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


def _make_generate(model_name: str):
    image = IMAGES[model_name]
    gpu = GPU_CONFIG.get(model_name, "A10")

    @app.function(
        image=image,
        gpu=gpu,
        volumes={str(VOLUME_PATH): models_volume},
        secrets=ALL_SECRETS,
        timeout=600,
        min_containers=0,
        serialized=True,
    )
    def generate(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
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
        args["prompt"] = prompt
        result = model_app.generate(**args)
        return {"status": "completed", "result": result, "model": model_name}

    return generate


generate_stablediffusion = _make_generate("stablediffusion")
generate_realesrgan = _make_generate("realesrgan")


@modal.fastapi_endpoint(method="POST")
def api_generate(request: Request):
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
