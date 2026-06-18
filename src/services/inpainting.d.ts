/**
 * Video Inpainting Service
 *
 * Removes unwanted objects from videos by calling the Colab `/api/v1/inpaint` endpoint.
 * Uses mask regions to specify areas to be inpainted and replaced with generated content.
 *
 * @module services/inpainting
 */
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
export declare function inpaintObjects(videoPath: string, maskRegions: MaskRegion[], outputPath: string): Promise<InpaintResult>;
/**
 * Applies inpainting to remove objects and returns the output path.
 * Always returns a valid output path (copies original on fallback).
 *
 * @param videoPath   - Absolute path to input video
 * @param maskRegions - Array of MaskRegion objects
 * @param outputPath  - Absolute path for output video
 */
export declare function removeObjects(videoPath: string, maskRegions: MaskRegion[], outputPath: string): Promise<string>;
//# sourceMappingURL=inpainting.d.ts.map