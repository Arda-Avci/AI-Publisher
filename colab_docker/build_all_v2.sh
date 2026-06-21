#!/bin/bash

# Target directory on Google Drive
DRIVE_DIR="/content/drive/MyDrive/Colab Notebooks/docker/images"
mkdir -p "$DRIVE_DIR"

# Get absolute path of kaniko to prevent command not found errors
KANIKO_BIN="kaniko"
if [ -f "/usr/local/bin/kaniko" ]; then
  KANIKO_BIN="/usr/local/bin/kaniko"
elif [ -f "/kaniko/executor" ]; then
  KANIKO_BIN="/kaniko/executor"
fi

echo "=========================================="
echo "🚀 FAZ 1: Base Docker Imajı Insa Ediliyor (Kaniko)"
echo "=========================================="
START_TIME=$SECONDS

# Local registry running check (fatal degil, uyari olarak)
echo "[INFO] Yerel Registry baglantisi test ediliyor (localhost:5000)..."
REGISTRY_UP=false
if curl -s -f http://localhost:5000/v2/ > /dev/null 2>&1; then
  REGISTRY_UP=true
  echo "[OK] Registry calisiyor."
else
  echo "[WARN] Registry localhost:5000 calismiyor. Baslatilmayi deneniyor..."
  if command -v registry &> /dev/null; then
    pkill -f 'registry serve' 2>/dev/null || true
    nohup registry serve /etc/docker/registry/config.yml > /tmp/registry.log 2>&1 &
    sleep 2
    for _ in $(seq 1 10); do
      if curl -s -f http://localhost:5000/v2/ > /dev/null 2>&1; then
        REGISTRY_UP=true
        echo "[OK] Registry baslatildi!"
        break
      fi
      sleep 1
    done
    if [ "$REGISTRY_UP" = "false" ]; then
      echo "[WARN] Registry baslatilamadi. Log: /tmp/registry.log"
    fi
  else
    echo "[WARN] Registry binary bulunamadi. Kanilo build gerektiginde hata alinabilir."
  fi
fi
echo "[DEBUG] pwd: $(pwd)"
echo "[DEBUG] listing files:"
ls -la

# Base: Registry'de yoksa Kaniko ile build et (Drive'a da kaydeder)
if [ "$REGISTRY_UP" = "true" ] && curl -s -f http://localhost:5000/v2/ai-publisher-base/tags/list > /dev/null 2>&1; then
  echo "✅ Base image registry'de mevcut. Build atlandi."
elif [ -f "Dockerfile.base" ]; then
  echo "[INFO] Base registry'de yok, Dockerfile.base Kaniko ile build ediliyor..."
  $KANIKO_BIN --context=. \
         --dockerfile=Dockerfile.base \
         --destination=localhost:5000/ai-publisher-base:latest \
         --tarPath=base.tar \
         --whitelist-var-run=false \
         --ignore-var-run \
         --snapshot-mode=redo
  if [ $? -eq 0 ]; then
    DURATION=$((SECONDS - START_TIME))
    echo "✅ Base Docker Imajı basariyla olusturuldu. Sure: ${DURATION}s"
    if command -v pigz &> /dev/null; then
      pigz -c base.tar > "$DRIVE_DIR/base.tar.gz"
    else
      gzip -c base.tar > "$DRIVE_DIR/base.tar.gz"
    fi
    rm -f base.tar
    echo "✅ Base imaji Drive'a kaydedildi."
  else
    echo "❌ Base Docker Imajı insa edilirken hata olustu!"
    exit 1
  fi
else
  echo "❌ Dockerfile.base bulunamadi!"
  exit 1
fi

