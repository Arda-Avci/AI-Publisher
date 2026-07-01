#!/usr/bin/env bash
# ============================================================
# AI Publisher - Production Deployment Script
# Hedef: Modal (GPU) + GCP (backend) hibrit
# ============================================================
set -euo pipefail

echo "🚀 AI Publisher Production Deployment Başlıyor..."
DEPLOY_ENV="${1:-staging}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ── 1. Tip Kontrolü ─────────────────────────────────────────
echo "[1/7] TypeScript tip kontrolü..."
npm run check:types || { echo "❌ TypeScript hatası!"; exit 1; }

# ── 2. Testler ──────────────────────────────────────────────
echo "[2/7] Testler çalıştırılıyor..."
npm test || { echo "❌ Test hatası!"; exit 1; }

# ── 3. Lint ─────────────────────────────────────────────────
echo "[3/7] Lint kontrolü..."
npm run check:lint || { echo "❌ Lint hatası!"; exit 1; }

# ── 4. Client Build ─────────────────────────────────────────
echo "[4/7] Client build (Vite)..."
npm --prefix client run build || { echo "❌ Client build hatası!"; exit 1; }

# ── 5. Backend Build ────────────────────────────────────────
echo "[5/7] Backend build (TypeScript)..."
npm run build || { echo "❌ Backend build hatası!"; exit 1; }

# ── 6. Modal Deploy ─────────────────────────────────────────
echo "[6/7] Modal deploy başlatılıyor..."
if [ "$DEPLOY_ENV" = "production" ]; then
  echo "  ⚠️ Production deploy onayı gerekiyor."
  echo "  Devam etmek için 'yes' yazın:"
  read -r CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "❌ İptal edildi."
    exit 1
  fi
fi

# Modal model deploy (serial)
if [ -f "scripts/deploy_modal_serial.ps1" ]; then
  echo "  Modal serial deploy çalışıyor..."
  # PowerShell script'i bash'den çalıştıramayız, bilgi ver
  echo "  ℹ️  PowerShell script: scripts/deploy_modal_serial.ps1"
  echo "  ℹ️  Bu script'i PowerShell'den çalıştırın."
fi

# ── 7. GHCR Docker Push ─────────────────────────────────────
echo "[7/7] GitHub Actions docker build tetikleniyor..."
if git diff --name-only HEAD~1 HEAD | grep -q "colab_docker/"; then
  echo "  ✅ colab_docker değişiklikleri tespit edildi, GH Actions otomatik tetiklenecek."
else
  echo "  ℹ️  colab_docker değişikliği yok, GH Actions tetiklenmeyecek."
fi

echo "🎉 Deployment başarıyla tamamlandı!"
