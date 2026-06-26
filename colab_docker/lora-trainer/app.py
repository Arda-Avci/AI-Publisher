import os, gc, json, torch, uuid, threading, requests
from flask import Flask, request, jsonify
from PIL import Image

app = Flask(__name__)

current_pipe = None
current_weights_path = None
training_progress = {}  # {job_id: {"percent": int, "status": str}}

LORA_BASE_DIR = "/workspace/lora_weights"
os.makedirs(LORA_BASE_DIR, exist_ok=True)

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def _send_progress(job_id: int, percent: int, status: str, callback_url: str = ""):
    """Send SSE-like progress via callback."""
    training_progress[job_id] = {"percent": percent, "status": status}
    if callback_url:
        try:
            requests.post(callback_url, json={
                "job_id": job_id, "percent": percent, "status": status
            }, timeout=5)
        except Exception:
            pass  # callback is best-effort

def get_pipeline(use_cogvideo: bool = False):
    global current_pipe
    if current_pipe is not None:
        return current_pipe

    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0

    if use_cogvideo:
        from diffusers import CogVideoXPipeline
        pipe = CogVideoXPipeline.from_pretrained(
            "THUDM/CogVideoX-5b",
            torch_dtype=torch.bfloat16,
        )
        if vram_gb < 20.0:
            pipe.enable_model_cpu_offload()
        else:
            pipe.to("cuda")
        if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
            pipe.vae.enable_tiling()
        pipe.enable_attention_slicing()
        current_pipe = pipe
        return pipe

    from diffusers import DiffusionPipeline
    pipe = DiffusionPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True
    )
    if vram_gb < 20.0:
        pipe.enable_model_cpu_offload()
    else:
        pipe.to("cuda")
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()
    pipe.enable_attention_slicing()
    current_pipe = pipe
    return pipe

def load_lora_weights(pipe, weights_path):
    pipe.load_lora_weights(weights_path)
    pipe.fuse_lora(lora_scale=1.0)
    return pipe

# ── Background training runner ─────────────────────────
def _run_training(job_id, image_paths, character_name, output_dir, callback_url, use_cogvideo):
    """Run training in background thread so /progress is responsive."""
    import traceback
    try:
        _train_internal(job_id, image_paths, character_name, output_dir, callback_url, use_cogvideo)
    except Exception as e:
        training_progress[job_id] = {"percent": -1, "status": f"Error: {str(e)}"}
        print(f"[LoRA] Training failed: {e}")
        traceback.print_exc()

# ── Health ──────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

# ── Pre-trained list ────────────────────────────────────
PRETRAINED_LORAS = [
    {
        "id": "cogvideox-disney",
        "name": "Disney Animation Style",
        "source": "HF",
        "repo": "a-r-r-o-w/cogvideox-disney-adamw-3000-0.0003",
        "description": "Disney karakter tarzı video LoRA",
        "type": "style"
    },
    {
        "id": "cogvideox-anime",
        "name": "Anime Style",
        "source": "HF",
        "repo": "Nojahhh/cogvideox-loras",
        "description": "Anime tarzı video LoRA",
        "type": "style"
    },
]

@app.route("/pretrained", methods=["GET"])
def list_pretrained():
    drive_loras = []
    if os.path.isdir(LORA_BASE_DIR):
        for d in os.listdir(LORA_BASE_DIR):
            wpath = os.path.join(LORA_BASE_DIR, d)
            if os.path.isdir(wpath) and os.path.exists(os.path.join(wpath, "pytorch_lora_weights.safetensors")):
                drive_loras.append({
                    "id": d,
                    "name": d,
                    "source": "drive",
                    "path": wpath,
                    "description": "Önceden eğitilmiş (Drive)",
                    "type": "character"
                })
    return jsonify({"pretrained": PRETRAINED_LORAS, "drive": drive_loras}), 200

