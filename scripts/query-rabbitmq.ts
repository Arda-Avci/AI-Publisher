import { initRabbitMQ, getRabbitChannel, VIDEO_JOBS_QUEUE, PUBLISH_JOBS_QUEUE } from '../src/lib/rabbitmq.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await initRabbitMQ();
  try {
    const channel = getRabbitChannel();
    const videoQueue = await channel.checkQueue(VIDEO_JOBS_QUEUE);
    const publishQueue = await channel.checkQueue(PUBLISH_JOBS_QUEUE);
    console.log('--- RabbitMQ Kuyruk Durumları ---');
    console.log('Video Jobs Queue:', videoQueue);
    console.log('Publish Jobs Queue:', publishQueue);
  } catch (err) {
    console.error('Kuyruk kontrol edilirken hata:', err);
  }
  process.exit(0);
}

run();
