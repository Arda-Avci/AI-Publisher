#!/bin/bash
# Force-rebuild wrapper for build_all.sh
# Usage: ./force_rebuild.sh model1 model2 ...
# Deletes existing Drive archives, then runs build_all.sh (incremental)

DRIVE_DIR="/content/drive/MyDrive/Colab Notebooks/docker/images"

if [ $# -eq 0 ]; then
  echo "Usage: $0 model1 model2 ..."
  echo "  Models: base, cogvideox, wan, ltx, hunyuan, svd, animatediff, wan25, xtts, audioldm2, wav2lip, musetalk, whisper, stablediffusion, kokorotts, f5tts, lora-trainer, sadtalker, dynamicrafter, zeroscope, video-retalking, geneface, mochi, pyramid-flow"
  exit 1
fi

echo "Force-rebuild mode: $*"
for model in "$@"; do
  if [ -f "$DRIVE_DIR/$model.tar.gz" ]; then
    rm -f "$DRIVE_DIR/$model.tar.gz"
    echo "  Deleted: $model.tar.gz (Drive)"
  fi
done

echo "Running build_all.sh..."
exec bash build_all.sh
