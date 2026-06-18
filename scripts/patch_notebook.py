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
        
        has_docker_setup = False
        for line in source:
            if "docker-buildx" in line:
                has_docker_setup = True
                break
        
        if has_docker_setup:
            new_source = []
            skip_mode = False
            for line in source:
                if "# 2. Docker ve pigz Kurulumu" in line:
                    new_source.append(line)
                    # Add our new block with proper cgroup v2 mount and dockerd configs
                    new_source.append('print("📦 Sistem paketleri (Docker.io & pigz) kuruluyor...")\n')
                    new_source.append('subprocess.run("apt-get update -q && apt-get install -y -q docker.io pigz docker-buildx", shell=True, check=True)\n')
                    new_source.append('print("🛡️ AppArmor ve User Namespace ayarları yapılandırılıyor...")\n')
                    new_source.append('subprocess.run("sysctl -w kernel.apparmor_restrict_unprivileged_userns=0", shell=True, check=False)\n')
                    new_source.append('subprocess.run("sysctl -w kernel.unprivileged_userns_clone=1", shell=True, check=False)\n')
                    new_source.append('print("📁 cgroup2 dosya sistemi yazılabilir olarak yeniden monte ediliyor...")\n')
                    new_source.append('subprocess.run("umount -l /sys/fs/cgroup", shell=True, check=False)\n')
                    new_source.append('mount_res = subprocess.run("mount -t cgroup2 none /sys/fs/cgroup", shell=True, check=False)\n')
                    new_source.append('if mount_res.returncode != 0:\n')
                    new_source.append('    print("⚠️ cgroup2 mount başarısız oldu (muhtemelen CPU modundasınız ve yetkiniz yok).")\n')
                    new_source.append('subprocess.run("mkdir -p /sys/fs/cgroup/docker", shell=True, check=False)\n')
                    new_source.append('print("🚀 Docker Daemon arka planda başlatılıyor (vfs storage, no bridge)...")\n')
                    new_source.append('subprocess.Popen(["dockerd", "-b", "none", "--iptables=0", "--storage-driver=vfs", "--exec-opt", "native.cgroupdriver=cgroupfs"], stdout=open("/tmp/dockerd.log", "w"), stderr=subprocess.STDOUT)\n')
                    new_source.append('import time\n')
                    new_source.append('for i in range(30):\n')
                    new_source.append('    if os.path.exists("/var/run/docker.sock"):\n')
                    new_source.append('        print("✅ Docker Daemon başarıyla başlatıldı.")\n')
                    new_source.append('        break\n')
                    new_source.append('    time.sleep(1)\n')
                    new_source.append('else:\n')
                    new_source.append('    print("❌ Docker Daemon başlatılamadı. Hata logları:")\n')
                    new_source.append('    with open("/tmp/dockerd.log", "r") as f:\n')
                    new_source.append('        print(f.read())\n')
                    new_source.append('    sys.exit(1)\n')
                    new_source.append('\n')
                    skip_mode = True
                    patched = True
                    continue
                
                if "# 3. Depoyu Klonlama" in line:
                    skip_mode = False
                
                if not skip_mode:
                    new_source.append(line)
            
            cell["source"] = new_source

if patched:
    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Notebook successfully updated with cgroup2 mounts.")
else:
    print("Docker setup cell not found in notebook.")
