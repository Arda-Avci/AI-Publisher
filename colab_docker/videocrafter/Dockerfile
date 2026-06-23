FROM ai-publisher-base:latest

# VideoCrafter specific dependencies
RUN pip install --no-cache-dir \
    pytorch-lightning==2.1.0 \
    xformers==0.0.24 \
    omegaconf==2.3.0 \
    einops==0.7.0 \
    ftfy==6.2.0

# Model weights downloaded at runtime from HuggingFace via app.py git clone

COPY app.py /app/
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/

CMD ["python", "-u", "runpod_handler.py"]
