FROM ai-publisher-base:latest

ARG HF_TOKEN
ENV HF_TOKEN=${HF_TOKEN}

# VideoCrafter specific dependencies
RUN /opt/conda/bin/pip install --no-cache-dir \
    pytorch-lightning==2.1.0 \
    xformers==0.0.24 \
    omegaconf==2.3.0 \
    einops==0.7.0 \
    ftfy==6.2.0

# Clone VideoCrafter repo at build time for config files
RUN git clone --depth 1 https://github.com/AILab-CVC/VideoCrafter.git /app/videocrafter

COPY app.py /app/
WORKDIR /app
EXPOSE 5000

COPY runpod_handler.py /app/
COPY shared/ /app/shared/

CMD ["/opt/conda/bin/python", "-u", "runpod_handler.py"]
