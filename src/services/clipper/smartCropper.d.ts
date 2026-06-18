/**
 * Smart Cropper Service
 * FFmpeg + OpenCV/DNN face-tracking crop to 9:16 vertical format
 *
 * @example
 * const result = await smartCropper.cropVideo(inputPath, outputPath, {
 *   targetFocus: 'face',
 *   aspectRatio: '9:16',
 *   outputWidth: 1080,
 *   outputHeight: 1920,
 * });
 */
import type { CropAspectRatio, FaceBox, CropRegion, SmartCropOptions, SmartCropResult } from '../../types/clipper.js';
/**
 * Detect face bounding boxes in a video frame using OpenCV Haar Cascade.
 * Runs in a worker thread to avoid blocking the main thread.
 *
 * @param videoPath - Path to the video file
 * @param timestamp - Timestamp in seconds to extract frame for detection
 * @returns Detected face boxes with confidence scores
 */
export declare function detectFaceBox(videoPath: string, timestamp: number): Promise<FaceBox[]>;
/**
 * Compute optimal crop region centered on the detected face.
 * Ensures the face is centered with comfortable padding and no extra black space.
 *
 * @param faceBox - Normalized face bounding box (0-1 range)
 * @param targetRatio - Target aspect ratio
 * @param videoWidth - Source video width in pixels
 * @param videoHeight - Source video height in pixels
 * @param paddingRatio - Extra padding around face (default 0.3 = 30%)
 * @returns Pixel-level crop region
 */
export declare function computeCropRegion(faceBox: FaceBox, targetRatio: CropAspectRatio | [number, number], videoWidth: number, videoHeight: number, paddingRatio?: number): CropRegion;
/**
 * Compute center-based crop region (no face tracking)
 */
export declare function computeCenterCropRegion(targetRatio: CropAspectRatio | [number, number], videoWidth: number, videoHeight: number): CropRegion;
/**
 * Crop a video to the target aspect ratio using FFmpeg.
 * Applies crop, scale, and pad filters to guarantee exact output dimensions.
 *
 * @param inputPath - Source video path
 * @param outputPath - Destination video path
 * @param cropRegion - Crop region in pixel coordinates
 * @param outputWidth - Output width in pixels (default 1080)
 * @param outputHeight - Output height in pixels (default 1920)
 * @param duration - Optional: trim to this duration (seconds)
 */
export declare function cropVideo(inputPath: string, outputPath: string, cropRegion: CropRegion, outputWidth?: number, outputHeight?: number, duration?: number): Promise<void>;
export declare class SmartCropper {
    /**
     * Crop a video segment to the target aspect ratio with smart focus tracking.
     *
     * @param inputPath - Source video path
     * @param outputPath - Destination video path
     * @param options - Smart crop options
     * @returns Smart crop result with crop region and detected faces
     */
    cropVideo(inputPath: string, outputPath: string, options: SmartCropOptions): Promise<SmartCropResult>;
    /**
     * Sample face detection across video duration
     */
    private sampleFaceDetection;
    /**
     * Smooth face box positions using a rolling average
     */
    private smoothFaceBoxes;
    /**
     * Select the best face box (largest area with sufficient confidence)
     */
    private selectBestFace;
    /**
     * Get video dimensions via ffprobe
     */
    private getVideoDimensions;
    /**
     * Per-frame dinamik yüz takibi ile kare kare kırpma (v2).
     * Her chunk için interpolasyonlu yüz konumu kullanarak akıcı hareket sağlar.
     */
    cropPerFrame(inputPath: string, outputPath: string, options?: {
        aspectRatio?: CropAspectRatio;
        outputWidth?: number;
        outputHeight?: number;
        chunkDuration?: number;
        fallbackToCenter?: boolean;
        smoothingWindow?: number;
    }): Promise<import('./perFrameCropper.js').PerFrameCropResult>;
}
export declare const smartCropper: SmartCropper;
//# sourceMappingURL=smartCropper.d.ts.map