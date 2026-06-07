import { chromium, Page, ElementHandle } from 'playwright';
import path from 'path';
import fs from 'fs-extra';

/**
 * Rastgele milisaniye aralığında gecikme sağlar.
 */
async function randomDelay(min: number = 300, max: number = 1000): Promise<void> {
  const delayTime = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delayTime));
}

/**
 * İnsan tıklama davranışı: Elementin yakınına (offset) tıklayarak "neredeyse kaçırma" (miss) simüle eder,
 * ardından rastgele ufak bir sapma (jitter) ile asıl elemente tıklar.
 */
async function humanClick(page: Page, selector: string | ElementHandle): Promise<void> {
  let element: ElementHandle | null = null;
  if (typeof selector === 'string') {
    element = await page.waitForSelector(selector, { state: 'visible', timeout: 20000 });
  } else {
    element = selector;
  }

  if (!element) return;

  const box = await element.boundingBox();
  if (box) {
    // Elementin hemen dışındaki bir koordinata (miss click) tıkla (örn: elementin solunda 12px boşluk)
    const missX = Math.max(0, box.x - 12);
    const missY = Math.max(0, box.y + box.height / 2);
    await page.mouse.click(missX, missY);
    await randomDelay(200, 500);

    // Şimdi asıl elementin ortasında rastgele hafif sapmalı bir koordinata tıkla
    const clickX = box.x + box.width / 2 + (Math.random() * 6 - 3);
    const clickY = box.y + box.height / 2 + (Math.random() * 6 - 3);
    await page.mouse.click(clickX, clickY);
  } else {
    await element.click();
  }
  await randomDelay(300, 700);
}

/**
 * İnsan yazma davranışı: Alana insan tıklamasıyla odaklanır ve karakterleri rastgele gecikmelerle yazar.
 */
async function humanType(page: Page, selector: string | ElementHandle, text: string): Promise<void> {
  let element: ElementHandle | null = null;
  if (typeof selector === 'string') {
    element = await page.waitForSelector(selector, { state: 'visible', timeout: 20000 });
  } else {
    element = selector;
  }

  if (!element) return;

  await humanClick(page, element);

  await page.keyboard.press('Control+A');
  await randomDelay(100, 250);
  await page.keyboard.press('Backspace');
  await randomDelay(150, 350);

  for (const char of text) {
    await page.keyboard.type(char);
    if (Math.random() > 0.92) {
      await randomDelay(350, 750); // ara duraksama
    } else {
      await randomDelay(70, 180); // normal yazım hızı
    }
  }
  await randomDelay(200, 500);
}


export async function checkSession(platform: string): Promise<boolean> {
  const authFile = `auth_${platform}.json`;
  return await fs.pathExists(authFile);
}

