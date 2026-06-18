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
            if "docker-buildx" in line or "podman pigz" in line:
                has_docker_setup = True
                break
        
        if has_docker_setup:
            new_source = []
            skip_mode = False
            for line in source:
                if "# 2. Docker ve pigz Kurulumu" in line:
                    new_source.append(line)
                    # Add our new block for Podman installation
                    new_source.append('print("📦 Sistem paketleri (Podman & pigz) kuruluyor...")\n')
                    new_source.append('subprocess.run("apt-get update -q && apt-get install -y -q podman pigz", shell=True, check=True)\n')
                    new_source.append('print("📦 Podman Docker Registry ayarları yapılandırılıyor...")\n')
                    new_source.append('subprocess.run(\'mkdir -p /etc/containers && echo \\\'unqualified-search-registries = ["docker.io"]\\\' > /etc/containers/registries.conf\', shell=True, check=True)\n')
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
