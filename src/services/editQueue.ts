import path from 'path';
import fs from 'fs-extra';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';
import { parseEditCommand, applyEditOperations } from './chatToEdit.js';
import { DIRECTORIES } from '../constants.js';

export interface EditQueueItem {
  id: number;
  job_id: number;
  user_id: number;
  command: string;
  operations: string;
  target_scene: number | null;
  status: 'pending' | 'applied' | 'failed' | 'reverted';
  snapshot_path: string | null;
  created_at: string;
}

export async function enqueueEdit(
  userId: number,
  jobId: number,
  command: string,
  targetScene?: number,
): Promise<number> {
  const result = await db.run(
    `INSERT INTO edit_queue (job_id, user_id, command, status)
     VALUES (?, ?, ?, 'pending')`,
    [jobId, userId, command],
  );
  const editId = result.lastID as number;

  try {
    const job: any = await db.get(
      'SELECT total_scenes, scene_prompts, master_prompt FROM video_jobs WHERE id = ?',
      [jobId],
    );
    const parsed = await parseEditCommand(
      command,
      job?.total_scenes || 1,
      job?.scene_prompts || job?.master_prompt,
    );
    await db.run(`UPDATE edit_queue SET operations = ?, target_scene = ? WHERE id = ?`, [
      JSON.stringify(parsed.operations),
      targetScene || null,
      editId,
    ]);
  } catch (err) {
    Logger.warn('[EditQueue] Parse failed, storing raw command:', err);
    await db.run(`UPDATE edit_queue SET operations = ? WHERE id = ?`, [
      JSON.stringify([{ type: 'enhance', params: {} }]),
      editId,
    ]);
  }

  return editId;
}

async function takeSnapshot(jobId: number, editId: number, scenePaths: string[]): Promise<string> {
  const snapshotDir = path.join(
    process.cwd(),
    DIRECTORIES.VIDEO_OUTPUT,
    `edit_snapshot_${jobId}_${editId}_${Date.now()}`,
  );
  await fs.ensureDir(snapshotDir);

  for (const srcPath of scenePaths) {
    const basename = path.basename(srcPath);
    await fs.copy(srcPath, path.join(snapshotDir, basename));
  }

  return snapshotDir;
}

export async function applyEditQueueItem(
  jobId: number,
  editId: number,
  scenes: Array<{ sceneNumber: number; videoPath: string; audioPath?: string }>,
  outputDir: string,
): Promise<boolean> {
  const edit: EditQueueItem | undefined = await db.get(
    'SELECT * FROM edit_queue WHERE id = ? AND job_id = ?',
    [editId, jobId],
  );
  if (!edit || edit.status !== 'pending') {
    Logger.warn('[EditQueue] Edit not found or not pending', { editId, jobId });
    return false;
  }

  const snapshotPath = await takeSnapshot(
    jobId,
    editId,
    scenes.map((s) => s.videoPath),
  );

  const operations = JSON.parse(edit.operations || '[]');

  const sceneInfos = scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    videoPath: s.videoPath,
    audioPath: s.audioPath,
  }));

  Logger.info('[EditQueue] Applying edit operations', {
    editId,
    operationCount: operations.length,
  });

  try {
    const processedPaths = await applyEditOperations(operations, sceneInfos, outputDir);

    for (const scene of scenes) {
      const matchedPath = processedPaths.find((p) => p.includes(`scene_${scene.sceneNumber}`));
      if (matchedPath && (await fs.pathExists(matchedPath))) {
        await fs.copy(matchedPath, scene.videoPath, { overwrite: true });
      }
    }

    await db.run(`UPDATE edit_queue SET status = 'applied', snapshot_path = ? WHERE id = ?`, [
      snapshotPath,
      editId,
    ]);

    Logger.info('[EditQueue] Edit applied successfully', { editId });
    return true;
  } catch (err) {
    Logger.error('[EditQueue] Apply failed:', err);
    await db.run(`UPDATE edit_queue SET status = 'failed' WHERE id = ?`, [editId]);
    return false;
  }
}

export async function undoEdit(editId: number, jobId: number): Promise<boolean> {
  const edit: EditQueueItem | undefined = await db.get(
    'SELECT * FROM edit_queue WHERE id = ? AND job_id = ?',
    [editId, jobId],
  );
  if (!edit || edit.status !== 'applied' || !edit.snapshot_path) {
    Logger.warn('[EditQueue] Cannot undo: no snapshot', { editId });
    return false;
  }

  const snapshotDir = edit.snapshot_path;
  if (!(await fs.pathExists(snapshotDir))) {
    Logger.warn('[EditQueue] Snapshot directory missing', { snapshotDir });
    return false;
  }

  try {
    const files = await fs.readdir(snapshotDir);
    for (const file of files) {
      const srcPath = path.join(snapshotDir, file);
      const destPath = path.join(
        process.cwd(),
        DIRECTORIES.VIDEO_OUTPUT,
        `ms_${jobId}_${file.replace('scene_', '').replace('.mp4', '')}.mp4`,
      );
      const destDir = path.dirname(destPath);
      if (await fs.pathExists(srcPath)) {
        await fs.copy(srcPath, path.join(destDir, file), { overwrite: true });
      }
    }

    await db.run(`UPDATE edit_queue SET status = 'reverted' WHERE id = ?`, [editId]);

    Logger.info('[EditQueue] Edit reverted successfully', { editId });
    return true;
  } catch (err) {
    Logger.error('[EditQueue] Undo failed:', err);
    return false;
  }
}

export async function getEditHistory(jobId: number): Promise<EditQueueItem[]> {
  return db.all('SELECT * FROM edit_queue WHERE job_id = ? ORDER BY created_at DESC', [jobId]);
}

export async function applyPendingEditsToScene(
  jobId: number,
  sceneNumber: number,
  sceneVideoPath: string,
): Promise<void> {
  const pendingEdits: EditQueueItem[] = await db.all(
    `SELECT * FROM edit_queue
     WHERE job_id = ? AND status = 'pending'
       AND (target_scene IS NULL OR target_scene = ?)
     ORDER BY id ASC`,
    [jobId, sceneNumber],
  );

  if (pendingEdits.length === 0) return;

  const editDir = path.join(
    process.cwd(),
    DIRECTORIES.VIDEO_OUTPUT,
    `edit_work_${jobId}_${sceneNumber}_${Date.now()}`,
  );
  await fs.ensureDir(editDir);

  for (const edit of pendingEdits) {
    const snapshotDir = await takeSnapshot(jobId, edit.id, [sceneVideoPath]);

    try {
      const operations = JSON.parse(edit.operations || '[]');
      const sceneInfos = [{ sceneNumber, videoPath: sceneVideoPath }];
      const processed = await applyEditOperations(operations, sceneInfos, editDir);

      for (const p of processed) {
        if (await fs.pathExists(p)) {
          await fs.copy(p, sceneVideoPath, { overwrite: true });
        }
      }

      await db.run(`UPDATE edit_queue SET status = 'applied', snapshot_path = ? WHERE id = ?`, [
        snapshotDir,
        edit.id,
      ]);
      Logger.info('[EditQueue] Scene pending edit applied', { editId: edit.id, sceneNumber });
    } catch (err) {
      Logger.warn('[EditQueue] Scene pending edit failed, skipping:', { editId: edit.id, err });
      await db.run(`UPDATE edit_queue SET status = 'failed' WHERE id = ?`, [edit.id]);
    }
  }

  await fs.remove(editDir).catch(() => {});
}
