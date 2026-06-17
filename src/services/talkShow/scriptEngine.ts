import { db } from '../../db.js';
import { Logger } from '../../lib/logger.js';
import { getAIModelChain } from '../../lib/ai-provider.js';
import { withFallbackAndRetry } from '../../lib/ai-utils.js';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { Character } from '../../types/character.js';
import { Script, ScriptSegment, ScriptWithSegments, SceneType } from '../../types/script.js';
import type { SportotoDiscussion } from './discussionSource.js';

const OutlineSchema = z.object({
  scenes: z.array(
    z.object({
      scene_type: z.enum(['opening', 'talk', 'reaction', 'wide', 'closing']),
      character_name: z.string(),
      camera_instruction: z.string(),
      duration_seconds: z.number().min(2).max(10),
      dialogue_context: z.string(),
    }),
  ),
});

function getModelForCharacter(char: {
  llm_provider?: string | null;
  llm_model?: string | null;
}): any {
  const modelId = char.llm_model || undefined;
  const chain = getAIModelChain();
  const provider = char.llm_provider || 'zen';

  switch (provider) {
    case 'gemini':
      return google(modelId || 'gemini-2.5-flash');
    case 'claude':
      if (process.env.ANTHROPIC_API_KEY) {
        const baseURL =
          (process.env.ANTHROPIC_BASE_URL || 'https://api.minimax.io/anthropic').replace(
            /\/+$/,
            '',
          ) + '/v1';
        return createAnthropic({ baseURL, apiKey: process.env.ANTHROPIC_API_KEY })(
          modelId || 'MiniMax-M3',
        );
      }
      break;
    case 'deepseek':
      if (process.env.DEEPSEEK_API_KEY) {
        const dp = createOpenAI({
          baseURL: 'https://api.deepseek.com/v1',
          apiKey: process.env.DEEPSEEK_API_KEY,
        } as any);
        return dp(modelId || 'deepseek-chat');
      }
      break;
    case 'zen':
    default: {
      if (modelId) {
        const match = chain.find((m: any) => m.modelId === modelId);
        if (match) return match;
      }
      return chain[0];
    }
  }
  return chain[0];
}

function parseScriptRow(row: any): Script {
  if (!row) return row;
  return {
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
  };
}

function parseSegmentRow(row: any): ScriptSegment {
  if (!row) return row;
  return {
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
  };
}

export class ScriptEngine {
  async generateOutline(
    masterPrompt: string,
    productionNotes: string | null | undefined,
    characters: Character[],
  ): Promise<z.infer<typeof OutlineSchema>['scenes']> {
    const models = getAIModelChain();
    const charList = characters
      .map(
        (c) =>
          `- ${c.name} (${c.role_archetype || 'supporting'}): ${c.description || 'Açıklama yok'}`,
      )
      .join('\n');

    const result = await withFallbackAndRetry(
      (model) => {
        return generateObject({
          model,
          schema: OutlineSchema,
          abortSignal: AbortSignal.timeout(60000),
          system:
            'Sen bir talk-show yapımcısısın. Çıktıyı sadece JSON formatında üret, açıklama ekleme.',
          prompt: `Bir talk-show için sahne sahne taslak hazırla.

Konu: ${masterPrompt}
Üretim Notları: ${productionNotes || 'Yok'}

Karakterler:
${charList}

Her sahne için:
- scene_type: opening (açılış), talk (konuşma), reaction (tepki), wide (genel çekim), closing (kapanış)
- character_name: Bu sahnede konuşan karakterin adı
- camera_instruction: Kamera hareketi (zoom_in, zoom_out, pan_left, pan_right, two_shot, closeup)
- duration_seconds: 3-10 saniye
- dialogue_context: Bu sahnede ne konuşulacağına dair kısa not

Toplam 5-8 sahne planla. İlk sahne opening (sunucu açılışı), son sahne closing (kapanış) olsun.`,
        });
      },
      models,
      2,
      2000,
      true,
    );

    return result.object.scenes;
  }

