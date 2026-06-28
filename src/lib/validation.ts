export interface ValidationError {
  field: string;
  message: string;
}

export function validateCreateJob(body: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  const {
    master_prompt,
    production_notes,
    character_features,
    character_profiles,
    platforms,
    playlist_id,
    tts_provider,
    tts_voice,
    differentiation_duration_mode,
  } = body;

  // master_prompt: required, string, max 5000 chars
  if (!master_prompt || typeof master_prompt !== 'string') {
    errors.push({
      field: 'master_prompt',
      message: 'Master prompt zorunludur ve metin olmalıdır.',
    });
  } else if (master_prompt.trim().length > 5000) {
    errors.push({
      field: 'master_prompt',
      message: 'Master prompt en fazla 5000 karakter olabilir.',
    });
  }

  // production_notes: optional, string, max 2000 chars
  if (
    production_notes &&
    (typeof production_notes !== 'string' || production_notes.length > 2000)
  ) {
    errors.push({
      field: 'production_notes',
      message: 'Üretim notları en fazla 2000 karakter olabilir.',
    });
  }

  // character_features: optional, string, max 2000 chars
  if (
    character_features &&
    (typeof character_features !== 'string' || character_features.length > 2000)
  ) {
    errors.push({
      field: 'character_features',
      message: 'Karakter özellikleri en fazla 2000 karakter olabilir.',
    });
  }

  // character_profiles: optional, JSON string veya array, max 10 profil
  if (character_profiles !== undefined && character_profiles !== null) {
    let parsed: unknown;
    if (typeof character_profiles === 'string') {
      try {
        parsed = JSON.parse(character_profiles);
      } catch {
        errors.push({
          field: 'character_profiles',
          message: 'character_profiles JSON parse hatasi.',
        });
      }
    } else if (Array.isArray(character_profiles)) {
      parsed = character_profiles;
    } else {
      errors.push({
        field: 'character_profiles',
        message: 'character_profiles array veya JSON string olmali.',
      });
    }
    if (Array.isArray(parsed) && parsed.length > 10) {
      errors.push({
        field: 'character_profiles',
        message: 'En fazla 10 karakter profili eklenebilir.',
      });
    }
  }

  // platforms: optional, array of string, valid platform options
  if (platforms) {
    const validPlatforms = ['youtube', 'tiktok', 'x', 'meta'];
    const targetPlatforms = Array.isArray(platforms) ? platforms : [platforms];
    for (const platform of targetPlatforms) {
      if (typeof platform !== 'string' || !validPlatforms.includes(platform)) {
        errors.push({
          field: 'platforms',
          message: `Geçersiz sosyal medya platformu: ${platform}`,
        });
      }
    }
  }

  // playlist_id: optional, string, max 200 chars
  if (playlist_id && (typeof playlist_id !== 'string' || playlist_id.length > 200)) {
    errors.push({
      field: 'playlist_id',
      message: 'Çalma listesi hedef ID en fazla 200 karakter olabilir.',
    });
  }

  // tts_provider: optional, string, enum: xtts, openai, edge
  if (tts_provider) {
    const validTts = ['xtts', 'openai', 'edge', 'f5tts'];
    if (typeof tts_provider !== 'string' || !validTts.includes(tts_provider)) {
      errors.push({ field: 'tts_provider', message: 'Geçersiz TTS sağlayıcısı.' });
    }
  }

  // tts_voice: optional, string, max 200 chars
  if (tts_voice && (typeof tts_voice !== 'string' || tts_voice.length > 200)) {
    errors.push({ field: 'tts_voice', message: 'Ses adı en fazla 200 karakter olabilir.' });
  }

  // differentiation_duration_mode: optional, enum: same, shorter, longer
  if (differentiation_duration_mode) {
    const validDuration = ['same', 'shorter', 'longer'];
    if (
      typeof differentiation_duration_mode !== 'string' ||
      !validDuration.includes(differentiation_duration_mode)
    ) {
      errors.push({
        field: 'differentiation_duration_mode',
        message: 'Geçersiz farklılaştırma süre modu.',
      });
    }
  }

  // production_template: optional, string, enum from templatePromptService
  if (body.production_template) {
    const validTemplates = [
      'cinematic', 'noir', 'epic', 'atmospheric', 'dynamic',
      'viral_tiktok', 'shorts_fast', 'reel_aesthetic', 'trending', 'challenge',
      'asmr', 'unboxing', 'simple', 'tutorial', 'whiteboard',
      'explainer', 'keynote', 'documentary', 'pixar', 'anime',
      'retro_vhs', 'glitch_art', 'claymation', 'stop_motion', 'gaming_montage',
      'fitness', 'cooking', 'travel_vlog', 'corporate', 'luxury',
      'wedding', 'real_estate', 'sadtalker', 'dynamicrafter', 'zeroscope',
      'geneface', 'pyramid-flow', 'video-retalking', 'mochi', 'veo31',
    ];
    if (
      typeof body.production_template !== 'string' ||
      !validTemplates.includes(body.production_template)
    ) {
      errors.push({ field: 'production_template', message: 'Geçersiz üretim şablonu.' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateSaveMeta(body: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const fields = [
    'yt_title',
    'yt_desc',
    'yt_tags',
    'tt_desc',
    'tt_tags',
    'x_desc',
    'x_tags',
    'meta_desc',
    'meta_tags',
  ];

  for (const field of fields) {
    const value = body[field];
    if (value !== undefined) {
      if (typeof value !== 'string') {
        errors.push({ field, message: `${field} metin olmalıdır.` });
      } else if (value.length > 5000) {
        errors.push({ field, message: `${field} en fazla 5000 karakter olabilir.` });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
