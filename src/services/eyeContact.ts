/**
 * Eye Contact Correction Service
 *
 * Calls Colab endpoint `/api/v1/eye-contact` to correct eye contact in videos.
 * Falls back to returning the original video path on error.
 *
 * @module services/eyeContact
 */

import axios from 'axios';
import path from 'path';
import fs from 'fs-extra';
import { colab } from '../lib/colab-manager.js';
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
 * Corrects eye contact in a video using Colab AI processing.
 *
 * @param videoPath - Absolute path to the input video
 * @param outputPath - Absolute path for the output video
 * @returns Result with processed path or fallback
 */
export async function correctEyeContact(
  videoPath: string,
  outputPath: string
): Promise<EyeContactResult> {
  const state = colab.getState();

  if (state.status !== 'running' || !state.ngrokUrl) {
    Logger.warn('[eyeContact] Colab not running, using fallback', { status: state.status });
    return {
      processedVideoPath: videoPath,
      usedFallback: true,
      error: 'Colab not available'
    };
  }

  const colabUrl = state.ngrokUrl;

  try {
    Logger.info('[eyeContact] Sending request to Colab', { videoPath, outputPath });

    // TODO: Colab endpoint `/api/v1/eye-contact` not yet implemented in colab_setup.py
    // Expected payload: { video_path, output_path }
    // Expected response: { status: 'success', output_path: string }

    const response = await axios.post(
      `${colabUrl}/api/v1/eye-contact`,
      {
        video_path: videoPath,
        output_path: outputPath
      },
      {
        timeout: 300000, // 5 min
        headers: { 'ngrok-skip-browser-warning': 'true' }
      }
    );

    if (response.data?.status === 'success' && response.data?.output_path) {
      // Verify output file exists
      if (await fs.pathExists(response.data.output_path)) {
        Logger.info('[eyeContact] Eye contact correction succeeded', {
          outputPath: response.data.output_path
        });
        return {
          processedVideoPath: response.data.output_path,
          usedFallback: false
        };
      }
    }

    throw new Error(`Unexpected Colab response: ${JSON.stringify(response.data)}`);
  } catch (err: any) {
    Logger.warn('[eyeContact] Colab call failed, using fallback', {
      error: err.message
    });
    return {
      processedVideoPath: videoPath,
      usedFallback: true,
      error: err.message
    };
  }
}

/**
 * Convenience wrapper that copies input to output if fallback is used.
 * Ensures the caller always has a valid processed video at outputPath.
 */
export async function enhanceEyeContact(
  videoPath: string,
  outputPath: string
): Promise<string> {
  const result = await correctEyeContact(videoPath, outputPath);

  if (result.usedFallback) {
    // Copy original to output if they're different paths
    if (videoPath !== outputPath) {
      await fs.copy(videoPath, outputPath);
    }
    Logger.info('[eyeContact] Fallback: original video copied to output', {
      outputPath
    });
  }

  return result.processedVideoPath;
}