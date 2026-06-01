import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs-extra';

export async function uploadToYouTube(videoPath: string, title: string, desc: string, tags: string): Promise<boolean> {
  console.log(`[INFO] YouTube Shorts yükleme başlatılıyor: ${videoPath}`);
  const authFile = 'auth_youtube.json';
  if (!await fs.pathExists(authFile)) {
    console.error(`[ERROR] YouTube yetkilendirme dosyası bulunamadı: ${authFile}`);
    return false;
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();
  try {
    await page.goto('https://studio.youtube.com', { waitUntil: 'networkidle' });
    
    // Yükleme butonunu bekle
    await page.waitForSelector('#upload-icon, #create-icon', { timeout: 30000 });
    const uploadBtn = await page.$('#upload-icon');
    if (uploadBtn) {
      await uploadBtn.click();
    } else {
      await page.click('#create-icon');
      await page.waitForSelector('#upload-button, tp-yt-paper-item:has-text("Video yükle")', { timeout: 10000 });
      await page.click('tp-yt-paper-item:has-text("Video yükle")');
    }

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.waitForSelector('#select-files-button', { timeout: 20000 });
    await page.click('#select-files-button');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.resolve(videoPath));

    // Başlık ve Açıklama Alanlarını Doldur
    await page.waitForSelector('xhtml\\:textarea, #textbox, #title-textarea', { timeout: 30000 });
    await page.waitForTimeout(3000);

    const titleBoxes = await page.$$('div#textbox[contenteditable="true"]');
    if (titleBoxes.length > 0) {
      // Birinci kutu başlık, ikinci kutu açıklamadır
      await titleBoxes[0].click();
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await titleBoxes[0].fill(title);

      if (titleBoxes.length > 1) {
        await titleBoxes[1].click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await titleBoxes[1].fill(`${desc}\n\n${tags}`);
      }
    }

    // Çocuklara özel mi? Hayır seçelim
    const noMadeForKids = await page.$('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_PLAYLIST_NO"]');
    if (noMadeForKids) {
      await noMadeForKids.click();
    }

    // Sonraki adımlara geç
    for (let i = 0; i < 3; i++) {
      await page.waitForSelector('#next-button', { timeout: 10000 });
      await page.click('#next-button');
      await page.waitForTimeout(2000);
    }

    // Görünürlük ayarı: PUBLIC
    await page.waitForSelector('tp-yt-paper-radio-button[name="PUBLIC"]', { timeout: 10000 });
    await page.click('tp-yt-paper-radio-button[name="PUBLIC"]');

    // Yayınla butonu
    await page.waitForSelector('#done-button', { timeout: 10000 });
    await page.click('#done-button');

    await page.waitForTimeout(10000);
    console.log('[INFO] YouTube Shorts başarıyla yüklendi.');
    return true;
  } catch (error) {
    console.error(`[ERROR] YouTube Shorts yükleme hatası:`, error);
    return false;
  } finally {
    await browser.close();
  }
}