  async generateDialogue(
    character: Character,
    sceneType: SceneType,
    dialogueContext: string,
    priorDialogue: string,
    showTopic: string,
  ): Promise<string> {
    const model = getModelForCharacter({
      llm_provider: character.llm_provider || 'zen',
      llm_model: character.llm_model || null,
    });
    const systemPrompt = `Sen bir talk-show karakterisin. Karakter bilgilerin:
Ad: ${character.name}
Tasvir: ${character.description || 'Açıklama yok'}
Rol: ${character.role_archetype || 'supporting'}

Kişiliğine uygun, doğal ve akıcı konuş. Kısa cümleler kullan (maksimum 3-4 cümle).`;

    const prompt = `Talk-Show Konusu: ${showTopic}
Sahne Türü: ${sceneType}
Sahne Bağlamı: ${dialogueContext}

Önceki Konuşmalar:
${priorDialogue || 'Henüz konuşma yok.'}

Şimdi ${character.name} olarak bu sahnede söyleyeceğin metni yaz. Doğal, karakterine uygun ve kısa olsun.`;

    try {
      const res = await generateText({
        model,
        system: systemPrompt,
        prompt,
        abortSignal: AbortSignal.timeout(30000),
      });
      return res.text.trim().slice(0, 500);
    } catch (err: any) {
      Logger.warn(
        `[ScriptEngine] Dialogue failed for ${character.name}: ${err.message}. Using fallback.`,
      );
      return `${character.name} bu konuda düşüncelerini paylaşıyor: ${dialogueContext}`;
    }
  }

