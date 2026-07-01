import modal

app = modal.App("ai-publisher-pycheck")

PY_IMAGE = "ghcr.io/arda-avci/kokorotts:latest"

@app.function(image=modal.Image.from_registry(PY_IMAGE, secrets=[modal.Secret.from_dotenv(".env")]), gpu="T4", timeout=120)
def check():
    import os, subprocess
    res = []
    # Find python
    res.append("=== PYTHON BIN ===")
    r = subprocess.run("find / -maxdepth 5 -type f -name 'python*' -executable 2>/dev/null | head -10", shell=True, capture_output=True, text=True)
    res.append(r.stdout.strip()[:500])

    res.append("=== DEFAULT PYTHON ===")
    r = subprocess.run(["python3", "-c", "import sys; print(sys.executable); print(sys.version)"], capture_output=True, text=True, timeout=10)
    res.append(f"out: {r.stdout.strip()[:300]}")
    if r.stderr: res.append(f"err: {r.stderr.strip()[:200]}")

    # Check conda
    res.append("=== CONDA ===")
    for p in ["/opt/conda", "/opt/anaconda", "/usr/local/anaconda"]:
        if os.path.exists(p):
            res.append(f"{p} exists")
            ls = os.listdir(p)
            res.append(f"  contents: {ls[:20]}")

    # Try various pythons
    res.append("=== TORCH CHECK ===")
    candidates = ["python3", "/opt/conda/bin/python3", "/opt/conda/bin/python", "/usr/local/bin/python3", "/usr/bin/python3"]
    for py in candidates:
        r = subprocess.run([py, "-c", "import torch; print(torch.__version__)"], capture_output=True, text=True, timeout=10)
        if r.returncode == 0:
            res.append(f"{py}: torch {r.stdout.strip()}")
        else:
            res.append(f"{py}: NO torch ({r.stderr.strip()[:100]})")

    # Check kokoro
    res.append("=== KOKORO CHECK ===")
    candidates = ["python3", "/opt/conda/bin/python3", "/opt/conda/bin/python", "/usr/local/bin/python3", "/usr/bin/python3"]
    for py in candidates:
        r = subprocess.run([py, "-c", "import kokoro; print('ok')"], capture_output=True, text=True, timeout=10)
        if r.returncode == 0:
            res.append(f"{py}: kokoro ok")
        else:
            res.append(f"{py}: NO kokoro ({r.stderr.strip()[:100]})")

    # List /app
    res.append("=== /APP ===")
    if os.path.exists("/app"):
        res.append(str(os.listdir("/app")))

    try:
        r = subprocess.run(["python3", "/app/app.py", "--help"], capture_output=True, text=True, timeout=5)
        res.append(f"app.py run: {r.stdout.strip()[:200]} {r.stderr.strip()[:200]}")
    except subprocess.TimeoutExpired:
        res.append("app.py: timeout (expected)")
    except Exception as e:
        res.append(f"app.py error: {e}")

    return "\n".join(res)
