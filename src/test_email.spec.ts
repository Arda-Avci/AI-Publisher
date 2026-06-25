import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sendEmail } from './services/emailService.js';

describe('Email Service', () => {
  beforeAll(() => {
    delete process.env.SMTP_HOST;
  });

  it('sendEmail should skip gracefully when SMTP not configured', async () => {
    let logged = false;
    const origWarn = console.warn;
    console.warn = (...args) => {
      if (args.some((a) => typeof a === 'string' && a.includes('SMTP not configured'))) logged = true;
      origWarn.apply(console, args);
    };

    await sendEmail('test@example.com', 'Subject', '<p>Body</p>');
    console.warn = origWarn;
  });
});
