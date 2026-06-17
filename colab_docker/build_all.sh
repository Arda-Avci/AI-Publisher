#!/bin/bash

# Target directory on Google Drive
DRIVE_DIR="/content/drive/MyDrive/Colab Notebooks/docker/images"
mkdir -p "$DRIVE_DIR"

echo "=========================================="
echo "🚀 Building Base Docker Image..."
echo "=========================================="
docker build -t ai-publisher-base:latest -f Dockerfile.base .

MODELS=("cogvideox" "wan" "ltx" "hunyuan" "xtts" "audioldm2" "wav2lip" "musetalk" "whisper" "stablediffusion" "kokorotts")

for MODEL in "${MODELS[@]}"; do
  echo "=========================================="
  echo "📦 Building image for $MODEL..."
  echo "=========================================="
  
  # Check if Dockerfile exists in folder
  if [ -f "$MODEL/Dockerfile" ]; then
    docker build -t "ai-publisher-$MODEL:latest" -f "$MODEL/Dockerfile" "$MODEL/"
    
    echo "💾 Saving $MODEL image to Google Drive as tar.gz..."
    # We save and compress directly to Google Drive to avoid VM disk limits
    docker save "ai-publisher-$MODEL:latest" | gzip > "$DRIVE_DIR/$MODEL.tar.gz"
    echo "✅ Saved $MODEL.tar.gz successfully."
  else
    echo "❌ Dockerfile for $MODEL not found!"
  fi
done

echo "=========================================="
echo "🎉 All Docker images built and saved to Google Drive!"
echo "=========================================="
