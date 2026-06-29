import fs from 'fs';

function removeLineContaining(filePath, searchStr) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const newLines = lines.filter(l => !l.includes(searchStr));
  fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
}

function prefixParam(filePath, searchStr, replacement) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(searchStr, replacement);
  fs.writeFileSync(filePath, content, 'utf-8');
}

function removeFuncBody(filePath, funcSignature) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const start = content.indexOf(funcSignature);
  if (start === -1) { console.error(`NOT FOUND: ${funcSignature} in ${filePath}`); return; }
  let depth = 0, found = false, end = start;
  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') { depth++; found = true; }
    if (content[i] === '}') { depth--; }
    if (found && depth === 0) { end = i + 1; break; }
  }
  // also eat trailing whitespace/newlines
  while (end < content.length && (content[end] === '\n' || content[end] === '\r')) end++;
  // eat preceding JSDoc comment
  let delStart = start;
  // go back past blank lines
  while (delStart > 0 && content[delStart-1] === '\n') delStart--;
  // check for JSDoc
  if (content.substring(delStart-4, delStart) === '/**\n') {
    delStart -= 3;
    const jsdocStart = content.lastIndexOf('/**', delStart);
    if (jsdocStart > -1) {
      delStart = jsdocStart;
      while (delStart > 0 && content[delStart-1] === '\n') delStart--;
    }
  }
  content = content.substring(0, delStart) + '\n' + content.substring(end);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Removed function: ${funcSignature} from ${filePath}`);
}

// 1. smartCropper.ts - paddingRatio unused param → prefix with _
prefixParam('src/services/clipper/smartCropper.ts',
  'paddingRatio = 0.3,', '_paddingRatio = 0.3,');

// 2. splitScreenService.ts:344 - dimsParts unused variable → remove line
removeLineContaining('src/services/clipper/splitScreenService.ts', 'const dimsParts');

// 3. memoryVaultService.ts:90 - sessionId unused param
prefixParam('src/services/memoryVaultService.ts',
  'sessionId: string,', '_sessionId: string,');

// 4. mllmValidator.ts:88 - jobId unused param
prefixParam('src/services/mllmValidator.ts',
  'jobId: number,', '_jobId: number,');

// 5. multiAgentPipeline.ts:287 - jobId unused param
prefixParam('src/services/multiAgentPipeline.ts',
  '  jobId: number,', '  _jobId: number,');

// 6. museTalkService.ts:109-110 - videoBuffer, audioBuffer unused → remove
removeLineContaining('src/services/museTalkService.ts', 'const videoBuffer');
removeLineContaining('src/services/museTalkService.ts', 'const audioBuffer');

// 7. pictureNarration.ts:89 - language unused destructured → prefix
prefixParam('src/services/pictureNarration.ts',
  "language = 'en'", "_language = 'en'");

// 8. splitScreen.ts:2 - 'fs' still unused → remove
removeLineContaining('src/services/splitScreen.ts', "import fs from 'fs-extra'");

// 9. storyBibleService.ts:424 - template unused param
prefixParam('src/services/storyBibleService.ts',
  "template: 'cinematic' | 'dynamic' | 'simple' | 'pixar',",
  "_template: 'cinematic' | 'dynamic' | 'simple' | 'pixar',");

// 10. storyBibleService.ts:474 - idx unused in map callback
prefixParam('src/services/storyBibleService.ts',
  '.map((pp, idx) =>', '.map((pp, _idx) =>');

// 11. apiFootballProvider.ts - remove unused type imports and destructured vars
{
  let c = fs.readFileSync('src/services/talkShow/apiFootballProvider.ts', 'utf-8');
  // Remove WeatherSnapshot, InjuryReport, OddsSnapshot from import
  c = c.replace(/import \{ MatchFeed, WeatherSnapshot, InjuryReport, OddsSnapshot \}/, 'import { MatchFeed }');
  // Remove unused destructured vars
  c = c.replace(/  const home = fixture\.teams\?\.home\?\.name \|\| match\.homeTeam;\n  const away = fixture\.teams\?\.away\?\.name \|\| match\.awayTeam;\n  const score = fixture\.goals;\n  const homeGoals = score\?\.home \?\? 0;\n  const awayGoals = score\?\.away \?\? 0;/,
    '  const score = fixture.goals;');
  fs.writeFileSync('src/services/talkShow/apiFootballProvider.ts', c, 'utf-8');
  console.log('Fixed apiFootballProvider.ts');
}

// 12. orchestratorToVideo.ts:184 - reject unused in Promise
prefixParam('src/services/talkShow/orchestratorToVideo.ts',
  '(resolve, reject) =>', '(resolve, _reject) =>');

// 13. sceneComposer.ts:135 - stdout/stderr unused in callback
{
  let c = fs.readFileSync('src/services/talkShow/sceneComposer.ts', 'utf-8');
  c = c.replace('(err, stdout, stderr)', '(err, _stdout, _stderr)');
  // Remove unused inputFiles variable
  c = c.replace(/  const inputFiles: string\[\] = \[bgPath, scene\.avatarPath\];\n/, '');
  // Remove unused maps variable
  c = c.replace(/  const maps: string\[\] = \[\];\n/, '');
  fs.writeFileSync('src/services/talkShow/sceneComposer.ts', c, 'utf-8');
  console.log('Fixed sceneComposer.ts');
}

// 14. scriptToVideoAdapter.ts:27 - showId unused param
prefixParam('src/services/talkShow/scriptToVideoAdapter.ts',
  '  showId: number,', '  _showId: number,');

// 15. videoProducer.ts:30 - options unused param  
prefixParam('src/services/talkShow/videoProducer.ts',
  '  options: { backgroundVideo?: string } = {},', '  _options: { backgroundVideo?: string } = {},');

// 16. transcriptEditor.ts:44 - transcript unused param
prefixParam('src/services/transcriptEditor.ts',
  '  transcript: string,', '  _transcript: string,');

// 17. videoDownloader.ts:35 - stdout unused in callback
prefixParam('src/services/videoDownloader.ts',
  '(err, stdout, stderr)', '(err, _stdout, stderr)');

// 18. videoService.ts:737-738 - videoWidth/videoHeight unused params
prefixParam('src/services/videoService.ts',
  '  _videoWidth = 1920,\n  _videoHeight = 1080,', '  _videoWidth = 1920,\n  _videoHeight = 1080,');

// 19. videoToVideoService.ts:4 - runFFmpegWithFallback still unused → remove
removeLineContaining('src/services/videoToVideoService.ts', 'runFFmpegWithFallback');

// 20. dashboard.ts:157 - cancelBtn unused var → remove
{
  let c = fs.readFileSync('src/views/dashboard.ts', 'utf-8');
  // Find the cancelBtn assignment and remove it
  const idx = c.indexOf('var cancelBtn =');
  if (idx > -1) {
    // Find end of statement (the ;)
    let end = c.indexOf(';', idx);
    if (end > -1) {
      // go back to beginning of line
      let lineStart = idx;
      while (lineStart > 0 && c[lineStart-1] === '\n') lineStart--;
      // Actually we want to keep the newline before, so just remove from idx to end+1
      // Also consume trailing newline
      end++;
      while (end < c.length && (c[end] === '\n' || c[end] === '\r')) end++;
      c = c.substring(0, idx) + c.substring(end);
    }
  }
  fs.writeFileSync('src/views/dashboard.ts', c, 'utf-8');
  console.log('Fixed dashboard.ts');
}

// 21. emotionCaptions.ts - remaining: _stdout, peakLevels, _primaryColor
// These are already prefixed in previous runs. Check if there are still issues.
// The TS errors were: stdout at 256, peakLevels at 267, _primaryColor at 521
// Let me check if these need actual removal
{
  let c = fs.readFileSync('src/services/emotionCaptions.ts', 'utf-8');
  // peakLevels unused at line 267 area
  c = c.replace('  const peakLevels: number[] = [];\n', '');
  fs.writeFileSync('src/services/emotionCaptions.ts', c, 'utf-8');
  console.log('Fixed emotionCaptions.ts peakLevels');
}

// 22. faceTracker.ts:200 - _sampleInterval still flagged (noUnusedLocals doesn't respect _)
// The field was already prefixed. Since noUnusedLocals doesn't respect _, we need to remove it.
// Actually I already replaced the constructor. Let me check if the field declaration is still there.
{
  let c = fs.readFileSync('src/services/faceTracker.ts', 'utf-8');
  // The private field was renamed but still unused
  c = c.replace('  private _sampleInterval: number;\n\n', '');
  fs.writeFileSync('src/services/faceTracker.ts', c, 'utf-8');
  console.log('Fixed faceTracker.ts _sampleInterval');
}

console.log('=== ALL FIXES APPLIED ===');
