import axios from 'axios';
import fs from 'fs';
import { TIMEOUT } from '../constants.js';

export async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await axios({ method: 'GET', url, responseType: 'stream', timeout: TIMEOUT.DOWNLOAD });
  const w = fs.createWriteStream(dest);
  res.data.pipe(w);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      w.destroy();
      reject(new Error(`Download stream timeout: ${url}`));
    }, 120000);
    w.on('finish', () => {
      clearTimeout(timeout);
      resolve();
    });
    w.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
