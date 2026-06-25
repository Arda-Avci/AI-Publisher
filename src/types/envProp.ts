import { z } from 'zod';

export const EnvCategorySchema = z.enum([
  'indoor', 'outdoor', 'fantasy', 'sci-fi', 'historical',
  'nature', 'urban', 'abstract', 'custom',
]);

export const PropCategorySchema = z.enum([
  'furniture', 'vehicle', 'weapon', 'technology', 'natural',
  'decoration', 'lighting', 'costume', 'food', 'animal', 'custom',
]);

export const EnvironmentSchema = z.object({
  id: z.number().optional(),
  user_id: z.number().optional(),
  name: z.string().min(1).max(100),
  category: EnvCategorySchema,
  description: z.string().max(500).default(''),
  mood_tags: z.array(z.string()).default([]),
  color_palette: z.array(z.string()).default([]),
  lighting_notes: z.string().default(''),
  reference_image_url: z.string().optional(),
  is_favorite: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const PropSchema = z.object({
  id: z.number().optional(),
  user_id: z.number().optional(),
  name: z.string().min(1).max(100),
  category: PropCategorySchema,
  description: z.string().max(500).default(''),
  environment_id: z.number().nullable().optional(),
  interaction_notes: z.string().default(''),
  reference_image_url: z.string().optional(),
  is_favorite: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;
export type Prop = z.infer<typeof PropSchema>;
export type EnvCategory = z.infer<typeof EnvCategorySchema>;
export type PropCategory = z.infer<typeof PropCategorySchema>;
