import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import axios from 'axios';
import { Logger } from './logger.js';

// In-memory set to store temporarily disabled unhealthy Zen models
export const disabledZenModels = new Set<string>();
let zenProviderCache: any = null;

function getZenProvider() {
  if (zenProviderCache) return zenProviderCache;
  if (!process.env.ZEN_API_KEY) return null;

  zenProviderCache = createOpenAI({
    baseURL: process.env.ZEN_BASE_URL || 'https://opencode.ai/zen/v1',
    apiKey: process.env.ZEN_API_KEY,
    compatibility: 'compatible',
    fetch: async (url: any, options: any) => {
      Logger.info(`[AI] Zen API Fetching URL (Axios): ${url}`);
      
      let modifiedBody = options?.body;
      if (options?.body) {
        try {
          const bodyObj = JSON.parse(String(options.body));
          // Zen API reasoning models require high max_tokens to fit both reasoning and final content.
          if (!bodyObj.max_tokens && !bodyObj.max_completion_tokens) {
            bodyObj.max_tokens = 4000;
          } else if (bodyObj.max_tokens && bodyObj.max_tokens < 4000) {
            bodyObj.max_tokens = 4000;
          }
          if (bodyObj.response_format) {
            Logger.info('[AI] Zen API: response_format removed to prevent HTTP 500 error.');
            delete bodyObj.response_format;
          }
          if (bodyObj.tools) delete bodyObj.tools;
          if (bodyObj.tool_choice) delete bodyObj.tool_choice;
          modifiedBody = JSON.stringify(bodyObj);
        } catch (_) {}
      }

      try {
        const headers: Record<string, string> = {};
        if (options?.headers) {
          if (typeof (options.headers as any).forEach === 'function') {
            (options.headers as any).forEach((value: string, key: string) => {
              headers[key] = value;
            });
          } else {
            Object.entries(options.headers).forEach(([key, value]) => {
              headers[key] = String(value);
            });
          }
        }

        // Standardize Authorization header
        const authKey = Object.keys(headers).find(k => k.toLowerCase() === 'authorization');
        if (authKey && authKey !== 'Authorization') {
          headers['Authorization'] = headers[authKey];
          delete headers[authKey];
        }
        if (!headers['Authorization'] && process.env.ZEN_API_KEY) {
          headers['Authorization'] = `Bearer ${process.env.ZEN_API_KEY}`;
        }

        // Standardize Content-Type header
        const contentTypeKey = Object.keys(headers).find(k => k.toLowerCase() === 'content-type');
        if (contentTypeKey && contentTypeKey !== 'Content-Type') {
          headers['Content-Type'] = headers[contentTypeKey];
          delete headers[contentTypeKey];
        }
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }

        // Add real browser User-Agent to prevent Cloudflare/gateway blocks
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

        const urlStr = typeof url === 'string' ? url : (url as any).url || url.toString();

        // Sağlık taraması (ping) istekleri için hızlı hata alma (8 saniye), normal istekler için 45 saniye zaman aşımı
        let requestTimeout = 45000;
        if (modifiedBody) {
          try {
            const bodyObj = JSON.parse(String(modifiedBody));
            const firstMsg = bodyObj.messages?.[0]?.content;
            if (firstMsg === 'ping') {
              requestTimeout = 8000;
              Logger.info('[AI] Sağlık kontrolü (ping) isteği algılandı. Zaman aşımı 8s olarak ayarlandı.');
            }
          } catch (_) {}
        }

        // Parse modifiedBody to a JS object so Axios can serialize it properly and set Content-Length automatically
        let dataPayload = modifiedBody;
        if (modifiedBody && typeof modifiedBody === 'string') {
          try {
            dataPayload = JSON.parse(modifiedBody);
          } catch (_) {}
        }

        const response = await axios({
          method: options?.method || 'POST',
          url: urlStr,
          data: dataPayload,
          headers,
          timeout: requestTimeout,
          signal: options?.signal, // Pass the abort signal to axios to allow proper timeouts and cancellations
          validateStatus: () => true // do not throw on 5xx status codes
        });

        Logger.info(`[AI] Zen API Fetch completed with status: ${response.status} ${response.statusText}`);

        const responseHeaders = new Headers();
        if (response.headers) {
          Object.entries(response.headers).forEach(([key, value]) => {
            if (value !== undefined) {
              responseHeaders.set(key, Array.isArray(value) ? value.join(', ') : String(value));
            }
          });
        }
        responseHeaders.delete('x-ratelimit-reset');
        responseHeaders.delete('x-ratelimit-reset-requests');
        responseHeaders.delete('x-ratelimit-reset-tokens');
        responseHeaders.delete('retry-after');

        const isOk = response.status >= 200 && response.status < 300;
        let bodyText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        Logger.info('[AI] Zen API Raw Response Data:', bodyText);

        if (!isOk) {
          Logger.warn(`[AI] Zen API HTTP Error: ${response.status} ${response.statusText}`);
          return new Response(bodyText, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
          });
        }

        try {
          const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
          
          if (data && typeof data === 'object') {
            if (data.created === undefined || data.created === null || isNaN(Number(data.created))) {
              data.created = Math.floor(Date.now() / 1000);
            } else {
              const createdNum = Number(data.created);
              if (createdNum > 9999999999) {
                data.created = Math.floor(createdNum / 1000);
              }
            }
            
            if (Array.isArray(data.choices)) {
              for (const choice of data.choices) {
                if (choice && choice.message && typeof choice.message === 'object') {
                  delete choice.message.reasoning;
                  delete choice.message.reasoning_details;
                  if (choice.message.refusal === null) {
                    delete choice.message.refusal;
                  }
                }
              }
            }
          }
          bodyText = JSON.stringify(data);
        } catch (e) {
          Logger.error('[AI] Zen response interceptor parsing failed, passing response body:', e);
        }

        return new Response(bodyText, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      } catch (error: any) {
        Logger.error(`[AI] Zen API Fetch failed: ${error.message}`);
        try {
          if (options?.body) {
            const bodyObj = JSON.parse(String(options.body));
            if (bodyObj.model) {
              Logger.warn(`[AI] Zen model ${bodyObj.model} failed during call. (Not disabling to respect user preferences)`);
            }
          }
        } catch (_) {}
        throw error;
      }
    }
  } as any);

  return zenProviderCache;
}

