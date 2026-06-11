# ╔══════════════════════════════════════════════════════════════════╗
# ║  AI-Publisher Colab Kurulum ve Sunucu Başlatıcı (Tek Hücre)    ║
# ║  Bu hücreyi çalıştırın. Kurulumdan sonra oturum otomatik olarak║
# ║  yeniden başlatılacaktır. Sonra tekrar çalıştırın!              ║
# ╚══════════════════════════════════════════════════════════════════╝

import os
import sys
import subprocess
import time

# Modern transformers kütüphanesinde kaldırılan veya değişen is_..._available ve
# is_..._greater_or_equal fonksiyonlarının coqui-tts (TTS) ile uyumluluk sağlaması
# amacıyla import_utils modülünün evrensel bir ModuleProxy ile sarmalanması.
try:
    import sys
    import transformers
    import transformers.utils.import_utils as imp_utils

    class ModuleProxy:
        def __init__(self, wrapped):
            self._wrapped = wrapped
        def __getattr__(self, name):
            try:
                return getattr(self._wrapped, name)
            except AttributeError:
                if name.startswith('is_') and name.endswith('_available'):
                    return lambda *args, **kwargs: False
                if 'greater_or_equal' in name:
                    return lambda *args, **kwargs: True
                raise AttributeError(f"module '{self._wrapped.__name__}' has no attribute '{name}'")

    proxy = ModuleProxy(imp_utils)
    sys.modules['transformers.utils.import_utils'] = proxy
    transformers.utils.import_utils = proxy
    print("[INFO] Transformers import_utils proxy-patched.")

    # transformers.pytorch_utils: isin_mps_friendly, coqui-tts (TTS) tarafından istenir
    # Bu fonksiyon transformers >=4.47'de var; eski sürümlerde monkey patch ile eklenir
    import transformers.pytorch_utils as pyt_utils
    if not hasattr(pyt_utils, 'isin_mps_friendly'):
        def _isin_mps_friendly(elems, test_elem, name):
            return test_elem in elems
        pyt_utils.isin_mps_friendly = _isin_mps_friendly
        transformers.pytorch_utils.isin_mps_friendly = _isin_mps_friendly
        print("[INFO] transformers.pytorch_utils.isin_mps_friendly patched.")
except Exception as patch_e:
    print(f"[WARN] Monkey patch uygulanamadı: {patch_e}")

already_installed = True
import_errors = []

packages_to_check = [
    ("diffusers", "import diffusers"),
    ("transformers", "import transformers"),
    ("flask", "import flask"),
    ("pyngrok", "from pyngrok import ngrok"),
    ("faster_whisper", "from faster_whisper import WhisperModel"),
    ("yt_dlp", "import yt_dlp"),
    ("face_recognition", "import face_recognition"),
    ("decord", "import decord"),
    ("TTS", "from TTS.api import TTS")
]

print("[INFO] Bağımlılıklar kontrol ediliyor...")
for pkg_name, import_stmt in packages_to_check:
    try:
        exec(import_stmt)
        print(f"[OK] {pkg_name} başarıyla import edildi.")
    except Exception as e:
        already_installed = False
        import_errors.append(f"{pkg_name}: {e}")
        print(f"[FAIL] {pkg_name} import hatası: {e}")

if not already_installed:
    print(f"\n[WARN] Bazı bağımlılıklar eksik veya yüklenemedi. Tespit edilen hatalar:")
    for err in import_errors:
        print(f"  - {err}")

def run_cmd(cmd):
    try:
        print(f"[INFO] Running: {cmd}")
        subprocess.run(cmd, shell=True, check=True)
    except Exception as e:
        print(f"[WARN] Command failed: {cmd}. Error: {e}")

