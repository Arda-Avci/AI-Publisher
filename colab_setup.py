# ╔══════════════════════════════════════════════════════════════════╗
# ║  AI-Publisher Colab Kurulum Hücresi  (v4 - Wav2Lip)            ║
# ║  Runtime → Run All  ile başlatın                                 ║
# ╚══════════════════════════════════════════════════════════════════╝

import os
import subprocess
import sys

# Google Colab/Jupyter notebook shell command helper
def run_cmd(cmd):
    try:
        print(f"[INFO] Running: {cmd}")
        subprocess.run(cmd, shell=True, check=True)
    except Exception as e:
        print(f"[WARN] Command failed: {cmd}. Error: {e}")

# --- Hücre 1: Bağımlılık Kurulumu ---
# Bu hücreyi bir kez çalıştırın, kernel yeniden başlatmayın.

# Ssympy / mpmath AttributeError hatasını önlemek için temiz kurulum
run_cmd('pip uninstall -y sympy mpmath')
run_cmd('pip install sympy mpmath --no-cache-dir')

run_cmd('pip install -q flask pyngrok diffusers transformers accelerate imageio imageio-ffmpeg scipy opencv-python-headless sentencepiece')

# ModelScope T2V için ek bağımlılıklar
run_cmd('pip install -q "decord>=0.6.0" "open_clip_torch"')

# S3 — Wav2Lip (gerçek dudak senkronizasyonu) kurulumu
if not os.path.exists('Wav2Lip'):
    run_cmd('git clone -q https://github.com/Rudrabha/Wav2Lip.git')

if os.path.exists('Wav2Lip'):
    run_cmd('pip install -q -r Wav2Lip/requirements.txt')

# face detection (S3) — Wav2Lip inference'ın ihtiyaç duyduğu paketler
run_cmd('pip install -q face_recognition opencv-python-headless librosa')

# Wav2Lip checkpoint (~400MB) — fallback zinciri ile indir.
# S4: Önce HuggingFace mirror'ı dene (ücretsiz, rate limit yok), başarısızsa
# orijinal SharePoint linkine düş. İkisi de başarısız olursa kullanıcıya
# net bir mesaj göster.

import os

# S4: Wav2Lip checkpoint kaynak listesi — ilk başarılı olan kullanılır.
# HuggingFace mirror tercih edilir (rate limit yok). İsterseniz kendi
# HuggingFace hesabınıza "Wav2Lip" adıyla bir model yükleyip URL'i
# buraya yazabilirsiniz (örn. https://huggingface.co/<org>/Wav2Lip/resolve/main/wav2lip.pth)
WAV2LIP_CKPT_SOURCES = [
    "https://huggingface.co/vinthony/SadTalker/resolve/main/wav2lip.pth",
    "https://huggingface.co/gmk123/wav2lip/resolve/main/wav2lip.pth",
]

# Create checkpoints folder
os.makedirs('/content/Wav2Lip/checkpoints', exist_ok=True)

ckpt_ok = False
for url in WAV2LIP_CKPT_SOURCES:
    print(f"[INFO] Wav2Lip deneniyor: {url[:80]}...")
    run_cmd(f'wget -q --show-progress -O /content/Wav2Lip/checkpoints/wav2lip.pth "{url}"')
    if os.path.exists('/content/Wav2Lip/checkpoints/wav2lip.pth') and os.path.getsize('/content/Wav2Lip/checkpoints/wav2lip.pth') > 100000000:
        print("[OK] Wav2Lip checkpoint indirildi")
        ckpt_ok = True
        break
    else:
        print("[WARN] İndirilemedi veya boyut < 100MB")

if not ckpt_ok:
    print("⚠️ Wav2Lip checkpoint HİÇBİR kaynaktan indirilemedi.")
    print("   Lütfen aşağıdaki adreslerden birini tarayıcıdan indirip")
    print("   /content/Wav2Lip/checkpoints/wav2lip.pth olarak yükleyin.")
    for url in WAV2LIP_CKPT_SOURCES:
        print(f"   - {url}")

