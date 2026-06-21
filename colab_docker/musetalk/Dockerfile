FROM ai-publisher-base:latest

# Clone MuseTalk repository (archive olarak indir, git clone Kaniko'da auth sorunu cikarir)
# Once main/master branch farki olabiliyor -> once main dene, olmazsa master
RUN curl -sL --retry 3 https://github.com/TMElyralab/MuseTalk/archive/main.tar.gz -o /tmp/musetalk.tar.gz; \
    if ! gzip -t /tmp/musetalk.tar.gz 2>/dev/null; then \
      echo "[WARN] main branch tar.gz gecersiz, master deneniyor..."; \
      curl -sL --retry 3 https://github.com/TMElyralab/MuseTalk/archive/master.tar.gz -o /tmp/musetalk.tar.gz; \
    fi; \
    if gzip -t /tmp/musetalk.tar.gz 2>/dev/null; then \
      echo "[OK] Gecerli tar.gz, ayiklamiyor..."; \
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
      echo "[WARN] tar.gz hala gecersiz, HTML yaniti:"; \
      cat /tmp/musetalk.tar.gz | head -c 500; \
      echo ""; \
      echo "[INFO] zip deneniyor..."; \
      curl -sL --retry 3 https://github.com/TMElyralab/MuseTalk/archive/master.zip -o /tmp/musetalk.zip; \
      rm -rf /app/MuseTalk && \
      mkdir -p /app/MuseTalk && \
      unzip -q /tmp/musetalk.zip -d /tmp/ && \
      cp -a /tmp/MuseTalk-master/. /app/MuseTalk/ && \
      rm -rf /tmp/musetalk.zip /tmp/MuseTalk-master; \
    fi && \
    ls -la /app/MuseTalk/

# Install MuseTalk-specific dependencies (pytorch3d conda-only, hata verir -> skip)
RUN pip install --no-cache-dir \
    opencv-python-headless \
    omegaconf \
    einops \
    diffusers \
    librosa \
    trimesh
RUN pip install --no-cache-dir pytorch3d 2>/dev/null || true

# Download MuseTalk model weights (required for inference)
RUN mkdir -p /app/MuseTalk/models && \
    cd /app/MuseTalk && \
    pip install --no-cache-dir huggingface_hub && \
    python -c "from huggingface_hub import snapshot_download; snapshot_download('TMElyralab/MuseTalk', local_dir='models', ignore_patterns=['*.git*', 'docs/*'])" 2>/dev/null || \
    echo "[WARN] MuseTalk model weights will be downloaded at runtime"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
CMD ["python", "-u", "runpod_handler.py"]
