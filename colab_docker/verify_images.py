#!/usr/bin/env python3
"""
===============================================================
  Colab Docker İmaj Doğrulama Scripti
  Bu hücreyi çalıştırarak tüm imajların Drive'da mevcut olup
  olmadığını ve Docker'ın çalışıp çalışmadığını kontrol edin.
===============================================================
"""

import os
import subprocess
import sys
import tarfile

# ── Ayarlar ──────────────────────────────────────────────────
DRIVE_DIR = "/content/drive/MyDrive/Colab Notebooks/docker/images"
REQUIRED_IMAGES = [
    "cogvideox", "wan", "ltx", "hunyuan",
    "xtts", "audioldm2", "wav2lip", "musetalk",
    "whisper", "stablediffusion", "kokorotts", "svd",
    "wan25", "f5tts", "lora-trainer"
]

# GPU konteynerleri (T4 VRAM sınırlaması)
GPU_HEAVY = {"cogvideox", "audioldm2", "wav2lip", "musetalk", "stablediffusion", "wan", "ltx", "hunyuan", "svd", "wan25", "f5tts", "lora-trainer"}

drive_only = "--drive-only" in sys.argv

print("=" * 60)
print("🔍 COLAB DOCKER İMAJ DOĞRULAMA" + (" (Sadece Drive Kontrolü)" if drive_only else ""))
print("=" * 60)

# ── 1. Google Drive Mount Kontrolü ───────────────────────────
print("\n[ADIM 1/5] Google Drive mount kontrolü...")
try:
    from google.colab import drive
    if not os.path.exists("/content/drive/MyDrive"):
        drive.mount('/content/drive')
        print("✅ Google Drive bağlandı.")
    else:
        print("✅ Google Drive zaten bağlı.")
except ImportError:
    print("⚠️ Google Drive modülü bulunamadı (Colab dışı ortam).")

# ── 2. Docker Kurulum Kontrolü ──────────────────────────────
print("\n[ADIM 2/5] Docker kurulum kontrolü...")
docker_ok = False
try:
    result = subprocess.run(["docker", "--version"], capture_output=True, text=True)
    if result.returncode == 0:
        print(f"✅ {result.stdout.strip()}")
        docker_ok = True
    else:
        print("❌ Docker kurulu değil.")
except FileNotFoundError:
    print("❌ Docker bulunamadı.")

