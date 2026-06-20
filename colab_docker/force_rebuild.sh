#!/bin/bash
# Force-rebuild belirtilen model imajini.
# Kullanim:
#   ./force_rebuild.sh musetalk
#   ./force_rebuild.sh musetalk wav2lip  (birden fazla)
set -euo pipefail

DRIVE_DIR="/content/drive/MyDrive/Colab Notebooks/docker/images"

if [ $# -eq 0 ]; then
  echo "Kullanim: $0 <model1> [model2 ...]"
  echo "Ornek: $0 musetalk"
  exit 1
fi

for MODEL in "$@"; do
  FILE="$DRIVE_DIR/$MODEL.tar.gz"
  if [ -f "$FILE" ]; then
    SIZE=$(stat -c%s "$FILE" 2>/dev/null || echo 0)
    rm -f "$FILE"
    echo "[FORCE] $MODEL.tar.gz silindi (${SIZE} bytes)."
  else
    echo "[INFO] $MODEL.tar.gz Drive'da yok, build sirasinda olusturulacak."
  fi
done

echo "[OK] Drive temizlendi. build_all.sh baslatiliyor..."
cd "$(dirname "$0")"
./build_all.sh
