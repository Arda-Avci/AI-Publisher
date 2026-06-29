import { Logger } from '../lib/logger.js';

export interface EnhancedPrompt {
  masterPrompt: string;
  productionNotes: string;
  sceneStructure?: 'hook_body_loop' | 'narrative_arc';
  constraints: string[];
}

export interface ShortFormConfig {
  maxDurationSec: number;
  hookStrategy: 'scale_shock' | 'question' | 'bold_claim' | 'visual_tease';
  retentionTactics: string[];
  loopRequired: boolean;
}

function buildShortStructurePrompt(durationSeconds: number, loopRequired: boolean): string {
  const maxDur = Math.min(durationSeconds, 60);
  const bodyStart = 3;
  const loopStart = Math.max(maxDur - 5, bodyStart + 1);
  const minDur = 20;
  const effectiveMin = maxDur < minDur ? maxDur : minDur;
  const loopSection = loopRequired ? `
3. LOOP (${loopStart}-${maxDur}sn): Last line MUST connect seamlessly to first line:
   - End sentence fragment that completes when video loops back to start
   - Audio crossfade: end music matches start music
   - Visual match: last frame composition similar to first frame
` : '';
  return `IMPORTANT — SHORT FORM VIDEO STRUCTURE:
This is a short-form video (max ${maxDur} seconds). Follow these rules STRICTLY:

1. HOOK (0-3sn): First scene MUST grab attention immediately. Use ONE of:
   - Scale shock: extreme close-up zoom to 150-200%, then settle to normal frame
   - Bold text overlay with provocative claim/question
   - Unexpected visual movement or transition
   - Bright color flash or subtle glitch effect on first frame

2. BODY (3-${loopStart}sn): Maintain retention with:
   - Scene changes every 3-5 seconds minimum
   - Dynamic motion in every frame (no static shots longer than 2s)
   - Kinetic subtitles: key words highlighted in neon yellow/cyan
   - B-roll overlays supporting spoken content
   - Sound effects at each scene transition (woosh, pop, impact)
${loopSection}
4. TECHNICAL:
   - Total duration: EXACTLY ${effectiveMin}-${maxDur} seconds (distribute evenly)
   - Aspect ratio: 9:16 vertical (1080x1920)
   - Max 8-12 scenes
   - Fast pacing: average scene 4-7 seconds
   - No slow builds, no long pauses, no silence over 0.5s`;
}

export function enhanceShortFormPrompt(
  masterPrompt: string,
  productionNotes: string,
  config?: Partial<ShortFormConfig>,
): EnhancedPrompt {
  const cfg: ShortFormConfig = {
    maxDurationSec: config?.maxDurationSec ?? 60,
    hookStrategy: config?.hookStrategy ?? 'scale_shock',
    retentionTactics: config?.retentionTactics ?? [
      'kinetic subtitles',
      'scene change every 4s',
      'sound effects per transition',
    ],
    loopRequired: config?.loopRequired ?? true,
  };

  const constraints: string[] = [
    `Total video duration: max ${cfg.maxDurationSec} seconds`,
    `Hook strategy: ${cfg.hookStrategy} — first 0.5s MUST ${cfg.hookStrategy === 'scale_shock' ? 'zoom to 150-200% close-up then settle' : cfg.hookStrategy === 'question' ? 'display a provocative question in bold text' : cfg.hookStrategy === 'bold_claim' ? 'display a bold contrarian claim' : 'show a visually striking teaser image'}`,
    ...cfg.retentionTactics.map(t => `Retention: ${t}`),
  ];

  if (cfg.loopRequired) {
    constraints.push('Seamless loop: last sentence MUST grammatically connect to first sentence');
    constraints.push('Audio crossfade between end and beginning');
  }

  const structurePrompt = buildShortStructurePrompt(cfg.maxDurationSec, cfg.loopRequired);
  const enhancedPrompt = `${masterPrompt}\n\n${structurePrompt}`;
  const enhancedNotes = productionNotes
    ? `${productionNotes}\n\nShort-form constraints:\n${constraints.map(c => `- ${c}`).join('\n')}`
    : `Short-form constraints:\n${constraints.map(c => `- ${c}`).join('\n')}`;

  Logger.info('[PromptEnhancer] Short form enhanced:', {
    hook: cfg.hookStrategy,
    loop: cfg.loopRequired,
    constraints: constraints.length,
  });

  return {
    masterPrompt: enhancedPrompt,
    productionNotes: enhancedNotes,
    sceneStructure: 'hook_body_loop',
    constraints,
  };
}

export function enhanceFilmPrompt(
  masterPrompt: string,
  productionNotes: string,
): EnhancedPrompt {
  const constraints: string[] = [
    'Cultural dialogue: ensure dialog matches regional speech patterns and idioms',
    'Subtext: every line should carry emotional subtext beneath the surface meaning',
    'DoP lighting: describe key/fill/backlight setup, motivated light sources, color temperature',
    'Scene blocking: character staging, camera distance, lens choice per emotional beat',
  ];

  const filmPrompt = `${masterPrompt}\n\nCINEMATIC ENHANCEMENTS:\n${constraints.map(c => `- ${c}`).join('\n')}`;

  return {
    masterPrompt: filmPrompt,
    productionNotes: productionNotes ? `${productionNotes}\n\n${constraints.join('\n')}` : constraints.join('\n'),
    sceneStructure: 'narrative_arc',
    constraints,
  };
}

export function getShortFormConfig(videoDurationSec?: number): ShortFormConfig {
  const dur = videoDurationSec ?? 60;
  return {
    maxDurationSec: Math.min(dur, 60),
    hookStrategy: 'scale_shock',
    retentionTactics: [
      'kinetic subtitles with neon yellow highlighting on trigger words',
      'scene change every 3-5 seconds',
      'sound effects (woosh/pop) at each transition',
      'B-roll overlay every 4 seconds',
      'trigger words in bold colored text',
    ],
    loopRequired: true,
  };
}
