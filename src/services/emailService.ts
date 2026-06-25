import nodemailer from 'nodemailer';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import type { Notification } from './notificationService.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) return null;

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });

  return transporter;
}

function getNotificationHtml(notification: Notification): string {
  const colors: Record<string, string> = {
    info: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#f43f5e',
  };
  const color = colors[notification.type] || '#06b6d4';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#1a1a2e;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden">
    <div style="padding:24px;border-bottom:1px solid rgba(255,255,255,0.08)">
      <h2 style="margin:0;font-size:18px;color:#fff">AI-Publisher</h2>
    </div>
    <div style="padding:24px">
      <div style="width:40px;height:40px;border-radius:50%;background:${color}20;display:flex;align-items:center;justify-content:center;margin-bottom:16px">
        <span style="color:${color};font-size:20px">●</span>
      </div>
      <h3 style="margin:0 0 8px;font-size:16px;color:#fff">${notification.title}</h3>
      <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.7);line-height:1.6">${notification.message}</p>
      ${notification.job_id ? `<p style="margin:12px 0 0;font-size:12px;color:rgba(255,255,255,0.4)">İş ID: #${notification.job_id}</p>` : ''}
    </div>
    <div style="padding:16px 24px;background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.04)">
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3)">Bu bildirim AI-Publisher tarafından otomatik gönderilmiştir.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const t = getTransporter();
  if (!t) {
    Logger.warn('[EMAIL] SMTP not configured, skipping email send');
    return;
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || 'noreply@ai-publisher.com',
      to,
      subject,
      html,
    });
    Logger.info(`[EMAIL] Sent to ${to}: "${subject}"`);
  } catch (err) {
    Logger.error(`[EMAIL] Failed to send to ${to}:`, err);
  }
}

export async function sendNotificationEmail(
  userId: number,
  notification: Notification,
): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', [userId]);
    if (!user) return;

    const subject = `[AI-Publisher] ${notification.title}`;
    const html = getNotificationHtml(notification);
    await sendEmail(user.username, subject, html);
  } catch (err) {
    Logger.error(`[EMAIL] sendNotificationEmail error for user ${userId}:`, err);
  }
}
