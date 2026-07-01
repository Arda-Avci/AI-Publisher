#!/bin/bash
# Deploy all 3 Modal apps
# Requires: pip install modal, modal setup (once)
# Run: ./modal_apps/deploy_all.sh

set -e

echo "=== Deploying Video Service ==="
modal deploy modal_apps/video_service.py

echo "=== Deploying Image Service ==="
modal deploy modal_apps/image_service.py

echo "=== Deploying Audio Service ==="
modal deploy modal_apps/audio_service.py

echo "=== All apps deployed ==="
echo ""
echo "Video API:  modal run modal_apps/video_service.py"
echo "Image API:  modal run modal_apps/image_service.py"
echo "Audio API:  modal run modal_apps/audio_service.py"
echo ""
echo "Or call via JS SDK:"
echo "  const fn = await modal.functions.fromName('ai-publisher-video', 'generate_wan');"
echo "  const fc = await fn.spawn([], { prompt: '...', b2_key_id: '...', b2_key: '...' });"
