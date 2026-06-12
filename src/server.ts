import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import path from 'path';
import crypto from 'crypto';
import { initDatabase } from './db.js';
import { startVideoQueueWorker } from './queue.js';
import { startGarbageCollector } from './lib/cleanup.js';
import { initRabbitMQ } from './lib/rabbitmq.js';
import { startPublishQueueWorker } from './lib/publish-queue.js';
import { i18nMiddleware } from './middleware/i18n.js';
import { Logger } from './lib/logger.js';
import { csrfMiddleware } from './middleware/csrf.js';

import { themeMiddleware } from './middleware/theme.js';
import { utf8Middleware } from './middleware/utf8.js';
import { errorHandler } from './middleware/error.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerPublishRoutes } from './routes/publish.js';
import { registerProgressRoutes } from './routes/progress.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerOpportunityRoutes } from './routes/opportunity.js';
import { registerDifferentiationRoutes } from './routes/differentiation.js';
import { registerColabRoutes } from './routes/colab.js';
import { registerEditorRoutes } from './routes/editor.js';
import { registerCreditRoutes } from './routes/credits.js';
import { registerLocalesRoutes } from './routes/locales.js';
import { registerAuditRoutes } from './routes/audit.js';
import { registerChatToEditRoutes } from './routes/chatToEdit.js';
import { registerViMaxRoutes } from './routes/viMax.js';
import { registerPipecatRoutes } from './routes/pipecat.js';
import { bRollRouter } from './routes/bRoll.js';
import { paymentsRouter } from './routes/payments.js';
import { charactersRouter } from './routes/characters.js';
import { publicRouter } from './routes/public.js';
import { talkShowRouter } from './routes/talkShow.js';
import colabStatusRouter from './routes/colabStatus.js';

// Session tipini genişletelim
declare module 'express-session' {
  interface SessionData {
    userId: number;
    lang?: 'tr' | 'en';
    theme?: string;
    isDark?: boolean;
    csrfToken?: string;
  }
}


const app = express();
const PORT = process.env.PORT || 3016;

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  Logger.error('SESSION_SECRET is not set in production. Security risk!');
  process.exit(1);
}

// UTF-8 encoding middleware — tüm response'larda Türkçe karakter desteği
app.use(utf8Middleware);

// HTTP Security Headers (Clickjacking, MIME-Sniffing & CSP with Dynamic Nonce)
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;

  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; ` +
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://*.ngrok.io https://*.ngrok-free.app https://*.localtunnel.me; ` +
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
    `font-src 'self' https://fonts.gstatic.com; ` +
    `img-src 'self' data: https: blob:; ` +
    `media-src 'self' https: blob: http:; ` +
    `connect-src 'self' wss: ws: https://*.ngrok.io https://*.ngrok-free.app https://*.localtunnel.me; ` +
    `frame-src 'self'; ` +
    `frame-ancestors 'self'`
  );
  next();
});

// Middleware'ler
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'gizemli_bir_sir_123_development',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 gün
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));
app.use(csrfMiddleware);
app.use(i18nMiddleware);
app.use(themeMiddleware);

// Uploads ve videolar dizinlerini statik olarak sun
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/videolar', express.static(path.join(process.cwd(), 'videolar')));

// Register all routes
registerAuthRoutes(app);
registerDashboardRoutes(app);
registerJobRoutes(app);
registerPublishRoutes(app);
registerProgressRoutes(app);
registerSettingsRoutes(app);
registerOpportunityRoutes(app);
registerDifferentiationRoutes(app);
registerColabRoutes(app);
registerEditorRoutes(app);
registerCreditRoutes(app);
registerLocalesRoutes(app);
registerAuditRoutes(app);
registerChatToEditRoutes(app);
registerViMaxRoutes(app);
registerPipecatRoutes(app);

// API Rotaları
app.use('/api/v1/broll', bRollRouter);
app.use('/api/v1/talkshow', talkShowRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/characters', charactersRouter);
app.use('/api/v1/public', publicRouter);
app.use('/api/v1/colab', colabStatusRouter);

// Global error handler (last)
app.use(errorHandler);

// Sunucu Başlatma
async function startServer() {
  await initDatabase();
  await initRabbitMQ();

  // Ngrok tünelini başlat (varsa token ile)
  try {
    const { startNgrokTunnel } = await import('./lib/ngrok-tunnel.js');
    await startNgrokTunnel(Number(PORT));
  } catch (err: any) {
    Logger.warn('Node.js ngrok tüneli başlatılamadı:', err);
  }

  app.listen(Number(PORT), '127.0.0.1', () => {
    Logger.info(`AI Publisher sunucusu aktif: http://localhost:${PORT}`);
    startGarbageCollector();
    startVideoQueueWorker();
    startPublishQueueWorker();

    // Pipecat bridge sunucusu — multi-agent voice/video pipeline
    import('./services/pipecatBridge.js').then(({ pipecatBridge }) => {
      pipecatBridge.start().catch((err: any) =>
        Logger.warn('[Pipecat] Auto-start failed:', err)
      );
    });

    // MCP (Model Context Protocol) sunucusu — AI ajanları için API
    import('./services/mcpServer.js').then(({ startMCPServer }) => {
      startMCPServer(Number(process.env.MCP_PORT) || 3099).catch((err: any) =>
        Logger.warn('[MCP] Server failed to start:', err)
      );
    });
  });
}

startServer();
