import json
import os

notebook_path = "Google_Colab_AI_Publisher.ipynb"

if not os.path.exists(notebook_path):
    print(f"Error: {notebook_path} not found.")
    exit(1)

with open(notebook_path, "r", encoding="utf-8") as f:
    data = json.load(f)

patched = False
for cell in data.get("cells", []):
    if cell.get("cell_type") == "code":
        source = cell.get("source", [])
        
        # 1. Clean all cgroup mounts and commands completely
        clean_source = []
        for line in source:
            if any(term in line for term in [
                "cgroup yetkilendirmesi", 
                "mount -o remount,rw", 
                "mkdir -p /sys/fs/cgroup", 
                "tmpfs fallback mount", 
                "mount -t tmpfs",
                "mount -t cgroup2",
                "if not os.path.exists",
                "umount -l /sys/fs/cgroup",
                "cgroup kısıtlamaları kaldırılıyor",
                "cgroup2 dosya sistemi"
            ]):
                patched = True
                continue
            clean_source.append(line)
        
        # 2. Update dockerd startup to default flexible arguments
        for i, line in enumerate(clean_source):
            if '["dockerd"' in line:
                clean_source[i] = '        subprocess.Popen(["dockerd", "-b", "none", "--iptables=0", "--storage-driver=vfs"], stdout=open("/tmp/dockerd.log", "w"), stderr=subprocess.STDOUT)\n'
                patched = True
                print("Updated dockerd startup command to flexible default.")

        cell["source"] = clean_source

if patched:
    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Notebook successfully cleaned and updated.")
else:
    print("Notebook was already clean or target lines not found.")
