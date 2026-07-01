# Self-contained Dockerfile Generator
# Each model gets its own FROM + all deps, no shared base images.

# ─── GROUP A: torch 2.2.1 ───
$aptCommon = @'
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 espeak-ng espeak git wget curl xz-utils tar cmake \
    libgl1-mesa-glx libglib2.0-0 build-essential libass-dev \
    gobject-introspection fonts-dejavu fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*
RUN wget -q https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar -xf ffmpeg-release-amd64-static.tar.xz && \
    mv ffmpeg-*-amd64-static/ffmpeg /usr/bin/ffmpeg && \
    mv ffmpeg-*-amd64-static/ffprobe /usr/bin/ffprobe && \
    rm -rf ffmpeg-release-amd64-static.tar.xz ffmpeg-*-amd64-static
'@

$pipCommonA = @'
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    flask requests scipy "numpy<2.0.0" "torch==2.2.1" "torchvision==0.17.1" \
    "torchaudio==2.2.1" accelerate "transformers>=4.46" pillow runpod boto3 \
    "xformers==0.0.25" opencv-python-headless "diffusers>=0.35,<0.36" \
    "sentencepiece>=0.2.0" tiktoken protobuf "einops>=0.8.0" decord \
    open_clip_torch av
'@

# ─── GROUP B: torch 2.6.0 ───
$aptCommonB = @'
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 espeak-ng espeak git wget curl cmake \
    libgl1-mesa-glx libglib2.0-0 build-essential libass-dev \
    gobject-introspection fonts-dejavu fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*
'@

$pipCommonB = @'
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    flask requests scipy "numpy<2.0.0" accelerate "transformers>=4.46" pillow \
    runpod boto3 "xformers>=0.0.28" opencv-python-headless \
    "diffusers>=0.35,<0.36" "sentencepiece>=0.2.0" tiktoken protobuf \
    "einops>=0.8.0" decord open_clip_torch av
'@

# ─── GROUP C: torch 2.8.0 ───
$pipCommonC = @'
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    flask requests scipy "numpy==1.26.0" accelerate "transformers>=4.57" pillow \
    runpod boto3 "xformers>=0.0.28" opencv-python-headless \
    "diffusers>=0.35,<0.36" "sentencepiece>=0.2.0" tiktoken protobuf \
    "einops>=0.8.0" decord open_clip_torch av
'@

# FROM mappings per group
$fromMap = @{
    "A" = "FROM pytorch/pytorch:2.2.1-cuda12.1-cudnn8-runtime"
    "B" = "FROM pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime"
    "C" = "FROM pytorch/pytorch:2.8.0-cuda12.6-cudnn9-runtime"
}

$envBlock = @'
ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC
ENV HF_HOME="/workspace/hf_cache" TORCH_HOME="/workspace/torch_cache"
'@

