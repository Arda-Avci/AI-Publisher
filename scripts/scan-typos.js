"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const srcDir = (0, path_1.join)(__dirname, '..', 'src');
const clientSrcDir = (0, path_1.join)(__dirname, '..', 'client', 'src');
const typos = [
    [/\bacount\b/gi, 'account'],
    [/\bteh\b/gi, 'the'],
    [/\brecieve\b/gi, 'receive'],
    [/\boccured\b/gi, 'occurred'],
    [/\bthier\b/gi, 'their'],
    [/\bdont\b/gi, "don't"],
    [/\bcant\b/gi, "can't"],
    [/\bwont\b/gi, "won't"],
    [/\buntill\b/gi, 'until'],
    [/\bFollwo\b/gi, 'Follow'],
    [/\bsucces\b/gi, 'success'],
    [/\bfaile\b/gi, 'fail'],
    [/\bcomming\b/gi, 'coming'],
    [/\brecomend\b/gi, 'recommend'],
    [/\brecieve\b/gi, 'receive'],
    [/\bOccured\b/gi, 'Occurred'],
    [/\bRecieved\b/gi, 'Received'],
];
const techDebtPatterns = [
    { regex: /\bFIXME\b/gi, type: 'FIXME' },
    { regex: /\bHACK\b/gi, type: 'HACK' },
    { regex: /\bTODO\b/gi, type: 'TODO' },
    { regex: /\bBUG\b/gi, type: 'BUG' },
    { regex: /\bXXX\b/gi, type: 'XXX' },
    { regex: /\bDEPRECATED\b/gi, type: 'DEPRECATED' },
];
function scanFile(filePath) {
    const content = (0, fs_1.readFileSync)(filePath, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const [regex, correction] of typos) {
            const match = line.match(regex);
            if (match) {
                console.log(`${filePath}:${i + 1}: typo "${match[0]}" → "${correction}"`);
            }
        }
        for (const { regex, type } of techDebtPatterns) {
            if (regex.test(line)) {
                console.log(`${filePath}:${i + 1}: [TECHDEBT:${type}] ${line.trim().substring(0, 80)}`);
            }
        }
    }
}
function scanDir(dir) {
    try {
        const entries = (0, fs_1.readdirSync)(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = (0, path_1.join)(dir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                scanDir(fullPath);
            }
            else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                scanFile(fullPath);
            }
        }
    }
    catch (e) {
        // ignore
    }
}
console.log('=== Typo & Tech Debt Scanner ===');
scanDir(srcDir);
scanDir(clientSrcDir);
console.log('=== Scan Complete ===');
