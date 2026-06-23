FROM ai-publisher-base:latest

# Install LTX-Video specific dependencies
RUN pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    decord \
    open_clip_torch

# Build-time weight download
COPY download_weights.sh /tmp/download_weights.sh
RUN chmod +x /tmp/download_weights.sh && \
    /tmp/download_weights.sh "Lightricks/LTX-Video"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["python", "-u", "runpod_handler.py"]

