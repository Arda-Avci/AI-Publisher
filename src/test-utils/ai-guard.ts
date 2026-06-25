export const hasAIConfig = !!(
  process.env.GEMINI_API_KEY ||
  process.env.ZEN_API_KEY ||
  process.env.MINIMAX_API_KEY ||
  process.env.ANTHROPIC_API_KEY
);

export const skipAITests = process.env.SKIP_AI_TESTS === 'true' || !hasAIConfig;
