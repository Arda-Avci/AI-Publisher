import { Logger } from '../lib/logger.js';
import { refreshTrends } from './trendAnalyzer.js';
import { db } from '../db.js';

interface PlatformSchedule {
  platform: string;
  intervalMs: number;
  timer?: ReturnType<typeof setInterval>;
  running: boolean;
}

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const DATA_RETENTION_DAYS = 7;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

const schedules: PlatformSchedule[] = [
  { platform: 'tiktok', intervalMs: parseInt(process.env.TREND_INTERVAL_TIKTOK || '', 10) || DEFAULT_INTERVAL_MS, running: false },
  { platform: 'youtube', intervalMs: parseInt(process.env.TREND_INTERVAL_YOUTUBE || '', 10) || DEFAULT_INTERVAL_MS, running: false },
  { platform: 'x', intervalMs: parseInt(process.env.TREND_INTERVAL_X || '', 10) || DEFAULT_INTERVAL_MS, running: false },
  { platform: 'instagram', intervalMs: parseInt(process.env.TREND_INTERVAL_INSTAGRAM || '', 10) || DEFAULT_INTERVAL_MS, running: false },
];

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

async function scrapePlatform(platform: string): Promise<void> {
  const schedule = schedules.find((s) => s.platform === platform);
  if (!schedule || schedule.running) return;
  schedule.running = true;
  try {
    Logger.info(`[TrendScheduler] Auto-scraping ${platform}...`);
    const results = await refreshTrends();
    const platformResult = results.find((r) => r.platform === platform);
    if (platformResult) {
      Logger.info(`[TrendScheduler] ${platform}: ${platformResult.count} trend kaydedildi`);
    }
  } catch (err) {
    Logger.error(`[TrendScheduler] ${platform} scraping hatasi:`, err as Error);
  } finally {
    schedule.running = false;
  }
}

async function cleanupOldData(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const result = await db.run('DELETE FROM trend_analysis WHERE scraped_at < $1', [cutoff]);
    Logger.info(`[TrendScheduler] Temizlik tamam: ${result?.changes || 0} eski kayit silindi`);
  } catch (err) {
    Logger.error('[TrendScheduler] Temizlik hatasi:', err as Error);
  }
}

export function startTrendScheduler(): void {
  Logger.info('[TrendScheduler] Baslatiliyor...');

  for (const schedule of schedules) {
    if (schedule.intervalMs < 60000) {
      Logger.warn(`[TrendScheduler] ${schedule.platform} intervali cok dusuk (${schedule.intervalMs}ms), 60s yapiliyor`);
      schedule.intervalMs = 60000;
    }

    const intervalMinutes = Math.round(schedule.intervalMs / 60000);
    Logger.info(`[TrendScheduler] ${schedule.platform}: her ${intervalMinutes} dk'da bir taranacak`);

    schedule.timer = setInterval(() => {
      scrapePlatform(schedule.platform);
    }, schedule.intervalMs);
  }

  cleanupTimer = setInterval(cleanupOldData, CLEANUP_INTERVAL_MS);
  cleanupOldData();

  Logger.info(`[TrendScheduler] ${schedules.length} platform taramasi baslatildi`);
}

export function stopTrendScheduler(): void {
  Logger.info('[TrendScheduler] Durduruluyor...');
  for (const schedule of schedules) {
    if (schedule.timer) {
      clearInterval(schedule.timer);
      schedule.timer = undefined;
    }
  }
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  Logger.info('[TrendScheduler] Durduruldu');
}

export function getSchedulerConfig(): {
  platforms: { platform: string; intervalMs: number; intervalMinutes: number }[];
  retentionDays: number;
} {
  return {
    platforms: schedules.map((s) => ({
      platform: s.platform,
      intervalMs: s.intervalMs,
      intervalMinutes: Math.round(s.intervalMs / 60000),
    })),
    retentionDays: DATA_RETENTION_DAYS,
  };
}

export function updatePlatformInterval(platform: string, intervalMs: number): boolean {
  const schedule = schedules.find((s) => s.platform === platform);
  if (!schedule) return false;
  if (intervalMs < 60000) intervalMs = 60000;

  schedule.intervalMs = intervalMs;
  if (schedule.timer) {
    clearInterval(schedule.timer);
  }
  schedule.timer = setInterval(() => {
    scrapePlatform(schedule.platform);
  }, schedule.intervalMs);

  const intervalMinutes = Math.round(intervalMs / 60000);
  Logger.info(`[TrendScheduler] ${platform} intervali guncellendi: ${intervalMinutes} dk`);
  return true;
}
