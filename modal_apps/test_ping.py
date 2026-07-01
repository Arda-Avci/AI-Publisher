"""
Modal test app — pipeline dogrulama
"""
import modal
from fastapi import Request, HTTPException

app = modal.App("ai-publisher-test")

sec_auth = modal.Secret.from_name("modal-auth-token")


@app.function(secrets=[sec_auth])
def ping(name: str = "dunya") -> dict:
    return {"status": "ok", "message": f"Merhaba {name}", "modal": "canli"}


@modal.fastapi_endpoint(method="POST")
def api_ping(request: Request):
    auth = request.headers.get("Authorization", "")
    token = "ai-publisher-modal-secret-2026"
    if auth != f"Bearer {token}":
        raise HTTPException(401, "yetkisiz")
    body = request.json() or {}
    result = ping.remote(body.get("name", "test"))
    return result
