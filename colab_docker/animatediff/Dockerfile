FROM ai-publisher-base:latest

ARG HF_TOKEN
ENV HF_TOKEN=${HF_TOKEN}

# Install AnimateDiff specific dependencies
RUN /opt/conda/bin/pip install --no-cache-dir \
    "diffusers>=0.29.0" \
    decord \
    open_clip_torch

# Build-time weight download
# COPY download_weights.sh /tmp/download_weights.sh
# RUN chmod +x /tmp/download_weights.sh && \
#     /tmp/download_weights.sh "guoyww/animatediff-motion-adapter-v1-5-2" && \
#     /tmp/download_weights.sh "frankjoshua/toonyou_beta6"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]

