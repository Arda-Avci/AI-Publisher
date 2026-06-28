import os
import sys
sys.setrecursionlimit(10000)

# Monkey-patch importlib.metadata.version to report PyTorch >= 2.4.0
# to prevent transformers v5+ from disabling PyTorch support on torch < 2.4.0
import importlib.metadata
_orig_metadata_version = importlib.metadata.version
def _patched_metadata_version(distribution_name):
    if distribution_name.lower() == "torch":
        return "2.4.0"
    return _orig_metadata_version(distribution_name)
importlib.metadata.version = _patched_metadata_version

# Workaround for HuggingFace transformers accelerate integration NameError: 'nn' and 'torch' is not defined bug
import builtins
import torch
torch.__version__ = "2.4.0"
if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")

# Patch torch.nn.RMSNorm for PyTorch < 2.4.0
import torch.nn as nn
if not hasattr(nn, "RMSNorm"):
    class RMSNorm(nn.Module):
        def __init__(self, normalized_shape, eps=1e-8, elementwise_affine=True, device=None, dtype=None):
            super().__init__()
            self.eps = eps
            if isinstance(normalized_shape, int):
                dim = normalized_shape
            else:
                dim = normalized_shape[-1]
            if elementwise_affine:
                self.weight = nn.Parameter(torch.ones(dim, device=device, dtype=dtype))
            else:
                self.register_parameter('weight', None)
        def forward(self, x):
            variance = x.pow(2).mean(-1, keepdim=True)
            return x * torch.rsqrt(variance + self.eps) * (self.weight if self.weight is not None else 1.0)
    nn.RMSNorm = RMSNorm

builtins.nn = nn
builtins.torch = torch

# Workaround for accelerate GradScaler import error in PyTorch < 2.4.0
import torch.amp
if not hasattr(torch.amp, "GradScaler"):
    try:
        from torch.cuda.amp import GradScaler
        torch.amp.GradScaler = GradScaler
    except ImportError:
        pass

# Workaround for torch.compiler.is_compiling AttributeError in PyTorch < 2.3.0
import torch.compiler
if not hasattr(torch.compiler, "is_compiling"):
    torch.compiler.is_compiling = lambda: False
if not hasattr(torch.compiler, "is_dynamo_compiling"):
    torch.compiler.is_dynamo_compiling = lambda: False

# Workaround for torch.library.custom_op AttributeError in PyTorch < 2.4.0
import torch.library
def _patched_custom_op(name, fn=None, /, *, mutates_args=(), device_types=None, schema=None):
    parts = name.split("::")
    ns = parts[0]
    op_name = parts[1] if len(parts) > 1 else parts[0]
    class CustomOpCallable:
        def __init__(self, impl_fn):
            self.impl_fn = impl_fn
        def __call__(self, *args, **kwargs):
            return self.impl_fn(*args, **kwargs)
        def register_fake(self, fake_fn):
            return fake_fn
        def register_autograd(self, backward_fn, *args, **kwargs):
            return backward_fn
    def decorator(real_fn):
        if not hasattr(torch.ops, ns):
            class DummyNamespace:
                pass
            setattr(torch.ops, ns, DummyNamespace())
        op_callable = CustomOpCallable(real_fn)
        setattr(getattr(torch.ops, ns), op_name, op_callable)
        return op_callable
    if fn is not None:
        return decorator(fn)
    return decorator

if not hasattr(torch.library, "custom_op"):
    torch.library.custom_op = _patched_custom_op

_orig_register_fake = getattr(torch.library, "register_fake", None)
def _patched_register_fake(name, fn=None):
    if _orig_register_fake is not None:
        try:
            if fn is not None:
                return _orig_register_fake(name, fn)
            return _orig_register_fake(name)
        except Exception:
            pass
    if fn is not None:
        return fn
    return lambda f: f
torch.library.register_fake = _patched_register_fake

_orig_register_autograd = getattr(torch.library, "register_autograd", None)
def _patched_register_autograd(name, backward, /, *, setup_context=None):
    if _orig_register_autograd is not None:
        try:
            return _orig_register_autograd(name, backward, setup_context=setup_context)
        except Exception:
            pass
    return backward
