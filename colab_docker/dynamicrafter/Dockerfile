FROM ai-publisher-base:latest

RUN /opt/conda/bin/pip install --no-cache-dir \
    decord==0.6.0 \
    einops==0.3.0 \
    imageio==2.9.0 \
    "numpy==1.24.2" \
    omegaconf==2.1.1 \
    opencv-python-headless \
    pytorch_lightning==1.9.3 \
    "transformers>=4.25.1" \
    moviepy \
    av \
    xformers \
    "open_clip_torch==2.22.0" \
    kornia \
    timm

# Build-time weight download
# COPY download_weights.sh /tmp/download_weights.sh
# RUN chmod +x /tmp/download_weights.sh && \
#     /tmp/download_weights.sh "DynamiCrafter/dynamicrafter_512_interp_512"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]
