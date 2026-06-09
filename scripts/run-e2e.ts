import { chromium } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        server.close();
        resolve(false);
      });
    server.listen(port);
  });
}

async function main() {
  const port = 3016;
  let serverProcess: ChildProcess | null = null;

  console.log('--------------------------------------------------');
  console.log('🚀 AI Publisher E2E Görsel Tarayıcı Testi Başlatılıyor');
  console.log('--------------------------------------------------');

  const portActive = await isPortInUse(port);
  if (!portActive) {
    console.log(`[E2E] Port ${port} aktif değil. Express sunucusu arka planda başlatılıyor...`);
    serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });
    // Sunucunun ayağa kalkması için 6 saniye bekle
    await delay(6000);
  } else {
    console.log(`[E2E] Port ${port} zaten aktif. Mevcut çalışan sunucu kullanılacak.`);
  }

  // Tarayıcıyı headful (headless: false) modda başlatıyoruz
  console.log('[E2E] Playwright Chromium tarayıcısı açılıyor (headless: false)...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100 // Her işlemi 100ms yavaşlatarak takibi kolaylaştırır
  });

  const page = await browser.newPage();
  
  // Ekran boyutunu ayarla
  await page.setViewportSize({ width: 1280, height: 800 });

  try {
    const baseUrl = `http://localhost:${port}`;

    // 1. Giriş Sayfasına Git
    console.log(`[E2E] 1. Giriş sayfasına gidiliyor: ${baseUrl}/login`);
    await page.goto(`${baseUrl}/login`);
    await delay(1500);

    // 2. Formu Doldur ve Giriş Yap
    console.log('[E2E] 2. Kullanıcı bilgileri dolduruluyor...');
    const adminUser = 'arda.avci@gmail.com';
    const adminPass = process.env.DEFAULT_ADMIN_PASSWORD || 'admin1234!!';

    await page.fill('input[name="username"]', adminUser);
    await delay(500);
    await page.fill('input[name="password"]', adminPass);
    await delay(1000);

    console.log('[E2E] Giriş yap butonuna tıklanıyor...');
    await page.click('button[type="submit"]');
    
    // Yönlendirmeyi bekle
    await page.waitForURL(baseUrl + '/');
    console.log('[E2E] Başarıyla giriş yapıldı ve Dashboard yüklendi!');
    await delay(2000);

    // 3. Ayarlar Modalı ve Tema Değişimi
    console.log('[E2E] 3. Ayarlar modalı açılıyor...');
    await page.click('button[onclick="openModal(\'settingsModal\')"]');
    await page.waitForSelector('#settingsModal', { state: 'visible' });
    await delay(1500);

    // Sekmeler arasında gezin
    console.log('[E2E] Ayarlar sekmeleri geziliyor...');
    const tabs = ['settings-language', 'settings-account', 'settings-production', 'settings-appearance'];
    for (const tab of tabs) {
      await page.click(`button[data-target="${tab}"]`);
      console.log(`[E2E] Sekme açıldı: ${tab}`);
      await delay(1200);
    }

    // Temayı değiştir (örneğin Cyberpunk)
    console.log('[E2E] Premium tema uygulanıyor (cyberpunk)...');
    await page.click('button[data-theme="cyberpunk"]');
    await delay(2000);

    // Temayı değiştir (örneğin Nebula)
    console.log('[E2E] Premium tema değiştiriliyor (nebula)...');
    await page.click('button[data-theme="nebula"]');
    await delay(2000);

    // Ayarlar modalını kapat
    console.log('[E2E] Ayarlar modalı kapatılıyor...');
    await page.click('#settingsModal button.modal-close');
    await page.waitForSelector('#settingsModal', { state: 'hidden' });
    await delay(1500);

    // 4. Fırsatlar Hunisi Modalı
    console.log('[E2E] 4. Fırsatlar Hunisi modalı açılıyor...');
    await page.click('button[onclick="openModal(\'opportunityModal\')"]');
    await page.waitForSelector('#opportunityModal', { state: 'visible' });
    await delay(1500);

    // Önerilen bir kelimeye tıkla
    console.log('[E2E] Önerilen anahtar kelime seçiliyor...');
    const suggestionBtn = await page.$('.opp-suggestion');
    if (suggestionBtn) {
      await suggestionBtn.click();
      console.log('[E2E] Anahtar kelime eklendi.');
      await delay(1500);
    }

    // Modal kapat
    console.log('[E2E] Fırsatlar Hunisi modalı kapatılıyor...');
    await page.click('#opportunityModal button.modal-close');
    await page.waitForSelector('#opportunityModal', { state: 'hidden' });
    await delay(1500);

    // 5. Yeni Proje Formunu Doldurma
    console.log('[E2E] 5. Yeni proje oluşturma formu dolduruluyor...');
    
    await page.fill('textarea[name="master_prompt"]', 'E2E Görsel Test: Siberpunk sarmalında kaybolan son insan.');
    await delay(800);
    
    await page.fill('textarea[name="production_notes"]', 'Karanlık siberpunk atmosfer, neon mavi sarmallar, dramatik synthwave müzik.');
    await delay(800);
    
    await page.fill('textarea[name="transcript_text"]', 'Gelecekte, yapay zeka insanlığın kaderini kontrol ediyor.');
    await delay(800);
    
    await page.fill('textarea[name="character_features"]', 'Mavi neon şeritli ceket giyen, sarışın siberpunk kadın ajan.');
    await delay(800);

    // Süre modunu değiştir
    console.log('[E2E] Süre modu seçiliyor (shorter)...');
    await page.selectOption('select[name="differentiation_duration_mode"]', 'shorter');
    await delay(1000);

    // Platformları seç (X platformunu da işaretle)
    console.log('[E2E] Hedef paylaşım platformları seçiliyor...');
    const xCheckbox = await page.$('input[name="platforms"][value="x"]');
    if (xCheckbox && !(await xCheckbox.isChecked())) {
      await xCheckbox.check();
      await delay(1000);
    }

    // Formu gönder
    console.log('[E2E] Proje kuyruğa ekleniyor (Form gönderiliyor)...');
    await page.click('form#jobForm button[type="submit"]');

    // Dashboard'un yenilenmesini bekle
    await page.waitForURL(baseUrl + '/');
    console.log('[E2E] Yeni proje başarıyla kuyruğa eklendi!');
    await delay(3000);

  } catch (err) {
    console.error('[E2E] Test sırasında HATA oluştu:', err);
  } finally {
    console.log('[E2E] Tarayıcı kapatılıyor...');
    await browser.close();

    if (serverProcess) {
      console.log('[E2E] Spawn edilmiş Express sunucusu kapatılıyor...');
      serverProcess.kill('SIGINT');
    }
    console.log('--------------------------------------------------');
    console.log('🏁 AI Publisher E2E Görsel Tarayıcı Testi Tamamlandı');
    console.log('--------------------------------------------------');
  }
}

main().catch(console.error);
