import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { Logger } from '../lib/logger.js';
import { TIMEOUT } from '../constants.js';

export interface PhysicsConstraint {
  domain: string;
  rule: string;
  severity: 'critical' | 'important' | 'suggestion';
  promptInjection: string;
}

const PhysicsSchema = z.object({
  constraints: z.array(z.object({
    domain: z.string(),
    rule: z.string(),
    severity: z.enum(['critical', 'important', 'suggestion']),
    promptInjection: z.string(),
  })),
  overallNote: z.string(),
});

export async function getPhysicsConstraints(
  sceneDescription: string,
): Promise<{ constraints: PhysicsConstraint[]; overallNote: string }> {
  const models = getAIModelChain();

  const result = await withFallbackAndRetry(
    (model) =>
      generateObject({
        model,
        schema: PhysicsSchema,
        abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
        prompt: `You are a physics advisor for AI video generation. Analyze this scene and identify physics rules that the video generator must respect to avoid physically impossible visuals.

Scene: "${sceneDescription}"

For each physics domain (gravity, fluid dynamics, optics, thermodynamics, mechanics, acoustics, electromagnetism, materials science) that applies:

1. domain: physics domain name
2. rule: specific law or principle
3. severity: critical (would break immersion), important (would look wrong), suggestion (minor improvement)
4. promptInjection: an English sentence to inject into the video generation prompt, written as an instruction (e.g. "Water must flow downward遵循重力", "Shadows must be consistent with a single light source above-left")

Return also an overallNote summarizing the key physics constraints.`,
      }),
    models,
    2,
    5000,
    true,
  );

  Logger.info('[PhysicsAdvisor] Constraints:', {
    count: result.object.constraints.length,
    critical: result.object.constraints.filter(c => c.severity === 'critical').length,
  });

  return {
    constraints: result.object.constraints,
    overallNote: result.object.overallNote,
  };
}

export function injectPhysicsIntoPrompt(
  basePrompt: string,
  constraints: PhysicsConstraint[],
): string {
  const critical = constraints.filter(c => c.severity === 'critical').map(c => c.promptInjection);
  const important = constraints.filter(c => c.severity === 'important').map(c => c.promptInjection);

  const injections = [...critical, ...important];

  if (injections.length === 0) return basePrompt;

  return `${basePrompt}\n\n[Physics Constraints]\n${injections.join('\n')}`;
}
