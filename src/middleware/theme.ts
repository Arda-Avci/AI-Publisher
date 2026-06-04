import { Request, Response, NextFunction } from 'express';
import { PREMIUM_THEMES, PremiumTheme, generateThemesCss } from '../lib/themes.js';
import { db } from '../db.js';

// Extend Express Request interface to include theme information
declare global {
  namespace Express {
    interface Request {
      theme: string;
      isDark: boolean;
      themeStyles: string;
    }
  }
}

export async function themeMiddleware(req: Request, res: Response, next: NextFunction) {
  let themeId = 'default';
  let isDark = true; // default dark for this premium AI studio interface

  // 1. Resolve from query parameters
  if (typeof req.query.theme === 'string') {
    themeId = req.query.theme;
    if (req.session) {
      (req.session as any).theme = themeId;
    }
  }
  // 2. Resolve from session
  else if (req.session && (req.session as any).theme) {
    themeId = (req.session as any).theme;
  }
  // 3. Resolve from DB if logged in
  else if (req.session && (req.session as any).userId) {
    try {
      const user = await db.get('SELECT selected_theme FROM users WHERE id = ?', [(req.session as any).userId]);
      if (user && user.selected_theme) {
        themeId = user.selected_theme;
        (req.session as any).theme = themeId;
      }
    } catch (err) {
      // Ignored
    }
  }

  // Also check light/dark mode preference if any
  if (req.query.mode === 'light') {
    isDark = false;
    if (req.session) (req.session as any).isDark = false;
  } else if (req.query.mode === 'dark') {
    isDark = true;
    if (req.session) (req.session as any).isDark = true;
  } else if (req.session && (req.session as any).isDark !== undefined) {
    isDark = (req.session as any).isDark;
  }

  // Save changes to DB if user is logged in and parameters were passed
  if (req.session && (req.session as any).userId && req.query.theme) {
    try {
      await db.run('UPDATE users SET selected_theme = ? WHERE id = ?', [themeId, (req.session as any).userId]);
    } catch (err) {
      // Ignored
    }
  }

  // Find the selected theme
  const selectedTheme = PREMIUM_THEMES.find(t => t.id === themeId) || PREMIUM_THEMES.find(t => t.id === 'default') || PREMIUM_THEMES[0];
  
  // Build dynamic styles injecting to :root or .theme-x
  const colors = (isDark ? selectedTheme.dark : (selectedTheme.light || selectedTheme.dark));

  const themeCssVariables = `
    :root {
      --background: ${colors.background};
      --foreground: ${colors.foreground};
      --card: ${colors.card};
      --card-foreground: ${colors.cardForeground};
      --popover: ${colors.popover};
      --popover-foreground: ${colors.popoverForeground};
      --primary: ${colors.primary};
      --primary-foreground: ${colors.primaryForeground};
      --secondary: ${colors.secondary};
      --secondary-foreground: ${colors.secondaryForeground};
      --muted: ${colors.muted};
      --muted-foreground: ${colors.mutedForeground};
      --accent: ${colors.accent};
      --accent-foreground: ${colors.accentForeground};
      --destructive: ${colors.destructive};
      --destructive-foreground: ${colors.destructiveForeground};
      --border: ${colors.border};
      --input: ${colors.input};
      --ring: ${colors.ring};
      --cyan: ${colors.primary};
      --cyan-foreground: ${colors.primaryForeground};
      --radius: 0.75rem;
      --surface-glass: hsla(${colors.background.split(' ')[0]}, 30%, 8%, 0.6);
    }
    
    ${generateThemesCss()}
  `;

  req.theme = themeId;
  req.isDark = isDark;
  req.themeStyles = themeCssVariables;

  res.locals.theme = themeId;
  res.locals.isDark = isDark;
  res.locals.themeStyles = themeCssVariables;
  res.locals.themesList = PREMIUM_THEMES;

  next();
}
export default themeMiddleware;
