# deploy_serial.ps1 — Serial model deploy with retry
param([string]$Group="all")

$ProjectRoot = "C:\Users\Damla\Proje\AI-Publisher"

$Models = @(
    # Audio (already deployed)
    @{Name="kokoro";     Img="kokorotts";    TransformersPin=$true; Gpu="A10"}
    @{Name="whisper";    Img="whisper";                               Gpu="A10"}
    @{Name="f5tts";      Img="f5tts";                                 Gpu="A10"}
    @{Name="xtts";       Img="xtts";                                  Gpu="A10"}
    @{Name="wav2lip";    Img="wav2lip";       Gpu="A10"}
    @{Name="sadtalker";  Img="sadtalker";     Gpu="A10"}
    @{Name="musetalk";   Img="musetalk";      Gpu="A10"}
    @{Name="geneface";   Img="geneface";      Gpu="A10"}
    @{Name="videoretalking"; Img="video-retalking"; Gpu="A10"}
    @{Name="audioldm2";  Img="audioldm2";     Gpu="A10"}
    @{Name="browseruse"; Img="browser-use";   Gpu="A10"}
    # Video
    @{Name="wan";        Img="wan";           Gpu="H100"}
    @{Name="wan25";      Img="wan25";         Gpu="H100"}
    @{Name="cogvideox";  Img="cogvideox";     Gpu="A100"}
    @{Name="hunyuan";    Img="hunyuan";       Gpu="A100"}
    @{Name="ltx";        Img="ltx";           Gpu="A100"}
    @{Name="mochi";      Img="mochi";         Gpu="A100"}
    @{Name="animatediff"; Img="animatediff";  Gpu="A10"}
    @{Name="dynamicrafter"; Img="dynamicrafter"; Gpu="A10"}
    @{Name="pyramidflow"; Img="pyramid-flow"; Gpu="A100"}
    @{Name="svd";        Img="svd";           Gpu="A10"}
    @{Name="videocrafter"; Img="videocrafter"; Gpu="A10"}
    @{Name="zeroscope";  Img="zeroscope";     Gpu="A10"}
    # Image
    @{Name="stablediffusion"; Img="stablediffusion"; Gpu="A10"}
    @{Name="realesrgan"; Img="realesrgan";    Gpu="A10"}
)

$Results = @()
$Repo = "ghcr.io/arda-avci"
$LogFile = "$ProjectRoot\deploy_progress.log"
"=== Deploy started $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $LogFile

$Template = @'
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

app = modal.App("ai-publisher-MODELNAME")
VOLUME_PATH = Path("/vol/weights")
models_volume = modal.Volume.from_name("ai-publisher-weights")
secs = [
    modal.Secret.from_name("ghcr-secret"),
    modal.Secret.from_name("hf-token"),
    modal.Secret.from_name("b2-credentials"),
    modal.Secret.from_name("modal-auth-token"),
]
image = modal.Image.from_registry("IMAGEREF", secret=secs[0])

