FROM ai-publisher-base:latest

RUN pip install --no-cache-dir \
    "f5-tts>=1.1.0" \
    "torch>=2.5.0" \
    soundfile \
    librosa

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
CMD ["python", "-u", "runpod_handler.py"]
