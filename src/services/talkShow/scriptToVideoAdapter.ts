import { db } from '../../db.js';
import { Logger } from '../../lib/logger.js';
import type { Character } from '../../types/character.js';
import type { ScriptWithSegments, ScriptSegment, SceneType } from '../../types/script.js';
import { checkQueue } from '../../queue.js';

function buildVideoPrompt(segment: ScriptSegment, characters: Character[]): string {
  const char = characters.find(c => c.name.toLowerCase() === (segment.character_name || '').toLowerCase());
  const features = char?.description ? `${char.description}` : '';
  const context = segment.dialogue_text || segment.dialogue_text || '';
  const instruction = segment.camera_instruction || '';
  const sceneTypeLabels: Record<string, string> = {
    opening: 'Program açılış sahnesi',
    talk: 'Konuşma sahnesi',
    reaction: 'Tepki sahnesi',
    wide: 'Genel çekim sahnesi',
    closing: 'Kapanış sahnesi',
  };
  const typeLabel = sceneTypeLabels[segment.scene_type] || 'Sahne';
  const parts = [typeLabel, features, context, instruction].filter(Boolean);
  return parts.join(', ');
}

async function createVideoJob(
  showId: number,
  userId: number,
  script: ScriptWithSegments
): Promise<number> {
  const row = await db.get(
    `INSERT INTO video_jobs
      (user_id, master_prompt, total_scenes, completed_scenes, current_stage, progress_percent, status, target_platforms)
     VALUES (?, ?, ?, 0, 'pending', 0, 'pending', '[]') RETURNING id`,
    [userId, script.title || `Script #${script.id}`, script.segments.length]
  );
  Logger.info(`[ScriptToVideo] Created job ${row.id} from script ${script.id}`);
  return row.id;
}

async function insertScenes(
  jobId: number,
  script: ScriptWithSegments,
  characters: Character[]
): Promise<void> {
  for (const segment of script.segments) {
    const videoPrompt = buildVideoPrompt(segment, characters);
    const cameraMotion = mapCameraInstruction(segment.camera_instruction);
    const speaker = segment.character_name || '';

    await db.run(
      `INSERT INTO video_scenes
        (job_id, scene_number, video_prompt, speech_text, camera_motion, speaker, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [jobId, segment.scene_number, videoPrompt, segment.dialogue_text || '', cameraMotion, speaker, segment.order_index]
    );
  }
  Logger.info(`[ScriptToVideo] Inserted ${script.segments.length} scenes for job ${jobId}`);
}

function mapCameraInstruction(instruction: string): string {
  const validMotions = ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'breathing', 'none'];
  const lower = (instruction || '').toLowerCase().trim();
  if (validMotions.includes(lower)) return lower;
  if (lower.includes('zoom') || lower.includes('closeup')) return 'zoom_in';
  if (lower.includes('pan') || lower.includes('wide')) return 'pan_left';
  if (lower.includes('two_shot')) return 'none';
  return 'none';
}

export async function scriptToVideo(
  script: ScriptWithSegments,
  showId: number,
  userId: number,
  characters: Character[]
): Promise<{ jobId: number }> {
  const jobId = await createVideoJob(showId, userId, script);
  await insertScenes(jobId, script, characters);
  checkQueue().catch(err => Logger.error('[ScriptToVideo] checkQueue error:', err));
  return { jobId };
}
