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
import { DOCKER_PORTS, TIMEOUT } from '../constants.js';


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
  cogvideox:    { port: DOCKER_PORTS.COGVIDEOX, description: 'Video Generation (CogVideoX)',        healthUrl: '/health' },
  xtts:         { port: DOCKER_PORTS.XTTS, description: 'TTS / Voice Cloning (XTTS-v2)',       healthUrl: '/health' },
  audioldm2:    { port: DOCKER_PORTS.AUDIOLDM2, description: 'Sound FX (AudioLDM2)',                healthUrl: '/health' },
  wav2lip:      { port: DOCKER_PORTS.WAV2LIP, description: 'Lip Sync (Wav2Lip)',                  healthUrl: '/health' },
  musetalk:     { port: DOCKER_PORTS.MUSETALK, description: 'Talking Head (MuseTalk)',             healthUrl: '/health' },
  whisper:      { port: DOCKER_PORTS.WHISPER, description: 'Transcription (Whisper)',             healthUrl: '/health' },
  stablediffusion: { port: DOCKER_PORTS.STABLEDIFFUSION, description: 'Image Generation (SD / Flux)',     healthUrl: '/health' },
  wan:          { port: DOCKER_PORTS.WAN, description: 'Video Generation (Wan 2.1)',          healthUrl: '/health' },
  ltx:          { port: DOCKER_PORTS.LTX, description: 'Video Generation (LTX-Video)',        healthUrl: '/health' },
  hunyuan:      { port: DOCKER_PORTS.HUNYUAN, description: 'Video Generation (HunyuanVideo)',      healthUrl: '/health' },
  kokorotts:    { port: DOCKER_PORTS.KOKOROTTS, description: 'TTS (Kokoro-82M)',                    healthUrl: '/health' },
  svd:          { port: DOCKER_PORTS.SVD, description: 'Video Generation (SVD-XT)',           healthUrl: '/health' },
  animatediff:  { port: DOCKER_PORTS.ANIMATEDIFF, description: 'Animation (AnimateDiff)',             healthUrl: '/health' },
  wan25:        { port: DOCKER_PORTS.WAN25, description: 'Video Generation (Wan2.5)',           healthUrl: '/health' },
  f5tts:        { port: DOCKER_PORTS.F5TTS, description: 'Zero-Shot TTS (F5-TTS)',              healthUrl: '/health' },
  'lora-trainer': { port: DOCKER_PORTS.LORA_TRAINER, description: 'LoRA Fine-Tuning',                  healthUrl: '/health' },
  sadtalker:            { port: DOCKER_PORTS.SADTALKER, description: 'Talking Head (SadTalker)',                healthUrl: '/health' },
  'video-retalking':    { port: DOCKER_PORTS.VIDEO_RETALKING, description: 'Lip Sync (Video-ReTalking)',             healthUrl: '/health' },
  zeroscope:            { port: DOCKER_PORTS.ZEROSCOPE, description: 'Text-to-Video (Zeroscope)',              healthUrl: '/health' },
  dynamicrafter:  { port: DOCKER_PORTS.DYNAMICRAFTER, description: 'Image-to-Video (DynamiCrafter)',     healthUrl: '/health' },
  mochi:          { port: DOCKER_PORTS.MOCHI, description: 'Video Generation (Mochi-1)',           healthUrl: '/health' },
  'pyramid-flow': { port: DOCKER_PORTS.PYRAMID_FLOW, description: 'Video Generation (Pyramid-Flow)',    healthUrl: '/health' },
   geneface:       { port: DOCKER_PORTS.GENEFACE, description: '3D Talking Head (GeneFace++)',       healthUrl: '/health' },
   videocrafter:   { port: DOCKER_PORTS.VIDEOCRAFTER, description: 'Video Generation (VideoCrafter)',    healthUrl: '/health' },
   realesrgan:     { port: DOCKER_PORTS.REALESRGAN, description: '4K Upscale (Real-ESRGAN)',           healthUrl: '/health' },
   'browser-use':  { port: DOCKER_PORTS.BROWSER_USE, description: 'Browser Automation (browser-use)',    healthUrl: '/health' },
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
      await axios.get(`${url}${info.healthUrl}`, { timeout: TIMEOUT.DOCKER_CHECK });
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
        await axios.get(url, { timeout: TIMEOUT.PIPECAT_HEALTH });
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
