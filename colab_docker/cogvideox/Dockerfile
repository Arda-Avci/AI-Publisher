FROM ai-publisher-base:latest

# Install video-specific packages
RUN pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    decord \
    open_clip_torch

# Build-time weight download (CogVideoX 2b/5b + T2V/I2V)
COPY download_weights.sh /tmp/download_weights.sh
RUN chmod +x /tmp/download_weights.sh && \
    /tmp/download_weights.sh "THUDM/CogVideoX-2b" && \
    /tmp/download_weights.sh "THUDM/CogVideoX-5b" && \
    /tmp/download_weights.sh "THUDM/CogVideoX-2b-I2V" && \
    /tmp/download_weights.sh "THUDM/CogVideoX-5b-I2V"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["python", "-u", "runpod_handler.py"]

