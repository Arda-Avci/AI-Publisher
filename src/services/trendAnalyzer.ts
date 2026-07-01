import { chromium } from 'playwright';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';
import { TIMEOUT } from '../constants.js';

export interface TrendItem {
  platform: 'tiktok' | 'youtube' | 'x' | 'instagram';
  title: string;
  description: string;
  url: string;
  thumbnail?: string;
  engagement: number;
  hashtags: string[];
  category: string;
  author?: string;
  authorAvatar?: string;
  scrapedAt: string;
}

const TREND_CACHE_MINUTES = 30;

async function withBrowser<T>(fn: (browser: any) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

async function scrapeTikTok(): Promise<TrendItem[]> {
  return withBrowser(async (browser) => {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });
    const page = await context.newPage();
    await page.goto('https://www.tiktok.com/explore', { waitUntil: 'networkidle', timeout: TIMEOUT.BROWSER_NAV });
    await page.waitForTimeout(3000);

    const items: TrendItem[] = [];
    const cards = await page.$$('[data-e2e="explore-item"]');
    const maxCards = Math.min(cards.length, 30);

    for (let i = 0; i < maxCards; i++) {
      try {
        const card = cards[i];
        const titleEl = await card.$('[data-e2e="explore-card-title"]');
        const title = titleEl ? await titleEl.textContent() || '' : '';
        const linkEl = await card.$('a');
        const url = linkEl ? await linkEl.getAttribute('href') || '' : '';
        const imgEl = await card.$('img');
        const thumbnail = imgEl ? await imgEl.getAttribute('src') || '' : '';
        const viewsEl = await card.$('[data-e2e="explore-card-views"]');
        const viewsText = viewsEl ? await viewsEl.textContent() || '0' : '0';
        const engagement = parseInt(viewsText.replace(/[^0-9]/g, ''), 10) || 0;

        if (title) {
          items.push({
            platform: 'tiktok',
            title,
            description: title,
            url: url.startsWith('http') ? url : `https://www.tiktok.com${url}`,
            thumbnail,
            engagement,
            hashtags: (title.match(/#[\w\uFE00-\uFE0F\u200D]+/g) || []).map((h: string) => h.trim()),
            category: 'entertainment',
            scrapedAt: new Date().toISOString(),
          });
        }
      } catch { }
    }
    await context.close();
    return items;
  });
}

async function scrapeYouTube(): Promise<TrendItem[]> {
  return withBrowser(async (browser) => {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });
    const page = await context.newPage();
    await page.goto('https://www.youtube.com/feed/trending', {
      waitUntil: 'networkidle',
      timeout: TIMEOUT.BROWSER_NAV,
    });
    await page.waitForTimeout(3000);

    const items: TrendItem[] = [];
    const videos = await page.$$('ytd-video-renderer, ytd-rich-item-renderer');
    const maxVideos = Math.min(videos.length, 30);

    for (let i = 0; i < maxVideos; i++) {
      try {
        const video = videos[i];
        const titleEl = await video.$('#video-title');
        const title = titleEl ? await titleEl.textContent() || '' : '';
        const url = titleEl ? await titleEl.getAttribute('href') || '' : '';
        const thumbEl = await video.$('img');
        const thumbnail = thumbEl ? await thumbEl.getAttribute('src') || '' : '';
        const metaEl = await video.$('#metadata-line');
        const metaText = metaEl ? await metaEl.textContent() || '' : '';
        const engagement = (metaText.match(/([0-9.]+[KMB]?)/g) || []).reduce((acc: number, v: string) => {
          const num = parseFloat(v.replace(/[KMB]/g, ''));
          if (v.includes('K')) return acc + num * 1000;
          if (v.includes('M')) return acc + num * 1000000;
          if (v.includes('B')) return acc + num * 1000000000;
          return acc + num;
        }, 0);

        if (title) {
          items.push({
            platform: 'youtube',
            title: title.trim(),
            description: title.trim(),
            url: `https://www.youtube.com${url}`,
            thumbnail,
            engagement,
            hashtags: [],
            category: detectCategory(title),
            author: '',
            scrapedAt: new Date().toISOString(),
          });
        }
      } catch { }
    }
    await context.close();
    return items;
  });
}

async function scrapeX(): Promise<TrendItem[]> {
  return withBrowser(async (browser) => {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });
    const page = await context.newPage();
    await page.goto('https://x.com/explore/tabs/trending', {
      waitUntil: 'networkidle',
      timeout: TIMEOUT.BROWSER_NAV,
    });
    await page.waitForTimeout(3000);

    const items: TrendItem[] = [];
    const trendCards = await page.$$('[data-testid="trend"]');
    const maxCards = Math.min(trendCards.length, 30);

    for (let i = 0; i < maxCards; i++) {
      try {
        const card = trendCards[i];
        const textEl = await card.$('span');
        const title = textEl ? await textEl.textContent() || '' : '';
        const postCountEl = await card.$('[data-testid="trendCount"]');
        const postCountText = postCountEl ? await postCountEl.textContent() || '0' : '';
        const engagement = parseInt(postCountText.replace(/[^0-9]/g, ''), 10) || 0;

        if (title) {
          items.push({
            platform: 'x',
            title: title.trim(),
            description: title.trim(),
            url: `https://x.com/search?q=${encodeURIComponent(title.trim())}`,
            engagement,
            hashtags: title.startsWith('#') ? [title.trim()] : [],
            category: detectCategory(title),
            scrapedAt: new Date().toISOString(),
          });
        }
      } catch { }
    }
    await context.close();
    return items;
  });
}

