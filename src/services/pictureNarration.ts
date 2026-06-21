/**
 * Picture Narration Service
 * Automatically generates visual prompts and composition descriptions
 * from text content (paragraphs, chapters)
 */

import axios from 'axios';
import { dockerHost } from '../lib/docker-host.js';
import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../lib/logger.js';

export interface NarrationBlock {
  id: string;
  type: 'paragraph' | 'chapter' | 'scene';
  text: string;
  visualPrompt?: string;
  composition?: string;
  audioFile?: string;
  subtitleFile?: string;
}

export interface NarrationResult {
  blocks: NarrationBlock[];
  totalDuration: number;
}

/**
 * Analyze text content and identify structure
 */
function analyzeStructure(text: string): { paragraphs: string[]; chapters: string[] } {
  // Split by double newlines or chapter markers
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Detect chapters (lines starting with numbers or "Chapter")
  const chapterMarkers = text
    .split(/\n/)
    .filter((line) => /^(Chapter|Bölüm|Part|Section)\s*\d+/i.test(line.trim()));

  const chapters = chapterMarkers.map((c) => c.trim());

  return { paragraphs, chapters };
}

/**
 * Generate visual prompt from text
 */
function generateVisualPrompt(text: string, type: string): string {
  // Create a descriptive visual prompt based on text content
  const truncated = text.length > 200 ? text.substring(0, 200) + '...' : text;

  const style = type === 'chapter' ? 'cinematic, wide shot' : 'detailed, close-up';

  return `Scene: ${truncated}, ${style}, dramatic lighting, high detail, 4K quality`;
}

/**
 * Generate composition description
 */
function generateComposition(text: string): string {
  const length = text.length;

  if (length < 50) {
    return 'Single subject centered, minimalist composition';
  } else if (length < 150) {
    return 'Two subjects, rule of thirds, balanced framing';
  } else {
    return 'Wide establishing shot, multiple elements, dynamic composition';
  }
}

/**
 * Process text content into narration blocks
 */
export async function processNarration(
  text: string,
  options: {
    generateImages?: boolean;
    generateAudio?: boolean;
    generateSubtitles?: boolean;
    language?: string;
  } = {},
): Promise<NarrationResult> {
  Logger.info(`Processing narration for text (${text.length} chars)`);

  const { generateImages = true, language = 'en' } = options;

  const { paragraphs, chapters } = analyzeStructure(text);
  const blocks: NarrationBlock[] = [];

  let id = 1;

  // Process chapters
  for (const chapter of chapters) {
    const block: NarrationBlock = {
      id: `block-${id++}`,
      type: 'chapter',
      text: chapter,
    };

    if (generateImages) {
      block.visualPrompt = generateVisualPrompt(chapter, 'chapter');
      block.composition = generateComposition(chapter);
    }

    blocks.push(block);
  }

  // Process paragraphs
  for (const paragraph of paragraphs) {
    const block: NarrationBlock = {
      id: `block-${id++}`,
      type: 'paragraph',
      text: paragraph,
    };

    if (generateImages) {
      block.visualPrompt = generateVisualPrompt(paragraph, 'paragraph');
      block.composition = generateComposition(paragraph);
    }

    blocks.push(block);
  }

  // Estimate total duration (average 2 seconds per paragraph)
  const totalDuration = blocks.filter((b) => b.type === 'paragraph').length * 2;

  Logger.info(`Narration processed: ${blocks.length} blocks, ~${totalDuration}s duration`);

  return { blocks, totalDuration };
}

/**
 * Generate visual assets for a narration block
 */
export async function generateBlockAssets(
  block: NarrationBlock,
): Promise<{ imageUrl?: string; audioUrl?: string; subtitleUrl?: string }> {
  Logger.info(`Generating assets for block ${block.id}`);

  // Placeholder - actual asset generation will connect to Docker/media services
  const result: { imageUrl?: string; audioUrl?: string; subtitleUrl?: string } = {};

  if (block.visualPrompt) {
    const sdUrl = dockerHost.getUrl('stablediffusion');
    try {
      const resp = await axios.post(
        `${sdUrl}/generate-image`,
        {
          prompt: block.visualPrompt,
          output_path: path.join(process.cwd(), 'videolar', `image-${block.id}.png`),
        },
        { timeout: 120000 },
      );
      result.imageUrl = resp.data?.output_path || `generated://image-${block.id}.png`;
    } catch (err: any) {
      Logger.warn('[pictureNarration] Image generation via Docker failed', { error: err.message });
      result.imageUrl = `generated://image-${block.id}.png`;
    }
  }

  if (block.text) {
    const xttsUrl = dockerHost.getUrl('xtts');
    try {
      const resp = await axios.post(
        `${xttsUrl}/tts`,
        {
          text: block.text,
          output_path: path.join(process.cwd(), 'videolar', `audio-${block.id}.mp3`),
        },
        { timeout: 120000 },
      );
      result.audioUrl = resp.data?.output_path || `generated://audio-${block.id}.mp3`;
    } catch (err: any) {
      Logger.warn('[pictureNarration] TTS via Docker failed', { error: err.message });
      result.audioUrl = `generated://audio-${block.id}.mp3`;
    }
  }

  // Generate subtitle file (SRT format) from text
  try {
    const subtitleDir = path.join(process.cwd(), 'videolar');
    const srtPath = path.join(subtitleDir, `subtitle-${block.id}.srt`);
    await fs.ensureDir(subtitleDir);

    const words = block.text.split(/\s+/);
    const durationPerWord = 0.4; // seconds
    // Estimate 3 words per subtitle line, 2 lines max
    const lines: string[] = [];
    let lineNum = 1;
    for (let i = 0; i < words.length; i += 6) {
      const chunk = words.slice(i, i + 6).join(' ');
      if (!chunk) continue;
      const startSec = i * durationPerWord;
      const endSec = Math.min((i + 6) * durationPerWord, words.length * durationPerWord);
      const fmt = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${sec.toFixed(3).padStart(6, '0').replace('.', ',')}`;
      };
      lines.push(`${lineNum++}\n${fmt(startSec)} --> ${fmt(endSec)}\n${chunk}\n`);
    }
    await fs.writeFile(srtPath, lines.join('\n'));
    result.subtitleUrl = srtPath;
    Logger.info('[pictureNarration] Subtitle file generated', { srtPath, lines: lines.length });
  } catch (err: any) {
    Logger.warn('[pictureNarration] Subtitle generation failed', { error: err.message });
  }

  return result;
}

/**
 * Combine narration blocks into final video content
 */
export async function composeNarrationVideo(
  blocks: NarrationBlock[],
): Promise<{ videoUrl: string; subtitleFile?: string }> {
  Logger.info(`Composing narration video from ${blocks.length} blocks`);

  // Placeholder - actual composition will use FFmpeg
  return {
    videoUrl: `generated://narration-${Date.now()}.mp4`,
    subtitleFile: `generated://narration-${Date.now()}.srt`,
  };
}
