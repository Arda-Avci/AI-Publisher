import express from 'express';
import session from 'express-session';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { initDatabase, db } from './db.js';
import { checkQueue, clients } from './queue.js';
import { uploadToYouTube, uploadToTikTok, uploadToX, uploadToMeta } from './publisher.js';

import { Request, Response, NextFunction } from 'express';

// Session tipini genişletelim
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware'ler
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'gizemli_bir_sir_123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 gün
}));

// Uploads ve videolar dizinlerini statik olarak sun
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/videolar', express.static(path.join(process.cwd(), 'videolar')));

// Multer ile dosya yükleme ayarları
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/');
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// Kimlik Doğrulama Kontrolü
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Giriş Sayfası HTML
const loginHTML = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Giriş Yap - AI Publisher</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0c10;
      --card-bg: #1f2833;
      --cyan: #00ffff;
      --text: #c5c6c7;
      --white: #ffffff;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Outfit', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      overflow: hidden;
    }
    .container {
      background: rgba(31, 40, 51, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(0, 255, 255, 0.2);
      padding: 40px;
      border-radius: 20px;
      width: 360px;
      box-shadow: 0 8px 32px 0 rgba(0, 255, 255, 0.1);
      text-align: center;
      transition: all 0.3s ease;
    }
    .container:hover {
      box-shadow: 0 8px 32px 0 rgba(0, 255, 255, 0.2);
      border-color: var(--cyan);
    }
    h1 {
      color: var(--white);
      font-weight: 800;
      margin-bottom: 30px;
      letter-spacing: 1px;
    }
    h1 span {
      color: var(--cyan);
      text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    }
    .input-group {
      margin-bottom: 20px;
      text-align: left;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--white);
    }
    input {
      width: 100%;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid rgba(197, 198, 199, 0.3);
      background: rgba(11, 12, 16, 0.6);
      color: var(--white);
      box-sizing: border-box;
      outline: none;
      transition: all 0.3s ease;
    }
    input:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
    }
    .btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #00ffff, #008b8b);
      color: var(--bg);
      font-weight: 800;
      cursor: pointer;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 255, 255, 0.3);
    }
    .error {
      color: #ff4a4a;
      margin-bottom: 15px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>AI <span>Publisher</span></h1>
    <form action="/login" method="POST">
      <div class="input-group">
        <label>Kullanıcı Adı</label>
        <input type="text" name="username" required placeholder="admin">
      </div>
      <div class="input-group">
        <label>Şifre</label>
        <input type="password" name="password" required placeholder="••••••••">
      </div>
      <button type="submit" class="btn">Giriş Yap</button>
    </form>
  </div>
</body>
</html>
`;

// Login Rotaları
app.get('/login', (req, res) => {
  res.send(loginHTML);
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user.id;
    res.redirect('/');
  } else {
    res.send(loginHTML.replace('</form>', '<div class="error">Geçersiz kullanıcı adı veya şifre!</div></form>'));
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Dashboard HTML ve Arayüzü (Premium, Glassmorphism, Neon Cyan #00FFFF ve Sarı Altyazı Detayları)
app.get('/', requireAuth, async (req, res) => {
  const jobs = await db.all('SELECT * FROM video_jobs ORDER BY id DESC');
  
  let jobCards = jobs.map(job => {
    const isCompleted = job.status === 'completed';
    const isProcessing = job.status === 'processing';
    const isFailed = job.status === 'failed';
    
    let platforms = [];
    try {
      platforms = JSON.parse(job.target_platforms || '[]');
    } catch(e) {}

    return `
      <div class="job-card" id="job-card-${job.id}">
        <div class="job-header">
          <h3>Proje #${job.id}</h3>
          <span class="status-badge status-${job.status}">${job.current_stage} (${job.progress_percent}%)</span>
        </div>
        <p class="prompt"><strong>Prompt:</strong> ${job.master_prompt}</p>
        
        ${isCompleted ? `
          <div class="video-container">
            <video controls width="100%">
              <source src="/videolar/${job.final_filename}" type="video/mp4">
            </video>
          </div>
          
          <div class="marketing-meta">
            <h4>Yapay Zekâ Pazarlama & SEO Detayları (2026 Standartları)</h4>
            <div class="meta-section">
              <h5>YouTube Shorts</h5>
              <input type="text" id="yt_title_${job.id}" value="${job.yt_title || ''}" placeholder="YouTube Başlık">
              <textarea id="yt_desc_${job.id}" placeholder="YouTube Açıklama">${job.yt_desc || ''}</textarea>
              <input type="text" id="yt_tags_${job.id}" value="${job.yt_tags || ''}" placeholder="YouTube Etiketler">
              <button onclick="publish('${job.id}', 'youtube')" class="pub-btn">YouTube Paylaş (${job.yt_status})</button>
            </div>
            
            <div class="meta-section">
              <h5>TikTok</h5>
              <textarea id="tt_desc_${job.id}" placeholder="TikTok Açıklama">${job.tt_desc || ''}</textarea>
              <input type="text" id="tt_tags_${job.id}" value="${job.tt_tags || ''}" placeholder="TikTok Etiketler">
              <button onclick="publish('${job.id}', 'tiktok')" class="pub-btn">TikTok Paylaş (${job.tt_status})</button>
            </div>

            <div class="meta-section">
              <h5>X (Twitter)</h5>
              <textarea id="x_desc_${job.id}" placeholder="X Açıklama">${job.x_desc || ''}</textarea>
              <input type="text" id="x_tags_${job.id}" value="${job.x_tags || ''}" placeholder="X Etiketler">
              <button onclick="publish('${job.id}', 'x')" class="pub-btn">X Paylaş (${job.x_status})</button>
            </div>

            <div class="meta-section">
              <h5>Meta (Reels)</h5>
              <textarea id="meta_desc_${job.id}" placeholder="Meta Açıklama">${job.meta_desc || ''}</textarea>
              <input type="text" id="meta_tags_${job.id}" value="${job.meta_tags || ''}" placeholder="Meta Etiketler">
              <button onclick="publish('${job.id}', 'meta')" class="pub-btn">Meta Reels Paylaş (${job.meta_status})</button>
            </div>
            
            <div style="margin-top: 15px;">
              <button onclick="saveMeta('${job.id}')" class="save-btn">Tüm Metinleri Güncelle & Kaydet</button>
            </div>
          </div>
        ` : ''}
        
        ${isProcessing ? `
          <div class="progress-bar-container">
            <div class="progress-bar-fill" id="progress-fill-${job.id}" style="width: ${job.progress_percent}%"></div>
          </div>
          <p class="status-msg" id="status-msg-${job.id}">Tahmini Bitme Süresi: ${job.estimated_minutes ? job.estimated_minutes.toFixed(1) : '?'} dakika</p>
        ` : ''}
      </div>
    `;
  }).join('');

  const dashboardHTML = `
  <!DOCTYPE html>
  <html lang="tr">
  <head>
    <meta charset="UTF-8">
    <title>AI Publisher - Stüdyo Kontrol Paneli</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg: #0b0c10;
        --card-bg: rgba(31, 40, 51, 0.65);
        --cyan: #00ffff;
        --text: #c5c6c7;
        --white: #ffffff;
        --border: rgba(0, 255, 255, 0.15);
      }
      body {
        margin: 0;
        padding: 0;
        background-color: var(--bg);
        color: var(--text);
        font-family: 'Outfit', sans-serif;
      }
      header {
        background: rgba(11, 12, 16, 0.8);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--border);
        padding: 20px 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 100;
      }
      header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 800;
        color: var(--white);
      }
      header h1 span {
        color: var(--cyan);
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.4);
      }
      .logout-link {
        color: var(--cyan);
        text-decoration: none;
        font-weight: 600;
        transition: opacity 0.3s;
      }
      .logout-link:hover {
        opacity: 0.8;
      }
      main {
        max-width: 1200px;
        margin: 40px auto;
        padding: 0 20px;
        display: grid;
        grid-template-columns: 1fr 1.8fr;
        gap: 40px;
      }
      .panel-section {
        background: var(--card-bg);
        backdrop-filter: blur(10px);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 30px;
        box-shadow: 0 8px 32px 0 rgba(0, 255, 255, 0.05);
        height: fit-content;
      }
      h2 {
        color: var(--white);
        margin-top: 0;
        font-weight: 800;
        margin-bottom: 25px;
      }
      label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: var(--white);
        font-size: 14px;
      }
      input, textarea {
        width: 100%;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid rgba(197, 198, 199, 0.2);
        background: rgba(11, 12, 16, 0.7);
        color: var(--white);
        box-sizing: border-box;
        outline: none;
        margin-bottom: 20px;
        font-family: inherit;
        transition: all 0.3s;
      }
      input:focus, textarea:focus {
        border-color: var(--cyan);
        box-shadow: 0 0 8px rgba(0, 255, 255, 0.2);
      }
      .checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 25px;
      }
      .checkbox-item {
        display: flex;
        align-items: center;
        background: rgba(0, 255, 255, 0.05);
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid rgba(0, 255, 255, 0.1);
        cursor: pointer;
      }
      .checkbox-item input {
        width: auto;
        margin-bottom: 0;
        margin-right: 8px;
      }
      .btn {
        width: 100%;
        padding: 14px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, #00ffff, #008b8b);
        color: var(--bg);
        font-weight: 800;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s;
      }
      .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 255, 255, 0.3);
      }
      .job-card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 25px;
        margin-bottom: 25px;
        box-shadow: 0 4px 20px rgba(0, 255, 255, 0.03);
        transition: all 0.3s;
      }
      .job-card:hover {
        border-color: var(--cyan);
      }
      .job-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      .job-header h3 {
        margin: 0;
        color: var(--white);
      }
      .status-badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 800;
      }
      .status-pending { background: #d39e00; color: #111; }
      .status-processing { background: var(--cyan); color: #111; }
      .status-completed { background: #28a745; color: #fff; }
      .status-failed { background: #dc3545; color: #fff; }
      
      .video-container {
        margin-top: 15px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(0, 255, 255, 0.2);
      }
      .progress-bar-container {
        background: rgba(197, 198, 199, 0.1);
        border-radius: 10px;
        height: 12px;
        overflow: hidden;
        margin-top: 15px;
      }
      .progress-bar-fill {
        background: linear-gradient(90deg, #00ffff, #008b8b);
        height: 100%;
        width: 0%;
        transition: width 0.4s ease;
      }
      .status-msg {
        font-size: 13px;
        margin-top: 8px;
        color: #888;
      }
      .marketing-meta {
        background: rgba(11, 12, 16, 0.5);
        padding: 20px;
        border-radius: 10px;
        margin-top: 20px;
        border: 1px solid rgba(197, 198, 199, 0.1);
      }
      .marketing-meta h4 {
        margin-top: 0;
        color: var(--white);
        border-bottom: 1px solid rgba(197, 198, 199, 0.2);
        padding-bottom: 8px;
      }
      .meta-section {
        margin-bottom: 20px;
      }
      .meta-section h5 {
        color: var(--cyan);
        margin: 10px 0 8px 0;
      }
      .pub-btn, .save-btn {
        background: transparent;
        border: 1px solid var(--cyan);
        color: var(--cyan);
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s;
      }
      .pub-btn:hover, .save-btn:hover {
        background: var(--cyan);
        color: var(--bg);
      }
      .save-btn {
        background: var(--cyan);
        color: var(--bg);
        width: 100%;
        padding: 12px;
        margin-top: 10px;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>AI <span>Publisher</span></h1>
      <a href="/logout" class="logout-link">Güvenli Çıkış</a>
    </header>
    
    <main>
      <!-- Yeni Proje Formu -->
      <section class="panel-section">
        <h2>Yeni Proje Başlat</h2>
        <form action="/create-job" method="POST" enctype="multipart/form-data">
          <label>Hikaye / Master Prompt</label>
          <textarea name="master_prompt" rows="4" required placeholder="Örn: Yapay zeka gelecekte insanlığı nasıl şekillendirecek?"></textarea>
          
          <label>Üretim Notları (Yönetmen Notları)</label>
          <textarea name="production_notes" rows="2" placeholder="Örn: Hızlı geçişler, dramatik müzik tonları."></textarea>
          
          <label>Fiziksel Karakter Tasviri (Sabit Karakter)</label>
          <textarea name="character_features" rows="2" placeholder="Örn: 30 yaşlarında, mavi gözlü, takım elbiseli siberpunk bilim adamı."></textarea>
          
          <label>Referans Görsel (Başlangıç Materyali)</label>
          <input type="file" name="material" accept="image/*">
          
          <label>Yayınlanacak Platformlar</label>
          <div class="checkbox-group">
            <label class="checkbox-item"><input type="checkbox" name="platforms" value="youtube" checked> YouTube Shorts</label>
            <label class="checkbox-item"><input type="checkbox" name="platforms" value="tiktok" checked> TikTok</label>
            <label class="checkbox-item"><input type="checkbox" name="platforms" value="x"> X (Twitter)</label>
            <label class="checkbox-item"><input type="checkbox" name="platforms" value="meta"> Meta Reels</label>
          </div>
          
          <button type="submit" class="btn">Kuyruğa Ekle & Üretime Başla</button>
        </form>
      </section>
      
      <!-- Video Galerisi ve Kuyruk Takibi -->
      <section class="gallery-section">
        <h2>Stüdyo Kuyruğu ve Projeler</h2>
        <div id="job-list">
          ${jobCards.length > 0 ? jobCards : '<p style="text-align: center; color: #666;">Henüz hiçbir video projesi bulunmuyor.</p>'}
        </div>
      </section>
    </main>

    <script>
      // SSE (Server-Sent Events) Bağlantısı kurarak canlı ilerleme durumunu güncelle
      const activeJobs = [${jobs.filter(j => j.status === 'processing' || j.status === 'pending').map(j => j.id).join(',')}];
      
      activeJobs.forEach(jobId => {
        const eventSource = new EventSource('/progress/' + jobId);
        
        eventSource.onmessage = function(event) {
          const data = JSON.parse(event.data);
          const card = document.getElementById('job-card-' + jobId);
          if (card) {
            // Durum badge'ini güncelle
            const badge = card.querySelector('.status-badge');
            if (badge) {
              badge.className = 'status-badge status-processing';
              badge.textContent = data.stage + ' (' + data.percent + '%)';
            }
            
            // Progress bar'ı doldur
            const fill = document.getElementById('progress-fill-' + jobId);
            if (fill) {
              fill.style.width = data.percent + '%';
            }
            
            // Tamamlandıysa sayfayı yenile (videoyu oynatabilmek ve otomatik indirmek için)
            if (data.stage === 'Tamamlandı') {
              eventSource.close();
              
              // Otomatik İndirme Tetikleyicisi
              if (data.finalFilename) {
                const a = document.createElement('a');
                a.href = '/videolar/' + data.finalFilename;
                a.download = data.finalFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
              
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
            
            if (data.stage === 'Hata Verdi' || data.stage === 'Hata Oluştu') {
              eventSource.close();
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
          }
        };
      });

      // Meta veri kaydetme
      async function saveMeta(jobId) {
        const payload = {
          yt_title: document.getElementById('yt_title_' + jobId).value,
          yt_desc: document.getElementById('yt_desc_' + jobId).value,
          yt_tags: document.getElementById('yt_tags_' + jobId).value,
          tt_desc: document.getElementById('tt_desc_' + jobId).value,
          tt_tags: document.getElementById('tt_tags_' + jobId).value,
          x_desc: document.getElementById('x_desc_' + jobId).value,
          x_tags: document.getElementById('x_tags_' + jobId).value,
          meta_desc: document.getElementById('meta_desc_' + jobId).value,
          meta_tags: document.getElementById('meta_tags_' + jobId).value,
        };

        const res = await fetch('/save-meta/' + jobId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          alert('Pazarlama metinleri başarıyla güncellendi!');
        } else {
          alert('Güncelleme sırasında hata oluştu.');
        }
      }

      // Arka planda Playwright yayını tetikleme
      async function publish(jobId, platform) {
        alert(platform.toUpperCase() + ' yayını arka planda tetiklendi. Tarayıcı açılıyor...');
        const res = await fetch('/publish/' + jobId + '/' + platform, { method: 'POST' });
        const result = await res.json();
        if (result.success) {
          alert(platform.toUpperCase() + ' paylaşımı başarıyla tamamlandı!');
          window.location.reload();
        } else {
          alert(platform.toUpperCase() + ' paylaşımı sırasında bir hata oluştu. Lütfen auth.json dosyasını kontrol edin.');
        }
      }
    </script>
  </body>
  </html>
  `;
  
  res.send(dashboardHTML);
});

// İş Ekleme
app.post('/create-job', requireAuth, upload.single('material'), async (req: any, res) => {
  const { master_prompt, production_notes, character_features, platforms } = req.body;
  const material_path = req.file ? req.file.path : '';
  
  const targetPlatforms = Array.isArray(platforms) ? platforms : (platforms ? [platforms] : []);

  await db.run(
    `INSERT INTO video_jobs (
      user_id, master_prompt, production_notes, character_features, material_path, target_platforms
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [req.session.userId, master_prompt, production_notes, character_features, material_path, JSON.stringify(targetPlatforms)]
  );

  res.redirect('/');
  // Arka planda iş kuyruğunu tetikle
  checkQueue();
});

// Meta veri güncelleme rotası
app.post('/save-meta/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { yt_title, yt_desc, yt_tags, tt_desc, tt_tags, x_desc, x_tags, meta_desc, meta_tags } = req.body;

  try {
    await db.run(
      `UPDATE video_jobs SET 
        yt_title = ?, yt_desc = ?, yt_tags = ?, 
        tt_desc = ?, tt_tags = ?, 
        x_desc = ?, x_tags = ?,
        meta_desc = ?, meta_tags = ?
      WHERE id = ?`,
      [yt_title, yt_desc, yt_tags, tt_desc, tt_tags, x_desc, x_tags, meta_desc, meta_tags, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err });
  }
});

// Playwright Yayınını Arka Planda Tetikleme Rotası
app.post('/publish/:id/:platform', requireAuth, async (req, res) => {
  const { id, platform } = req.params;
  const job = await db.get('SELECT * FROM video_jobs WHERE id = ?', [id]);
  
  if (!job || !job.final_filename) {
    return res.json({ success: false, error: 'Video dosyası bulunamadı.' });
  }

  const videoPath = path.join(process.cwd(), 'videolar', job.final_filename);
  let success = false;

  try {
    if (platform === 'youtube') {
      await db.run("UPDATE video_jobs SET yt_status = 'publishing' WHERE id = ?", [id]);
      success = await uploadToYouTube(videoPath, job.yt_title, job.yt_desc, job.yt_tags);
      await db.run("UPDATE video_jobs SET yt_status = ? WHERE id = ?", [success ? 'published' : 'failed', id]);
    } else if (platform === 'tiktok') {
      await db.run("UPDATE video_jobs SET tt_status = 'publishing' WHERE id = ?", [id]);
      success = await uploadToTikTok(videoPath, job.tt_desc, job.tt_tags);
      await db.run("UPDATE video_jobs SET tt_status = ? WHERE id = ?", [success ? 'published' : 'failed', id]);
    } else if (platform === 'x') {
      await db.run("UPDATE video_jobs SET x_status = 'publishing' WHERE id = ?", [id]);
      success = await uploadToX(videoPath, job.x_desc, job.x_tags);
      await db.run("UPDATE video_jobs SET x_status = ? WHERE id = ?", [success ? 'published' : 'failed', id]);
    } else if (platform === 'meta') {
      await db.run("UPDATE video_jobs SET meta_status = 'publishing' WHERE id = ?", [id]);
      success = await uploadToMeta(videoPath, job.meta_desc, job.meta_tags);
      await db.run("UPDATE video_jobs SET meta_status = ? WHERE id = ?", [success ? 'published' : 'failed', id]);
    }

    res.json({ success });
  } catch (error) {
    console.error(`[ERROR] ${platform} yayın hatası:`, error);
    res.json({ success: false, error: String(error) });
  }
});

// SSE Canlı İlerleme Durumu Bağlantı Noktası
app.get('/progress/:id', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const jobId = parseInt(req.params.id);
  clients.set(jobId, res);

  req.on('close', () => {
    clients.delete(jobId);
  });
});

// Sunucu Başlatma
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`[INFO] AI Publisher sunucusu aktif: http://localhost:${PORT}`);
    // Sunucu açıldığında yarım kalmış veya kuyrukta bekleyen işleri kontrol et
    checkQueue();
  });
}

startServer();
