import { spawn } from 'child_process';
import { Logger } from './logger.js';

let ltProcess: any = null;
let currentPort: number | null = null;
let retryCount = 0;
let isUnmounting = false;
const MAX_RETRIES = 3;

export async function startNgrokTunnel(port: number): Promise<string> {
  currentPort = port;
  Logger.info(`Node.js sunucusu için localtunnel tüneli başlatılıyor... Port: ${port}`);

  return new Promise<string>((resolve, reject) => {
    let urlFound = false;
    let errorOutput = '';
    let stdoutBuffer = '';

    // Windows'ta npx komutu bir shell script olduğundan shell: true kullanmak zorunludur.
    ltProcess = spawn('npx', ['-y', 'localtunnel', '--port', port.toString()], { shell: true });

    const timeout = setTimeout(() => {
      if (!urlFound) {
        if (ltProcess) {
          ltProcess.kill();
          ltProcess = null;
        }
        reject(new Error('localtunnel tünel URL\'i 15 saniye içinde alınamadı. ' + errorOutput));
      }
    }, 15000);

    ltProcess.stdout.on('data', (data: any) => {
      const chunk = data.toString();
      stdoutBuffer += chunk;
      Logger.debug(`[localtunnel] ${chunk.trim()}`);
      
      const match = stdoutBuffer.match(/your url is:\s*(https?:\/\/[^\s]+)/i);
      if (match && match[1]) {
        const publicUrl = match[1].trim();
        process.env.PUBLIC_URL = publicUrl;
        Logger.info(`Node.js localtunnel tüneli aktif: ${publicUrl}`);
        urlFound = true;
        retryCount = 0; // Başarılı bağlantıda deneme sayacını sıfırla
        clearTimeout(timeout);
        resolve(publicUrl);
      }
    });

    ltProcess.stderr.on('data', (data: any) => {
      const chunk = data.toString();
      Logger.warn(`[localtunnel-err] ${chunk.trim()}`);
      errorOutput += chunk;
    });

    ltProcess.on('close', (code: number) => {
      if (!urlFound) {
        clearTimeout(timeout);
        reject(new Error(`localtunnel süreci beklenmedik şekilde kapandı, çıkış kodu: ${code}. Hata: ${errorOutput}`));
      } else {
        // Tünel aktifken beklenmedik şekilde kapandıysa auto-recovery tetikle
        Logger.warn(`Localtunnel tünel bağlantısı koptu (Çıkış kodu: ${code}). Yeniden bağlanılıyor...`);
        ltProcess = null;
        handleTunnelCrash();
      }
    });
  });
}

function handleTunnelCrash() {
  if (retryCount < MAX_RETRIES && currentPort) {
    retryCount++;
    const backoffMs = retryCount * 5000;
    Logger.info(`Localtunnel tüneli ${backoffMs / 1000} saniye içinde tekrar başlatılacak (Deneme: ${retryCount}/${MAX_RETRIES})...`);
    setTimeout(() => {
      if (isUnmounting) return;
      if (currentPort) {
        startNgrokTunnel(currentPort).catch(err => {
          Logger.error('Localtunnel otomatik kurtarma denemesi başarısız oldu', err);
          handleTunnelCrash();
        });
      }
    }, backoffMs);
  } else {
    Logger.error(`Localtunnel maksimum yeniden deneme limitine (${MAX_RETRIES}) ulaştı. Tünel otomatik kurtarma durduruldu.`);
  }
}

export function stopNgrokTunnel() {
  if (ltProcess) {
    Logger.info('Node.js localtunnel tüneli durduruluyor...');
    ltProcess.kill();
    ltProcess = null;
  }
  currentPort = null;
}