/**
 * Asynchronously checks health of all Zen Free models and disables unhealthy ones temporarily.
 * Run this at the start of a production job.
 */
export async function checkZenModelsHealth(): Promise<void> {
  const zen = getZenProvider();
  if (!zen) return;

  Logger.info('[AI] Starting Zen Free models health check...');
  const zenModels = ['big-pickle', 'mimo-v2.5-free', 'nemotron-3-ultra-free'];

  await Promise.all(
    zenModels.map(async (modelId) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout for health check

      try {
        Logger.info(`[AI] Testing health of Zen model: ${modelId}...`);
        
        // Simple fast test call with abort signal
        await generateText({
          model: zen.chat(modelId),
          prompt: 'ping',
          abortSignal: controller.signal
        });

        clearTimeout(timeoutId);
        // If successful, ensure it is enabled
        disabledZenModels.delete(modelId);
        Logger.info(`[AI] Zen model ${modelId} is healthy and ENABLED.`);
      } catch (err: any) {
        clearTimeout(timeoutId);
        Logger.warn(`[AI] Zen model ${modelId} failed health check (or slow response > 8s). (Not disabling to respect user preferences). Error: ${err?.message?.slice(0, 100)}`);
      }
    })
  );
}

/**
 * Returns an array of configured AI models for the system (fallback chain).
 * Order: Zen API Free models -> Minimax -> Gemini -> OpenRouter
 */
export function getAIModelChain() {
  const models = [];

  // 1. Zen API Free Modelleri (Kullanıcı Talebiyle İlk Sırada)
  const zen = getZenProvider();
  if (zen) {
    const zenModels = ['big-pickle', 'mimo-v2.5-free', 'nemotron-3-ultra-free'];
    for (const modelId of zenModels) {
      models.push(zen.chat(modelId));
    }
  }

  // 2. Anthropic / Minimax (3 Zen modelinden sonra)
  if (process.env.ANTHROPIC_API_KEY) {
    let minimaxBaseURL = process.env.ANTHROPIC_BASE_URL || 'https://api.minimax.io/anthropic';
    // Minimax Anthropic-compatible API requires /v1 suffix for the Anthropic SDK proxy to access /v1/messages
    if (!minimaxBaseURL.endsWith('/v1')) {
      minimaxBaseURL = minimaxBaseURL.replace(/\/+$/, '') + '/v1';
    }

    const minimax = createAnthropic({
      baseURL: minimaxBaseURL,
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    let modelName = process.env.MODEL || 'MiniMax-M3';
    modelName = modelName.replace(/^"|"$/g, '');

    models.push(minimax(modelName));
  }

  // 3. Google Gemini 2.5 Flash
  models.push(google('gemini-2.5-flash'));

  return models;
}
// trigger restart


