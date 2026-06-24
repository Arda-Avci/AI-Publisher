import { registerGeminiProvider, GeminiCompletion } from '@crewai-ts/gemini';
import { Logger } from '../../lib/logger.js';

registerGeminiProvider();

export function getCrewaiGemini(model = 'gemini-2.5-flash') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    Logger.warn('[CrewAI] GEMINI_API_KEY bulunamadi, CrewAI agentler Gemini kullanamaz');
  }
  return new GeminiCompletion({
    model,
    apiKey,
  });
}

export function crewaiLogger(agentName: string) {
  return {
    info: (msg: string) => Logger.info(`[CrewAI:${agentName}] ${msg}`),
    warn: (msg: string) => Logger.warn(`[CrewAI:${agentName}] ${msg}`),
    error: (msg: string) => Logger.error(`[CrewAI:${agentName}] ${msg}`),
    debug: (msg: string) => Logger.debug(`[CrewAI:${agentName}] ${msg}`),
  };
}
