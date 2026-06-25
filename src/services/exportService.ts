import path from 'path';
import fs from 'fs-extra';
import JSZip from 'jszip';
import { db } from '../db.js';
import { Logger } from '../lib/logger.js';
import { runFFmpeg } from './videoService.js';

export interface FilmFreewayMetadata {
  title: string;
  description: string;
  tags: string[];
  runtime: number;
  aspectRatio: string;
  resolution: string;
  fps: number;
  aiModels: string[];
  productionTool: string;
  director: string;
  country: string;
  language: string;
  year: number;
  category: string;
  techSpecs: Record<string, string>;
}

export async function generateFilmFreewayMetadata(job: any, scenes: any[]): Promise<FilmFreewayMetadata> {
  const totalDuration = scenes.length * 6;
  const models: string[] = [];
  if (job.model_type) models.push(job.model_type);
  if (job.tts_provider) models.push(`TTS:${job.tts_provider}`);
  if (job.production_template) models.push(`Template:${job.production_template}`);

  return {
    title: job.yt_title || job.master_prompt?.slice(0, 80) || 'AI Generated Film',
    description: job.yt_desc || job.master_prompt || '',
    tags: [
      ...(job.yt_tags ? job.yt_tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
      'AI Film', 'AI Generated', 'AI Publisher',
    ],
    runtime: totalDuration,
    aspectRatio: '16:9',
    resolution: '1920x1080',
    fps: 24,
    aiModels: models,
    productionTool: 'AI Publisher Studio v1.0',
    director: 'AI Publisher',
    country: 'TR',
    language: job.dubbing_lang || 'tr',
    year: new Date().getFullYear(),
    category: 'AI Generated',
    techSpecs: {
      resolution: '1920x1080',
      codec: 'H.264',
      container: 'MP4',
      audioCodec: 'AAC',
      ...(job.cover_image_path ? { coverImage: job.cover_image_path } : {}),
    },
  };
}

export async function createExportZip(
  jobId: number,
  scenes: any[],
  finalVideoPath: string | null,
  outputZipPath: string,
): Promise<void> {
  const zip = new JSZip();
  const seenPaths = new Set<string>();

  // Final video (if exists)
  if (finalVideoPath && await fs.pathExists(finalVideoPath)) {
    const buf = await fs.readFile(finalVideoPath);
    zip.file('final_video.mp4', buf);
    seenPaths.add(finalVideoPath);
  }

  // Individual scenes
  const scenesFolder = zip.folder('scenes');
  for (const scene of scenes) {
    if (!scene.video_path) continue;
    const absPath = path.resolve(scene.video_path.startsWith('/') || scene.video_path.startsWith('http')
      ? path.join(process.cwd(), scene.video_path) : scene.video_path);
    if (seenPaths.has(absPath)) continue;
    if (!(await fs.pathExists(absPath))) continue;
    const buf = await fs.readFile(absPath);
    const filename = `scene_${String(scene.scene_number).padStart(2, '0')}.mp4`;
    scenesFolder!.file(filename, buf);
    seenPaths.add(absPath);
  }

  // FilmFreeway metadata JSON
  const job = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
  const metadata = await generateFilmFreewayMetadata(job, scenes);
  zip.file('filmfreeway_metadata.json', JSON.stringify(metadata, null, 2));

  // Scene list JSON
  const sceneList = scenes.map((s) => ({
    id: s.id,
    sceneNumber: s.scene_number,
    videoPrompt: s.video_prompt,
    speechText: s.speech_text,
    cameraMotion: s.camera_motion,
    transitionType: s.transition_type || 'fade',
    status: s.status,
    duration: 6,
  }));
  zip.file('scenes.json', JSON.stringify(sceneList, null, 2));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  await fs.writeFile(outputZipPath, zipBuffer);
}

export async function exportJob(jobId: number): Promise<string> {
  const scenes = await db.all(
    'SELECT * FROM video_scenes WHERE job_id = ? ORDER BY sort_order ASC',
    [jobId],
  );
  if (scenes.length === 0) {
    throw new Error('Export icin sahne bulunamadi');
  }

  const exportsDir = path.join(process.cwd(), 'exports');
  await fs.ensureDir(exportsDir);

  // Check if final video exists, otherwise concatenate scenes
  const job = await db.get('SELECT * FROM video_jobs WHERE id = ?', [jobId]);
  let finalVideoPath: string | null = null;
  if (job?.final_filename) {
    const candidatePath = path.join(process.cwd(), 'videolar', job.final_filename);
    if (await fs.pathExists(candidatePath)) {
      finalVideoPath = candidatePath;
    }
  }

  // If no final video, concat scene videos on-the-fly
  if (!finalVideoPath) {
    const sceneVideos = scenes
      .map((s) => s.video_path)
      .filter((vp): vp is string => !!vp)
      .map((vp) => path.resolve(vp.startsWith('/') || vp.startsWith('http')
        ? path.join(process.cwd(), vp) : vp));
    const validVideos: string[] = [];
    for (const vp of sceneVideos) {
      if (await fs.pathExists(vp)) validVideos.push(vp);
    }
    if (validVideos.length > 0) {
      finalVideoPath = path.join(exportsDir, `temp_concat_${jobId}.mp4`);
      const txt = path.join(exportsDir, `concat_list_${jobId}.txt`);
      await fs.writeFile(txt, validVideos.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
      try {
        await runFFmpeg('ffmpeg', [
          '-y', '-f', 'concat', '-safe', '0', '-i', txt,
          '-c', 'copy', finalVideoPath,
        ]);
      } finally {
        await fs.remove(txt).catch(() => {});
      }
    }
  }

  const zipFilename = `export_${jobId}_${Date.now()}.zip`;
  const zipPath = path.join(exportsDir, zipFilename);
  await createExportZip(jobId, scenes, finalVideoPath, zipPath);

  // Cleanup temp concat if created
  if (finalVideoPath && finalVideoPath.includes('temp_concat') && await fs.pathExists(finalVideoPath)) {
    await fs.remove(finalVideoPath).catch(() => {});
  }

  Logger.info(`Export ZIP created: ${zipPath} (${scenes.length} scenes)`);
  return `/exports/${zipFilename}`;
}
