import amqplib from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

export const VIDEO_JOBS_QUEUE = 'video_jobs_queue';
export const PUBLISH_JOBS_QUEUE = 'publish_jobs_queue';
export const CLIP_JOBS_QUEUE = 'clip_jobs_queue';

let connection: any = null;
let channel: any = null;
let isConnecting = false;

const reconnectCallbacks: (() => void | Promise<void>)[] = [];

/**
 * RabbitMQ yeniden bağlandığında çalıştırılacak callback'leri kaydeder.
 */
export function registerReconnectCallback(cb: () => void | Promise<void>) {
  reconnectCallbacks.push(cb);
}

async function connectWithRetry() {
  if (isConnecting) return;
  isConnecting = true;
  console.log('[INFO] RabbitMQ bağlantısı kuruluyor...');
  
  while (true) {
    try {
      connection = await amqplib.connect(RABBITMQ_URL);
      channel = await connection.createChannel();

      // Durable: true = RabbitMQ restart atsa bile kuyruklar silinmez
      await channel.assertQueue(VIDEO_JOBS_QUEUE, { durable: true });
      await channel.assertQueue(PUBLISH_JOBS_QUEUE, { durable: true });
      await channel.assertQueue(CLIP_JOBS_QUEUE, { durable: true });

      console.log('[INFO] RabbitMQ başarıyla bağlandı ve kuyruklar hazır.');

      connection.on('close', () => {
        console.warn('[WARN] RabbitMQ bağlantısı kapandı! Yeniden bağlanılıyor...');
        channel = null;
        connection = null;
        isConnecting = false;
        setTimeout(connectWithRetry, 5000);
      });

      connection.on('error', (err: any) => {
        console.error('[ERROR] RabbitMQ bağlantı hatası:', err);
      });

      isConnecting = false;
      
      // Reconnect callback'lerini çalıştır
      for (const cb of reconnectCallbacks) {
        try {
          await cb();
        } catch (cbErr) {
          console.error('[ERROR] RabbitMQ reconnect callback hatası:', cbErr);
        }
      }
      break;
    } catch (error) {
      console.error('[ERROR] RabbitMQ bağlanırken hata oluştu, 5s sonra tekrar denenecek:', error);
      channel = null;
      connection = null;
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

export async function initRabbitMQ() {
  // Bloke olmadan arka planda başlatıyoruz
  connectWithRetry().catch(err => {
    console.error('[ERROR] RabbitMQ connectWithRetry kritik hata:', err);
  });
}

export function getRabbitChannel(): any {
  if (!channel) {
    throw new Error('RabbitMQ channel is not initialized. Connection might be down.');
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