torch.library.register_autograd = _patched_register_autograd

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
    import sys
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

    # 1. Load the physical modules bypassing lazy placeholders
    real_modeling_t5 = get_t5_submodule("modeling_t5")
    real_tokenization_t5 = get_t5_submodule("tokenization_t5")
    
    T5EncoderModel = getattr(real_modeling_t5, "T5EncoderModel")
    T5Tokenizer = getattr(real_tokenization_t5, "T5Tokenizer")
    
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
            
    # Set the modules attributes on the real modules
    real_modeling_t5.T5EncoderModel = T5EncoderModel
    real_tokenization_t5.T5Tokenizer = T5Tokenizer
    real_tokenization_t5.T5TokenizerFast = T5TokenizerFast
    
    # Register real modules in sys.modules to satisfy import lookups
    sys.modules["transformers.models.t5.modeling_t5"] = real_modeling_t5
    sys.modules["transformers.models.t5.tokenization_t5"] = real_tokenization_t5
    
    # Create mock module for tokenization_t5_fast and register it in sys.modules
    mock_tok_fast = types.ModuleType("transformers.models.t5.tokenization_t5_fast")
    mock_tok_fast.T5TokenizerFast = T5TokenizerFast
    sys.modules["transformers.models.t5.tokenization_t5_fast"] = mock_tok_fast
    
    # Bind classes to transformers root and models.t5 lazy module namespaces
    transformers.T5EncoderModel = T5EncoderModel
    transformers.T5Tokenizer = T5Tokenizer
    transformers.T5TokenizerFast = T5TokenizerFast
    
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

    if vram_gb <= 18.0:
        print(f"[CONTAINER - WAN] 16GB GPU class detected (VRAM: {vram_gb:.2f} GB). Enabling sequential CPU offload and VAE tiling.")
        pipe.enable_sequential_cpu_offload()
    else:
        print(f"[CONTAINER - WAN] 24GB GPU class detected (VRAM: {vram_gb:.2f} GB). Enabling model CPU offload.")
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
        import subprocess
        pip_list = subprocess.run(["pip", "list"], capture_output=True, text=True).stdout
        
        try:
            import tokenizers
            tok_msg = f"tokenizers imported successfully: {tokenizers.__file__}"
        except Exception as e:
            tok_msg = f"tokenizers import failed: {str(e)}"
            
        t5_model_info = {}
        try:
            import transformers
            t5_model_info["t5_encoder_attr"] = str(getattr(transformers, "T5EncoderModel", None))
            from transformers import T5EncoderModel
            t5_model_info["imported_class"] = str(T5EncoderModel)
            t5_model_info["bases"] = [str(b) for b in T5EncoderModel.__bases__]
            t5_model_info["class_name"] = T5EncoderModel.__name__
            t5_model_info["module"] = T5EncoderModel.__module__
        except Exception as t5_err:
            import traceback
            t5_model_info["error"] = str(t5_err)
            t5_model_info["traceback"] = traceback.format_exc()
            
        eager_info = {}
        try:
            import importlib.machinery
            import importlib.util
            loader = importlib.machinery.SourceFileLoader("transformers.models.t5.modeling_t5", "/opt/conda/lib/python3.10/site-packages/transformers/models/t5/modeling_t5.py")
            spec = importlib.util.spec_from_loader("transformers.models.t5.modeling_t5", loader)
            test_module = importlib.util.module_from_spec(spec)
            test_module.__package__ = "transformers.models.t5"
            loader.exec_module(test_module)
            eager_info["status"] = "success"
            eager_info["t5_encoder_class"] = str(getattr(test_module, "T5EncoderModel", None))
        except Exception as eager_err:
            import traceback
            eager_info["status"] = "error"
            eager_info["error"] = str(eager_err)
            eager_info["traceback"] = traceback.format_exc()
            
        try:
            import transformers.models.t5
            t5_model_info["t5_missing_backends"] = getattr(transformers.models.t5, "_object_missing_backend", {})
            from transformers.utils import import_utils
            t5_model_info["is_torch_available"] = import_utils.is_torch_available()
            t5_model_info["metadata_version"] = importlib.metadata.version("torch")
            t5_model_info["torch_version"] = torch.__version__
        except Exception as e:
            t5_model_info["t5_missing_backends_error"] = str(e)

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
            "t5_model_info": t5_model_info,
            "eager_info": eager_info,
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


