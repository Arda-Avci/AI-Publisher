// src/lib/transcript.ts
// YouTube transcript extraction using the youtube-transcript npm package.
//
// We use a dynamic import because some environments (older Node) do not
// resolve the default export synchronously and we want a graceful failure
// path on missing captions.

export interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

export interface TranscriptResult {
  videoId: string;
  raw: TranscriptItem[];
  plainText: string;
  fetchedAt: number;
}

/**
 * Fetch the full transcript for a YouTube video and return both the raw
 * segments and the joined plain text. Throws on failure.
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptResult> {
  if (!videoId || typeof videoId !== 'string') {
    throw new Error('fetchYouTubeTranscript: videoId is required');
  }
  const cleanId = videoId.trim();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(cleanId)) {
    throw new Error('fetchYouTubeTranscript: invalid YouTube video id');
  }

  // Dynamic import — keeps startup fast and tolerates install issues
  // (e.g. on machines where youtube-transcript has not been installed yet).
  // The package's public API exposes fetchTranscript via ESM/CJS interop.
  const mod: any = await import('youtube-transcript');
  const fetchTranscript = mod.fetchTranscript || mod.default?.fetchTranscript;
  if (typeof fetchTranscript !== 'function') {
    throw new Error('youtube-transcript package not available or API mismatch');
  }

  const items: TranscriptItem[] = await fetchTranscript(cleanId);
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('No transcript items returned for video ' + cleanId);
  }

  const plainText = items
    .map((seg) => (seg?.text || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([.,!?;:])/g, '$1');

  return {
    videoId: cleanId,
    raw: items,
    plainText,
    fetchedAt: Date.now()
  };
}
