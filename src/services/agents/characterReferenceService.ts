import { Logger } from '../../lib/logger.js';

export interface CharacterRefResult {
  characters: {
    name: string;
    appearanceNotes: string;
    voiceRef: string;
    visualGuidance: string;
  }[];
  promptInjections: string[];
}

export function injectCharacterReferences(
  characterProfilesJson: string,
): CharacterRefResult {
  const result: CharacterRefResult = {
    characters: [],
    promptInjections: [],
  };

  if (!characterProfilesJson || characterProfilesJson === '[]') {
    return result;
  }

  try {
    const profiles = JSON.parse(characterProfilesJson);
    if (!Array.isArray(profiles)) return result;

    for (const profile of profiles) {
      const name = profile.name || 'unknown';
      const appearance = profile.appearance || {};
      const style = profile.style || {};

      const appearanceParts: string[] = [];
      if (appearance.hair_color) appearanceParts.push(`${appearance.hair_color} hair`);
      if (appearance.hair_style) appearanceParts.push(appearance.hair_style);
      if (appearance.eye_color) appearanceParts.push(`${appearance.eye_color} eyes`);
      if (appearance.ethnicity) appearanceParts.push(appearance.ethnicity);
      if (appearance.facial_hair) appearanceParts.push(appearance.facial_hair);
      if (appearance.distinctive_features) appearanceParts.push(appearance.distinctive_features);
      if (profile.body_type) appearanceParts.push(profile.body_type);

      const styleParts: string[] = [];
      if (style.outfit) styleParts.push(`wearing ${style.outfit}`);
      if (style.era) styleParts.push(`${style.era} style`);
      if (style.vibe) styleParts.push(`${style.vibe} aesthetic`);

      const appearanceNotes = appearanceParts.join(', ');
      const visualGuidance = styleParts.join(', ');

      const promptInjection = `${name}: ${appearanceNotes}${visualGuidance ? ', ' + visualGuidance : ''}.`;

      result.characters.push({
        name,
        appearanceNotes,
        voiceRef: profile.voice_base64 || '',
        visualGuidance,
      });

      result.promptInjections.push(promptInjection);
    }

    Logger.info('[CharacterReference] Injected', {
      count: result.characters.length,
      names: result.characters.map((c) => c.name).join(', '),
    });
  } catch (err) {
    Logger.warn('[CharacterReference] Parse error:', err);
  }

  return result;
}