MODELS=("cogvideox" "wan" "ltx" "hunyuan" "xtts" "audioldm2" "wav2lip" "musetalk" "whisper" "stablediffusion" "kokorotts" "svd" "animatediff" "wan25" "f5tts" "lora-trainer" "zeroscope" "dynamicrafter" "sadtalker" "pyramid-flow" "mochi" "video-retalking" "geneface")
TOTAL_MODELS=${#MODELS[@]}

for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  IDX=$((i + 1))
  
  # Drive'da varsa ve ≥100MB ise atla (incremental build)
  MIN_SIZE=$((100 * 1024 * 1024))
  if [ -f "$DRIVE_DIR/$MODEL.tar.gz" ]; then
    FILE_SIZE=$(stat -c%s "$DRIVE_DIR/$MODEL.tar.gz" 2>/dev/null || echo 0)
    if [ "$FILE_SIZE" -ge "$MIN_SIZE" ] 2>/dev/null; then
      echo ""
      echo "======================================================================"
      echo "⏭️ [$IDX/$TOTAL_MODELS] MODEL: $MODEL (Drive'da mevcut, atlandi)"
      echo "======================================================================"
      continue
    else
      echo ""
      echo "======================================================================"
      echo "⚠️ [$IDX/$TOTAL_MODELS] MODEL: $MODEL (Drive'da bozuk/kücük: ${FILE_SIZE:-0} byte, yeniden build)"
      echo "======================================================================"
      rm -f "$DRIVE_DIR/$MODEL.tar.gz"
    fi
  fi
  
  echo ""
  echo "======================================================================"
  echo "📦 [$IDX/$TOTAL_MODELS] MODEL: $MODEL"
  echo "======================================================================"
  
  MODEL_START=$SECONDS
  
  # Faz 1: Klasör ve Dockerfile Doğrulama
  echo "[FAZ 1/4] Klasor ve Dockerfile dogrulaniyor..."
  if [ ! -d "$MODEL" ]; then
    echo "❌ Hata: '$MODEL' dizini bulunamadi!"
    continue
  fi
  if [ ! -f "$MODEL/Dockerfile" ]; then
    echo "❌ Hata: '$MODEL/Dockerfile' bulunamadi!"
    continue
  fi
  echo "👉 Dogrulama basarili."
  
  # Kaniko ile build (daemonless -> cgroup hatasi olmaz)
  # Faz 2: Dockerfile FROM satırını localhost registry'ye yönlendirme
  echo "[FAZ 2/4] Dockerfile local registry icin yamalaniyor..."
  YAMALANDI=false
  if grep -q "FROM ai-publisher-base:latest" "$MODEL/Dockerfile"; then
    sed -i 's|FROM ai-publisher-base:latest|FROM localhost:5000/ai-publisher-base:latest|g' "$MODEL/Dockerfile"
    YAMALANDI=true
  fi
  
  # Faz 3: Kaniko Build
  echo "[FAZ 3/4] Kaniko ile model imaji insa ediliyor..."
  
  $KANIKO_BIN --context="$MODEL/" \
         --dockerfile="$MODEL/Dockerfile" \
         --destination="localhost:5000/ai-publisher-$MODEL:latest" \
         --tarPath="$MODEL.tar" \
         --insecure \
         --skip-tls-verify \
         --whitelist-var-run=false \
         --ignore-var-run \
         --snapshot-mode=redo
  
  BUILD_STATUS=$?
  
  # Dockerfile'ı eski haline geri döndür
  if [ "$YAMALANDI" = "true" ]; then
    sed -i 's|FROM localhost:5000/ai-publisher-base:latest|FROM ai-publisher-base:latest|g' "$MODEL/Dockerfile"
  fi
  
  if [ $BUILD_STATUS -eq 0 ]; then
    echo "👉 Kaniko insa tamamlandi."
  fi
  
  if [ $BUILD_STATUS -ne 0 ]; then
    echo "❌ Hata: $MODEL imaji insa edilemedi!"
    rm -f "$MODEL.tar"
    continue
  fi
  
  # Faz 4: Sıkıştırma ve Drive'a yazma
  echo "[FAZ 4/4] Imaj sıkıştırılıp Drive'a kaydediliyor..."
  SAVE_START=$SECONDS
  
  if command -v pigz &> /dev/null; then
    pigz -c "$MODEL.tar" > "$DRIVE_DIR/$MODEL.tar.gz"
  fi
  if [ $? -ne 0 ] || [ ! -f "$DRIVE_DIR/$MODEL.tar.gz" ]; then
    gzip -c "$MODEL.tar" > "$DRIVE_DIR/$MODEL.tar.gz"
  fi
  
  SAVE_STATUS=$?
  rm -f "$MODEL.tar"
  
  if [ $SAVE_STATUS -ne 0 ]; then
    echo "❌ Hata: $MODEL imaji kaydedilirken sıkıştırma sorunu oluştu!"
    continue
  fi
  
  SAVE_DURATION=$((SECONDS - SAVE_START))
  FILE_SIZE=$(stat -c%s "$DRIVE_DIR/$MODEL.tar.gz" 2>/dev/null || echo 0)
  echo "💾 Sıkıştırılmış İmaj Boyutu: $((FILE_SIZE / 1024 / 1024)) MB"
  echo "✅ Basarili! $MODEL.tar.gz Google Drive'a eklendi."
  
  if command -v docker &> /dev/null; then
    docker system prune -f || true
  fi
  if command -v podman &> /dev/null; then
    podman system prune -f || true
  fi
  
  MODEL_DURATION=$((SECONDS - MODEL_START))
  echo "⏱️ Toplam Islem Suresi ($MODEL): ${MODEL_DURATION}s"
done

echo ""
echo "=========================================="
echo "🎉 Build tamamlandi! Eksik imajlar insa edildi ve Drive'a kaydedildi."
echo "   Drive'da zaten var olan imajlar atlandi (incremental build)."
echo "=========================================="

if command -v docker &> /dev/null; then
  docker system prune -a -f || true
fi
if command -v podman &> /dev/null; then
  podman system prune -a -f || true
fi
