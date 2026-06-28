import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import dockerRouter from './routes/docker.js';

vi.mock('./lib/docker-host.js', () => ({
  dockerHost: {
    getHost: vi.fn(() => 'http://localhost'),
    getState: vi.fn(() => ({
      host: 'http://localhost',
      services: {
        cogvideox: { healthy: true, lastCheck: new Date().toISOString() },
        xtts: { healthy: false, lastCheck: null },
        whisper: { healthy: true, lastCheck: new Date().toISOString() },
      },
    })),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

describe('Docker Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use('/api/v1/docker', dockerRouter);
  });

  it('GET /api/v1/docker/status returns 200 with services', async () => {
    const res = await request(app).get('/api/v1/docker/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('host');
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('services');
    expect(res.body).toHaveProperty('healthyCount');
    expect(res.body).toHaveProperty('totalCount');
  });

  it('GET /api/v1/docker/status reports correct healthy count', async () => {
    const res = await request(app).get('/api/v1/docker/status');
    expect(res.body.healthyCount).toBe(2);
    expect(res.body.totalCount).toBe(3);
    expect(res.body.status).toBe('running');
  });

  it('GET /api/v1/docker/test-models returns 200 with results array', async () => {
    const res = await request(app).get('/api/v1/docker/test-models');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('healthy');
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it('GET /api/v1/docker/stream returns SSE headers', async () => {
    const http = await import('http');
    const server = app.listen(0);
    const port = (server.address() as any).port;
    await new Promise<void>((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${port}/api/v1/docker/stream`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('text/event-stream');
        expect(res.headers['cache-control']).toBe('no-cache');
        res.once('data', (chunk: Buffer) => {
          expect(chunk.toString()).toContain('data:');
          const jsonStr = chunk.toString().replace('data: ', '').trim();
          const data = JSON.parse(jsonStr);
          expect(data).toHaveProperty('status');
          expect(data).toHaveProperty('services');
          req.destroy();
          resolve();
        });
      });
      req.on('error', reject);
    });
    server.close();
  });
});
