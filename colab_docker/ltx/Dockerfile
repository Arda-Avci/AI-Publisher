FROM ai-publisher-base:latest

# Install LTX-Video specific dependencies
RUN /opt/conda/bin/pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    decord \
    open_clip_torch

# Install wget and unzip to download static ffmpeg
RUN apt-get update && apt-get install -y wget unzip && \
    wget -q https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-linux-64.zip -O /tmp/ffmpeg.zip && \
    unzip -o /tmp/ffmpeg.zip -d /usr/bin && \
    chmod +x /usr/bin/ffmpeg && \
    rm /tmp/ffmpeg.zip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Build-time weight download
# COPY download_weights.sh /tmp/download_weights.sh
# RUN chmod +x /tmp/download_weights.sh && \
#     /tmp/download_weights.sh "Lightricks/LTX-Video"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]
