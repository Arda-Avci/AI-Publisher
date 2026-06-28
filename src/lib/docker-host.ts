/**
 * Docker Host — Service registry for local GPU model containers.
 *
 * docker-compose runs each model on port 5001-5016 mapped to localhost.
 * This module replaces colab-manager.ts (Colab + Ngrok lifecycle — now Docker-native).
 *
 * Usage:
 *   import { dockerHost } from '../lib/docker-host.js';
 *   const url = dockerHost.getUrl('cogvideox'); // http://localhost:5001
 *   const ok = await dockerHost.isServiceHealthy('xtts');
 */

import { EventEmitter } from 'events';
import axios from 'axios';


export type DockerService =
  | 'cogvideox'
  | 'xtts'
  | 'audioldm2'
  | 'wav2lip'
  | 'musetalk'
  | 'whisper'
  | 'stablediffusion'
  | 'wan'
  | 'ltx'
  | 'hunyuan'
  | 'kokorotts'
  | 'animatediff'
  | 'svd'
  | 'wan25'
  | 'f5tts'
  | 'lora-trainer'
  | 'sadtalker'
  | 'dynamicrafter'
  | 'zeroscope'
  | 'pyramid-flow'
  | 'video-retalking'
   | 'geneface'
   | 'mochi'
   | 'videocrafter'
   | 'realesrgan'
   | 'browser-use';

export interface ServiceInfo {
  port: number;
  description: string;
  healthUrl: string;
}

const SERVICE_REGISTRY: Record<DockerService, ServiceInfo> = {
  cogvideox:    { port: 5001, description: 'Video Generation (CogVideoX)',        healthUrl: '/health' },
  xtts:         { port: 5002, description: 'TTS / Voice Cloning (XTTS-v2)',       healthUrl: '/health' },
  audioldm2:    { port: 5003, description: 'Sound FX (AudioLDM2)',                healthUrl: '/health' },
  wav2lip:      { port: 5004, description: 'Lip Sync (Wav2Lip)',                  healthUrl: '/health' },
  musetalk:     { port: 5005, description: 'Talking Head (MuseTalk)',             healthUrl: '/health' },
  whisper:      { port: 5006, description: 'Transcription (Whisper)',             healthUrl: '/health' },
  stablediffusion: { port: 5007, description: 'Image Generation (SD / Flux)',     healthUrl: '/health' },
  wan:          { port: 5008, description: 'Video Generation (Wan 2.1)',          healthUrl: '/health' },
  ltx:          { port: 5009, description: 'Video Generation (LTX-Video)',        healthUrl: '/health' },
  hunyuan:      { port: 5010, description: 'Video Generation (HunyuanVideo)',      healthUrl: '/health' },
  kokorotts:    { port: 5011, description: 'TTS (Kokoro-82M)',                    healthUrl: '/health' },
  svd:          { port: 5012, description: 'Video Generation (SVD-XT)',           healthUrl: '/health' },
  animatediff:  { port: 5013, description: 'Animation (AnimateDiff)',             healthUrl: '/health' },
  wan25:        { port: 5014, description: 'Video Generation (Wan2.5)',           healthUrl: '/health' },
  f5tts:        { port: 5015, description: 'Zero-Shot TTS (F5-TTS)',              healthUrl: '/health' },
  'lora-trainer': { port: 5016, description: 'LoRA Fine-Tuning',                  healthUrl: '/health' },
  sadtalker:            { port: 5017, description: 'Talking Head (SadTalker)',                healthUrl: '/health' },
  'video-retalking':    { port: 5020, description: 'Lip Sync (Video-ReTalking)',             healthUrl: '/health' },
  zeroscope:            { port: 5019, description: 'Text-to-Video (Zeroscope)',              healthUrl: '/health' },
  dynamicrafter:  { port: 5018, description: 'Image-to-Video (DynamiCrafter)',     healthUrl: '/health' },
  mochi:          { port: 5022, description: 'Video Generation (Mochi-1)',           healthUrl: '/health' },
  'pyramid-flow': { port: 5023, description: 'Video Generation (Pyramid-Flow)',    healthUrl: '/health' },
   geneface:       { port: 5021, description: '3D Talking Head (GeneFace++)',       healthUrl: '/health' },
   videocrafter:   { port: 5024, description: 'Video Generation (VideoCrafter)',    healthUrl: '/health' },
   realesrgan:     { port: 5025, description: '4K Upscale (Real-ESRGAN)',           healthUrl: '/health' },
   'browser-use':  { port: 5026, description: 'Browser Automation (browser-use)',    healthUrl: '/health' },
};

