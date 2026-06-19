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
            if "docker-buildx" in line or "podman pigz" in line or "Google Colab Kısıtlamaları Nedeniyle" in line or "Kaniko ve Yerel Registry" in line:
                has_docker_setup = True
                break
        
        if has_docker_setup:
            new_source = [
                '# 2. Kaniko ve Yerel Registry Kurulumu ile Docker Insa\n',
                'from google.colab import drive\n',
                'drive.mount(\'/content/drive\')\n',
                '\n',
                'print("==========================================")\n',
                'print("📦 Kaniko ve Yerel Registry Kuruluyor...")\n',
                'print("==========================================")\n',
                '\n',
                'import subprocess\n',
                'import os\n',
                'import time\n',
                'import urllib.request\n',
                'import sys\n',
                '\n',
                '# 1. Go Registry İndir ve Kur\n',
                'if not os.path.exists("/usr/local/bin/registry"):\n',
                '  print("[INFO] Docker Registry binary indiriliyor...")\n',
                '  subprocess.run("wget -q https://github.com/distribution/distribution/releases/download/v2.8.2/registry_2.8.2_linux_amd64.tar.gz", shell=True)\n',
                '  subprocess.run("tar -xzf registry_2.8.2_linux_amd64.tar.gz registry", shell=True)\n',
                '  subprocess.run("mv registry /usr/local/bin/registry", shell=True)\n',
                '  subprocess.run("rm -f registry_2.8.2_linux_amd64.tar.gz", shell=True)\n',
                '  subprocess.run("chmod +x /usr/local/bin/registry", shell=True)\n',
                '\n',
                '# 2. Kaniko İndir ve Kur (Docker Imajından Kopyalayarak)\n',
                'if not os.path.exists("/usr/local/bin/kaniko"):\n',
                '  print("[INFO] Kaniko executor binary Docker imajından kopyalanıyor...")\n',
                '  subprocess.run("docker pull gcr.io/kaniko-project/executor:latest", shell=True)\n',
                '  subprocess.run("docker create --name kaniko-temp gcr.io/kaniko-project/executor:latest", shell=True)\n',
                '  subprocess.run("docker cp kaniko-temp:/kaniko/executor /usr/local/bin/kaniko", shell=True)\n',
                '  subprocess.run("docker rm kaniko-temp", shell=True)\n',
                '  subprocess.run("chmod +x /usr/local/bin/kaniko", shell=True)\n',
                '\n',
                '# 3. pigz İndir (paralel gzip sıkıştırma için)\n',
                'subprocess.run("apt-get update && apt-get install -y pigz", shell=True)\n',
                '\n',
                'print("✅ Kurulumlar tamamlandi.")\n',
                '\n',
                '# 4. Registry\'yi Arka Planda Başlat\n',
                'print("==========================================")\n',
                'print("🚀 Yerel Registry localhost:5000 Portunda Baslatiliyor...")\n',
                'print("==========================================")\n',
                'os.makedirs("/etc/docker/registry", exist_ok=True)\n',
                'with open("/etc/docker/registry/config.yml", "w") as cfg_f:\n',
                '  cfg_f.write("""version: 0.1\\nlog:\\n  fields:\\n    service: registry\\nstorage:\\n  cache:\\n    blobdescriptor: inmemory\\n  filesystem:\\n    rootdirectory: /var/lib/registry\\nhttp:\\n  addr: :5000\\n  headers:\\n    X-Content-Type-Options: [nosniff]\\n""")\n',
                'subprocess.run("pkill -f \'registry serve\' || true", shell=True)\n',
                '# Arka planda registry serve baslat\n',
                'subprocess.Popen(["/usr/local/bin/registry", "serve", "/etc/docker/registry/config.yml"], stdout=open("registry.log", "w"), stderr=subprocess.STDOUT)\n',
                '\n',
                '# Registry\'nin hazir olmasini bekle\n',
                'registry_ok = False\n',
                'for _ in range(15):\n',
                '  try:\n',
                '    urllib.request.urlopen("http://localhost:5000/v2/")\n',
                '    print("✅ Registry başarıyla başlatıldı ve yanıt veriyor!")\n',
                '    registry_ok = True\n',
                '    break\n',
                '  except Exception:\n',
                '    time.sleep(1)\n',
                'if not registry_ok:\n',
                '  print("❌ Hata: Yerel registry başlatılamadı!")\n',
                '  if os.path.exists("registry.log"):\n',
                '    with open("registry.log", "r") as log_f:\n',
                '      print(log_f.read())\n',
                '  sys.exit(1)\n',
                '\n',
                '# 5. Insa Betigini Tetikle\n',
                'print("==========================================")\n',
                'print("🚀 Docker Imajlarının Insa Edilmesi Baslatiliyor...")\n',
                'print("==========================================")\n',
                '\n',
                '# Son demleri git pull ile cekelim\n',
                'subprocess.run("git pull origin main || true", shell=True)\n',
                'subprocess.run("chmod +x colab_docker/build_all.sh", shell=True)\n',
                '\n',
                '# build_all.sh betigini calistir ve anlik ciktiyi al\n',
                'process = subprocess.Popen(["bash", "colab_docker/build_all.sh"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)\n',
                'while True:\n',
                '  output = process.stdout.readline()\n',
                '  if output == \'\' and process.poll() is not None:\n',
                '    break\n',
                '  if output:\n',
                '    print(output.strip())\n',
                '\n',
                'rc = process.poll()\n',
                'if rc == 0:\n',
                '  print("✅ Tüm imaj inşaları ve Google Drive yedeklemeleri başarıyla tamamlandı.")\n',
                'else:\n',
                '  print(f"❌ İnşa sırasında hata oluştu. Çıkış kodu: {rc}")\n',
                '  sys.exit(rc)\n'
            ]
            cell["source"] = new_source
            patched = True

if patched:
    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Notebook successfully updated with Kaniko & Registry integration.")
else:
    print("Docker setup cell not found in notebook.")
