FROM ai-publisher-base:latest

RUN pip install --no-cache-dir \
    kokoro \
    soundfile \
    munch

# Build-time weight download (kokoro implicit olarak hexgrad/Kokoro-82M indirir)
COPY download_weights.sh /tmp/download_weights.sh
RUN chmod +x /tmp/download_weights.sh && \
    /tmp/download_weights.sh "hexgrad/Kokoro-82M"

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["python", "-u", "runpod_handler.py"]

