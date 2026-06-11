import { spawn } from 'child_process';

let ltProcess: any = null;

export async function startNgrokTunnel(port: number): Promise<string> {
  console.log(`[INFO] Node.js sunucusu için localtunnel tüneli başlatılıyor... Port: ${port}`);

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
      console.log(`[localtunnel] ${chunk.trim()}`);
      
      const match = stdoutBuffer.match(/your url is:\s*(https?:\/\/[^\s]+)/i);
      if (match && match[1]) {
        const publicUrl = match[1].trim();
        process.env.PUBLIC_URL = publicUrl;
        console.log(`🚀 [OK] Node.js localtunnel tüneli aktif: ${publicUrl}`);
        urlFound = true;
        clearTimeout(timeout);
        resolve(publicUrl);
      }
    });

    ltProcess.stderr.on('data', (data: any) => {
      const chunk = data.toString();
      console.error(`[localtunnel-err] ${chunk.trim()}`);
      errorOutput += chunk;
    });

    ltProcess.on('close', (code: number) => {
      if (!urlFound) {
        clearTimeout(timeout);
        reject(new Error(`localtunnel süreci beklenmedik şekilde kapandı, çıkış kodu: ${code}. Hata: ${errorOutput}`));
      }
    });
  });
}

export function stopNgrokTunnel() {
  if (ltProcess) {
    console.log('[INFO] Node.js localtunnel tüneli durduruluyor...');
    ltProcess.kill();
    ltProcess = null;
  }
}
