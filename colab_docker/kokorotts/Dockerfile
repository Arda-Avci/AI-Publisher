FROM ai-publisher-base:latest

RUN pip install --no-cache-dir \
    kokoro \
    soundfile \
    munch

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
CMD ["python", "-u", "runpod_handler.py"]
