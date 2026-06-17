/**
 * Transcript Editor Routes — cut videos by transcript word deletion
 * POST /api/v1/transcript/cut — remove words/ranges from video based on transcript
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Logger } from '../lib/logger.js';
import {
  parseTranscriptEdits,
  cutVideoByTranscript,
  type TimeRange,
} from '../services/transcriptEditor.js';
import { transcribeVideoAudioWithTimestamps } from '../lib/audio-transcriber.js';
import path from 'path';
import fs from 'fs-extra';

const router = Router();

/**
 * POST /api/v1/transcript/cut
 * Remove time ranges from video based on transcript word deletions.
 *
 * Body: {
 *   videoPath: string,
 *   deletions?: number[],      // word indices to delete
 *   keepRanges?: TimeRange[],  // OR: explicit time ranges to keep
 *   outputPath?: string
 * }
 */
router.post('/cut', requireAuth, async (req, res) => {
  try {
    const { videoPath, deletions, keepRanges, outputPath } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: 'videoPath required' });
    }

    const resolved = path.isAbsolute(videoPath) ? videoPath : path.join(process.cwd(), videoPath);
    if (!(await fs.pathExists(resolved))) {
      return res.status(400).json({ error: 'Video file not found' });
    }

    const outPath = outputPath || resolved.replace(/\.\w+$/, '_edited.mp4');

    // Transcribe if deletions provided but no keepRanges
    const finalKeepRanges: TimeRange[] = keepRanges || [];
    if (deletions?.length && !keepRanges) {
      const { segments } = await transcribeVideoAudioWithTimestamps(resolved);
      const allWords = segments.flatMap((s) => s.words || []);
      const transcript = allWords.map((w) => w.word).join(' ');
      const rangesToRemove = parseTranscriptEdits(transcript, deletions, allWords);

      // Invert: keep everything EXCEPT the removed ranges
      const duration = segments[segments.length - 1]?.end || 0;
      let cursor = 0;
      for (const r of rangesToRemove.sort((a, b) => a.start - b.start)) {
        if (r.start > cursor) {
          finalKeepRanges.push({ start: cursor, end: r.start });
        }
        cursor = r.end;
      }
      if (cursor < duration) {
        finalKeepRanges.push({ start: cursor, end: duration });
      }
    }

    await cutVideoByTranscript(resolved, finalKeepRanges, outPath);
    res.json({ outputPath: outPath, keptRanges: finalKeepRanges });
  } catch (err: any) {
    Logger.error('[TranscriptEditor] Cut failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
