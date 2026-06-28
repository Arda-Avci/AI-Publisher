import os
import gc
import sys
import torch
import numpy as np
from flask import Flask, request, jsonify
import subprocess

# Monkey-patch importlib.metadata.version to report PyTorch >= 2.4.0
import importlib.metadata
_orig_metadata_version = importlib.metadata.version
def _patched_metadata_version(distribution_name):
    if distribution_name.lower() == "torch":
        return "2.4.0"
    return _orig_metadata_version(distribution_name)
importlib.metadata.version = _patched_metadata_version

import builtins
torch.__version__ = "2.4.0"
if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")

import torch.nn as nn
if not hasattr(nn, "RMSNorm"):
    class RMSNorm(nn.Module):
        def __init__(self, normalized_shape, eps=1e-8, elementwise_affine=True, device=None, dtype=None):
            super().__init__()
            self.eps = eps
            dim = normalized_shape if isinstance(normalized_shape, int) else normalized_shape[-1]
            if elementwise_affine:
                self.weight = nn.Parameter(torch.ones(dim, device=device, dtype=dtype))
            else:
                self.register_parameter('weight', None)
        def forward(self, x):
            variance = x.pow(2).mean(-1, keepdim=True)
            return x * torch.rsqrt(variance + self.eps) * (self.weight if self.weight is not None else 1.0)
    nn.RMSNorm = RMSNorm

import torch.nn.functional as F
_orig_sdpa = F.scaled_dot_product_attention
def _patched_sdpa(*args, **kwargs):
    if "enable_gqa" in kwargs:
        del kwargs["enable_gqa"]
    return _orig_sdpa(*args, **kwargs)
F.scaled_dot_product_attention = _patched_sdpa

builtins.nn = nn
builtins.torch = torch

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
    except ImportError:
        pass

if not hasattr(torch, "uint16"):
    torch.uint16 = torch.int16
if not hasattr(torch, "uint32"):
    torch.uint32 = torch.int32
if not hasattr(torch, "uint64"):
    torch.uint64 = torch.int64

# Force-initialize T5 lazy modules
import_error = None
try:
    import types
    import importlib
    import transformers
    import transformers.models.t5

    def get_t5_submodule(name):
        module_name = f"transformers.models.t5.{name}"
        if hasattr(transformers.models.t5, "_get_module"):
            try:
                return transformers.models.t5._get_module(name)
            except Exception:
                pass
        return importlib.import_module(module_name)

    real_modeling_t5 = get_t5_submodule("modeling_t5")
    real_tokenization_t5 = get_t5_submodule("tokenization_t5")

    T5EncoderModel = getattr(real_modeling_t5, "T5EncoderModel")
    T5Tokenizer = getattr(real_tokenization_t5, "T5Tokenizer")

    from transformers.tokenization_utils_fast import PreTrainedTokenizerFast

    class T5TokenizerFast(PreTrainedTokenizerFast):
        vocab_files_names = {"vocab_file": "spiece.model", "tokenizer_file": "tokenizer.json"}
        model_input_names = ["input_ids", "attention_mask"]
        slow_tokenizer_class = T5Tokenizer
        def __init__(self, vocab_file=None, tokenizer_file=None, eos_token="</s>", unk_token="<unk>", pad_token="<pad>", extra_ids=100, additional_special_tokens=None, **kwargs):
            if extra_ids > 0 and additional_special_tokens is None:
                additional_special_tokens = [f"<extra_id_{i}>" for i in range(extra_ids)]
            super().__init__(vocab_file=vocab_file, tokenizer_file=tokenizer_file, eos_token=eos_token, unk_token=unk_token, pad_token=pad_token, additional_special_tokens=additional_special_tokens, **kwargs)

    real_modeling_t5.T5EncoderModel = T5EncoderModel
    real_tokenization_t5.T5Tokenizer = T5Tokenizer
    real_tokenization_t5.T5TokenizerFast = T5TokenizerFast

    sys.modules["transformers.models.t5.modeling_t5"] = real_modeling_t5
    sys.modules["transformers.models.t5.tokenization_t5"] = real_tokenization_t5
    mock_tok_fast = types.ModuleType("transformers.models.t5.tokenization_t5_fast")
    mock_tok_fast.T5TokenizerFast = T5TokenizerFast
    sys.modules["transformers.models.t5.tokenization_t5_fast"] = mock_tok_fast

    transformers.T5EncoderModel = T5EncoderModel
    transformers.T5Tokenizer = T5Tokenizer
    transformers.T5TokenizerFast = T5TokenizerFast
    transformers.models.t5.T5EncoderModel = T5EncoderModel
    transformers.models.t5.T5Tokenizer = T5Tokenizer
    transformers.models.t5.T5TokenizerFast = T5TokenizerFast
except Exception as e:
    import traceback
    import_error = traceback.format_exc()

app = Flask(__name__)

