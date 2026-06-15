import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { initDatabase, db } from './db.js';
import { paymentsRouter } from './routes/payments.js';
import { encryptUsername } from './lib/crypto.js';
import { CreditService } from './services/creditService.js';
import * as videoService from './services/videoService.js';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

// axios çağrılarını mock'layalım
vi.mock('axios', () => {
  const mockAxiosInstance = vi.fn((config) => {
    // Default call returns a mock stream compatible with file downloads (res.data.pipe)
    const mockStream = {
      pipe: (destWritable: any) => {
        destWritable.write('mock binary data');
        destWritable.end();
      },
      on: (event: string, cb: any) => {
        if (event === 'data') cb('mock binary data');
        if (event === 'end') cb();
      }
    };
    return Promise.resolve({ data: mockStream });
  });

  (mockAxiosInstance as any).get = vi.fn((url) => {
    if (url.includes('/verify-libs')) {
      return Promise.resolve({ data: { success: true, report: { diffusers: true } } });
    }
    if (url.includes('/health')) {
      return Promise.resolve({
        data: {
          status: 'healthy',
          memory: { gpu_total_gb: 16, gpu_used_gb: 4 },
          gpu_utilization: { gpu_pct: 25 },
          runtime: { uptime_seconds: 100 }
        }
      });
    }
    if (url.includes('/status') || url.includes('/generate-status')) {
      return Promise.resolve({
        data: {
          status: 'success',
          stage: 'done',
          stagePercent: 100,
          message: 'Tamamlandı'
        }
      });
    }
    return Promise.resolve({ data: {} });
  });

  (mockAxiosInstance as any).post = vi.fn().mockResolvedValue({
    data: { task_id: 'mock_task_id', status: 'success' }
  });

  (mockAxiosInstance as any).create = vi.fn(() => mockAxiosInstance);
  (mockAxiosInstance as any).interceptors = {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() }
  };

  return {
    default: mockAxiosInstance,
    get: (mockAxiosInstance as any).get,
    post: (mockAxiosInstance as any).post,
    create: (mockAxiosInstance as any).create
  };
});

// iyzico SDK'sını mock'la
vi.mock('iyzipay', () => {
  return {
    default: class MockIyzipay {
      checkoutForm = {
        retrieve: vi.fn((params, callback) => {
          callback(null, {
            status: 'success',
            paymentStatus: 'SUCCESS',
            conversationId: params.conversationId
          });
        }),
        initialize: vi.fn((params, callback) => {
          callback(null, {
            status: 'success',
            token: 'mock_token',
            checkoutFormContent: '<div>mock form</div>'
          });
        })
      };
      subscriptionCheckoutForm = {
        retrieve: vi.fn((params, callback) => {
          callback(null, {
            status: 'success',
            subscriptionStatus: 'ACTIVE',
            conversationId: params.conversationId
          });
        }),
        initialize: vi.fn((params, callback) => {
          callback(null, {
            status: 'success',
            token: 'mock_sub_token',
            checkoutFormContent: '<div>mock sub form</div>'
          });
        })
      };
      checkoutFormInitialize = {
        create: vi.fn((params, callback) => {
          callback(null, {
            status: 'success',
            token: 'mock_token',
            checkoutFormContent: '<div>mock form</div>',
            paymentPageUrl: 'https://mock.iyzipay.com/payment'
          });
        })
      };
    }
  };
});

// rate limiter'ları ve kuyruğu mock'la
vi.mock('./middleware/rate-limit.js', () => ({
  authLimiter: (req: any, res: any, next: any) => next(),
  mediumLimiter: (req: any, res: any, next: any) => next(),
  heavyLimiter: (req: any, res: any, next: any) => next()
}));

vi.mock('./lib/rabbitmq.js', () => ({
  getRabbitChannel: () => ({
    sendToQueue: vi.fn(),
    prefetch: vi.fn(),
    consume: vi.fn(),
    ack: vi.fn()
  }),
  registerReconnectCallback: vi.fn(),
  VIDEO_JOBS_QUEUE: 'video_jobs_queue'
}));

vi.mock('./lib/redis-mutex.js', () => {
  return {
    RedisMutex: class MockRedisMutex {
      async acquire() { return true; }
      async release() { return; }
    }
  };
});

