// OpenTelemetry must be imported before any other module
import { getMetricsHandler } from './lib/telemetry.js';

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import type { Request, Response } from 'express';
import session from 'express-session';
import path from 'path';
import crypto from 'crypto';
import { initDatabase } from './db.js';
import { startVideoQueueWorker } from './queue.js';
import { startGarbageCollector } from './lib/cleanup.js';
import { initRabbitMQ } from './lib/rabbitmq.js';
import { startPublishQueueWorker } from './lib/publish-queue.js';
import { startClipQueueWorker } from './lib/clip-queue.js';
import { i18nMiddleware } from './middleware/i18n.js';
import { Logger, setCorrelationId, pinoLogger } from './lib/logger.js';
import pinoHttp from 'pino-http';
import { csrfMiddleware } from './middleware/csrf.js';

import { themeMiddleware } from './middleware/theme.js';
import { utf8Middleware } from './middleware/utf8.js';
import { errorHandler } from './middleware/error.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerAuthSetupRoutes } from './routes/authSetup.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerPublishRoutes } from './routes/publish.js';
import { registerProgressRoutes } from './routes/progress.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerOpportunityRoutes } from './routes/opportunity.js';
import { registerDifferentiationRoutes } from './routes/differentiation.js';
import { registerEditorRoutes } from './routes/editor.js';
import { registerCreditRoutes } from './routes/credits.js';
import { registerLocalesRoutes } from './routes/locales.js';
import { registerAuditRoutes } from './routes/audit.js';
import adminRouter from './routes/admin.js';
import { registerChatToEditRoutes } from './routes/chatToEdit.js';
import { registerViMaxRoutes } from './routes/viMax.js';
import { registerPipecatRoutes } from './routes/pipecat.js';
import { bRollRouter } from './routes/bRoll.js';
import { nicheRouter } from './routes/niche.js';
import { splitRouter } from './routes/splitScreen.js';
import { museTalkRouter } from './routes/museTalk.js';
import { paymentsRouter } from './routes/payments.js';
import { charactersRouter } from './routes/characters.js';
import { characterLibraryRouter } from './routes/characterLibrary.js';
import { characterGenerationRouter } from './routes/characterGeneration.js';
import { publicRouter } from './routes/public.js';
import { talkShowRouter } from './routes/talkShow.js';
import { scriptsRouter } from './routes/scripts.js';
import canvasRouter from './routes/canvas.js';
import apiKeysRouter from './routes/apiKeys.js';
import batchRouter from './routes/batch.js';
import clipperRouter from './routes/clipper.js';
import aiHelperRouter from './routes/aiHelper.js';
import templatesRouter from './routes/templates.js';
import beatSyncRouter from './routes/beatSync.js';
import helpVideosRouter from './routes/helpVideos.js';
import storyChatRouter from './routes/storyChat.js';
import colorGradeRouter from './routes/colorGrade.js';
import cutRouter from './routes/cut.js';
import dubbingRouter from './routes/dubbing.js';
import viralRouter from './routes/viral.js';
import transcriptEditorRouter from './routes/transcriptEditor.js';
import aiStudioRouter from './routes/aiStudio.js';
import oldStoryboardRouter from './routes/storyboard.js';
import editQueueRouter from './routes/editQueue.js';
import { loraRouter } from './routes/lora.js';
import { uploadRouter } from './routes/upload.js';
import { schedulePublishRouter } from './routes/schedulePublish.js';
import { registerWebhookRoutes } from './routes/webhook.js';
import { registerNotificationRoutes } from './routes/notifications.js';
import { registerExportRoutes } from './routes/export.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerSubscriptionRoutes } from './routes/subscriptions.js';
import trendRouter from './routes/trends.js';
import { crewRouter } from './routes/crewAI.js';
import { documentRouter } from './routes/documentUpload.js';
import { storyboardRouter } from './services/storyboardRoutes.js';
import { envPropsRouter } from './routes/envProps.js';

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
const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  Logger.error('SESSION_SECRET is not set in production. Security risk!');
  process.exit(1);
}

// Global process-level hata yakalama
// Yakalanmayan Promise rejection'ları sessizce Node.js'i crash edebilir
process.on('unhandledRejection', (reason) => {
  Logger.error(
    'Unhandled Promise Rejection',
    reason instanceof Error ? reason : new Error(String(reason)),
  );
});

process.on('uncaughtException', (err) => {
  Logger.error('Uncaught Exception — sunucu yeniden başlatılıyor', err);
  process.exit(1);
});

// Correlation ID — her istek için unique ID ata
app.use((_req, _res, next) => { setCorrelationId(); next(); });

// Pino HTTP request logging — her isteği structured logla
app.use(pinoHttp({ logger: pinoLogger }));

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
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'; ` +
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
      `font-src 'self' https://fonts.gstatic.com; ` +
      `img-src 'self' data: https: blob:; ` +
      `media-src 'self' https: blob: http:; ` +
      `connect-src 'self' wss: ws:; ` +
      `frame-src 'self'; ` +
      `frame-ancestors 'self'`,
  );
  next();
});