export interface DockerHostState {
  host: string;
  services: Record<string, {
    healthy: boolean;
    lastCheck: string | null;
  }>;
}

export interface DockerHostManager {
  getUrl(service: DockerService): string;
  getHost(): string;
  getServiceUrl(service: DockerService, endpoint: string): string;
  resolveEndpoint(endpoint: string): string;
  isServiceHealthy(service: DockerService): Promise<boolean>;
  checkAllServices(): Promise<Record<string, boolean>>;
  getState(): DockerHostState;
  on(event: 'service-change', listener: (state: DockerHostState) => void): this;
  off(event: 'service-change', listener: (state: DockerHostState) => void): this;
}

class DockerHostImpl extends EventEmitter implements DockerHostManager {
  private services: Record<string, { healthy: boolean; lastCheck: string | null }> = {};

  constructor() {
    super();
    for (const key of Object.keys(SERVICE_REGISTRY)) {
      this.services[key] = { healthy: false, lastCheck: null };
    }
    const envHost = process.env.DOCKER_HOST;
    if (envHost) {
      void this.checkAllServices();
      void setInterval(() => {
        void this.checkAllServices();
      }, 60_000);
    }
  }

  getHost(): string {
    return process.env.DOCKER_HOST || 'http://localhost';
  }

  getUrl(service: DockerService): string {
    const info = SERVICE_REGISTRY[service];
    if (!info) {
      throw new Error(`Unknown Docker service: ${service}`);
    }
    return `${this.getHost()}:${info.port}`;
  }

  getServiceUrl(service: DockerService, endpoint: string): string {
    return `${this.getUrl(service)}${endpoint}`;
  }

  resolveEndpoint(endpoint: string): string {
    const prefixMap: [string, DockerService][] = [
      ['/generate-media',    'cogvideox'],
      ['/status/',           'cogvideox'],
      ['/download/video',    'cogvideox'],
      ['/download/speech',   'xtts'],
      ['/download/sfx',      'audioldm2'],
      ['/download/subtitle', 'whisper'],
      ['/download/cover',    'stablediffusion'],
      ['/generate-covers',   'stablediffusion'],
      ['/generate-image',    'stablediffusion'],
      ['/remove-background', 'stablediffusion'],
      ['/inpaint-image',     'stablediffusion'],
      ['/generate-broll',    'cogvideox'],
      ['/generate-avatar',   'musetalk'],
      ['/transcribe',        'whisper'],
      ['/apply-lipsync',     'wav2lip'],
      ['/verify-libs',       'cogvideox'],
      ['/gpu-info',          'cogvideox'],
      ['/health',            'cogvideox'],
      ['/shutdown',          'cogvideox'],
    ];
    for (const [prefix, service] of prefixMap) {
      if (endpoint.startsWith(prefix)) {
        return this.getServiceUrl(service, endpoint);
      }
    }
    return this.getServiceUrl('cogvideox', endpoint);
  }

  async isServiceHealthy(service: DockerService): Promise<boolean> {
    const url = this.getUrl(service);
    const info = SERVICE_REGISTRY[service];
    try {
      await axios.get(`${url}${info.healthUrl}`, { timeout: 5000 });
      this.services[service] = { healthy: true, lastCheck: new Date().toISOString() };
      return true;
    } catch {
      this.services[service] = { healthy: false, lastCheck: null };
      return false;
    }
  }

  async checkAllServices(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [name, info] of Object.entries(SERVICE_REGISTRY)) {
      const url = `${this.getHost()}:${info.port}${info.healthUrl}`;
      try {
        await axios.get(url, { timeout: 3000 });
        this.services[name] = { healthy: true, lastCheck: new Date().toISOString() };
        results[name] = true;
      } catch {
        this.services[name] = { healthy: false, lastCheck: null };
        results[name] = false;
      }
    }
    this.emit('service-change', this.getState());
    return results;
  }

  getState(): DockerHostState {
    return {
      host: this.getHost(),
      services: { ...this.services },
    };
  }
}

export const dockerHost: DockerHostManager = new DockerHostImpl();
