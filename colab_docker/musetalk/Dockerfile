FROM ai-publisher-base:latest

ARG HF_TOKEN
ENV HF_TOKEN=${HF_TOKEN}

# Clone MuseTalk repository (archive olarak indir, git clone Kaniko'da auth sorunu cikarir)
# Once main/master branch farki olabiliyor -> once main dene, olmazsa master
RUN curl -sL --retry 3 https://github.com/TMElyralab/MuseTalk/archive/main.tar.gz -o /tmp/musetalk.tar.gz; \
    if ! gzip -t /tmp/musetalk.tar.gz 2>/dev/null; then \
      echo "[WARN] main branch tar.gz gecersiz, master deneniyor..."; \
      curl -sL --retry 3 https://github.com/TMElyralab/MuseTalk/archive/master.tar.gz -o /tmp/musetalk.tar.gz; \
    fi; \
    if gzip -t /tmp/musetalk.tar.gz 2>/dev/null; then \
      echo "[OK] Gecerli tar.gz, ayiklamaya baslaniyor..."; \
      tar -xzf /tmp/musetalk.tar.gz -C /tmp/ && \
      rm -rf /app/MuseTalk && \
      mkdir -p /app/MuseTalk && \
      if [ -d /tmp/MuseTalk-main ]; then \
        cp -a /tmp/MuseTalk-main/. /app/MuseTalk/; \
      elif [ -d /tmp/MuseTalk-master ]; then \
        cp -a /tmp/MuseTalk-master/. /app/MuseTalk/; \
      fi && \
      rm -rf /tmp/musetalk.tar.gz /tmp/MuseTalk-main /tmp/MuseTalk-master; \
    else \
      echo "[ERROR] MuseTalk repository indirilemedi!" && exit 1; \
    fi && \
    ls -la /app/MuseTalk/

# Install MuseTalk-specific dependencies (pytorch3d conda-only, hata verir -> skip)
RUN /opt/conda/bin/pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    "transformers>=4.39.3" \
    "accelerate==0.30.0" \
    "webdataset" \
    "omegaconf" \
    "safetensors" \
    "diffusers" \
    "einops" \
    "av" \
    "yacs" \
    "gfpgan" \
    "face-alignment" \
    "facexlib"

# Build-time weight download devre disi — runtime'da indirilecek
# mkdir -p /app/MuseTalk/models && \
# cd /app/MuseTalk && \
# HF_HOME=/app/MuseTalk/models HF_TOKEN="${HF_TOKEN:-}" \
# python -c "from huggingface_hub import snapshot_download; import os; snapshot_download('TMElyralab/MuseTalk', local_dir='models', cache_dir=os.environ['HF_HOME'], ignore_patterns=['*.git*', 'docs/*'], token=os.environ.get('HF_TOKEN') or None)"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]
