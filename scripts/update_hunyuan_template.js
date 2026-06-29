const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY is not defined in .env');
  process.exit(1);
}

// target template is s6z2i3aaim
const TEMPLATE_ID = 's6z2i3aaim';
const COMMIT_SHA = '32a53c78de389395de880f825cd363c05aa6c570';
const NEW_IMAGE = `ghcr.io/arda-avci/hunyuan:${COMMIT_SHA}`;

const mutation = `
mutation {
  saveTemplate(input: {
    id: "${TEMPLATE_ID}",
    name: "HunyuanVideo_Template_9422232_1782648961819",
    imageName: "${NEW_IMAGE}",
    containerDiskInGb: 50,
    volumeInGb: 0,
    ports: "5000/http",
    isServerless: true,
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

async function main() {
  console.log(`Updating template ${TEMPLATE_ID} to use image: ${NEW_IMAGE}...`);
  const url = 'https://api.runpod.io/graphql?api_key=' + RUNPOD_API_KEY;
  try {
    const response = await axios.post(
      url,
      { query: mutation },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('✅ Template Update Response:', JSON.stringify(response.data, null, 2));
  } catch (e) {
    console.error('❌ Error updating template:', e.message);
  }
}

main();
