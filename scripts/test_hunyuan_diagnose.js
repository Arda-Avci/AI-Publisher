const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_HUNYUANVIDEO_ENDPOINT_ID || 'mxkayqhw4geo56';

if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY is not defined in .env');
  process.exit(1);
}

const pythonCode = `
import sys
import torch
import torch.library
print("=== PYTHON DIAGNOSE ===")
print("Python executable:", sys.executable)
print("Torch version:", torch.__version__)
print("custom_op type:", type(getattr(torch.library, 'custom_op', None)))
print("custom_op callable:", callable(getattr(torch.library, 'custom_op', None)))
print("impl type:", type(getattr(torch.library, 'impl', None)))

# Import and check pipeline placement with custom device_map
try:
    from diffusers import HunyuanVideoPipeline
    import torch
    
    device_map = "balanced"
    
    print("Loading pipeline from cache with custom device_map...")
    pipe = HunyuanVideoPipeline.from_pretrained(
        "hunyuanvideo-community/HunyuanVideo",
        torch_dtype=torch.bfloat16,
        device_map=device_map
    )
    
    print("=== Component Devices ===")
    print("text_encoder (Llama3):", pipe.text_encoder.device)
    print("text_encoder_2 (CLIP):", pipe.text_encoder_2.device)
    print("transformer:", pipe.transformer.device)
    print("vae:", pipe.vae.device)
    
    pipe.vae.enable_tiling()
    
    print("Testing prompt encoding...")
    prompt = "A simple test prompt"
    # Execute encoding
    prompt_embeds, pooled_prompt_embeds, prompt_attention_mask = pipe.encode_prompt(
        prompt=prompt,
        device=torch.device("cuda"),
        num_videos_per_prompt=1
    )
    print("Encoding success! prompt_embeds shape:", prompt_embeds.shape)
    
    print("Testing 1-step generation...")
    # Run a quick 1-step generation to verify full forward pass
    video = pipe(
        prompt=prompt,
        num_frames=9,
        num_inference_steps=1,
        generator=torch.Generator("cuda").manual_seed(42)
    ).frames[0]
    print("Generation success! Video frames count:", len(video))
except Exception as e:
    import traceback
    print("Error during pipeline test:", str(e))
    print(traceback.format_exc())
`;

const payload = {
  input: {
    code: pythonCode,
    b2_credentials: {
      endpoint_url: process.env.B2_ENDPOINT_URL,
      key_id: process.env.B2_KEY_ID,
      application_key: process.env.B2_APPLICATION_KEY,
      bucket_name: process.env.B2_BUCKET_NAME
    },
    job_id: `test_diagnose_${Date.now()}`,
    scene_number: 1
  }
};

async function main() {
  try {
    console.log(`🚀 [RunPod] Triggering diagnose request on endpoint: ${ENDPOINT_ID}...`);
    const runRes = await axios.post(
      `https://api.runpod.ai/v2/${ENDPOINT_ID}/run`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RUNPOD_API_KEY}`
        }
      }
    );

    const jobId = runRes.data.id;
    console.log(`✅ Job ID: ${jobId}`);
    console.log(`⏳ Polling status...`);

    let completed = false;
    while (!completed) {
      const statusRes = await axios.get(
        `https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${RUNPOD_API_KEY}`
          }
        }
      );
      const status = statusRes.data.status;
      console.log(`[Status] ${status}`);
      if (status === 'COMPLETED') {
        console.log('🎉 Job Completed!');
        const output = statusRes.data.output;
        if (output && output.status === 'success') {
          console.log('\n=== DIAGNOSE OUTPUT ===\n');
          console.log(output.output);
        } else {
          console.error('❌ Diagnose failed inside container:', JSON.stringify(output, null, 2));
        }
        completed = true;
      } else if (status === 'FAILED') {
        console.error('❌ Job Failed:', JSON.stringify(statusRes.data, null, 2));
        completed = true;
      } else {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

main();
