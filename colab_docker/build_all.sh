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
echo "FAZ 1: Base Docker Imaji Insa Ediliyor (Kaniko)"
echo "=========================================="

# Usage: ./build_all.sh [model1 model2 ...]
# If models specified, force-rebuild only those (delete existing Drive archives).
# If no models specified, build all (incremental — skip if Drive archive exists).
if [ $# -gt 0 ]; then
  FORCE_MODELS=("$@")
  echo "Force-rebuild mode: ${FORCE_MODELS[*]}"
else
  FORCE_MODELS=()
  echo "Incremental build mode: Drive'da var olan imajlar atlanacak."
fi

# Determine if a model should be force-rebuilt
should_force() {
  local name="$1"
  for fm in "${FORCE_MODELS[@]}"; do
    if [ "$fm" = "$name" ]; then
      return 0
    fi
  done
  return 1
}

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
    echo "[WARN] Registry binary bulunamadi. Kaniko build gerektiginde hata alinabilir."
  fi
fi
echo "[DEBUG] pwd: $(pwd)"
echo "[DEBUG] listing files:"
ls -la

# Base image build
if should_force "base" && [ -f "$DRIVE_DIR/base.tar.gz" ]; then
  echo "Force mode: base.tar.gz siliniyor, yeniden build edilecek."
  rm -f "$DRIVE_DIR/base.tar.gz"
fi

if [ -f "$DRIVE_DIR/base.tar.gz" ]; then
  FILE_SIZE=$(stat -c%s "$DRIVE_DIR/base.tar.gz" 2>/dev/null || echo 0)
  if [ "$FILE_SIZE" -ge "$((100 * 1024 * 1024))" ] 2>/dev/null; then
    echo "Base image Drive'da mevcut ($((FILE_SIZE / 1024 / 1024)) MB). Build atlandi."
  else
    echo "Base image Drive'da bozuk (${FILE_SIZE:-0} byte), yeniden build."
    rm -f "$DRIVE_DIR/base.tar.gz"
    DO_BUILD_BASE=true
  fi
elif [ -f "Dockerfile.base" ]; then
  DO_BUILD_BASE=true
else
  echo "Dockerfile.base bulunamadi!"
  exit 1
fi

if [ "$DO_BUILD_BASE" = "true" ]; then
  DO_BUILD_BASE=false
  echo "[INFO] Base Dockerfile.base Kaniko ile build ediliyor..."
  $KANIKO_BIN --context=. \
         --dockerfile=Dockerfile.base \
         --destination=localhost:5000/ai-publisher-base:latest \
         --tarPath=base.tar \
         --whitelist-var-run=false \
         --ignore-var-run \
         --snapshot-mode=redo
  if [ $? -eq 0 ]; then
    DURATION=$((SECONDS - START_TIME))
    echo "Base Docker Imaji basariyla olusturuldu. Sure: ${DURATION}s"
    if command -v pigz &> /dev/null; then
      pigz -c base.tar > "$DRIVE_DIR/base.tar.gz"
    else
      gzip -c base.tar > "$DRIVE_DIR/base.tar.gz"
    fi
    rm -f base.tar
    echo "Base imaji Drive'a kaydedildi."
  else
    echo "Base Docker Imaji insa edilirken hata olustu!"
    exit 1
  fi
fi

# Determine which models to build
if [ ${#FORCE_MODELS[@]} -gt 0 ]; then
  MODELS=()
  for fm in "${FORCE_MODELS[@]}"; do
    if [ "$fm" != "base" ]; then
      MODELS+=("$fm")
    fi
  done
  echo "Force-rebuild models: ${MODELS[*]}"
  # Delete existing Drive archives so build isn't skipped
  for m in "${MODELS[@]}"; do
    if [ -f "$DRIVE_DIR/$m.tar.gz" ]; then
      rm -f "$DRIVE_DIR/$m.tar.gz"
      echo "  $m.tar.gz (Drive) silindi - yeniden build edilecek."
    fi
  done
else
  MODELS=("cogvideox" "wan" "ltx" "hunyuan" "xtts" "audioldm2" "wav2lip" "musetalk" "whisper" "stablediffusion" "kokorotts" "svd" "animatediff" "wan25" "f5tts" "lora-trainer")
  echo "Incremental build mode: Drive'da var olan imajlar atlanacak."
fi
TOTAL_MODELS=${#MODELS[@]}

for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  IDX=$((i + 1))

  # Drive'da varsa ve >100MB ise atla (incremental build)
  if [ ${#FORCE_MODELS[@]} -eq 0 ]; then
    MIN_SIZE=$((100 * 1024 * 1024))
    if [ -f "$DRIVE_DIR/$MODEL.tar.gz" ]; then
      FILE_SIZE=$(stat -c%s "$DRIVE_DIR/$MODEL.tar.gz" 2>/dev/null || echo 0)
      if [ "$FILE_SIZE" -ge "$MIN_SIZE" ] 2>/dev/null; then
        echo ""
        echo "======================================================================"
        echo " [$IDX/$TOTAL_MODELS] MODEL: $MODEL (Drive'da mevcut, atlandi)"
        echo "======================================================================"
        continue
      else
        echo ""
        echo "======================================================================"
        echo " [$IDX/$TOTAL_MODELS] MODEL: $MODEL (Drive'da bozuk/kucuk: ${FILE_SIZE:-0} byte, yeniden build)"
        echo "======================================================================"
        rm -f "$DRIVE_DIR/$MODEL.tar.gz"
      fi
    fi
  fi

  echo ""
  echo "======================================================================"
  echo " [$IDX/$TOTAL_MODELS] MODEL: $MODEL"
  echo "======================================================================"

  MODEL_START=$SECONDS

  # Faz 1: Klasor ve Dockerfile Dogrulama
  echo "[FAZ 1/4] Klasor ve Dockerfile dogrulaniyor..."
  if [ ! -d "$MODEL" ]; then
    echo "Hata: '$MODEL' dizini bulunamadi!"
    continue
  fi
  if [ ! -f "$MODEL/Dockerfile" ]; then
    echo "Hata: '$MODEL/Dockerfile' bulunamadi!"
    continue
  fi
  echo "Dogrulama basarili."

  # Kaniko ile build (daemonless -> cgroup hatasi olmaz)
  # Faz 2: Dockerfile FROM satirini localhost registry'ye yonlendirme
  echo "[FAZ 2/4] Dockerfile local registry icin yamalaniyor..."
  sed -i 's|FROM ai-publisher-base:latest|FROM localhost:5000/ai-publisher-base:latest|g' "$MODEL/Dockerfile"

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

  # Dockerfile'i eski haline geri dondur
  sed -i 's|FROM localhost:5000/ai-publisher-base:latest|FROM ai-publisher-base:latest|g' "$MODEL/Dockerfile"

  if [ $BUILD_STATUS -eq 0 ]; then
    echo "Kaniko insa tamamlandi."
  fi

  if [ $BUILD_STATUS -ne 0 ]; then
    echo "Hata: $MODEL imaji insa edilemedi!"
    rm -f "$MODEL.tar"
    continue
  fi

  # Faz 4: Sikistirma ve Drive'a yazma
  echo "[FAZ 4/4] Imaj sikistirilip Drive'a kaydediliyor..."
  SAVE_START=$SECONDS

  if command -v pigz &> /dev/null; then
    pigz -c "$MODEL.tar" > "$DRIVE_DIR/$MODEL.tar.gz"
  else
    gzip -c "$MODEL.tar" > "$DRIVE_DIR/$MODEL.tar.gz"
  fi

  SAVE_STATUS=$?
  rm -f "$MODEL.tar"

  if [ $SAVE_STATUS -ne 0 ]; then
    echo "Hata: $MODEL imaji kaydedilirken sikistirma sorunu olustu!"
    continue
  fi

  SAVE_DURATION=$((SECONDS - SAVE_START))
  echo "Basarili! $MODEL.tar.gz Google Drive'a eklendi."

  if command -v docker &> /dev/null; then
    docker system prune -f || true
  fi
  if command -v podman &> /dev/null; then
    podman system prune -f || true
  fi

  MODEL_DURATION=$((SECONDS - MODEL_START))
  echo "Toplam Islem Suresi ($MODEL): ${MODEL_DURATION}s"
done

echo ""
echo "=========================================="
echo "Build tamamlandi! Eksik imajlar insa edildi ve Drive'a kaydedildi."
echo "   Drive'da zaten var olan imajlar atlandi (incremental build)."
echo "=========================================="

if command -v docker &> /dev/null; then
  docker system prune -a -f || true
fi
if command -v podman &> /dev/null; then
  podman system prune -a -f || true
fi
