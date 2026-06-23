FROM ai-publisher-base:latest

RUN pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    "accelerate==0.30.0" \
    "scipy==1.11.1" \
    "numpy==1.24.2" \
    "decord==0.6.0" \
    "open_clip_torch==2.23.0"

# Build-time weight download
COPY download_weights.sh /tmp/download_weights.sh
RUN chmod +x /tmp/download_weights.sh && \
    /tmp/download_weights.sh "cerspense/zeroscope_v2_576w"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["python", "-u", "runpod_handler.py"]

