import amqplib from 'amqplib';
import dotenv from 'dotenv';
import { Logger } from './logger.js';

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

export const VIDEO_JOBS_QUEUE = 'video_jobs_queue';
export const PUBLISH_JOBS_QUEUE = 'publish_jobs_queue';
export const CLIP_JOBS_QUEUE = 'clip_jobs_queue';

const globalRef = global as any;

if (globalRef._rabbitmq_connection === undefined) {
  globalRef._rabbitmq_connection = null;
}
if (globalRef._rabbitmq_channel === undefined) {
  globalRef._rabbitmq_channel = null;
}

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
  Logger.info('RabbitMQ bağlantısı kuruluyor...');

  while (true) {
    try {
      globalRef._rabbitmq_connection = await amqplib.connect(RABBITMQ_URL);
      globalRef._rabbitmq_channel = await globalRef._rabbitmq_connection.createChannel();

      // Durable: true = RabbitMQ restart atsa bile kuyruklar silinmez
      await globalRef._rabbitmq_channel.assertQueue(VIDEO_JOBS_QUEUE, { durable: true });
      await globalRef._rabbitmq_channel.assertQueue(PUBLISH_JOBS_QUEUE, { durable: true });
      await globalRef._rabbitmq_channel.assertQueue(CLIP_JOBS_QUEUE, { durable: true });

      Logger.info('RabbitMQ başarıyla bağlandı ve kuyruklar hazır.');

      globalRef._rabbitmq_connection.on('close', () => {
        Logger.warn('RabbitMQ bağlantısı kapandı! Yeniden bağlanılıyor...');
        globalRef._rabbitmq_channel = null;
        globalRef._rabbitmq_connection = null;
        isConnecting = false;
        setTimeout(connectWithRetry, 5000);
      });

      globalRef._rabbitmq_connection.on('error', (err: any) => {
        Logger.error('RabbitMQ bağlantı hatası', err);
      });

      isConnecting = false;

      // Reconnect callback'lerini çalıştır
      for (const cb of reconnectCallbacks) {
        try {
          await cb();
        } catch (cbErr) {
          Logger.error('RabbitMQ reconnect callback hatası', cbErr);
        }
      }
      break;
    } catch (error) {
      Logger.error('RabbitMQ bağlanırken hata oluştu, 5s sonra tekrar denenecek', error);
      globalRef._rabbitmq_channel = null;
      globalRef._rabbitmq_connection = null;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

export async function initRabbitMQ() {
  // Bloke olmadan arka planda başlatıyoruz
  connectWithRetry().catch((err) => {
    Logger.error('RabbitMQ connectWithRetry kritik hata', err);
  });
}

export function getRabbitChannel(): any {
  if (!globalRef._rabbitmq_channel) {
    throw new Error('RabbitMQ channel is not initialized and connection is offline.');
  }
  return globalRef._rabbitmq_channel;
}

/**
 * Belirtilen kuyruğa yeni bir iş ekler.
 */
export async function sendToQueue(queueName: string, data: object) {
  const ch = getRabbitChannel();
  ch.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
    persistent: true, // Mesaj diskte tutulur
  });
}
