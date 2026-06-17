export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface PremiumTheme {
  id: string;
  name: string;
  light?: ThemeColors;
  dark: ThemeColors;
  darkOnly?: boolean;
}

export const PREMIUM_THEMES: PremiumTheme[] = [
  // DEFAULT — Cyan/Blue (sharp electric blue, refined)
  {
    id: 'default',
    name: 'Default',
    dark: {
      background: '220 18% 6%',
      foreground: '60 9% 96%',
      card: '220 16% 9%',
      cardForeground: '60 9% 96%',
      popover: '220 18% 6%',
      popoverForeground: '60 9% 96%',
      primary: '217 100% 68%',
      primaryForeground: '220 18% 6%',
      secondary: '220 14% 14%',
      secondaryForeground: '60 9% 96%',
      muted: '220 14% 14%',
      mutedForeground: '60 5% 58%',
      accent: '217 100% 68%',
      accentForeground: '220 18% 6%',
      destructive: '0 72% 50%',
      destructiveForeground: '60 9% 96%',
      border: '220 14% 16%',
      input: '220 14% 16%',
      ring: '217 100% 68%',
    },
    light: {
      background: '60 9% 97%',
      foreground: '220 18% 7%',
      card: '60 9% 99%',
      cardForeground: '220 18% 7%',
      popover: '60 9% 99%',
      popoverForeground: '220 18% 7%',
      primary: '220 100% 50%',
      primaryForeground: '0 0% 100%',
      secondary: '60 9% 93%',
      secondaryForeground: '220 18% 7%',
      muted: '60 9% 93%',
      mutedForeground: '60 5% 40%',
      accent: '220 100% 50%',
      accentForeground: '0 0% 100%',
      destructive: '0 72% 50%',
      destructiveForeground: '0 0% 100%',
      border: '60 9% 88%',
      input: '60 9% 88%',
      ring: '220 100% 50%',
    },
  },
  {
    id: 'nebula',
    name: 'Nebula',
    dark: {
      background: '265 50% 8%',
      foreground: '270 30% 93%',
      card: '265 45% 11%',
      cardForeground: '270 30% 93%',
      popover: '265 50% 8%',
      popoverForeground: '270 30% 93%',
      primary: '265 89% 78%',
      primaryForeground: '265 50% 8%',
      secondary: '265 40% 16%',
      secondaryForeground: '270 30% 93%',
      muted: '265 40% 16%',
      mutedForeground: '270 15% 70%',
      accent: '265 89% 78%',
      accentForeground: '265 50% 8%',
      destructive: '0 72% 50%',
      destructiveForeground: '270 30% 93%',
      border: '265 35% 18%',
      input: '265 35% 18%',
      ring: '265 89% 78%',
    },
    light: {
      background: '270 50% 98%',
      foreground: '270 60% 12%',
      card: '0 0% 100%',
      cardForeground: '270 60% 12%',
      popover: '0 0% 100%',
      popoverForeground: '270 60% 12%',
      primary: '262 83% 58%',
      primaryForeground: '0 0% 100%',
      secondary: '270 50% 94%',
      secondaryForeground: '270 60% 12%',
      muted: '270 50% 94%',
      mutedForeground: '270 20% 42%',
      accent: '262 83% 58%',
      accentForeground: '0 0% 100%',
      destructive: '0 72% 50%',
      destructiveForeground: '0 0% 100%',
      border: '270 30% 90%',
      input: '270 30% 90%',
      ring: '262 83% 58%',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    dark: {
      background: '140 35% 5%',
      foreground: '40 35% 90%',
      card: '140 30% 8%',
      cardForeground: '40 35% 90%',
      popover: '140 35% 5%',
      popoverForeground: '40 35% 90%',
      primary: '142 76% 48%',
      primaryForeground: '140 35% 5%',
      secondary: '140 25% 12%',
      secondaryForeground: '40 35% 90%',
      muted: '140 25% 12%',
      mutedForeground: '40 10% 60%',
      accent: '142 76% 48%',
      accentForeground: '140 35% 5%',
      destructive: '0 72% 50%',
      destructiveForeground: '40 35% 90%',
      border: '140 25% 14%',
      input: '140 25% 14%',
      ring: '142 76% 48%',
    },
    light: {
      background: '40 25% 95%',
      foreground: '140 35% 8%',
      card: '0 0% 100%',
      cardForeground: '140 35% 8%',
      popover: '0 0% 100%',
      popoverForeground: '140 35% 8%',
      primary: '142 71% 30%',
      primaryForeground: '0 0% 100%',
      secondary: '40 25% 90%',
      secondaryForeground: '140 35% 8%',
      muted: '40 25% 90%',
      mutedForeground: '140 15% 38%',
      accent: '142 71% 30%',
      accentForeground: '0 0% 100%',
      destructive: '0 72% 50%',
      destructiveForeground: '0 0% 100%',
      border: '40 20% 84%',
      input: '40 20% 84%',
      ring: '142 71% 30%',
    },
  },
  {
    id: 'corporate',
    name: 'Corporate',
    dark: {
      background: '220 8% 6%',
      foreground: '40 12% 92%',
      card: '220 8% 9%',
      cardForeground: '40 12% 92%',
      popover: '220 8% 6%',
      popoverForeground: '40 12% 92%',
      primary: '0 73% 57%',
      primaryForeground: '40 12% 92%',
      secondary: '220 6% 14%',
      secondaryForeground: '40 12% 92%',
      muted: '220 6% 14%',
      mutedForeground: '40 5% 60%',
      accent: '0 73% 57%',
      accentForeground: '40 12% 92%',
      destructive: '0 72% 50%',
      destructiveForeground: '40 12% 92%',
      border: '220 6% 16%',
      input: '220 6% 16%',
      ring: '0 73% 57%',
    },
    light: {
      background: '40 10% 96%',
      foreground: '220 8% 8%',
      card: '0 0% 100%',
      cardForeground: '220 8% 8%',
      popover: '0 0% 100%',
      popoverForeground: '220 8% 8%',
      primary: '0 73% 50%',
      primaryForeground: '0 0% 100%',
      secondary: '40 10% 92%',
      secondaryForeground: '220 8% 8%',
      muted: '40 10% 92%',
      mutedForeground: '220 5% 40%',
      accent: '0 73% 50%',
      accentForeground: '0 0% 100%',
      destructive: '0 72% 50%',
      destructiveForeground: '0 0% 100%',
      border: '40 10% 86%',
      input: '40 10% 86%',
      ring: '0 73% 50%',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    dark: {
      background: '220 30% 4%',
      foreground: '42 60% 90%',
      card: '220 30% 7%',
      cardForeground: '42 60% 90%',
      popover: '220 30% 4%',
      popoverForeground: '42 60% 90%',
      primary: '43 75% 52%',
      primaryForeground: '220 30% 4%',
      secondary: '220 25% 11%',
      secondaryForeground: '42 60% 90%',
      muted: '220 25% 11%',
      mutedForeground: '42 20% 65%',
      accent: '43 75% 52%',
      accentForeground: '220 30% 4%',
      destructive: '0 72% 50%',
      destructiveForeground: '42 60% 90%',
      border: '220 25% 13%',
      input: '220 25% 13%',
      ring: '43 75% 52%',
    },
    light: {
      background: '42 60% 96%',
      foreground: '220 30% 7%',
      card: '0 0% 100%',
      cardForeground: '220 30% 7%',
      popover: '0 0% 100%',
      popoverForeground: '220 30% 7%',
      primary: '32 55% 42%',
      primaryForeground: '0 0% 100%',
      secondary: '42 60% 92%',
      secondaryForeground: '220 30% 7%',
      muted: '42 60% 92%',
      mutedForeground: '220 15% 40%',
      accent: '32 55% 42%',
      accentForeground: '0 0% 100%',
      destructive: '0 72% 50%',
      destructiveForeground: '0 0% 100%',
      border: '42 50% 84%',
      input: '42 50% 84%',
      ring: '32 55% 42%',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    dark: {
      background: '18 50% 6%',
      foreground: '30 75% 86%',
      card: '18 45% 9%',
      cardForeground: '30 75% 86%',
      popover: '18 50% 6%',
      popoverForeground: '30 75% 86%',
      primary: '16 88% 48%',
      primaryForeground: '18 50% 6%',
      secondary: '18 40% 14%',
      secondaryForeground: '30 75% 86%',
      muted: '18 40% 14%',
      mutedForeground: '30 25% 65%',
      accent: '16 88% 48%',
      accentForeground: '18 50% 6%',
      destructive: '0 72% 50%',
      destructiveForeground: '30 75% 86%',
      border: '18 40% 16%',
      input: '18 40% 16%',
      ring: '16 88% 48%',
    },
    light: {
      background: '30 60% 95%',
      foreground: '18 50% 8%',
      card: '0 0% 100%',
      cardForeground: '18 50% 8%',
      popover: '0 0% 100%',
      popoverForeground: '18 50% 8%',
      primary: '16 88% 38%',
      primaryForeground: '0 0% 100%',
      secondary: '30 60% 90%',
      secondaryForeground: '18 50% 8%',
      muted: '30 60% 90%',
      mutedForeground: '18 25% 38%',
      accent: '16 88% 38%',
      accentForeground: '0 0% 100%',
      destructive: '0 72% 50%',
      destructiveForeground: '0 0% 100%',
      border: '30 50% 84%',
      input: '30 50% 84%',
      ring: '16 88% 38%',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    dark: {
      background: '200 50% 6%',
      foreground: '195 25% 92%',
      card: '200 45% 9%',
      cardForeground: '195 25% 92%',
      popover: '200 50% 6%',
      popoverForeground: '195 25% 92%',
      primary: '188 86% 53%',
      primaryForeground: '200 50% 6%',
      secondary: '200 40% 14%',
      secondaryForeground: '195 25% 92%',
      muted: '200 40% 14%',
      mutedForeground: '195 15% 65%',
      accent: '188 86% 53%',
      accentForeground: '200 50% 6%',
      destructive: '0 72% 50%',
      destructiveForeground: '195 25% 92%',
      border: '200 40% 16%',
      input: '200 40% 16%',
      ring: '188 86% 53%',
    },
    light: {
      background: '200 35% 96%',
      foreground: '200 50% 8%',
      card: '0 0% 100%',
      cardForeground: '200 50% 8%',
      popover: '0 0% 100%',
      popoverForeground: '200 50% 8%',
      primary: '189 85% 32%',
      primaryForeground: '0 0% 100%',
      secondary: '200 35% 92%',
      secondaryForeground: '200 50% 8%',
      muted: '200 35% 92%',
      mutedForeground: '200 25% 38%',
      accent: '189 85% 32%',
      accentForeground: '0 0% 100%',
      destructive: '0 72% 50%',
      destructiveForeground: '0 0% 100%',
      border: '200 30% 86%',
      input: '200 30% 86%',
      ring: '189 85% 32%',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    dark: {
      background: '270 60% 6%',
      foreground: '320 100% 88%',
      card: '270 55% 10%',
      cardForeground: '320 100% 88%',
      popover: '270 60% 6%',
      popoverForeground: '320 100% 88%',
      primary: '332 100% 58%',
      primaryForeground: '270 60% 6%',
      secondary: '270 45% 14%',
      secondaryForeground: '320 100% 88%',
      muted: '270 45% 14%',
      mutedForeground: '320 30% 70%',
      accent: '332 100% 58%',
      accentForeground: '270 60% 6%',
      destructive: '0 80% 50%',
      destructiveForeground: '320 100% 88%',
      border: '320 50% 20%',
      input: '320 50% 18%',
      ring: '332 100% 58%',
    },
    light: {
      background: '320 50% 97%',
      foreground: '270 60% 10%',
      card: '0 0% 100%',
      cardForeground: '270 60% 10%',
      popover: '0 0% 100%',
      popoverForeground: '270 60% 10%',
      primary: '300 70% 50%',
      primaryForeground: '0 0% 100%',
      secondary: '320 50% 94%',
      secondaryForeground: '270 60% 10%',
      muted: '320 50% 94%',
      mutedForeground: '270 30% 40%',
      accent: '300 70% 50%',
      accentForeground: '0 0% 100%',
      destructive: '0 80% 50%',
      destructiveForeground: '0 0% 100%',
      border: '320 40% 90%',
      input: '320 40% 90%',
      ring: '300 70% 50%',
    },
  },
  {
    id: 'matrix',
    name: 'Matrix',
    darkOnly: true,
    dark: {
      background: '135 100% 0%',
      foreground: '135 100% 50%',
      card: '135 100% 2%',
      cardForeground: '135 100% 50%',
      popover: '135 100% 0%',
      popoverForeground: '135 100% 50%',
      primary: '135 100% 50%',
      primaryForeground: '0 0% 0%',
      secondary: '135 80% 6%',
      secondaryForeground: '135 100% 50%',
      muted: '135 80% 6%',
      mutedForeground: '135 60% 30%',
      accent: '135 100% 50%',
      accentForeground: '0 0% 0%',
      destructive: '0 80% 45%',
      destructiveForeground: '0 0% 100%',
      border: '135 80% 10%',
      input: '135 80% 10%',
      ring: '135 100% 50%',
    },
  },
];

export function generateThemesCss(): string {
  let css = '';
  for (const theme of PREMIUM_THEMES) {
    if (theme.light) {
      css += `
        .theme-${theme.id} {
          --background: ${theme.light.background};
          --foreground: ${theme.light.foreground};
          --card: ${theme.light.card};
          --card-foreground: ${theme.light.cardForeground};
          --popover: ${theme.light.popover};
          --popover-foreground: ${theme.light.popoverForeground};
          --primary: ${theme.light.primary};
          --primary-foreground: ${theme.light.primaryForeground};
          --secondary: ${theme.light.secondary};
          --secondary-foreground: ${theme.light.secondaryForeground};
          --muted: ${theme.light.muted};
          --muted-foreground: ${theme.light.mutedForeground};
          --accent: ${theme.light.accent};
          --accent-foreground: ${theme.light.accentForeground};
          --destructive: ${theme.light.destructive};
          --destructive-foreground: ${theme.light.destructiveForeground};
          --border: ${theme.light.border};
          --input: ${theme.light.input};
          --ring: ${theme.light.ring};
          --cyan: ${theme.light.primary};
          --cyan-foreground: ${theme.light.primaryForeground};
        }
      `;
    }
    const darkSelector = theme.darkOnly ? `.theme-${theme.id}` : `.dark.theme-${theme.id}`;
    css += `
      ${darkSelector} {
        --background: ${theme.dark.background};
        --foreground: ${theme.dark.foreground};
        --card: ${theme.dark.card};
        --card-foreground: ${theme.dark.cardForeground};
        --popover: ${theme.dark.popover};
        --popover-foreground: ${theme.dark.popoverForeground};
        --primary: ${theme.dark.primary};
        --primary-foreground: ${theme.dark.primaryForeground};
        --secondary: ${theme.dark.secondary};
        --secondary-foreground: ${theme.dark.secondaryForeground};
        --muted: ${theme.dark.muted};
        --muted-foreground: ${theme.dark.mutedForeground};
        --accent: ${theme.dark.accent};
        --accent-foreground: ${theme.dark.accentForeground};
        --destructive: ${theme.dark.destructive};
        --destructive-foreground: ${theme.dark.destructiveForeground};
        --border: ${theme.dark.border};
        --input: ${theme.dark.input};
        --ring: ${theme.dark.ring};
        --cyan: ${theme.dark.primary};
        --cyan-foreground: ${theme.dark.primaryForeground};
      }
    `;
  }
  return css;
}
