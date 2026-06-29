const axios = require('axios');
require('dotenv').config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const headers = { Authorization: RUNPOD_API_KEY, 'Content-Type': 'application/json' };

const query = `
query {
  myself {
    podTemplates {
      id
      name
      imageName
      containerDiskInGb
      volumeInGb
      isServerless
      ports
      containerRegistryAuthId
      env {
        key
        value
      }
    }
  }
}
`;

axios.post('https://api.runpod.io/graphql', { query }, { headers })
  .then(r => {
    if (r.data.errors) {
      console.error('GraphQL Hataları:', JSON.stringify(r.data.errors, null, 2));
    } else {
      console.log(JSON.stringify(r.data, null, 2));
    }
  })
  .catch(e => {
    if (e.response && e.response.data) {
      console.error('API Hatası:', JSON.stringify(e.response.data, null, 2));
    } else {
      console.error('Hata:', e.message);
    }
  });
