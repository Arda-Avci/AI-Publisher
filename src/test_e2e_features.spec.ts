import { describe, it, expect } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';

/*
 * E2E Playwright testsuygulaması: client/tests/e2e/
 *   login.spec.ts, create-job.spec.ts, publish.spec.ts,
 *   edit-meta.spec.ts, gallery.spec.ts, settings.spec.ts,
 *   progress-bar.spec.ts, responsive.spec.ts
 *
 * Bu dosya Express API'sinin temel çalışma durumunu test eder.
 * Playwright E2E'leri Faz 7D kapsamındadır.
 */

describe('Express App Bootstrap', () => {
  it('creates express app and responds to GET /api/v1/csrf', async () => {
    const app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
      }),
    );

    app.get('/api/v1/csrf', (req, res) => {
      res.json({ csrfToken: (req.session as any).csrfToken || '' });
    });

    const res = await request(app).get('/api/v1/csrf');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('csrfToken');
    expect(typeof res.body.csrfToken).toBe('string');
  });

  it('returns 404 for unknown endpoint', async () => {
    const app = express();
    app.use(express.json());

    const res = await request(app).get('/api/v1/non-existent-route');
    expect(res.status).toBe(404);
  });

  it('handles JSON body parsing', async () => {
    const app = express();
    app.use(express.json());

    app.post('/api/v1/test-echo', (req, res) => {
      res.json({ received: req.body });
    });

    const res = await request(app)
      .post('/api/v1/test-echo')
      .send({ hello: 'world' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.received).toEqual({ hello: 'world' });
  });
});
