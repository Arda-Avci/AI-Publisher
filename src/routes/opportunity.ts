import { Application, Request, Response } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Opportunity funnel route: /opportunity-videos.
 *
 * Primary path: YouTube Data API v3 (search.list → videos.list → channels.list).
 * Fallback path: Invidious + Piped public instances (no API key required).
 *
 * Flow: parse query + langs → if apiKey set, try YouTube API; on failure or
 * when no key is set, fall back through Invidious then Piped public instances
 * in order until one returns results.
 */

const SUPPORTED_LANGS_FOR_SEARCH = ['tr', 'en', 'de', 'fr', 'es'];

// Public fallback instances. Public Invidious/Piped instances are unreliable
// (frequently offline or rate-limited), so we try them in order and fall
// through on any error. No API key is required for either service.
const FALLBACK_INSTANCES: { type: 'invidious' | 'piped'; base: string }[] = [
  // Invidious (try first)
  { type: 'invidious', base: 'https://inv.nadeko.net' },
  { type: 'invidious', base: 'https://invidious.privacyredirect.com' },
  { type: 'invidious', base: 'https://invidious.fdn.fr' },
  // Piped
  { type: 'piped', base: 'https://pipedapi.adminforge.de' },
  { type: 'piped', base: 'https://watchapi.whatever.social' },
  { type: 'piped', base: 'https://api-piped.mha.fi' },
  { type: 'piped', base: 'https://pipedapi.kavin.rocks' }
];

// Chunk helper: split an array into fixed-size groups.
const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

type VideoResult = {
  videoId: string;
  title: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  subscribers: number;
  views: number;
  likes: number;
  score: number;
  description: string;
  publishedAt: string;
};

type FetchResult = {
  success: boolean;
  videos?: VideoResult[];
  error?: string;
  message?: string;
  code?: number;
  source?: string;
};

/**
 * YouTube Data API v3 path:
 * search.list → videos.list (stats+desc) → channels.list (subs).
 */
