FROM ai-publisher-base:latest

# AudioLDM2 is mostly built on diffusers, which is already in base
COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5003

CMD ["python", "app.py"]
