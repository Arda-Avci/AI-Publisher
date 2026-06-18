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
        
        # 2. docker-buildx package installation patch
        for i, line in enumerate(source):
            if 'apt-get install -y -q docker.io pigz' in line and 'docker-buildx' not in line:
                source[i] = line.replace('docker.io pigz', 'docker.io pigz docker-buildx')
                patched = True
                print("Patched apt-get install line to include docker-buildx.")
        
        # 3. Clean previous cgroup lines and insert fresh cgroup2 mount
        clean_source = []
        for line in source:
            if any(term in line for term in [
                "cgroup yetkilendirmesi", 
                "mount -o remount,rw", 
                "mkdir -p /sys/fs/cgroup", 
                "tmpfs fallback mount", 
                "mount -t tmpfs",
                "if not os.path.exists",
                "umount -l /sys/fs/cgroup",
                "cgroup kısıtlamaları kaldırılıyor"
            ]):
                patched = True
                continue
            clean_source.append(line)
        
        # find where sysctl settings are run
        sysctl_idx = -1
        for i, line in enumerate(clean_source):
            if "kernel.unprivileged_userns_clone=1" in line:
                sysctl_idx = i
                
        if sysctl_idx != -1:
            # Insert cgroup2 mount lines right after the sysctl line
            cgroup_lines = [
                'print("📁 cgroup2 dosya sistemi yazılabilir olarak yeniden monte ediliyor...")\n',
                'subprocess.run("umount -l /sys/fs/cgroup", shell=True, check=False)\n',
                'subprocess.run("mount -t cgroup2 none /sys/fs/cgroup", shell=True, check=False)\n',
                'subprocess.run("mkdir -p /sys/fs/cgroup/docker", shell=True, check=False)\n'
            ]
            insert_idx = sysctl_idx + 1
            while insert_idx < len(clean_source) and "subprocess.run" in clean_source[insert_idx]:
                insert_idx += 1
            
            clean_source[insert_idx:insert_idx] = cgroup_lines
            cell["source"] = clean_source
            patched = True
            print("Patched cgroup2 mount lines cleanly.")

if patched:
    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Notebook successfully updated with all patches.")
else:
    print("Notebook was already patched or target lines not found.")
