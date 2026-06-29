import { Logger } from '../../lib/logger.js';
import { runStoryboardAgent } from '../storyboardAgent/storyboardAgent.js';
import { injectCharacterReferences, CharacterRefResult } from './characterReferenceService.js';
import { suggestNarrativeDevice } from './narrativeDeviceAgent.js';
import { suggestTimeStructure } from './timeStructureAgent.js';
import { designTransitions } from './transitionDesignerAgent.js';

export interface FilmStoryboardResult {
  scenes: {
    sceneNumber: number;
    videoPrompt: string;
    speechText: string;
    sfxPrompt: string;
    cameraMotion: string;
    speaker: string;
  }[];
  marketing: {
    ytTitle: string;
    ytDesc: string;
    ytTags: string;
    ttDesc: string;
    ttTags: string;
    xDesc: string;
    xTags: string;
    metaDesc: string;
    metaTags: string;
  };
  narrativeDevice?: {
    device: string;
    description: string;
    impact: string;
  } | null;
  timeStructure?: {
    structure: string;
    audienceEffect: string;
    justification: string;
  } | null;
  transitions?: {
    transitions: { fromScene: number; toScene: number; type: string; durationFrames: number }[];
    overallRhythm: string;
  } | null;
}

export async function runFilmStoryboard(
  job: any,
  onProgress?: (stage: string, pct: number) => void,
): Promise<FilmStoryboardResult> {
  onProgress?.('film_storyboard_start', 5);
  Logger.info('[FilmStoryboard] Starting film/dizi mode storyboard...', {
    jobId: job.id,
    mode: job.production_mode,
  });

  const masterPrompt = job.master_prompt || '';
  const sceneCount = job.total_scenes || 8;

  // Phase 1: Narrative analysis (non-blocking on failure)
  let narrativeDeviceInfo: Awaited<ReturnType<typeof suggestNarrativeDevice>> | null = null;
  let timeStructureInfo: Awaited<ReturnType<typeof suggestTimeStructure>> | null = null;
  try {
    narrativeDeviceInfo = await suggestNarrativeDevice(masterPrompt);
  } catch (err) {
    Logger.warn('[FilmStoryboard] Narrative device suggestion failed, skipping:', err);
  }
  try {
    timeStructureInfo = await suggestTimeStructure(masterPrompt, sceneCount);
  } catch (err) {
    Logger.warn('[FilmStoryboard] Time structure suggestion failed, skipping:', err);
  }

  // Inject narrative context into production notes
  let enhancedNotes = job.production_notes || '';
  if (narrativeDeviceInfo) {
    enhancedNotes += `\n\nNARRATIVE DEVICE: ${narrativeDeviceInfo.device}
- Implementation: ${narrativeDeviceInfo.description}
- Integration: ${narrativeDeviceInfo.integrationNotes.join('; ')}
- Scene placement: ${narrativeDeviceInfo.scenePlacement.join(', ')}
- Impact: ${narrativeDeviceInfo.impact}`;
  }
  if (timeStructureInfo) {
    enhancedNotes += `\n\nTIME STRUCTURE: ${timeStructureInfo.structure}
- Sequence: ${timeStructureInfo.sequence.map(s => `Scene ${s.sceneNumber}: ${s.narrativeTime} — ${s.description}`).join(' | ')}
- Audience effect: ${timeStructureInfo.audienceEffect}
- Justification: ${timeStructureInfo.justification}`;
  }

  const sbResult = await runStoryboardAgent(
    {
      masterPrompt,
      productionNotes: enhancedNotes,
      characterFeatures: job.character_features,
      targetLanguage: 'tr',
      sceneCount,
    },
    (stage, pct) => {
      onProgress?.(`film_storyboard_${stage}`, 5 + Math.floor(pct * 0.3));
    },
  );

  onProgress?.('film_inject_character_refs', 40);

  let characterRefs: CharacterRefResult = { characters: [], promptInjections: [] };
  if (job.character_profiles && job.character_profiles !== '[]') {
    characterRefs = injectCharacterReferences(job.character_profiles);
  }

  const scenes = sbResult.scenes.map((s: any, idx: number) => {
    let videoPrompt = s.videoPrompt;
    if (characterRefs.promptInjections.length > 0) {
      const charInfo = characterRefs.promptInjections.join(' ');
      videoPrompt = `${videoPrompt} Character references: ${charInfo}`;
    }
    return {
      sceneNumber: s.sceneNumber || idx + 1,
      videoPrompt,
      speechText: s.speechText || '',
      sfxPrompt: s.sfxPrompt || '',
      cameraMotion: s.cameraMotion || 'none',
      speaker: s.speaker || '',
    };
  });

  const marketing = {
    ytTitle: sbResult.script.title.slice(0, 80),
    ytDesc: sbResult.script.logline,
    ytTags: '',
    ttDesc: '',
    ttTags: '',
    xDesc: '',
    xTags: '',
    metaDesc: '',
    metaTags: '',
  };

  onProgress?.('film_storyboard_scenes_ready', 50);

  // Phase 3: Transition design (non-blocking on failure)
  let transitionsPlan: Awaited<ReturnType<typeof designTransitions>> | null = null;
  try {
    transitionsPlan = await designTransitions(scenes.map(s => s.videoPrompt));
  } catch (err) {
    Logger.warn('[FilmStoryboard] Transition design failed, skipping:', err);
  }

  onProgress?.('film_storyboard_complete', 50);
  Logger.info('[FilmStoryboard] Complete', {
    sceneCount: scenes.length,
    hasNarrative: !!narrativeDeviceInfo,
    hasTimeStructure: !!timeStructureInfo,
    hasTransitions: !!transitionsPlan,
  });

  return {
    scenes,
    marketing,
    narrativeDevice: narrativeDeviceInfo ?? null,
    timeStructure: timeStructureInfo ?? null,
    transitions: transitionsPlan ?? null,
  };
}
