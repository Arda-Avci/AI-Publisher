# ╔══════════════════════════════════════════════════════════════════╗
# ║  AI-Publisher Colab Docker Kurulum ve Sunucu Başlatıcı          ║
# ║  Bu hücreyi çalıştırın. Kurulumdan sonra oturum otomatik olarak║
# ║  yeniden başlatılacaktır. Sonra tekrar çalıştırın!              ║
# ╚══════════════════════════════════════════════════════════════════╝

import os
import sys
import subprocess
import time
import shutil

# 1. Google Drive Mount Kontrolü
if os.path.exists("/content"):
    if os.path.exists("/content/drive/MyDrive"):
        print("[OK] Google Drive bağlı ve erişilebilir!")
    else:
        print("[WARN] Google Drive bağlı görünmüyor. Lütfen defter hücresindeki mount onayını verdiğinizden emin olun.")

# 2. Host Sistem Bağımlılıkları (Sadece Flask, Requests, Pyngrok ve OpenCV yeterlidir)
def run_cmd(cmd, label="", max_retries=3):
    print(f"[INFO] Çalıştırılıyor: {label or cmd[:50]}...")
    for attempt in range(1, max_retries + 1):
        try:
            subprocess.run(cmd, shell=True, check=True)
            return True
        except Exception as e:
            print(f"[WARN] Deneme {attempt} başarısız: {e}")
            if attempt < max_retries:
                time.sleep(3)
            else:
                print(f"[ERROR] Komut tamamen başarısız oldu: {cmd}")
                return False

# Host bağımlılıklarının hızlı kurulumu
if not shutil.which("docker") or not os.path.exists("/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg"):
    print("[INFO] Docker ve NVIDIA Container Toolkit kurulumu başlatılıyor...")
    
    # Docker.io Kurulumu
    run_cmd("apt-get update -q && apt-get install -y -q docker.io", label="Docker.io Kurulumu")
    
    # NVIDIA Container Toolkit Kurulumu
    run_cmd("curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg", label="NVIDIA GPG Anahtarı")
    run_cmd("curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | tee /etc/apt/sources.list.d/nvidia-container-toolkit.list", label="NVIDIA Repo Listesi")
    run_cmd("apt-get update -q && apt-get install -y -q nvidia-container-toolkit", label="NVIDIA Toolkit Kurulumu")
    
    # Docker Runtime Yapılandırması
    run_cmd("nvidia-ctk runtime configure --runtime=docker", label="Docker NVIDIA Yapılandırması")
    
    # Docker Daemon'ı arka planda başlat
    print("[INFO] Docker Daemon başlatılıyor...")
    subprocess.run("pkill -9 dockerd || true", shell=True)
    subprocess.Popen(
        ["dockerd", "-b", "none", "--iptables=0", "--storage-driver=vfs"],
        stdout=open("dockerd.log", "w"),
        stderr=subprocess.STDOUT
    )
    
    # Hazır olmasını bekle
    docker_ready = False
    for _ in range(15):
        res = subprocess.run(["docker", "info"], capture_output=True)
        if res.returncode == 0:
            docker_ready = True
            print("[OK] Docker başarıyla başlatıldı!")
            break
        time.sleep(1)
        
    if not docker_ready:
        print("[WARN] Docker daemon henüz tam hazır değil, logları kontrol edin (dockerd.log).")
    
    # Python host kütüphaneleri
    run_cmd("pip install -q flask requests pyngrok opencv-python-headless numpy yt-dlp", label="Host Python Kütüphaneleri")
    
    print("\n" + "="*60)
    print("[INFO] Sistem kurulumu tamamlandı. Belleğin yenilenmesi için oturum kapatılıyor...")
    print("👉 Lütfen bu hücreyi TEKRAR ÇALIŞTIRIN.")
    print("="*60 + "\n")
    time.sleep(2)
    sys.exit(100)

