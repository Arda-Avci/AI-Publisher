import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { Logger } from '../lib/logger.js';

export interface FfmpegCommand {
  description: string;
  filterComplex: string;
  args: string[];
  requiresInput: boolean;
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

const FfmpegSchema = z.object({
  description: z.string(),
  filterComplex: z.string(),
  args: z.array(z.string()),
  requiresInput: z.boolean(),
  estimatedComplexity: z.enum(['simple', 'moderate', 'complex']),
  warnings: z.array(z.string()),
});

export async function naturalLanguageToFfmpeg(
  instruction: string,
  context?: { hasAudio?: boolean; hasVideo?: boolean; durationSec?: number; resolution?: string },
): Promise<FfmpegCommand> {
  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: FfmpegSchema,
        abortSignal: AbortSignal.timeout(30000),
        prompt: `You translate natural language video editing instructions into FFmpeg commands.

Instruction: "${instruction}"

Context: ${JSON.stringify(context ?? {})}

Return:
- description: what this command does
- filterComplex: the -filter_complex string (or empty string if none)
- args: full FFmpeg argument array (include -i input placeholder as 'INPUT')
- requiresInput: whether this needs an input file
- estimatedComplexity: simple/moderate/complex
- warnings: any caveats or risks

Rules:
- Use standard FFmpeg syntax
- Prefer filter_complex for multi-step operations
- Keep args as a flat array like ['-i', 'INPUT', '-vf', 'scale=1280:720']
- If audio processing needed, include -c:a or -af appropriately`,
      }),
    models,
    2,
    5000,
    true,
  );

  Logger.info('[PlainLanguageEdit] Command generated:', {
    instruction: instruction.slice(0, 80),
    complexity: result.object.estimatedComplexity,
  });

  return result.object;
}

export async function executeNaturalLanguageEdit(
  instruction: string,
  inputPath: string,
  outputPath: string,
  context?: { hasAudio?: boolean; hasVideo?: boolean; durationSec?: number; resolution?: string },
): Promise<string> {
  const cmd = await naturalLanguageToFfmpeg(instruction, context);
  const { runFFmpegWithFallback } = await import('./videoService.js');

  const args = cmd.args.map(a => a === 'INPUT' ? inputPath : a);
  args.push(outputPath);

  Logger.info('[PlainLanguageEdit] Executing:', { args: args.join(' ') });
  await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);
  return outputPath;
}
