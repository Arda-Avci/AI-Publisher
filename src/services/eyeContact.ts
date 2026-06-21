/**
 * Eye Contact Correction Service
 *
 * Calls Docker endpoint `/api/v1/eye-contact` to correct eye contact in videos.
 * Falls back to returning the original video path on error.
 *
 * @module services/eyeContact
 */

import axios from 'axios';
import path from 'path';
import fs from 'fs-extra';
import { dockerHost } from '../lib/docker-host.js';
import { Logger } from '../lib/logger.js';

/**
 * Input options for eye contact correction.
 */
export interface EyeContactOptions {
  /** Video file path to process */
  videoPath: string;
  /** Output path for the corrected video */
  outputPath: string;
  /** Enable smooth transition blend (default: true) */
  smoothTransition?: boolean;
}

/**
 * Result of eye contact correction.
 */
export interface EyeContactResult {
  /** Path to the processed video (original path on fallback) */
  processedVideoPath: string;
  /** Whether fallback was used */
  usedFallback: boolean;
  /** Error message if any */
  error?: string;
}

/**
 * Corrects eye contact in a video using Docker AI processing.
 *
 * @param videoPath - Absolute path to the input video
 * @param outputPath - Absolute path for the output video
 * @returns Result with processed path or fallback
 */
export async function correctEyeContact(
  videoPath: string,
  outputPath: string,
): Promise<EyeContactResult> {
  const sdUrl = dockerHost.getUrl('stablediffusion');

  try {
    Logger.info('[eyeContact] Sending request to Docker', { videoPath, outputPath });

    Logger.warn(
      '[eyeContact] `/api/v1/eye-contact` not implemented on Docker side — future feature',
      {
        videoPath,
        outputPath,
      },
    );

    const response = await axios.post(
      `${sdUrl}/api/v1/eye-contact`,
      {
        video_path: videoPath,
        output_path: outputPath,
      },
      {
        timeout: 300000,
      },
    );

    if (response.data?.status === 'success' && response.data?.output_path) {
      if (await fs.pathExists(response.data.output_path)) {
        Logger.info('[eyeContact] Eye contact correction succeeded', {
          outputPath: response.data.output_path,
        });
        return {
          processedVideoPath: response.data.output_path,
          usedFallback: false,
        };
      }
    }

    throw new Error(`Unexpected Docker response: ${JSON.stringify(response.data)}`);
  } catch (err: any) {
    Logger.warn('[eyeContact] Docker call failed, using fallback', {
      error: err.message,
    });
    return {
      processedVideoPath: videoPath,
      usedFallback: true,
      error: err.message,
    };
  }
}

/**
 * Convenience wrapper that copies input to output if fallback is used.
 * Ensures the caller always has a valid processed video at outputPath.
 */
export async function enhanceEyeContact(videoPath: string, outputPath: string): Promise<string> {
  const result = await correctEyeContact(videoPath, outputPath);

  if (result.usedFallback) {
    // Copy original to output if they're different paths
    if (videoPath !== outputPath) {
      await fs.copy(videoPath, outputPath);
    }
    Logger.info('[eyeContact] Fallback: original video copied to output', {
      outputPath,
    });
  }

  return result.processedVideoPath;
}
