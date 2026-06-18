FROM ai-publisher-base:latest

# Install whisper packages
RUN pip install --no-cache-dir \
    faster-whisper \
    openai-whisper

COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

CMD ["python", "app.py"]
