import { parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';
import path from 'path';

if (!parentPort) {
  process.exit(1);
}

const { framePath } = workerData;

// CommonJS ortamı için __dirname doğrudan kullanılabilir.
const scriptPath = path.join(__dirname, 'face-track-worker.py');
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

const pyProcess = spawn(pythonCmd, [scriptPath, framePath]);

let outputData = '';
let errorData = '';

pyProcess.stdout.on('data', (data) => {
  outputData += data.toString();
});

pyProcess.stderr.on('data', (data) => {
  errorData += data.toString();
});

pyProcess.on('close', (code) => {
  if (code !== 0) {
    parentPort!.postMessage({ error: `Python worker exited with code ${code}. Error: ${errorData}`, faces: [] });
    return;
  }

  try {
    const result = JSON.parse(outputData.trim());
    parentPort!.postMessage(result);
  } catch (err: any) {
    parentPort!.postMessage({ error: `Failed to parse Python output: ${err.message}. Raw: ${outputData}`, faces: [] });
  }
});