if not already_installed:
    print("[INFO] Gerekli paketler bulunamadı. Kurulum başlatılıyor...")

    # SymPy / mpmath AttributeError çakışma önlemi
    run_cmd('pip uninstall -y sympy mpmath')
    run_cmd('pip install sympy mpmath --no-cache-dir')

    # NOT: Colab base imajında PyTorch 2.9+ yüklü; downgrade kalıcı olmuyor.
    # PyTorch olduğu gibi bırakılır, torchcodec ayrıca kurulur.

    # Ana ML kütüphaneleri ve Flask, pyngrok sürüm sabitlemeleriyle
    # transformers >=4.47 (coqui-tts, isin_mps_friendly fonksiyonunu ister)
    # Üst sınır yok — monkey patch (ModuleProxy) 4.47+ import_utils değişikliklerini yönetir
    run_cmd("pip install -q --upgrade 'transformers>=4.46' 'diffusers>=0.35,<0.36' accelerate flask pyngrok imageio imageio-ffmpeg scipy opencv-python-headless sentencepiece")

    # Coqui TTS ve sistem ses paketleri (XTTS-v2 için)
    # torchcodec, PyTorch 2.9+ için TTS'in ihtiyaç duyduğu ses kodek kütüphanesi
    run_cmd('apt-get install -y espeak-ng espeak')
    run_cmd('pip install -q coqui-tts')
    run_cmd('pip install -q torchcodec')

    # ModelScope T2V ek paketler
    run_cmd('pip install -q "decord>=0.6.0" "open_clip_torch"')

    # Wav2Lip Repo
    if not os.path.exists('Wav2Lip'):
        run_cmd('git clone -q https://github.com/Rudrabha/Wav2Lip.git')

    # Wav2Lip & Face detection paketleri
    run_cmd('pip install -q face_recognition_models')
    run_cmd('pip install -q face_recognition opencv-python-headless librosa')

    # Altyazı çıkarıcı (faster-whisper)
    run_cmd('pip install -q faster-whisper')

    # Video indirici (yt-dlp) — colab_server.py ve özgünleştirme için
    run_cmd('pip install -q yt-dlp')

    # Rubberband ses senkronizasyonu (Auto-Synced-Translated-Dubs)
    run_cmd('pip install -q pyrubberband soundfile')
    run_cmd('apt-get install -y rubberband-cli rubberband-ladspa')

    # Alternatif TTS sağlayıcıları (Lobe Chat / OpenAI / Edge)
    run_cmd('pip install -q openai edge-tts')

    # GFPGAN + RealESRGAN yüz düzeltme ve upscale (stable-diffusion-webui)
    run_cmd('pip install -q gfpgan realesrgan basicsr')

    # Wav2Lip checkpoint (~400MB) indirme zinciri
    WAV2LIP_CKPT_SOURCES = [
        "https://huggingface.co/vinthony/SadTalker/resolve/main/wav2lip.pth",
        "https://huggingface.co/gmk123/wav2lip/resolve/main/wav2lip.pth",
    ]
    os.makedirs('/content/Wav2Lip/checkpoints', exist_ok=True)
    
    ckpt_ok = False
    for url in WAV2LIP_CKPT_SOURCES:
        print(f"[INFO] Wav2Lip deneniyor: {url[:80]}...")
        run_cmd(f'wget -q --show-progress -O /content/Wav2Lip/checkpoints/wav2lip.pth "{url}"')
        if os.path.exists('/content/Wav2Lip/checkpoints/wav2lip.pth') and os.path.getsize('/content/Wav2Lip/checkpoints/wav2lip.pth') > 100000000:
            print("[OK] Wav2Lip checkpoint indirildi.")
            ckpt_ok = True
            break
        else:
            print("[WARN] İndirilemedi veya dosya boyutu yetersiz (<100MB)")

    if not ckpt_ok:
        print("⚠️ Wav2Lip checkpoint hiçbir kaynaktan indirilemedi.")
        print("   Lütfen manuel olarak indirip /content/Wav2Lip/checkpoints/wav2lip.pth konumuna yükleyin.")

    # Opsiyonel GAN varyantı
    run_cmd('wget -q --show-progress -O /content/Wav2Lip/checkpoints/wav2lip_gan.pth "https://huggingface.co/Nekochu/Wav2Lip/resolve/main/wav2lip_gan.pth"')



    print("\n" + "="*60)
    print("⚠️  ÖNEMLİ: Kurulum tamamlandı!")

    print("PyTorch ve SymPy kütüphanelerinin çakışmaması ve belleğin yenilenmesi için:")
    print("👉 Python oturumu (kernel) otomatik olarak YENİDEN BAŞLATILIYOR...")
    print("👉 Yeniden başlatma tamamlandıktan sonra, lütfen bu hücreyi TEKRAR ÇALIŞTIRIN.")
    print("="*60 + "\n")
    time.sleep(2)
    os.kill(os.getpid(), 9)

else:
    print("[OK] Bağımlılıklar hazır. Sunucu başlatılıyor...")
    
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

    print("[INFO] Eski ngrok süreçleri temizleniyor...")
    try:
        subprocess.run("pkill -9 ngrok", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except:
        pass

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
    for _ in range(60):
        if os.path.exists("ngrok_url.txt"):
            with open("ngrok_url.txt", "r", encoding="utf-8") as f:
                url = f.read().strip()
            print(f"\n🔗 NODE.JS PROJENİZE YAPIŞTIRACAĞINIZ URL:\n{url}\n")
            
            # CANLI LOG TAKİBİ (tail -f)
            print("[INFO] Sunucu logları canlı olarak akıtılıyor. Durdurmak için hücreyi interrupt edebilirsiniz.")
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
                    print("\n[INFO] Log takibi durduruldu. Sunucu arka planda çalışmaya devam ediyor.")
            break
        time.sleep(1)
    else:
        print("\n⚠️ Ngrok URL'i 60 saniye içinde alınamadı. Detaylar aşağıda sunulmuştur:\n")
        if os.path.exists("colab_server.log"):
            print("====== colab_server.log DETAYI ======")
            with open("colab_server.log", "r", encoding="utf-8") as f:
                print(f.read())
            print("======================================\n")
