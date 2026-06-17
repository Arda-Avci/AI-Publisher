/**
 * Story Chat Service
 * Stateful multi-turn chat for AI-assisted story/prompt development
 */

import { db } from '../db.js';
import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { getStoryBible, getStoryCharacters, getStoryPlotPoints } from './storyBibleService.js';
import { Logger } from '../lib/logger.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: number;
  userId: number;
  storyBibleId?: number;
  context: Record<string, any>;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// Director Agent system prompt
const DIRECTOR_SYSTEM_PROMPT = `Sen profesyonel bir film senaristi ve hikaye geliştirme asistanısın. Kullanıcının fikirlerini alarak profesyonel video içerik promptlarına dönüştürürsün.

Yeteneklerin:
1. Ham fikirleri detaylı hikaye yapılarına dönüştürme
2. Karakter geliştirme (motivasyon, çatışma, arcs)
3. Scene/prompt planning
4. Ton ve stil önerileri
5. Hedef kitle analizi

Her yanıtında:
- Kullanıcının fikrini anladığını teyit et
- Yapıcı öneriler sun
- Bir sonraki adım için soru sor veya öneri ver
- Gerekirse prompt örnekleri göster

Türkçe yanıt ver, İngilizce terimler için Türkçe açıklamalar ekle.`;

// Screenwriter Agent system prompt
const SCREENWRITER_SYSTEM_PROMPT = `Sen profesyonel bir video senaristi ve görsel hikaye anlatıcısısın. Verilen hikaye yapısını ilgi çekici, görsel açıdan zengin sahne promptlarına dönüştürürsün.

Her sahne için:
- Görsel sahne tanımı (setting, action, mood)
- Kamera hareketi önerisi
- Işık ve renk atmosferi
- Karakter duygu durumu
- Konuşma metni (opsiyonel)

Çıktını Türkçe olarak ver, ancak prompt İngilizce olmalı (AI video modeli için).`;

/**
 * Create a new chat session
 */
export async function createChatSession(
  userId: number,
  storyBibleId?: number,
  context?: Record<string, any>,
): Promise<ChatSession> {
  const result = await db.run(
    `INSERT INTO story_chat_sessions (user_id, story_bible_id, context)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, storyBibleId || null, JSON.stringify(context || {})],
  );

  const session = await getChatSession(result.lastID!);
  if (!session) throw new Error('Failed to retrieve created chat session');
  return session;
}

/**
 * Get a chat session by ID
 */
export async function getChatSession(id: number): Promise<ChatSession | null> {
  const session = await db.get('SELECT * FROM story_chat_sessions WHERE id = $1', [id]);
  if (!session) return null;

  const messages = await db.all(
    'SELECT * FROM story_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
    [id],
  );

  return {
    id: session.id,
    userId: session.user_id,
    storyBibleId: session.story_bible_id,
    context: session.context,
    messages: messages.map((m: any) => ({
      role: m.role,
      content: m.content,
      metadata: m.metadata,
    })),
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

/**
 * Get all chat sessions for a user
 */
export async function getUserChatSessions(userId: number): Promise<ChatSession[]> {
  const sessions = await db.all(
    'SELECT * FROM story_chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId],
  );

  return Promise.all(
    sessions.map(async (s: any) => {
      const lastMessage = await db.get(
        'SELECT content FROM story_chat_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1',
        [s.id],
      );
      return {
        id: s.id,
        userId: s.user_id,
        storyBibleId: s.story_bible_id,
        context: s.context,
        messages: [], // Don't load all messages for list view
        lastMessage: lastMessage?.content || '',
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      };
    }),
  );
}

/**
 * Add a message to a chat session
 */
export async function addMessage(
  sessionId: number,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: Record<string, any>,
): Promise<void> {
  await db.run(
    `INSERT INTO story_chat_messages (session_id, role, content, metadata)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, role, content, JSON.stringify(metadata || {})],
  );

  // Update session timestamp
  await db.run('UPDATE story_chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [
    sessionId,
  ]);
}

/**
 * Send a chat message and get AI response
 */
