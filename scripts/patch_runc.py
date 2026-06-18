import os
import sys
import shutil

def patch_runc():
    targets = ["runc", "docker-runc"]
    found_any = False
    
    # Common search directories
    search_dirs = ["/usr/bin", "/usr/sbin", "/usr/local/bin", "/usr/libexec/docker"]
    
    for target in targets:
        for d in search_dirs:
            p = os.path.join(d, target)
            if os.path.exists(p) and not os.path.islink(p) and not p.endswith(".real"):
                real_path = p + ".real"
                if os.path.exists(real_path):
                    print(f"ℹ️ {target} is already patched. ({p} -> {real_path})")
                    found_any = True
                    continue
                
                print(f"📦 Patching {target}: {p}...")
                try:
                    shutil.move(p, real_path)
                    
                    wrapper_code = """#!/usr/bin/env python3
import sys
import os
import json
import subprocess

bundle_path = None
for i, arg in enumerate(sys.argv):
    if arg == "--bundle" and i + 1 < len(sys.argv):
        bundle_path = sys.argv[i + 1]
        break

if bundle_path:
    config_path = os.path.join(bundle_path, "config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
            if "linux" in config:
                if "cgroupsPath" in config["linux"]:
                    del config["linux"]["cgroupsPath"]
                if "resources" in config["linux"]:
                    config["linux"]["resources"] = {}
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config, f)
        except Exception:
            pass

runc_real = os.path.realpath(__file__) + ".real"
sys.exit(subprocess.call([runc_real] + sys.argv[1:]))
"""
                    with open(p, "w", encoding="utf-8") as f:
                        f.write(wrapper_code)
                    
                    os.chmod(p, 0o755)
                    print(f"✅ {target} successfully patched.")
                    found_any = True
                except Exception as e:
                    print(f"❌ Failed to patch {target}: {e}")
                    if os.path.exists(real_path) and not os.path.exists(p):
                        shutil.move(real_path, p)
                        
    return found_any

if __name__ == "__main__":
    patch_runc()
