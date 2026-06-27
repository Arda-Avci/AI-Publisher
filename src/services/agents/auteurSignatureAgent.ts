import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { Logger } from '../../lib/logger.js';

export type AuteurStyle =
  | 'tarantino'
  | 'wess_anderson'
  | 'fincher'
  | 'kubrick'
  | 'spielberg'
  | 'nolan'
  | 'default';

export interface AuteurSuggestion {
  style: AuteurStyle;
  cameraDirections: string[];
  compositionRules: string[];
  colorPalette: string[];
  lightingNotes: string[];
  signatureMoves: string[];
}

const AuteurSchema = z.object({
  cameraDirections: z.array(z.string()),
  compositionRules: z.array(z.string()),
  colorPalette: z.array(z.string()),
  lightingNotes: z.array(z.string()),
  signatureMoves: z.array(z.string()),
});

const STYLE_DEFINITIONS: Record<AuteurStyle, string> = {
  tarantino: 'Quentin Tarantino — trunk shots, long take dialogue, overhead shots,glovebox shots,墨西哥 standoff, retro color palette, 35mm film grain',
  wess_anderson: 'Wes Anderson — deadpan center-framed symmetry, profile shots, whip pans, tracking shots, pastel color palette, Futura font, diorama-like sets, slow-motion walking shots',
  fincher: 'David Fincher — 17-take rule, green/teal palette, push-in dolly shots, dark shadows, intricate tracking shots, obsessive detail, moody atmosphere, digital intermediate',
  kubrick: 'Stanley Kubrick — one-point perspective, dolly zoom (Vertigo effect), symmetrical composition, wide-angle lenses, slow zoom in/out, clinical lighting, Steadicam following shots, classical music contrast',
  spielberg: 'Steven Spielberg — single-take walk-and-talk, lens flare, low-angle hero shots, dolly zoom on reaction, child POV, golden hour lighting, John Williams-esque orchestral swell',
  nolan: 'Christopher Nolan — non-linear time structure, IMAX cameras, practical effects, tilting shots, city-scale wide shots, muted color palette, time manipulation cross-cutting',
  default: 'Classic cinematic — variety of shot types, natural composition, balanced lighting, standard camera movements',
};

export async function suggestAuteurStyle(
  sceneDescription: string,
  preferredStyle?: AuteurStyle,
): Promise<AuteurSuggestion> {
  const style = preferredStyle || 'default';
  const styleDef = STYLE_DEFINITIONS[style];
  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: AuteurSchema,
        abortSignal: AbortSignal.timeout(30000),
        prompt: `You are a cinematography expert specializing in ${styleDef}.

For this scene description, provide auteur-specific camera and composition directions:

Scene: "${sceneDescription}"

Output:
- cameraDirections: 3-5 specific camera movement/placement instructions in this director's style
- compositionRules: 2-3 composition rules this director would apply
- colorPalette: 2-4 color grading notes specific to this director's aesthetic
- lightingNotes: 2-3 lighting style notes
- signatureMoves: 1-2 of this director's signature techniques applied to this scene`,
      }),
    models,
    2,
    5000,
    true,
  );

  Logger.info('[AuteurSignature] Style applied:', { style, scene: sceneDescription.slice(0, 60) });

  return {
    style,
    cameraDirections: result.object.cameraDirections,
    compositionRules: result.object.compositionRules,
    colorPalette: result.object.colorPalette,
    lightingNotes: result.object.lightingNotes,
    signatureMoves: result.object.signatureMoves,
  };
}
