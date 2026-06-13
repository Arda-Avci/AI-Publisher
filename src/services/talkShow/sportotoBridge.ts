/**
 * Sportoto → AI Publisher Bridge
 * Sportoto projesindeki tartışma programı verisini çeker,
 * AI Publisher video pipeline'ına besler.
 */

import { Logger } from '../../lib/logger.js';

export interface SportotoUtterance {
  speaker: string;
  text: string;
  match_id: number | null;
  sequence_order: number;
}

export interface SportotoDiscussion {
  title: string;
  sportoto_week: number;
  utterances: SportotoUtterance[];
  total_utterances: number;
}

export interface SportotoConfig {
  baseUrl: string;
  apiKey: string;
}

const DEFAULT_CONFIG: SportotoConfig = {
  baseUrl: process.env.SPORTOTO_API_URL || 'http://localhost:8000/api/v1',
  apiKey: process.env.SPORTOTO_API_KEY || '',
};

/**
 * Sportoto API'den haftalık tartışma programını çeker.
 */
export async function fetchWeeklyDiscussion(
  weekNumber: number,
  config: SportotoConfig = DEFAULT_CONFIG
): Promise<SportotoDiscussion> {
  const url = `${config.baseUrl}/predictions/discussion/weekly/${weekNumber}/publish`;

  Logger.info(`[SportotoBridge] Fetching discussion for week ${weekNumber} from ${url}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['x-api-key'] = config.apiKey;
  }

  try {
    const params = new URLSearchParams();
    if (config.apiKey) params.set('api_key', config.apiKey);
    const fullUrl = config.apiKey ? `${url}?${params.toString()}` : url;

    const response = await fetch(fullUrl, { headers });

    if (!response.ok) {
      throw new Error(`Sportoto API hatası: ${response.status} ${response.statusText}`);
    }

    const data: SportotoDiscussion = await response.json();

    Logger.info(`[SportotoBridge] Fetched discussion: "${data.title}" with ${data.total_utterances} utterances`);

    return data;
  } catch (error: any) {
    Logger.error(`[SportotoBridge] Failed to fetch discussion: ${error.message}`);
    throw error;
  }
}

/**
 * Tartışma programını AI Publisher talk-show formatına dönüştürür.
 * Her utterance'ı bir konuşma bölümü olarak yapılandırır.
 */
export function discussionToScenes(
  discussion: SportotoDiscussion
): Array<{
  sceneNumber: number;
  speaker: string;
  text: string;
  matchId: number | null;
  duration: number;
}> {
  const SPEAKER_VOICE_MAP: Record<string, { ttsVoice: string; name: string; color: string }> = {
    Moderator: { ttsVoice: 'tr-TR-AhmetNeural', name: 'Moderatör', color: '#F59E0B' },
    Yorumcu: { ttsVoice: 'tr-TR-EmelNeural', name: 'Yorumcu', color: '#06B6D4' },
    Futbolcu: { ttsVoice: 'tr-TR-AhmetNeural', name: 'Futbolcu', color: '#10B981' },
    Kumarbaz: { ttsVoice: 'tr-TR-EmelNeural', name: 'Kumarbaz', color: '#F43F5E' },
    TeknikDirektor: { ttsVoice: 'tr-TR-AhmetNeural', name: 'Teknik Direktör', color: '#60A5FA' },
  };

  const WPM = 150; // average words per minute for TTS pacing
  const scenes = discussion.utterances.map((u, idx) => {
    const voiceConfig = SPEAKER_VOICE_MAP[u.speaker] || SPEAKER_VOICE_MAP.Moderator;
    const wordCount = u.text.split(/\s+/).length;
    const duration = Math.max(3, Math.ceil(wordCount / WPM * 60));

    return {
      sceneNumber: idx + 1,
      speaker: voiceConfig.name,
      originalSpeaker: u.speaker,
      text: u.text,
      ttsVoice: voiceConfig.ttsVoice,
      color: voiceConfig.color,
      matchId: u.match_id,
      duration,
    };
  });

  return scenes;
}
