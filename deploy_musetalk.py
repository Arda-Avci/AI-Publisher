import os, hmac, json, subprocess, time
import modal
from fastapi import Request, HTTPException
from pathlib import Path

MODAL_AUTH_TOKEN = os.environ.get("MODAL_AUTH_TOKEN", "")

def check_auth(auth_header: str):
    if not auth_header.startswith("Bearer "):
        return "Missing or malformed Authorization header"
    token = auth_header.removeprefix("Bearer ").strip()
    if not MODAL_AUTH_TOKEN or not hmac.compare_digest(token, MODAL_AUTH_TOKEN):
        return "Invalid token"
    return None

app = modal.App("ai-publisher-musetalk")
VOLUME_PATH = Path("/vol/weights")
models_volume = modal.Volume.from_name("ai-publisher-weights")
secs = [
    modal.Secret.from_name("ghcr-secret"),
    modal.Secret.from_name("hf-token"),
    modal.Secret.from_name("b2-credentials"),
    modal.Secret.from_name("modal-auth-token"),
]
image = modal.Image.from_registry("ghcr.io/arda-avci/musetalk:latest", secret=secs[0])

@app.function(
    image=image,
    gpu="A10",
    volumes={str(VOLUME_PATH): models_volume},
    secrets=secs,
    timeout=1800,
    min_containers=0,
    scaledown_window=5,
)
def generate(**kwargs) -> dict:
    import os, subprocess, time, requests as req, json, sys, signal, importlib.util

    # Set B2 creds from kwargs if provided
    for k in ("b2_key_id","b2_key","b2_application_key","hf_token","HF_TOKEN"):
        v = kwargs.pop(k, None)
        if v:
            os.environ[k.upper()] = v

    os.environ.setdefault("B2_KEY_ID", os.environ.get("B2_KEY_ID", ""))
    os.environ.setdefault("B2_APPLICATION_KEY", os.environ.get("B2_APPLICATION_KEY", ""))

    # Start Flask server in background (use conda Python from image)
    flask_port = os.environ.get("FLASK_PORT", "5000")
    py_bin = next(
        (p for p in ["/opt/conda/bin/python3", "/opt/conda/bin/python", sys.executable]
         if os.path.exists(p)),
        sys.executable,
    )
    # Log which Python was chosen
    log_lines = []
    log_lines.append(f"py_bin={py_bin}  exists={os.path.exists(py_bin)}")
    log_lines.append(f"sys.executable={sys.executable}")
    log_lines.append(f"PWD={os.getcwd()}")
    log_lines.append(f"ls app: {os.listdir('/app') if os.path.exists('/app') else 'N/A'}")
    for p in ["/opt/conda/bin/python3", "/opt/conda/bin/python"]:
        log_lines.append(f"  {p} exists={os.path.exists(p)}")
    import pathlib
    (pathlib.Path("/tmp") / "modal_prep.log").write_text("\n".join(log_lines))

    # Ensure workspace dirs exist
    for d in ["/workspace", "/workspace/outputs", "/workspace/hf_cache", "/workspace/torch_cache"]:
        os.makedirs(d, exist_ok=True)

    # Pin transformers < 4.46 if needed (kokoro/misaki models)
    PIN_TRANSFORMERS = False
    if PIN_TRANSFORMERS:
        try:
            tv = subprocess.run([py_bin, "-c", "import torch; print(torch.__version__)"],
                              capture_output=True, text=True, timeout=10)
            if tv.returncode == 0 and tv.stdout.strip() and tv.stdout.strip() < "2.4":
                subprocess.run([py_bin, "-m", "pip", "install", "--quiet",
                              "transformers<4.46"],
                              timeout=60)
        except Exception:
            pass

    stderr_log = open("/tmp/flask_stderr.log", "w")
    proc = subprocess.Popen(
        [py_bin, "-u", "/app/app.py"],
        cwd="/app",
        stdout=subprocess.DEVNULL,
        stderr=stderr_log,
    )

    # Wait for Flask health endpoint (up to ~30 min = Modal timeout)
    alive = False
    for i in range(900):
        try:
            r = req.get(f"http://127.0.0.1:{flask_port}/health", timeout=2)
            if r.status_code < 500:
                alive = True
                break
        except Exception:
            pass
        time.sleep(1)

    if not alive:
        proc.terminate()
        return {"status": "error", "error": "Flask server failed to start", "model": "musetalk"}

    # Discover POST routes from running Flask
    routes = []
    try:
        spec = importlib.util.spec_from_file_location("_app_mod", "/app/app.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        if hasattr(mod, "app"):
            for rule in mod.app.url_map.iter_rules():
                if "POST" in rule.methods and rule.endpoint not in ("static", "health", "preload"):
                    routes.append(rule.rule)
    except Exception:
        pass
    if not routes:
        routes = ["/synthesize", "/generate-media", "/transcribe", "/generate",
                  "/generate-image", "/process", "/run", "/"]

    # If return_file requested, capture output path and return base64
    return_file = kwargs.pop("_return_file", False)

    # Try each route with the input payload
    last_err = None; last_body = None; last_status = None
    for route in routes:
        try:
            url = f"http://127.0.0.1:{flask_port}{route}"
            resp = req.post(url, json=kwargs, timeout=1800)
            if resp.status_code < 500:
                result = resp.json()
                # If _return_file=True and result has output_path, read & return as base64
                if return_file and isinstance(result, dict) and result.get("output_path"):
                    import base64 as _b64
                    fpath = result["output_path"]
                    if os.path.exists(fpath):
                        with open(fpath, "rb") as _f:
                            result["_file_base64"] = _b64.b64encode(_f.read()).decode()
                            result["_file_ext"] = os.path.splitext(fpath)[1]
                return {"status": "completed", "result": result, "model": "musetalk"}
            last_body = resp.text[:500]; last_status = resp.status_code
            last_err = f"HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            last_err = str(e)
            continue

    proc.terminate()
    stderr_log.close()
    # Gather debug logs
    dbg = {}
    for logf in ["/tmp/modal_prep.log", "/tmp/flask_stderr.log"]:
        try:
            c = open(logf).read()
            dbg[logf] = c[-3000:] if len(c) > 3000 else c
        except:
            dbg[logf] = "unreadable"
    return {"status": "error", "error": last_err or "No route matched", "model": "musetalk", "debug": dbg, "last_body": last_body, "last_status": last_status}

@modal.fastapi_endpoint(method="POST")
def api_generate(request: Request):
    auth_err = check_auth(request.headers.get("Authorization", ""))
    if auth_err:
        raise HTTPException(401, detail=auth_err)
    return generate.remote(**(request.json() or {}))
