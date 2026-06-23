FROM ai-publisher-base:latest

# AudioLDM2 is mostly built on diffusers, which is already in base
COPY app.py /app/app.py
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/
CMD ["python", "-u", "runpod_handler.py"]

