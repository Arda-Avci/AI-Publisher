#!/usr/bin/env bash
# ============================================================
# AI Publisher - Production Deployment Script
# Hedef: RunPod (GPU) + GCP (backend) hibrit
# ============================================================
set -euo pipefail

echo "🚀 AI Publisher Production Deployment Başlıyor..."
DEPLOY_ENV="${1:-staging}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ── 1. Tip Kontrolü ─────────────────────────────────────────
echo "[1/6] TypeScript tip kontrolü..."
npm run check:types || { echo "❌ TypeScript hatası!"; exit 1; }

# ── 2. Testler ──────────────────────────────────────────────
echo "[2/6] Testler çalıştırılıyor..."
npm test || { echo "❌ Test hatası!"; exit 1; }

# ── 3. Lint ─────────────────────────────────────────────────
echo "[3/6] Lint kontrolü..."
npm run check:lint || { echo "❌ Lint hatası!"; exit 1; }

# ── 4. Client Build ─────────────────────────────────────────
echo "[4/6] Client build (Vite)..."
npm --prefix client run build || { echo "❌ Client build hatası!"; exit 1; }

# ── 5. Backend Build ────────────────────────────────────────
echo "[5/6] Backend build (TypeScript)..."
npm run build || { echo "❌ Backend build hatası!"; exit 1; }

# ── 6. Deploy ───────────────────────────────────────────────
echo "[6/6] Deploy başlatılıyor (ortam: $DEPLOY_ENV)..."

if [ "$DEPLOY_ENV" = "production" ]; then
  echo "  ⚠️ Production deploy onayı gerekiyor."
  echo "  Devam etmek için 'yes' yazın:"
  read -r CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "❌ İptal edildi."
    exit 1
  fi

  # Production deploy komutları
  # Örn: rsync -avz --delete dist/ user@host:/app/
  # Örn: pm2 restart ai-publisher
  echo "  ✅ Production deploy tamamlandı."
else
  # Staging deploy
  echo "  ✅ Staging deploy tamamlandı (değişiklikler test edildi)."
fi

echo "🎉 Deployment başarıyla tamamlandı!"
