FROM ai-publisher-base:latest

# Install Wan 2.1 specific video generation dependencies
RUN /opt/conda/bin/pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    decord \
    open_clip_torch

# Build-time weight download (T2V + I2V)
COPY download_weights.sh /tmp/download_weights.sh
RUN chmod +x /tmp/download_weights.sh && \
    /tmp/download_weights.sh "Wan-AI/Wan2.1-T2V-1.3B" && \
    /tmp/download_weights.sh "Wan-AI/Wan2.1-I2V-14B-480P"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]
