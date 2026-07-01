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


def _make_generate(model_name: str):
    """Factory: create a Modal function for each video model."""
    image = IMAGES[model_name]
    gpu = GPU_CONFIG.get(model_name, "A100")

    @app.function(
        image=image,
        gpu=gpu,
        volumes={str(VOLUME_PATH): models_volume},
        secrets=ALl_SECRETS,
        timeout=900,
        min_containers=0,
        serialized=True,
    )
    def generate(prompt: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
        try:
            weights_dir = _ensure_weights(model_name)
        except Exception as e:
            return {"status": "error", "error": f"Weight load failed: {e}", "model": model_name}

        os.environ["HF_HOME"] = str(VOLUME_PATH / "hf_cache")
        os.environ["TORCH_HOME"] = str(VOLUME_PATH / "torch_cache")
        os.environ["B2_KEY_ID"] = b2_key_id
        os.environ["B2_APPLICATION_KEY"] = b2_key

        # Import app.py from the Docker image (it's at /app/app.py)
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


generate_wan = _make_generate("wan")
generate_wan25 = _make_generate("wan25")
generate_cogvideox = _make_generate("cogvideox")
generate_hunyuan = _make_generate("hunyuan")
generate_ltx = _make_generate("ltx")
generate_mochi = _make_generate("mochi")
generate_animatediff = _make_generate("animatediff")
generate_dynamicrafter = _make_generate("dynamicrafter")
generate_pyramidflow = _make_generate("pyramidflow")
generate_svd = _make_generate("svd")
generate_videocrafter = _make_generate("videocrafter")
generate_zeroscope = _make_generate("zeroscope")


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
