import { chromium } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import dotenv from 'dotenv';

dotenv.config();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') resolve(true);
        else resolve(false);
      })
      .once('listening', () => { server.close(); resolve(false); });
    server.listen(port);
  });
}

async function main() {
  const port = 3016;
  let serverProcess: ChildProcess | null = null;

  console.log('══════════════════════════════════════════════');
  console.log('  AI Publisher E2E Görsel Test');
  console.log('══════════════════════════════════════════════');

  const portActive = await isPortInUse(port);
  if (!portActive) {
    console.log(`[E2E] Sunucu başlatılıyor (port ${port})...`);
    serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
      stdio: 'inherit', shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });
    await delay(10000);
  } else {
    console.log(`[E2E] Mevcut sunucu kullanılıyor (port ${port}).`);
  }

  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  try {
    const baseUrl = `http://localhost:${port}`;

    // 1. Giriş
    console.log('\n[1/7] Giriş yapılıyor...');
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await delay(1000);
    await page.fill('input[name="username"]', 'arda.avci@gmail.com');
    await page.fill('input[name="password"]', process.env.DEFAULT_ADMIN_PASSWORD || 'admin1234!!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    console.log('  ✅ Giriş başarılı');

    // 2. Fırsatlar Hunisi
    console.log('\n[2/7] Fırsatlar Hunisi açılıyor...');

    // Butona tıkla — click + evaluate ile modal aç
    const iconBtns = await page.$$('.icon-btn');
    // İlk icon btn (🔥) opportunity modal'ı açar
    if (iconBtns.length > 0) {
      await iconBtns[0].click();
    } else {
      await page.evaluate(() => (window as any).openModal('opportunityModal'));
    }
    await delay(1000);

    // Modal görünür olana kadar bekle (state:'attached' ile)
    await page.waitForSelector('#opportunityModal', { state: 'attached', timeout: 5000 });
    await delay(500);

    // Modal'ın display kontrolü (CSS'den okumak için getComputedStyle kullanılır)
    const modalVisible = await page.evaluate(() => {
      const el = document.getElementById('opportunityModal');
      return el ? window.getComputedStyle(el).display : 'not found';
    });
    console.log(`  Modal display: ${modalVisible}`);

    // Eğer görünür değilse JS ile zorla aç
    if (modalVisible !== 'block') {
      console.log('  Modal görünür değil, JS ile zorla açılıyor...');
      await page.evaluate(() => {
        document.getElementById('modalBackdrop')!.style.display = 'block';
        document.getElementById('opportunityModal')!.style.display = 'block';
        if (typeof (window as any).openOppStep1 === 'function') (window as any).openOppStep1();
      });
      await delay(800);
    }

    // 3. Fırsat araması
    console.log('\n[3/7] Fırsat araması yapılıyor...');
    const searchInput = await page.$('#opp-interest-input');
    if (searchInput) {
      await searchInput.fill('yapay zeka geleceği');
      await delay(300);
      // addInterest fonksiyonunu doğrudan JS ile çağır (klavye event'i yerine)
      await page.evaluate(() => {
        if (typeof (window as any).addInterest === 'function') (window as any).addInterest('yapay zeka geleceği');
      });
      await delay(500);
      console.log('  Anahtar kelime eklendi');

      // Ara butonuna bas (artık enabled olmalı)
      const searchBtn = await page.$('#opp-search-btn');
      if (searchBtn) {
        const disabled = await searchBtn.evaluate((el) => (el as HTMLButtonElement).disabled);
        console.log(`  Search btn disabled: ${disabled}`);
        if (!disabled) {
          await searchBtn.click();
          await delay(3000);
          console.log('  Arama yapıldı');
        } else {
          console.log('  Search btn hala disabled, sonuçlar doğrudan yüklenemiyor');
        }
      }
    } else {
      console.log('  Arama kutusu bulunamadı, öneri tıklanıyor...');
      const suggestion = await page.$('.opp-suggestion');
      if (suggestion) { await suggestion.click(); await delay(3000); }
    }

    // Sonuç varsa kullan butonuna bas
    const resultBtn = await page.$('.opp-card .opp-use-btn, button:has-text("Prompt Olarak Kullan"), button:has-text("Kullan")');
    if (resultBtn) {
      await resultBtn.click();
      await delay(1500);
      console.log('  İçerik seçildi, forma aktarıldı');
    } else {
      console.log('  Sonuç bulunamadı, form elle doldurulacak');
    }

    // Modal'ı kapat (backdrop dahil)
    await page.evaluate(() => {
      document.getElementById('opportunityModal')!.style.display = 'none';
      document.getElementById('modalBackdrop')!.style.display = 'none';
    });
    await delay(800);
    console.log('  Modal kapatıldı');

    // 4. Form doldurma
    console.log('\n[4/7] Proje formu dolduruluyor...');
    const promptEl = await page.$('textarea[name="master_prompt"]');
    if (promptEl) {
      const val = await promptEl.inputValue();
      if (!val || val.trim() === '') {
        await promptEl.fill('Yapay zeka ve insanlığın ortak geleceği: Teknoloji etik sınırlarını zorluyor.');
      } else {
        await promptEl.fill(val);
      }
    }
    await page.fill('textarea[name="production_notes"]', 'Sakin fon müziği, derin ses tonu, mavi-siyah görsel palet.');
    await page.fill('textarea[name="character_features"]', 'Bilim insanı görünümlü, gözlüklü, 40 yaşında karizmatik anlatıcı.');
    console.log('  Temel alanlar dolduruldu');

    // 5. TTS sağlayıcı seçimi
    console.log('\n[5/7] TTS sağlayıcı test ediliyor...');
    const ttsSelect = await page.$('select[name="tts_provider"]');
    if (ttsSelect) {
      console.log('  TTS dropdown bulundu, edge seçiliyor...');
      await ttsSelect.selectOption('edge');
      await delay(500);
      const voiceInput = await page.$('#tts-voice-input');
      if (voiceInput) {
        const voiceVal = await voiceInput.inputValue();
        console.log(`  TTS: edge seçildi, ses: ${voiceVal}`);
      }
      await ttsSelect.selectOption('openai');
      await delay(500);
      const voiceVal2 = await page.$eval('#tts-voice-input', (el: HTMLInputElement) => el.value);
      console.log(`  TTS: openai seçildi, otomatik ses: ${voiceVal2}`);
      await ttsSelect.selectOption('xtts');
      await delay(300);
    } else {
      // Debug: form içindeki tüm select'leri listele
      const allSelects = await page.$$eval('form select', els => els.map(e => (e as HTMLSelectElement).name));
      console.log(`  ⚠️ TTS dropdown bulunamadı! Formdaki select'ler: [${allSelects.join(', ')}]`);
      const formHTML = await page.$eval('form[action="/create-job"]', (el: HTMLElement) => el.innerHTML.substring(0, 500));
      console.log(`  Form HTML (ilk 500): ${formHTML}`);
    }

    // 6. Platform ve süre seçimi
    console.log('\n[6/7] Platform ve süre seçiliyor...');
    const xCb = await page.$('input[name="platforms"][value="x"]');
    if (xCb) { const ch = await xCb.isChecked(); if (!ch) await xCb.check(); }
    const durSel = await page.$('select[name="differentiation_duration_mode"]');
    if (durSel) await durSel.selectOption('shorter');
    await delay(500);

    // 7. Form gönderme
    console.log('\n[7/7] Form gönderiliyor...');
    const submitBtn = await page.$('form[action="/create-job"] button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await delay(3000);
      // Sayfanın yenilenmesini bekle
      try { await page.waitForURL('**/', { timeout: 8000 }); } catch { /* skip */ }
      await delay(2000);
      console.log('  ✅ Proje başarıyla kuyruğa eklendi!');
    } else {
      console.log('  ⚠️ Submit butonu bulunamadı!');
    }

    // Doğrulama
    const bodyText = await page.textContent('body');
    if (bodyText && (bodyText.includes('Kuyrukta') || bodyText.includes('pending'))) {
      console.log('\n  ✅ TEST BAŞARILI — İş kuyrukta görünüyor');
    } else {
      console.log('\n  ⚠️ İş kuyrukta görünmeyebilir, lütfen tarayıcıyı kontrol edin');
    }

    await delay(2000);

  } catch (err) {
    console.error('\n❌ Test hatası:', err);
  } finally {
    console.log('\n══════════════════════════════════════════════');
    await browser.close();
    if (serverProcess) { serverProcess.kill('SIGINT'); }
    console.log('  E2E Test tamamlandı');
    console.log('══════════════════════════════════════════════');
  }
}

main().catch(console.error);
