#!/bin/bash
# Pre-download all HuggingFace model weights to persistent storage (Google Drive)
# Run BEFORE any Docker build. This caches all weights so Docker builds don't
# need to re-download (saving ephemeral disk space during Kaniko builds).
#
# Weights are downloaded to DRIVE_HF_CACHE so they persist across Colab sessions.
#
# Usage: bash pre_download.sh
#
# After this script completes, run: bash build_all.sh

set -e

DRIVE_HF_CACHE="${DRIVE_HF_CACHE:-/content/drive/MyDrive/Colab Notebooks/docker/hf_cache}"
DRIVE_DIR="${DRIVE_DIR:-/content/drive/MyDrive/Colab Notebooks/docker/images}"

echo "=========================================="
echo "📦 HF Model Agirliklari On-Indirme"
echo "=========================================="
echo "Cache: $DRIVE_HF_CACHE"
echo ""

mkdir -p "$DRIVE_HF_CACHE"
mkdir -p "$DRIVE_DIR"

export HF_HOME="$DRIVE_HF_CACHE"
export HF_TOKEN="${HF_TOKEN:-}"

# Track free disk space
check_disk() {
  df -h /workspace | tail -1 | awk '{print $4}'
}

# Model list: (repo_id subpath_if_needed)
# Large models first (biggest first so we fail fast if space insufficient)
declare -a MODELS=(
  "Lightricks/LTX-Video:"
  "genmo/mochi-1-preview:"
  "hunyuanvideo-community/HunyuanVideo:"
  "Wan-AI/Wan2.1-I2V-14B-480P:"
  "Wan-AI/Wan2.1-T2V-1.3B:"
  "THUDM/CogVideoX-5b:"
  "THUDM/CogVideoX-5b-I2V:"
  "THUDM/CogVideoX-2b:"
  "stabilityai/stable-video-diffusion-img2vid-xt:"
  "guoyww/animatediff-motion-adapter-v1-5-2:"
  "frankjoshua/toonyou_beta6:"
  "cerspense/zeroscope_v2_576w:"
  "DynamiCrafter/dynamicrafter_512_interp_512:"
  "hexgrad/Kokoro-82M:"
  "charactr/vocos-mel-24khz:"
  "cvssp/audioldm2:"
  "coqui/XTTS-v2:tts_models/multilingual/multi-dataset/xtts_v2"
  "Systran/faster-whisper-small:"
  "Systran/faster-whisper-medium:"
  "Systran/faster-whisper-large-v3:"
  "openai/whisper-small:"
  "openai/whisper-large-v3:"
  "stabilityai/stable-diffusion-xl-base-1.0:"
)

echo "[DISK] Workspace free before downloads: $(check_disk)"
echo ""

for entry in "${MODELS[@]}"; do
  REPO_ID="${entry%%:*}"
  SUBPATH="${entry#*:}"

  echo "----------------------------------------"
  echo "[DOWN] $REPO_ID"
  [ "$SUBPATH" != "$REPO_ID" ] && echo "[DOWN]   subpath: $SUBPATH"

  if [ -d "$HF_HOME/models--${REPO_ID//\//--}" ]; then
    echo "[CACHE HIT] Already downloaded, skipping..."
    continue
  fi

  FREE_BEFORE=$(df /workspace | tail -1 | awk '{print $4}')
  FREE_BEFORE_GB=$((FREE_BEFORE / 1024 / 1024))

  echo "[DISK] Free before: ${FREE_BEFORE_GB}GB"

  if [ "$FREE_BEFORE_GB" -lt 5 ]; then
    echo "❌ CRITICAL: Less than 5GB free in /workspace. Stopping pre-download."
    echo "   Consider: rm -rf /workspace/hf_cache/* (if separate partition)"
    break
  fi

  if [ "$SUBPATH" != "$REPO_ID" ]; then
    python -c "
from huggingface_hub import snapshot_download
import os, sys
try:
    path = snapshot_download(
        repo_id='$REPO_ID',
        cache_dir=os.environ.get('HF_HOME', '/workspace/models/hf_cache'),
        allow_patterns=['${SUBPATH}/*'],
        token=os.environ.get('HF_TOKEN') or None,
        ignore_patterns=['*.msgpack', '*.h5', '*.tflite', '*.onnx', '*.pb'],
    )
    print(f'[OK] {path}')
except Exception as e:
    print(f'[ERROR] {e}', file=sys.stderr)
    sys.exit(1)
"
  else
    python -c "
from huggingface_hub import snapshot_download
import os, sys
try:
    path = snapshot_download(
        repo_id='$REPO_ID',
        cache_dir=os.environ.get('HF_HOME', '/workspace/models/hf_cache'),
        token=os.environ.get('HF_TOKEN') or None,
        ignore_patterns=['*.msgpack', '*.h5', '*.tflite', '*.onnx', '*.pb'],
    )
    print(f'[OK] {path}')
except Exception as e:
    print(f'[ERROR] {e}', file=sys.stderr)
    sys.exit(1)
"
  fi

  FREE_AFTER=$(df /workspace | tail -1 | awk '{print $4}')
  FREE_AFTER_GB=$((FREE_AFTER / 1024 / 1024))
  echo "[DISK] Free after: ${FREE_AFTER_GB}GB"
done

echo ""
echo "=========================================="
echo "✅ Pre-download tamamlandi."
echo "   HF cache: $DRIVE_HF_CACHE"
echo "   Workspace free: $(check_disk)"
echo "   Simdi: bash build_all.sh"
echo "=========================================="
