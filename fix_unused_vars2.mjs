import fs from 'fs';
import path from 'path';

function replace(filePath, search, replace) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes(search)) {
    console.error(`NOT FOUND in ${filePath}: ${search.substring(0, 80)}...`);
    return false;
  }
  content = content.replace(search, replace);
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

// 1. faceTracker.ts - remove _sampleInterval field (it was set but never read elsewhere)
// Need to check if it's used elsewhere first - it's a private field set in constructor
// Since it's truly unused, remove the field and the assignment
replace('src/services/faceTracker.ts',
  '  private _sampleInterval: number;\n\n  constructor(sampleInterval: number = 0.5) {\n    this._sampleInterval = sampleInterval;\n  }',
  '  constructor(_sampleInterval: number = 0.5) {\n  }');

// 2. splitScreen.ts - still has 'fs' import. Let me check the file
// The import line might have CRLF issues, let me read and check
let content = fs.readFileSync('src/services/splitScreen.ts', 'utf-8');
console.log('splitScreen.ts lines 1-5:', JSON.stringify(content.substring(0, 200)));

// 3. autoReframe.ts - _extractCenterCrop function is unused - need to remove it
// Read the file to find the function
content = fs.readFileSync('src/services/autoReframe.ts', 'utf-8');
// Find the function and its closing
const extractCenterStart = content.indexOf('async function _extractCenterCrop(');
if (extractCenterStart > -1) {
  // Find the end of function - look for next top-level declaration
  let braceCount = 0;
  let inFunc = false;
  let funcEnd = extractCenterStart;
  for (let i = extractCenterStart; i < content.length; i++) {
    if (content[i] === '{') { braceCount++; inFunc = true; }
    if (content[i] === '}') { braceCount--; }
    if (inFunc && braceCount === 0) { funcEnd = i + 1; break; }
  }
  // Also remove the blank line after
  while (funcEnd < content.length && content[funcEnd] === '\n') funcEnd++;
  content = content.substring(0, extractCenterStart) + content.substring(funcEnd);
  fs.writeFileSync('src/services/autoReframe.ts', content, 'utf-8');
  console.log('Removed _extractCenterCrop from autoReframe.ts');
} else {
  console.error('_extractCenterCrop not found in autoReframe.ts');
}

// 4. perFrameCropper.ts - _smoothCropPositions is unused - remove it
content = fs.readFileSync('src/services/clipper/perFrameCropper.ts', 'utf-8');
const smoothStart = content.indexOf('function _smoothCropPositions(');
if (smoothStart > -1) {
  let braceCount = 0, inFunc = false, funcEnd = smoothStart;
  for (let i = smoothStart; i < content.length; i++) {
    if (content[i] === '{') { braceCount++; inFunc = true; }
    if (content[i] === '}') { braceCount--; }
    if (inFunc && braceCount === 0) { funcEnd = i + 1; break; }
  }
  while (funcEnd < content.length && content[funcEnd] === '\n') funcEnd++;
  // Also remove the preceding JSDoc comment
  let startDel = smoothStart;
  while (startDel > 0 && content[startDel - 1] === '\n') startDel--;
  if (content.substring(startDel - 4, startDel) === '/**\n') {
    startDel -= 3;
    // find start of JSDoc
    let jsdocStart = content.lastIndexOf('/**', startDel);
    if (jsdocStart > -1 && content.substring(jsdocStart, startDel).includes('*')) {
      startDel = jsdocStart;
      while (startDel > 0 && content[startDel - 1] === '\n') startDel--;
    }
  }
  content = content.substring(0, startDel) + content.substring(funcEnd);
  fs.writeFileSync('src/services/clipper/perFrameCropper.ts', content, 'utf-8');
  console.log('Removed _smoothCropPositions from perFrameCropper.ts');
}

// 5. postCropService.ts - _generateSRTFromSegments is unused - remove it
content = fs.readFileSync('src/services/clipper/postCropService.ts', 'utf-8');
const genSrtStart = content.indexOf('async function _generateSRTFromSegments(');
if (genSrtStart > -1) {
  let braceCount = 0, inFunc = false, funcEnd = genSrtStart;
  for (let i = genSrtStart; i < content.length; i++) {
    if (content[i] === '{') { braceCount++; inFunc = true; }
    if (content[i] === '}') { braceCount--; }
    if (inFunc && braceCount === 0) { funcEnd = i + 1; break; }
  }
  while (funcEnd < content.length && content[funcEnd] === '\n') funcEnd++;
  content = content.substring(0, genSrtStart) + content.substring(funcEnd);
  fs.writeFileSync('src/services/clipper/postCropService.ts', content, 'utf-8');
  console.log('Removed _generateSRTFromSegments');
}

// 6. smartCropper.ts - _getOutputDimensions is unused - remove it
content = fs.readFileSync('src/services/clipper/smartCropper.ts', 'utf-8');
const getOutDimStart = content.indexOf('function _getOutputDimensions(');
if (getOutDimStart > -1) {
  let braceCount = 0, inFunc = false, funcEnd = getOutDimStart;
  for (let i = getOutDimStart; i < content.length; i++) {
    if (content[i] === '{') { braceCount++; inFunc = true; }
    if (content[i] === '}') { braceCount--; }
    if (inFunc && braceCount === 0) { funcEnd = i + 1; break; }
  }
  while (funcEnd < content.length && content[funcEnd] === '\n') funcEnd++;
  content = content.substring(0, getOutDimStart) + content.substring(funcEnd);
  fs.writeFileSync('src/services/clipper/smartCropper.ts', content, 'utf-8');
  console.log('Removed _getOutputDimensions');
}

