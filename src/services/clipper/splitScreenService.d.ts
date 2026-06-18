/**
 * Split Screen Service
 * Vertical/horizontal split-screen, mascot overlay, and PIP video composition
 */
/** Split screen layout options */
export interface SplitScreenOptions {
    /** Gap in pixels between videos (default: 0) */
    gapPx?: number;
    /** Border color in hex (default: 'black') */
    borderColor?: string;
    /** Border width in pixels (default: 0) */
    borderWidth?: number;
    /** Transition type between clips (default: 'none') */
    transitionType?: 'none' | 'dissolve' | 'wipe';
    /** Output width (auto if not specified) */
    outputWidth?: number;
    /** Output height (auto if not specified) */
    outputHeight?: number;
}
/** Mascot/avatar overlay position */
export interface OverlayPosition {
    /** X coordinate or expression (e.g., 'W-w-20') */
    x: number | string;
    /** Y coordinate or expression (e.g., 'H-h-20') */
    y: number | string;
    /** Scale factor (0.0-1.0, default: 1.0) */
    scale?: number;
    /** Opacity (0.0-1.0, default: 1.0) */
    opacity?: number;
}
/** Animation type for mascot overlay */
export type AnimationType = 'float' | 'bounce' | 'blink';
/** PIP position preset */
export type PipPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
/**
 * Create vertical (top/bottom) split-screen video
 * @param topVideo - Path to top video
 * @param bottomVideo - Path to bottom video
 * @param output - Output file path
 * @param options - Split screen options
 */
export declare function splitScreenVertical(topVideo: string, bottomVideo: string, output: string, options?: SplitScreenOptions): Promise<void>;
/**
 * Create horizontal (left/right) split-screen video
 * @param leftVideo - Path to left video
 * @param rightVideo - Path to right video
 * @param output - Output file path
 * @param options - Split screen options
 */
export declare function splitScreenHorizontal(leftVideo: string, rightVideo: string, output: string, options?: SplitScreenOptions): Promise<void>;
/**
 * Create grid split-screen from multiple videos
 * @param videos - Array of video paths
 * @param output - Output file path
 * @param gridCols - Number of columns (default: 2)
 */
export declare function splitScreenGrid(videos: string[], output: string, gridCols?: number): Promise<void>;
/**
 * Overlay a mascot/avatar PNG on video at specified position
 * @param videoPath - Path to main video
 * @param mascotPngPath - Path to mascot PNG (with alpha)
 * @param output - Output file path
 * @param position - Overlay position coordinates
 */
export declare function overlayMascot(videoPath: string, mascotPngPath: string, output: string, position: OverlayPosition): Promise<void>;
/**
 * Overlay a mascot with animation effects
 * @param videoPath - Path to main video
 * @param mascotPngPath - Path to mascot PNG (with alpha)
 * @param output - Output file path
 * @param animType - Animation type: 'float' (gentle vertical oscillation), 'bounce' (drop from top), 'blink' (toggle visibility)
 */
export declare function overlayMascotWithAnimation(videoPath: string, mascotPngPath: string, output: string, animType: AnimationType): Promise<void>;
/**
 * Picture-in-Picture overlay (secondary video in corner of primary)
 * @param mainVideo - Path to main video (background)
 * @param pipVideo - Path to PIP video (overlay)
 * @param output - Output file path
 * @param position - PIP position preset
 */
export declare function pipOverlay(mainVideo: string, pipVideo: string, output: string, position: PipPosition): Promise<void>;
//# sourceMappingURL=splitScreenService.d.ts.map