# GAN varyantı — opsiyonel
run_cmd('wget -q --show-progress -O /content/Wav2Lip/checkpoints/wav2lip_gan.pth "https://huggingface.co/Nekochu/Wav2Lip/resolve/main/wav2lip_gan.pth"')

print("\n" + "="*60)
print("⚠️  ÖNEMLİ: Kurulum tamamlandı!")
print("PyTorch ve SymPy kütüphanelerinin çakışmaması ve belleğin yenilenmesi için:")
print("👉 Lütfen yukarıdaki menüden 'Runtime > Restart session' (Çalışma zamanı > Oturumu Yeniden Başlat) yapın.")
print("👉 Oturumu yeniden başlattıktan sonra doğrudan 'Sunucuyu Başlat' hücresini çalıştırabilirsiniz.")
print("="*60 + "\n")

# --- Hücre 2: Sunucuyu Başlat ---
# Kurulum tamamlandıktan sonra bu hücreyi çalıştırın.

import subprocess, sys
import os

NGROK_TOKEN = os.environ.get("NGROK_TOKEN", "")
if not NGROK_TOKEN:
    try:
        from google.colab import userdata
        NGROK_TOKEN = userdata.get('NGROK_TOKEN')
    except:
        pass

if not NGROK_TOKEN or NGROK_TOKEN == "BURAYA_NGROK_TOKEN_GELECEK":
    print("\n🔑 NGROK_TOKEN bulunamadı.")
    NGROK_TOKEN = input("Lütfen Ngrok Auth Token'ınızı girin: ").strip()

if not os.path.exists("colab_server.py"):
    print("\n⚠️  colab_server.py bulunamadı!")
    print("👉 Lütfen bilgisayarınızdaki 'colab_server.py' dosyasını seçip yükleyin:\n")
    try:
        from google.colab import files
        uploaded = files.upload()
        if "colab_server.py" not in uploaded:
            print("❌ colab_server.py dosyası yüklenmedi! Başlatma iptal edildi.")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Dosya yükleme arayüzü açılamadı: {e}")
        print("👉 Lütfen sol paneldeki klasör simgesine tıklayıp 'colab_server.py' dosyasını sürükleyip bırakın.")
        sys.exit(1)

print("[INFO] colab_server.py arka planda başlatılıyor...")
if os.path.exists("ngrok_url.txt"):
    try: os.remove("ngrok_url.txt")
    except: pass

server_env = os.environ.copy()
server_env["NGROK_TOKEN"] = NGROK_TOKEN

with open("colab_server.log", "w", encoding="utf-8") as log_file:
    subprocess.Popen(
        [sys.executable, "-u", "colab_server.py"],
        stdout=log_file,
        stderr=subprocess.STDOUT,
        env=server_env
    )
print("[OK] Sunucu başlatıldı. Çıktılar colab_server.log dosyasına yazılıyor.")

import time
print("[INFO] Ngrok bağlantısı kuruluyor ve URL bekleniyor...")
for _ in range(30):
    if os.path.exists("ngrok_url.txt"):
        with open("ngrok_url.txt", "r", encoding="utf-8") as f:
            url = f.read().strip()
        print(f"\n🔗 NODE.JS PROJENİZE YAPIŞTIRACAĞINIZ URL:\n{url}\n")
        break
    time.sleep(1)
else:
    print("\n⚠️ Ngrok URL'i 30 saniye içinde alınamadı. Detaylar aşağıda sunulmuştur:\n")
    if os.path.exists("colab_server.log"):
        print("====== colab_server.log DETAYI ======")
        with open("colab_server.log", "r", encoding="utf-8") as f:
            print(f.read())
        print("======================================\n")


# NOT: colab_server.py dosyasını Google Drive'dan veya aşağıdaki gibi
# doğrudan yükleyebilirsiniz:
# from google.colab import files; files.upload()