async function scrapeInstagram(): Promise<TrendItem[]> {
  return withBrowser(async (browser) => {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });
    const page = await context.newPage();
    await page.goto('https://www.instagram.com/explore/', {
      waitUntil: 'networkidle',
      timeout: TIMEOUT.BROWSER_NAV,
    });
    await page.waitForTimeout(3000);

    const items: TrendItem[] = [];
    const posts = await page.$$('article a');
    const maxPosts = Math.min(posts.length, 30);

    for (let i = 0; i < maxPosts; i++) {
      try {
        const post = posts[i];
        const url = await post.getAttribute('href') || '';
        const imgEl = await post.$('img');
        const thumbnail = imgEl ? await imgEl.getAttribute('src') || '' : '';
        const altText = imgEl ? await imgEl.getAttribute('alt') || '' : '';

        if (url) {
          items.push({
            platform: 'instagram',
            title: altText || 'Instagram post',
            description: altText || '',
            url: `https://www.instagram.com${url}`,
            thumbnail,
            engagement: 0,
            hashtags: (altText.match(/#[\w\uFE00-\uFE0F\u200D]+/g) || []).map((h: string) => h.trim()),
            category: detectCategory(altText),
            scrapedAt: new Date().toISOString(),
          });
        }
      } catch { }
    }
    await context.close();
    return items;
  });
}

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(gaming|minecraft|valorant|fortnite|pubg|roblox)\b/.test(lower)) return 'gaming';
  if (/\b(music|song|rap|beat|remix|cover)\b/.test(lower)) return 'music';
  if (/\b(comedy|funny|humor|meme|prank)\b/.test(lower)) return 'comedy';
  if (/\b(news|breaking|politics|world|war)\b/.test(lower)) return 'news';
  if (/\b(sport|football|soccer|basketball|nba|ufc)\b/.test(lower)) return 'sports';
  if (/\b(tech|ai|robot|coding|programming|software)\b/.test(lower)) return 'technology';
  if (/\b(fashion|beauty|style|makeup|outfit)\b/.test(lower)) return 'fashion';
  if (/\b(food|recipe|cooking|baking|kitchen)\b/.test(lower)) return 'food';
  if (/\b(fitness|gym|workout|health|yoga)\b/.test(lower)) return 'fitness';
  if (/\b(education|learn|course|tutorial|howto)\b/.test(lower)) return 'education';
  if (/\b(business|entrepreneur|startup|marketing|finance)\b/.test(lower)) return 'business';
  if (/\b(travel|wanderlust|vacation|adventure|nature)\b/.test(lower)) return 'travel';
  return 'entertainment';
}

