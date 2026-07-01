import os
import gc
import cv2
import torch
import numpy as np
import base64

# transformers v5+ monkey patch — diffusers import'tan ÖNCE uygulanmalı
try:
    import transformers
    import importlib
    def _patched_version(name):
        if name.lower() == "torch": return "2.4.0"
        return importlib.metadata.version(name)
    importlib.metadata.version = _patched_version
    torch.__version__ = "2.4.0"

    if not hasattr(torch, "get_default_device"):
        torch.get_default_device = lambda: torch.device("cpu")

    import torch.nn as nn
    if not hasattr(nn, "RMSNorm"):
        class RMSNorm(nn.Module):
            def __init__(self, normalized_shape, eps=1e-8, elementwise_affine=True, **kw):
                super().__init__()
                self.eps = eps
                dim = normalized_shape if isinstance(normalized_shape, int) else normalized_shape[-1]
                self.weight = nn.Parameter(torch.ones(dim)) if elementwise_affine else None
            def forward(self, x):
                return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps) * (self.weight if self.weight is not None else 1.0)
        nn.RMSNorm = RMSNorm

    import torch.nn.functional as F
    _orig_sdpa = F.scaled_dot_product_attention
    def _patched_sdpa(*a, **kw):
        kw.pop("enable_gqa", None)
        return _orig_sdpa(*a, **kw)
    F.scaled_dot_product_attention = _patched_sdpa

    import torch.compiler
    if not hasattr(torch.compiler, "is_compiling"):
        torch.compiler.is_compiling = lambda: False
    if not hasattr(torch.compiler, "is_dynamo_compiling"):
        torch.compiler.is_dynamo_compiling = lambda: False

    import torch.amp
    if not hasattr(torch.amp, "GradScaler"):
        try:
            from torch.cuda.amp import GradScaler
            torch.amp.GradScaler = GradScaler
        except ImportError: pass

    if not hasattr(torch, "uint16"): torch.uint16 = torch.int16
    if not hasattr(torch, "uint32"): torch.uint32 = torch.int32
    if not hasattr(torch, "uint64"): torch.uint64 = torch.int64

    from transformers.tokenization_utils_fast import PreTrainedTokenizerFast
    from transformers.models.t5.tokenization_t5 import T5Tokenizer
    class T5TokenizerFast(PreTrainedTokenizerFast):
        vocab_files_names = {"vocab_file": "spiece.model", "tokenizer_file": "tokenizer.json"}
        model_input_names = ["input_ids", "attention_mask"]
        slow_tokenizer_class = T5Tokenizer
        def __init__(self, vocab_file=None, tokenizer_file=None, eos_token="</s>", unk_token="<unk>", pad_token="<pad>", extra_ids=100, additional_special_tokens=None, **kwargs):
            if extra_ids > 0 and additional_special_tokens is None:
                additional_special_tokens = [f"<extra_id_{i}>" for i in range(extra_ids)]
            super().__init__(vocab_file=vocab_file, tokenizer_file=tokenizer_file, eos_token=eos_token, unk_token=unk_token, pad_token=pad_token, additional_special_tokens=additional_special_tokens, **kwargs)
    transformers.T5TokenizerFast = T5TokenizerFast
    if hasattr(transformers, "models") and hasattr(transformers.models, "t5"):
        transformers.models.t5.T5TokenizerFast = T5TokenizerFast
    print("[PATCH] All monkey-patches applied for stablediffusion.")
except Exception as e:
    print(f"[PATCH] Patch failed: {e}")

from flask import Flask, request, jsonify, send_file
from diffusers import DiffusionPipeline, StableDiffusionInpaintPipeline, StableDiffusionPipeline, StableDiffusionXLPipeline, AutoPipelineForText2Image
from diffusers.utils import load_image

if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")

app = Flask(__name__)

