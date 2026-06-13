import fs from 'fs-extra';
import path from 'path';

let trMessages: Record<string, string> = {};
let enMessages: Record<string, string> = {};
let loaded = false;

export function loadServerTranslations() {
  if (loaded) return;
  try {
    const base = path.join(process.cwd(), 'src', 'locales');
    trMessages = fs.readJsonSync(path.join(base, 'tr.json'));
    enMessages = fs.readJsonSync(path.join(base, 'en.json'));
    loaded = true;
  } catch (err) {
    console.error('[i18n] Failed to load locale files:', err);
  }
}

export function t(key: string, lang: 'tr' | 'en' = 'tr', params?: Record<string, string | number>): string {
  loadServerTranslations();
  const messages = lang === 'tr' ? trMessages : enMessages;
  let text = messages[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), String(v));
    }
  }
  return text;
}

export const STAGE_KEYS = {
  DIRECTOR_PLANNING: 'stageDirectorPlanning',
  SCENES_PREPARING: 'stageScenesPreparing',
  COLAB_STARTING: 'stageColabStarting',
  COLAB_VERIFYING: 'stageColabProgress',
  COVER_SYNTHESIS: 'stageCoverSynthesis',
  SCENE_GENERATING: 'stageSceneGenerating',
  SHORTS_CONVERSION: 'stageShortsConversion',
  COMPLETED: 'stageCompleted',
  CANCELLED: 'stageCancelled',
  ERROR: 'stageError',
} as const;

export type StageKey = typeof STAGE_KEYS[keyof typeof STAGE_KEYS];
