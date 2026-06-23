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

# Base Dockerfile sha256 hesapla
BASE_DOCKERFILE_SHA=""
if [ -f "Dockerfile.base" ]; then
  BASE_DOCKERFILE_SHA=$(sha256sum "Dockerfile.base" | awk '{print $1}')
  echo "[INFO] Dockerfile.base sha256: ${BASE_DOCKERFILE_SHA:0:12}..."
fi

# Base: Registry / Drive cache / Kaniko (3 kademeli skip)
# 1) Registry'de mevcut mu?
# 2) Drive'da base.tar.gz + base.sha256 var mi + sha eslesti mi?
# 3) Kaniko ile sifirdan build
BASE_SKIPPED=false
if [ "$REGISTRY_UP" = "true" ] && curl -s -f http://localhost:5000/v2/ai-publisher-base/tags/list > /dev/null 2>&1; then
  echo "✅ Base image registry'de mevcut. Build atlandi."
  BASE_SKIPPED=true
elif [ -f "$DRIVE_DIR/base.tar.gz" ] && [ -n "$BASE_DOCKERFILE_SHA" ]; then
  if [ -f "$DRIVE_DIR/base.sha256" ] && [ "$(cat "$DRIVE_DIR/base.sha256")" = "$BASE_DOCKERFILE_SHA" ]; then
    # Drive'da cache var, sha eslesti → Kaniko bypass, registry'ye load et
    echo "✅ Base Drive cache HIT (sha eslesti): $DRIVE_DIR/base.tar.gz"
    BASE_SKIPPED=true
    if [ "$REGISTRY_UP" = "true" ]; then
      echo "[INFO] Drive'dan registry'ye yukleniyor..."
      TMP_TAR="$(mktemp --suffix=.tar)"
      gunzip -c "$DRIVE_DIR/base.tar.gz" > "$TMP_TAR"
      if command -v skopeo &> /dev/null; then
        skopeo copy --dest-tls-verify=false \
          "docker-archive:$TMP_TAR" \
          "docker://localhost:5000/ai-publisher-base:latest" 2>&1 | tail -3
      elif command -v podman &> /dev/null; then
        podman load -i "$TMP_TAR"
        LOADED=$(podman images --format "{{.Repository}}:{{.Tag}}" | grep ai-publisher-base | head -1)
        if [ -n "$LOADED" ]; then
          podman tag "$LOADED" localhost:5000/ai-publisher-base:latest
          podman push --tls-verify=false localhost:5000/ai-publisher-base:latest 2>&1 | tail -3
        fi
      else
        echo "⚠️  skopeo/podman yok, base registry'ye yuklenemedi. Modeller base cekemez."
        BASE_SKIPPED=false
      fi
      rm -f "$TMP_TAR"
    fi
  else
    # Bootstrap: base.tar.gz var ama .sha256 yok (eski build) → mevcut sha'yi yaz, guven
    if [ ! -f "$DRIVE_DIR/base.sha256" ]; then
      echo "🆕 Base bootstrap: base.sha256 olusturuluyor (eski build, mevcut cache guveniliyor)"
      echo "$BASE_DOCKERFILE_SHA" > "$DRIVE_DIR/base.sha256"
      BASE_SKIPPED=true
      if [ "$REGISTRY_UP" = "true" ]; then
        echo "[INFO] Drive'dan registry'ye yukleniyor..."
        TMP_TAR="$(mktemp --suffix=.tar)"
        gunzip -c "$DRIVE_DIR/base.tar.gz" > "$TMP_TAR"
        if command -v skopeo &> /dev/null; then
          skopeo copy --dest-tls-verify=false \
            "docker-archive:$TMP_TAR" \
            "docker://localhost:5000/ai-publisher-base:latest" 2>&1 | tail -3
        elif command -v podman &> /dev/null; then
          podman load -i "$TMP_TAR"
          LOADED=$(podman images --format "{{.Repository}}:{{.Tag}}" | grep ai-publisher-base | head -1)
          if [ -n "$LOADED" ]; then
            podman tag "$LOADED" localhost:5000/ai-publisher-base:latest
            podman push --tls-verify=false localhost:5000/ai-publisher-base:latest 2>&1 | tail -3
          fi
        fi
        rm -f "$TMP_TAR"
      fi
    fi
    # Not: base.sha256 var ama eslesmiyorsa → Kaniko rebuild (asagidaki blok)
  fi
fi

if [ "$BASE_SKIPPED" = "false" ]; then
  if [ -f "Dockerfile.base" ]; then
    echo "[INFO] Base yeniden insa ediliyor (Kaniko)..."
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
fi

# Base sha256 → DRIVE_DIR/base.sha256 yaz
# Tum modeller bu hash'i kullanarak stale image kontrolu yapar.
if [ -n "$BASE_DOCKERFILE_SHA" ]; then
  echo "$BASE_DOCKERFILE_SHA" > "$DRIVE_DIR/base.sha256"
  echo "✅ base.sha256: ${BASE_DOCKERFILE_SHA:0:12}..."
fi

# Model skip helper: DRIVE_DIR/MODEL.sha256 (base+Dockerfile hash) eslesiyorsa skip
compute_model_sha() {
  local model=$1
  local base_sha=$2
  local df_sha
  df_sha=$(sha256sum "$model/Dockerfile" | awk '{print $1}')
  # base sha + dockerfile sha → model identity
  echo -n "${base_sha}:${df_sha}" | sha256sum | awk '{print $1}'
}

