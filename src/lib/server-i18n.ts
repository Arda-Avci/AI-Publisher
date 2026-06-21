import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger.js';

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
    Logger.error('[i18n] Failed to load locale files', err);
  }
}

export function t(
  key: string,
  lang: 'tr' | 'en' = 'tr',
  params?: Record<string, string | number>,
): string {
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
  DOCKER_STARTING: 'stageDockerStarting',
  DOCKER_VERIFYING: 'stageDockerProgress',
  COVER_SYNTHESIS: 'stageCoverSynthesis',
  SCENE_GENERATING: 'stageSceneGenerating',
  AUTO_CUT: 'stageAutoCut',
  COLOR_GRADE: 'stageColorGrade',
  SPLIT_SCREEN: 'stageSplitScreen',
  MUSETALK: 'stageMuseTalk',
  SHORTS_CONVERSION: 'stageShortsConversion',
  DUBBING: 'stageDubbing',
  BEAT_SYNC: 'stageBeatSync',
  KINETIC_SUBTITLE: 'stageKineticSubtitle',
  STUDIO_SOUND: 'stageStudioSound',
  EYE_CONTACT: 'stageEyeContact',
  SMART_REFRAME: 'stageSmartReframe',
  INPAINT: 'stageInpaint',
  VIRAL_HOOK: 'stageViralHook',
  BROLL_INSERT: 'stageBrollInsert',
  EMOTION_CAPTION: 'stageEmotionCaption',
  COMPLETED: 'stageCompleted',
  CANCELLED: 'stageCancelled',
  ERROR: 'stageError',
} as const;

export type StageKey = (typeof STAGE_KEYS)[keyof typeof STAGE_KEYS];
