import { Logger } from '../../lib/logger.js';
import { DiscussionSource, SportotoDiscussion } from './discussionSource.js';

export interface SportotoConfig {
  baseUrl: string;
  apiKey: string;
}

const DEFAULT_CONFIG: SportotoConfig = {
  baseUrl: process.env.SPORTOTO_API_URL || 'http://localhost:8000/api/v1',
  apiKey: process.env.SPORTOTO_API_KEY || '',
};

export class SportotoSource implements DiscussionSource {
  readonly name = 'sportoto';
  private config: SportotoConfig;

  constructor(config: SportotoConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  async fetchWeeklyDiscussion(weekNumber: number): Promise<SportotoDiscussion> {
    const url = `${this.config.baseUrl}/predictions/discussion/weekly/${weekNumber}/publish`;

    if (!this.config.apiKey) {
      Logger.warn('[SportotoSource] SPORTOTO_API_KEY .env\'de tanımlı değil. API key auth çalışmaz.');
    }

    Logger.info(`[SportotoSource] Fetching discussion for week ${weekNumber} from ${url}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey;
    }

    try {
      const params = new URLSearchParams();
      if (this.config.apiKey) params.set('api_key', this.config.apiKey);
      const fullUrl = this.config.apiKey ? `${url}?${params.toString()}` : url;

      const response = await fetch(fullUrl, { headers });

      if (!response.ok) {
        throw new Error(`Sportoto API hatası: ${response.status} ${response.statusText}`);
      }

      const data: SportotoDiscussion = await response.json();

      Logger.info(`[SportotoSource] Fetched discussion: "${data.title}" with ${data.total_utterances} utterances`);

      return data;
    } catch (error: any) {
      Logger.error(`[SportotoSource] Failed to fetch discussion: ${error.message}`);
      throw error;
    }
  }
}

export async function fetchWeeklyDiscussion(
  weekNumber: number,
  config?: SportotoConfig
): Promise<SportotoDiscussion> {
  const source = new SportotoSource(config);
  return source.fetchWeeklyDiscussion(weekNumber);
}

const SPEAKER_VOICE_MAP: Record<string, { ttsVoice: string; name: string; color: string }> = {
  Moderator: { ttsVoice: 'tr-TR-AhmetNeural', name: 'Moderatör', color: '#F59E0B' },
  Yorumcu: { ttsVoice: 'tr-TR-EmelNeural', name: 'Yorumcu', color: '#06B6D4' },
  Futbolcu: { ttsVoice: 'tr-TR-AhmetNeural', name: 'Futbolcu', color: '#10B981' },
  Kumarbaz: { ttsVoice: 'tr-TR-EmelNeural', name: 'Kumarbaz', color: '#F43F5E' },
  TeknikDirektor: { ttsVoice: 'tr-TR-AhmetNeural', name: 'Teknik Direktör', color: '#60A5FA' },
};

export function discussionToScenes(
  discussion: SportotoDiscussion
): Array<{
  sceneNumber: number;
  speaker: string;
  originalSpeaker: string;
  text: string;
  ttsVoice: string;
  color: string;
  matchId: number | null;
  duration: number;
}> {
  const WPM = 150;
  return discussion.utterances.map((u, idx) => {
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
}
