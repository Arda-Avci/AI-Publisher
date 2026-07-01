import modal, subprocess

# Use the existing ai-publisher-inspect app's explore function
f = modal.Function.from_name("ai-publisher-inspect", "explore")

# It already ran explore(), now check python paths in the same image
result = f.remote()

cmds = [
    "ls /opt/conda/bin/ 2>/dev/null | head -30",
    "find / -maxdepth 4 -name 'python*' -type f 2>/dev/null | head -10",
    "find / -name 'python*' -type f 2>/dev/null | head -10",
    "ls /pkg/ 2>/dev/null && ls /pkg/modal 2>/dev/null && ls /pkg/modal/bin/ | head -20",
    "cat /etc/os-release 2>/dev/null | head -5",
]
for cmd in cmds:
    r = subprocess.run(cmd, shell=True, capture_output=True, timeout=30)
    out = (r.stdout or b"").decode("utf-8", errors="replace").strip()[:500]
    err = (r.stderr or b"").decode("utf-8", errors="replace").strip()[:200]
    if out or err:
        print(f"$ {cmd}")
        if out: print(f"  out:\n{out}")
        if err: print(f"  err: {err}")
        print()
