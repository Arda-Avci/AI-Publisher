import { z } from 'zod';
import { Logger } from '../lib/logger.js';
import { db } from '../db.js';

export const BrandColorSchema = z.object({
  name: z.string().min(1),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  usage: z.enum(['primary', 'secondary', 'accent', 'neutral', 'text', 'background']),
});

export const BrandFontSchema = z.object({
  family: z.string().min(1),
  weight: z.number().int().min(100).max(900),
  usage: z.enum(['heading', 'body', 'display', 'monospace']),
  url: z.string().url().optional(),
});

export const BrandBookSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  colors: z.array(BrandColorSchema).max(20).default([]),
  fonts: z.array(BrandFontSchema).max(10).default([]),
  logoUrl: z.string().url().optional(),
  voiceGuidelines: z.string().max(5000).optional(),
  visualGuidelines: z.string().max(5000).optional(),
  doDonts: z.array(z.object({
    type: z.enum(['do', 'dont']),
    text: z.string(),
  })).default([]),
});

export type BrandBook = z.infer<typeof BrandBookSchema> & {
  id: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

export async function createBrandBook(userId: number, data: z.infer<typeof BrandBookSchema>): Promise<BrandBook> {
  const parsed = BrandBookSchema.parse(data);
  const result = await db.run(
    `INSERT INTO brand_books (user_id, name, description, colors, fonts, logo_url, voice_guidelines,
      visual_guidelines, do_donts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      userId,
      parsed.name,
      parsed.description ?? null,
      JSON.stringify(parsed.colors),
      JSON.stringify(parsed.fonts),
      parsed.logoUrl ?? null,
      parsed.voiceGuidelines ?? null,
      parsed.visualGuidelines ?? null,
      JSON.stringify(parsed.doDonts),
    ],
  );
  const id = result.lastID!;
  Logger.info('[BrandGuide] Created brand book:', { id, userId, name: parsed.name });
  return getBrandBookById(id)! as Promise<BrandBook>;
}

export async function getBrandBookById(id: number): Promise<BrandBook | null> {
  const row = await db.get(
    'SELECT * FROM brand_books WHERE id = ?', [id],
  );
  return row ? rowToBrandBook(row as Record<string, unknown>) : null;
}

export async function listBrandBooks(userId: number): Promise<BrandBook[]> {
  const rows = await db.all(
    'SELECT * FROM brand_books WHERE user_id = ? ORDER BY updated_at DESC', [userId],
  );
  return (rows as Record<string, unknown>[]).map(rowToBrandBook);
}

export async function updateBrandBook(
  id: number,
  userId: number,
  data: Partial<z.infer<typeof BrandBookSchema>>,
): Promise<BrandBook | null> {
  const existing = await getBrandBookById(id);
  if (!existing || existing.userId !== userId) return null;

  const sets: string[] = [];
  const vals: unknown[] = [];

  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description); }
  if (data.colors !== undefined) { sets.push('colors = ?'); vals.push(JSON.stringify(data.colors)); }
  if (data.fonts !== undefined) { sets.push('fonts = ?'); vals.push(JSON.stringify(data.fonts)); }
  if (data.logoUrl !== undefined) { sets.push('logo_url = ?'); vals.push(data.logoUrl); }
  if (data.voiceGuidelines !== undefined) { sets.push('voice_guidelines = ?'); vals.push(data.voiceGuidelines); }
  if (data.visualGuidelines !== undefined) { sets.push('visual_guidelines = ?'); vals.push(data.visualGuidelines); }
  if (data.doDonts !== undefined) { sets.push('do_donts = ?'); vals.push(JSON.stringify(data.doDonts)); }

  if (sets.length === 0) return existing;

  sets.push("updated_at = datetime('now')");
  vals.push(id);

  await db.run(`UPDATE brand_books SET ${sets.join(', ')} WHERE id = ?`, vals);
  Logger.info('[BrandGuide] Updated brand book:', { id });
  return getBrandBookById(id);
}

export async function deleteBrandBook(id: number, userId: number): Promise<boolean> {
  const existing = await getBrandBookById(id);
  if (!existing || existing.userId !== userId) return false;
  await db.run('DELETE FROM brand_books WHERE id = ?', [id]);
  Logger.info('[BrandGuide] Deleted brand book:', { id });
  return true;
}

function rowToBrandBook(row: Record<string, unknown>): BrandBook {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    name: row.name as string,
    description: row.description as string | undefined,
    colors: JSON.parse(row.colors as string || '[]'),
    fonts: JSON.parse(row.fonts as string || '[]'),
    logoUrl: row.logo_url as string | undefined,
    voiceGuidelines: row.voice_guidelines as string | undefined,
    visualGuidelines: row.visual_guidelines as string | undefined,
    doDonts: JSON.parse(row.do_donts as string || '[]'),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
