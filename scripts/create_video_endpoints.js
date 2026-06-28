const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;

if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY is not defined in .env');
  process.exit(1);
}

const COMMIT_SHA = require('child_process').execSync('git log -n 1 --pretty=format:"%H" -- colab_docker').toString().trim();
const SHORT_SHA = COMMIT_SHA.substring(0, 7);
const TIMESTAMP = Date.now();

const models = [
  {
    name: 'Wan2.1_Serverless',
    image: `ghcr.io/arda-avci/wan:${COMMIT_SHA}`,
    envVar: 'RUNPOD_WAN_ENDPOINT_ID',
    templateName: `Wan21_Template_${SHORT_SHA}_${TIMESTAMP}`
  },
  {
    name: 'Wan2.5_Serverless',
    image: `ghcr.io/arda-avci/wan25:${COMMIT_SHA}`,
    envVar: 'RUNPOD_WAN25_ENDPOINT_ID',
    templateName: `Wan25_Template_${SHORT_SHA}_${TIMESTAMP}`
  },
  {
    name: 'HunyuanVideo_Serverless',
    image: `ghcr.io/arda-avci/hunyuan:${COMMIT_SHA}`,
    envVar: 'RUNPOD_HUNYUANVIDEO_ENDPOINT_ID',
    templateName: `HunyuanVideo_Template_${SHORT_SHA}_${TIMESTAMP}`
  }
];

const B2_ENV = [
  { key: "BUCKET_ACCESS_KEY_ID", value: process.env.B2_KEY_ID || '' },
  { key: "BUCKET_ENDPOINT_URL", value: process.env.B2_ENDPOINT_URL || '' },
  { key: "BUCKET_NAME", value: process.env.B2_BUCKET_NAME || '' },
  { key: "BUCKET_SECRET_ACCESS_KEY", value: process.env.B2_APPLICATION_KEY || '' },
  { key: "RUNPOD_ENDPOINT_PATH", value: "/generate" },
  { key: "RUNPOD_SERVERLESS", value: "true" }
];

async function runGraphQL(query) {
  const url = 'https://api.runpod.io/graphql?api_key=' + RUNPOD_API_KEY;
  try {
    const res = await axios.post(url, { query }, { headers: { 'Content-Type': 'application/json' } });
    if (res.data.errors) {
      throw new Error(JSON.stringify(res.data.errors, null, 2));
    }
    return res.data.data;
  } catch (err) {
    if (err.response && err.response.data) {
      throw new Error(JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }
}

function updateEnvFile(key, value) {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error(`❌ .env file not found at ${envPath}`);
    return;
  }
  let content = fs.readFileSync(envPath, 'utf8');
  const regex = new RegExp(`^${key}=.*`, 'm');

  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
  console.log(`📝 Updated .env: ${key}=${value}`);
}

async function createTemplate(model) {
  console.log(`\nCreating Serverless Template for: ${model.name}...`);
  const envString = JSON.stringify(B2_ENV).replace(/"key":/g, 'key:').replace(/"value":/g, 'value:');
  const query = `
  mutation {
    saveTemplate(input: {
      name: "${model.templateName}",
      imageName: "${model.image}",
      containerDiskInGb: 50,
      volumeInGb: 0,
      isServerless: true,
      ports: "5000/http",
      dockerArgs: "",
      readme: "",
      containerRegistryAuthId: "cmqrr4obu00e9g8ggejl29x0d",
      env: ${envString}
    }) {
      id
      name
    }
  }
  `;
  const result = await runGraphQL(query);
  console.log(`✅ Serverless Template Created: ${result.saveTemplate.name} (ID: ${result.saveTemplate.id})`);
  return result.saveTemplate.id;
}

async function createEndpoint(model, templateId) {
  console.log(`Creating Endpoint for: ${model.name}...`);
  const query = `
  mutation {
    saveEndpoint(input: {
      name: "${model.name}",
      templateId: "${templateId}",
      gpuIds: "AMPERE_16,AMPERE_24,ADA_24",
      workersMin: 0,
      workersMax: 2,
      idleTimeout: 5
    }) {
      id
      name
    }
  }
  `;
  const result = await runGraphQL(query);
  console.log(`✅ Endpoint Created: ${result.saveEndpoint.name} (ID: ${result.saveEndpoint.id})`);
  return result.saveEndpoint.id;
}

async function main() {
  for (const model of models) {
    try {
      const templateId = await createTemplate(model);
      const endpointId = await createEndpoint(model, templateId);
      updateEnvFile(model.envVar, endpointId);
    } catch (err) {
      console.error(`❌ Error processing model ${model.name}:`, err.message || err);
    }
  }
  console.log('\n🎉 All operations completed successfully.');
}

main();