# ── 3. NVIDIA Container Toolkit Kontrolü ────────────────────
print("\n[ADIM 3/5] NVIDIA Container Toolkit kontrolü...")
nvidia_ok = False
if not drive_only:
    try:
        result = subprocess.run(["nvidia-ctk", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {result.stdout.strip()}")
            nvidia_ok = True
        else:
            print("⚠️ NVIDIA Container Toolkit kurulu değil (GPU konteynerleri çalışamaz).")
    except FileNotFoundError:
        print("⚠️ nvidia-ctk bulunamadı.")
else:
    print("  ⏭️ Drive-only modunda atlandı.")

# ── 4. Drive İmaj Dosyaları Kontrolü ────────────────────────
print(f"\n[ADIM 4/5] Google Drive imaj kontrolü ve Bütünlük Kontrolü: {DRIVE_DIR}")
missing_images = []
corrupted_images = []
present_images = []
total_size_gb = 0

def check_archive_integrity(path):
    try:
        if not os.path.exists(path):
            return False, "Dosya bulunamadı"
        if os.path.getsize(path) < 10 * 1024 * 1024:  # En az 10MB olmalı
            return False, "Dosya boyutu çok küçük (< 10MB)"
        # Hızlı kontrol: gzip ve tar başlığını doğrulamak için sadece ilk dosyayı okumayı deneriz
        with tarfile.open(path, "r:gz") as tar:
            first_member = tar.next()
            if first_member is None:
                return False, "Arşiv boş"
            return True, "Geçerli tar.gz"
    except Exception as e:
        return False, f"Bozuk arşiv: {str(e)}"

if os.path.exists(DRIVE_DIR):
    for model in REQUIRED_IMAGES:
        tar_path = os.path.join(DRIVE_DIR, f"{model}.tar.gz")
        if os.path.exists(tar_path):
            size_bytes = os.path.getsize(tar_path)
            size_gb = size_bytes / (1024 ** 3)
            total_size_gb += size_gb
            
            # Arşiv bütünlüğünü kontrol et
            ok, msg = check_archive_integrity(tar_path)
            if ok:
                present_images.append(model)
                marker = "🟢" if size_gb > 0.5 else "🟡"
                print(f"  {marker} {model}.tar.gz → {size_gb:.2f} GB (Bütünlük: OK)")
            else:
                corrupted_images.append(model)
                print(f"  🔴 {model}.tar.gz → {size_gb:.2f} GB (HATA: {msg})")
        else:
            missing_images.append(model)
            print(f"  🔴 {model}.tar.gz → BULUNAMADI")
else:
    print(f"  🔴 Drive dizini bulunamadı: {DRIVE_DIR}")
    missing_images = REQUIRED_IMAGES.copy()

print(f"\n  📊 Toplam: {len(present_images)}/{len(REQUIRED_IMAGES)} imaj sorunsuz mevcut")
print(f"  💾 Toplam boyut: {total_size_gb:.2f} GB")

# ── 5. Docker İmajları (Yüklenmiş) Kontrolü ─────────────────
print("\n[ADIM 5/5] Docker'da yüklü imajlar...")
loaded_images = []
not_loaded_images = []

if not drive_only:
    if docker_ok:
        for model in REQUIRED_IMAGES:
            res = subprocess.run(
                ["docker", "images", "-q", f"ai-publisher-{model}:latest"],
                capture_output=True, text=True
            )
            if res.stdout.strip():
                loaded_images.append(model)
                print(f"  ✅ ai-publisher-{model}:latest (yüklü)")
            else:
                not_loaded_images.append(model)
                print(f"  ⏳ ai-publisher-{model}:latest (henüz yüklenmedi)")
    else:
        print("  ⚠️ Docker kurulu olmadığı için imajlar yüklenemez.")
else:
    print("  ⏭️ Drive-only modunda atlandı.")

# ── Çalışan Container'lar ────────────────────────────────────
if not drive_only and docker_ok:
    print("\n📋 Çalışan/Durdurulmuş container'lar:")
    res = subprocess.run(["docker", "ps", "-a", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}"],
                         capture_output=True, text=True)
    if res.stdout.strip():
        print(res.stdout)
    else:
        print("  (Hiç container yok)")

# ── ÖZET RAPOR ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("📊 ÖZET RAPOR")
print("=" * 60)

print(f"\n{'Kontrol':<35} {'Durum':<25}")
print("-" * 60)
print(f"{'Docker kurulu':<35} {'✅ Evet' if docker_ok else '❌ Hayır':<25}")
if not drive_only:
    print(f"{'NVIDIA Toolkit':<35} {'✅ Evet' if nvidia_ok else '⚠️ Hayır':<25}")
print(f"{'Drive imajları':<35} {f'✅ {len(present_images)}/{len(REQUIRED_IMAGES)}' if not missing_images and not corrupted_images else f'⚠️ {len(present_images)}/{len(REQUIRED_IMAGES)}':<25}")
print(f"{'Toplam boyut':<35} {f'{total_size_gb:.2f} GB':<25}")

if not drive_only:
    print(f"{'Docker\'da yüklü':<35} {f'✅ {len(loaded_images)}/{len(REQUIRED_IMAGES)}' if loaded_images else f'⏳ {len(loaded_images)}/{len(REQUIRED_IMAGES)}':<25}")
    gpu_loaded = [m for m in loaded_images if m in GPU_HEAVY]
    print(f"{'GPU konteyner hazır':<35} {f'✅ {len(gpu_loaded)}/{len(GPU_HEAVY)}' if gpu_loaded else f'⏳ {len(gpu_loaded)}/{len(GPU_HEAVY)}':<25}")

if missing_images:
    print(f"\n⚠️ Eksik imajlar: {', '.join(missing_images)}")
    print("   → build_all.sh çalıştırılarak yeniden oluşturulabilir.")

if corrupted_images:
    print(f"\n❌ Bozuk imajlar (Drive): {', '.join(corrupted_images)}")
    print("   → Bu imajlar Drive üzerinde bozuk veya eksik yüklenmiş. Yeniden derleyin.")

if not drive_only and not_loaded_images:
    print(f"\n⏳ Yüklenmemiş imajlar: {', '.join(not_loaded_images)}")
    print("   → colab_setup.py çalıştırıldığında otomatik yüklenir.")

if drive_only:
    if not missing_images and not corrupted_images:
        print("\n🎉 TÜM DOĞRULAMALAR BAŞARILI! (Drive imajları sorunsuz ve bütünlüğü tam)")
        sys.exit(0)
    else:
        print("\n❌ DOĞRULAMA BAŞARISIZ! (Eksik veya bozuk imajlar mevcut)")
        sys.exit(1)
else:
    if not missing_images and not not_loaded_images and not corrupted_images:
        print("\n🎉 TÜM DOĞRULAMALAR BAŞARILI!")
        sys.exit(0)
    else:
        print("\n❌ DOĞRULAMA BAŞARISIZ! (Eksik, bozuk veya yüklenmemiş imajlar mevcut)")
        sys.exit(1)

print("\n" + "=" * 60)
