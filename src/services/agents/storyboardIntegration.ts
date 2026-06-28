import { Logger } from '../../lib/logger.js';
import { runStoryboardAgent } from '../storyboardAgent/storyboardAgent.js';
import { injectCharacterReferences, CharacterRefResult } from './characterReferenceService.js';

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

  const sbResult = await runStoryboardAgent(
    {
      masterPrompt: job.master_prompt || '',
      productionNotes: job.production_notes,
      characterFeatures: job.character_features,
      targetLanguage: 'tr',
      sceneCount: job.total_scenes || 8,
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

  onProgress?.('film_storyboard_complete', 50);
  Logger.info('[FilmStoryboard] Complete', { sceneCount: scenes.length });

  return { scenes, marketing };
}
