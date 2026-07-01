import { describe, it, expect } from 'vitest';
import { extractText } from '../src/services/documentParser.js';
import path from 'path';
import fs from 'fs';
import { TIMEOUT } from './constants.js';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');

describe('DocumentParser', () => {
  it('txt dosyasindan metin cikarir', async () => {
    const buf = Buffer.from('Merhaba dunya! Bu bir test metnidir.');
    const text = await extractText(buf, 'text/plain');
    expect(text).toContain('Merhaba dunya');
  });

  it('desteklenmeyen format hata verir', async () => {
    const buf = Buffer.from('test');
    await expect(extractText(buf, 'application/zip')).rejects.toThrow('Desteklenmeyen');
  });

  it('bos dosya icin hata vermez ama kisa metin donebilir', async () => {
    const buf = Buffer.from('');
    const text = await extractText(buf, 'text/plain');
    expect(text).toBe('');
  });

  it('pdf dosyasindan metin cikarir (integration)', { timeout: TIMEOUT.EXEC_QUICK }, async () => {
    const pdfPath = path.join(FIXTURES, 'test.pdf');
    if (!fs.existsSync(pdfPath)) return; // skip if no fixture
    const buf = fs.readFileSync(pdfPath);
    const text = await extractText(buf, 'application/pdf');
    expect(text.length).toBeGreaterThan(0);
  });
});