export async function sendChatMessage(
  sessionId: number,
  userMessage: string,
  options?: {
    agent?: 'director' | 'screenwriter';
    template?: 'cinematic' | 'dynamic' | 'simple' | 'pixar';
  },
): Promise<{
  reply: string;
  suggestedPrompts?: string[];
  sceneUpdates?: any;
}> {
  const session = await getChatSession(sessionId);
  if (!session) throw new Error('Session not found');

  // Add user message
  await addMessage(sessionId, 'user', userMessage);

  // Get story bible context if available
  let storyContext = '';
  if (session.storyBibleId) {
    const bible = await getStoryBible(session.storyBibleId);
    const characters = await getStoryCharacters(session.storyBibleId);
    const plotPoints = await getStoryPlotPoints(session.storyBibleId);

    if (bible) {
      storyContext = `
HİKAYE BAĞLAMI:
Başlık: ${bible.title}
Tür: ${bible.genre}
Açıklama: ${bible.description}
${bible.worldSetting ? `Dünya: ${bible.worldSetting}` : ''}
${bible.tone ? `Ton: ${bible.tone}` : ''}
${bible.targetAudience ? `Hedef Kitle: ${bible.targetAudience}` : ''}

KARAKTERLER:
${characters.map((c) => `- ${c.name} (${c.role}): ${c.description}`).join('\n')}

ÖNEMLİ NOKTALAR:
${plotPoints.map((p) => `- [${p.act}] ${p.title}: ${p.description}`).join('\n')}
`;
    }
  }

  // Build conversation history for context
  const recentMessages = session.messages.slice(-10);
  const historyContext = recentMessages
    .map((m) => `${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${m.content}`)
    .join('\n');

  // Select system prompt based on agent
  const systemPrompt =
    options?.agent === 'screenwriter' ? SCREENWRITER_SYSTEM_PROMPT : DIRECTOR_SYSTEM_PROMPT;

  // Build full prompt
  const fullPrompt = `${systemPrompt}

${storyContext ? `---BAĞLAM---\n${storyContext}\n---BAĞLAM SON---\n` : ''}

---SOHBAT GEÇMİŞİ---
${historyContext}
---SOHBAT SON---

Kullanıcı: ${userMessage}

Yanıtını Türkçe olarak ver. Yanıtında:
1. Kullanıcının fikrine atıfta bulun
2. Yapıcı geri bildirim veya soru sor
3. Eğer uygunsa, prompt önerileri veya sahne önerileri sun
4. Bir sonraki adım için öneri ver`;

  try {
    const models = getAIModelChain();

    const result = await withFallbackAndRetry<{ text: string }>(
      (model: any) =>
        model.generate({
          prompt: fullPrompt,
          system:
            'Sen profesyonel bir Türkçe konuşan film senaristi ve hikaye geliştirme asistanısın.',
          temperature: 0.7,
        }),
      models,
      2,
      30000,
      true,
    );

    const reply = result.text.trim();

    // Add assistant message
    await addMessage(sessionId, 'assistant', reply);

    // Parse suggested prompts from reply if any
    const suggestedPrompts = extractSuggestedPrompts(reply);

    return {
      reply,
      suggestedPrompts: suggestedPrompts.length > 0 ? suggestedPrompts : undefined,
    };
  } catch (error) {
    Logger.error('Chat AI error', error);
    const errorReply = 'Üzgünüm, şu anda yanıt üretemiyorum. Lütfen tekrar deneyin.';
    await addMessage(sessionId, 'assistant', errorReply);
    return { reply: errorReply };
  }
}

/**
 * Extract suggested prompts from AI response
 */
function extractSuggestedPrompts(text: string): string[] {
  const prompts: string[] = [];

  // Look for prompt-like patterns
  const lines = text.split('\n');
  for (const line of lines) {
    // Match lines that look like video prompts
    if (
      line.startsWith('Prompt:') ||
      (line.startsWith('• ') && line.length > 50) ||
      (/\[.*?\]/.test(line) && line.length > 30)
    ) {
      const cleaned = line.replace(/^[•* Prompt:-]+/, '').trim();
      if (cleaned.length > 20) {
        prompts.push(cleaned);
      }
    }
  }

  return prompts.slice(0, 3);
}

/**
 * Delete a chat session and all its messages
 */
export async function deleteChatSession(id: number): Promise<void> {
  await db.run('DELETE FROM story_chat_messages WHERE session_id = $1', [id]);
  await db.run('DELETE FROM story_chat_sessions WHERE id = $1', [id]);
}

/**
 * Generate a scene breakdown from chat context
 */
export async function generateSceneBreakdown(
  sessionId: number,
  sceneCount: number = 5,
): Promise<{
  scenes: Array<{
    number: number;
    title: string;
    description: string;
    videoPrompt: string;
    speechText?: string;
    cameraMotion: string;
  }>;
}> {
  const session = await getChatSession(sessionId);
  if (!session) throw new Error('Session not found');

  // Build context from chat
  const context = session.messages.map((m) => `${m.role}: ${m.content}`).join('\n');

  const prompt = `
Aşağıdaki sohbet bağlamından hareketle ${sceneCount} sahnelik bir video prodüksiyon planı oluştur.

Her sahne için şunları belirt:
1. Sahne numarası ve kısa başlık
2. Görsel sahne açıklaması (İngilizce, AI video modeli için)
3. Konuşma metni varsa (Türkçe)
4. Kamera hareketi önerisi

Sohbet:
${context}

JSON formatında döndür:
{
  "scenes": [
    {
      "number": 1,
      "title": "Sahne başlığı",
      "description": "Görsel sahne açıklaması (İngilizce, 50-100 kelime)",
      "speechText": "Konuşma metni (Türkçe, opsiyonel)",
      "cameraMotion": "Kamera hareketi"
    }
  ]
}
`;

  try {
    const models = getAIModelChain();

    const result = await withFallbackAndRetry<{ text: string }>(
      (model: any) =>
        model.generate({
          prompt,
          system: 'Sen profesyonel bir video senaristisin. JSON formatında yanıt ver.',
          temperature: 0.5,
        }),
      models,
      2,
      45000,
      true,
    );

    // Parse JSON from response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }

    throw new Error('Could not parse scene breakdown');
  } catch (error) {
    Logger.error('Scene breakdown error', error);
    return {
      scenes: Array.from({ length: sceneCount }, (_, i) => ({
        number: i + 1,
        title: `Sahne ${i + 1}`,
        description: 'Sahne açıklaması',
        videoPrompt: 'Visual scene description',
        cameraMotion: 'Static shot',
      })),
    };
  }
}
