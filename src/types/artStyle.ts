import { z } from 'zod';

export const ArtStyleSchema = z.enum([
  'realistic',
  'photorealistic',
  'cinematic',
  'anime',
  '3d-render',
  'cartoon',
  'oil-painting',
  'watercolor',
  'illustration',
  'comic-book',
  'pixel-art',
]);

export type ArtStyle = z.infer<typeof ArtStyleSchema>;

export interface ArtStylePreset {
  id: string;
  name: string;
  style: ArtStyle;
  description: string;
  visualKeywords: string[];
  moodTags: string[];
  colorPalette: string[];
  lightingDescription: string;
  referenceDirectors?: string[];
}
