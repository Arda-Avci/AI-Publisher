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
                    # Add our new block with inline runc patch and dockerd startup
                    new_source.append('print("📦 Sistem paketleri (Docker.io & pigz) kuruluyor...")\n')
                    new_source.append('subprocess.run("apt-get update -q && apt-get install -y -q docker.io pigz docker-buildx", shell=True, check=True)\n')
                    new_source.append('print("🛡️ AppArmor ve User Namespace ayarları yapılandırılıyor...")\n')
                    new_source.append('subprocess.run("sysctl -w kernel.apparmor_restrict_unprivileged_userns=0", shell=True, check=False)\n')
                    new_source.append('subprocess.run("sysctl -w kernel.unprivileged_userns_clone=1", shell=True, check=False)\n')
                    new_source.append('print("🛠️ runc OCI runtime cgroup yaması uygulanıyor...")\n')
                    new_source.append('import shutil\n')
                    new_source.append('targets = ["runc", "docker-runc"]\n')
                    new_source.append('search_dirs = ["/usr/bin", "/usr/sbin", "/usr/local/bin", "/usr/libexec/docker"]\n')
                    new_source.append('for target in targets:\n')
                    new_source.append('    for d in search_dirs:\n')
                    new_source.append('        p = os.path.join(d, target)\n')
                    new_source.append('        if os.path.exists(p) and not os.path.islink(p) and not p.endswith(".real"):\n')
                    new_source.append('            real_path = p + ".real"\n')
                    new_source.append('            if not os.path.exists(real_path):\n')
                    new_source.append('                shutil.move(p, real_path)\n')
                    new_source.append('                wrapper_lines = [\n')
                    new_source.append('                    "#!/usr/bin/env python3",\n')
                    new_source.append('                    "import sys, os, json, subprocess",\n')
                    new_source.append('                    "bundle_path = None",\n')
                    new_source.append('                    "for i, arg in enumerate(sys.argv):",\n')
                    new_source.append('                    "    if arg == \\"--bundle\\" and i + 1 < len(sys.argv):",\n')
                    new_source.append('                    "        bundle_path = sys.argv[i + 1]",\n')
                    new_source.append('                    "        break",\n')
                    new_source.append('                    "if bundle_path:",\n')
                    new_source.append('                    "    config_path = os.path.join(bundle_path, \\"config.json\\")",\n')
                    new_source.append('                    "    if os.path.exists(config_path):",\n')
                    new_source.append('                    "        try:",\n')
                    new_source.append('                    "            with open(config_path, \\"r\\", encoding=\\"utf-8\\") as f:",\n')
                    new_source.append('                    "                config = json.load(f)",\n')
                    new_source.append('                    "            if \\"linux\\" in config:",\n')
                    new_source.append('                    "                if \\"cgroupsPath\\" in config[\\"linux\\"]:",\n')
                    new_source.append('                    "                    del config[\\"linux\\"][\\"cgroupsPath\\"]",\n')
                    new_source.append('                    "                if \\"resources\\" in config[\\"linux\\"]:",\n')
                    new_source.append('                    "                    config[\\"linux\\"][\\"resources\\"] = {}",\n')
                    new_source.append('                    "            with open(config_path, \\"w\\", encoding=\\"utf-8\\") as f:",\n')
                    new_source.append('                    "                json.dump(config, f)",\n')
                    new_source.append('                    "        except:",\n')
                    new_source.append('                    "            pass",\n')
                    new_source.append('                    "runc_real = os.path.realpath(__file__) + \\".real\\"",\n')
                    new_source.append('                    "sys.exit(subprocess.call([runc_real] + sys.argv[1:]))"\n')
                    new_source.append('                ]\n')
                    new_source.append('                with open(p, "w", encoding="utf-8") as f:\n')
                    new_source.append('                    f.write("\\n".join(wrapper_lines) + "\\n")\n')
                    new_source.append('                os.chmod(p, 0o755)\n')
                    new_source.append('                print(f"✅ {target} başarıyla yamalandı ({p} -> {real_path})")\n')
                    new_source.append('print("🚀 Docker Daemon arka planda başlatılıyor (vfs storage, no bridge)...")\n')
                    new_source.append('subprocess.Popen(["dockerd", "-b", "none", "--iptables=0", "--storage-driver=vfs"], stdout=open("/tmp/dockerd.log", "w"), stderr=subprocess.STDOUT)\n')
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
    print("Notebook successfully updated with runc patch integration.")
else:
    print("Docker setup cell not found in notebook.")