# ─── MODEL DEFINITIONS ───
$models = @(
    # Group A — torch 2.2.1
    @{Name="kokorotts"; Group="A"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install kokoro soundfile munch'; CopyRunpod=$true; Clone=$false},
    @{Name="whisper"; Group="A"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install faster-whisper openai-whisper'; CopyRunpod=$true; Clone=$false},
    @{Name="xtts"; Group="A"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN apt-get update && apt-get install -y --no-install-recommends rubberband-cli && rm -rf /var/lib/apt/lists/*\nRUN pip install coqui-tts edge-tts openai pyrubberband soundfile'; CopyRunpod=$true; Clone=$false},
    @{Name="audioldm2"; Group="A"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra=$null; CopyRunpod=$true; Clone=$false},
    @{Name="wav2lip"; Group="A"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install face_recognition face_recognition_models opencv-python-headless librosa\nRUN curl -sL "https://github.com/Rudrabha/Wav2Lip/archive/master.tar.gz" | tar -xz -C /app && mv /app/Wav2Lip-master /app/Wav2Lip && sed -i "s/parse_args()/parse_args(args=[])/" /app/Wav2Lip/inference.py'; CopyRunpod=$true; Clone=$false},
    @{Name="realesrgan"; Group="A"; Cmd='["/opt/conda/bin/python","-u","app.py"]'; Extra='RUN pip install --no-cache-dir --force-reinstall "numpy<2.0.0" realesrgan flask gunicorn'; CopyRunpod=$false; Clone=$false},
    @{Name="sadtalker"; Group="A"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install dlib-bin==19.24.1 face-recognition-models Click Pillow "face_recognition==1.3.0" --no-deps scipy opencv-python-headless numba gfpgan'; CopyRunpod=$true; Clone=$false},
    @{Name="stablediffusion"; Group="A"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install realesrgan gfpgan basicsr rembg'; CopyRunpod=$true; Clone=$false},
    @{Name="musetalk"; Group="A"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "transformers>=4.39.3" "accelerate==0.30.0" webdataset omegaconf safetensors einops av yacs gfpgan face-alignment facexlib\nRUN git clone --depth 1 --branch main https://github.com/TMElyralab/MuseTalk.git /app/MuseTalk 2>/dev/null || git clone --depth 1 https://github.com/TMElyralab/MuseTalk.git /app/MuseTalk'; CopyRunpod=$true; Clone=$false},
    @{Name="pyramid-flow"; Group="A"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "diffusers>=0.32.0" "transformers>=4.39.3" "accelerate==0.30.0" einops ftfy "opencv-python-headless==4.10.0.84" "imageio==2.33.1" "imageio-ffmpeg==0.5.1" sentencepiece "timm==0.6.12" tiktoken "scikit-image==0.22.0"'; CopyRunpod=$true; Clone=$false},

    # Group B — torch 2.6.0
    @{Name="f5tts"; Group="B"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "f5-tts>=1.1.0" soundfile librosa'; CopyRunpod=$true; Clone=$false},
    @{Name="animatediff"; Group="B"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "diffusers>=0.29.0" decord open_clip_torch'; CopyRunpod=$true; Clone=$false},
    @{Name="ltx"; Group="B"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "diffusers>=0.35,<0.36" decord open_clip_torch tokenizers'; CopyRunpod=$true; Clone=$false},
    @{Name="wan"; Group="B"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "diffusers>=0.35,<0.36" decord open_clip_torch tokenizers'; CopyRunpod=$true; Clone=$false},
    @{Name="hunyuan"; Group="B"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "diffusers>=0.35,<0.36" decord open_clip_torch'; CopyRunpod=$true; Clone=$false},
    @{Name="mochi"; Group="B"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "diffusers>=0.35,<0.36" "transformers>=4.45.2" "sentencepiece>=0.2.0" "av==13.1.0" "einops>=0.8.0" "moviepy==1.0.3" "ray>=2.37.0"'; CopyRunpod=$true; Clone=$false},
    @{Name="svd"; Group="B"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "diffusers>=0.35,<0.36" decord open_clip_torch'; CopyRunpod=$true; Clone=$false},
    @{Name="zeroscope"; Group="B"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "diffusers>=0.35,<0.36" "accelerate==0.30.0" "scipy==1.11.1" "numpy==1.24.2" "decord==0.6.0" "open_clip_torch==2.23.0"'; CopyRunpod=$true; Clone=$false},
    @{Name="dynamicrafter"; Group="B"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "decord==0.6.0" "einops==0.3.0" "imageio==2.9.0" "numpy==1.24.2" "omegaconf==2.1.1" "pytorch_lightning==1.9.3" "transformers>=4.25.1" moviepy av xformers "open_clip_torch==2.22.0" kornia timm'; CopyRunpod=$true; Clone=$false},
    @{Name="videocrafter"; Group="B"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "pytorch-lightning==2.1.0" "xformers==0.0.24" "omegaconf==2.3.0" "einops==0.7.0" "ftfy==6.2.0"\nRUN git clone https://github.com/AILab-CVC/VideoCrafter /app/videocrafter'; CopyRunpod=$true; Clone=$false},
    @{Name="lora-trainer"; Group="B"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "diffusers>=0.35,<0.36" "peft>=0.12.0" "accelerate>=0.33.0" "transformers>=4.44.0" "bitsandbytes>=0.43.0" pillow open_clip_torch requests'; CopyRunpod=$true; Clone=$false},

    # Group C — torch 2.8.0
    @{Name="cogvideox"; Group="C"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "diffusers>=0.35,<0.36" decord open_clip_torch'; CopyRunpod=$true; Clone=$false},
    @{Name="wan25"; Group="C"; Cmd='["/opt/conda/bin/python","-u","runpod_handler.py"]'; Extra='RUN pip install "diffusers>=0.35,<0.36" decord open_clip_torch tokenizers'; CopyRunpod=$true; Clone=$false}
)

$colabDir = "C:\Users\Damla\Proje\AI-Publisher\colab_docker"

# Shared files (runpod_handler.py, shared/)
$copyShared = @'
COPY runpod_handler.py /app/
COPY shared/ /app/shared/
'@

$copyApp = @'
COPY app.py /app/app.py
'@

# ─── GENERATE ───
foreach ($m in $models) {
    $group = $m.Group
    $extra = if ($m.Extra) { $m.Extra -replace "\\n", "`n" } else { $null }
    $cmd = $m.Cmd
    $name = $m.Name

    # Select group template
    $apt = if ($group -eq "A") { $aptCommon } else { $aptCommonB }
    $pip = if ($group -eq "A") { $pipCommonA } elseif ($group -eq "B") { $pipCommonB } else { $pipCommonC }

    $from = $fromMap[$group]
    if (-not $from) { throw "Unknown group: $group for model $name" }

    $dockerfile = @"
# Self-contained Dockerfile for $name
# Generated: no base image dependency

$from
$envBlock

$apt

$pip

WORKDIR /app

$extra

$copyApp
"@

    if ($m.CopyRunpod) {
        $dockerfile += @"

$copyShared
"@
    }

    $dockerfile += @"

CMD $cmd
"@

    $path = Join-Path (Join-Path $colabDir $name) "Dockerfile"
    Set-Content -Path $path -Value $dockerfile -Encoding UTF8
    Write-Host "✅ $name → Dockerfile written"
}

Write-Host "`n🎉 All Dockerfiles generated!"