vi.mock('./lib/colab-manager.js', () => {
  const mockState = {
    status: 'running',
    ngrokUrl: 'https://mock-colab.ngrok-free.dev',
    gpuMemoryGB: 16,
    gpuUsedGB: 4,
    gpuUtilizationPct: 25,
    lastHealthCheck: new Date().toISOString(),
    lastError: null,
    startedAt: new Date().toISOString(),
    uptimeSeconds: 100,
    runtimeSeconds: 100
  };
  return {
    colab: {
      getState: vi.fn(() => ({ ...mockState })),
      start: vi.fn(async () => ({ ngrokUrl: 'https://mock-colab.ngrok-free.dev' })),
      stop: vi.fn(async () => {}),
      connect: vi.fn(async () => ({ ngrokUrl: 'https://mock-colab.ngrok-free.dev' })),
      scheduleIdleStop: vi.fn(),
      cancelIdleStop: vi.fn(),
      isHealthy: vi.fn(() => true),
      verifyLibraries: vi.fn(async () => ({ success: true, report: { diffusers: true } })),
      on: vi.fn(),
      off: vi.fn()
    }
  };
});

// aiService.ts'i mock'la
vi.mock('./services/aiService.js', () => ({
  generateStudioScenes: vi.fn().mockResolvedValue({
    scenes: [
      { sceneNumber: 1, videoPrompt: 'First scene prompt', speechText: 'Speech 1', sfxPrompt: 'SFX 1' }
    ],
    marketing: {
      ytTitle: 'Mock Title',
      ytDesc: 'Mock Desc',
      ytTags: 'mock,tags',
      ttDesc: 'Mock TT',
      ttTags: 'mock,tt',
      xDesc: 'Mock X',
      xTags: 'mock,x',
      metaDesc: 'Mock Meta',
      metaTags: 'mock,meta'
    }
  })
}));

vi.mock('./services/videoService.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./services/videoService.js')>();
  return {
    ...original,
    runFFmpegWithFallback: vi.fn(async () => {}),
    runFFmpeg: vi.fn(async () => ({ stdout: '', stderr: '' })),
    runInWorker: vi.fn(async () => ({ status: 'success' }))
  };
});