# Lazy loaded pipeline cache
current_model_type = None
current_pipe = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_pipeline(model_type):
    global current_model_type, current_pipe
    if current_model_type == model_type and current_pipe is not None:
        return current_pipe

    if current_pipe is not None:
        del current_pipe
        flush_memory()

    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "unknown"
    print(f"[CONTAINER] Loading image model {model_type} (VRAM: {vram_gb:.2f} GB, GPU: {gpu_name})")

    if model_type == "flux":
        from diffusers import FluxPipeline
        pipe = FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16)
        pipe.enable_model_cpu_offload()
    elif model_type == "sdxl":
        pipe = AutoPipelineForText2Image.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            torch_dtype=torch.float16,
            variant="fp16"
        )
        if vram_gb <= 16.0:
            pipe.enable_sequential_cpu_offload()
            if hasattr(pipe, "enable_attention_slicing"):
                pipe.enable_attention_slicing("max")
        elif vram_gb <= 18.0:
            pipe.enable_model_cpu_offload()
        else:
            pipe.to("cuda")
    elif model_type == "inpaint":
        pipe = StableDiffusionInpaintPipeline.from_pretrained("runwayml/stable-diffusion-inpainting", torch_dtype=torch.float16)
        pipe.to("cuda")
    else:
        # dreamshaper or standard cover pipeline
        pipe = DiffusionPipeline.from_pretrained("Lykon/dreamshaper-8", torch_dtype=torch.float16, low_cpu_mem_usage=True)
        if vram_gb >= 18.0:
            pipe = pipe.to("cuda")
        else:
            pipe.enable_model_cpu_offload()

    current_model_type = model_type
    current_pipe = pipe
    return pipe

def enhance_face_gfpgan(image_path):
    try:
        from gfpgan import GFPGANer
        enhancer = GFPGANer(model_path='GFPGANv1.4', upscale=1, arch='clean', channel_multiplier=2, bg_upsampler=None)
        img = cv2.imread(image_path)
        if img is None:
            return image_path
        _, _, restored = enhancer.enhance(img, has_aligned=False, only_center_face=False, paste_back=True)
        cv2.imwrite(image_path, restored)
    except Exception as e:
        print(f"[CONTAINER] GFPGAN face restoration failed: {e}")
    return image_path

def upscale_image_realesrgan(image_path, scale=2):
    try:
        from realesrgan import RealESRGANer
        from basicsr.archs.rrdbnet_arch import RRDBNet
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=scale)
        upsampler = RealESRGANer(
            scale=scale,
            model_path='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth',
            model=model,
            tile=400,
            tile_pad=10,
            pre_pad=0,
            half=True if torch.cuda.is_available() else False,
        )
        img = cv2.imread(image_path)
        if img is None:
            return image_path
        output, _ = upsampler.enhance(img, outscale=scale)
        cv2.imwrite(image_path, output)
    except Exception as e:
        print(f"[CONTAINER] RealESRGAN upscaling failed: {e}")
    return image_path

@app.route("/generate-image", methods=["POST"])
def generate_image():
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    model_type = data.get("model_type", "dreamshaper")
    output_path = data.get("output_path", "/workspace/outputs/generated_anchor.png")
    width = int(data.get("width", 1024 if model_type == "sdxl" else 512))
    height = int(data.get("height", 1024 if model_type == "sdxl" else 512))
    num_inference_steps = int(data.get("num_inference_steps", 25 if model_type == "sdxl" else 20))
    guidance_scale = float(data.get("guidance_scale", 7.5 if model_type != "flux" else 0.0))

    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        pipe = get_pipeline(model_type)
        with torch.inference_mode():
            if model_type == "flux":
                image = pipe(prompt=prompt, guidance_scale=0.0, num_inference_steps=4, max_sequence_length=256).images[0]
            elif model_type == "sdxl":
                image = pipe(
                    prompt=prompt,
                    width=width,
                    height=height,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale
                ).images[0]
            else:
                image = pipe(prompt=prompt, num_inference_steps=20).images[0]

        image.save(output_path)
        return jsonify({"status": "success", "output_path": output_path}), 200
    except torch.cuda.OutOfMemoryError as exc:
        flush_memory()
        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
        return jsonify({"status": "error", "message": f"GPU OOM on {vram_gb:.1f}GB. Try lower resolution or different model.", "error": str(exc)}), 500
    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/generate-covers", methods=["POST"])
