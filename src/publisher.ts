import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs-extra';

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

    // Oynatma Listesi (Playlist) Seçimi — playlistIdOrName aslında bir playlist ADI
    if (playlistIdOrName) {
      try {
        console.log(`[INFO] Oynatma listesi seçimi başlatılıyor: ${playlistIdOrName}`);
        // Open the playlist section. Selector may change with YouTube Studio UI updates.
        const playlistSelect = await page.waitForSelector(
          '.row-value-container.style-scope.ytcp-video-metadata-editor-playlists',
          { timeout: 10_000 }
        ).catch(() => null);
        if (!playlistSelect) {
          console.warn('[WARN] Playlist alanı bulunamadı — UI değişmiş olabilir, atlanıyor.');
        } else {
          await playlistSelect.click();
          await page.waitForTimeout(2_000);

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
            await searchInput.fill(playlistIdOrName);
            await page.waitForTimeout(1_500);
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
            await existingEl.click();
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
              if (btn) { await btn.click(); await page.waitForTimeout(1_000); break; }
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
              await titleInput.fill(playlistIdOrName);
              const saveBtn = await page.$('ytcp-button:has-text("Oluştur"), ytcp-button:has-text("Create")');
              if (saveBtn) {
                await saveBtn.click();
                await page.waitForTimeout(2_000);
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
                if (newCbEl) await newCbEl.click();
              }
            }
          }
          // "Bitti" veya "Done" butonuna basarak playlist modalını kapat
          const donePlaylistBtn = await page.$('ytcp-button.done-button');
          if (donePlaylistBtn) await donePlaylistBtn.click();
        }
      } catch (playlistErr) {
        // Defensive: never fail the whole upload on a playlist error
        console.warn(`[WARN] Oynatma listesi seçilirken bir hata oluştu:`, playlistErr);
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
