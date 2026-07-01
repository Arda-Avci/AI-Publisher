"""Inspect GHCR image structure via Modal (no local Docker needed)."""
import modal, os

IMAGE = "ghcr.io/arda-avci/kokorotts:latest"
SEC = modal.Secret.from_name("ghcr-secret")

app = modal.App("ai-publisher-inspect")
img = modal.Image.from_registry(IMAGE, secret=SEC)

@app.function(image=img, secrets=[SEC], timeout=120)
def explore():
    import subprocess
    out = {}
    for cmd in [
        "ls -la /",
        "ls -la /app 2>/dev/null || echo '/app not found'",
        "ls -la /handler 2>/dev/null || echo '/handler not found'",
        "cat /app/app.py 2>/dev/null || echo 'no /app/app.py'",
        "cat /app/runpod_handler.py 2>/dev/null || echo 'no runpod_handler.py'",
        "find / -name 'app.py' -o -name 'handler.py' -o -name 'main.py' -o -name 'server.py' 2>/dev/null",
        "cat /proc/1/cmdline 2>/dev/null | tr '\0' ' '; echo",
        "env | grep -i listen || echo 'no LISTEN/PORT env'",
    ]:
        try:
            r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
            out[cmd] = r.stdout + (r.stderr if r.returncode else "")
        except Exception as e:
            out[cmd] = str(e)
    return out

if __name__ == "__main__":
    with app.run(detach=False) as running_app:
        import json
        result = explore.local()
        print(json.dumps(result, indent=2))