else:
    print("[OK] Sistem bağımlılıkları ve Nvidia Toolkit kurulu.")
    
    # Docker Daemon'ın çalışıp çalışmadığını kontrol et ve çalışmıyorsa başlat
    res = subprocess.run(["docker", "info"], capture_output=True)
    if res.returncode != 0:
        print("[INFO] Docker Daemon aktif değil, arka planda başlatılıyor...")
        subprocess.run("pkill -9 dockerd || true", shell=True)
        subprocess.Popen(
            ["dockerd", "-b", "none", "--iptables=0", "--storage-driver=vfs"],
            stdout=open("dockerd.log", "w"),
            stderr=subprocess.STDOUT
        )
        # Hazır olmasını bekle
        for _ in range(15):
            res = subprocess.run(["docker", "info"], capture_output=True)
            if res.returncode == 0:
                print("[OK] Docker başarıyla başlatıldı!")
                break
            time.sleep(1)
        else:
            print("[ERROR] Docker Daemon başlatılamadı!")
            sys.exit(1)
    else:
        print("[OK] Docker Daemon zaten aktif.")

    
    # Google Drive Konteyner Dizinleri
    DRIVE_DIR = "/content/drive/MyDrive/Colab Notebooks/docker/images"
    os.makedirs(DRIVE_DIR, exist_ok=True)
    
    MODELS = ["cogvideox", "wan", "ltx", "hunyuan", "xtts", "audioldm2", "wav2lip", "musetalk", "whisper", "stablediffusion", "kokorotts"]
    
    # 3. Docker Imajlarının Google Drive'dan Yüklenmesi
    print("[INFO] Docker imajları kontrol ediliyor...")
    images_loaded = True
    for model in MODELS:
        # Imaj yüklü mü kontrol et
        res = subprocess.run(["docker", "images", "-q", f"ai-publisher-{model}:latest"], capture_output=True, text=True)
        if not res.stdout.strip():
            tar_path = f"{DRIVE_DIR}/{model}.tar.gz"
            if os.path.exists(tar_path):
                print(f"[INFO] Imaj yükleniyor: {model} (Google Drive'dan)...")
                run_cmd(f"docker load -i '{tar_path}'", label=f"{model} Docker Load")
            else:
                print(f"[WARN] {model} imajı Google Drive'da bulunamadı: {tar_path}")
                images_loaded = False
                
    # Imajlar eksikse build scriptini tetikleme seçeneği sunulur veya otomatik inşa edilir
    if not images_loaded:
        print("[INFO] Eksik Docker imajları tespit edildi. İnşa süreci başlatılıyor...")
        
        # 1. Registry Kurulumu ve Başlatılması
        if not os.path.exists("/usr/local/bin/registry"):
            print("[INFO] Docker Registry binary indiriliyor...")
            run_cmd("wget -q https://github.com/distribution/distribution/releases/download/v2.8.2/registry_2.8.2_linux_amd64.tar.gz")
            run_cmd("tar -xzf registry_2.8.2_linux_amd64.tar.gz registry")
            run_cmd("mv registry /usr/local/bin/registry")
            run_cmd("rm -f registry_2.8.2_linux_amd64.tar.gz")
            run_cmd("chmod +x /usr/local/bin/registry")
            
        # Registry için minimal config oluştur
        os.makedirs("/etc/docker/registry", exist_ok=True)
        config_content = """version: 0.1
log:
  fields:
    service: registry
storage:
  cache:
    blobdescriptor: inmemory
  filesystem:
    rootdirectory: /var/lib/registry
http:
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]
"""
        with open("/etc/docker/registry/config.yml", "w", encoding="utf-8") as cfg_f:
            cfg_f.write(config_content)
            
        # 2. Kaniko Kurulumu (Docker Imajından Kopyalayarak)
        if not os.path.exists("/usr/local/bin/kaniko"):
            print("[INFO] Kaniko executor binary Docker imajından kopyalanıyor...")
            run_cmd("docker pull gcr.io/kaniko-project/executor:latest")
            run_cmd("docker create --name kaniko-temp gcr.io/kaniko-project/executor:latest")
            run_cmd("docker cp kaniko-temp:/kaniko/executor /usr/local/bin/kaniko")
            run_cmd("docker rm kaniko-temp")
            run_cmd("chmod +x /usr/local/bin/kaniko")
            
        # 3. pigz Kurulumu
        run_cmd("apt-get update -q && apt-get install -y -q pigz")
        
        # 4. Registry'yi Arka Planda Başlat
        print("[INFO] Yerel registry baslatiliyor...")
        subprocess.run("pkill -f 'registry serve' || true", shell=True)
        subprocess.Popen(["/usr/local/bin/registry", "serve", "/etc/docker/registry/config.yml"], stdout=open("registry.log", "w"), stderr=subprocess.STDOUT)
        
        # Registry hazır olmasını bekle
        import urllib.request
        registry_ok = False
        for _ in range(15):
            try:
                urllib.request.urlopen("http://localhost:5000/v2/")
                print("[OK] Registry başarıyla başlatıldı ve yanıt veriyor!")
                registry_ok = True
                break
            except Exception:
                time.sleep(1)
                
        if not registry_ok:
            print("[ERROR] Yerel registry localhost:5000 portunda başlatılamadı!")
            if os.path.exists("registry.log"):
                with open("registry.log", "r") as log_f:
                    print("====== REGISTRY LOGLARI ======")
                    print(log_f.read())
            sys.exit(1)
                
        # 5. build_all.sh yolunu bul
        build_script = "/content/AI-Publisher/colab_docker/build_all.sh"
        if not os.path.exists(build_script):
            if os.path.exists("colab_docker/build_all.sh"):
                build_script = "colab_docker/build_all.sh"
            else:
                # GitHub fallback
                os.makedirs("colab_docker", exist_ok=True)
                for f_name in ["Dockerfile.base", "build_all.sh"]:
                    urllib.request.urlretrieve(f"https://raw.githubusercontent.com/Arda-Avci/AI-Publisher/main/colab_docker/{f_name}", f"colab_docker/{f_name}")
                for model in MODELS:
                    os.makedirs(f"colab_docker/{model}", exist_ok=True)
                    for file_in_model in ["Dockerfile", "app.py"]:
                        try:
                            urllib.request.urlretrieve(f"https://raw.githubusercontent.com/Arda-Avci/AI-Publisher/main/colab_docker/{model}/{file_in_model}", f"colab_docker/{model}/{file_in_model}")
                        except: pass
                build_script = "colab_docker/build_all.sh"
                
        os.chmod(build_script, 0o755)
        print(f"[INFO] Imajlar Kaniko ile sıfırdan inşa ediliyor (Google Drive'a kaydedilir)...")
        current_dir = os.getcwd()
        os.chdir(os.path.dirname(build_script))
        run_cmd(f"./{os.path.basename(build_script)}", label="Tüm Konteynerleri İnşa Et")
        os.chdir(current_dir)
        
    # 4. Host Supervisor Sunucusunun Başlatılması
    print("[INFO] colab_server.py güncelleniyor...")
    repo_server_path = "/content/AI-Publisher/colab_server.py"
    if os.path.exists(repo_server_path):
        import shutil
        shutil.copy(repo_server_path, "colab_server.py")
        print("[OK] colab_server.py kopyalandı!")
    else:
        try:
            import urllib.request
            urllib.request.urlretrieve("https://raw.githubusercontent.com/Arda-Avci/AI-Publisher/main/colab_server.py", "colab_server.py")
            print("[OK] colab_server.py indirildi!")
        except Exception as dl_e:
            print(f"[WARN] colab_server.py güncellenemedi, mevcut olan kullanılacak: {dl_e}")
            
    print("[INFO] Eski ngrok süreçleri sonlandırılıyor...")
    subprocess.run("pkill -9 ngrok", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if os.path.exists("ngrok_url.txt"):
        try: os.remove("ngrok_url.txt")
        except: pass
        
    NGROK_TOKEN = os.environ.get("NGROK_TOKEN", "")
    if not NGROK_TOKEN:
        try:
            from google.colab import userdata
            NGROK_TOKEN = userdata.get('NGROK_TOKEN')
        except: pass
        
    if not NGROK_TOKEN or NGROK_TOKEN == "BURAYA_NGROK_TOKEN_GELECEK":
        if sys.stdin.isatty():
            NGROK_TOKEN = input("Ngrok Auth Token'ınızı girin: ").strip()
        else:
            print("[ERROR] NGROK_TOKEN bulunamadı.")
            sys.exit(1)
            
    server_env = os.environ.copy()
    server_env["NGROK_TOKEN"] = NGROK_TOKEN
    
    print("[INFO] Host Supervisor Sunucu başlatılıyor...")
    with open("colab_server.log", "w", encoding="utf-8") as log_file:
        subprocess.Popen(
            [sys.executable, "-u", "colab_server.py"],
            stdout=log_file,
            stderr=subprocess.STDOUT,
            env=server_env
        )
        
    print("[INFO] Tünel kuruluyor ve Ngrok URL bekleniyor...")
    for _ in range(60):
        if os.path.exists("ngrok_url.txt"):
            with open("ngrok_url.txt", "r", encoding="utf-8") as f:
                url = f.read().strip()
            print(f"\n🔗 NODE.JS PROJENİZE YAPIŞTIRACAĞINIZ URL:\n{url}\n")
            
            # Canlı Log Akışı
            print("====== CANLI SUNUCU LOGLARI ======")
            with open("colab_server.log", "r", encoding="utf-8") as log_f:
                try:
                    while True:
                        line = log_f.readline()
                        if not line:
                            time.sleep(0.5)
                            continue
                        sys.stdout.write(line)
                        sys.stdout.flush()
                except KeyboardInterrupt:
                    print("\n[INFO] Log akışı sonlandırıldı. Sunucu arka planda çalışıyor.")
            break
        time.sleep(1)
    else:
        print("\n⚠️ Ngrok URL alınamadı. Detaylar için colab_server.log dosyasını inceleyin.")
        if os.path.exists("colab_server.log"):
            with open("colab_server.log", "r", encoding="utf-8") as f:
                print(f.read())
