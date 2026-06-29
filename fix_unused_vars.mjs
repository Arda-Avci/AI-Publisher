import fs from 'fs';
import path from 'path';

const fixes = [
  // faceTracker.ts - prefix unused private field
  {
    file: 'src/services/faceTracker.ts',
    replacements: [
      ['private sampleInterval: number;', 'private _sampleInterval: number;'],
      ['this.sampleInterval = sampleInterval;', 'this._sampleInterval = sampleInterval;'],
    ],
  },
  // splitScreen.ts - remove unused fs import and getVideoDuration
  {
    file: 'src/services/splitScreen.ts',
    replacements: [
      ["import fs from 'fs-extra';\n", ''],
      [', getVideoDuration', ' '],
    ],
  },
  // eyeContact.ts - remove unused path import
  {
    file: 'src/services/eyeContact.ts',
    replacements: [
      ["import path from 'path';\n", ''],
    ],
  },
  // inpainting.ts - remove unused path import
  {
    file: 'src/services/inpainting.ts',
    replacements: [
      ["import path from 'path';\n", ''],
    ],
  },
  // kokoroTts.ts - remove unused path import
  {
    file: 'src/services/kokoroTts.ts',
    replacements: [
      ["import path from 'path';\n", ''],
    ],
  },
  // mllmValidator.ts - remove unused path import
  {
    file: 'src/services/mllmValidator.ts',
    replacements: [
      ["import path from 'path';\n", ''],
    ],
  },
  // emotionCaptions.ts - remove unused path import
  {
    file: 'src/services/emotionCaptions.ts',
    replacements: [
      ["import path from 'path';\n", ''],
    ],
  },
  // videoToVideoService.ts - remove unused runFFmpegWithFallback import
  {
    file: 'src/services/videoToVideoService.ts',
    replacements: [
      ["import { runFFmpegWithFallback } from './videoService.js';\n", ''],
    ],
  },
  // clipper.ts types - remove unused FaceTrackResult import
  {
    file: 'src/types/clipper.ts',
    replacements: [
      ["import type { FaceTrackResult } from '../services/faceTracker.js';\n", ''],
    ],
  },
  // vectorStore.ts - remove unused Logger import
  {
    file: 'src/services/storyboardAgent/vectorStore.ts',
    replacements: [
      ["import { Logger } from '../../lib/logger.js';\n", ''],
    ],
  },
  // crewai/writerCrew.ts - remove unused Agent import
  {
    file: 'src/services/crewai/writerCrew.ts',
    replacements: [
      ['Agent, Task, Crew, Process', 'Task, Crew, Process'],
    ],
  },
  // contentTeam.ts - remove unused getAIModelChain import
  {
    file: 'src/services/contentTeam.ts',
    replacements: [
      ['import { getAIModelChain, getObjectModelChain }', 'import { getObjectModelChain }'],
    ],
  },
  // contentTeam.ts - remove unused VideoJob type import
  {
    file: 'src/services/contentTeam.ts',
    replacements: [
      ["import type { VideoJob } from '../types/job.js';\n", ''],
    ],
  },
  // colorGrader.ts - remove unused HUE_MAP
  {
    file: 'src/services/colorGrader.ts',
    replacements: [
      [
        "const HUE_MAP: Record<string, { r: number; g: number; b: number }> = {\n  purple: { r: 128, g: 0, b: 128 },\n  blue: { r: 0, g: 0, b: 255 },\n  green: { r: 0, g: 128, b: 0 },\n  red: { r: 255, g: 0, b: 0 },\n  yellow: { r: 255, g: 255, b: 0 },\n  orange: { r: 255, g: 165, b: 0 },\n  cyan: { r: 0, g: 255, b: 255 },\n  magenta: { r: 255, g: 0, b: 255 },",
        "const _HUE_MAP: Record<string, { r: number; g: number; b: number }> = {\n  purple: { r: 128, g: 0, b: 128 },\n  blue: { r: 0, g: 0, b: 255 },\n  green: { r: 0, g: 128, b: 0 },\n  red: { r: 255, g: 0, b: 0 },\n  yellow: { r: 255, g: 255, b: 0 },\n  orange: { r: 255, g: 165, b: 0 },\n  cyan: { r: 0, g: 255, b: 255 },\n  magenta: { r: 255, g: 0, b: 255 },",
      ],
    ],
  },
  // autoReframe.ts - prefix unused _extractCenterCrop function
  {
    file: 'src/services/autoReframe.ts',
    replacements: [
      ['async function extractCenterCrop(', 'async function _extractCenterCrop('],
      ['const srcAspect = srcW / srcH;\n', ''],
      ['const facePxY = faceCenterY * srcH;\n', ''],
    ],
  },
  // scheduler.ts - prefix unused methods
  {
    file: 'src/services/scheduler.ts',
    replacements: [
      ['private async publishToYouTube(video: any)', 'private async _publishToYouTube(video: any)'],
      ['private async publishToTikTok(video: any)', 'private async _publishToTikTok(video: any)'],
      ['private async publishToX(video: any)', 'private async _publishToX(video: any)'],
      ['private async publishToMeta(video: any)', 'private async _publishToMeta(video: any)'],
    ],
  },
  // storyboardAgent.ts - remove unused StoryboardFrame import
  {
    file: 'src/services/storyboardAgent/storyboardAgent.ts',
    replacements: [
      ['  StoryboardFrame,\n  StoryboardScript,', '  StoryboardScript,'],
    ],
  },
  // talkShow/orchestrator.ts - prefix unused function
  {
    file: 'src/services/talkShow/orchestrator.ts',
    replacements: [
      ['function getAgentName(', 'function _getAgentName('],
    ],
  },
  // talkShow/orchestratorToVideo.ts - prefix unused constants
  {
    file: 'src/services/talkShow/orchestratorToVideo.ts',
    replacements: [
      ['const AGENT_VOICES:', 'const _AGENT_VOICES:'],
      ['const TEXT_MAX_WIDTH =', 'const _TEXT_MAX_WIDTH ='],
      ['const totalFrames = Math.round(duration * fps);\n', ''],
    ],
  },
  // talkShow/sceneComposer.ts - remove unused Character import
  {
    file: 'src/services/talkShow/sceneComposer.ts',
    replacements: [
      ["import type { Character } from '../../types/character.js';\n", ''],
    ],
  },
  // talkShow/sceneComposer.ts - prefix unused CROSSFADE_DURATION
  {
    file: 'src/services/talkShow/sceneComposer.ts',
    replacements: [
      ['const CROSSFADE_DURATION =', 'const _CROSSFADE_DURATION ='],
    ],
  },
  // autoSubtitleBgm.ts - remove unused uuidv4 import
  {
    file: 'src/services/clipper/autoSubtitleBgm.ts',
    replacements: [
      ["import { v4 as uuidv4 } from 'uuid';\n", ''],
    ],
  },
  // perFrameCropper.ts - remove unused chunkStableSegments import
  {
    file: 'src/services/clipper/perFrameCropper.ts',
    replacements: [
      ['import { faceTracker, chunkStableSegments }', 'import { faceTracker }'],
    ],
  },
  // autoReframe.ts - prefix unused reject
  {
    file: 'src/services/autoReframe.ts',
    replacements: [
      ['return new Promise((resolve, reject) => {\n    const workerPath', 'return new Promise((resolve, _reject) => {\n    const workerPath'],
    ],
  },
  // autoReframe.ts - prefix unused extractCenterCrop
  {
    file: 'src/services/autoReframe.ts',
    replacements: [
      ['async function extractCenterCrop(', 'async function _extractCenterCrop('],
    ],
  },
  // faceTracker.ts - prefix unused sampleInterval
  {
    file: 'src/services/faceTracker.ts',
    replacements: [
      ['private sampleInterval: number;', 'private _sampleInterval: number;'],
      ['this.sampleInterval = sampleInterval;', 'this._sampleInterval = sampleInterval;'],
    ],
  },
  // storyboardGenerator.ts - prefix unused resWidth and resHeight
  {
    file: 'src/services/storyboardGenerator.ts',
    replacements: [
      ['const [resWidth, resHeight]', 'const [_resWidth, _resHeight]'],
    ],
  },
  // videoService.ts - prefix unused videoWidth and videoHeight params
  {
    file: 'src/services/videoService.ts',
    replacements: [
      ['videoWidth = 1920,\n  videoHeight = 1080,', '_videoWidth = 1920,\n  _videoHeight = 1080,'],
    ],
  },
];

for (const fix of fixes) {
  const filePath = path.resolve(fix.file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${fix.file}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  for (const [search, replace] of fix.replacements) {
    if (content.includes(search)) {
      content = content.replace(search, replace);
    } else {
      console.error(`Pattern not found in ${fix.file}: ${search.substring(0, 60)}...`);
    }
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed: ${fix.file}`);
}

console.log('Done with batch 1');
