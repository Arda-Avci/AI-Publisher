import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * Returns the configured AI model for the system.
 * It will use Minimax if MINIMAX_API_KEY is provided in the environment variables,
 * otherwise it defaults to Gemini.
 */
export function getAIModel() {
  if (process.env.MINIMAX_API_KEY) {
    const minimax = createOpenAI({
      baseURL: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1',
      apiKey: process.env.MINIMAX_API_KEY,
    });

    const modelName = process.env.MINIMAX_MODEL || 'minimax-m3';
    return minimax(modelName);
  }

  // Fallback to Gemini 2.5 Flash
  return google('gemini-2.5-flash');
}