@app.function(
    image=image,
    gpu=GPUSTR,
    volumes={str(VOLUME_PATH): models_volume},
    secrets=secs,
    timeout=TIMEOUT,
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

    # ── Torchaudio ABI fix ──
    # (common: Dockerfile upgrades torch but torchaudio .so stays old)
    try:
        _tv = subprocess.run([py_bin, "-c",
            "import torch; v=torch.__version__.split('+')[0]; print(v)"],
            capture_output=True, text=True, timeout=10)
        _th_ver = _tv.stdout.strip()
        if _th_ver:
            _ta = subprocess.run([py_bin, "-c",
                "import torchaudio; print(torchaudio.__version__)"],
                capture_output=True, text=True, timeout=10)
            _ta_ver = _ta.stdout.strip()
            if _ta_ver and _ta_ver.split(".")[:2] != _th_ver.split(".")[:2]:
                subprocess.run([py_bin, "-m", "pip", "install", "--quiet",
                    f"torchaudio=={_th_ver}", "--force-reinstall", "--no-deps"], timeout=30)
    except Exception:
        pass

    # Pin transformers < 4.46 if needed (kokoro/misaki models)
    PIN_TRANSFORMERS = PIN_TRANSFORMERS_FLAG
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

    # ── Write launcher script (thread-based Flask start) ──
    launcher = r'''
import sys, os, threading, importlib.util, time
os.chdir("/app")
sys.path.insert(0, "/app")

from flask import Flask, jsonify
app = Flask(__name__)

ready = threading.Event()
load_error = [None]
real_app = [None]

HEALTH_APP_START = time.time()

@app.route("/health")
def health():
    if ready.is_set():
        return jsonify({"status": "healthy", "loaded": True})
    return jsonify({"status": "loading", "elapsed": round(time.time() - HEALTH_APP_START, 1)})

@app.route("/<path:subpath>", methods=["GET","POST","PUT"])
def catch_all(subpath):
    # Wait up to 600s for module to load
    if not ready.wait(timeout=600):
        return jsonify({"status":"error","error":"Module load timeout"}), 504
    if load_error[0]:
        return jsonify({"status":"error","error":load_error[0]}), 500
    # Forward to real app's WSGI via test client
    from werkzeug.test import Client
    from flask import request as _req
    client = Client(real_app[0])
    if _req.method == "POST":
        resp = client.post("/" + subpath, json=_req.get_json(force=True) if _req.is_json else {}, content_type="application/json")
    else:
        resp = client.get("/" + subpath)
    return resp.data, resp.status_code, dict(resp.headers)

def load_app():
    try:
        spec = importlib.util.spec_from_file_location("app_mod", "/app/app.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        real_app[0] = mod.app
    except Exception as e:
        import traceback
        load_error[0] = f"{e}\n{traceback.format_exc()}"
    finally:
        ready.set()

threading.Thread(target=load_app, daemon=True).start()
app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
'''
    launcher_path = "/tmp/launcher.py"
    with open(launcher_path, "w") as _f:
        _f.write(launcher.replace("app_mod", f"app_mod_{int(time.time())}"))  # unique module name

    stderr_log = open("/tmp/flask_stderr.log", "w")
    proc = subprocess.Popen(
        [py_bin, "-u", launcher_path],
        cwd="/app",
        stdout=subprocess.DEVNULL,
        stderr=stderr_log,
    )

    # Wait for Flask health endpoint (thread-based → responds <2s)
    alive = False; wait_start = time.time()
    for i in range(60):  # 60 * 2s = 2 min max for health
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
        return {"status": "error", "error": "Flask server failed to start (launcher)", "model": "MODELNAME"}

    # Discover POST routes (fallback if import fails)
    routes = ["/synthesize", "/generate-media", "/transcribe", "/generate",
              "/generate-image", "/process", "/run", "/"]

    # If return_file requested, capture output path and return base64
    return_file = kwargs.pop("_return_file", False)

    # If _file_base64 in kwargs, decode to temp file and pass as file_path
    fb64 = kwargs.pop("_file_base64", None)
    fext = kwargs.pop("_file_ext", ".wav")
    if fb64:
        import uuid as _uid, base64 as _b64
        tmp = f"/tmp/fw_input_{_uid.uuid4()}{fext}"
        with open(tmp, "wb") as _f:
            _f.write(_b64.b64decode(fb64))
        kwargs["file_path"] = tmp

    # Try each route with retry (handles slow model loading)
    last_err = None; last_body = None; last_status = None
    for route in routes:
        for attempt in range(120):  # 120 * 5s = 10 min max
            try:
                url = f"http://127.0.0.1:{flask_port}{route}"
                resp = req.post(url, json=kwargs, timeout=TIMEOUT)
                if resp.status_code in (503, 504):
                    time.sleep(5)
                    continue
                if resp.status_code < 500:
                    result = resp.json()
                    if return_file and isinstance(result, dict) and result.get("output_path"):
                        import base64 as _b64
                        fpath = result["output_path"]
                        if os.path.exists(fpath):
                            with open(fpath, "rb") as _f:
                                result["_file_base64"] = _b64.b64encode(_f.read()).decode()
                                result["_file_ext"] = os.path.splitext(fpath)[1]
                    return {"status": "completed", "result": result, "model": "MODELNAME"}
                last_body = resp.text[:500]; last_status = resp.status_code
                last_err = f"HTTP {resp.status_code}: {resp.text[:200]}"
                break  # non-retryable status
            except Exception as e:
                last_err = str(e)
                time.sleep(5)
                continue
        if last_status and last_status < 500:
            break  # found a working route with a bad response

    proc.terminate()
    stderr_log.close()
    dbg = {}
    for logf in ["/tmp/modal_prep.log", "/tmp/flask_stderr.log"]:
        try:
            c = open(logf).read()
            dbg[logf] = c[-3000:] if len(c) > 3000 else c
        except:
            dbg[logf] = "unreadable"
    return {"status": "error", "error": last_err or "No route matched", "model": "MODELNAME", "debug": dbg, "last_body": last_body, "last_status": last_status}

@modal.fastapi_endpoint(method="POST")
def api_generate(request: Request):
    auth_err = check_auth(request.headers.get("Authorization", ""))
    if auth_err:
        raise HTTPException(401, detail=auth_err)
    return generate.remote(**(request.json() or {}))
'@

Push-Location -Path $ProjectRoot

foreach ($m in $Models) {
    if ($Group -ne "all" -and $m.Name -notlike $Group) { continue }

    Write-Host "`n=== Deploy: $($m.Name) ===" -ForegroundColor Cyan

    $gpuStr = if ($m.Gpu) { "`"$($m.Gpu)`"" } else { "None" }
    $timeout = if ($m.Gpu) { "1800" } else { "300" }
    $imageRef = "$Repo/$($m.Img):latest"
    $pinTransformers = if ($m.TransformersPin -eq $true) { "True" } else { "False" }

    $content = $Template `
        -replace "MODELNAME", $m.Name `
        -replace "IMAGEREF", $imageRef `
        -replace "GPUSTR", $gpuStr `
        -replace "PIN_TRANSFORMERS_FLAG", $pinTransformers `
        -replace "TIMEOUT", $timeout

    $scriptPath = "$ProjectRoot\deploy_$($m.Name).py"
    Set-Content -Path $scriptPath -Value $content -Encoding UTF8

    Write-Host "  image: $imageRef  gpu: $($m.Gpu -or 'cpu')"
    $now = Get-Date -Format 'HH:mm:ss'
    "[$now] Deploying $($m.Name)..." | Out-File $LogFile -Append

    $env:PYTHONUTF8 = "1"
    $start = Get-Date
    $output = & modal deploy -m "deploy_$($m.Name)" 2>&1
    $ok = $LASTEXITCODE -eq 0 -and ($output -match "deployed" -or $output -match "Created")
    $elapsed = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)

    if ($ok) {
        Write-Host "  >> OK (${elapsed}s)" -ForegroundColor Green
        "[$now] OK $($m.Name) (${elapsed}s)" | Out-File $LogFile -Append
        $Results += [PSCustomObject]@{Name=$m.Name; Status="OK"; Time="${elapsed}s"}
    } else {
        Write-Host "  >> FAIL (${elapsed}s)" -ForegroundColor Red
        $output | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
        "[$now] FAIL $($m.Name) (${elapsed}s)" | Out-File $LogFile -Append
        $Results += [PSCustomObject]@{Name=$m.Name; Status="FAIL"; Time="${elapsed}s"}
    }

    Remove-Item $scriptPath -Force -ErrorAction SilentlyContinue
    "[$now] Waiting 3s before next..." | Out-File $LogFile -Append
    Start-Sleep -Seconds 3
}

Pop-Location

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
$Results | Format-Table -AutoSize
$okCount = ($Results | Where-Object Status -eq 'OK').Count
Write-Host "$okCount / $($Models.Count) OK" -ForegroundColor $(if($okCount -eq $Models.Count){'Green'}else{'Yellow'})
