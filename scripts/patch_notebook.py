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
        
        # 1. Dockerd -b none patch
        for i, line in enumerate(source):
            if '["dockerd", "--iptables=0"' in line and '"-b", "none"' not in line:
                source[i] = line.replace('["dockerd",', '["dockerd", "-b", "none",')
                patched = True
                print(f"Patched dockerd line.")
        
        # 2. cgroup mounts patch
        # find where sysctl settings are run
        sysctl_idx = -1
        has_cgroup = False
        for i, line in enumerate(source):
            if "kernel.unprivileged_userns_clone=1" in line:
                sysctl_idx = i
            if "cgroup yetkilendirmesi" in line:
                has_cgroup = True
                
        if sysctl_idx != -1 and not has_cgroup:
            # Insert cgroup patch lines right after the sysctl line
            cgroup_lines = [
                'print("📁 cgroup yetkilendirmesi ve geçici cgroup dizin mountları yapılıyor...")\n',
                'subprocess.run("mount -o remount,rw /sys/fs/cgroup", shell=True, check=False)\n',
                'subprocess.run("mkdir -p /sys/fs/cgroup/docker", shell=True, check=False)\n',
                'if not os.path.exists("/sys/fs/cgroup/docker"):\n',
                '    print("⚠️ /sys/fs/cgroup read-only görünüyor. tmpfs fallback mount yapılıyor...")\n',
                '    subprocess.run("mount -t tmpfs -o mode=755 cgroup /sys/fs/cgroup", shell=True, check=False)\n',
                '    subprocess.run("mkdir -p /sys/fs/cgroup/docker", shell=True, check=False)\n'
            ]
            # Insert after sysctl_idx + 1 (which would be subprocess.run("sysctl -w kernel.unprivileged_userns_clone=1"...))
            # Let's find the exact subprocess.run for sysctl
            insert_idx = sysctl_idx + 1
            while insert_idx < len(source) and "subprocess.run" in source[insert_idx]:
                insert_idx += 1
            
            # Insert lines
            source[insert_idx:insert_idx] = cgroup_lines
            patched = True
            print("Patched cgroup mount lines.")

if patched:
    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Notebook successfully updated with cgroup patch.")
else:
    print("Notebook was already patched or target lines not found.")
