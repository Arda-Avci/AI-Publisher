import { Logger } from '../lib/logger.js';
import axios from 'axios';
import path from 'path';
import fs from 'fs-extra';

export interface CharacterImage {
  label: string;
  imageBase64: string;
  sourcePhotoPath?: string;
}

export interface AutoCameoResult {
  characterImages: CharacterImage[];
  mapping: Array<{
    character: string;
    sourceLabel: string;
    confidence: number;
  }>;
}

export async function extractCharacters(
  characterFeatures: string,
  materialPath?: string,
): Promise<CharacterImage[]> {
  const characters: CharacterImage[] = [];

  if (!characterFeatures) {
    Logger.info('[AutoCameo] No character features provided');
    return characters;
  }

  const lines = characterFeatures.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    const match = line.match(/@(\w+)/);
    if (match) {
      characters.push({
        label: match[1],
        imageBase64: '',
        sourcePhotoPath: materialPath,
      });
    }
  }

  return characters;
}

export async function generateAvatarImages(
  characters: CharacterImage[],
): Promise<CharacterImage[]> {
  const results: CharacterImage[] = [];

  for (const char of characters) {
    try {
      const COLAB_URL = process.env.COLAB_URL;
      if (!COLAB_URL) {
        Logger.warn(`[AutoCameo] COLAB_URL not set, skipping avatar for @${char.label}`);
        results.push(char);
        continue;
      }
      const response = await axios.post(`${COLAB_URL}/generate-avatar`, {
        character_label: char.label,
        source_image_base64: char.imageBase64 || undefined,
        style: 'pixar',
        output_format: 'png',
      });

      if (response?.data?.image_base64) {
        results.push({
          ...char,
          imageBase64: response.data.image_base64,
        });
        Logger.info(`[AutoCameo] Avatar generated for @${char.label}`);
      } else {
        Logger.warn(`[AutoCameo] No avatar returned for @${char.label}`);
        results.push(char);
      }
    } catch (err: any) {
      Logger.warn(`[AutoCameo] Avatar generation failed for @${char.label}: ${err.message}`);
      results.push(char);
    }
  }

  return results;
}

export async function saveCharacterImages(
  characters: CharacterImage[],
  jobId: number,
): Promise<string[]> {
  const outputDir = path.join(process.cwd(), 'videolar', `job_${jobId}`, 'characters');
  await fs.ensureDir(outputDir);

  const savedPaths: string[] = [];

  for (const char of characters) {
    if (!char.imageBase64) continue;

    const cleanB64 = char.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const outPath = path.join(outputDir, `${char.label}.png`);
    await fs.writeFile(outPath, Buffer.from(cleanB64, 'base64'));
    savedPaths.push(outPath);
    Logger.info(`[AutoCameo] Saved @${char.label} avatar to ${outPath}`);
  }

  return savedPaths;
}

export async function loadCharacterImages(jobId: number): Promise<Map<string, string>> {
  const charDir = path.join(process.cwd(), 'videolar', `job_${jobId}`, 'characters');
  const charMap = new Map<string, string>();

  if (!(await fs.pathExists(charDir))) return charMap;

  const files = await fs.readdir(charDir);
  for (const file of files) {
    if (!file.endsWith('.png')) continue;
    const label = path.basename(file, '.png');
    const filePath = path.join(charDir, file);
    const buffer = await fs.readFile(filePath);
    charMap.set(label, `data:image/png;base64,${buffer.toString('base64')}`);
  }

  return charMap;
}
