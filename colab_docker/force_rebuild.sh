#!/bin/bash
# Force-rebuild wrapper for build_all.sh
# Usage: ./force_rebuild.sh model1 model2 ...
#        ./force_rebuild.sh --all
# Deletes existing Drive archives (and .sha256), then runs build_all.sh (incremental)

DRIVE_DIR="/content/drive/MyDrive/Colab Notebooks/docker/images"

ALL_MODELS="base cogvideox wan ltx hunyuan svd animatediff wan25 xtts audioldm2 wav2lip musetalk whisper stablediffusion kokorotts f5tts lora-trainer sadtalker dynamicrafter zeroscope video-retalking geneface mochi pyramid-flow"

if [ $# -eq 0 ]; then
  echo "Usage:"
  echo "  $0 model1 model2 ...   # Belirli modelleri sil ve rebuild"
  echo "  $0 --all              # Tum imajlari + base + sha256 dosyalarini sil, full rebuild"
  echo "  $0 --base             # Sadece base imajini sil (modeller degil)"
  echo ""
  echo "Models: $ALL_MODELS"
  exit 1
fi

# --all: tum imajlari + base + sha256 sil
if [ "$1" = "--all" ]; then
  echo "=== FULL REBUILD MODE ==="
  echo "Silinen dosyalar:"
  for f in "$DRIVE_DIR"/*.tar.gz "$DRIVE_DIR"/*.sha256; do
    [ -f "$f" ] && rm -f "$f" && echo "  - $(basename "$f")"
  done
  echo "========================="
  exec bash build_all.sh
fi

# --base: sadece base imajini + sha256 sil
if [ "$1" = "--base" ]; then
  echo "=== BASE REBUILD MODE ==="
  for f in "$DRIVE_DIR/base.tar.gz" "$DRIVE_DIR/base.sha256"; do
    [ -f "$f" ] && rm -f "$f" && echo "  - $(basename "$f")"
  done
  # Tum modellerin .sha256 dosyalarini da sil (base hash ile eslesmeyecek)
  for f in "$DRIVE_DIR"/*.sha256; do
    [ -f "$f" ] && rm -f "$f" && echo "  - $(basename "$f") (model sha invalidated)"
  done
  exec bash build_all.sh
fi

echo "Force-rebuild mode: $*"
for model in "$@"; do
  if [ -f "$DRIVE_DIR/$model.tar.gz" ]; then
    rm -f "$DRIVE_DIR/$model.tar.gz"
    echo "  Deleted: $model.tar.gz (Drive)"
  fi
  if [ -f "$DRIVE_DIR/$model.sha256" ]; then
    rm -f "$DRIVE_DIR/$model.sha256"
    echo "  Deleted: $model.sha256 (Drive)"
  fi
done

echo "Running build_all.sh..."
exec bash build_all.sh
