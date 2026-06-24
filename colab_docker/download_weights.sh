#!/bin/bash
# HuggingFace weight downloader for build-time image baking
# Usage: download_weights.sh <repo_id> [subpath]
#
# Examples:
#   download_weights.sh "openai/whisper-small"
#   download_weights.sh "coqui/XTTS-v2" "tts_models/multilingual/multi-dataset/xtts_v2"
#
# Environment:
#   HF_TOKEN (optional) - for private/gated repos
#   HF_HOME  - cache directory (default /workspace/models/hf_cache)
#   HF_REVISION - branch/tag (default main)
#
# IMPORTANT: If weights already exist in HF_HOME (pre-downloaded via pre_download.sh),
# snapshot_download will use the local cache and NOT re-download.

set -e

REPO_ID="${1:-}"
SUBPATH="${2:-}"

if [ -z "$REPO_ID" ]; then
  echo "[ERROR] Usage: $0 <repo_id> [subpath]"
  exit 1
fi

export HF_HOME="${HF_HOME:-/workspace/models/hf_cache}"
mkdir -p "$HF_HOME"

echo "================================================"
echo "[WEIGHTS] Repo: $REPO_ID"
[ -n "$SUBPATH" ] && echo "[WEIGHTS] Subpath: $SUBPATH"
echo "[WEIGHTS] Cache: $HF_HOME"
echo "================================================"

if [ -n "$SUBPATH" ]; then
  python -c "
from huggingface_hub import snapshot_download
import os
path = snapshot_download(
    repo_id='$REPO_ID',
    cache_dir=os.environ['HF_HOME'],
    allow_patterns=['${SUBPATH}/*'],
    token=os.environ.get('HF_TOKEN') or None,
    ignore_patterns=['*.msgpack', '*.h5', '*.tflite', '*.onnx', '*.pb'],
)
print(f'[WEIGHTS] OK: {path}')
"
else
  python -c "
from huggingface_hub import snapshot_download
import os
path = snapshot_download(
    repo_id='$REPO_ID',
    cache_dir=os.environ['HF_HOME'],
    token=os.environ.get('HF_TOKEN') or None,
    ignore_patterns=['*.msgpack', '*.h5', '*.tflite', '*.onnx', '*.pb'],
)
print(f'[WEIGHTS] OK: {path}')
"
fi
