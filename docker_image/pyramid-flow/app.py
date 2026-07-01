import os
import gc
import torch
import numpy as np

# transformers v5+ monkey patch
try:
    import transformers
    from transformers.tokenization_utils_fast import PreTrainedTokenizerFast
    from transformers.models.t5.tokenization_t5 import T5Tokenizer

    class T5TokenizerFast(PreTrainedTokenizerFast):
        vocab_files_names = {"vocab_file": "spiece.model", "tokenizer_file": "tokenizer.json"}
        model_input_names = ["input_ids", "attention_mask"]
        slow_tokenizer_class = T5Tokenizer
        
        def __init__(self, vocab_file=None, tokenizer_file=None, eos_token="</s>", unk_token="<unk>", pad_token="<pad>", extra_ids=100, additional_special_tokens=None, **kwargs):
            if extra_ids > 0 and additional_special_tokens is None:
                additional_special_tokens = [f"<extra_id_{i}>" for i in range(extra_ids)]
            elif extra_ids > 0 and additional_special_tokens is not None:
                for i in range(extra_ids):
                    token = f"<extra_id_{i}>"
                    if token not in additional_special_tokens:
                        additional_special_tokens.append(token)
            super().__init__(vocab_file=vocab_file, tokenizer_file=tokenizer_file, eos_token=eos_token, unk_token=unk_token, pad_token=pad_token, additional_special_tokens=additional_special_tokens, **kwargs)

    transformers.T5TokenizerFast = T5TokenizerFast
    if hasattr(transformers, "models") and hasattr(transformers.models, "t5"):
        transformers.models.t5.T5TokenizerFast = T5TokenizerFast
    print("[PATCH] T5TokenizerFast monkey-patch applied successfully.")
except Exception as e:
    print(f"[PATCH] T5TokenizerFast patch failed: {e}")

if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")

from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

current_pipe = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_pipeline():
    global current_pipe
    if current_pipe is not None:
        return current_pipe

    if current_pipe is not None:
        del current_pipe
        flush_memory()

    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"[CONTAINER - PYRAMID-FLOW] Loading Pyramid-Flow (VRAM: {vram_gb:.2f} GB)")

    from diffusers import PyramidFlowPipeline
    pipe = PyramidFlowPipeline.from_pretrained(
        "nvidia/Pyramid-Flow",
        torch_dtype=torch.bfloat16,
        variant="bf16"
    )

    if vram_gb >= 18.0:
        pipe.to("cuda")
    else:
        pipe.enable_model_cpu_offload()

    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()

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
    output_path = data.get("output_path", "/workspace/outputs/raw_video.mp4")

    # Make sure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    is_i2v = bool(image_path and os.path.exists(image_path))

    try:
        pipe = get_pipeline()

        with torch.inference_mode():
            if is_i2v:
                from diffusers.utils import load_image
                init_image = load_image(image_path)
                output = pipe(
                    prompt=prompt,
                    image=init_image,
                    num_frames=81,
                    num_inference_steps=30,
                )
            else:
                output = pipe(
                    prompt=prompt,
                    num_frames=81,
                    num_inference_steps=30,
                )
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
        flush_memory()
        return jsonify({"status": "ok", "model_loaded": pipe is not None})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