describe('iyzico Webhook, Timeline Müzik Miksajı ve Çoklu Karakter Lipsync Testleri', () => {
  let app: express.Application;
  let testUserId: number;
  let runFFmpegSpy: any;

  beforeAll(async () => {
    // Setup Express
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));

    // Setup Lang/Theme middleware
    app.use((req: any, res, next) => {
      req.lang = 'tr';
      req.theme = 'default';
      next();
    });

    app.use('/api/v1/payments', paymentsRouter);

    // Set COLAB_URL so queue doesn't try real colab.start()
    process.env.COLAB_URL = 'https://mock-colab.ngrok-free.dev';

    // Init DB
    await initDatabase();

    // Veritabanındaki eski bekleyen işleri temizle
    await db.run("UPDATE video_jobs SET status = 'failed' WHERE status = 'pending' OR status = 'processing'");

    // Test kullanıcısı oluştur
    const testUsername = encryptUsername('test.payments@gmail.com');
    await db.run('DELETE FROM users WHERE username = ?', [testUsername]);
    await db.run(
      'INSERT INTO users (username, password, credits, monthly_credit_limit, personal_avatar_base64, personal_voice_base64) VALUES (?, ?, ?, ?, ?, ?)',
      [testUsername, 'pass', 1000, 1000, 'my_avatar_base64', 'my_voice_base64']
    );
    const user = await db.get('SELECT id FROM users WHERE username = ?', [testUsername]);
    testUserId = user.id;

    // spy on runFFmpegWithFallback
    runFFmpegSpy = videoService.runFFmpegWithFallback;
  });

  afterAll(async () => {
    if (testUserId) {
      await db.run('DELETE FROM credit_transactions WHERE user_id = ?', [testUserId]);
      await db.run('DELETE FROM characters WHERE user_id = ?', [testUserId]);
      await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    }
    vi.restoreAllMocks();
  });

  describe('1. iyzico Webhook / Callback Testleri', () => {
    it('Tek seferlik ödeme başarısını işlemeli, kredi eklemeli ve satın alım transaction kaydı oluşturmalı', async () => {
      // Başlangıç kredisi 100
      await db.run('UPDATE users SET credits = 100 WHERE id = ?', [testUserId]);

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .query({
          userId: testUserId,
          credits: 250,
          isSub: 'false'
        })
        .send({
          token: 'test_checkout_token_single'
        });

      // 302 Redirect (/?payment=success)
      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/?payment=success');

      // Kredileri doğrula
      const user = await db.get('SELECT credits FROM users WHERE id = ?', [testUserId]);
      expect(user.credits).toBe(350); // 100 + 250

      // Transaction geçmişini doğrula
      const transactions = await db.all('SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY id DESC', [testUserId]);
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions[0].amount).toBe(250);
      expect(transactions[0].transaction_type).toBe('purchase');
    });

    it('Abonelik (Subscription) ödeme başarısını işlemeli, limit ve kredi güncellemeli', async () => {
      // Başlangıç kredisi 100
      await db.run('UPDATE users SET credits = 100, monthly_credit_limit = 100 WHERE id = ?', [testUserId]);

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .query({
          userId: testUserId,
          credits: 300,
          isSub: 'true'
        })
        .send({
          token: 'test_subscription_token'
        });

      expect(res.status).toBe(302);
      expect(res.header.location).toBe('/?payment=success');

      const user = await db.get('SELECT credits, monthly_credit_limit FROM users WHERE id = ?', [testUserId]);
      expect(user.credits).toBe(400); // 100 + 300
      expect(user.monthly_credit_limit).toBe(300);

      const transactions = await db.all('SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY id DESC', [testUserId]);
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions[0].amount).toBe(300);
      expect(transactions[0].transaction_type).toBe('subscription');
    });
  });

  describe('2. Çoklu Karakter Lipsync ve Tag Parsing Testleri', () => {
    it('Sahnelerdeki @me ve @karakter taglerini doğru ayrıştırmalı ve Colab payloaduna eklemeli', { timeout: 15000 }, async () => {
      // 0. Krediyi 1000 yapalım ve eski işleri temizleyelim
      await db.run("UPDATE users SET credits = 1000 WHERE id = ?", [testUserId]);
      await db.run("UPDATE video_jobs SET status = 'failed' WHERE status = 'pending' OR status = 'processing'");

      // 1. Karakter ekleyelim
      await db.run('DELETE FROM characters WHERE user_id = ?', [testUserId]);
      await db.run(
        'INSERT INTO characters (user_id, name, description, avatar_base64, voice_base64) VALUES (?, ?, ?, ?, ?)',
        [testUserId, 'sibel', 'Sibel karakteri', 'sibel_avatar_base64', 'sibel_voice_base64']
      );

      // 2. Bir video_job ve video_scene oluşturalım
      const jobRes = await db.run(
        `INSERT INTO video_jobs (user_id, master_prompt, status, current_stage) VALUES (?, ?, ?, ?)`,
        [testUserId, 'Sohbet videosu', 'processing', 'Kuyrukta']
      );
      const jobId = jobRes.lastID;

      await db.run(
        `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sort_order, speaker) VALUES (?, ?, ?, ?, ?, ?)`,
        [jobId, 1, '@sibel ve @me istanbul boğazında sohbet ediyor.', 'Merhaba ben sibel.', 1, '@sibel']
      );

      // 3. startProduction modülünü kuyruk içinden çağıralım
      // Bunun için queue.ts'i import edip startProduction'ı tetiklemeliyiz.
      // Axios mock'ı kur
      const mockPost = vi.mocked(axios.post);
      mockPost.mockResolvedValue({
        data: {
          task_id: 'mock_colab_task_id',
          status: 'success'
        }
      });

      // queue.ts içinden startProduction import edelim
      const { checkQueue } = await import('./queue.js');
      
      // video_jobs tablosundaki status'u pending yapalım ki checkQueue onu kapsasın
      await db.run("UPDATE video_jobs SET status = 'pending' WHERE id = ?", [jobId]);

      // checkQueue tetikleyelim
      process.env.MOCK_COLAB = 'false';
      try {
        await checkQueue();
      } finally {
        process.env.MOCK_COLAB = 'true';
      }

      // Colab'a fırlatılan generate-media payload'ını doğrula
      const generateMediaCall = mockPost.mock.calls.find(call => call[0].includes('/generate-media'));
      expect(generateMediaCall).toBeDefined();

      const payload = generateMediaCall![1] as any;
      expect(payload.speaker).toBe('@sibel');
      expect(payload.character_images).toBeDefined();
      expect(payload.character_images['@me']).toBe('my_avatar_base64');
      expect(payload.character_images['@sibel']).toBe('sibel_avatar_base64');
      expect(payload.reference_audio_base64).toBe('sibel_voice_base64');

      // Temizlik
      if (jobId) {
        await db.run('DELETE FROM video_scenes WHERE job_id = ?', [jobId]);
        await db.run('DELETE FROM video_jobs WHERE id = ?', [jobId]);
      }
    });
  });

  describe('3. Timeline amix Müzik Miksajı Testleri', () => {
    it('Sahne background_music_path ve music_volume parametrelerine göre FFmpeg filter_complex yapısını kurmalı', { timeout: 15000 }, async () => {
      // 0. Krediyi 1000 yapalım ve eski işleri temizleyelim
      await db.run("UPDATE users SET credits = 1000 WHERE id = ?", [testUserId]);
      await db.run("UPDATE video_jobs SET status = 'failed' WHERE status = 'pending' OR status = 'processing'");

      // 1. Bir video_job ve video_scene oluşturalım
      // Arka plan müziği set edelim
      const testMusicPath = 'uploads/test_bg_music.mp3';
      await fs.ensureDir(path.dirname(path.join(process.cwd(), testMusicPath)));
      await fs.writeFile(path.join(process.cwd(), testMusicPath), 'fake audio content');

      const jobRes = await db.run(
        `INSERT INTO video_jobs (user_id, master_prompt, status, current_stage, background_music_path, audio_ducking) VALUES (?, ?, ?, ?, ?, ?)`,
        [testUserId, 'Müzikli video', 'processing', 'Kuyrukta', testMusicPath, 0]
      );
      const jobId = jobRes.lastID;

      // music_volume: 0.15 yapalım
      await db.run(
        `INSERT INTO video_scenes (job_id, scene_number, video_prompt, speech_text, sort_order, music_volume) VALUES (?, ?, ?, ?, ?, ?)`,
        [jobId, 1, 'Scene with music', 'Hello world', 1, 0.15]
      );

      // Colab callback indirme simülasyonunu ve mock disk kontrolünü ayarla
      // Colab /status endpoint veya callback response mock
      const mockPost = vi.mocked(axios.post);
      mockPost.mockResolvedValue({
        data: {
          task_id: 'mock_task_id_music',
          status: 'success'
        }
      });
      const mockGet = vi.mocked(axios.get);
      mockGet.mockImplementation((url: string) => {
        if (url.includes('/verify-libs')) {
          return Promise.resolve({ data: { success: true, report: { diffusers: true } } });
        }
        return Promise.resolve({
          data: {
            status: 'success',
            stage: 'done',
            stagePercent: 100
          }
        });
      });

      // Disk dosyalarını mock'la (sahne videolarının localde varmış gibi atlanmasını önlemek için)
      // queue.ts pathExists kontrolleri yapar. Dosyaları varmış gibi yazalım
      const sceneVideoPath = path.join(process.cwd(), 'videolar', `scene_${jobId}_1.mp4`);
      const sceneAudioPath = path.join(process.cwd(), 'videolar', `scene_${jobId}_1.wav`);
      const sceneSfxPath = path.join(process.cwd(), 'videolar', `sfx_${jobId}_1.wav`);
      
      await fs.ensureDir(path.dirname(sceneVideoPath));
      await fs.writeFile(sceneVideoPath, 'fake video');
      await fs.writeFile(sceneAudioPath, 'fake audio');
      await fs.writeFile(sceneSfxPath, 'fake sfx');

      // checkQueue'yu çalıştır
      const { checkQueue } = await import('./queue.js');
      await db.run("UPDATE video_jobs SET status = 'pending' WHERE id = ?", [jobId]);
      
      await checkQueue();

      // FFmpeg spy kontrolü
      expect(runFFmpegSpy).toHaveBeenCalled();
      
      // FFmpeg argümanlarını incele
      let amixFound = false;
      let volumeFound = false;
      
      for (const call of runFFmpegSpy.mock.calls) {
        const argsList = call[0] as any[];
        for (const argObj of argsList) {
          const args = argObj.args as string[];
          const filterComplex = args.find(a => a.includes('amix') && a.includes('volume'));
          if (filterComplex) {
            amixFound = true;
            if (filterComplex.includes('volume=0.15')) {
              volumeFound = true;
            }
          }
        }
      }

      expect(amixFound).toBe(true);
      expect(volumeFound).toBe(true);

      // Temizlik
      await fs.remove(path.join(process.cwd(), testMusicPath));
      await fs.remove(sceneVideoPath);
      await fs.remove(sceneAudioPath);
      await fs.remove(sceneSfxPath);
      if (jobId) {
        await db.run('DELETE FROM video_scenes WHERE job_id = ?', [jobId]);
        await db.run('DELETE FROM video_jobs WHERE id = ?', [jobId]);
      }
    });
  });
});
