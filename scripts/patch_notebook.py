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
        
        has_docker_setup = cell.get("metadata", {}).get("id") == "build-docker-images"
        
        if has_docker_setup:

            new_source = [
                '#@title 🛠️ Seçenek C: Tüm Docker İmajlarını İnşa Et (Maliyet Tasarruflu CPU Modu)\n',
                'GITHUB_TOKEN = "" #@param {type:"string"}\n',
                '\n',
                'from google.colab import drive\n',
                'drive.mount(\'/content/drive\')\n',
                '\n',
                'import subprocess\n',
                'import os\n',
                'import time\n',
                'import urllib.request\n',
                'import sys\n',
                'import shutil\n',
                'from google.colab import userdata\n',
                '\n',
                '# 1. Depoyu Klonla (Eğer yoksa)\n',
                'repo_dir = "/content/AI-Publisher"\n',
                'if not os.path.exists(repo_dir):\n',
                '  print("Repository klonlanıyor...")\n',
                '  if not GITHUB_TOKEN:\n',
                '    try:\n',
                '      GITHUB_TOKEN = userdata.get(\'GITHUB_TOKEN\')\n',
                '    except: pass\n',
                '  if not GITHUB_TOKEN:\n',
                '    GITHUB_TOKEN = input("GitHub token: ").strip()\n',
                '  \n',
                '  repo_url = f"https://{GITHUB_TOKEN}@github.com/Arda-Avci/AI-Publisher.git"\n',
                '  subprocess.run(["git", "clone", repo_url, repo_dir], check=True)\n',
                '\n',
                '# 2. Docker Kurulumu ve Daemon Başlatılması\n',
                'if not shutil.which("docker"):\n',
                '  print("[INFO] Docker.io paketi kuruluyor...")\n',
                '  subprocess.run("apt-get update -q && apt-get install -y -q docker.io", shell=True, check=True)\n',
                '\n',
                'res = subprocess.run(["docker", "info"], capture_output=True)\n',
                'if res.returncode != 0:\n',
                '  print("[INFO] Docker Daemon aktif değil, arka planda başlatılıyor...")\n',
                '  subprocess.run("pkill -9 dockerd || true", shell=True)\n',
                '  subprocess.Popen(["dockerd", "-b", "none", "--iptables=0", "--storage-driver=vfs"], stdout=open("dockerd.log", "w"), stderr=subprocess.STDOUT)\n',
                '  for _ in range(15):\n',
                '    res = subprocess.run(["docker", "info"], capture_output=True)\n',
                '    if res.returncode == 0:\n',
                '      print("[OK] Docker başarıyla başlatıldı!")\n',
                '      break\n',
                '    time.sleep(1)\n',
                '\n',
                '# 3. Go Registry İndir ve Kur\n',
                'if not os.path.exists("/usr/local/bin/registry"):\n',
                '  print("[INFO] Docker Registry binary indiriliyor...")\n',
                '  subprocess.run("wget -q https://github.com/distribution/distribution/releases/download/v2.8.2/registry_2.8.2_linux_amd64.tar.gz", shell=True)\n',
                '  subprocess.run("tar -xzf registry_2.8.2_linux_amd64.tar.gz registry", shell=True)\n',
                '  subprocess.run("mv registry /usr/local/bin/registry", shell=True)\n',
                '  subprocess.run("rm -f registry_2.8.2_linux_amd64.tar.gz", shell=True)\n',
                '  subprocess.run("chmod +x /usr/local/bin/registry", shell=True)\n',
                '\n',
                '# 4. Kaniko İndir ve Kur (Docker Imajından Kopyalayarak)\n',
                'if not os.path.exists("/usr/local/bin/kaniko"):\n',
                '  print("[INFO] Kaniko executor binary Docker imajından kopyalanıyor...")\n',
                '  subprocess.run("docker pull gcr.io/kaniko-project/executor:latest", shell=True, check=True)\n',
                '  subprocess.run("docker create --name kaniko-temp gcr.io/kaniko-project/executor:latest", shell=True, check=True)\n',
                '  subprocess.run("docker cp kaniko-temp:/kaniko/executor /usr/local/bin/kaniko", shell=True, check=True)\n',
                '  subprocess.run("docker rm kaniko-temp", shell=True, check=True)\n',
                '  subprocess.run("chmod +x /usr/local/bin/kaniko", shell=True, check=True)\n',
                '\n',
                '# 5. pigz İndir (paralel gzip sıkıştırma için)\n',
                'subprocess.run("apt-get update && apt-get install -y pigz", shell=True)\n',
                '\n',
                'print("✅ Kurulumlar tamamlandi.")\n',

                '\n',
                '# 5. Registry\'yi Arka Planda Başlat\n',
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
                '# 6. Insa Betigini Tetikle\n',
                'print("==========================================")\n',
                'print("🚀 Docker Imajlarının Insa Edilmesi Baslatiliyor...")\n',
                'print("==========================================")\n',
                '\n',
                'os.chdir(repo_dir)\n',
                '\n',
                '# Son demleri git pull ile cekelim\n',
                'subprocess.run("git pull origin main || true", shell=True)\n',
                'subprocess.run("chmod +x colab_docker/build_all.sh", shell=True)\n',
                '\n',
                '# colab_docker dizinine gir\n',
                'os.chdir(os.path.join(repo_dir, "colab_docker"))\n',
                '\n',
                '# build_all.sh betigini calistir ve anlik ciktiyi al\n',
                'process = subprocess.Popen(["bash", "build_all.sh"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)\n',

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
            
        # Hücre 1 (Ana Sunucu Başlatıcı) hücresini yamalayalım
        has_server_run = False
        for line in source:
            if "repo_url = f\"https://{GITHUB_TOKEN}@github.com/Arda-Avci/AI-Publisher.git\"" in line:
                has_server_run = True
                break
                
        if has_server_run:
            has_drive_mount = False
            for line in source:
                if "drive.mount" in line:
                    has_drive_mount = True
                    break
            
            if not has_drive_mount:
                new_source = []
                new_source.append("from google.colab import drive\n")
                new_source.append("drive.mount('/content/drive')\n")
                new_source.append("\n")
                new_source.extend(source)
                cell["source"] = new_source
                patched = True

if patched:
    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Notebook successfully updated with Kaniko & Registry integration.")
else:
    print("Docker setup cell not found in notebook.")
