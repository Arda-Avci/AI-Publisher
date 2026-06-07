import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Güvenli şifreleme için .env üzerinden ENCRYPTION_KEY alınır veya fallback kullanılır
// AES-256 için 32 byte (256 bit) uzunluğunda anahtar gerekir
const algorithm = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'gizli_bir_sifreleme_anahtari_123'; 
// Uyarı: Gerçek projelerde 32 bytelık güvenli bir anahtar olmalıdır. Fallback 32 byte olmalıdır.
const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

// Username'i deterministik olarak arayabilmek için Statik IV kullanıyoruz. 
// Normalde CBC'de statik IV önerilmez ancak "SELECT * WHERE username = ?" çalışması için gereklidir.
const IV = Buffer.alloc(16, 0); 

export function encryptUsername(text: string): string {
  if (!text) return text;
  const cipher = crypto.createCipheriv(algorithm, key, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decryptUsername(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  try {
    const decipher = crypto.createDecipheriv(algorithm, key, IV);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('[ERROR] Kullanıcı adı decrypt edilemedi:', e);
    return encryptedText; // Hata durumunda (eski şifresiz veri varsa vb) raw dön
  }
}
