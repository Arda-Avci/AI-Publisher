import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import fs from 'fs-extra';
import path from 'path';
import { initDatabase, db } from './db.js';
import { encryptUsername } from './lib/crypto.js';
import { transcribeVideoAudioWithTimestamps } from './lib/audio-transcriber.js';
import clipperRouter from './routes/clipper.js';
import { viralAnalyzer } from './services/clipper/index.js';

// child_process mock'lama (FFmpeg'in test ortamında patlamasını engellemek için)
vi.mock('child_process', () => ({
  execFile: vi.fn((cmd, args, callback) => {
    const dest = args[args.length - 1];
    // MP3 dosyasını varmış gibi oluştur
    if (dest && typeof dest === 'string' && dest.endsWith('.mp3')) {
      try {
        fs.ensureDirSync(path.dirname(dest));
        fs.writeFileSync(dest, 'fake mp3 content');
      } catch (e) {}
    }
    callback(null, 'stdout', 'stderr');
  })
}));

// rate-limit'ları mock'la
vi.mock('./middleware/rate-limit.js', () => ({
  authLimiter: (req: any, res: any, next: any) => next(),
  mediumLimiter: (req: any, res: any, next: any) => next(),
  heavyLimiter: (req: any, res: any, next: any) => next()
}));

// audio-transcriber modülünü mock'la (clipper.ts dynamic import'unun mock referansı görmesi için)
vi.mock('./lib/audio-transcriber.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./lib/audio-transcriber.js')>();
  return {
    ...original,
    transcribeVideoAudioWithTimestamps: vi.fn(),
    transcribeVideoAudio: vi.fn()
  };
});

// global fetch mock'layalım (Colab ve Gemini çağrıları için)
const globalFetchSpy = vi.fn();
global.fetch = globalFetchSpy as any;

describe('Clipper & Whisper Integration Tests', () => {
  let app: express.Application;
  let testUserId: number;
  let testVideoPath: string;
  let originalTranscribe: any;

  beforeAll(async () => {
    // Orijinal implementasyonu importActual ile alalım
    const actualModule = await vi.importActual<typeof import('./lib/audio-transcriber.js')>('./lib/audio-transcriber.js');
    originalTranscribe = actualModule.transcribeVideoAudioWithTimestamps;

    // Setup Express for router testing
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));

    app.use((req: any, res, next) => {
      req.session.userId = testUserId;
      next();
    });

    app.use('/api/v1/clipper', clipperRouter);

    // Init DB and create test user
    await initDatabase();
    const testUsername = encryptUsername('clipper.whisper@test.com');
    await db.run('DELETE FROM users WHERE username = ?', [testUsername]);
    await db.run(
      'INSERT INTO users (username, password, credits) VALUES (?, ?, ?)',
      [testUsername, 'pass', 1000]
    );
    const user = await db.get('SELECT id FROM users WHERE username = ?', [testUsername]);
    testUserId = user.id;

    // Create a dummy video file for testing
    const videoDir = path.join(process.cwd(), 'videolar');
    await fs.ensureDir(videoDir);
    testVideoPath = path.join(videoDir, `test_dummy_${Date.now()}.mp4`);
    await fs.writeFile(testVideoPath, 'fake video stream');
  });

  afterAll(async () => {
    if (testUserId) {
      await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    }
    await fs.remove(testVideoPath);
    vi.restoreAllMocks();
  });

  it('1. Colab /transcribe endpointi basariyla cagrildiginda segmentleri donmeli', async () => {
    process.env.COLAB_URL = 'https://mock-colab-link.ngrok-free.dev';
    
    // Orijinal implementasyonu test etmek için mock'u geçici olarak asıl koda yönlendir
    vi.mocked(transcribeVideoAudioWithTimestamps).mockImplementationOnce(originalTranscribe);

    // Mock Colab response
    globalFetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        text: 'hello world this is a test',
        segments: [
          { start: 0.0, end: 2.0, text: 'hello world' },
          { start: 2.0, end: 4.0, text: 'this is a test' }
        ],
        language: 'en'
      })
    });

    const result = await transcribeVideoAudioWithTimestamps(testVideoPath);
    
    expect(result.text).toBe('hello world this is a test');
    expect(result.segments.length).toBe(2);
    expect(result.segments[0].start).toBe(0.0);
    expect(result.segments[1].text).toBe('this is a test');
  });

  it('2. Colab hata verdiginde Gemini fallback mekanizmasi structured JSON olarak segmentleri cikarmali', async () => {
    process.env.COLAB_URL = 'https://mock-colab-link.ngrok-free.dev';
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'mock_api_key';

    // Orijinal implementasyonu kullan
    vi.mocked(transcribeVideoAudioWithTimestamps).mockImplementationOnce(originalTranscribe);

    // Mock 1: Colab fails
    globalFetchSpy.mockRejectedValueOnce(new Error('Colab offline'));

    // Mock 2: Gemini returns structured JSON text
    globalFetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                text: 'gemini fallback text',
                segments: [
                  { start: 0.0, end: 3.5, text: 'gemini fallback text' }
                ],
                language: 'tr'
              })
            }]
          }
        }]
      })
    });

    const result = await transcribeVideoAudioWithTimestamps(testVideoPath);
    
    expect(result.text).toBe('gemini fallback text');
    expect(result.segments.length).toBe(1);
    expect(result.segments[0].end).toBe(3.5);
    expect(result.language).toBe('tr');
  });

  it('3. /api/v1/clipper/extract rotasi asenkron deşifre akışını basariyla tetiklemeli', async () => {
    // viralAnalyzer.analyze metodunu mock'layalım ki Zen API / LLM çağrısı atılmasın
    const analyzeSpy = vi.spyOn(viralAnalyzer, 'analyze').mockResolvedValue({
      segments: [
        {
          id: 'seg-test',
          startTime: 0.0,
          endTime: 45.0,
          duration: 45.0,
          score: 85,
          reason: 'Test segment',
          highlights: ['Test highlight'],
          suggestedCaption: 'Suggested caption',
          suggestedHashtags: ['#test']
        }
      ],
      overallScore: 85,
      topReason: 'Test segment',
      transcriptSegments: 1
    });

    // transcribeVideoAudioWithTimestamps'i mock veri dönecek şekilde ayarla (süre 45 sn)
    const mockFunc = vi.mocked(transcribeVideoAudioWithTimestamps).mockResolvedValue({
      text: 'clipper route test transcription '.repeat(10),
      segments: [
        { start: 0.0, end: 45.0, text: 'clipper route test transcription '.repeat(10) }
      ],
      language: 'tr'
    });

    const res = await request(app)
      .post('/api/v1/clipper/extract')
      .send({
        videoPath: testVideoPath,
        videoId: 123,
        minDuration: 10,
        maxDuration: 60
      });

    expect(res.status).toBe(201);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.status).toBe('pending');

    // Asenkron akışın tamamlanması için kısa bir süre bekleyelim
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(mockFunc).toHaveBeenCalledWith(testVideoPath);

    // Job detaylarını çekip completed durumuna geldiğini ve segmentleri aldığını doğrula
    const jobRes = await request(app)
      .get(`/api/v1/clipper/${res.body.jobId}`);

    expect(jobRes.status).toBe(200);
    expect(jobRes.body.clip.status).toBe('completed');
    expect(jobRes.body.clip.segments.length).toBeGreaterThan(0);
    expect(jobRes.body.clip.segments[0].startTime).toBe(0.0);
  });
});
