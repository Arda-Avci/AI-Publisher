const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = 'rojgtzuf3nztup';

if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY is not defined in .env');
  process.exit(1);
}

const payload = {
  input: {
    prompt: "diagnose",
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
    console.log(`🚀 [RunPod] Triggering diagnose request...`);
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
        console.log('Output:', JSON.stringify(statusRes.data.output, null, 2));
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
