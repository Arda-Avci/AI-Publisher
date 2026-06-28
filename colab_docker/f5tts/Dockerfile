FROM ai-publisher-base:latest

ARG HF_TOKEN
ENV HF_TOKEN=\

RUN /opt/conda/bin/pip install --no-cache-dir \
    "f5-tts>=1.1.0" \
    "torch>=2.5.0" \
    soundfile \
    librosa

# Build-time weight download (F5-TTS: Vocos + inference checkpoints)
# COPY download_weights.sh /tmp/download_weights.sh
# RUN chmod +x /tmp/download_weights.sh && \
#     /tmp/download_weights.sh "charactr/vocos-mel-24khz"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]

