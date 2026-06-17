import { Application, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { chromium, Browser } from 'playwright';
import { Logger } from '../lib/logger.js';
import { loadServerTranslations, t } from '../lib/server-i18n.js';

export const AUTH_FILE_MAP: Record<string, string> = {
  youtube: 'auth_youtube.json',
  tiktok: 'auth_tiktok.json',
  x: 'auth_x.json',
  meta: 'auth_meta.json',
};

const LOGIN_URLS: Record<string, string> = {
  youtube: 'https://studio.youtube.com',
  tiktok: 'https://www.tiktok.com/login',
  x: 'https://x.com/i/flow/login',
  meta: 'https://business.facebook.com/latest/reels_composer',
};

const PLATFORM_KEYS: Record<string, string> = {
  youtube: 'authPlatformYoutube',
  tiktok: 'authPlatformTiktok',
  x: 'authPlatformX',
  meta: 'authPlatformMeta',
};

function isValidPlatform(p: string): p is keyof typeof AUTH_FILE_MAP {
  return p in AUTH_FILE_MAP;
}

function tt(key: string, lang: 'tr' | 'en', params?: Record<string, string>): string {
  return t(key, lang, params);
}

/**
 * Saves browser authentication state to a JSON file after user manually logs in.
 */
async function saveAuthSession(
  platform: keyof typeof AUTH_FILE_MAP,
  lang: 'tr' | 'en',
  browser: Browser,
): Promise<void> {
  const authFile = AUTH_FILE_MAP[platform];
  const authPath = path.join(process.cwd(), authFile);

  const contexts = browser.contexts();
  const authContext = contexts[0];

  if (!authContext) {
    throw new Error(tt('authNoContext', lang));
  }

  await authContext.storageState({ path: authPath });
  Logger.info(`[Auth] ${tt('authSaved', lang, { platform })}`);
}

/**
 * Verifies that a saved auth file is valid by checking it exists and is valid JSON.
 */
async function verifyAuthFile(
  platform: keyof typeof AUTH_FILE_MAP,
): Promise<{ valid: boolean; errorKey?: string }> {
  const authFile = AUTH_FILE_MAP[platform];
  const authPath = path.join(process.cwd(), authFile);

  if (!(await fs.pathExists(authPath))) {
    return { valid: false, errorKey: 'authNotFound' };
  }

  try {
    const content = await fs.readJson(authPath);
    if (!content || !content.cookies || !Array.isArray(content.cookies)) {
      return { valid: false, errorKey: 'authInvalidFormat' };
    }
    if (content.cookies.length === 0) {
      return { valid: false, errorKey: 'authNoCookies' };
    }
    return { valid: true };
  } catch {
    return { valid: false, errorKey: 'authNotJson' };
  }
}

/**
 * GET /auth-status/:platform
 * Returns whether the auth file exists and is valid.
 */
async function handleAuthStatus(req: Request, res: Response) {
  const platform = req.params.platform as string;
  const lang = (req.lang || 'tr') as 'tr' | 'en';

  if (!isValidPlatform(platform)) {
    return res.status(400).json({ success: false, error: tt('authInvalidPlatform', lang) });
  }

  const result = await verifyAuthFile(platform);
  const authFile = AUTH_FILE_MAP[platform];

  return res.json({
    success: true,
    platform,
    authFile,
    configured: result.valid,
    error: result.errorKey ? tt(result.errorKey, lang) : null,
  });
}

/**
 * POST /auth-setup/:platform
 *
 * Opens a non-headless browser for the user to manually log in.
 * Login is detected via navigation or DOM change, then session is auto-saved.
 */
async function handleAuthSetup(req: Request, res: Response) {
  const platform = req.params.platform as string;
  const lang = (req.lang || 'tr') as 'tr' | 'en';

  if (!isValidPlatform(platform)) {
    return res.status(400).json({ success: false, error: tt('authInvalidPlatform', lang) });
  }

  const authFile = AUTH_FILE_MAP[platform];
  const authPath = path.join(process.cwd(), authFile);
  const platformLabel = tt(PLATFORM_KEYS[platform], lang);

  // Clean up any existing invalid auth file
  if (await fs.pathExists(authPath)) {
    const result = await verifyAuthFile(platform);
    if (!result.valid) {
      await fs.remove(authPath);
    }
  }

  const loginUrl = LOGIN_URLS[platform];

  Logger.info(`[Auth] Launching browser for ${platform} login. URL: ${loginUrl}`);

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
    });

    const context = await browser.newContext({
      acceptDownloads: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 0 });

    // Expose a function the page can call when login succeeds
    const browserRef = browser;
    await page.exposeFunction('__authSaveSuccess', async () => {
      try {
        if (browserRef && browserRef.isConnected()) {
          await saveAuthSession(platform, lang, browserRef);
        }
      } catch (err: any) {
        Logger.error(`[Auth] ${tt('authSaveFailed', lang, { platform, error: err.message })}`);
      }
    });

    // Detect login via post-login navigation
    const postLoginUrls: Record<string, string[]> = {
      youtube: ['studio.youtube.com', 'www.youtube.com/upload'],
      tiktok: ['creator.tiktok.com', 'www.tiktok.com/upload'],
      x: ['x.com/home', 'twitter.com/home'],
      meta: ['business.facebook.com', 'www.facebook.com'],
    };

    const successPatterns = postLoginUrls[platform] || [];

    page.on('framenavigated', async (frame) => {
      try {
        const url = frame.url();
        if (successPatterns.some((p) => url.includes(p))) {
          Logger.info(`[Auth] ${platform} login detected at: ${url}`);
          await new Promise((r) => setTimeout(r, 2000));
          await (page as any).__authSaveSuccess?.();
        }
      } catch (err) {
        Logger.warn(`[Auth] Frame nav error: ${err}`);
      }
    });

    // Also detect via logged-in DOM indicators
    const loggedInSelectors: Record<string, string[]> = {
      youtube: ['#avatar-btn', '#yt-core-sticky-avater', '[aria-label="Avatar"]'],
      tiktok: ['[data-e2e="upload-icon"]', '.upload-title'],
      x: ['[aria-label="Account menu"]', '[href="/home"]'],
      meta: ['[aria-label="Facebook"]', '.sideNavContent'],
    };

    const selectors = loggedInSelectors[platform] || [];
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { state: 'visible', timeout: 120000 });
        Logger.info(`[Auth] ${platform} login confirmed via selector: ${selector}`);
        await new Promise((r) => setTimeout(r, 2000));
        await (page as any).__authSaveSuccess?.();
        break;
      } catch {
        /* try next selector */
      }
    }

    return res.json({
      success: true,
      platform,
      authFile,
      message: tt('authBrowserOpened', lang, { platform: platformLabel }),
      loginUrl,
    });
  } catch (err: any) {
    Logger.error(`[Auth] ${tt('authSetupFailed', lang, { platform, error: err.message })}`);
    if (browser) await browser.close().catch(() => {});
    return res
      .status(500)
      .json({ success: false, error: tt('authLoginError', lang, { error: err.message }) });
  }
}