@app.route("/pretrained/load", methods=["POST"])
def load_pretrained():
    data = request.get_json(force=True) or {}
    weights_path = data.get("weights_path", "")
    hf_repo = data.get("hf_repo", "")

    if not weights_path and not hf_repo:
        return jsonify({"status": "error", "message": "weights_path or hf_repo required"}), 400

    try:
        dest = os.path.join(LORA_BASE_DIR, "pretrained")
        os.makedirs(dest, exist_ok=True)

        if hf_repo and not weights_path:
            from huggingface_hub import snapshot_download
            weights_path = snapshot_download(repo_id=hf_repo, local_dir=dest)
            for root, dirs, files in os.walk(dest):
                for f in files:
                    if f.endswith(".safetensors") and "lora" in f.lower():
                        weights_path = root
                        break

        if not weights_path or not os.path.isdir(weights_path):
            return jsonify({"status": "error", "message": "Weights not found after loading"}), 404

        return jsonify({"status": "success", "weights_path": weights_path}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ── Training logic (extracted for background use) ──────
def _train_internal(job_id, image_paths, character_name, output_dir, callback_url, use_cogvideo):
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    _send_progress(job_id, 5, f"Training '{character_name}' (VRAM: {vram_gb:.1f}GB)", callback_url)

    if use_cogvideo:
        from diffusers import CogVideoXPipeline
        from peft import LoraConfig, get_peft_model
        import torch.nn.functional as F

        pipe = CogVideoXPipeline.from_pretrained(
            "THUDM/CogVideoX-5b",
            torch_dtype=torch.bfloat16,
        )
        if vram_gb < 20.0:
            pipe.enable_model_cpu_offload()
        else:
            pipe.to("cuda")
        pipe.enable_gradient_checkpointing()

        unet = pipe.transformer
        lora_config = LoraConfig(
            r=32, lora_alpha=64, target_modules=["to_q", "to_k", "to_v", "to_out"],
            lora_dropout=0.1, bias="none",
        )
        unet = get_peft_model(unet, lora_config)
        unet.train()
        optimizer = torch.optim.AdamW(unet.parameters(), lr=1e-4)

        train_steps = min(200, max(100, len(image_paths) * 50))
        step = 0
        for epoch in range(max(1, train_steps // max(1, len(image_paths)))):
            for img_path in image_paths:
                if step >= train_steps:
                    break
                if not os.path.exists(img_path):
                    continue
                try:
                    pil_image = Image.open(img_path).convert("RGB")
                    pixel_values = pipe.image_processor.preprocess(pil_image)
                    pixel_values = pixel_values.to(device=unet.device, dtype=torch.bfloat16)
                    latents = pipe.vae.encode(pixel_values).latent_dist.sample()
                    latents = latents * pipe.vae.config.scaling_factor
                    noise = torch.randn_like(latents)
                    timesteps = torch.randint(0, pipe.scheduler.config.num_train_timesteps,
                        (latents.shape[0],), device=latents.device).long()
                    noisy_latents = pipe.scheduler.add_noise(latents, noise, timesteps)
                    text_inputs = pipe.tokenizer(
                        [f"portrait of {character_name}, high quality, detailed face"],
                        return_tensors="pt", padding=True, truncation=True
                    ).input_ids.to(unet.device)
                    encoder_hidden_states = pipe.text_encoder(text_inputs)[0]
                    noise_pred = unet(noisy_latents, timesteps, encoder_hidden_states).sample
                    loss = F.mse_loss(noise_pred, noise)
                    loss.backward()
                    optimizer.step()
                    optimizer.zero_grad()
                    step += 1
                    if step % 25 == 0:
                        pct = 5 + int(85 * step / train_steps)
                        _send_progress(job_id, pct, f"Training step {step}/{train_steps}", callback_url)
                except Exception:
                    continue
        weights_path = os.path.join(output_dir, character_name)
        os.makedirs(weights_path, exist_ok=True)
        unet.save_pretrained(weights_path)
        pipe.to("cpu")
        del pipe
    else:
        from peft import LoraConfig, get_peft_model
        import torch.nn.functional as F

        pipe = get_pipeline()
        pipe.enable_gradient_checkpointing()
        vae = pipe.vae
        text_encoder = pipe.text_encoder_2 if hasattr(pipe, "text_encoder_2") else pipe.text_encoder
        unet = pipe.unet
        lora_config = LoraConfig(
            r=32, lora_alpha=64, target_modules=["to_q", "to_k", "to_v", "to_out"],
            lora_dropout=0.1, bias="none",
        )
        unet = get_peft_model(unet, lora_config)
        unet.train()
        if vram_gb < 20.0:
            vae.to("cpu")
            text_encoder.to("cpu")
        optimizer = torch.optim.AdamW(unet.parameters(), lr=1e-4)
        train_steps = min(200, max(100, len(image_paths) * 50))
        step = 0
        for epoch in range(max(1, train_steps // max(1, len(image_paths)))):
            for img_path in image_paths:
                if step >= train_steps:
                    break
                if not os.path.exists(img_path):
                    continue
                try:
                    pil_image = Image.open(img_path).convert("RGB")
                    pil_image = pil_image.resize((1024, 1024))
                    pixel_values = pipe.image_processor.preprocess(pil_image)
                    pixel_values = pixel_values.to(device=unet.device, dtype=torch.float16)
                    latents = vae.encode(pixel_values).latent_dist.sample()
                    latents = latents * vae.config.scaling_factor
                    noise = torch.randn_like(latents)
                    timesteps = torch.randint(0, pipe.scheduler.config.num_train_timesteps,
                        (latents.shape[0],), device=latents.device).long()
                    noisy_latents = pipe.scheduler.add_noise(latents, noise, timesteps)
                    encoder_hidden_states = text_encoder(
                        pipe.tokenizer([f"portrait of {character_name}, high quality, detailed face"],
                            return_tensors="pt", padding=True, truncation=True
                        ).input_ids.to(unet.device)
                    )[0]
                    noise_pred = unet(noisy_latents, timesteps, encoder_hidden_states).sample
                    loss = F.mse_loss(noise_pred, noise)
                    loss.backward()
                    optimizer.step()
                    optimizer.zero_grad()
                    step += 1
                    if step % 25 == 0:
                        pct = 5 + int(85 * step / train_steps)
                        _send_progress(job_id, pct, f"Training step {step}/{train_steps}", callback_url)
                except Exception:
                    continue
        weights_path = os.path.join(output_dir, character_name)
        os.makedirs(weights_path, exist_ok=True)
        unet.save_pretrained(weights_path)

    flush_memory()
    _send_progress(job_id, 100, "Training complete", callback_url)
    return {"status": "success", "weights_path": weights_path, "steps_completed": step}

# ── Train (background thread) ──────────────────────────
@app.route("/train", methods=["POST"])
def train():
    data = request.get_json(force=True) or {}
    image_paths = data.get("image_paths", [])
    character_name = data.get("character_name", "character")
    output_dir = data.get("output_dir", LORA_BASE_DIR)
    job_id = data.get("job_id", 0)
    callback_url = data.get("callback_url", "")
    use_cogvideo = data.get("use_cogvideo", True)

    if not image_paths:
        return jsonify({"status": "error", "message": "image_paths required"}), 400

    _send_progress(job_id, 1, "Queued", callback_url)
    thread = threading.Thread(
        target=_run_training,
        args=(job_id, image_paths, character_name, output_dir, callback_url, use_cogvideo),
        daemon=True,
    )
    thread.start()
    return jsonify({"status": "accepted", "message": "Training started in background", "job_id": job_id}), 202

# ── Infer ───────────────────────────────────────────────
@app.route("/infer", methods=["POST"])
def infer():
    global current_weights_path
    data = request.get_json(force=True) or {}
    weights_path = data.get("weights_path", "")
    prompt = data.get("prompt", "portrait of a person")
    output_path = data.get("output_path", "/workspace/outputs/lora_output.png")
    use_cogvideo = data.get("use_cogvideo", False)

    if not weights_path or not os.path.isdir(weights_path):
        drive_candidate = os.path.join(LORA_BASE_DIR, os.path.basename(weights_path))
        if os.path.isdir(drive_candidate):
            weights_path = drive_candidate
        else:
            return jsonify({"status": "error", "message": f"weights_path not found: {weights_path}"}), 400

    try:
        pipe = get_pipeline(use_cogvideo=use_cogvideo)
        if current_weights_path != weights_path:
            if current_weights_path is not None:
                pipe.unfuse_lora()
                pipe.unload_lora_weights()
            load_lora_weights(pipe, weights_path)
            current_weights_path = weights_path

        with torch.inference_mode():
            generator = torch.manual_seed(42)
            image = pipe(
                prompt=prompt,
                num_inference_steps=30,
                guidance_scale=7.5,
                generator=generator,
                width=1024,
                height=1024,
            ).images[0]

        image.save(output_path)
        return jsonify({"status": "success", "output_path": output_path}), 200

    except Exception as e:
        flush_memory()
        return jsonify({"status": "error", "message": str(e)}), 500

# ── Progress polling endpoint ───────────────────────────
@app.route("/progress/<int:job_id>", methods=["GET"])
def get_progress(job_id):
    prog = training_progress.get(job_id, {"percent": 0, "status": "unknown"})
    return jsonify(prog), 200

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
    app.run(host="0.0.0.0", port=5000, threaded=True)