def generate_covers():
    data = request.get_json(force=True) or {}
    cover_prompt = data.get("cover_prompt", "")
    output_paths = data.get("output_paths", ["/workspace/outputs/cover_0.jpg", "/workspace/outputs/cover_1.jpg", "/workspace/outputs/cover_2.jpg"])
    model_type = data.get("model_type", "dreamshaper")

    if not cover_prompt:
        return jsonify({"error": "cover_prompt is required"}), 400

    try:
        pipe = get_pipeline(model_type)
        for i in range(min(3, len(output_paths))):
            with torch.inference_mode():
                if model_type == "sdxl":
                    img = pipe(prompt=cover_prompt, num_inference_steps=25, width=1024, height=1024).images[0]
                else:
                    img = pipe(prompt=cover_prompt, num_inference_steps=20, height=512, width=512).images[0]
            img.save(output_paths[i])
            enhance_face_gfpgan(output_paths[i])
            upscale_image_realesrgan(output_paths[i], scale=2)
            
        return jsonify({"status": "success", "output_paths": output_paths[:3]}), 200
    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/generate-avatar", methods=["POST"])
def generate_avatar():
    data = request.get_json(force=True) or {}
    avatar_prompt = data.get("avatar_prompt", "")
    style = data.get("style", "realistic")

    if not avatar_prompt:
        return jsonify({"error": "avatar_prompt is required"}), 400

    try:
        pipe = get_pipeline("dreamshaper")
        if style == "animatic":
            prompt = f"Pixar style animated character portrait, colorful cartoon headshot, {avatar_prompt}, vibrant gradient background, 3D render style"
        else:
            prompt = f"Cinematic portrait profile picture, high quality realistic headshot of {avatar_prompt}, solid dark background, professional lighting"

        with torch.inference_mode():
            img = pipe(prompt=prompt, num_inference_steps=25, height=512, width=512).images[0]

        temp_path = "/tmp/temp_avatar.jpg"
        img.save(temp_path)
        enhance_face_gfpgan(temp_path)
        upscale_image_realesrgan(temp_path, scale=2)

        with open(temp_path, "rb") as f:
            b64_data = base64.b64encode(f.read()).decode("utf-8")
        avatar_base64 = f"data:image/jpeg;base64,{b64_data}"

        if os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify({"status": "success", "avatar_base64": avatar_base64}), 200
    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/inpaint", methods=["POST"])
def inpaint():
    data = request.get_json(force=True) or {}
    image_path = data.get("image_path")
    mask_path = data.get("mask_path")
    prompt = data.get("prompt")
    output_path = data.get("output_path", "/workspace/outputs/inpaint_output.png")

    if not image_path or not mask_path or not prompt:
        return jsonify({"error": "image_path, mask_path, and prompt are required"}), 400

    try:
        pipe = get_pipeline("inpaint")
        init_image = load_image(image_path).convert("RGB")
        mask_image = load_image(mask_path).convert("RGB")

        with torch.inference_mode():
            image = pipe(prompt=prompt, image=init_image, mask_image=mask_image, num_inference_steps=25).images[0]

        image.save(output_path)
        return jsonify({"status": "success", "output_path": output_path}), 200
    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/remove-background", methods=["POST"])
def remove_background():
    data = request.get_json(force=True) or {}
    image_path = data.get("image_path")
    output_path = data.get("output_path")
    
    if not image_path or not output_path:
        return jsonify({"error": "image_path ve output_path parametreleri zorunlu"}), 400
        
    try:
        from rembg import remove
        with open(image_path, "rb") as f:
            input_data = f.read()
        output_data = remove(input_data)
        with open(output_path, "wb") as f:
            f.write(output_data)
        return jsonify({"status": "success", "output_path": output_path}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route("/preload", methods=["POST"])
def preload():
    """Pre-load model into VRAM to avoid cold start latency."""
    try:
        data = request.get_json(force=True) or {}
        model_type = data.get("model_type", "dreamshaper")
        pipe = get_pipeline(model_type)
        flush_memory()
        return jsonify({"status": "ok", "model_loaded": pipe is not None, "model_type": model_type})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


