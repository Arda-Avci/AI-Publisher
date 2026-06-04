// Ambient module declarations for npm packages that don't ship their own
// type definitions. The runtime package is resolved normally; this file
// exists purely to satisfy the TypeScript type-checker.

declare module 'youtube-transcript' {
  export interface TranscriptSegment {
    text: string;
    duration: number;
    offset: number;
  }
  export function fetchTranscript(videoId: string): Promise<TranscriptSegment[]>;
  const _default: { fetchTranscript: typeof fetchTranscript };
  export default _default;
}
