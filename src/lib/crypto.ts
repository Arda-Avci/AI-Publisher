import crypto from 'crypto';
import dotenv from 'dotenv';
import { Logger } from './logger.js';
dotenv.config();

const algorithm = 'aes-256-cbc';
const IV = Buffer.alloc(16, 0);

let _key: Buffer | null = null;

function getKey(): Buffer {
  if (!_key) {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    _key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  }
  return _key;
}

export function encryptUsername(text: string): string {
  if (!text) return text;
  const cipher = crypto.createCipheriv(algorithm, getKey(), IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decryptUsername(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  try {
    const decipher = crypto.createDecipheriv(algorithm, getKey(), IV);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    Logger.error('Kullanıcı adı decrypt edilemedi', e);
    return encryptedText;
  }
}
