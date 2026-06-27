import os
import sys
sys.setrecursionlimit(10000)

# Workaround for HuggingFace transformers accelerate integration NameError: 'nn' and 'torch' is not defined bug
import builtins
import torch
import torch.nn as nn
builtins.nn = nn
builtins.torch = torch

# Workaround for PyTorch < 2.3 where torch.uint16/32/64 do not exist
if not hasattr(torch, "uint16"):
    torch.uint16 = torch.int16
if not hasattr(torch, "uint32"):
    torch.uint32 = torch.int32
if not hasattr(torch, "uint64"):
    torch.uint64 = torch.int64

# Workaround for transformers circular/lazy import of GenerationMixin
try:
    from transformers.generation.utils import GenerationMixin
    import transformers.generation
    transformers.generation.GenerationMixin = GenerationMixin
except Exception as e:
    print(f"[CONTAINER - WAN] Warning during GenerationMixin preload: {e}")

# Force-initialize T5 lazy modules to prevent diffusers placeholder load errors
import_error = None
try:
    import transformers
    import transformers.models.t5
    
    # 1. Import real classes directly from implementation files
    from transformers.models.t5.modeling_t5 import T5EncoderModel
    from transformers.models.t5.tokenization_t5 import T5Tokenizer
    
    # We define T5TokenizerFast dynamically since it was removed in transformers v5+
    from transformers.tokenization_utils_fast import PreTrainedTokenizerFast
    
    class T5TokenizerFast(PreTrainedTokenizerFast):
        vocab_files_names = {"vocab_file": "spiece.model", "tokenizer_file": "tokenizer.json"}
        model_input_names = ["input_ids", "attention_mask"]
        slow_tokenizer_class = T5Tokenizer
        
        def __init__(
            self,
            vocab_file=None,
            tokenizer_file=None,
            eos_token="</s>",
            unk_token="<unk>",
            pad_token="<pad>",
            extra_ids=100,
            additional_special_tokens=None,
            **kwargs,
        ):
            if extra_ids > 0 and additional_special_tokens is None:
                additional_special_tokens = [f"<extra_id_{i}>" for i in range(extra_ids)]
            elif extra_ids > 0 and additional_special_tokens is not None:
                for i in range(extra_ids):
                    token = f"<extra_id_{i}>"
                    if token not in additional_special_tokens:
                        additional_special_tokens.append(token)
            super().__init__(
                vocab_file=vocab_file,
                tokenizer_file=tokenizer_file,
                eos_token=eos_token,
                unk_token=unk_token,
                pad_token=pad_token,
                additional_special_tokens=additional_special_tokens,
                **kwargs,
            )
            
    # 2. Bind them to transformers root to override any lazy placeholders
    transformers.T5EncoderModel = T5EncoderModel
    transformers.T5Tokenizer = T5Tokenizer
    transformers.T5TokenizerFast = T5TokenizerFast
    
    # 3. Bind them to transformers.models.t5 namespace
    transformers.models.t5.T5EncoderModel = T5EncoderModel
    transformers.models.t5.T5Tokenizer = T5Tokenizer
    transformers.models.t5.T5TokenizerFast = T5TokenizerFast
except Exception as e:
    import traceback
    import_error = traceback.format_exc()

import gc
import torch
import numpy as np
from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

current_model_type = None
current_pipe = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_pipeline(is_i2v):
    global current_model_type, current_pipe
    model_type = "i2v" if is_i2v else "t2v"
    
    if current_model_type == model_type and current_pipe is not None:
        return current_pipe
        
    if current_pipe is not None:
        del current_pipe
        flush_memory()
        
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"[CONTAINER - WAN] Loading Wan 2.1 {model_type} (VRAM: {vram_gb:.2f} GB)")
    
    if is_i2v:
        from diffusers import WanPipeline
        pipe = WanPipeline.from_pretrained(
            "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers", 
            torch_dtype=torch.bfloat16
        )
    else:
        from diffusers import WanPipeline
        pipe = WanPipeline.from_pretrained(
            "Wan-AI/Wan2.1-T2V-1.3B-Diffusers", 
            torch_dtype=torch.bfloat16
        )

    if vram_gb >= 18.0:
        pipe.to("cuda")
    else:
        pipe.enable_model_cpu_offload()
        
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()
        
    current_model_type = model_type
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
    cmd = [
        'ffmpeg', '-y',
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
    output_path = data.get("output_path", "/workspace/outputs/raw_video.mp4")
    
    if prompt == "diagnose":
        import sys
        import os
        import subprocess
        pip_list = subprocess.run(["pip", "list"], capture_output=True, text=True).stdout
        
        try:
            import tokenizers
            tok_msg = f"tokenizers imported successfully: {tokenizers.__file__}"
        except Exception as e:
            tok_msg = f"tokenizers import failed: {str(e)}"
            
        import transformers
        t5_dir = os.path.dirname(transformers.__file__) + "/models/t5"
        t5_files = os.listdir(t5_dir) if os.path.exists(t5_dir) else []
        
        return jsonify({
            "status": "diagnose",
            "pip_list": pip_list,
            "tok_msg": tok_msg,
            "t5_dir": t5_dir,
            "t5_files": t5_files,
            "import_error": import_error,
            "sys_path": sys.path
        }), 200
    
    # Make sure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Handle image URL download if necessary
    if image_path and (image_path.startswith("http://") or image_path.startswith("https://")):
        try:
            local_image_path = "/tmp/input_image.png"
            import requests
            r = requests.get(image_path, stream=True)
            r.raise_for_status()
            with open(local_image_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            image_path = local_image_path
            print(f"[CONTAINER - WAN] Successfully downloaded input image URL to: {image_path}")
        except Exception as download_err:
            print(f"[CONTAINER - WAN] Error downloading image URL: {download_err}")
            
    is_i2v = bool(image_path and os.path.exists(image_path))
    
    # Parse dynamic parameters
    num_frames = int(data.get("num_frames", 81))
    num_inference_steps = int(data.get("num_inference_steps", 30))
    fps = int(data.get("fps", 8))
    
    if import_error:
        return jsonify({"status": "error", "message": "T5 Import Failed", "traceback": import_error}), 500
        
    try:
        pipe = get_pipeline(is_i2v)
        
        with torch.inference_mode():
            if is_i2v:
                from diffusers.utils import load_image
                init_image = load_image(image_path)
                output = pipe(
                    prompt=prompt, 
                    image=init_image, 
                    num_frames=num_frames, 
                    num_inference_steps=num_inference_steps
                )
            else:
                output = pipe(
                    prompt=prompt, 
                    num_frames=num_frames, 
                    num_inference_steps=num_inference_steps
                )
            frames = output.frames[0]
            
        frames_to_mp4(frames, output_path, fps=fps)
        return jsonify({"status": "success", "output_path": output_path}), 200
        
    except torch.cuda.OutOfMemoryError as exc:
        flush_memory()
        return jsonify({"status": "error", "message": "GPU Out Of Memory", "error": str(exc)}), 500
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print("[CONTAINER - WAN] Exception during generate:")
        print(tb)
        flush_memory()
        return jsonify({"status": "error", "message": str(e), "traceback": tb}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route("/preload", methods=["POST"])
def preload():
    """Pre-load model into VRAM to avoid cold start latency."""
    try:
        pipe = get_pipeline(is_i2v=False)
        flush_memory()
        return jsonify({"status": "ok", "model_loaded": pipe is not None})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


