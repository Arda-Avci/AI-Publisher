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
export type DockerService = 'cogvideox' | 'xtts' | 'audioldm2' | 'wav2lip' | 'musetalk' | 'whisper' | 'stablediffusion' | 'wan' | 'ltx' | 'hunyuan' | 'kokorotts' | 'animatediff' | 'svd' | 'wan25' | 'f5tts' | 'lora-trainer';
export interface ServiceInfo {
    port: number;
    description: string;
    healthUrl: string;
}
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
export declare const dockerHost: DockerHostManager;
//# sourceMappingURL=docker-host.d.ts.map