  async generateFullScript(showId: number, userId: number): Promise<ScriptWithSegments> {
    const show = await db.get('SELECT * FROM video_jobs WHERE id = ? AND user_id = ?', [
      showId,
      userId,
    ]);
    if (!show) throw new Error('Show not found');

    const characters: Character[] = await db.all(
      'SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );
    if (characters.length === 0)
      throw new Error('No characters found. Create at least one character first.');

    const title = show.master_prompt?.substring(0, 100) || `Talk-Show #${showId}`;

    const scriptRow = await db.get(
      `INSERT INTO scripts (show_id, user_id, title, status) VALUES (?, ?, ?, 'generating') RETURNING *`,
      [showId, userId, title],
    );
    const script = parseScriptRow(scriptRow);

    try {
      Logger.info(`[ScriptEngine] Generating outline for show ${showId}`);
      const scenes = await this.generateOutline(
        show.master_prompt,
        show.production_notes,
        characters,
      );

      const charMap = new Map<string, Character>();
      for (const c of characters) {
        charMap.set(c.name.toLowerCase().trim(), c);
      }

      const segments: ScriptSegment[] = [];
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const characterName = scene.character_name || 'Sunucu';
        const character = charMap.get(characterName.toLowerCase().trim());

        const priorDialogue = segments
          .map((s) => `${s.character_name}: ${s.dialogue_text}`)
          .join('\n');

        let dialogue = '';
        if (character) {
          dialogue = await this.generateDialogue(
            character,
            scene.scene_type,
            scene.dialogue_context,
            priorDialogue,
            show.master_prompt,
          );
        } else {
          dialogue = `${characterName}: ${scene.dialogue_context}`;
        }

        const segmentRow = await db.get(
          `INSERT INTO script_segments (script_id, scene_number, scene_type, character_id, character_name, dialogue_text, camera_instruction, duration_seconds, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
          [
            script.id,
            i + 1,
            scene.scene_type,
            character?.id || null,
            characterName,
            dialogue,
            scene.camera_instruction,
            scene.duration_seconds,
            i + 1,
          ],
        );
        segments.push(parseSegmentRow(segmentRow));
      }

      const updated = await db.get(
        `UPDATE scripts SET status = 'completed', scene_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`,
        [segments.length, script.id],
      );

      return { ...parseScriptRow(updated), segments };
    } catch (err: any) {
      Logger.error(`[ScriptEngine] Generation failed: ${err.message}`);
      await db.run(
        `UPDATE scripts SET status = 'error', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [script.id],
      );
      throw err;
    }
  }

  async generateFromDiscussion(
    showId: number,
    userId: number,
    discussion: SportotoDiscussion,
  ): Promise<ScriptWithSegments> {
    const show = await db.get('SELECT * FROM video_jobs WHERE id = ? AND user_id = ?', [
      showId,
      userId,
    ]);
    if (!show) throw new Error('Show not found');

    const characters: Character[] = await db.all(
      'SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );

    const title =
      discussion.title ||
      show.master_prompt?.substring(0, 100) ||
      `Sportoto Hafta ${discussion.sportoto_week}`;

    const scriptRow = await db.get(
      `INSERT INTO scripts (show_id, user_id, title, status) VALUES (?, ?, ?, 'generating') RETURNING *`,
      [showId, userId, title],
    );
    const script = parseScriptRow(scriptRow);

    try {
      Logger.info(
        `[ScriptEngine] Generating script from Sportoto discussion: "${discussion.title}"`,
      );

      const charMap = new Map<string, Character>();
      for (const c of characters) {
        charMap.set(c.name.toLowerCase().trim(), c);
      }

      const speakerToChar = (speaker: string): Character | null => {
        const direct = charMap.get(speaker.toLowerCase().trim());
        if (direct) return direct;
        for (const [name, char] of charMap) {
          if (name.includes(speaker.toLowerCase()) || speaker.toLowerCase().includes(name)) {
            return char;
          }
        }
        return null;
      };

      const segments: ScriptSegment[] = [];
      for (let i = 0; i < discussion.utterances.length; i++) {
        const utterance = discussion.utterances[i];
        const isFirst = i === 0;
        const isLast = i === discussion.utterances.length - 1;
        const sceneType: SceneType = isFirst ? 'opening' : isLast ? 'closing' : 'talk';
        const character = speakerToChar(utterance.speaker);
        const characterName = character?.name || utterance.speaker;

        let dialogue = utterance.text;
        if (character) {
          try {
            const priorDialogue = segments
              .map((s) => `${s.character_name}: ${s.dialogue_text}`)
              .join('\n');

            const model = getModelForCharacter({
              llm_provider: character.llm_provider || 'zen',
              llm_model: character.llm_model || null,
            });

            const res = await generateText({
              model,
              system: `Sen bir talk-show karakterisin: ${character.name} - ${character.description || ''}.
Sportoto tartışma programında konuşuyorsun. Verilen taslak metni kendi üslubunla ve karakterine uygun şekilde zenginleştir.
Doğal, akıcı ve kısa cümleler kullan (maksimum 3-4 cümle).`,
              prompt: `Talk-Show: ${discussion.title}
Sahne: ${i + 1}/${discussion.utterances.length}
Taslak Metin: ${utterance.text}

Önceki Konuşmalar:
${priorDialogue || 'Henüz konuşma yok.'}

${characterName} olarak bu taslak metni kendi üslubunla zenginleştir.`,
              abortSignal: AbortSignal.timeout(30000),
            });
            dialogue = res.text.trim().slice(0, 500);
          } catch (err: any) {
            Logger.warn(
              `[ScriptEngine] Dialogue enhancement failed for ${characterName}: ${err.message}. Using fallback.`,
            );
            dialogue = `${characterName}: ${'Bu sahne hakkında yorum yapıyor...'}`;
          }
        }

        const wordCount = dialogue.split(/\s+/).length;
        const durationSeconds = Math.max(3, Math.min(10, Math.ceil((wordCount / 150) * 60)));

        const segmentRow = await db.get(
          `INSERT INTO script_segments (script_id, scene_number, scene_type, character_id, character_name, dialogue_text, camera_instruction, duration_seconds, order_index)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
          [
            script.id,
            i + 1,
            sceneType,
            character?.id || null,
            characterName,
            dialogue,
            isFirst ? 'zoom_in' : isLast ? 'zoom_out' : 'two_shot',
            durationSeconds,
            i + 1,
          ],
        );
        segments.push(parseSegmentRow(segmentRow));
      }

      const updated = await db.get(
        `UPDATE scripts SET status = 'completed', scene_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`,
        [segments.length, script.id],
      );

      return { ...parseScriptRow(updated), segments };
    } catch (err: any) {
      Logger.error(`[ScriptEngine] Sportoto script generation failed: ${err.message}`);
      await db.run(
        `UPDATE scripts SET status = 'error', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [script.id],
      );
      throw err;
    }
  }

  async regenerateSegment(scriptId: number, segmentId: number): Promise<ScriptSegment> {
    const segment = await db.get('SELECT * FROM script_segments WHERE id = ?', [segmentId]);
    if (!segment) throw new Error('Segment not found');
    if (segment.script_id !== scriptId) throw new Error('Segment does not belong to this script');

    const script = await db.get('SELECT * FROM scripts WHERE id = ?', [scriptId]);

    let character: Character | null = null;
    if (segment.character_id) {
      character = await db.get('SELECT * FROM characters WHERE id = ?', [segment.character_id]);
    }

    await db.exec('BEGIN');

    try {
      const priorSegments = await db.all(
        'SELECT * FROM script_segments WHERE script_id = ? AND order_index < ? ORDER BY order_index',
        [scriptId, segment.order_index],
      );
      const priorDialogue = priorSegments
        .map((s: any) => `${s.character_name}: ${s.dialogue_text}`)
        .join('\n');

      let dialogue = '';
      if (character) {
        dialogue = await this.generateDialogue(
          character,
          segment.scene_type,
          segment.dialogue_text || segment.camera_instruction,
          priorDialogue,
          script.title,
        );
      } else {
        dialogue = `${segment.character_name}: ${segment.camera_instruction || 'Bu sahne hakkında yorum yapıyor...'}`;
      }

      const updated = await db.get(
        `UPDATE script_segments SET dialogue_text = ? WHERE id = ? RETURNING *`,
        [dialogue, segmentId],
      );

      await db.exec('COMMIT');
      return parseSegmentRow(updated);
    } catch (err) {
      await db.exec('ROLLBACK');
      throw err;
    }
  }

  async listScripts(showId: number): Promise<Script[]> {
    const rows = await db.all('SELECT * FROM scripts WHERE show_id = ? ORDER BY created_at DESC', [
      showId,
    ]);
    return rows.map(parseScriptRow);
  }

  async getScript(scriptId: number): Promise<ScriptWithSegments | null> {
    const script = await db.get('SELECT * FROM scripts WHERE id = ?', [scriptId]);
    if (!script) return null;

    const segments = await db.all(
      'SELECT * FROM script_segments WHERE script_id = ? ORDER BY order_index',
      [scriptId],
    );

    return { ...parseScriptRow(script), segments: segments.map(parseSegmentRow) };
  }

  async updateScript(
    scriptId: number,
    data: { title?: string; metadata?: Record<string, unknown> },
  ): Promise<Script | null> {
    const existing = await db.get('SELECT * FROM scripts WHERE id = ?', [scriptId]);
    if (!existing) return null;

    const title = data.title ?? existing.title;
    const metadata =
      data.metadata !== undefined
        ? JSON.stringify(data.metadata)
        : typeof existing.metadata === 'string'
          ? existing.metadata
          : JSON.stringify(existing.metadata ?? {});

    const updated = await db.get(
      `UPDATE scripts SET title = ?, metadata = ?::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`,
      [title, metadata, scriptId],
    );
    return parseScriptRow(updated);
  }

  async deleteScript(scriptId: number): Promise<boolean> {
    const result = await db.run('DELETE FROM scripts WHERE id = ?', [scriptId]);
    return (result.changes || 0) > 0;
  }

  async updateSegment(
    segmentId: number,
    data: {
      dialogue_text?: string;
      camera_instruction?: string;
      duration_seconds?: number;
      scene_type?: SceneType;
    },
  ): Promise<ScriptSegment | null> {
    const existing = await db.get('SELECT * FROM script_segments WHERE id = ?', [segmentId]);
    if (!existing) return null;

    const dialogue_text = data.dialogue_text ?? existing.dialogue_text;
    const camera_instruction = data.camera_instruction ?? existing.camera_instruction;
    const duration_seconds = data.duration_seconds ?? existing.duration_seconds;
    const scene_type = data.scene_type ?? existing.scene_type;

    const updated = await db.get(
      `UPDATE script_segments SET dialogue_text = ?, camera_instruction = ?, duration_seconds = ?, scene_type = ? WHERE id = ? RETURNING *`,
      [dialogue_text, camera_instruction, duration_seconds, scene_type, segmentId],
    );
    return parseSegmentRow(updated);
  }
}
