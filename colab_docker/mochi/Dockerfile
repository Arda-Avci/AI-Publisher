FROM ai-publisher-base-cuda124:latest

ARG HF_TOKEN
ENV HF_TOKEN=${HF_TOKEN}

RUN /opt/conda/bin/pip install --no-cache-dir \
    "diffusers>=0.35,<0.36" \
    "transformers>=4.45.2" \
    "sentencepiece>=0.2.0" \
    "av==13.1.0" \
    "einops>=0.8.0" \
    "moviepy==1.0.3" \
    "ray>=2.37.0"

# Build-time weight download
# COPY download_weights.sh /tmp/download_weights.sh
# RUN chmod +x /tmp/download_weights.sh && \
#     /tmp/download_weights.sh "genmo/mochi-1-preview"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000
COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]
