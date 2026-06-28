/**
 * Extended Clipper Types
 * Smart Cropper and Subtitle Mixer type definitions
 */


// ── Smart Cropper Types ──────────────────────────────────────────────────────

/** Focus mode for smart cropping */
export type TargetFocus = 'face' | 'center' | 'motion';

/** Target aspect ratio for cropping */
export type CropAspectRatio = '9:16' | '16:9' | '1:1' | '4:5';

/** Single face bounding box from detection */
export interface FaceBox {
  x: number; // top-left x
  y: number; // top-left y
  width: number;
  height: number;
  confidence: number;
}

/** Crop region in pixel coordinates */
export interface CropRegion {
  x: number; // top-left crop x
  y: number; // top-left crop y
  width: number;
  height: number;
}

/** Result of face detection on a single frame */
export interface DetectionFrame {
  timestamp: number;
  faceBoxes: FaceBox[];
  motionScore?: number;
}

/** Smart crop options */
export interface SmartCropOptions {
  /** Focus mode: 'face' uses detected face center, 'center' uses video center, 'motion' uses motion vectors */
  targetFocus: TargetFocus;
  /** Target aspect ratio string (e.g. '9:16') or [w, h] tuple */
  aspectRatio: CropAspectRatio | [number, number];
  /** Output width in pixels (default 1080 for 9:16) */
  outputWidth?: number;
  /** Output height in pixels (default 1920 for 9:16) */
  outputHeight?: number;
  /** Video path for face detection (if not provided, detection is skipped and center crop is used) */
  inputPath?: string;
  /** Minimum face confidence threshold (0-1) */
  minFaceConfidence?: number;
  /** Smoothing window for face tracking (number of frames) */
  smoothingWindow?: number;
  /** Padding ratio around face for comfortable framing (default 0.3 = 30%) */
  facePadding?: number;
}

/** Smart crop result */
export interface SmartCropResult {
  outputPath: string;
  cropRegion: CropRegion;
  detectedFaces: FaceBox[];
  duration: number;
}

// ── Subtitle Mixer Types ──────────────────────────────────────────────────────

/** Word-level transcript segment from Whisper */
export interface WhisperWord {
  word: string;
  start: number; // seconds
  end: number; // seconds
  confidence: number;
}

/** SRT subtitle entry */
export interface SrtEntry {
  index: number;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
}

/** Subtitle style options */
export interface SubtitleStyleOptions {
  /** Primary font color (hex) */
  primaryColor?: string;
  /** Background color for subtitle box (hex, optional) */
  backgroundColor?: string;
  /** Font size relative to video height (default 0.04 = 4%) */
  fontSizeRatio?: number;
  /** Font family name */
  fontFamily?: string;
  /** Bold text */
  bold?: boolean;
  /** Text position: 'bottom' | 'top' | 'center' */
  position?: 'bottom' | 'top' | 'center';
  /** Horizontal margin from edge */
  marginX?: number;
  /** Vertical margin from edge */
  marginY?: number;
}

/** Audio ducking options */
export interface AudioDuckingOptions {
  /** Threshold in dB below which music is ducked (default -20) */
  thresholdDb?: number;
  /** Attack time in seconds (default 0.3) */
  attackSec?: number;
  /** Release time in seconds (default 0.8) */
  releaseSec?: number;
  /** Amount to reduce music volume by (default 0.15 = 85% reduction) */
  duckingAmount?: number;
}

/** Subtitle mixer options */
export interface SubtitleMixerOptions {
  /** SRT file path (if not provided, generated from transcript) */
  srtPath?: string;
  /** Output path for mixed video */
  outputPath: string;
  /** Subtitle style options */
  subtitleStyle?: SubtitleStyleOptions;
  /** Background music path (optional) */
  musicPath?: string;
  /** Background music volume (0.0-1.0, default 0.15) */
  musicVolume?: number;
  /** Audio ducking options (if voicePath provided) */
  duckingOptions?: AudioDuckingOptions;
  /** Voice/speech audio path for ducking (optional) */
  voicePath?: string;
}

/** Subtitle mixer result */
export interface SubtitleMixerResult {
  outputPath: string;
  srtPath?: string;
  duration: number;
  subtitlesEmbedded: boolean;
  musicMixed: boolean;
  duckingApplied: boolean;
}
