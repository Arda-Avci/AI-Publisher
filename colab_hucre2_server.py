# ╔══════════════════════════════════════════════════════════════════╗
# ║  colab_hucre2_server.py                                         ║
# ║  Sunucuyu Başlat — Colab'da ikinci hücre olarak çalıştır         ║
# ║  (colab_server.py dosyasını arka planda Popen ile tetikler)     ║
# ╚══════════════════════════════════════════════════════════════════╝

import subprocess, sys
import os
import time

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
