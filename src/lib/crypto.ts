import crypto from 'crypto';
import dotenv from 'dotenv';
import { Logger } from './logger.js';
dotenv.config();

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const LEGACY_IV = Buffer.alloc(16, 0);

let _key: Buffer | null = null;

function getKey(): Buffer {
  if (!_key) {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    _key = crypto.scryptSync(ENCRYPTION_KEY, 'ai_publisher_v1', 32);
  }
  return _key;
}

function isLegacyFormat(ciphertext: string): boolean {
  return !ciphertext.includes(':');
}

export function encryptUsername(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptUsername(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  try {
    if (isLegacyFormat(encryptedText)) {
      const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), LEGACY_IV);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    const [ivHex, ciphertext] = encryptedText.split(':');
    const iv = Buffer.from(ivHex!, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(ciphertext!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    Logger.error('Kullanıcı adı decrypt edilemedi', e);
    return encryptedText;
  }
}

export function isLegacyEncrypted(text: string): boolean {
  return text.length > 0 && isLegacyFormat(text);
}

export function legacyEncryptUsername(text: string): string {
  if (!text) return text;
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), LEGACY_IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function encryptWithBothFormats(text: string): { newFormat: string; legacyFormat: string } {
  return {
    newFormat: encryptUsername(text),
    legacyFormat: legacyEncryptUsername(text),
  };
}
