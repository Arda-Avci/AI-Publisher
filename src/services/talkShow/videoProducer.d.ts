/**
 * Talk Show Video Producer
 * Sportoto discussion verisini alır, TTS + FFmpeg ile video üretir.
 */
import type { SportotoDiscussion } from './discussionSource.js';
/**
 * Talk show video üretir:
 * 1. Her utterance için Docker TTS ile ses sentezle
 * 2. Her utterance için görsel bir scene oluştur (speaker adı + metin)
 * 3. Tüm scene'leri birleştir
 */
export declare function produceTalkShowVideo(discussion: SportotoDiscussion, outputPath: string, options?: {
    backgroundVideo?: string;
}): Promise<string>;
//# sourceMappingURL=videoProducer.d.ts.map