export async function refreshTrends(): Promise<{ platform: string; count: number }[]> {
  const results: { platform: string; count: number }[] = [];
  const scrapers: { platform: TrendItem['platform']; fn: () => Promise<TrendItem[]> }[] = [
    { platform: 'tiktok', fn: scrapeTikTok },
    { platform: 'youtube', fn: scrapeYouTube },
    { platform: 'x', fn: scrapeX },
    { platform: 'instagram', fn: scrapeInstagram },
  ];

  for (const { platform, fn } of scrapers) {
    try {
      Logger.info(`[TrendAnalyzer] Scraping ${platform} trends...`);
      const items = await fn();
      Logger.info(`[TrendAnalyzer] ${platform}: ${items.length} trend bulundu`);

      for (const item of items) {
        await db.run(
          `INSERT INTO trend_analysis (platform, title, description, url, thumbnail, engagement, hashtags, category, author, author_avatar, scraped_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            item.platform,
            item.title,
            item.description,
            item.url,
            item.thumbnail || '',
            item.engagement,
            JSON.stringify(item.hashtags),
            item.category,
            item.author || '',
            item.authorAvatar || '',
            item.scrapedAt,
          ],
        );
      }

      results.push({ platform, count: items.length });
    } catch (err) {
      Logger.error(`[TrendAnalyzer] ${platform} scraping hatasi:`, err as Error);
      results.push({ platform, count: 0 });
    }
  }

  return results;
}

export async function getCachedTrends(platform?: string): Promise<TrendItem[]> {
  const cutoff = new Date(Date.now() - TREND_CACHE_MINUTES * 60 * 1000).toISOString();

  let rows: any[];
  if (platform) {
    rows = await db.all(
      `SELECT * FROM trend_analysis WHERE platform = $1 AND scraped_at > $2 ORDER BY engagement DESC LIMIT 50`,
      [platform, cutoff],
    );
  } else {
    rows = await db.all(
      `SELECT * FROM trend_analysis WHERE scraped_at > $1 ORDER BY platform, engagement DESC`,
      [cutoff],
    );
  }

  return rows.map(mapRowToTrend);
}

export async function searchTrends(
  query: string,
  platform?: string,
): Promise<TrendItem[]> {
  const searchTerm = `%${query}%`;
  let rows: any[];

  if (platform) {
    rows = await db.all(
      `SELECT * FROM trend_analysis WHERE platform = $1 AND (title ILIKE $2 OR description ILIKE $2 OR hashtags ILIKE $2) ORDER BY engagement DESC LIMIT 50`,
      [platform, searchTerm],
    );
  } else {
    rows = await db.all(
      `SELECT * FROM trend_analysis WHERE title ILIKE $1 OR description ILIKE $1 OR hashtags ILIKE $1 ORDER BY engagement DESC LIMIT 50`,
      [searchTerm],
    );
  }

  return rows.map(mapRowToTrend);
}

function mapRowToTrend(row: any): TrendItem {
  return {
    platform: row.platform,
    title: row.title,
    description: row.description,
    url: row.url,
    thumbnail: row.thumbnail || undefined,
    engagement: row.engagement,
    hashtags: typeof row.hashtags === 'string' ? JSON.parse(row.hashtags) : row.hashtags || [],
    category: row.category,
    author: row.author || undefined,
    authorAvatar: row.author_avatar || undefined,
    scrapedAt: row.scraped_at,
  };
}

export async function applyTrendToPrompt(
  trend: TrendItem,
  masterPrompt: string,
): Promise<{ enhancedPrompt: string; suggestedHashtags: string[]; trendContext: string }> {
  const trendContext = JSON.stringify({
    title: trend.title,
    platform: trend.platform,
    category: trend.category,
    hashtags: trend.hashtags.slice(0, 10),
    engagement: trend.engagement,
  });

  const hashtagStr = trend.hashtags.slice(0, 10).join(' ');
  const enhancedPrompt = `${masterPrompt}

--- TREND BAĞLAMI ---
Bu konu şu anda ${trend.platform} platformunda trend:
Başlık: ${trend.title}
Kategori: ${trend.category}
Popüler hashtag'ler: ${hashtagStr}
Trend etkileşim: ${trend.engagement.toLocaleString('tr-TR')}

Lütfen yukarıdaki trend bağlamını dikkate alarak içeriği trend'e uygun şekilde üret.
Video stilini, dilini ve görsel estetiğini trend kategorisine göre uyarla.
Trend hashtag'lerini içeriğin doğal akışına entegre et.`;

  return {
    enhancedPrompt,
    suggestedHashtags: trend.hashtags.slice(0, 10),
    trendContext,
  };
}

export interface TrendHistoryPoint {
  date: string;
  count: number;
  platform: string;
}

export async function getTrendHistory(
  days: number = 7,
  platform?: string,
  bucket: 'hour' | 'day' = 'day',
): Promise<TrendHistoryPoint[]> {
  let query: string;
  const params: any[] = [];

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  if (bucket === 'hour') {
    query = `
      SELECT
        DATE_TRUNC('hour', scraped_at) as date,
        platform,
        COUNT(*) as count
      FROM trend_analysis
      WHERE scraped_at > $1
    `;
    params.push(cutoff);
    if (platform) {
      query += ` AND platform = $2`;
      params.push(platform);
    }
    query += ` GROUP BY DATE_TRUNC('hour', scraped_at), platform ORDER BY date ASC`;
  } else {
    query = `
      SELECT
        DATE(scraped_at) as date,
        platform,
        COUNT(*) as count
      FROM trend_analysis
      WHERE scraped_at > $1
    `;
    params.push(cutoff);
    if (platform) {
      query += ` AND platform = $2`;
      params.push(platform);
    }
    query += ` GROUP BY DATE(scraped_at), platform ORDER BY date ASC`;
  }

  const rows = await db.all(query, params);
  return (rows || []).map((row: any) => ({
    date: row.date,
    count: row.count,
    platform: row.platform,
  }));
}

export async function getTrendSummary(): Promise<
  { platform: string; total: number; topCategories: { category: string; count: number }[] }[]
> {
  const platforms = ['tiktok', 'youtube', 'x', 'instagram'];
  const summary: any[] = [];

  for (const platform of platforms) {
    const total = await db.get(
      `SELECT COUNT(*) as count FROM trend_analysis WHERE platform = $1`,
      [platform],
    );
    const categories = await db.all(
      `SELECT category, COUNT(*) as count FROM trend_analysis WHERE platform = $1 GROUP BY category ORDER BY count DESC LIMIT 5`,
      [platform],
    );

    summary.push({
      platform,
      total: total?.count || 0,
      topCategories: categories || [],
    });
  }

  return summary;
}
