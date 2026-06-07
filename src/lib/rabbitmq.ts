import amqplib from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

export const VIDEO_JOBS_QUEUE = 'video_jobs_queue';
export const PUBLISH_JOBS_QUEUE = 'publish_jobs_queue';

let connection: any = null;
let channel: any = null;

export async function initRabbitMQ() {
  try {
    connection = await amqplib.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Durable: true = RabbitMQ restart atsa bile kuyruklar silinmez
    await channel.assertQueue(VIDEO_JOBS_QUEUE, { durable: true });
    await channel.assertQueue(PUBLISH_JOBS_QUEUE, { durable: true });

    console.log('[INFO] RabbitMQ bağlandı ve kuyruklar (video, publish) oluşturuldu.');
  } catch (error) {
    console.error('[ERROR] RabbitMQ bağlantı hatası:', error);
  }
}

export function getRabbitChannel(): any {
  if (!channel) {
    throw new Error('RabbitMQ channel is not initialized. Call initRabbitMQ first.');
  }
  return channel;
}

/**
 * Belirtilen kuyruğa yeni bir iş ekler.
 */
export async function sendToQueue(queueName: string, data: object) {
  const ch = getRabbitChannel();
  ch.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
    persistent: true // Mesaj diskte tutulur
  });
}