// 7. subtitleMixer.ts - _srtTimeToSeconds is unused - remove it
content = fs.readFileSync('src/services/clipper/subtitleMixer.ts', 'utf-8');
const srtTimeStart = content.indexOf('function _srtTimeToSeconds(');
if (srtTimeStart > -1) {
  let braceCount = 0, inFunc = false, funcEnd = srtTimeStart;
  for (let i = srtTimeStart; i < content.length; i++) {
    if (content[i] === '{') { braceCount++; inFunc = true; }
    if (content[i] === '}') { braceCount--; }
    if (inFunc && braceCount === 0) { funcEnd = i + 1; break; }
  }
  while (funcEnd < content.length && content[funcEnd] === '\n') funcEnd++;
  content = content.substring(0, srtTimeStart) + content.substring(funcEnd);
  fs.writeFileSync('src/services/clipper/subtitleMixer.ts', content, 'utf-8');
  console.log('Removed _srtTimeToSeconds');
}

// 8. colorGrader.ts - _HUE_MAP is unused - remove it
content = fs.readFileSync('src/services/colorGrader.ts', 'utf-8');
const hueMapStart = content.indexOf('const _HUE_MAP');
if (hueMapStart > -1) {
  let endIdx = content.indexOf('\n};', hueMapStart);
  if (endIdx > -1) endIdx += 3;
  // Remove trailing newline
  while (endIdx < content.length && content[endIdx] === '\n') endIdx++;
  content = content.substring(0, hueMapStart) + content.substring(endIdx);
  fs.writeFileSync('src/services/colorGrader.ts', content, 'utf-8');
  console.log('Removed _HUE_MAP');
}

// 9. scheduler.ts - _publish* methods are unused - remove them
content = fs.readFileSync('src/services/scheduler.ts', 'utf-8');
const publishMethods = ['_publishToYouTube', '_publishToTikTok', '_publishToX', '_publishToMeta'];
for (const method of publishMethods) {
  const start = content.indexOf(`private async ${method}(video: any)`);
  if (start > -1) {
    // Find start of method (go back to find '  ')
    let methodStart = start;
    while (methodStart > 0 && content[methodStart - 1] === ' ') methodStart--;
    while (methodStart > 0 && content[methodStart - 1] === '\n') methodStart--;
    methodStart++; // include the newline
    
    let braceCount = 0, inFunc = false, funcEnd = start;
    for (let i = start; i < content.length; i++) {
      if (content[i] === '{') { braceCount++; inFunc = true; }
      if (content[i] === '}') { braceCount--; }
      if (inFunc && braceCount === 0) { funcEnd = i + 1; break; }
    }
    while (funcEnd < content.length && content[funcEnd] === '\n') funcEnd++;
    content = content.substring(0, methodStart) + content.substring(funcEnd);
    console.log(`Removed ${method} from scheduler.ts`);
  }
}
fs.writeFileSync('src/services/scheduler.ts', content, 'utf-8');

// 10. orchestrator.ts - _getAgentName is unused - remove it
content = fs.readFileSync('src/services/talkShow/orchestrator.ts', 'utf-8');
const getAgentNameStart = content.indexOf('function _getAgentName(');
if (getAgentNameStart > -1) {
  let braceCount = 0, inFunc = false, funcEnd = getAgentNameStart;
  for (let i = getAgentNameStart; i < content.length; i++) {
    if (content[i] === '{') { braceCount++; inFunc = true; }
    if (content[i] === '}') { braceCount--; }
    if (inFunc && braceCount === 0) { funcEnd = i + 1; break; }
  }
  while (funcEnd < content.length && content[funcEnd] === '\n') funcEnd++;
  content = content.substring(0, getAgentNameStart) + content.substring(funcEnd);
  fs.writeFileSync('src/services/talkShow/orchestrator.ts', content, 'utf-8');
  console.log('Removed _getAgentName');
}

// 11. orchestratorToVideo.ts - _AGENT_VOICES and _TEXT_MAX_WIDTH are unused - remove them
content = fs.readFileSync('src/services/talkShow/orchestratorToVideo.ts', 'utf-8');
let agentVoicesStart = content.indexOf('const _AGENT_VOICES');
if (agentVoicesStart > -1) {
  let endIdx = content.indexOf('\n};', agentVoicesStart);
  if (endIdx > -1) endIdx += 3;
  while (endIdx < content.length && content[endIdx] === '\n') endIdx++;
  content = content.substring(0, agentVoicesStart) + content.substring(endIdx);
}
let textMaxStart = content.indexOf('const _TEXT_MAX_WIDTH =');
if (textMaxStart > -1) {
  let endIdx = content.indexOf('\n', textMaxStart);
  if (endIdx > -1) endIdx += 1;
  content = content.substring(0, textMaxStart) + content.substring(endIdx);
}
fs.writeFileSync('src/services/talkShow/orchestratorToVideo.ts', content, 'utf-8');
console.log('Removed _AGENT_VOICES and _TEXT_MAX_WIDTH from orchestratorToVideo.ts');

// 12. sceneComposer.ts - _CROSSFADE_DURATION is unused - remove it
content = fs.readFileSync('src/services/talkShow/sceneComposer.ts', 'utf-8');
let crossfadeStart = content.indexOf('const _CROSSFADE_DURATION =');
if (crossfadeStart > -1) {
  let endIdx = content.indexOf('\n', crossfadeStart);
  if (endIdx > -1) endIdx += 1;
  content = content.substring(0, crossfadeStart) + content.substring(endIdx);
  fs.writeFileSync('src/services/talkShow/sceneComposer.ts', content, 'utf-8');
  console.log('Removed _CROSSFADE_DURATION');
}

console.log('Done with batch 2');
