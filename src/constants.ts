// Centralized application constants
// All magic numbers, directory names, defaults collected here
// Import: import { DIRECTORIES, PORTS, FILE_LIMITS } from './constants.js'

export const DIRECTORIES = {
  VIDEO_OUTPUT: 'videolar',
  UPLOADS: 'uploads',
  EXPORTS: 'exports',
  AUTH: '.auth',
  CLIENT_DIST: 'client/dist',
  LOCALES: 'src/locales',
} as const;

export const PORTS = {
  SERVER: 4000,
  MCP: 3099,
  REDIS: 6379,
  SMTP: 587,
  BROWSER_USE: 5026,
  PIPECAT: 8765,
} as const;

export const FILE_LIMITS = {
  MAX_VIDEO_UPLOAD: 500 * 1024 * 1024, // 500MB
  MAX_CHARACTER_IMAGE: 10 * 1024 * 1024, // 10MB
  MAX_DOCUMENT_UPLOAD: 10 * 1024 * 1024, // 10MB
} as const;

export const TIMEOUT = {
  AI_FAST: 30_000,
  AI_MEDIUM: 45_000,
  AI_SLOW: 60_000,
  AI_STORYBOARD: 90_000,
  AI_QUICK: 20_000,
  AI_EXPRESS: 15_000,
  DOWNLOAD: 120_000,
  MUTEX_ACQUIRE: 300_000,
  DOCKER_MUTEX: 600_000,
  HEAVY_GEN: 600_000,
  BROWSER_NAV: 30_000,
  BROWSER_WAIT: 20_000,
  BROWSER_UPLOAD: 40_000,
  BROWSER_TASK: 600_000,
  FFMPEG: 300_000,
  EXEC_QUICK: 15_000,
  API_FETCH: 10_000,
  DOCKER_CHECK: 5_000,
  PIPECAT_HEALTH: 3_000,
  LORA_CHECK: 5_000,
  HEAVY_POLL: 720_000,
  POLL_QUEUE: 3_000,
  POLL_SCENE: 5_000,
  POLL_RABBITMQ_RECONNECT: 5_000,
  POLL_TASK: 10_000,
  HEALTH_CHECK: 8_000,
} as const;

export const RETRY = {
  AI_CALL: 2,
  CLIP_QUEUE: 3,
  DOCKER_TASK: 30,
  INPAINT_POLL: 60,
  V2V_POLL: 120,
} as const;

export const SCENE_DEFAULTS = {
  DURATION_SEC: 6,
  FPS: 24,
  WIDTH: 1280,
  HEIGHT: 720,
  AUDIO_SAMPLE_RATE: 16000,
} as const;

export const AI_DEFAULTS = {
  MODEL: 'gemini-2.5-flash',
  MAX_TOKENS: 4000,
} as const;

export const CREDIT_DEFAULTS = {
  DEFAULT_USER_CREDITS: 100,
  ADMIN_SEED_CREDITS: 10_000,
  DEFAULT_SCENE_COST: 10,
  DEFAULT_COVER_COST: 5,
  MONTHLY_LIMIT: 100,
} as const;

export const DOCKER_PORTS = {
  COGVIDEOX: 5001,
  XTTS: 5002,
  AUDIOLDM2: 5003,
  WAV2LIP: 5004,
  MUSETALK: 5005,
  WHISPER: 5006,
  STABLEDIFFUSION: 5007,
  WAN: 5008,
  LTX: 5009,
  HUNYUAN: 5010,
  KOKOROTTS: 5011,
  SVD: 5012,
  ANIMATEDIFF: 5013,
  WAN25: 5014,
  F5TTS: 5015,
  LORA_TRAINER: 5016,
  SADTALKER: 5017,
  DYNAMICRAFTER: 5018,
  ZEROSCOPE: 5019,
  VIDEO_RETALKING: 5020,
  GENEFACE: 5021,
  MOCHI: 5022,
  PYRAMID_FLOW: 5023,
  VIDEOCRAFTER: 5024,
  REALESRGAN: 5025,
  BROWSER_USE: 5026,
} as const;

