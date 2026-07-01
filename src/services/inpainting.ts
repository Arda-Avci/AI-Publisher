/**
 * Video Inpainting Service
 *
 * Removes unwanted objects from videos by calling the Docker `/api/v1/inpaint` endpoint.
 * Uses mask regions to specify areas to be inpainted and replaced with generated content.
 *
 * @module services/inpainting
 */

import axios from 'axios';
import fs from 'fs-extra';
import { dockerHost } from '../lib/docker-host.js';
import { Logger } from '../lib/logger.js';
import { TIMEOUT } from '../constants.js';

/**
 * Represents a rectangular mask region to be inpainted.
 */
export interface MaskRegion {
  /** Left coordinate of the mask region (0-1 normalized) */
  x: number;
  /** Top coordinate of the mask region (0-1 normalized) */
  y: number;
  /** Width of the mask region (0-1 normalized) */
  width: number;
  /** Height of the mask region (0-1 normalized) */
  height: number;
  /** Optional label for the masked object */
  label?: string;
}

/**
 * Input options for inpainting.
 */
export interface InpaintOptions {
  /** Video file path to process */
  videoPath: string;
  /** Array of mask regions to remove */
  maskRegions: MaskRegion[];
  /** Output path for the inpainted video */
  outputPath: string;
  /** Inpainting model strength (0-1, default: 0.8) */
  strength?: number;
}

/**
 * Result of inpainting operation.
 */
export interface InpaintResult {
  /** Path to the inpainted video */
  outputVideoPath: string;
  /** Whether fallback was used (original copied) */
  usedFallback: boolean;
  /** Error message if any */
  error?: string;
}

/**
 * Removes objects from a video by inpainting specified mask regions.
 *
 * @param videoPath   - Absolute path to input video
 * @param maskRegions - Array of MaskRegion objects describing areas to remove
 * @param outputPath  - Absolute path for output video
 * @returns Result with output path or fallback
 */
export async function inpaintObjects(
  videoPath: string,
  maskRegions: MaskRegion[],
  outputPath: string,
): Promise<InpaintResult> {
  if (maskRegions.length === 0) {
    Logger.warn('[inpaint] No mask regions provided, copying original');
    await fs.copy(videoPath, outputPath);
    return {
      outputVideoPath: outputPath,
      usedFallback: true,
      error: 'No mask regions provided',
    };
  }

  const sdUrl = dockerHost.getUrl('stablediffusion');

  try {
    Logger.info('[inpaint] Sending inpaint request to Docker', {
      videoPath,
      outputPath,
      regionCount: maskRegions.length,
    });

    const response = await axios.post(
      `${sdUrl}/api/v1/inpaint`,
      {
        video_path: videoPath,
        mask_regions: maskRegions,
        output_path: outputPath,
        strength: 0.8,
      },
      {
        timeout: TIMEOUT.HEAVY_GEN,
      },
    );

    if (response.data?.status === 'success' && response.data?.output_path) {
      if (await fs.pathExists(response.data.output_path)) {
        Logger.info('[inpaint] Inpainting succeeded', {
          outputPath: response.data.output_path,
        });
        return {
          outputVideoPath: response.data.output_path,
          usedFallback: false,
        };
      }
    }

    throw new Error(`Unexpected Docker response: ${JSON.stringify(response.data)}`);
  } catch (err: any) {
    Logger.warn('[inpaint] Docker call failed, copying original to output', {
      error: err.message,
    });

    // Fallback: copy original video to output
    await fs.copy(videoPath, outputPath);

    return {
      outputVideoPath: outputPath,
      usedFallback: true,
      error: err.message,
    };
  }
}

/**
 * Applies inpainting to remove objects and returns the output path.
 * Always returns a valid output path (copies original on fallback).
 *
 * @param videoPath   - Absolute path to input video
 * @param maskRegions - Array of MaskRegion objects
 * @param outputPath  - Absolute path for output video
 */
export async function removeObjects(
  videoPath: string,
  maskRegions: MaskRegion[],
  outputPath: string,
): Promise<string> {
  const result = await inpaintObjects(videoPath, maskRegions, outputPath);
  return result.outputVideoPath;
}
