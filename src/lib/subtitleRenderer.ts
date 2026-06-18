/**
 * Subtitle Renderer — SRT/JSON parse + word-level timestamp generator
 * Powers DynamicCaptions with Hormozi-style word-by-word animated subtitles
 */

/**
 * Represents a single word with its timing information
 */
export interface WordTiming {
  word: string;
  start: number; // seconds
  end: number; // seconds
}

/**
 * Represents a subtitle cue (single SRT entry)
 */
interface SubtitleCue {
  index: number;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
}

/**
 * Parses SRT content into word-level timings
 * @param srtContent - Raw SRT file content
 * @returns Array of word timings with start/end in seconds
 */
export function parseSrtToWords(srtContent: string): WordTiming[] {
  const cues = parseSrtCues(srtContent);
  const words: WordTiming[] = [];

  for (const cue of cues) {
    const cueWords = cue.text
      .replace(/<[^>]+>/g, '') // strip HTML tags like <i>, </i>
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter((w) => w.length > 0);

    if (cueWords.length === 0) continue;

    const duration = cue.endTime - cue.startTime;
    const wordDuration = duration / cueWords.length;

    let currentTime = cue.startTime;
    for (const w of cueWords) {
      words.push({
        word: w,
        start: parseFloat(currentTime.toFixed(3)),
        end: parseFloat((currentTime + wordDuration).toFixed(3)),
      });
      currentTime += wordDuration;
    }
  }

  return words;
}

/**
 * Parses SRT content into subtitle cues (index, start, end, text)
 */
function parseSrtCues(srtContent: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const blocks = srtContent.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim());
    if (lines.length < 3) continue;

    const timeLine = lines[1];
    if (!timeLine) continue;
    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/,
    );
    if (!timeMatch) continue;

    const startTime =
      parseInt(timeMatch[1]!) * 3600 +
      parseInt(timeMatch[2]!) * 60 +
      parseInt(timeMatch[3]!) +
      parseInt(timeMatch[4]!) / 1000;

    const endTime =
      parseInt(timeMatch[5]!) * 3600 +
      parseInt(timeMatch[6]!) * 60 +
      parseInt(timeMatch[7]!) +
      parseInt(timeMatch[8]!) / 1000;

    const text = lines
      .slice(2)
      .join(' ')
      .replace(/<[^>]+>/g, '');

    cues.push({
      index: parseInt(lines[0] ?? '0') || cues.length + 1,
      startTime,
      endTime,
      text,
    });
  }

  return cues;
}

/**
 * Generates approximate word-level timings for plain text
 * Used when Whisper word timings are not available
 * @param text - Full subtitle text
 * @param duration - Total duration in seconds
 * @param wpm - Words per minute rate (default 150 for normal speech)
 * @returns Array of word timings
 */
export function generateWordTimings(
  text: string,
  duration: number,
  wpm: number = 150,
): WordTiming[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const wordDurationSec = 60 / wpm;
  const totalWordDuration = words.length * wordDurationSec;

  // Scale to fit actual duration
  const scale = duration / totalWordDuration;
  const scaledWordDuration = wordDurationSec * scale;

  const timings: WordTiming[] = [];
  let currentTime = 0;

  for (const word of words) {
    timings.push({
      word,
      start: parseFloat(currentTime.toFixed(3)),
      end: parseFloat((currentTime + scaledWordDuration).toFixed(3)),
    });
    currentTime += scaledWordDuration;
  }

  // Last word ends exactly at duration
  if (timings.length > 0) {
    const last = timings[timings.length - 1];
    if (last) {
      last.end = parseFloat(duration.toFixed(3));
    }
  }

  return timings;
}

/**
 * Aligns subtitle words to audio using a transcription file with word timings
 * Falls back to generateWordTimings if alignment data unavailable
 * @param srtContent - SRT subtitle content
 * @param _audioPath - Path to audio file (reserved for future ffmpeg/Whisper integration)
 * @returns Array of word timings aligned to audio
 */
export function alignSubtitlesToAudio(srtContent: string, _audioPath: string): WordTiming[] {
  // Try to extract word-level timing from SRT if available
  // In production this would use Whisper word timestamps or similar
  const words = parseSrtToWords(srtContent);
  if (words.length > 0) return words;

  // Fallback: generate approximate timings
  // This is handled by calling generateWordTimings externally
  return [];
}

/**
 * Parses a JSON subtitle format (e.g., from Whisper) into word timings
 * Expected format: { words: [{ word: string, start: number, end: number }] }
 * @param jsonContent - JSON subtitle content
 * @returns Array of word timings
 */
export function parseJsonSubtitles(jsonContent: string): WordTiming[] {
  try {
    const data = JSON.parse(jsonContent);
    const wordsArray = Array.isArray(data) ? data : data.words;

    if (!Array.isArray(wordsArray)) return [];

    return wordsArray
      .filter((w: any) => w && typeof w.word === 'string')
      .map((w: any) => ({
        word: w.word.trim(),
        start: parseFloat(String(w.start)) || 0,
        end: parseFloat(String(w.end)) || 0,
      }));
  } catch {
    return [];
  }
}

/**
 * Merges multiple word timing arrays into a single timeline
 * Used when combining multiple subtitle sources
 * @param arrays - Multiple word timing arrays
 * @returns Merged and sorted word timings
 */
export function mergeWordTimings(arrays: WordTiming[][]): WordTiming[] {
  const merged = arrays.flat();
  merged.sort((a, b) => a.start - b.start);
  return merged;
}

/**
 * Extracts clean text from SRT content (no timing data)
 * @param srtContent - Raw SRT content
 * @returns Plain text of all subtitles
 */
export function extractTextFromSrt(srtContent: string): string {
  const cues = parseSrtCues(srtContent);
  return cues.map((c) => c.text).join(' ');
}
