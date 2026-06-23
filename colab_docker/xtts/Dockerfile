FROM ai-publisher-base:latest

# Install system dependencies for XTTS and rubberband
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    rubberband-cli \
    rubberband-ladspa \
    && rm -rf /var/lib/apt/lists/*

# Install XTTS, edge-tts, openai, pyrubberband, and soundfile
RUN pip install --no-cache-dir \
    coqui-tts \
    edge-tts \
    openai \
    pyrubberband \
    soundfile

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["python", "-u", "runpod_handler.py"]