/**
 * DELETE /auth-setup/:platform
 * Removes the stored auth file for re-authentication.
 */
async function handleAuthRemove(req: Request, res: Response) {
  const platform = req.params.platform as string;
  const lang = (req.lang || 'tr') as 'tr' | 'en';

  if (!isValidPlatform(platform)) {
    return res.status(400).json({ success: false, error: tt('authInvalidPlatform', lang) });
  }

  const authFile = AUTH_FILE_MAP[platform];
  const authPath = path.join(process.cwd(), authFile);
  const platformLabel = tt(PLATFORM_KEYS[platform], lang);

  if (await fs.pathExists(authPath)) {
    await fs.remove(authPath);
    Logger.info(`[Auth] Removed ${authFile}`);
  }

  return res.json({
    success: true,
    platform,
    message: tt('authRemoved', lang, { platform: platformLabel }),
  });
}

export function registerAuthSetupRoutes(app: Application): void {
  // Ensure translations are loaded on first request
  loadServerTranslations();

  app.get('/auth-status/:platform', async (req: Request, res: Response) => {
    await handleAuthStatus(req, res);
  });

  app.post('/auth-setup/:platform', async (req: Request, res: Response) => {
    await handleAuthSetup(req, res);
  });

  app.delete('/auth-setup/:platform', async (req: Request, res: Response) => {
    await handleAuthRemove(req, res);
  });
}
