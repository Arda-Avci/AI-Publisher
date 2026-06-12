import { Logger } from '../lib/logger.js';
import axios from 'axios';

interface AvatarOptions {
  text: string;
  avatarId?: string;
  voiceId?: string;
  language?: string;
  background?: string;
}

interface AvatarResult {
  success: boolean;
  videoUrl?: string;
  taskId?: string;
  message: string;
  provider: 'heygen' | 'tavus';
}

export class HeyGenService {
  private apiKey: string;
  private baseUrl = 'https://api.heygen.com/v2';

  constructor() {
    this.apiKey = process.env.HEYGEN_API_KEY || '';
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generateAvatar(options: AvatarOptions): Promise<AvatarResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'HEYGEN_API_KEY not configured',
        provider: 'heygen',
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/video/generate`,
        {
          caption: options.text,
          avatar: {
            avatar_id: options.avatarId || 'default',
            scale: 1,
          },
          voice: {
            voice_id: options.voiceId || 'default',
            speed: 1.0,
          },
          background: {
            background_type: options.background || 'solid',
            background_color: '#1a1a2e',
          },
          dimension: {
            width: 1080,
            height: 1920,
          },
        },
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const taskId = response.data?.data?.task_id;
      Logger.info(`[HeyGen] Task created: ${taskId}`);

      return {
        success: true,
        taskId,
        message: 'HeyGen task started',
        provider: 'heygen',
      };
    } catch (err: any) {
      Logger.error(`[HeyGen] API error: ${err.message}`);
      return {
        success: false,
        message: `HeyGen error: ${err.message}`,
        provider: 'heygen',
      };
    }
  }

  async checkTaskStatus(taskId: string): Promise<AvatarResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/video/status`, {
        params: { video_id: taskId },
        headers: { 'X-Api-Key': this.apiKey },
      });

      const data = response.data?.data;
      if (data?.status === 'completed' && data?.video_url) {
        return {
          success: true,
          videoUrl: data.video_url,
          taskId,
          message: 'HeyGen video ready',
          provider: 'heygen',
        };
      }

      return {
        success: false,
        taskId,
        message: data?.status || 'processing',
        provider: 'heygen',
      };
    } catch (err: any) {
      return {
        success: false,
        taskId,
        message: `Status check failed: ${err.message}`,
        provider: 'heygen',
      };
    }
  }
}

export class TavusService {
  private apiKey: string;
  private baseUrl = 'https://api.tavus.io/v1';

  constructor() {
    this.apiKey = process.env.TAVUS_API_KEY || '';
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generateAvatar(options: AvatarOptions): Promise<AvatarResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'TAVUS_API_KEY not configured',
        provider: 'tavus',
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/video`,
        {
          script: options.text,
          avatar_name: options.avatarId || 'default',
          voice_name: options.voiceId || 'default',
          background_url: options.background || '',
          quality: 'high',
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const taskId = response.data?.id || response.data?.task_id;
      Logger.info(`[Tavus] Task created: ${taskId}`);

      return {
        success: true,
        taskId,
        message: 'Tavus task started',
        provider: 'tavus',
      };
    } catch (err: any) {
      Logger.error(`[Tavus] API error: ${err.message}`);
      return {
        success: false,
        message: `Tavus error: ${err.message}`,
        provider: 'tavus',
      };
    }
  }
}

export const heygenService = new HeyGenService();
export const tavusService = new TavusService();

export function getAvatarService(provider: 'heygen' | 'tavus'): HeyGenService | TavusService {
  return provider === 'heygen' ? heygenService : tavusService;
}
