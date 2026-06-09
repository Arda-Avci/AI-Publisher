# ╔══════════════════════════════════════════════════════════════════╗
# ║  colab_hucre1_dependencies.py                                  ║
# ║  Bağımlılık kurulumu — Colab'da bir kez çalıştır              ║
# ║  Runtime > Restart session gerektirebilir                      ║
# ╚══════════════════════════════════════════════════════════════════╝

import subprocess, os

def run(cmd, timeout=300, label=""):
    print(f"\n[KURULUM] {label or cmd[:60]}...")
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True,
                           text=True, timeout=timeout)
        if r.returncode == 0:
            print(f"  ✅ {label or 'Tamam'}")
            return True
        else:
            stderr = r.stderr.strip()
            if stderr:
                for line in stderr.splitlines()[:5]:
                    print(f"  ❌ {line}")
            else:
                print(f"  ❌ returncode={r.returncode}")
            return False
    except subprocess.TimeoutExpired:
        print(f"  ❌ ZAMAN AŞIMI ({timeout}s)")
        return False
    except Exception as e:
        print(f"  ❌ {e}")
        return False

# SymPy/mpmath çakışması
run("pip uninstall -y sympy mpmath -q", label="SymPy temizliği")
run("pip install sympy mpmath --no-cache-dir -q", label="SymPy yeniden kurulum")

# Ana ML paketleri
# transformers~4.44 TTS xttsv2 ile uyumlu (isin_mps_friendly mevcut)
# Piper TTS (coqui-tts yerine — transformers çakışması yok)
run("pip install -q piper-tts --no-deps", label="Piper TTS (bağımlılıksız)")

# gTTS (Google TTS) — model gerekmez, internet yeterli
run("pip install -q gtts", label="gTTS (Google TTS)")

# TÜM PAKETLERİ TEK KOMUTTA SABİTLE — versiyon uyumsuzluğunu çöz
run("pip install -q --upgrade 'transformers>=4.46,<4.47' "
 " 'diffusers>=0.35,<0.36' accelerate "
 " flask pyngrok imageio imageio-ffmpeg scipy "
 " opencv-python-headless sentencepiece",
 label="Tüm paketler (sabirlenmiş)")

# ModelScope T2V
run("pip install -q 'decord>=0.6.0' 'open_clip_torch'", label="ModelScope bağımlılıkları")

# Wav2Lip
if not os.path.exists("Wav2Lip"):
    run("git clone -q https://github.com/Rudrabha/Wav2Lip.git",
 label="Wav2Lip klonlama")
# Wav2Lip requirements.txt atlanıyor — gerekli paketler zaten kurulu
# face_recognition + opencv (satır 49) + torch/torchvision (Colab) yeterli
print("  ⏭ Wav2Lip requirements.txt atlandı (gerekli paketler zaten mevcut)")

# Wav2Lip inference.py module-level parse_args() hatasını önle
inf_file = "/content/Wav2Lip/inference.py"
if os.path.exists(inf_file):
    with open(inf_file, "r") as f:
        content = f.read()
    # args = parser.parse_args() satırını if __name__ guard'ıyla koru
    if "args = parser.parse_args()" in content:
        patched = content.replace(
            "args = parser.parse_args()",
            "if __name__ == '__main__':\n    args = parser.parse_args()"
        )
        with open(inf_file, "w") as f:
            f.write(patched)
        print("  ✅ Wav2Lip inference.py guardlandı")
    else:
        print("  ⏭ Wav2Lip inference.py zaten guardlı")
run("pip install -q face_recognition opencv-python-headless librosa",
    label="face_recognition + opencv")

# faster-whisper (altyazı)
run("pip install -q faster-whisper", label="faster-whisper")

# Wav2Lip checkpoint (~400MB)
os.makedirs("/content/Wav2Lip/checkpoints", exist_ok=True)
ckpt = "/content/Wav2Lip/checkpoints/wav2lip.pth"
if not os.path.exists(ckpt) or os.path.getsize(ckpt) < 100_000_000:
    print("\n[Wav2Lip] Checkpoint indiriliyor (~400MB)...")
    for url in [
        "https://huggingface.co/vinthony/SadTalker/resolve/main/wav2lip.pth",
        "https://huggingface.co/gmk123/wav2lip/resolve/main/wav2lip.pth",
    ]:
        print(f"  → {url[50:]}")
        r = os.system(
            f'wget -q --show-progress -O "{ckpt}" "{url}"'
        )
        if os.path.exists(ckpt) and os.path.getsize(ckpt) > 100_000_000:
            mb = os.path.getsize(ckpt) // 1024 // 1024
            print(f"  ✅ Wav2Lip indirildi ({mb}MB)")
            break
    else:
        print("  ⚠️ Checkpoint indirilemedi — lip-sync atlanacak")
else:
    print(f"\n✅ Wav2Lip checkpoint mevcut ({os.path.getsize(ckpt)//1024//1024}MB)")

print("\n" + "="*60)
print("✅ HÜCRE1 TAMAMLANDI")
print("👉 Şimdi 'Runtime > Restart session' yapın (gerekiyorsa)")
print("👉 Ardından 'colab_hucre2_server.py' dosyasını yükleyip çalıştırın")
print("="*60)
