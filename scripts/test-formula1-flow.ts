import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const PORT = process.env.PORT || 3016;
  const baseUrl = `http://localhost:${PORT}`;

  console.log('🏁 Starting Formula 1 Integration Flow Test...');
  console.log(`Connecting to: ${baseUrl}`);

  // 1. Login to get cookies
  console.log('\n🔐 [Step 1] Logging in...');
  const loginRes = await axios.post(`${baseUrl}/login`, {
    username: 'arda.avci@gmail.com',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin1234!!'
  }, {
    maxRedirects: 0,
    validateStatus: (status) => status === 302
  });

  const cookies = loginRes.headers['set-cookie'];
  if (!cookies) {
    throw new Error('No cookie returned from login');
  }
  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
  console.log('Session Cookie acquired successfully.');

  const client = axios.create({
    baseURL: baseUrl,
    headers: { Cookie: cookieHeader }
  });

  // 2. Search for Formula 1 in English and German
  console.log('\n🔍 [Step 2] Searching Opportunity Funnel for "Formula1" in German/English...');
  const searchRes = await client.get('/opportunity-videos?q=Formula1&lang=de,en');
  if (!searchRes.data.success || !searchRes.data.videos || searchRes.data.videos.length === 0) {
    console.error('Search failed or no videos found:', searchRes.data);
    throw new Error('No videos found in Opportunity Funnel');
  }

  const selectedVideo = searchRes.data.videos[1] || searchRes.data.videos[0];
  console.log(`\n📺 Selected Video:`);
  console.log(`- Title: ${selectedVideo.title}`);
  console.log(`- Video ID: ${selectedVideo.videoId}`);
  console.log(`- Views: ${selectedVideo.views}`);
  console.log(`- Score: ${selectedVideo.score}`);

  // 3. Start Differentiation Phase 1
  console.log('\n⚙️ [Step 3] Starting Video Differentiation (Phase 1)...');
  const diffRes = await client.post('/differentiate-video', {
    videoId: selectedVideo.videoId,
    sourceMeta: {
      videoId: selectedVideo.videoId,
      title: selectedVideo.title,
      channelTitle: selectedVideo.channelTitle,
      thumbnail: selectedVideo.thumbnail
    },
    targetLang: 'tr',
    durationMode: 'same'
  });

  if (!diffRes.data.success) {
    console.error('Failed to trigger differentiation:', diffRes.data);
    throw new Error('Differentiation failed to start');
  }

  const jobId = diffRes.data.jobId;
  console.log(`Differentiation Job Created. Job ID: ${jobId}`);

  // 4. Poll Differentiation Status
  console.log('\n⏳ [Step 4] Polling status for Phase 1 completion...');
  let jobStatus = 'processing_phase1';
  let attempt = 0;
  let jobData: any = null;

  while (true) {
    attempt++;
    await delay(3000);
    const statusRes = await client.get(`/differentiate-status/${jobId}`);
    jobData = statusRes.data;
    jobStatus = jobData.status;

    console.log(`- Poll #${attempt}: Status = ${jobStatus}, Stage = ${jobData.stage}, Progress = ${jobData.progress}%`);

    if (jobStatus === 'failed') {
      break;
    }
    if (jobData.progress >= 100) {
      break;
    }
    if (attempt > 180) {
      throw new Error('Timeout waiting for Phase 1 differentiation to reach 100%');
    }
  }

  if (jobStatus === 'failed') {
    console.error('❌ Job failed during Phase 1:', jobData.error);
    return;
  }

  console.log('\n✅ Phase 1 Completed successfully!');
  console.log(`- Status: ${jobData.status}`);
  
  // Retrieve detailed transcript fields from DB
  const { db, initDatabase } = await import('../src/db.js');
  await initDatabase();
  const dbJob = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);

  console.log('\n📄 [RESULTS] Phase 1 Generation Outputs:');
  console.log(`- Cleaned Transcript Chars: ${dbJob.transcript_cleaned?.length || 0}`);
  console.log(`- Translated Transcript:`);
  console.log(`--------------------------------------------------`);
  console.log(dbJob.transcript_translated);
  console.log(`--------------------------------------------------`);

  const scenePrompts = JSON.parse(dbJob.scene_prompts || '[]');
  console.log(`- Generated Scenes Count: ${scenePrompts.length}`);
  console.log('- Scene Prompts list:');
  scenePrompts.forEach((scene: any) => {
    console.log(`  [Scene #${scene.sceneNumber}]`);
    console.log(`  - Speech Text: ${scene.speechText}`);
    console.log(`  - Video Prompt: ${scene.videoPrompt}`);
    console.log(`  - SFX Prompt: ${scene.sfxPrompt}`);
  });

  // 5. Approve Translation to proceed to Phase 2
  if (jobStatus === 'awaiting_approval') {
    console.log('\n✍️ [Step 5] Submitting translation approval...');
    const approveRes = await client.post(`/approve-translation/${jobId}`, {
      editedTranslation: dbJob.transcript_translated
    });
    if (!approveRes.data.success) {
      console.error('Failed to approve translation:', approveRes.data);
      throw new Error('Approval failed');
    }
    console.log('Translation approved. Status updated to pending.');
  }

  // 6. Start the job (Sends to queue worker which attempts Colab rendering)
  console.log('\n🚀 [Step 6] Starting the job to trigger Colab rendering...');
  const startRes = await client.post(`/start-job/${jobId}`, {
    master_prompt: scenePrompts[0]?.videoPrompt || dbJob.master_prompt,
    production_notes: dbJob.transcript_translated,
    transcript_translated: dbJob.transcript_translated
  });
  console.log('Start Job Response:', startRes.data);

  // Let's wait a moment for the queue worker to pick it up and check the status
  await delay(3000);
  const runningStatusRes = await client.get(`/differentiate-status/${jobId}`);
  console.log('Current job status after start:', runningStatusRes.data.status, 'Stage:', runningStatusRes.data.stage);

  // 7. Cancel the job immediately as requested ("o aşamaya gelince iptal et")
  console.log('\n🛑 [Step 7] Cancelling the active job before Colab rendering runs...');
  const cancelRes = await client.post(`/cancel-job/${jobId}`);
  console.log('Cancel Job Response:', cancelRes.data);

  // Verify final status
  await delay(1000);
  const finalStatusRes = await db.get('SELECT status, current_stage FROM video_jobs WHERE id = ?', [jobId]);
  console.log(`\n🏁 Final Database Job State:`);
  console.log(`- Status: ${finalStatusRes.status}`);
  console.log(`- Current Stage: ${finalStatusRes.current_stage}`);
  console.log('--------------------------------------------------');
  console.log('🎉 Flow completed successfully up to Colab step and safely cancelled!');
}

main().catch(err => {
  console.error('❌ Flow test failed with error:', err);
});
