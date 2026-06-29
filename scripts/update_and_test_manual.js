const dotenv = require('dotenv');
const axios = require('axios');
const { exec } = require('child_process');

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const TEMPLATE_ID = 'e787p066s7';
const ENDPOINT_ID = 'rojgtzuf3nztup';
const COMMIT_SHA = 'b4527abd82f4819f64b207397cc1e0cb2467aa11';
const NEW_IMAGE = `ghcr.io/arda-avci/ltx:${COMMIT_SHA}`;

if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY is not defined in .env');
  process.exit(1);
}

const mutation = `
mutation {
  saveTemplate(input: {
    id: "${TEMPLATE_ID}",
    name: "Ltx2_Serverless",
    imageName: "${NEW_IMAGE}",
    containerDiskInGb: 50,
    volumeInGb: 0,
    ports: "5000/http",
    dockerArgs: "",
    containerRegistryAuthId: "cmqrr4obu00e9g8ggejl29x0d",
    readme: "",
    env: [
      { key: "BUCKET_ACCESS_KEY_ID", value: "${process.env.B2_KEY_ID || ''}" },
      { key: "BUCKET_ENDPOINT_URL", value: "${process.env.B2_ENDPOINT_URL || ''}" },
      { key: "BUCKET_NAME", value: "${process.env.B2_BUCKET_NAME || ''}" },
      { key: "BUCKET_SECRET_ACCESS_KEY", value: "${process.env.B2_APPLICATION_KEY || ''}" },
      { key: "RUNPOD_ENDPOINT_PATH", value: "/generate" },
      { key: "RUNPOD_SERVERLESS", value: "true" }
    ]
  }) {
    id
    name
    imageName
  }
}
`;

async function updateTemplate() {
  console.log(`Updating template ${TEMPLATE_ID} to use image: ${NEW_IMAGE}...`);
  const url = 'https://api.runpod.io/graphql?api_key=' + RUNPOD_API_KEY;
  const response = await axios.post(
    url,
    { query: mutation },
    { headers: { 'Content-Type': 'application/json' } }
  );
  console.log('Template Update Response:', JSON.stringify(response.data, null, 2));
}

async function cycleWorkers(maxWorkers) {
  try {
    const res = await axios.patch(
      `https://rest.runpod.io/v1/endpoints/${ENDPOINT_ID}`,
      { workersMax: maxWorkers },
      {
        headers: {
          Authorization: `Bearer ${RUNPOD_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`Set workersMax to ${maxWorkers} via REST API.`);
  } catch (e) {
    console.error(`❌ workersMax güncelleme başarısız:`, e.response ? e.response.data : e.message);
  }
}

async function runTestScript() {
  console.log('🚀 Running test_wan_serverless.js...');
  return new Promise((resolve) => {
    exec(`node scripts/test_wan_serverless.js ${ENDPOINT_ID}`, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error executing test script:', error);
      }
      console.log(stdout);
      if (stderr) console.error(stderr);
      resolve();
    });
  });
}

async function main() {
  try {
    // 1. Update the template
    await updateTemplate();
    
    // 2. Terminate old workers
    await cycleWorkers(0);
    console.log('Waiting 10 seconds for old workers to stop...');
    await new Promise(r => setTimeout(r, 10000));
    
    // 3. Start new workers
    await cycleWorkers(3);
    console.log('Waiting 30 seconds for new workers to cycle...');
    await new Promise(r => setTimeout(r, 30000));
    
    // 4. Trigger test
    await runTestScript();
    console.log('All done!');
  } catch (err) {
    console.error('Critical error in manual runner:', err.message);
  }
}

main();
