import { parentPort, workerData } from 'worker_threads';
import { execFile } from 'child_process';

const { cmd, args, timeoutMs = 30000 } = workerData;

async function executeFfmpeg() {
  try {
    const process = execFile(cmd, args, (error, stdout, stderr) => {
      if (error) {
        parentPort?.postMessage({
          status: 'error',
          error: `Command failed with code ${error.code}. Stderr: ${stderr}`,
        });
      } else {
        parentPort?.postMessage({ status: 'success', stdout, stderr });
      }
    });

    if (timeoutMs > 0) {
      setTimeout(() => {
        process.kill('SIGKILL');
        parentPort?.postMessage({
          status: 'timeout_fallback',
          error: 'FFmpeg execution timed out (Coworker Pool Protection).',
        });
      }, timeoutMs);
    }
  } catch (err: any) {
    parentPort?.postMessage({ status: 'error', error: err.message });
  }
}

executeFfmpeg();
