import os
import gc
import torch
import numpy as np
from flask import Flask, request, jsonify
from diffusers import AudioLDM2Pipeline
import scipy.io.wavfile as wavfile

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
    print("[PATCH] T5TokenizerFast monkey-patch applied successfully in audioldm2.")
except Exception as e:
    print(f"[PATCH] T5TokenizerFast patch failed in audioldm2: {e}")

if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")

app = Flask(__name__)

# Lazy loaded pipeline
SFX_PIPE = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_sfx_pipe():
    global SFX_PIPE
    if SFX_PIPE is None:
        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
        print(f"[CONTAINER] Loading AudioLDM2 (VRAM: {vram_gb:.2f} GB)")
        
        pipe = AudioLDM2Pipeline.from_pretrained(
            "cvssp/audioldm2",
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
        )
        if vram_gb >= 18.0:
            pipe = pipe.to("cuda")
        else:
            pipe.enable_model_cpu_offload()
            
        SFX_PIPE = pipe
    return SFX_PIPE

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    prompt = data.get("prompt", "")
    output_path = data.get("output_path", "/workspace/outputs/sfx.wav")
    audio_length_in_s = float(data.get("audio_length_in_s", 6.0))
    num_inference_steps = int(data.get("num_inference_steps", 20))

    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    try:
        pipe = get_sfx_pipe()
        print(f"[CONTAINER] Generating SFX for prompt: {prompt}")
        
        with torch.inference_mode():
            audio = pipe(
                prompt,
                audio_length_in_s=audio_length_in_s,
                num_inference_steps=num_inference_steps,
            ).audios

        # Convert to 16-bit PCM WAV
        wavfile.write(output_path, 16000, (audio[0] * 32767).astype(np.int16))
        return jsonify({"status": "success", "output_path": output_path}), 200

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
        pipe = get_sfx_pipe()
        flush_memory()
        return jsonify({"status": "ok", "model_loaded": pipe is not None})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


