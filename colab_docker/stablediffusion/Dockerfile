FROM ai-publisher-base:latest

# Install Stable Diffusion specific packages
RUN /opt/conda/bin/pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    realesrgan \
    gfpgan \
    basicsr \
    rembg

# Build-time weight download
COPY download_weights.sh /tmp/download_weights.sh
RUN chmod +x /tmp/download_weights.sh && \
    /tmp/download_weights.sh "Lykon/dreamshaper-8" && \
    /tmp/download_weights.sh "runwayml/stable-diffusion-inpainting"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]