// Middleware'ler
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'gizemli_bir_sir_123_development',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 gün
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  }),
);
app.use(csrfMiddleware);
app.use(i18nMiddleware);
app.use(themeMiddleware);

// Uploads ve videolar dizinlerini statik olarak sun
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/videolar', express.static(path.join(process.cwd(), 'videolar')));
app.use('/exports', express.static(path.join(process.cwd(), 'exports')));

// React build çıktısını serve et
const clientDist = path.join(process.cwd(), 'client', 'dist');
app.use(express.static(clientDist));

// Register all routes
registerAuthRoutes(app);
registerDashboardRoutes(app);
registerJobRoutes(app);
registerPublishRoutes(app);
registerAuthSetupRoutes(app);
registerProgressRoutes(app);
registerSettingsRoutes(app);
registerOpportunityRoutes(app);
registerDifferentiationRoutes(app);
registerEditorRoutes(app);
registerCreditRoutes(app);
registerLocalesRoutes(app);
registerAuditRoutes(app);
registerChatToEditRoutes(app);
registerViMaxRoutes(app);
registerPipecatRoutes(app);
registerWebhookRoutes(app);
registerNotificationRoutes(app);
registerExportRoutes(app);
registerAnalyticsRoutes(app);
registerSubscriptionRoutes(app);

// API Rotaları
app.use('/api/v1/broll', bRollRouter);
app.use('/api/v1', nicheRouter);
app.use('/api/v1', splitRouter);
app.use('/api/v1', museTalkRouter);
app.use('/api/v1/talkshow', talkShowRouter);
app.use('/api/v1/talkshow', scriptsRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/characters', charactersRouter);
app.use('/api/v1/character-library', characterLibraryRouter);
app.use('/api/v1/character-gen', characterGenerationRouter);
app.use('/api/v1/public', publicRouter);
app.use('/api/v1/canvas', canvasRouter);
app.use('/api/v1/api-keys', apiKeysRouter);
app.use('/api/v1/batch', batchRouter);
app.use('/api/v1/clipper', clipperRouter);
app.use('/api/v1/ai-helper', aiHelperRouter);
app.use('/api/v1/templates', templatesRouter);
app.use('/api/v1/beatsync', beatSyncRouter);
app.use('/api/v1/help-videos', helpVideosRouter);
app.use('/api/v1/story', storyChatRouter);
app.use('/api/v1/color', colorGradeRouter);
app.use('/api/v1/cut', cutRouter);
app.use('/api/v1/dubbing', dubbingRouter);
app.use('/api/v1/viral', viralRouter);
app.use('/api/v1/transcript', transcriptEditorRouter);
app.use('/api/v1/studio', aiStudioRouter);
app.use('/api/v1/storyboard', oldStoryboardRouter);
app.use('/api/v1/edit-queue', editQueueRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/lora', loraRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/schedule-publish', schedulePublishRouter);
app.use('/api/v1/trends', trendRouter);
app.use('/api/v1/crew', crewRouter);
app.use('/api/v1', storyboardRouter);
app.use('/api/v1', documentRouter);
app.use('/api/v1', envPropsRouter);

// CSRF token endpoint — React uygulaması session alıp token'ı kullanabilsin
app.get('/api/v1/csrf', (req, res) => {
  res.json({ csrfToken: req.session.csrfToken || '' });
});

// Prometheus metrics endpoint (OpenTelemetry)
const metricsHandler = getMetricsHandler();
if (metricsHandler) {
  app.get('/metrics', (req: Request, res: Response) => {
    metricsHandler(req as any, res as any);
  });
  Logger.info('[OTEL] /metrics endpoint registered');
}

// Global error handler (last)
app.use(errorHandler);

// React SPA catch-all: API olmayan tüm GET isteklerinde React index.html serve et
const reactIndex = path.join(clientDist, 'index.html');
app.get(/^\/(?!api|login|logout)(.*)/, (req, res) => {
  res.sendFile(reactIndex, (err) => {
    if (err) res.status(404).send('Not found');
  });
});

// Sunucu Başlatma
async function startServer() {
  await initDatabase();
  await initRabbitMQ();

  app.listen(Number(PORT), '127.0.0.1', () => {
    Logger.info(`AI Publisher sunucusu aktif: http://localhost:${PORT}`);
    startGarbageCollector();
    startVideoQueueWorker();
    startPublishQueueWorker();
    startClipQueueWorker();

    // Trend scheduler — periyodik trend taramasi
    import('./services/trendScheduler.js').then(({ startTrendScheduler }) => {
      startTrendScheduler();
    });

    // Pipecat bridge sunucusu — multi-agent voice/video pipeline
    import('./services/pipecatBridge.js').then(({ pipecatBridge }) => {
      pipecatBridge.start().catch((err: any) => Logger.warn('[Pipecat] Auto-start failed:', err));
    });

    // MCP (Model Context Protocol) sunucusu — AI ajanları için API
    import('./services/mcpServer.js').then(({ startMCPServer }) => {
      startMCPServer(Number(process.env.MCP_PORT) || 3099).catch((err: any) =>
        Logger.warn('[MCP] Server failed to start:', err),
      );
    });
  });
}

startServer();