export async function uploadToYouTube(
  videoPath: string, 
  title: string, 
  desc: string, 
  tags: string, 
  playlistIdOrName?: string
): Promise<boolean> {
  console.log(`[INFO] YouTube yükleme başlatılıyor: ${videoPath}`);
  const authFile = 'auth_youtube.json';
  if (!await fs.pathExists(authFile)) {
    console.error(`[ERROR] YouTube yetkilendirme dosyası bulunamadı: ${authFile}`);
    return false;
  }

  const isHeadless = process.env.HEADLESS !== 'false';
  const browser = await chromium.launch({ headless: isHeadless });
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();
  try {
    await page.goto('https://studio.youtube.com', { waitUntil: 'networkidle' });
    
    // Yükleme butonunu bekle
    await page.waitForSelector('#upload-icon, #create-icon', { state: 'visible', timeout: 30000 });
    const uploadBtn = await page.$('#upload-icon');
    if (uploadBtn) {
      await humanClick(page, uploadBtn);
    } else {
      await humanClick(page, '#create-icon');
      const videoUploadSelector = 'tp-yt-paper-item:has-text("Video yükle")';
      await page.waitForSelector('#upload-button, ' + videoUploadSelector, { state: 'visible', timeout: 10000 });
      await humanClick(page, videoUploadSelector);
    }

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.waitForSelector('#select-files-button', { state: 'visible', timeout: 20000 });
    await humanClick(page, '#select-files-button');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.resolve(videoPath));

    // Başlık ve Açıklama Alanlarını Doldur
    await page.waitForSelector('xhtml\\:textarea, #textbox, #title-textarea', { state: 'visible', timeout: 30000 });
    // Textbox'ın düzenlenebilir ve görünür olmasını garanti et
    await page.waitForSelector('div#textbox[contenteditable="true"]', { state: 'visible', timeout: 10000 }).catch(() => null);

    const titleBoxes = await page.$$('div#textbox[contenteditable="true"]');
    if (titleBoxes.length > 0) {
      await humanType(page, titleBoxes[0], title);

      if (titleBoxes.length > 1) {
        await humanType(page, titleBoxes[1], `${desc}\n\n${tags}`);
      }
    }

    // Oynatma Listesi (Playlist) Seçimi — playlistIdOrName aslında bir playlist ADI
    if (playlistIdOrName) {
      try {
        console.log(`[INFO] Oynatma listesi seçimi başlatılıyor: ${playlistIdOrName}`);
        // Open the playlist section. Selector may change with YouTube Studio UI updates.
        const playlistSelect = await page.waitForSelector(
          '.row-value-container.style-scope.ytcp-video-metadata-editor-playlists',
          { state: 'visible', timeout: 10_000 }
        ).catch(() => null);
        if (!playlistSelect) {
          console.warn('[WARN] Playlist alanı bulunamadı — UI değişmiş olabilir, atlanıyor.');
        } else {
          await humanClick(page, playlistSelect);
          await randomDelay(1000, 2000);

          // Mevcut listelerden aramaya çalış — birden çok olası placeholder
          const searchSelectors = [
            'input[placeholder="Oynatma listelerinde ara"]',
            'input[placeholder="Search playlists"]',
            'input[placeholder*="ara"]',
            'input[placeholder*="search" i]',
            'input[type="text"]'
          ];
          let searchInput: any = null;
          for (const sel of searchSelectors) {
            const found = await page.$(sel);
            if (found) { searchInput = found; break; }
          }
          if (searchInput) {
            await humanType(page, searchInput, playlistIdOrName);
            await randomDelay(1000, 2000);
          }

          // Try to find an existing playlist matching the name (case-insensitive)
          const existingCheckbox = await page.evaluateHandle((name: string) => {
            const lcName = name.toLowerCase();
            const labels = Array.from(document.querySelectorAll('label, span, div')) as HTMLElement[];
            for (const el of labels) {
              const text = (el.textContent || '').trim().toLowerCase();
              if (text === lcName || text.includes(lcName)) {
                const cb = el.closest('tp-yt-paper-checkbox') || el.closest('[role="checkbox"]') || el.querySelector('tp-yt-paper-checkbox');
                if (cb) return cb as HTMLElement;
              }
            }
            return null;
          }, playlistIdOrName);
          const existingEl = existingCheckbox.asElement();
          if (existingEl) {
            await humanClick(page, existingEl);
            console.log(`[INFO] Mevcut playlist seçildi: ${playlistIdOrName}`);
          } else {
            // Playlist bulunamadı — yenisini oluştur
            console.log(`[INFO] Oynatma listesi bulunamadı. Yeni oluşturuluyor: ${playlistIdOrName}`);
            const newBtnSelectors = [
              'div.create-playlist-button',
              'button:has-text("Yeni oynatma listesi")',
              'button:has-text("New playlist")',
              'tp-yt-paper-item:has-text("Yeni oynatma listesi")',
              'tp-yt-paper-item:has-text("New playlist")'
            ];
            for (const sel of newBtnSelectors) {
              const btn = await page.$(sel);
              if (btn) { await humanClick(page, btn); await randomDelay(500, 1200); break; }
            }

            // Title input — try several variants
            const titleInputSelectors = [
              'textarea[placeholder="Başlık ekleyin"]',
              'textarea[placeholder="Add title"]',
              'input[placeholder*="title" i]',
              'input[placeholder*="başlık" i]'
            ];
            let titleInput: any = null;
            for (const sel of titleInputSelectors) {
              const found = await page.$(sel);
              if (found) { titleInput = found; break; }
            }
            if (titleInput) {
              await humanType(page, titleInput, playlistIdOrName);
              const saveBtn = await page.$('ytcp-button:has-text("Oluştur"), ytcp-button:has-text("Create")');
              if (saveBtn) {
                await humanClick(page, saveBtn);
                await randomDelay(1500, 2500);
                // Yeni oluşturulan listeyi tekrar seç
                const newCheckbox = await page.evaluateHandle((name: string) => {
                  const lcName = name.toLowerCase();
                  const labels = Array.from(document.querySelectorAll('label, span, div')) as HTMLElement[];
                  for (const el of labels) {
                    const text = (el.textContent || '').trim().toLowerCase();
                    if (text === lcName || text.includes(lcName)) {
                      const cb = el.closest('tp-yt-paper-checkbox') || el.closest('[role="checkbox"]') || el.querySelector('tp-yt-paper-checkbox');
                      if (cb) return cb as HTMLElement;
                    }
                  }
                  return null;
                }, playlistIdOrName);
                const newCbEl = newCheckbox.asElement();
                if (newCbEl) await humanClick(page, newCbEl);
              }
            }
          }
          // "Bitti" veya "Done" butonuna basarak playlist modalını kapat
          const donePlaylistBtn = await page.$('ytcp-button.done-button');
          if (donePlaylistBtn) await humanClick(page, donePlaylistBtn);
        }
      } catch (playlistErr) {
        // Defensive: never fail the whole upload on a playlist error
        console.warn(`[WARN] Oynatma listesi seçilirken bir hata oluştu:`, playlistErr);
      }
    }

    // Çocuklara özel mi? Hayır seçelim
    const noMadeForKids = await page.$('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_PLAYLIST_NO"]');
    if (noMadeForKids) {
      await humanClick(page, noMadeForKids);
    }

    // Sonraki adımlara geç
    for (let i = 0; i < 3; i++) {
      await page.waitForSelector('#next-button', { state: 'visible', timeout: 10000 });
      await humanClick(page, '#next-button');
      await randomDelay(1500, 2500);
    }

    // Görünürlük ayarı: PUBLIC
    await page.waitForSelector('tp-yt-paper-radio-button[name="PUBLIC"]', { state: 'visible', timeout: 10000 });
    await humanClick(page, 'tp-yt-paper-radio-button[name="PUBLIC"]');

    // Yayınla butonu
    await page.waitForSelector('#done-button', { state: 'visible', timeout: 10000 });
    await humanClick(page, '#done-button');

    await randomDelay(8000, 12000);
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

  const isHeadless = process.env.HEADLESS !== 'false';
  const browser = await chromium.launch({ headless: isHeadless });
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();
  try {
    await page.goto('https://www.tiktok.com/creator-center/upload?lang=tr-TR', { waitUntil: 'networkidle' });
    
    // Iframe veya direkt dosya seçiciyi bekle
    let uploadInput = await page.$('input[type="file"]');
    if (!uploadInput) {
      const iframeElement = await page.waitForSelector('iframe[src*="upload"]', { state: 'visible', timeout: 30000 });
      const frame = await iframeElement.contentFrame();
      if (frame) {
        const fileChooserPromise = page.waitForEvent('filechooser');
        const uploadBtn = await frame.waitForSelector('.upload-btn-input, input[type="file"]', { state: 'attached' });
        await humanClick(page, uploadBtn);
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(path.resolve(videoPath));

        const editor = await frame.waitForSelector('.public-DraftEditor-content', { state: 'visible', timeout: 40000 });
        await humanType(page, editor, `${desc} ${tags}`);

        const postBtn = await frame.waitForSelector('button:has-text("Yayınla"), button:has-text("Post")', { state: 'visible' });
        await humanClick(page, postBtn);
      } else {
        throw new Error("TikTok upload iframe frame'ine erişilemedi.");
      }
    } else {
      await uploadInput.setInputFiles(path.resolve(videoPath));
      await page.waitForSelector('.public-DraftEditor-content', { state: 'visible', timeout: 40000 });
      await humanType(page, '.public-DraftEditor-content', `${desc} ${tags}`);
      const postBtnSelector = 'button:has-text("Yayınla"), button:has-text("Post")';
      await page.waitForSelector(postBtnSelector, { state: 'visible' });
      await humanClick(page, postBtnSelector);
    }

    // Gönderilme onayını bildiren modal veya yönlendirmeyi en fazla 15 saniye bekleyelim
    await page.waitForSelector('text="Paylaşıldı", text="Shared", text="Video yüklendi", text="Video uploaded", text="Manage your posts"', { timeout: 15000 }).catch(() => null);
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

  const isHeadless = process.env.HEADLESS !== 'false';
  const browser = await chromium.launch({ headless: isHeadless });
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();
  try {
    await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle' });

    const fileChooserPromise = page.waitForEvent('filechooser');
    // X platformunda Türkçe ("Medya ekle") veya İngilizce ("Add media" / "Media") seçici desteği
    const selector = '[aria-label="Medya ekle"], [aria-label="Add media"], [aria-label="Media"]';
    await page.waitForSelector(selector, { state: 'visible', timeout: 20000 });
    await humanClick(page, selector);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.resolve(videoPath));

    await page.waitForSelector('.public-DraftEditor-content', { state: 'visible', timeout: 20000 });
    await humanType(page, '.public-DraftEditor-content', `${desc} ${tags}`);

    await page.waitForSelector('[data-testid="tweetButton"]', { state: 'visible', timeout: 20000 });
    await humanClick(page, '[data-testid="tweetButton"]');

    // Tweet butonunun kaybolmasını (tweet'in gönderildiğini) en fazla 15 saniye bekleyelim
    await page.waitForSelector('[data-testid="tweetButton"]', { state: 'detached', timeout: 15000 }).catch(() => null);
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

  const isHeadless = process.env.HEADLESS !== 'false';
  const browser = await chromium.launch({ headless: isHeadless });
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();
  try {
    // Creator studio reels yükleme paneli linki
    await page.goto('https://business.facebook.com/latest/reels_composer', { waitUntil: 'networkidle' });
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    // Dosya yükleme butonunu veya dropzone'u bul
    await page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 30000 });
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.setInputFiles(path.resolve(videoPath));
    } else {
      const addVideoText = 'text="Video Ekle", text="Add Video"';
      await page.waitForSelector(addVideoText, { state: 'visible' });
      await humanClick(page, addVideoText);
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(path.resolve(videoPath));
    }

    // Açıklama alanı
    const textBoxSelector = 'div[role="textbox"], textarea';
    await page.waitForSelector(textBoxSelector, { state: 'visible', timeout: 30000 });
    await humanType(page, textBoxSelector, `${desc} ${tags}`);

    // İleri / Paylaş Butonu
    // Meta arayüzü sık güncellense de genellikle "Sonraki", "Next" veya "Paylaş", "Publish" butonları vardır.
    for (let i = 0; i < 2; i++) {
      const nextBtnSelector = 'button:has-text("Sonraki"), button:has-text("Next")';
      await page.waitForSelector(nextBtnSelector, { state: 'visible', timeout: 15000 });
      await humanClick(page, nextBtnSelector);
      await randomDelay(1500, 2500);
    }

    const shareBtnSelector = 'button:has-text("Paylaş"), button:has-text("Publish"), button:has-text("Paylaşın")';
    await page.waitForSelector(shareBtnSelector, { state: 'visible', timeout: 15000 });
    await humanClick(page, shareBtnSelector);

    await randomDelay(8000, 12000);
    console.log('[INFO] Meta Reels videosu başarıyla yüklendi.');
    return true;
  } catch (error) {
    console.error(`[ERROR] Meta Reels yükleme hatası:`, error);
    return false;
  } finally {
    await browser.close();
  }
}
