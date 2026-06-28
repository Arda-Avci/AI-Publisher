FROM ai-publisher-base:latest

# Install whisper packages
RUN /opt/conda/bin/pip install --no-cache-dir \
    faster-whisper \
    openai-whisper

# Build-time weight download devre disi — HuggingFace rate limit (429) nedeniyle
# Modeller runtime'da indirilecek (HF_HOME=/workspace/hf_cache ile cache'lenir)
# COPY download_weights.sh /tmp/download_weights.sh
# RUN chmod +x /tmp/download_weights.sh && \
#     /tmp/download_weights.sh "Systran/faster-whisper-small" && \
#     /tmp/download_weights.sh "Systran/faster-whisper-medium" && \
#     /tmp/download_weights.sh "Systran/faster-whisper-large-v3" && \
#     /tmp/download_weights.sh "openai/whisper-small" && \
#     /tmp/download_weights.sh "openai/whisper-large-v3"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]

