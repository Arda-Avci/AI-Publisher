# ╔══════════════════════════════════════════════════════════════════╗
# ║  AI-Publisher Colab Kurulum ve Sunucu Başlatıcı (Tek Hücre)    ║
# ║  Bu hücreyi çalıştırın. Kurulumdan sonra oturum otomatik olarak║
# ║  yeniden başlatılacaktır. Sonra tekrar çalıştırın!              ║
# ╚══════════════════════════════════════════════════════════════════╝

import os
import sys
import subprocess
import time

# Google Drive mount (G-Drive model önbellekleme desteği için)
if os.path.exists("/content"):
    try:
        from google.colab import drive
        print("[INFO] Mounting Google Drive for model cache...")
        drive.mount('/content/drive')
        os.makedirs('/content/drive/MyDrive/Colab_Cache/huggingface', exist_ok=True)
        os.makedirs('/content/drive/MyDrive/Colab_Cache/torch', exist_ok=True)
        os.environ["HF_HOME"] = "/content/drive/MyDrive/Colab_Cache/huggingface"
        os.environ["TORCH_HOME"] = "/content/drive/MyDrive/Colab_Cache/torch"
        print("[OK] Google Drive model önbellek dizinleri başarıyla bağlandı!")
    except Exception as drive_e:
        print(f"[WARN] Google Drive mount edilemedi, modeller her seferinde sıfırdan indirilecek: {drive_e}")

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
    ("TTS (coqui-tts)", "try:\n            from TTS.api import TTS\n        except Exception as tts_import_e:\n            if 'numpy' in str(tts_import_e):\n                pass # Ignore numpy 2.x migration warnings that throw on import\n            else:\n                raise tts_import_e"),
    ("faster_whisper", "from faster_whisper import WhisperModel"),
    ("whisper", "import whisper"),
    ("yt_dlp", "import yt_dlp"),
    ("face_recognition", "import face_recognition"),
    ("decord", "import decord"),
    ("rembg", "import rembg"),
    ("pyrubberband", "import pyrubberband"),
    ("gfpgan", "import gfpgan"),
    ("realesrgan", "import realesrgan"),
    ("basicsr", "import basicsr"),
    ("edge-tts", "import edge_tts")
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

