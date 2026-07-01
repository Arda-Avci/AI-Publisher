import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModelChain } from '../lib/ai-provider.js';
import { withFallbackAndRetry } from '../lib/ai-utils.js';
import { Logger } from '../lib/logger.js';
import { TIMEOUT } from '../constants.js';
import { getCreativeContext, storeMemory } from './memoryVaultService.js';
import { naturalLanguageToFfmpeg } from './plainLanguageEdit.js';
import { runFFmpegWithFallback } from './videoService.js';

export interface EditTurn {
  turnNumber: number;
  instruction: string;
  appliedFfmpegCommand: string;
  outputPath: string;
  timestamp: string;
}

export interface IterativeEditSession {
  sessionId: string;
  userId: number;
  inputPath: string;
  outputDir: string;
  turns: EditTurn[];
  currentPath: string;
}

const EditIntentSchema = z.object({
  intent: z.enum(['trim', 'color', 'speed', 'crop', 'effect', 'audio', 'text', 'composite', 'unknown']),
  confidence: z.number().min(0).max(1),
  parsedParameters: z.record(z.string(), z.unknown()).optional(),
});

export class MultiTurnEditor {
  private session: IterativeEditSession;

  constructor(userId: number, inputPath: string, outputDir: string, sessionId?: string) {
    this.session = {
      sessionId: sessionId ?? `edit_${Date.now()}`,
      userId,
      inputPath,
      outputDir,
      turns: [],
      currentPath: inputPath,
    };
  }

  async applyEdit(instruction: string): Promise<EditTurn> {
    const turnNumber = this.session.turns.length + 1;

    const context = await getCreativeContext(this.session.userId, this.session.sessionId);
    const modelContext = context
      ? `Previous creative context from this user:\n${context}`
      : 'No previous context available.';

    const models = getAIModelChain();

    const intentResult = await withFallbackAndRetry(
      (model) =>
        generateObject({
          model,
          schema: EditIntentSchema,
          abortSignal: AbortSignal.timeout(TIMEOUT.AI_FAST),
          prompt: `Analyze this video edit instruction and classify the intent.

Instruction: "${instruction}"

${modelContext}

Return:
- intent: one of trim, color, speed, crop, effect, audio, text, composite, unknown
- confidence: 0-1 how confident you are
- parsedParameters: any parameters you can extract (timestamps, color values, coordinates, etc.)`,
        }),
      models,
      2,
      5000,
      true,
    );

    const ext = this.session.currentPath.match(/\.(\w+)$/)?.[1] ?? 'mp4';
    const outputPath = `${this.session.outputDir}/turn_${String(turnNumber).padStart(3, '0')}.${ext}`;

    const ffmpegCmd = await naturalLanguageToFfmpeg(instruction, {
      hasVideo: true,
      hasAudio: true,
    });

    const args = ffmpegCmd.args.map(a => a === 'INPUT' ? this.session.currentPath : a);
    args.push(outputPath);

    await runFFmpegWithFallback([{ cmd: 'ffmpeg', args }]);

    const turn: EditTurn = {
      turnNumber,
      instruction,
      appliedFfmpegCommand: `ffmpeg ${args.join(' ')}`,
      outputPath,
      timestamp: new Date().toISOString(),
    };

    this.session.turns.push(turn);
    this.session.currentPath = outputPath;

    await storeMemory(
      this.session.userId,
      this.session.sessionId,
      'style_choice',
      `edit_turn_${turnNumber}`,
      instruction,
      `intent=${intentResult.object.intent}`,
    );

    Logger.info('[MultiTurnEditor] Applied:', {
      turn: turnNumber,
      intent: intentResult.object.intent,
      outputPath,
    });

    return turn;
  }

  async undo(): Promise<string | null> {
    if (this.session.turns.length === 0) return null;
    this.session.turns.pop();
    this.session.currentPath = this.session.turns.length > 0
      ? this.session.turns[this.session.turns.length - 1]!.outputPath
      : this.session.inputPath;
    Logger.info('[MultiTurnEditor] Undo applied');
    return this.session.currentPath;
  }

  getCurrentPath(): string {
    return this.session.currentPath;
  }

  getHistory(): EditTurn[] {
    return [...this.session.turns];
  }

  getSessionState(): IterativeEditSession {
    return { ...this.session, turns: [...this.session.turns] };
  }
}
