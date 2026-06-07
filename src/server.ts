import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import path from 'path';
import { initDatabase } from './db.js';
import { startVideoQueueWorker } from './queue.js';
import { startGarbageCollector } from './lib/cleanup.js';
import { initRabbitMQ } from './lib/rabbitmq.js';
import { startPublishQueueWorker } from './lib/publish-queue.js';
import { i18nMiddleware } from './middleware/i18n.js';

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

// Session tipini genişletelim
declare module 'express-session' {
  interface SessionData {
    userId: number;
    lang?: 'tr' | 'en';
    theme?: string;
    isDark?: boolean;
  }
}


const app = express();
const PORT = process.env.PORT || 3016;

// UTF-8 encoding middleware — tüm response'larda Türkçe karakter desteği
app.use(utf8Middleware);

// Middleware'ler
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'gizemli_bir_sir_123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 gün
}));
app.use(i18nMiddleware);
app.use(themeMiddleware);

// Uploads ve videolar dizinlerini statik olarak sun
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res) => res.setHeader('Content-Type', 'text/html; charset=utf-8')
}));
app.use('/videolar', express.static(path.join(process.cwd(), 'videolar'), {
  setHeaders: (res) => res.setHeader('Content-Type', 'text/html; charset=utf-8')
}));

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

// Global error handler (last)
app.use(errorHandler);

// Sunucu Başlatma
async function startServer() {
  await initDatabase();
  await initRabbitMQ();
  app.listen(PORT, () => {
    console.log(`[INFO] AI Publisher sunucusu aktif: http://localhost:${PORT}`);
    startGarbageCollector();
    startVideoQueueWorker();
    startPublishQueueWorker();
  });
}

startServer();
