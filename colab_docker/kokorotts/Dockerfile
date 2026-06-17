FROM ai-publisher-base:latest

RUN pip install --no-cache-dir \
    kokoro \
    soundfile \
    munch

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5011

CMD ["python", "app.py"]