def run_cmd(cmd, max_retries=3, delay=5):
    for attempt in range(1, max_retries + 1):
        try:
            print(f"[INFO] Running (Attempt {attempt}/{max_retries}): {cmd}")
            subprocess.run(cmd, shell=True, check=True)
            return True
        except Exception as e:
            print(f"[WARN] Attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(delay)
            else:
                print(f"[ERROR] Command failed after {max_retries} attempts: {cmd}")
                return False

if not already_installed:
    print("[INFO] Gerekli paketler bulunamadı. Kurulum başlatılıyor...")

    # Öncelikle hızlı paket kurulumu için uv paket yöneticisini kuruyoruz
    run_cmd('pip install uv')

    # NumPy 2.x compile ve cython hatalarını önlemek için NumPy'ı 1.x sürümünde sabitliyoruz
    run_cmd('uv pip install --system "numpy<2.0.0" --no-cache-dir')

    # SymPy / mpmath AttributeError çakışma önlemi
    run_cmd('pip uninstall -y sympy mpmath')
    run_cmd('uv pip install --system sympy mpmath --no-cache-dir')

    # Ana ML kütüphaneleri ve Flask, pyngrok sürüm sabitlemeleriyle
    # transformers >=4.47 (coqui-tts, isin_mps_friendly fonksiyonunu ister)
    # Üst sınır yok — monkey patch (ModuleProxy) 4.47+ import_utils değişikliklerini yönetir
    run_cmd("uv pip install --system --prefer-binary --no-cache-dir --upgrade 'transformers>=4.46' 'diffusers>=0.35,<0.36' accelerate flask pyngrok imageio imageio-ffmpeg scipy opencv-python-headless sentencepiece")

    # Arka plan temizleme (rembg)
    run_cmd('uv pip install --system --prefer-binary --no-cache-dir rembg')

    # ModelScope T2V ek paketler
    run_cmd('uv pip install --system --prefer-binary --no-cache-dir "decord>=0.6.0" "open_clip_torch"')

    # Wav2Lip Repo
    if not os.path.exists('Wav2Lip'):
        run_cmd('git clone https://github.com/Rudrabha/Wav2Lip.git')

    # Wav2Lip & Face detection paketleri
    run_cmd('uv pip install --system --prefer-binary --no-cache-dir face_recognition_models')
    run_cmd('uv pip install --system --prefer-binary --no-cache-dir face_recognition opencv-python-headless librosa')

    # Altyazı çıkarıcı (faster-whisper ve openai-whisper fallback)
    run_cmd('uv pip install --system --prefer-binary --no-cache-dir faster-whisper')
    run_cmd('uv pip install --system --prefer-binary --no-cache-dir openai-whisper')

    # Video indirici (yt-dlp) — colab_server.py ve özgünleştirme için
    run_cmd('uv pip install --system --prefer-binary --no-cache-dir yt-dlp')

    # Rubberband ses senkronizasyonu (Auto-Synced-Translated-Dubs)
    run_cmd('uv pip install --system --prefer-binary --no-cache-dir pyrubberband soundfile')
    run_cmd('apt-get install -y rubberband-cli rubberband-ladspa')

    # XTTS-v2 (coqui-tts) ve sistem bağımlılıkları (espeak-ng)
    run_cmd('apt-get install -y espeak-ng espeak libsndfile1')
    run_cmd('uv pip install --system --prefer-binary --no-cache-dir coqui-tts')

    # Alternatif TTS sağlayıcıları (Lobe Chat / OpenAI / Edge)
    run_cmd('uv pip install --system --prefer-binary --no-cache-dir openai edge-tts')

    # GFPGAN + RealESRGAN yüz düzeltme ve upscale (stable-diffusion-webui)
    run_cmd('uv pip install --system --prefer-binary --no-cache-dir gfpgan realesrgan basicsr')

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
    sys.exit(100)

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
        if sys.stdin.isatty():
            print("\n🔑 NGROK_TOKEN bulunamadı.")
            NGROK_TOKEN = input("Lütfen Ngrok Auth Token'ınızı girin: ").strip()
        else:
            print("\n❌ NGROK_TOKEN bulunamadı ve etkileşimsiz ortamda çalışılıyor. Lütfen çevre değişkeni veya userdata Secrets üzerinden NGROK_TOKEN tanımlayın.")
            sys.exit(1)

    print("\n[INFO] colab_server.py güncelleniyor...")
    repo_server_path = "/content/AI-Publisher/colab_server.py"
    if os.path.exists(repo_server_path):
        try:
            import shutil
            shutil.copy(repo_server_path, "colab_server.py")
            print("[OK] colab_server.py yerel git deposundan kopyalandı ve güncellendi!")
        except Exception as copy_e:
            print(f"[WARN] Yerel depodan kopyalanamadı: {copy_e}")
    else:
        try:
            import urllib.request
            urllib.request.urlretrieve("https://raw.githubusercontent.com/Arda-Avci/AI-Publisher/main/colab_server.py", "colab_server.py")
            print("[OK] colab_server.py GitHub raw URL üzerinden başarıyla indirildi ve güncellendi!")
        except Exception as dl_e:
            print(f"[WARN] GitHub'dan otomatik indirilemedi/güncellenemedi: {dl_e}")
            if not os.path.exists("colab_server.py"):
                print("❌ colab_server.py bulunamadı ve raw linkten indirilemedi. Başlatma iptal edildi.")
                sys.exit(1)
            else:
                print("[INFO] Mevcut yerel colab_server.py dosyası kullanılacak.")

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
