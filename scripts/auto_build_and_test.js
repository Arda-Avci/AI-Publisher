const dotenv = require('dotenv');
const axios = require('axios');
const { exec } = require('child_process');

dotenv.config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = 'rojgtzuf3nztup';
const RUN_ID = '28290992291';

if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY is not defined in .env');
  process.exit(1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBuildStatus() {
  try {
    const res = await axios.get(`https://api.github.com/repos/Arda-Avci/AI-Publisher/actions/runs/${RUN_ID}`);
    return {
      status: res.data.status,
      conclusion: res.data.conclusion
    };
  } catch (err) {
    console.error('[Build Check] Error:', err.message);
    return null;
  }
}

async function runTestScript() {
  console.log('🚀 Triggering test_wan_serverless.js...');
  return new Promise((resolve, reject) => {
    exec(`node scripts/test_wan_serverless.js ${ENDPOINT_ID}`, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error executing test script:', error);
        return reject(error);
      }
      console.log(stdout);
      if (stderr) console.error(stderr);
      resolve(stdout);
    });
  });
}

async function main() {
  console.log(`⏳ Monitoring GitHub Actions Run ${RUN_ID} for completion...`);
  
  let finished = false;
  let attempts = 0;
  
  while (!finished) {
    attempts++;
    const build = await checkBuildStatus();
    if (build) {
      console.log(`[Attempt ${attempts}] Status: ${build.status} | Conclusion: ${build.conclusion}`);
      
      if (build.status === 'completed') {
        finished = true;
        if (build.conclusion === 'success') {
          console.log('🎉 GitHub Actions build succeeded! Starting RunPod validation...');
          await sleep(5000); // Wait 5 seconds to be sure GHCR is ready
          try {
            await runTestScript();
            console.log('✅ Validation script finished execution.');
          } catch (e) {
            console.error('❌ Validation script failed:', e.message);
          }
        } else {
          console.error(`❌ GitHub Actions build failed with conclusion: ${build.conclusion}`);
        }
      }
    }
    
    if (!finished) {
      await sleep(30000); // check every 30 seconds
    }
  }
}

main().catch(err => {
  console.error('Critical error in main auto loop:', err);
});
