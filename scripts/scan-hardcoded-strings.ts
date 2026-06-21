import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const SRC_DIRS = ['src', 'client/src'];
const SKIP_DIRS = new Set(['scripts', 'node_modules', '.git']);

const isJson = process.argv.includes('--json');
const isFix = process.argv.includes('--fix');

interface Match {
  file: string;
  line: number;
  text: string;
  type: 'user_message' | 'alert';
}

function collectFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectFiles(fullPath));
      } else if (entry.isFile() && /\.(ts|tsx)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch {
    // directory doesn't exist, skip silently
  }
  return files;
}

function scanFile(absPath: string, relPath: string): Match[] {
  const content = readFileSync(absPath, 'utf-8');
  const lines = content.split('\n');
  const matches: Match[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // alert("...")
    const alertRe = /alert\s*\(\s*(["'`])(.+?)\1\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = alertRe.exec(line)) !== null) {
      matches.push({ file: relPath, line: i + 1, text: m[2]!, type: 'alert' });
    }

    // res.status(NNN).json({..., error: "..."})
    if (/res\.\s*status\s*\(\s*\d{3}\s*\)/.test(line) && /\.json\s*\(/.test(line)) {
      const userRe = /(?:error|message):\s*(["'`])(.+?)\1/g;
      while ((m = userRe.exec(line)) !== null) {
        matches.push({ file: relPath, line: i + 1, text: m[2]!, type: 'user_message' });
      }
    }

    // SSE res.write stage/userMessage strings
    if (/res\.\s*write/.test(line) || /\bwrite\s*\(\s*`/.test(line)) {
      const sseRe = /(?:stage|userMessage|message|event|error):\s*(["'`])(.+?)\1/g;
      while ((m = sseRe.exec(line)) !== null) {
        matches.push({ file: relPath, line: i + 1, text: m[2]!, type: 'user_message' });
      }
    }
  }

  return matches;
}

function fixAlerts(absPath: string): number {
  const content = readFileSync(absPath, 'utf-8');
  const re = /alert\s*\(\s*(["'`])(.+?)\1\s*\)/g;
  const count = (content.match(re) || []).length;
  if (count > 0) {
    const fixed = content.replace(re, 'window.showToast($1$2$1)');
    writeFileSync(absPath, fixed, 'utf-8');
  }
  return count;
}

// --- Main ---
const allMatches: Match[] = [];
let fixCount = 0;

for (const dir of SRC_DIRS) {
  const absDir = join(ROOT, dir);
  const files = collectFiles(absDir);
  for (const file of files) {
    const rel = file.substring(ROOT.length + 1);
    if (isFix) {
      fixCount += fixAlerts(file);
    }
    allMatches.push(...scanFile(file, rel));
  }
}

const summary = { total: allMatches.length, user_message: 0, alert: 0 };
for (const m of allMatches) {
  summary[m.type]++;
}

if (isJson) {
  const output: Record<string, unknown> = { matches: allMatches, summary };
  if (isFix) output.fixed = fixCount;
  console.log(JSON.stringify(output, null, 2));
} else {
  if (allMatches.length > 0) {
    const maxTypeLen = Math.max(...allMatches.map(m => m.type.length));
    for (const m of allMatches) {
      const padding = ' '.repeat(maxTypeLen - m.type.length + 2);
      console.log(`[${m.type}]${padding}${m.file}:${m.line}  "${m.text}"`);
    }
    console.log('---');
  }

  console.log(`Toplam: ${summary.total} hardcoded string`);
  for (const [type, count] of Object.entries(summary)) {
    if (type === 'total') continue;
    console.log(`  ${type}: ${count}`);
  }

  if (isFix) {
    console.log(`\nDüzeltilen alert() çağrısı: ${fixCount}`);
  }
}
