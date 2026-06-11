import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, initDatabase } from './db.js';
import { CreditService } from './services/creditService.js';
import { encryptUsername } from './lib/crypto.js';

describe('SaaS Kredi Sistemi Birim Testleri', () => {
  let testUserId: number;

  beforeAll(async () => {
    // Veritabanını başlat
    await initDatabase();

    // Test kullanıcısı oluştur
    const testUsername = encryptUsername('test.user@gmail.com');
    await db.run('DELETE FROM users WHERE username = ?', [testUsername]);
    await db.run(
      'INSERT INTO users (username, password, credits, monthly_credit_limit, credit_reset_date) VALUES (?, ?, ?, ?, ?)',
      [testUsername, 'testpass', 100, 100, new Date().toISOString()]
    );

    const user = await db.get('SELECT id FROM users WHERE username = ?', [testUsername]);
    testUserId = user.id;
  });

  afterAll(async () => {
    // Temizlik
    if (testUserId) {
      await db.run('DELETE FROM credit_transactions WHERE user_id = ?', [testUserId]);
      await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    }
  });

  it('Kullanıcı kredilerini doğru getirmeli ve gerekirse yenilemeli', async () => {
    // 1. Kredileri getirelim
    const info = await CreditService.getUserCredits(testUserId);
    expect(info.credits).toBe(100);
    expect(info.limit).toBe(100);

    // 2. Sıfırlama tarihini geçmişe ayarlayalım ve yenilemeyi test edelim
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 2); // 2 ay önceye set et

    // Kullanıcının kredisini 10 yapalım
    await db.run('UPDATE users SET credits = 10, credit_reset_date = ? WHERE id = ?', [pastDate.toISOString(), testUserId]);

    // Kredileri sorguladığımızda yenilenmesi gerekir
    const renewedInfo = await CreditService.getUserCredits(testUserId);
    expect(renewedInfo.credits).toBe(100); // 100'e geri sıfırlanmış olmalı
  });

  it('Yeterli kredi durumunda krediyi düşmeli ve transaction kaydetmeli', async () => {
    // Krediyi 100 yapalım
    await db.run('UPDATE users SET credits = 100 WHERE id = ?', [testUserId]);

    const success = await CreditService.checkAndDeductCredits(
      testUserId,
      30,
      'usage',
      'Test kredi harcaması'
    );

    expect(success).toBe(true);

    const info = await CreditService.getUserCredits(testUserId);
    expect(info.credits).toBe(70);

    const history = await CreditService.getTransactionHistory(testUserId);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].amount).toBe(-30);
    expect(history[0].description).toBe('Test kredi harcaması');
  });

  it('Yetersiz kredi durumunda düşüm yapmamalı', async () => {
    // Krediyi 10 yapalım
    await db.run('UPDATE users SET credits = 10 WHERE id = ?', [testUserId]);

    const success = await CreditService.checkAndDeductCredits(
      testUserId,
      50,
      'usage',
      'Geçersiz harcama'
    );

    expect(success).toBe(false);

    const info = await CreditService.getUserCredits(testUserId);
    expect(info.credits).toBe(10); // Kredi düşmemiş olmalı
  });

  it('Hata durumunda kredileri iade etmeli', async () => {
    await db.run('UPDATE users SET credits = 50 WHERE id = ?', [testUserId]);

    await CreditService.refundCredits(testUserId, 20, 'İade testi');

    const info = await CreditService.getUserCredits(testUserId);
    expect(info.credits).toBe(70);

    const history = await CreditService.getTransactionHistory(testUserId);
    expect(history[0].amount).toBe(20);
    expect(history[0].description).toBe('İade testi');
  });
});