export const IYZICO = {
  SANDBOX_URL: 'https://sandbox-api.iyzipay.com',
} as const;

export const CALLBACK = {
  DEFAULT_TOKEN: 'local_callback_secure_token_2026',
} as const;

export const B2_DEFAULTS = {
  ENDPOINT_URL: 'https://s3.us-west-004.backblazeb2.com',
  BUCKET: 'ai-publisher-models',
  SIGNED_URL_EXPIRATION_SEC: 3600,
} as const;

export const MODAL = {
  VOLUME_NAME: 'ai-publisher-weights',
  VOLUME_PATH: '/vol/weights',
  TIMEOUT_SEC: 600,
  POLL_INTERVAL_MS: 5000,
  GPU_VIDEO: { WAN: 'H100', WAN25: 'H100', COGVIDEOX: 'A100', HUNYUAN: 'A100', LTX: 'A100', MOCHI: 'A100', ANIMATEDIFF: 'A10', DYNAMICRAFTER: 'A10', PYRAMIDFLOW: 'A100', SVD: 'A10', VIDEOCRAFTER: 'A10', ZEROSCOPE: 'A10' },
  GPU_IMAGE: { STABLEDIFFUSION: 'A10', REALESRGAN: 'A10', LORA_TRAINER: 'A10' },
  GPU_AUDIO: { WAV2LIP: 'A10', SADTALKER: 'A10', MUSETALK: 'A10', GENEFACE: 'A10', VIDEORETALKING: 'A10', AUDIOLDM2: 'A10', BROWSERUSE: 'A10' },
  CPU_AUDIO: ['kokoro', 'f5tts', 'xtts', 'whisper'],
} as const;

export const SOCIAL_URLS = {
  YOUTUBE_STUDIO: 'https://studio.youtube.com',
  TIKTOK_UPLOAD: 'https://www.tiktok.com/creator-center/upload?lang=tr-TR',
  X_COMPOSE: 'https://x.com/compose/post',
  META_REELS: 'https://business.facebook.com/latest/reels_composer',
} as const;

export const YOUTUBE = {
  TRENDING: 'https://www.youtube.com/feed/trending',
  API_BASE: 'https://www.googleapis.com/youtube/v3',
  CAPTIONS_API: 'https://www.googleapis.com/youtube/v3/captions',
  SEARCH_MAX_RESULTS: 20,
} as const;

export const GEMINI_API = {
  TRANSCRIPTION_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
} as const;

export const FONTS = {
  GOOGLE_STYLES: 'https://fonts.googleapis.com',
  GOOGLE_FONTS: 'https://fonts.gstatic.com',
} as const;

export const CLEANUP = {
  GC_INTERVAL_MS: 12 * 60 * 60 * 1000, // 12h
  MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24h
} as const;

export const CREDIT_COSTS = {
  SCRIPT: 5,
  ENHANCE: 3,
} as const;

export const PUBLISH = {
  RANDOM_DELAY_MIN: 300,
  RANDOM_DELAY_MAX: 1000,
} as const;

export const QUEUE = {
  PREFETCH: 1,
  PRIORITY_DEFAULT: 5,
  MAX_RETRIES_DEFAULT: 3,
} as const;

export const NEO4J = {
  MAX_POOL_SIZE: 10,
} as const;

export const RATE_LIMIT = {
  HEAVY_WINDOW_MS: 60_000,
  MEDIUM_WINDOW_MS: 60_000,
  SSE_WINDOW_MS: 60_000,
  AUTH_WINDOW_MS: 900_000,
  HEAVY_MAX: 10,
  MEDIUM_MAX: 30,
  SSE_MAX: 100,
  AUTH_MAX: 5,
} as const;