MODELS=("cogvideox" "wan" "ltx" "hunyuan" "xtts" "audioldm2" "wav2lip" "musetalk" "whisper" "stablediffusion" "kokorotts" "svd" "animatediff" "wan25" "f5tts" "lora-trainer" "zeroscope" "dynamicrafter" "sadtalker" "pyramid-flow" "mochi" "video-retalking" "geneface")
TOTAL_MODELS=${#MODELS[@]}

for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  IDX=$((i + 1))
  
  # Skip logic: base.sha256 + Dockerfile sha256 eşleşiyorsa ve tar.gz varsa atla
  # Bu sayede base değişikliği otomatik invalidate eder.
  MIN_SIZE=$((100 * 1024 * 1024))
  if [ -f "$DRIVE_DIR/$MODEL.tar.gz" ] && [ -f "$DRIVE_DIR/$MODEL.sha256" ] && [ -f "Dockerfile.base" ]; then
    CURRENT_SHA=$(compute_model_sha "$MODEL" "$(cat "$DRIVE_DIR/base.sha256" 2>/dev/null)")
    STORED_SHA=$(cat "$DRIVE_DIR/$MODEL.sha256" 2>/dev/null)
    FILE_SIZE=$(stat -c%s "$DRIVE_DIR/$MODEL.tar.gz" 2>/dev/null || echo 0)
    if [ "$CURRENT_SHA" = "$STORED_SHA" ] && [ "$FILE_SIZE" -ge "$MIN_SIZE" ] 2>/dev/null; then
      echo ""
      echo "======================================================================"
      echo "⏭️  [$IDX/$TOTAL_MODELS] MODEL: $MODEL (sha256 eslesti, atlandi)"
      echo "      ${CURRENT_SHA:0:12}... / boyut: $((FILE_SIZE/1024/1024)) MB"
      echo "======================================================================"
      continue
    else
      REASON="sha degisti"
      [ "$FILE_SIZE" -lt "$MIN_SIZE" ] 2>/dev/null && REASON="dosya bozuk/kucuk"
      echo ""
      echo "======================================================================"
      echo "🔄 [$IDX/$TOTAL_MODELS] MODEL: $MODEL (yeniden build: $REASON)"
      echo "      eski: ${STORED_SHA:0:12}  yeni: ${CURRENT_SHA:0:12}"
      echo "======================================================================"
      rm -f "$DRIVE_DIR/$MODEL.tar.gz" "$DRIVE_DIR/$MODEL.sha256"
    fi
  elif [ -f "$DRIVE_DIR/$MODEL.tar.gz" ]; then
    FILE_SIZE=$(stat -c%s "$DRIVE_DIR/$MODEL.tar.gz" 2>/dev/null || echo 0)
    if [ "$FILE_SIZE" -lt "$MIN_SIZE" ] 2>/dev/null; then
      echo ""
      echo "======================================================================"
      echo "⚠️  [$IDX/$TOTAL_MODELS] MODEL: $MODEL (Drive'da bozuk/kucuk: ${FILE_SIZE:-0} byte, yeniden build)"
      echo "======================================================================"
      rm -f "$DRIVE_DIR/$MODEL.tar.gz" "$DRIVE_DIR/$MODEL.sha256"
    else
      # Bootstrap: tar.gz var ama .sha256 yok → mevcut hash'i yaz, "guvenilir" kabul et
      # Ilk calistirmada bir kere yazilir, sonraki calistirmalarda gercek skip devreye girer.
      BOOTSTRAP_SHA=$(compute_model_sha "$MODEL" "$(cat "$DRIVE_DIR/base.sha256" 2>/dev/null)")
      echo "$BOOTSTRAP_SHA" > "$DRIVE_DIR/$MODEL.sha256"
      echo ""
      echo "======================================================================"
      echo "🆕 [$IDX/$TOTAL_MODELS] MODEL: $MODEL (bootstrap: sha olusturuldu)"
      echo "      ${BOOTSTRAP_SHA:0:12}... / boyut: $((FILE_SIZE/1024/1024)) MB"
      echo "======================================================================"
      continue
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
  sed -i 's|FROM ai-publisher-base:latest|FROM localhost:5000/ai-publisher-base:latest|g' "$MODEL/Dockerfile"
  
  # Faz 3: Kaniko Build
  echo "[FAZ 3/4] Kaniko ile model imaji insa ediliyor..."
  
  # Copy runpod_handler.py to model directory for context access during build
  cp -f runpod_handler.py "$MODEL/"
  
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
  
  # Clean up runpod_handler.py from model directory
  rm -f "$MODEL/runpod_handler.py"
  
  # Dockerfile'ı eski haline geri döndür
  sed -i 's|FROM localhost:5000/ai-publisher-base:latest|FROM ai-publisher-base:latest|g' "$MODEL/Dockerfile"
  
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
  else
    gzip -c "$MODEL.tar" > "$DRIVE_DIR/$MODEL.tar.gz"
  fi
  
  SAVE_STATUS=$?
  rm -f "$MODEL.tar"
  
  if [ $SAVE_STATUS -ne 0 ]; then
    echo "❌ Hata: $MODEL imaji kaydedilirken sıkıştırma sorunu oluştu!"
    continue
  fi
  
  SAVE_DURATION=$((SECONDS - SAVE_START))
  echo "✅ Basarili! $MODEL.tar.gz Google Drive'a eklendi."

  # Model sha256 yaz (base.sha256 + Dockerfile hash)
  if [ -f "Dockerfile.base" ] && [ -f "$MODEL/Dockerfile" ] && [ -f "$DRIVE_DIR/base.sha256" ]; then
    MODEL_SHA=$(compute_model_sha "$MODEL" "$(cat "$DRIVE_DIR/base.sha256")")
    echo "$MODEL_SHA" > "$DRIVE_DIR/$MODEL.sha256"
    echo "   sha256: ${MODEL_SHA:0:12}... (base+Dockerfile hash)"
  fi

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
