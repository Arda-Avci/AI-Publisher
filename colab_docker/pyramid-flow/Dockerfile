FROM ai-publisher-base:latest

ARG HF_TOKEN
ENV HF_TOKEN=\

RUN /opt/conda/bin/pip install --no-cache-dir \
    "diffusers>=0.30.0" \
    "transformers>=4.39.3" \
    "accelerate==0.30.0" \
    "einops" \
    "ftfy" \
    "opencv-python-headless==4.10.0.84" \
    "imageio==2.33.1" \
    "imageio-ffmpeg==0.5.1" \
    "sentencepiece" \
    "timm==0.6.12" \
    "tiktoken" \
    "scikit-image==0.22.0"

# Build-time weight download
# COPY download_weights.sh /tmp/download_weights.sh
# RUN chmod +x /tmp/download_weights.sh && \
#     /tmp/download_weights.sh "nvidia/Pyramid-Flow"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]
