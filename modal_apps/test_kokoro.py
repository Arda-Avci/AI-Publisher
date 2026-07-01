"""
Kokoro TTS test deploy — full pipeline dogrulama
"""
import modal
from fastapi import Request, HTTPException
from pathlib import Path

from . import check_auth

app = modal.App("ai-publisher-test-kokoro")
VOLUME_PATH = Path("/vol/weights")
models_volume = modal.Volume.from_name("ai-publisher-weights")

sec_ghcr = modal.Secret.from_name("ghcr-secret")
sec_hf = modal.Secret.from_name("hf-token")
sec_b2 = modal.Secret.from_name("b2-credentials")
sec_auth = modal.Secret.from_name("modal-auth-token")
ALL_SECRETS = [sec_ghcr, sec_hf, sec_b2, sec_auth]

image = modal.Image.from_registry("ghcr.io/arda-avci/kokorotts:latest", secret=sec_ghcr)


@app.function(
    image=image,
    volumes={str(VOLUME_PATH): models_volume},
    secrets=ALL_SECRETS,
    timeout=300,
    min_containers=0,
)
def generate(text: str, b2_key_id: str, b2_key: str, **kwargs) -> dict:
    import os, sys

    os.environ["B2_KEY_ID"] = b2_key_id
    os.environ["B2_APPLICATION_KEY"] = b2_key

    sys.path.insert(0, "/app")
    try:
        import app as model_app
    except ImportError:
        return {"status": "error", "error": "app.py not found in image", "model": "kokoro"}

    if not hasattr(model_app, "generate"):
        return {"status": "error", "error": "app.py has no generate()", "model": "kokoro"}

    args = kwargs.copy()
    args["text"] = text
    result = model_app.generate(**args)
    return {"status": "completed", "result": result, "model": "kokoro"}


@modal.fastapi_endpoint(method="POST")
def api_generate(request: Request):
    auth_err = check_auth(request.headers.get("Authorization", ""))
    if auth_err:
        raise HTTPException(401, detail=auth_err)
    body = request.json() or {}
    result = generate.remote(**body)
    return result