export async function uploadToTikTok(videoPath: string, desc: string, tags: string): Promise<boolean> {
  console.log(`[INFO] TikTok yükleme başlatılıyor: ${videoPath}`);
  const authFile = 'auth_tiktok.json';
  if (!await fs.pathExists(authFile)) {
    console.error(`[ERROR] TikTok yetkilendirme dosyası bulunamadı: ${authFile}`);
    return false;
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();
  try {
    await page.goto('https://www.tiktok.com/creator-center/upload?lang=tr-TR', { waitUntil: 'networkidle' });
    
    // Iframe veya direkt dosya seçiciyi bekle
    let uploadInput = await page.$('input[type="file"]');
    if (!uploadInput) {
      const iframeElement = await page.waitForSelector('iframe[src*="upload"]', { timeout: 30000 });
      const frame = await iframeElement.contentFrame();
      if (frame) {
        const fileChooserPromise = page.waitForEvent('filechooser');
        await frame.click('.upload-btn-input, input[type="file"]');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(path.resolve(videoPath));

        await frame.waitForSelector('.public-DraftEditor-content', { timeout: 40000 });
        await frame.click('.public-DraftEditor-content');
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await frame.fill('.public-DraftEditor-content', `${desc} ${tags}`);

        await frame.click('button:has-text("Yayınla"), button:has-text("Post")');
      } else {
        throw new Error("TikTok upload iframe frame'ine erişilemedi.");
      }
    } else {
      await uploadInput.setInputFiles(path.resolve(videoPath));
      await page.waitForSelector('.public-DraftEditor-content', { timeout: 40000 });
      await page.click('.public-DraftEditor-content');
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await page.fill('.public-DraftEditor-content', `${desc} ${tags}`);
      await page.click('button:has-text("Yayınla"), button:has-text("Post")');
    }

    await page.waitForTimeout(10000);
    console.log('[INFO] TikTok videosu başarıyla yüklendi.');
    return true;
  } catch (error) {
    console.error(`[ERROR] TikTok yükleme hatası:`, error);
    return false;
  } finally {
    await browser.close();
  }
}

export async function uploadToX(videoPath: string, desc: string, tags: string): Promise<boolean> {
  console.log(`[INFO] X (Twitter) yükleme başlatılıyor: ${videoPath}`);
  const authFile = 'auth_x.json';
  if (!await fs.pathExists(authFile)) {
    console.error(`[ERROR] X yetkilendirme dosyası bulunamadı: ${authFile}`);
    return false;
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();
  try {
    await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle' });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.waitForSelector('aria-label="Medya ekle"', { timeout: 20000 });
    await page.click('aria-label="Medya ekle"');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.resolve(videoPath));

    await page.waitForSelector('.public-DraftEditor-content', { timeout: 20000 });
    await page.click('.public-DraftEditor-content');
    await page.keyboard.type(`${desc} ${tags}`);

    await page.waitForSelector('[data-testid="tweetButton"]', { timeout: 20000 });
    await page.click('[data-testid="tweetButton"]');

    await page.waitForTimeout(8000);
    console.log('[INFO] X videosu başarıyla yüklendi.');
    return true;
  } catch (error) {
    console.error(`[ERROR] X yükleme hatası:`, error);
    return false;
  } finally {
    await browser.close();
  }
}

export async function uploadToMeta(videoPath: string, desc: string, tags: string): Promise<boolean> {
  console.log(`[INFO] Meta Reels (Facebook/Instagram Creator Studio) yükleme başlatılıyor: ${videoPath}`);
  const authFile = 'auth_meta.json';
  if (!await fs.pathExists(authFile)) {
    console.error(`[ERROR] Meta yetkilendirme dosyası bulunamadı: ${authFile}`);
    return false;
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();
  try {
    // Creator studio reels yükleme paneli linki
    await page.goto('https://business.facebook.com/latest/reels_composer', { waitUntil: 'networkidle' });
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    // Dosya yükleme butonunu veya dropzone'u bul
    await page.waitForSelector('input[type="file"]', { timeout: 30000 });
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(path.resolve(videoPath));
    } else {
      await page.click('text="Video Ekle", text="Add Video"');
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(path.resolve(videoPath));
    }

    // Açıklama alanı
    await page.waitForSelector('div[role="textbox"], textarea', { timeout: 30000 });
    const textBox = await page.$('div[role="textbox"], textarea');
    if (textBox) {
      await textBox.click();
      await page.keyboard.type(`${desc} ${tags}`);
    }

    // İleri / Paylaş Butonu
    // Meta arayüzü sık güncellense de genellikle "Sonraki", "Next" veya "Paylaş", "Publish" butonları vardır.
    for (let i = 0; i < 2; i++) {
      const nextBtn = await page.waitForSelector('button:has-text("Sonraki"), button:has-text("Next")', { timeout: 15000 });
      await nextBtn.click();
      await page.waitForTimeout(2000);
    }

    const shareBtn = await page.waitForSelector('button:has-text("Paylaş"), button:has-text("Publish"), button:has-text("Paylaşın")', { timeout: 15000 });
    await shareBtn.click();

    await page.waitForTimeout(10000);
    console.log('[INFO] Meta Reels videosu başarıyla yüklendi.');
    return true;
  } catch (error) {
    console.error(`[ERROR] Meta Reels yükleme hatası:`, error);
    return false;
  } finally {
    await browser.close();
  }
}
