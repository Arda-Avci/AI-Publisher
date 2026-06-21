#!/bin/bash

# Target directory on Google Drive
DRIVE_DIR="/content/drive/MyDrive/Colab Notebooks/docker/images"
mkdir -p "$DRIVE_DIR"

# Buildah storage config (VFS - Colab'da overlay calismaz)
mkdir -p /etc/containers /tmp/containers/storage
cat > /etc/containers/storage.conf << 'EOF'
[storage]
driver = "vfs"
runroot = "/tmp/containers"
graphroot = "/tmp/containers/storage"
EOF

BUILDAH_BIN="buildah"
if ! command -v buildah &>/dev/null; then
  echo "[ERROR] buildah bulunamadi! Once 'apt-get install -y buildah' calistirin."
  exit 1
fi

echo "=========================================="
echo "FAZ 1: Base Docker Imaji Insa Ediliyor (Buildah)"
echo "=========================================="
echo "[INFO] buildah versiyon: $(buildah --version 2>/dev/null | head -1)"
START_TIME=$SECONDS

# === BASE IMAGE ===
if [ -f "$DRIVE_DIR/base.tar.gz" ]; then
  SIZE=$(stat -c%s "$DRIVE_DIR/base.tar.gz" 2>/dev/null || stat -f%z "$DRIVE_DIR/base.tar.gz" 2>/dev/null || echo 0)
  if [ "$SIZE" -ge 50000000 ]; then
    echo "Base image Drive'da mevcut (${SIZE} bytes). Build atlandi."
  else
    echo "Base image Drive'da bozuk (${SIZE} bytes). Yeniden build..."
    rm -f "$DRIVE_DIR/base.tar.gz"
  fi
fi

if [ ! -f "$DRIVE_DIR/base.tar.gz" ]; then
  if [ ! -f "Dockerfile.base" ]; then
    echo "Dockerfile.base bulunamadi!"
    exit 1
  fi
  echo "Base Dockerfile.base buildah ile insa ediliyor..."
  buildah bud --format=docker -t ai-publisher-base:latest -f Dockerfile.base . 2>&1
  if [ $? -eq 0 ]; then
    DURATION=$((SECONDS - START_TIME))
    echo "Base Docker Imaji basariyla olusturuldu. Sure: ${DURATION}s"
    buildah push ai-publisher-base:latest docker-archive:base.tar 2>&1
    if [ $? -eq 0 ]; then
      if command -v pigz &>/dev/null; then
        pigz -c base.tar > "$DRIVE_DIR/base.tar.gz"
      else
        gzip -c base.tar > "$DRIVE_DIR/base.tar.gz"
      fi
      rm -f base.tar
      echo "Base imaji Drive'a kaydedildi."
    else
      echo "Base imaji push basarisiz!"
      exit 1
    fi
  else
    echo "Base Docker Imaji insa edilirken hata olustu!"
    exit 1
  fi
fi

# === MODEL IMAGES ===
MODELS=("cogvideox" "wan" "ltx" "hunyuan" "xtts" "audioldm2" "wav2lip" "musetalk" "whisper" "stablediffusion" "kokorotts" "svd" "animatediff" "wan25" "f5tts" "lora-trainer")
TOTAL_MODELS=${#MODELS[@]}

for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  IDX=$((i + 1))

  # Drive'da varsa atla
  MIN_SIZE=$((100 * 1024 * 1024))
  if [ -f "$DRIVE_DIR/$MODEL.tar.gz" ]; then
    FILE_SIZE=$(stat -c%s "$DRIVE_DIR/$MODEL.tar.gz" 2>/dev/null || echo 0)
    if [ "$FILE_SIZE" -ge "$MIN_SIZE" ] 2>/dev/null; then
      echo ""
      echo "======================================================================"
      echo "[$IDX/$TOTAL_MODELS] MODEL: $MODEL (Drive'da mevcut, atlandi)"
      echo "======================================================================"
      continue
    else
      echo ""
      echo "======================================================================"
      echo "[$IDX/$TOTAL_MODELS] MODEL: $MODEL (Drive'da bozuk/kucuk, yeniden build)"
      echo "======================================================================"
      rm -f "$DRIVE_DIR/$MODEL.tar.gz"
    fi
  fi

  echo ""
  echo "======================================================================"
  echo "[$IDX/$TOTAL_MODELS] MODEL: $MODEL"
  echo "======================================================================"

  MODEL_START=$SECONDS

  # Faz 1: Klasor ve Dockerfile Dogrulama
  if [ ! -d "$MODEL" ]; then
    echo "Hata: '$MODEL' dizini bulunamadi!"
    continue
  fi
  if [ ! -f "$MODEL/Dockerfile" ]; then
    echo "Hata: '$MODEL/Dockerfile' bulunamadi!"
    continue
  fi
  echo "Dogrulama basarili."

  # Faz 2: Buildah ile build
  echo "Buildah ile model imaji insa ediliyor..."
  echo "(Not: Base image buildah storage'inda olmali - once base build edilmis olmali)"

  buildah bud --format=docker -t "ai-publisher-$MODEL:latest" -f "$MODEL/Dockerfile" "$MODEL/" 2>&1
  BUILD_STATUS=$?

  if [ $BUILD_STATUS -ne 0 ]; then
    echo "Hata: $MODEL imaji insa edilemedi! (exit: $BUILD_STATUS)"
    echo "Base image buildah storage'inda degilse 'buildah pull docker-archive:...' ile yukleyin."
    continue
  fi
  echo "Build tamamlandi."

  # Faz 3: Push to tar
  echo "Imaj sikistirilip Drive'a kaydediliyor..."
  buildah push "ai-publisher-$MODEL:latest" docker-archive:"$MODEL.tar" 2>&1
  if [ $? -eq 0 ]; then
    if command -v pigz &>/dev/null; then
      pigz -c "$MODEL.tar" > "$DRIVE_DIR/$MODEL.tar.gz"
    else
      gzip -c "$MODEL.tar" > "$DRIVE_DIR/$MODEL.tar.gz"
    fi
    rm -f "$MODEL.tar"
    echo "Basarili! $MODEL.tar.gz Drive'a kaydedildi."
  else
    echo "Hata: $MODEL imaji push edilemedi!"
    continue
  fi

  # Buildah storage'dan temizle (disk tasarrufu)
  buildah rmi "ai-publisher-$MODEL:latest" 2>/dev/null || true

  # Docker/podman prune
  if command -v docker &>/dev/null; then docker system prune -f 2>/dev/null || true; fi
  if command -v podman &>/dev/null; then podman system prune -f 2>/dev/null || true; fi

  MODEL_DURATION=$((SECONDS - MODEL_START))
  echo "Toplam Sure ($MODEL): ${MODEL_DURATION}s"
done

# Base image'i de storage'dan temizle
buildah rmi ai-publisher-base:latest 2>/dev/null || true

echo ""
echo "=========================================="
echo "Build tamamlandi! Tum imajlar Drive'a kaydedildi."
echo "=========================================="