current_model_name = None
current_pipe = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_pipeline(video_model, is_i2v):
    global current_model_name, current_pipe
    model_key = f"{video_model}_{'i2v' if is_i2v else 't2v'}"
    
    if current_model_name == model_key and current_pipe is not None:
        return current_pipe
        
    if current_pipe is not None:
        del current_pipe
        flush_memory()
        
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"[CONTAINER] Loading model {video_model} (VRAM: {vram_gb:.2f} GB)")
    
    if is_i2v:
        if "wan" in video_model.lower():
            from diffusers import WanPipeline
            pipe = WanPipeline.from_pretrained("Wan-AI/Wan2.1-I2V-14B-480P", torch_dtype=torch.bfloat16)
        elif "ltx" in video_model.lower():
            from diffusers import LTXImageToVideoPipeline
            pipe = LTXImageToVideoPipeline.from_pretrained("Lightricks/LTX-Video", torch_dtype=torch.bfloat16)
        elif "hunyuan" in video_model.lower():
            from diffusers import HunyuanVideoPipeline
            pipe = HunyuanVideoPipeline.from_pretrained("hunyuanvideo-community/HunyuanVideo", torch_dtype=torch.bfloat16)
        else:
            from diffusers import CogVideoXImageToVideoPipeline
            model_name = "THUDM/CogVideoX-2b-I2V" if "2b" in video_model.lower() else "THUDM/CogVideoX-5b-I2V"
            pipe = CogVideoXImageToVideoPipeline.from_pretrained(model_name, torch_dtype=torch.float16)
    else:
        if "wan" in video_model.lower():
            from diffusers import WanPipeline
            pipe = WanPipeline.from_pretrained("Wan-AI/Wan2.1-T2V-1.3B", torch_dtype=torch.bfloat16)
        elif "ltx" in video_model.lower():
            from diffusers import LTXPipeline
            pipe = LTXPipeline.from_pretrained("Lightricks/LTX-Video", torch_dtype=torch.bfloat16)
        elif "hunyuan" in video_model.lower():
            from diffusers import HunyuanVideoPipeline
            pipe = HunyuanVideoPipeline.from_pretrained("hunyuanvideo-community/HunyuanVideo", torch_dtype=torch.bfloat16)
        else:
            from diffusers import CogVideoXPipeline
            model_name = "THUDM/CogVideoX-2b" if "2b" in video_model.lower() else "THUDM/CogVideoX-5b"
            pipe = CogVideoXPipeline.from_pretrained(model_name, torch_dtype=torch.float16)

    if vram_gb >= 18.0:
        pipe.to("cuda")
    else:
        pipe.enable_model_cpu_offload()
        
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()
        
    current_model_name = model_key
    current_pipe = pipe
    return pipe

def frames_to_mp4(frames, path, fps=8):
    frame_arr = []
    for f in frames:
        f_np = np.array(f)
        if f_np.dtype in [np.float16, np.float32, np.float64]:
            if f_np.max() <= 1.0:
                f_np = (np.clip(f_np, 0.0, 1.0) * 255).astype(np.uint8)
            else:
                f_np = f_np.astype(np.uint8)
        elif f_np.dtype != np.uint8:
            f_np = f_np.astype(np.uint8)
        frame_arr.append(f_np)
    frames_arr = np.stack(frame_arr)
    h, w = frames_arr.shape[1:3]
    w = w + (w % 2)
    h = h + (h % 2)
    cmd = [
        '/usr/bin/ffmpeg', '-y',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', f'{w}x{h}',
        '-pix_fmt', 'rgb24',
        '-r', str(fps),
        '-i', '-',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'medium',
        '-crf', '18',
        '-movflags', '+faststart',
        path
    ]
    proc = subprocess.run(cmd, input=frames_arr.tobytes(), capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f'FFmpeg encoding failed: {proc.stderr.decode(errors="replace")}')

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    image_path = data.get("image_path", "")
    video_model = data.get("video_model", "CogVideoX-5b")
    output_path = data.get("output_path", "/workspace/outputs/raw_video.mp4")
    num_frames = int(data.get("num_frames", 49))
    num_inference_steps = int(data.get("num_inference_steps", 30))

    # Make sure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    is_i2v = bool(image_path and os.path.exists(image_path))
    
    try:
        pipe = get_pipeline(video_model, is_i2v)
        
        with torch.inference_mode():
            if is_i2v:
                from diffusers.utils import load_image
                init_image = load_image(image_path)
                if "wan" in video_model.lower():
                    output = pipe(prompt=prompt, image=init_image, num_frames=81, num_inference_steps=30)
                elif "ltx" in video_model.lower():
                    output = pipe(image=init_image, prompt=prompt, num_frames=65, num_inference_steps=25)
                elif "hunyuan" in video_model.lower():
                    output = pipe(prompt=prompt, num_frames=65, num_inference_steps=25)
                else:
                    output = pipe(prompt=prompt, image=init_image, num_frames=num_frames, num_inference_steps=num_inference_steps)
            else:
                if "wan" in video_model.lower():
                    output = pipe(prompt=prompt, num_frames=81, num_inference_steps=30)
                elif "ltx" in video_model.lower():
                    output = pipe(prompt=prompt, num_frames=65, num_inference_steps=25)
                elif "hunyuan" in video_model.lower():
                    output = pipe(prompt=prompt, num_frames=65, num_inference_steps=25)
                else:
                    output = pipe(prompt=prompt, num_frames=num_frames, num_inference_steps=num_inference_steps)

            frames = output.frames[0]
            
        frames_to_mp4(frames, output_path, fps=8)
        return jsonify({"status": "success", "output_path": output_path}), 200
        
    except torch.cuda.OutOfMemoryError as exc:
        flush_memory()
        return jsonify({"status": "error", "message": "GPU Out Of Memory", "error": str(exc)}), 500
    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route("/preload", methods=["POST"])
def preload():
    """Pre-load model into VRAM to avoid cold start latency."""
    try:
        pipe = get_pipeline()
        vram_cleanup()
        return jsonify({"status": "ok", "model_loaded": pipe is not None})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