async function fetchFromYouTubeAPI(
  rawQ: string,
  langs: string[],
  apiKey: string
): Promise<FetchResult> {
  try {
    // --- Step A: search.list — one query per language, merge by videoId ---
    const allItems: any[] = [];
    const seenIds = new Set<string>();
    let firstError: any = null;

    for (const lang of langs) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(rawQ)}&type=video&relevanceLanguage=${lang}&key=${apiKey}`;
      try {
        const searchRes = await fetch(searchUrl);
        const searchData: any = await searchRes.json();
        if (searchData.error) {
          if (!firstError) firstError = searchData.error;
          continue;
        }
        for (const it of (searchData.items || [])) {
          if (!it?.id?.videoId) continue;
          if (seenIds.has(it.id.videoId)) continue;
          seenIds.add(it.id.videoId);
          allItems.push(it);
        }
      } catch (langErr: any) {
        if (!firstError) firstError = { message: langErr?.message || 'fetch failed' };
        continue;
      }
    }

    if (firstError && allItems.length === 0) {
      return {
        success: false,
        error: 'API_ERROR',
        message: firstError.message || 'YouTube API error',
        code: firstError.code
      };
    }

    if (allItems.length === 0) {
      return { success: true, videos: [] };
    }

    const items = allItems;
    const videoIds: string[] = items.map((it: any) => it.id.videoId);
    const channelIds: string[] = Array.from(
      new Set(items.map((it: any) => it.snippet?.channelId).filter(Boolean))
    );

    // --- Step B: videos.list for stats + full description (batched in 50s)
    const videoStatsMap = new Map<string, any>();
    for (const batch of chunk(videoIds, 50)) {
      const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${batch.join(',')}&key=${apiKey}`;
      const vRes = await fetch(vUrl);
      const vData: any = await vRes.json();
      if (vData.error) {
        return {
          success: false,
          error: 'API_ERROR',
          message: vData.error.message || 'YouTube API error',
          code: vData.error.code
        };
      }
      for (const v of (vData.items || [])) videoStatsMap.set(v.id, v);
    }

    // --- Step C: channels.list for subscriber counts (batched in 50s)
    const channelStatsMap = new Map<string, any>();
    for (const batch of chunk(channelIds, 50)) {
      const cUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${batch.join(',')}&key=${apiKey}`;
      const cRes = await fetch(cUrl);
      const cData: any = await cRes.json();
      if (cData.error) {
        return {
          success: false,
          error: 'API_ERROR',
          message: cData.error.message || 'YouTube API error',
          code: cData.error.code
        };
      }
      for (const c of (cData.items || [])) channelStatsMap.set(c.id, c);
    }

    // --- Compose results + score (engagement-corrected viral) ---
    const videos = items
      .map((it: any): VideoResult => {
        const vid = it.id.videoId;
        const channelId = it.snippet?.channelId;
        const vDetail = videoStatsMap.get(vid) || {};
        const cDetail = channelStatsMap.get(channelId) || {};
        const stats = vDetail.statistics || {};
        const cStats = cDetail.statistics || {};
        const snippet = vDetail.snippet || it.snippet || {};

        const views = parseInt(stats.viewCount || '0', 10);
        const likes = parseInt(stats.likeCount || '0', 10);
        const subs = parseInt(cStats.subscriberCount || '0', 10);
        const safeSubs = Math.max(subs, 1);
        const engagement = views > 0 ? likes / views : 0;
        const rawScore = (views / safeSubs) * (1 + engagement * 10);
        const score = Math.min(15, Math.round(rawScore * 10) / 10);

        const thumb =
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

        return {
          videoId: vid,
          title: snippet.title || '',
          thumbnail: thumb,
          channelId,
          channelTitle: snippet.channelTitle || cDetail.snippet?.title || '',
          subscribers: subs,
          views,
          likes,
          score,
          description: snippet.description || '',
          publishedAt: snippet.publishedAt || it.snippet?.publishedAt || ''
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return { success: true, videos, source: 'youtube_api' };
  } catch (err: any) {
    return { success: false, error: 'API_ERROR', message: err.message };
  }
}

/**
 * Public Invidious / Piped API fallback path.
 *
 * Iterates through public instances in order (Invidious first, then Piped)
 * until one returns valid results. Logs every attempt to the console.
 * Neither service exposes subscriber counts in search results, so subscribers
 * is always 0 and the score formula is reduced to a views/likes ratio.
 */
async function fetchFromFallback(rawQ: string, _langs: string[]): Promise<FetchResult> {
  // Neither Invidious nor Piped support a relevanceLanguage parameter, so the
  // langs list is accepted for API parity but not forwarded.
  for (const instance of FALLBACK_INSTANCES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const label = `${instance.type}:${instance.base}`;
    try {
      const items: any[] = await fetchFallbackItems(instance, rawQ, controller.signal);
      clearTimeout(timer);

      if (!Array.isArray(items) || items.length === 0) {
        // Empty result is still a valid response — return empty rather than
        // trying the next instance, otherwise a healthy but low-yield
        // instance would be skipped in favour of a slower one.
        console.log(`[Fallback] ${label} returned 0 results — using as source`);
        return { success: true, videos: [], source: label };
      }

      const videos: VideoResult[] = items.slice(0, 20).map((item) => {
        const videoId = String(item.videoId || '').trim();
        const views = Number(item.views) || 0;
        const likes = Number(item.likes) || 0;
        const safeLikes = Math.max(likes, 1);
        // No subscriber count from either search endpoint; use a simpler
        // views/likes ratio (capped at 15) to surface high-engagement videos.
        const score = Math.min(15, Math.round((views / safeLikes / 100) * 10) / 10);

        return {
          videoId,
          title: item.title || '',
          thumbnail:
            item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          channelId: item.channelId || '',
          channelTitle: item.channelTitle || '',
          subscribers: 0, // Not available from the search endpoint
          views,
          likes,
          score,
          description: item.description || '',
          publishedAt: item.publishedAt || ''
        };
      });

      console.log(`[Fallback] ${label} returned ${videos.length} videos`);
      return { success: true, videos, source: label };
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(`[Fallback] ${label} failed: ${err?.message || err}`);
      continue; // try next instance
    }
  }

  return { success: false, error: 'ALL_FALLBACKS_FAILED' };
}

/**
 * Hits a single Invidious or Piped instance and returns a normalized
 * list of raw items (each with { videoId, title, thumbnail, channelId,
 * channelTitle, views, likes, description, publishedAt }) ready to be
 * mapped to VideoResult by the caller.
 */
async function fetchFallbackItems(
  instance: { type: 'invidious' | 'piped'; base: string },
  rawQ: string,
  signal: AbortSignal
): Promise<any[]> {
  if (instance.type === 'invidious') {
    const fields = [
      'videoId',
      'title',
      'author',
      'authorId',
      'viewCount',
      'likeCount',
      'lengthSeconds',
      'published',
      'publishedText',
      'description'
    ].join(',');

    const url = `${instance.base}/api/v1/search?q=${encodeURIComponent(rawQ)}&type=video&page=1&fields=${encodeURIComponent(fields)}`;

    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const items: any[] = await res.json();
    if (!Array.isArray(items)) return [];

    // Normalize to the common shape used by the caller.
    return items.map((it) => ({
      videoId: it.videoId,
      title: it.title,
      thumbnail: it.videoThumbnails?.[0]?.url || '',
      channelId: it.authorId,
      channelTitle: it.author,
      views: it.viewCount,
      likes: it.likeCount,
      description: it.description,
      publishedAt: it.publishedText
    }));
  }

  // Piped: /search?q=...&filter=videos
  // Response: { items: [ { url, title, thumbnail, uploaderName, uploaderUrl,
  //                       views, duration, uploaded, uploadedDate } ] }
  const url = `${instance.base}/search?q=${encodeURIComponent(rawQ)}&filter=videos`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data: any = await res.json();
  const rawItems: any[] = Array.isArray(data?.items) ? data.items : [];
  if (rawItems.length === 0) return [];

  return rawItems.map((it) => {
    // Piped's url looks like "/watch?v=VIDEOID"; extract the id.
    let videoId = '';
    if (typeof it.url === 'string') {
      const m = it.url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
      if (m) videoId = m[1];
    }
    // uploaderUrl looks like "/channel/UCxxxx" — extract the channel id.
    let channelId = '';
    if (typeof it.uploaderUrl === 'string') {
      const m = it.uploaderUrl.match(/\/channel\/([A-Za-z0-9_-]+)/);
      if (m) channelId = m[1];
    }
    return {
      videoId,
      title: it.title,
      thumbnail: it.thumbnail,
      channelId,
      channelTitle: it.uploaderName,
      views: it.views,
      likes: 0, // Piped's search endpoint doesn't return likes
      description: it.description || it.shortDescription || '',
      publishedAt: it.uploadedDate || it.uploaded || ''
    };
  });
}

export function registerOpportunityRoutes(app: Application): void {
  app.get('/opportunity-videos', requireAuth, async (req: Request, res: Response) => {
    const user = await db.get('SELECT youtube_api_key FROM users WHERE id = ?', [req.session.userId]);
    const apiKey: string | undefined = user?.youtube_api_key;

    const rawQ = String(req.query.q || '').trim();
    if (!rawQ) {
      return res.json({ success: false, error: 'NO_QUERY' });
    }

    // Multi-language: the UI sends a comma-separated list of ISO codes
    // (e.g. "tr,en,de"). YouTube's `relevanceLanguage` accepts a single
    // code, so we iterate per language. Invidious/Piped ignore the parameter.
    const langParam = String(req.query.lang || 'tr').trim();
    const requestedLangs = langParam
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => SUPPORTED_LANGS_FOR_SEARCH.includes(s));
    const langs = requestedLangs.length > 0 ? requestedLangs : ['tr'];

    // Try YouTube Data API first if a key is configured. If it fails
    // (e.g. quota exceeded, network error), fall through to Invidious.
    if (apiKey) {
      const ytResult = await fetchFromYouTubeAPI(rawQ, langs, apiKey);
      if (ytResult.success) {
        return res.json({
          success: true,
          videos: ytResult.videos,
          source: 'youtube_api',
          languages: langs
        });
      }
      console.warn(
        '[opportunity] YouTube API failed, falling back to Invidious/Piped:',
        ytResult.message || ytResult.error
      );
    }

    // Fallback to Invidious/Piped (also the primary path when no apiKey is set).
    const fbResult = await fetchFromFallback(rawQ, langs);
    if (fbResult.success) {
      return res.json({
        success: true,
        videos: fbResult.videos,
        source: fbResult.source || 'fallback',
        languages: langs
      });
    }

    return res.json({
      success: false,
      error: 'ALL_FALLBACKS_FAILED',
      message:
        "YouTube API key olmadan arama şu an mümkün değil (public Invidious/Piped instance'ları kapalı). Ücretsiz bir YouTube API key alıp Ayarlar'a ekleyin: console.cloud.google.com/apis/credentials (10,000 unit/gün ücretsiz)."
    });
  });
}
