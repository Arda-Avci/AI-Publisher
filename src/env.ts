import { PORTS, CALLBACK } from './constants.js';

export function requiredEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required env: ${name}`);
    }
    return '';
  }
  return val;
}

export const env = {
  get PORT(): number {
    return Number(process.env.PORT) || PORTS.SERVER;
  },
  get NODE_ENV(): string {
    return process.env.NODE_ENV || 'development';
  },
  get isDev(): boolean {
    return this.NODE_ENV === 'development';
  },
  get isProd(): boolean {
    return this.NODE_ENV === 'production';
  },
  get isTest(): boolean {
    return this.NODE_ENV === 'test';
  },
  get SESSION_SECRET(): string {
    if (this.isProd) {
      return requiredEnv('SESSION_SECRET');
    }
    return process.env.SESSION_SECRET || 'dev-secret-not-for-production';
  },
  get PUBLIC_URL(): string {
    return process.env.PUBLIC_URL || `http://localhost:${this.PORT}`;
  },
  get CALLBACK_TOKEN(): string {
    return process.env.CALLBACK_TOKEN || CALLBACK.DEFAULT_TOKEN;
  },
  get MOCK_COLAB(): boolean {
    return process.env.MOCK_COLAB === 'true';
  },
  get HEADLESS(): boolean {
    return process.env.HEADLESS !== 'false';
  },
  get DATABASE_URL(): string {
    return process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ai_publisher';
  },
  get B2_ENDPOINT(): string {
    return process.env.B2_ENDPOINT_URL || '';
  },
  get B2_KEY_ID(): string {
    return process.env.B2_KEY_ID || '';
  },
  get B2_APP_KEY(): string {
    return process.env.B2_APPLICATION_KEY || '';
  },
  get B2_BUCKET(): string {
    return process.env.B2_BUCKET || 'ai-publisher-models';
  },
  get GEMINI_API_KEY(): string {
    return process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  },
  get ENCRYPTION_KEY(): string {
    if (this.isProd) {
      return requiredEnv('ENCRYPTION_KEY');
    }
    return process.env.ENCRYPTION_KEY || 'test-key-for-unit-tests-only';
  },
  get DISABLE_RATE_LIMIT(): boolean {
    return process.env.DISABLE_RATE_LIMIT === 'true';
  },
  get MODAL_TOKEN_ID(): string {
    return process.env.MODAL_TOKEN_ID || '';
  },
  get MODAL_TOKEN_SECRET(): string {
    return process.env.MODAL_TOKEN_SECRET || '';
  },
  get MODAL_AUTH_TOKEN(): string {
    return process.env.MODAL_AUTH_TOKEN || '';
  },
} as const;
