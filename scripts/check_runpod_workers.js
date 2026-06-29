const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = 'kjaqxvkklet86p';

if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY is not defined in .env');
  process.exit(1);
}

// Get unhealthy workers logs
const query = `
query {
  endpoint(id: "${ENDPOINT_ID}") {
    id
    name
    workers {
      id
      status
    }
  }
}
`;

async function main() {
  const url = 'https://api.runpod.io/graphql?api_key=' + RUNPOD_API_KEY;
  try {
    const res = await axios.post(url, { query }, { headers: { 'Content-Type': 'application/json' } });
    if (res.data.errors) {
      console.error('❌ GraphQL Errors:', JSON.stringify(res.data.errors, null, 2));
    } else {
      console.log('✅ Endpoint workers status:', JSON.stringify(res.data.data.endpoint, null, 2));
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
