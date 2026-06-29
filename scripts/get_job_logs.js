const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = '5y84omjg5aqoa0';
const JOB_ID = '09ae8f1b-84e7-41d4-a2a3-77fbd2dbf995-e1';

if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY is not defined in .env');
  process.exit(1);
}

async function main() {
  const url = `https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}`;
  const headers = { Authorization: 'Bearer ' + RUNPOD_API_KEY };
  
  try {
    console.log(`🔍 Fetching status and logs for job ${JOB_ID}...`);
    const res = await axios.get(url, { headers });
    console.log('Status Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Error fetching job status:', err.message);
  }
}

main();
