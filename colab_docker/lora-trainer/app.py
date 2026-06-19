import os
import gc
import torch
import uuid
from flask import Flask, request, jsonify
from PIL import Image

app = Flask(__name__)

current_pipe = None
current_weights_path = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def get_pipeline():
    global current_pipe
    if current_pipe is not None:
        return current_pipe

    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    print(f"[CONTAINER - LoRA] Loading SDXL base model (VRAM: {vram_gb:.2f} GB)")

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
    from peft import LoraConfig, get_peft_model
    print(f"[CONTAINER - LoRA] Loading LoRA weights from: {weights_path}")
    pipe.load_lora_weights(weights_path)
    pipe.fuse_lora(lora_scale=1.0)
    return pipe

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

@app.route("/train", methods=["POST"])
def train():
    data = request.get_json(force=True) or {}
    image_paths = data.get("image_paths", [])
    character_name = data.get("character_name", "character")
    output_dir = data.get("output_dir", "/content/lora_weights")
    job_id = data.get("job_id", 0)

    if not image_paths:
        return jsonify({"status": "error", "message": "image_paths required"}), 400

    try:
        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
        print(f"[CONTAINER - LoRA] Training for character '{character_name}' (Job {job_id}, VRAM: {vram_gb:.2f} GB)")

        from diffusers import DiffusionPipeline
        from peft import LoraConfig, get_peft_model
        from accelerate import Accelerator
        from diffusers.optimization import get_scheduler
        from torch import optim
        import torch.nn.functional as F

        pipe = get_pipeline()
        pipe.enable_gradient_checkpointing()

        vae = pipe.vae
        text_encoder = pipe.text_encoder
        unet = pipe.unet

        lora_config = LoraConfig(
            r=32,
            lora_alpha=64,
            target_modules=["to_q", "to_k", "to_v", "to_out"],
            lora_dropout=0.1,
            bias="none",
        )

        unet.enable_gradient_checkpointing()
        unet = get_peft_model(unet, lora_config)
        unet.train()

        if vram_gb < 20.0:
            vae.to("cpu")
            text_encoder.to("cpu")
            pipe.enable_model_cpu_offload()

        from torch.optim import AdamW8bit
        try:
            optimizer = AdamW8bit(unet.parameters(), lr=1e-4)
        except Exception:
            optimizer = torch.optim.AdamW(unet.parameters(), lr=1e-4)

        noise_scheduler = pipe.scheduler

        train_steps = min(200, max(100, len(image_paths) * 50))
        print(f"[CONTAINER - LoRA] Training steps: {train_steps}")

        step = 0
        for epoch in range(max(1, train_steps // max(1, len(image_paths)))):
            for img_path in image_paths:
                if step >= train_steps:
                    break

                if not os.path.exists(img_path):
                    print(f"[WARN] Image not found: {img_path}, skipping")
                    continue

                try:
                    pil_image = Image.open(img_path).convert("RGB")
                    pil_image = pil_image.resize((1024, 1024))
                    pixel_values = pipe.image_processor.preprocess(pil_image)
                    pixel_values = pixel_values.to(device=unet.device, dtype=torch.float16)

                    latents = vae.encode(pixel_values).latent_dist.sample()
                    latents = latents * vae.config.scaling_factor

                    noise = torch.randn_like(latents)
                    timesteps = torch.randint(
                        0, noise_scheduler.config.num_train_timesteps,
                        (latents.shape[0],), device=latents.device
                    ).long()

                    noisy_latents = noise_scheduler.add_noise(latents, noise, timesteps)

                    encoder_hidden_states = text_encoder(
                        pipe.tokenizer(
                            [f"portrait of {character_name}, high quality, detailed face"],
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
                        print(f"[CONTAINER - LoRA] Step {step}/{train_steps}, Loss: {loss.item():.6f}")
                except Exception as sample_err:
                    print(f"[WARN] Training sample error: {sample_err}")
                    continue

        weights_path = os.path.join(output_dir, character_name)
        os.makedirs(weights_path, exist_ok=True)
        unet.save_pretrained(weights_path)
        print(f"[CONTAINER - LoRA] Weights saved to {weights_path}")

        flush_memory()
        return jsonify({
            "status": "success",
            "weights_path": weights_path,
            "steps_completed": step
        }), 200

    except Exception as e:
        flush_memory()
        print(f"[CONTAINER - LoRA] Training error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/infer", methods=["POST"])
def infer():
    global current_weights_path

    data = request.get_json(force=True) or {}
    weights_path = data.get("weights_path", "")
    prompt = data.get("prompt", "portrait of a person")
    output_path = data.get("output_path", "/content/lora_output.png")

    if not weights_path:
        return jsonify({"status": "error", "message": "weights_path required"}), 400

    try:
        pipe = get_pipeline()

        if current_weights_path != weights_path:
            print(f"[CONTAINER - LoRA] Loading weights: {weights_path}")
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
        print(f"[CONTAINER - LoRA] Image saved to {output_path}")

        return jsonify({"status": "success", "output_path": output_path}), 200

    except Exception as e:
        flush_memory()
        print(f"[CONTAINER - LoRA] Inference error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
