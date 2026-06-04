/**
 * Dashboard view builder.
 * Pure function — returns the full dashboard HTML for a given request.
 *
 * The template literal is preserved verbatim from the original server.ts
 * (Sprint 5 refactor moved it out of the monolithic route handler).
 */

export interface DashboardParams {
  currentLang: 'tr' | 'en';
  currentTheme: string;
  t: Record<string, string>;
  user: any;
  queueJobs: any[];
  completedJobs: any[];
  themeStyles: string;
}

export function buildDashboardHTML(params: DashboardParams): string {
  const { currentLang, currentTheme, t, user, queueJobs, completedJobs, themeStyles } = params;

  const HELP_PAGES_DATA = [
  {
    id: "general",
    titleTr: "Genel Bakış",
    titleEn: "Overview",
    contentTr: `<h3>Platformumuza Hoş Geldiniz!</h3>
      <p>AI Publisher, Google Colab GPU gücü ve gelişmiş Node.js otomasyon kütüphanelerini (Playwright, FFmpeg) bir araya getirerek dakikalar içinde SEO uyumlu, viral sosyal medya videoları üretmenizi sağlar.</p>
      <p><strong>Temel Özellikler:</strong></p>
      <ul>
        <li>Ardışık Akıllı Sahne Sürekliliği (Autoregressive Chaining)</li>
        <li>Ses klonlama destekli yapay zekâ dudak senkronizasyonu (Lip-Sync)</li>
        <li>Gelişmiş dikey video (Shorts) dönüştürme ve etkileşim callout yerleşimleri</li>
        <li>Playwright ile YouTube, TikTok, X ve Meta üzerinde tam otomatik yayınlama</li>
      </ul>`,
    contentEn: `<h3>Welcome to our Platform!</h3>
      <p>AI Publisher combines Google Colab GPU power and advanced Node.js automation libraries (Playwright, FFmpeg) to let you produce SEO-friendly, viral social media videos in minutes.</p>
      <p><strong>Key Features:</strong></p>
      <ul>
        <li>Autoregressive Chaining for Scene Continuity</li>
        <li>AI Lip-Sync with voice cloning</li>
        <li>Advanced vertical video (Shorts) transformation and callout overlays</li>
        <li>Fully automated posting on YouTube, TikTok, X, and Meta using Playwright</li>
      </ul>`
  },
  {
    id: "production",
    titleTr: "Video Üretim Süreci",
    titleEn: "Video Production",
    contentTr: `<h3>Adım Adım Video Üretimi</h3>
      <ol>
        <li><strong>Hikaye / Master Prompt:</strong> Videonun temel konusunu yazın. Yapay zekâ bu metni 6'şar saniyelik parçalara bölecektir.</li>
        <li><strong>Üretim Notları:</strong> Kamera açıları, atmosfer ve müzik tonları gibi detayları belirleyin.</li>
        <li><strong>Karakter Tasviri:</strong> LoRA entegrasyonu için karakterinizin fiziksel özelliklerini yazın (örn: 'mavi gözlü, esmer siberpunk ajan').</li>
        <li><strong>Referans Görsel:</strong> Sahne 1'de başlangıç karesi olarak kullanılacak görseli seçin.</li>
      </ol>`,
    contentEn: `<h3>Step-by-Step Video Production</h3>
      <ol>
        <li><strong>Story / Master Prompt:</strong> Write the main topic. AI will divide this text into 6-second scenes.</li>
        <li><strong>Production Notes:</strong> Specify camera angles, atmosphere, and music style.</li>
        <li><strong>Character Description:</strong> Enter physical attributes for character consistency (e.g., 'blue-eyed, brunette cyberpunk agent').</li>
        <li><strong>Reference Image:</strong> Select an image to be used as the starting frame of Scene 1.</li>
      </ol>`
  },
  {
    id: "publishing",
    titleTr: "Sosyal Medya Yayını",
    titleEn: "Social Media Publishing",
    contentTr: `<h3>Otomatik Paylaşım Kurulumu</h3>
      <p>Playwright botlarımızın platformlara başarıyla yükleme yapabilmesi için proje kök dizininde tarayıcı oturum çerezleri bulunmalıdır:</p>
      <ul>
        <li><code>auth.json</code> (YouTube için)</li>
        <li><code>auth_tiktok.json</code></li>
        <li><code>auth_x.json</code></li>
        <li><code>auth_meta.json</code></li>
      </ul>
      <p>Video üretimi tamamlandığında yapay zekanın ürettiği başlık ve açıklamaları düzenleyebilir ve "Yayınla" butonuyla süreci arka planda başlatabilirsiniz.</p>`,
    contentEn: `<h3>Automated Posting Setup</h3>
      <p>In order for Playwright bots to post successfully, browser session cookie files must exist in the project root directory:</p>
      <ul>
        <li><code>auth.json</code> (for YouTube)</li>
        <li><code>auth_tiktok.json</code></li>
        <li><code>auth_x.json</code></li>
        <li><code>auth_meta.json</code></li>
      </ul>
      <p>Once video production is complete, you can review the generated titles and descriptions, and hit "Publish" to start the automated flow in the background.</p>`
  }
];

  let queueCardsHTML = queueJobs.map(job => {
    const isProcessing = job.status === 'processing';
    const isFailed = job.status === 'failed';
    const isPending = job.status === 'pending';
    const isAwaitingApproval = job.status === 'awaiting_approval';
    const isProcessingPhase1 = job.status === 'processing_phase1';

    // Use string concatenation (no backticks) inside this template literal so
    // we don't accidentally break the outer dashboardHTML string.
    var approvalBadge = isAwaitingApproval
      ? '<span class="approval-pending-badge" onclick="resumeDifferentiation(' + job.id + ')">⏳ ' + (currentLang === 'tr' ? 'Onay Bekliyor' : 'Awaiting Approval') + '</span>'
      : '';
    var phase1Badge = isProcessingPhase1
      ? '<span class="phase1-pending-badge" onclick="resumeDifferentiation(' + job.id + ')">⏳ ' + (currentLang === 'tr' ? 'Çeviri Bekleniyor' : 'Translation Pending') + '</span>'
      : '';
    var failedBadge = isFailed
      ? '<span class="phase1-pending-badge" style="background:hsla(0 84% 60% / 0.15);color:hsl(0 84% 60%);" onclick="resumeDifferentiation(' + job.id + ')">❌ ' + (currentLang === 'tr' ? 'Başarısız' : 'Failed') + '</span>'
      : '';

    var startBtn = isPending
      ? '<button onclick="startJob(' + job.id + ')" class="start-btn">▶ ' + (currentLang === 'tr' ? 'Projeyi Başlat' : 'Start Project') + '</button>'
      : '';

    // S6: Cancel button — shown for any active job (pending, processing,
    // processing_phase1, awaiting_approval). Clicking it calls
    // /cancel-job/:id, which flips status to 'cancelled' in the DB
    // and the worker bails out at the next scene boundary.
    var cancellableStatuses = ['pending', 'processing', 'processing_phase1', 'awaiting_approval'];
    var isCancellable = cancellableStatuses.indexOf(job.status) !== -1;
    var cancelBtn = isCancellable
      ? '<button onclick="cancelJob(' + job.id + ')" class="cancel-btn">✕ ' + (currentLang === 'tr' ? 'İptal Et' : 'Cancel') + '</button>'
      : '';

    return `
      <div class="job-card" id="job-card-${job.id}">
        <div class="job-header">
          <h3>${t.project} #${job.id}</h3>
          <span class="status-badge status-${job.status}">${job.current_stage} (${job.progress_percent}%)</span>
        </div>
        ${approvalBadge ? '<div style="margin-bottom:0.5rem;">' + approvalBadge + '</div>' : ''}
        ${phase1Badge ? '<div style="margin-bottom:0.5rem;">' + phase1Badge + '</div>' : ''}
        ${failedBadge ? '<div style="margin-bottom:0.5rem;">' + failedBadge + '</div>' : ''}
        <p class="prompt"><strong>Prompt:</strong> ${job.master_prompt}</p>

        ${isProcessing ? `
          <div class="progress-bar-container">
            <div class="progress-bar-fill" id="progress-fill-${job.id}" style="width: ${job.progress_percent}%"></div>
          </div>
          <p class="status-msg" id="status-msg-${job.id}">Tahmini Bitme Süresi: ${job.estimated_minutes ? job.estimated_minutes.toFixed(1) : '?'} dakika</p>
        ` : ''}

        <div class="action-buttons" style="margin-top: 15px; display: flex; gap: 10px;">
          ${startBtn}
          ${cancelBtn}
          ${isFailed ? `<button onclick="fillJobForm({ masterPrompt: '${job.master_prompt.replace(/'/g, "\\'")}', productionNotes: '${(job.production_notes || '').replace(/'/g, "\\'")}', characterFeatures: '${(job.character_features || '').replace(/'/g, "\\'")}', playlistId: '${(job.playlist_id || '').replace(/'/g, "\\'")}', materialPath: '${(job.material_path || '').replace(/'/g, "\\'")}', hasShorts: ${job.has_shorts === 1}, hasSubtitles: ${job.has_subtitles === 1}, platforms: ${job.target_platforms || '[]'} })" class="retry-btn">Yeniden Dene</button>` : ''}
          <button onclick="deleteJob('${job.id}')" class="delete-btn">Sil</button>
        </div>
      </div>
    `;
  }).join('');

  let completedCardsHTML = completedJobs.map(job => {
    let platforms = [];
    try {
      platforms = JSON.parse(job.target_platforms || '[]');
    } catch(e) {}

    return `
      <div class="job-card completed-job-card" id="job-card-${job.id}">
        <div class="job-header">
          <h3>Proje #${job.id}</h3>
          <span class="status-badge status-${job.status}">Tamamlandı</span>
        </div>
        <p class="prompt"><strong>Prompt:</strong> ${job.master_prompt}</p>
        
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
          
          <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
            <button onclick="saveMeta('${job.id}')" class="save-btn">Tüm Metinleri Güncelle & Kaydet</button>
            <button onclick="fillJobForm({ masterPrompt: '${job.master_prompt.replace(/'/g, "\\'")}', productionNotes: '${(job.production_notes || '').replace(/'/g, "\\'")}', characterFeatures: '${(job.character_features || '').replace(/'/g, "\\'")}', playlistId: '${(job.playlist_id || '').replace(/'/g, "\\'")}', hasShorts: ${job.has_shorts === 1}, hasSubtitles: ${job.has_subtitles === 1}, platforms: ${job.target_platforms || '[]'} })" class="retry-btn" style="width: 100%;">Yeniden Dene</button>
            <button onclick="deleteJob('${job.id}')" class="delete-btn" style="width: 100%;">Projeyi Sil</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const dashboardHTML = `
  <!DOCTYPE html>
  <html lang="${currentLang}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Publisher — ${t.title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=Geist:wght@300..700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      /* ========================================
         THEME SYSTEM — CSS Variable Architecture
         ======================================== */
      ${themeStyles}
      /* ========================================
         DESIGN TOKENS — Editorial Precision
         ======================================== */
      :root {
        /* Spacing scale */
        --space-1: 4px;
        --space-2: 8px;
        --space-3: 12px;
        --space-4: 16px;
        --space-5: 24px;
        --space-6: 32px;
        --space-7: 48px;
        --space-8: 64px;
        --space-9: 96px;

        /* Typography */
        --font-display: 'Fraunces', Georgia, serif;
        --font-body: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
        --font-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;

        /* Type scale */
        --text-xs: 0.6875rem;   /* 11px */
        --text-sm: 0.8125rem;   /* 13px */
        --text-base: 0.9375rem; /* 15px */
        --text-md: 1.0625rem;   /* 17px */
        --text-lg: 1.25rem;     /* 20px */
        --text-xl: 1.5rem;      /* 24px */
        --text-2xl: 2rem;       /* 32px */
        --text-3xl: 2.75rem;    /* 44px */
        --text-4xl: 3.75rem;    /* 60px */

        /* Radii */
        --radius-sm: 4px;
        --radius-md: 8px;
        --radius-lg: 12px;
        --radius-xl: 16px;
        --radius-2xl: 24px;
        --radius-full: 9999px;

        /* Shadows — refined, not generic */
        --shadow-xs: 0 1px 0 0 hsla(0 0% 0% / 0.04);
        --shadow-sm: 0 1px 2px 0 hsla(0 0% 0% / 0.05), 0 1px 0 0 hsla(0 0% 0% / 0.04);
        --shadow-md: 0 4px 12px -2px hsla(0 0% 0% / 0.08), 0 2px 4px -2px hsla(0 0% 0% / 0.04);
        --shadow-lg: 0 12px 24px -4px hsla(0 0% 0% / 0.12), 0 4px 8px -4px hsla(0 0% 0% / 0.06);
        --shadow-xl: 0 24px 48px -8px hsla(0 0% 0% / 0.16), 0 8px 16px -4px hsla(0 0% 0% / 0.08);
        --inner-shadow: inset 0 1px 0 0 hsla(0 0% 100% / 0.06), inset 0 0 0 1px hsla(0 0% 100% / 0.04);

        /* Motion */
        --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
        --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
        --duration-hover: 180ms;
        --duration-modal: 280ms;
        --duration-page: 600ms;
        --transition-speed: 0.35s;

        /* Border weights */
        --border-thin: 1px;
        --border-thick: 1.5px;

        /* Z-index scale */
        --z-base: 0;
        --z-elevated: 10;
        --z-modal: 100;
        --z-toast: 200;
        --z-tooltip: 300;
      }
      /* ========================================
         BASE STYLES
         ======================================== */
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { font-size: 16px; }
      body {
        margin: 0; padding: 0;
        font-family: var(--font-body);
        font-size: var(--text-base);
        letter-spacing: -0.011em;
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
        min-height: 100vh;
        overflow-x: hidden;
        position: relative;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      /* Atmospheric gradient mesh */
      body::before {
        content: '';
        position: fixed;
        inset: 0;
        background:
          radial-gradient(at 0% 0%, hsla(var(--primary), 0.08) 0%, transparent 50%),
          radial-gradient(at 100% 0%, hsla(var(--primary), 0.04) 0%, transparent 50%),
          radial-gradient(at 50% 100%, hsla(var(--primary), 0.06) 0%, transparent 50%);
        pointer-events: none;
        z-index: 0;
      }
      /* Noise texture overlay (data URL SVG, no extra request) */
      body::after {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        opacity: 0.025;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        mix-blend-mode: overlay;
      }
      /* ========================================
         TYPOGRAPHY — Display, Body, Mono
         ======================================== */
      .font-mono { font-family: var(--font-mono); }
      h1, h2, h3, h4, .section-title, .brand-mark, .modal-title {
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-weight: 500;
        letter-spacing: -0.025em;
        color: hsl(var(--foreground));
      }
      .section-title {
        font-size: var(--text-md);
        font-weight: 500;
      }
      h1 { font-size: var(--text-3xl); }
      h2 { font-size: var(--text-2xl); }
      h3 { font-size: var(--text-xl); }
      .label-caps {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
      }
      /* Tabular numerals globally for data consistency */
      .font-mono, .job-id, .progress-meta, .colab-badge, .status-badge, .btn-sm, .modal-tab {
        font-variant-numeric: tabular-nums;
      }
      /* ========================================
         LAYOUT
         ======================================== */
      .app-shell {
        position: relative;
        z-index: 1;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      /* HEADER */
      .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-4) var(--space-6);
        background: hsla(var(--background), 0.8);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-bottom: 1px solid hsla(var(--border), 0.6);
        position: sticky;
        top: 0;
        z-index: var(--z-elevated);
        height: auto;
        min-height: 64px;
        gap: 1rem;
        animation: revealUp var(--duration-page) var(--ease-out-expo) both;
      }
      .header-brand {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .brand-icon {
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)));
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-weight: 600;
        font-size: 1rem;
        font-style: italic;
        color: hsl(var(--primary-foreground));
        box-shadow: 0 1px 2px hsla(0 0% 0% / 0.12), inset 0 1px 0 hsla(0 0% 100% / 0.18);
        position: relative;
        overflow: hidden;
      }
      .brand-icon::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, hsla(0 0% 100% / 0.12) 0%, transparent 100%);
        pointer-events: none;
      }
      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.1;
      }
      .brand-name {
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-weight: 500;
        font-size: 1.25rem;
        letter-spacing: -0.04em;
        color: hsl(var(--foreground));
      }
      .brand-name span {
        font-style: italic;
        font-variation-settings: "opsz" 144, "SOFT" 100;
        color: hsl(var(--primary));
      }
      .brand-sub {
        font-family: var(--font-mono);
        font-size: 0.625rem;
        font-weight: 500;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        margin-top: 2px;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .header-divider {
        width: 1px;
        height: 24px;
        background: hsla(var(--border), 0.8);
        margin: 0 0.25rem;
      }
      /* Icon buttons */
      .icon-btn {
        width: 38px;
        height: 38px;
        border-radius: var(--radius-md);
        border: 1px solid hsla(var(--border), 0.7);
        background: hsla(var(--secondary), 0.4);
        color: hsl(var(--muted-foreground));
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1rem;
        transition: all var(--duration-hover) var(--ease-out-expo);
        backdrop-filter: blur(10px);
        position: relative;
        overflow: hidden;
      }
      .icon-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: hsla(var(--primary), 0);
        transition: background var(--duration-hover) var(--ease-out-expo);
      }
      .icon-btn:hover {
        border-color: hsl(var(--primary));
        color: hsl(var(--primary));
        box-shadow: var(--shadow-sm);
        transform: translateY(-1px);
      }
      .icon-btn:hover::before { background: hsla(var(--primary), 0.08); }
      .icon-btn:active { transform: translateY(0) scale(0.97); }
      .icon-btn-label {
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.05em;
      }
      .btn-logout {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        text-decoration: none;
        padding: 0.4rem 0.75rem;
        border-radius: var(--radius-md);
        border: 1px solid transparent;
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .btn-logout:hover {
        color: hsl(var(--destructive));
        border-color: hsla(var(--destructive), 0.4);
        background: hsla(var(--destructive), 0.08);
      }
      /* ========================================
         MAIN CONTENT
         ======================================== */
      .app-main {
        flex: 1;
        padding: var(--space-6);
        max-width: 1400px;
        width: 100%;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 420px 1fr;
        gap: var(--space-5);
        align-items: start;
        position: relative;
        z-index: 2;
      }
      /* Staggered reveal animation */
      .app-main > * {
        animation: revealUp var(--duration-page) var(--ease-out-expo) both;
      }
      .app-main > *:nth-child(1) { animation-delay: 100ms; }
      .app-main > *:nth-child(2) { animation-delay: 200ms; }
      .app-main > *:nth-child(3) { animation-delay: 300ms; }
      .app-main > *:nth-child(4) { animation-delay: 400ms; }
      @media (max-width: 1024px) {
        .app-main { grid-template-columns: 1fr; }
      }
      /* ========================================
         CARDS / GLASS SURFACES
         ======================================== */
      .glass-card, .modal-body, .app-modal {
        background: hsla(var(--background), 0.7);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-md), var(--inner-shadow);
      }
      .glass-card {
        padding: var(--space-5);
        transition: border-color var(--duration-hover) var(--ease-out-expo),
                    box-shadow var(--duration-hover) var(--ease-out-expo),
                    transform var(--duration-hover) var(--ease-out-expo);
      }
      .glass-card:hover {
        border-color: hsla(var(--primary), 0.3);
        box-shadow: var(--shadow-lg);
      }
      /* Entrance animations */
      @keyframes revealUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes cardEntrance {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-in { animation: cardEntrance var(--duration-page) var(--ease-out-expo) both; }
      .animate-delay-1 { animation-delay: 0.1s; }
      .animate-delay-2 { animation-delay: 0.2s; }
      .animate-delay-3 { animation-delay: 0.3s; }
      .animate-delay-4 { animation-delay: 0.4s; }
      .animate-delay-5 { animation-delay: 0.5s; }
      /* ========================================
         FORM ELEMENTS
         ======================================== */
      .form-label {
        display: block;
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        margin-bottom: var(--space-2);
      }
      .form-input, .form-textarea, .form-select {
        width: 100%;
        font-family: var(--font-body);
        font-size: var(--text-sm);
        padding: var(--space-3) var(--space-4);
        background: hsla(var(--background), 0.5);
        border: 1px solid hsla(var(--border), 0.6);
        border-radius: var(--radius-md);
        color: hsl(var(--foreground));
        outline: none;
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .form-input:focus, .form-textarea:focus, .form-select:focus {
        border-color: hsl(var(--primary));
        background: hsla(var(--background), 0.8);
        box-shadow: 0 0 0 3px hsla(var(--primary), 0.12);
      }
      .form-input::placeholder, .form-textarea::placeholder {
        color: hsl(var(--muted-foreground));
        font-style: italic;
        opacity: 0.7;
      }
      .form-textarea { resize: vertical; min-height: 80px; }
      .form-select {
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='hsl(220,10%,55%)' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.75rem center;
        padding-right: 2rem;
      }
      .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
      .form-stack { display: flex; flex-direction: column; gap: var(--space-4); }
      /* ========================================
         CHECKBOXES
         ======================================== */
      .checkbox-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }
      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        border: 1px solid hsla(var(--border), 0.5);
        background: hsla(var(--input), 0.2);
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.8rem;
        font-weight: 500;
        color: hsl(var(--secondary-foreground));
      }
      .checkbox-item:hover {
        border-color: hsl(var(--primary));
        background: hsla(var(--primary), 0.06);
        color: hsl(var(--foreground));
      }
      .checkbox-item input[type="checkbox"] {
        width: 14px;
        height: 14px;
        accent-color: hsl(var(--primary));
        cursor: pointer;
        flex-shrink: 0;
      }
      /* ========================================
         BUTTONS
         ======================================== */
      .btn-primary, .btn-publish {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-5);
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 500;
        letter-spacing: -0.011em;
        border-radius: var(--radius-md);
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border: 1px solid hsla(0 0% 0% / 0.08);
        box-shadow: var(--shadow-sm), inset 0 1px 0 hsla(0 0% 100% / 0.12);
        cursor: pointer;
        transition: all var(--duration-hover) var(--ease-out-expo);
        overflow: hidden;
      }
      .btn-primary::before, .btn-publish::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, hsla(0 0% 100% / 0.08) 0%, transparent 100%);
        pointer-events: none;
      }
      .btn-primary:hover, .btn-publish:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-md), inset 0 1px 0 hsla(0 0% 100% / 0.15);
      }
      .btn-primary:active, .btn-publish:active {
        transform: translateY(0);
        box-shadow: var(--shadow-xs), inset 0 1px 0 hsla(0 0% 100% / 0.08);
      }
      .btn-primary {
        width: 100%;
        justify-content: center;
      }
      .btn-publish {
        justify-content: center;
      }

      .retry-btn, .delete-btn, .save-btn, .pub-btn {
        font-family: var(--font-body);
        font-weight: 500;
        font-size: var(--text-sm);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        border: 1px solid transparent;
        cursor: pointer;
        transition: all var(--duration-hover) var(--ease-out-expo);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
      }
      .retry-btn {
        background: hsla(var(--primary), 0.12);
        color: hsl(var(--primary));
        border-color: hsla(var(--primary), 0.25);
      }
      .retry-btn:hover {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        box-shadow: var(--shadow-sm);
        transform: translateY(-1px);
      }
      .delete-btn {
        background: hsla(var(--destructive), 0.12);
        color: hsl(var(--destructive));
        border-color: hsla(var(--destructive), 0.25);
      }
      .delete-btn:hover {
        background: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
        box-shadow: var(--shadow-sm);
        transform: translateY(-1px);
      }
      /* S6: Cancel button — red-tinted outlined style for active jobs */
      .cancel-btn {
        background: hsla(0, 72%, 50%, 0.1);
        color: hsl(0, 72%, 50%);
        border: 1px solid hsla(0, 72%, 50%, 0.3);
        padding: 0.4rem 0.875rem;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        font-weight: 500;
        cursor: pointer;
        transition: all var(--duration-hover) var(--ease-out-expo);
        font-family: inherit;
      }
      .cancel-btn:hover {
        background: hsla(0, 72%, 50%, 0.2);
        border-color: hsl(0, 72%, 50%);
        transform: translateY(-1px);
      }
      .save-btn {
        background: hsla(var(--primary), 0.12);
        color: hsl(var(--primary));
        border-color: hsla(var(--primary), 0.25);
        width: 100%;
      }
      .save-btn:hover {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        box-shadow: var(--shadow-sm);
        transform: translateY(-1px);
      }
      .pub-btn {
        background: hsla(var(--foreground), 0.04);
        color: hsl(var(--foreground));
        border-color: hsla(var(--border), 0.6);
        width: 100%;
        margin-top: 0.5rem;
      }
      .pub-btn:hover {
        background: hsla(var(--foreground), 0.08);
        border-color: hsla(var(--foreground), 0.3);
      }
      /* ========================================
         SECTION HEADERS
         ======================================== */
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
        padding-bottom: var(--space-3);
        border-bottom: 1px solid hsla(var(--border), 0.4);
      }
      .section-title {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      .section-title-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: hsl(var(--primary));
        box-shadow: 0 0 8px hsl(var(--primary));
        animation: pulse-glow 2s ease-in-out infinite;
      }
      @keyframes pulse-glow {
        0%, 100% { opacity: 1; box-shadow: 0 0 8px hsl(var(--primary)); }
        50% { opacity: 0.6; box-shadow: 0 0 16px hsl(var(--primary)); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.3); }
      }
      /* ========================================
         JOB CARDS
         ======================================== */
      .job-card {
        background: hsla(var(--card), 0.6);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        margin-bottom: var(--space-3);
        transition: all var(--duration-hover) var(--ease-out-expo);
        position: relative;
        overflow: hidden;
      }
      .job-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)), transparent);
        opacity: 0;
        transition: opacity var(--duration-hover) var(--ease-out-expo);
      }
      .job-card:hover {
        border-color: hsla(var(--primary), 0.3);
        box-shadow: var(--shadow-md);
        transform: translateY(-1px);
      }
      .job-card:hover::before { opacity: 1; }
      .job-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-3);
      }
      .job-id {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: 500;
        color: hsl(var(--muted-foreground));
        letter-spacing: 0.05em;
      }
      .job-id span {
        color: hsl(var(--foreground));
        font-size: var(--text-sm);
      }
      .status-badge, .queue-status, .completion-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-1) var(--space-3);
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        border-radius: var(--radius-full);
        background: hsla(var(--muted), 0.5);
        border: 1px solid hsla(var(--border), 0.4);
        color: hsl(var(--foreground));
      }
      .status-badge.active::before, .queue-status.processing::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: hsl(var(--primary));
        animation: pulse 2s ease-in-out infinite;
      }
      .status-pending { background: hsla(45, 80%, 50%, 0.15); color: hsl(45, 80%, 60%); border-color: hsla(45, 80%, 50%, 0.3); }
      .status-processing { background: hsla(var(--primary), 0.15); color: hsl(var(--primary)); border-color: hsla(var(--primary), 0.4); }
      .status-completed { background: hsla(142, 60%, 40%, 0.15); color: hsl(142, 60%, 55%); border-color: hsla(142, 60%, 40%, 0.3); }
      .status-failed { background: hsla(var(--destructive), 0.15); color: hsl(var(--destructive)); border-color: hsla(var(--destructive), 0.4); }
      .job-prompt {
        font-size: var(--text-sm);
        color: hsl(var(--secondary-foreground));
        line-height: 1.5;
        margin-bottom: var(--space-3);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .job-progress-wrap {
        margin: var(--space-3) 0;
      }
      .progress-track {
        width: 100%;
        height: 6px;
        background: hsla(var(--border), 0.5);
        border-radius: var(--radius-full);
        overflow: hidden;
        position: relative;
      }
      .progress-fill {
        height: 100%;
        border-radius: var(--radius-full);
        background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)));
        transition: width 0.5s var(--ease-out-expo);
        position: relative;
        overflow: hidden;
      }
      .progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, hsla(0,0%,100%,0.4), transparent);
        animation: progress-shimmer 2s linear infinite;
      }
      @keyframes progress-shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }
      .progress-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: var(--space-2);
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: hsl(var(--muted-foreground));
      }
      .job-actions {
        display: flex;
        gap: var(--space-2);
        margin-top: var(--space-3);
      }
      .btn-sm {
        padding: 0.4rem 0.875rem;
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
        font-weight: 500;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: all var(--duration-hover) var(--ease-out-expo);
        font-family: var(--font-mono);
        border: 1px solid;
      }
      .btn-retry {
        background: transparent;
        border-color: hsla(var(--primary), 0.4);
        color: hsl(var(--primary));
      }
      .btn-retry:hover {
        background: hsla(var(--primary), 0.1);
        border-color: hsl(var(--primary));
      }
      .btn-delete {
        background: transparent;
        border-color: hsla(var(--destructive), 0.3);
        color: hsl(var(--destructive));
      }
      .btn-delete:hover {
        background: hsla(var(--destructive), 0.1);
        border-color: hsl(var(--destructive));
      }
      /* Completed job card */
      .completed-card {
        background: hsla(var(--card), 0.6);
        border: 1px solid hsla(var(--border), 0.4);
        border-radius: 0.875rem;
        padding: 1.25rem;
        margin-bottom: 1rem;
        transition: all 0.3s;
      }
      .completed-card:hover {
        border-color: hsla(var(--primary), 0.25);
        box-shadow: 0 4px 24px hsla(var(--primary), 0.06);
      }
      .video-wrap {
        border-radius: 0.5rem;
        overflow: hidden;
        border: 1px solid hsla(var(--border), 0.5);
        margin: 0.875rem 0;
        background: #000;
      }
      .video-wrap video { width: 100%; display: block; max-height: 280px; object-fit: contain; }
      /* SEO / Marketing Meta */
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-top: 0.875rem;
      }
      .meta-section {
        background: hsla(var(--input), 0.2);
        border: 1px solid hsla(var(--border), 0.4);
        border-radius: 0.5rem;
        padding: 0.75rem;
      }
      .meta-section-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: hsl(var(--primary));
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }
      .meta-section-title .status-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 6px currentColor;
      }
      .meta-section input, .meta-section textarea {
        width: 100%;
        padding: 0.4rem 0.6rem;
        border-radius: 0.35rem;
        border: 1px solid hsla(var(--border), 0.5);
        background: hsla(var(--input), 0.3);
        color: hsl(var(--foreground));
        font-family: 'Outfit', sans-serif;
        font-size: 0.75rem;
        outline: none;
        transition: all 0.2s;
        margin-bottom: 0.35rem;
      }
      .meta-section input:focus, .meta-section textarea:focus {
        border-color: hsl(var(--primary));
        box-shadow: 0 0 0 2px hsla(var(--primary), 0.12);
      }
      .meta-section textarea { resize: vertical; min-height: 50px; }
      .meta-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
      }
      .btn-publish {
        flex: 1;
        padding: 0.45rem 0.6rem;
        border-radius: 0.4rem;
        border: 1px solid hsla(var(--primary), 0.4);
        background: transparent;
        color: hsl(var(--primary));
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
      }
      .btn-publish:hover {
        background: hsla(var(--primary), 0.12);
        border-color: hsl(var(--primary));
        box-shadow: 0 0 12px hsla(var(--primary), 0.2);
      }
      .btn-save-all {
        width: 100%;
        padding: 0.6rem;
        border-radius: 0.4rem;
        border: 1px solid hsla(var(--primary), 0.3);
        background: hsla(var(--primary), 0.08);
        color: hsl(var(--primary));
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-save-all:hover {
        background: hsla(var(--primary), 0.16);
        border-color: hsl(var(--primary));
      }
      .btn-delete-project {
        width: 100%;
        padding: 0.5rem;
        border-radius: 0.4rem;
        border: 1px solid hsla(var(--destructive), 0.25);
        background: transparent;
        color: hsl(var(--destructive));
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 0.5rem;
      }
      .btn-delete-project:hover {
        background: hsla(var(--destructive), 0.1);
        border-color: hsl(var(--destructive));
      }
      /* ========================================
         MODALS
         ======================================== */
      .modal-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: hsla(0 0% 0% / 0.5);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 9999;
        animation: fadeIn var(--duration-modal) ease;
      }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .app-modal {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        border-radius: var(--radius-2xl);
        background: hsla(var(--background), 0.92);
        backdrop-filter: blur(30px) saturate(180%);
        -webkit-backdrop-filter: blur(30px) saturate(180%);
        border: 1px solid hsla(var(--border), 0.6);
        box-shadow: var(--shadow-xl);
        overflow: hidden;
        animation: modalReveal var(--duration-modal) var(--ease-out-expo);
      }
      @keyframes modalReveal {
        from { opacity: 0; transform: translate(-50%, -50%) translateY(20px) scale(0.98); }
        to { opacity: 1; transform: translate(-50%, -50%) translateY(0) scale(1); }
      }
      .modal-w-wide { width: 90%; max-width: 980px; max-height: 88vh; }
      .modal-w-std { width: 90%; max-width: 560px; max-height: 85vh; }
      .modal-w-sm { width: 90%; max-width: 460px; max-height: 80vh; }
      .modal-body { padding: 1.75rem; overflow-y: auto; max-height: calc(88vh - 70px); }
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-4) var(--space-5);
        border-bottom: 1px solid hsla(var(--border), 0.4);
      }
      .modal-title {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-size: var(--text-md);
        font-weight: 500;
        letter-spacing: -0.025em;
        color: hsl(var(--foreground));
      }
      .modal-title-icon {
        width: 32px;
        height: 32px;
        background: hsla(var(--primary), 0.12);
        border: 1px solid hsla(var(--primary), 0.3);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
      }
      .modal-close {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-md);
        border: 1px solid hsla(var(--border), 0.5);
        background: transparent;
        color: hsl(var(--muted-foreground));
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 1.1rem;
        font-weight: 700;
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .modal-close:hover {
        border-color: hsl(var(--destructive));
        color: hsl(var(--destructive));
        background: hsla(var(--destructive), 0.08);
      }
      /* Modal Tabs */
      .modal-tabs {
        display: flex;
        gap: 0.25rem;
        padding: 0.25rem;
        background: hsla(var(--border), 0.3);
        border-radius: var(--radius-md);
        margin-bottom: 1.25rem;
      }
      .modal-tab, .settings-nav-item, .lang-btn {
        font-family: var(--font-body);
        font-weight: 500;
        letter-spacing: -0.011em;
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .modal-tab {
        flex: 1;
        border: none;
        background: transparent;
        color: hsl(var(--muted-foreground));
        font-size: var(--text-xs);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
      }
      .modal-tab:hover { color: hsl(var(--foreground)); background: hsla(var(--border), 0.4); }
      .modal-tab.active {
        background: hsl(var(--foreground));
        color: hsl(var(--background));
        box-shadow: var(--shadow-sm);
      }
      .tab-content { display: none; }
      .tab-content.active { display: block; }
      /* Settings form fields */
      .setting-field { margin-bottom: 1.25rem; }
      .setting-field label {
        display: block;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.5rem;
      }
      /* Theme swatches */
      .theme-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0.5rem;
        margin: 1rem 0;
      }
      .theme-swatch {
        aspect-ratio: 1;
        border-radius: 0.5rem;
        border: 2px solid hsla(var(--border), 0.5);
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
      }
      .theme-swatch:hover { border-color: hsl(var(--primary)); transform: scale(1.05); }
      .theme-swatch.active { border-color: hsl(var(--primary)); box-shadow: 0 0 12px hsla(var(--primary), 0.4); }
      .theme-swatch::after {
        content: attr(data-name);
        position: absolute;
        bottom: 4px;
        left: 0;
        right: 0;
        text-align: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.5rem;
        font-weight: 600;
        color: hsla(0,0%,100%,0.8);
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      /* Language buttons */
      .lang-buttons { display: flex; gap: 0.5rem; }
      .lang-btn {
        flex: 1;
        padding: 0.65rem;
        border-radius: var(--radius-md);
        border: 1px solid hsla(var(--border), 0.5);
        background: transparent;
        color: hsl(var(--muted-foreground));
        font-family: var(--font-mono);
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all var(--duration-hover) var(--ease-out-expo);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      .lang-btn:hover { border-color: hsl(var(--primary)); color: hsl(var(--foreground)); }
      .lang-btn.active {
        background: hsla(var(--primary), 0.1);
        border-color: hsl(var(--primary));
        color: hsl(var(--primary));
      }
      /* Help modal */
      .help-search {
        position: relative;
        margin-bottom: 1rem;
      }
      .help-search input {
        width: 100%;
        padding: 0.65rem 0.875rem 0.65rem 2.5rem;
        border-radius: 0.5rem;
        border: 1px solid hsla(var(--border), 0.5);
        background: hsla(var(--input), 0.3);
        color: hsl(var(--foreground));
        font-family: 'Outfit', sans-serif;
        font-size: 0.875rem;
        outline: none;
        transition: all 0.2s;
      }
      .help-search input:focus {
        border-color: hsl(var(--primary));
        box-shadow: 0 0 0 3px hsla(var(--primary), 0.12);
      }
      .help-search-icon {
        position: absolute;
        left: 0.875rem;
        top: 50%;
        transform: translateY(-50%);
        color: hsl(var(--muted-foreground));
        font-size: 0.875rem;
      }
      .help-topics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        max-height: 300px;
        overflow-y: auto;
      }
      .help-topic-btn {
        padding: 0.65rem 0.875rem;
        border-radius: 0.5rem;
        border: 1px solid hsla(var(--border), 0.4);
        background: hsla(var(--input), 0.2);
        color: hsl(var(--secondary-foreground));
        font-family: 'Outfit', sans-serif;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .help-topic-btn:hover, .help-topic-btn.active {
        border-color: hsl(var(--primary));
        background: hsla(var(--primary), 0.08);
        color: hsl(var(--foreground));
      }
      .help-content { margin-top: 1rem; }
      .help-section {
        margin-bottom: 1rem;
        padding: 1rem;
        background: hsla(var(--input), 0.2);
        border-radius: 0.5rem;
        border: 1px solid hsla(var(--border), 0.3);
      }
      .help-section h4 {
        font-size: 0.75rem;
        font-weight: 700;
        color: hsl(var(--primary));
        margin-bottom: 0.5rem;
        font-family: 'JetBrains Mono', monospace;
        letter-spacing: 0.05em;
      }
      .help-section p, .help-section ol {
        font-size: 0.8rem;
        color: hsl(var(--secondary-foreground));
        line-height: 1.6;
      }
      .help-section ol { padding-left: 1.25rem; }
      .help-section li { margin-bottom: 0.35rem; }
      /* Opportunity cards */
      .opp-scroll { display: flex; gap: 0.875rem; overflow-x: auto; padding-bottom: 0.75rem; }
      .opp-scroll::-webkit-scrollbar { height: 4px; }
      .opp-scroll::-webkit-scrollbar-thumb { background: hsl(var(--primary)); border-radius: 4px; }
      .opp-card {
        flex: 0 0 200px;
        background: hsla(var(--card), 0.7);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.75rem;
        padding: 0.875rem;
        transition: all 0.25s;
        cursor: pointer;
      }
      .opp-card:hover {
        border-color: hsl(var(--primary));
        box-shadow: 0 8px 24px hsla(var(--primary), 0.12);
        transform: translateY(-3px);
      }
      .opp-card img {
        width: 100%;
        aspect-ratio: 16/9;
        object-fit: cover;
        border-radius: 0.4rem;
        margin-bottom: 0.6rem;
        border: 1px solid hsla(var(--border), 0.3);
      }
      .opp-card-title {
        font-size: 0.75rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        margin-bottom: 0.4rem;
      }
      .opp-card-views {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6rem;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.4rem;
      }
      .opp-score {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        border-radius: 20px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.6rem;
        font-weight: 800;
        letter-spacing: 0.05em;
      }
      .score-high { background: hsla(142, 60%, 40%, 0.2); color: hsl(142, 60%, 55%); }
      .score-med { background: hsla(var(--primary), 0.15); color: hsl(var(--primary)); }
      .score-low { background: hsla(45, 80%, 50%, 0.15); color: hsl(45, 80%, 60%); }

      /* --- Opportunity Funnel v2 (Sprint 2) --- */
      .opp-step-header { margin-bottom: 1.25rem; }
      .opp-step-title {
        margin: 0 0 0.35rem 0;
        font-size: 1rem;
        font-weight: 700;
        color: hsl(var(--foreground));
        letter-spacing: 0.02em;
      }
      .opp-step-sub {
        margin: 0;
        font-size: 0.78rem;
        color: hsl(var(--muted-foreground));
        line-height: 1.5;
      }
      .opp-input-row {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .opp-search-input {
        flex: 1;
        padding: 0.7rem 0.95rem;
        border-radius: 0.6rem;
        border: 1px solid hsla(var(--border), 0.7);
        background: hsla(var(--input), 0.5);
        color: hsl(var(--foreground));
        font-size: 0.85rem;
        font-family: 'Inter', sans-serif;
        outline: none;
        transition: border 0.2s, box-shadow 0.2s;
      }
      .opp-search-input:focus {
        border-color: hsl(var(--primary));
        box-shadow: 0 0 0 3px hsla(var(--primary), 0.15);
      }
      .opp-search-input-inline { flex: 1; }
      .opp-add-btn { width: auto; padding: 0.55rem 1rem; }
      .opp-chips-label {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.5rem;
        font-weight: 700;
      }
      .opp-interest-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        min-height: 2.2rem;
        align-items: center;
        padding: 0.4rem;
        background: hsla(var(--muted), 0.25);
        border: 1px dashed hsla(var(--border), 0.6);
        border-radius: 0.6rem;
      }
      .opp-chips-empty {
        font-size: 0.72rem;
        color: hsl(var(--muted-foreground));
        font-style: italic;
        padding: 0 0.35rem;
      }
      .opp-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.3rem 0.45rem 0.3rem 0.7rem;
        border-radius: 999px;
        background: hsla(var(--primary), 0.15);
        color: hsl(var(--primary));
        font-size: 0.72rem;
        font-weight: 600;
        border: 1px solid hsla(var(--primary), 0.35);
      }
      .opp-chip button {
        background: hsla(var(--primary), 0.25);
        color: hsl(var(--primary));
        border: none;
        width: 1.1rem;
        height: 1.1rem;
        border-radius: 50%;
        line-height: 1;
        font-size: 0.7rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: background 0.15s;
      }
      .opp-chip button:hover { background: hsl(var(--destructive)); color: hsl(var(--background)); }
      .opp-suggestions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
      .opp-suggestion {
        background: transparent;
        border: 1px dashed hsla(var(--border), 0.8);
        color: hsl(var(--muted-foreground));
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        cursor: pointer;
        font-size: 0.72rem;
        font-weight: 500;
        transition: all 0.18s;
      }
      .opp-suggestion:hover {
        border-color: hsl(var(--primary));
        color: hsl(var(--primary));
        background: hsla(var(--primary), 0.08);
      }
      .opp-step1-actions {
        margin-top: 1.5rem;
        display: flex;
        justify-content: flex-end;
      }
      .opp-step1-actions .btn-publish[disabled] {
        opacity: 0.4;
        cursor: not-allowed;
        filter: grayscale(0.6);
      }
      .opp-results-toolbar {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        margin-bottom: 0.85rem;
      }
      .opp-back-btn {
        background: transparent;
        border: 1px solid hsla(var(--border), 0.7);
        color: hsl(var(--muted-foreground));
        padding: 0.55rem 0.85rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.78rem;
        font-weight: 600;
        transition: all 0.18s;
      }
      .opp-back-btn:hover { color: hsl(var(--foreground)); border-color: hsl(var(--primary)); }
      .opp-refresh-btn { width: auto; padding: 0.55rem 0.9rem; }
      .opp-results-meta {
        font-size: 0.72rem;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.55rem;
        font-family: 'JetBrains Mono', monospace;
      }
      .opp-results-scroll {
        display: flex;
        flex-direction: row;
        gap: 1rem;
        overflow-x: auto;
        overflow-y: visible;
        padding: 0.75rem 0.25rem 1rem 0.25rem;
        scroll-snap-type: x mandatory;
        scrollbar-width: thin;
        scrollbar-color: hsl(var(--primary)) transparent;
        min-height: 320px;
      }
      .opp-results-scroll::-webkit-scrollbar { height: 8px; }
      .opp-results-scroll::-webkit-scrollbar-track { background: hsla(var(--muted), 0.3); border-radius: 4px; }
      .opp-results-scroll::-webkit-scrollbar-thumb { background: hsl(var(--primary)); border-radius: 4px; }
      .opp-video-card {
        flex: 0 0 280px;
        scroll-snap-align: start;
        background: hsla(var(--card), 0.75);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.85rem;
        padding: 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
        position: relative;
        transition: all 0.22s;
        backdrop-filter: blur(4px);
      }
      .opp-video-card:hover {
        border-color: hsl(var(--primary));
        box-shadow: 0 8px 26px hsla(var(--primary), 0.16);
        transform: translateY(-4px);
      }
      .opp-card-thumb {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: 0.55rem;
        overflow: hidden;
        background: hsla(var(--muted), 0.5);
        border: 1px solid hsla(var(--border), 0.4);
      }
      .opp-card-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transition: transform 0.4s;
      }
      .opp-video-card:hover .opp-card-thumb img { transform: scale(1.04); }
      .opp-card-title-2 {
        font-size: 0.82rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 2.3rem;
      }
      .opp-card-channel {
        font-size: 0.68rem;
        color: hsl(var(--muted-foreground));
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-family: 'JetBrains Mono', monospace;
      }
      .opp-card-channel-name {
        font-weight: 600;
        color: hsl(var(--foreground));
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 140px;
      }
      .opp-card-stats {
        display: flex;
        gap: 0.6rem;
        font-size: 0.65rem;
        color: hsl(var(--muted-foreground));
        font-family: 'JetBrains Mono', monospace;
        flex-wrap: wrap;
      }
      .opp-card-stats span { display: inline-flex; align-items: center; gap: 0.2rem; }
      .opp-score-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.66rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        align-self: flex-start;
        border: 1px solid currentColor;
      }
      .opp-score-high {
        background: hsla(142, 70%, 45%, 0.16);
        color: hsl(142, 70%, 45%);
      }
      .opp-score-med {
        background: hsla(190, 90%, 50%, 0.15);
        color: hsl(190, 90%, 50%);
      }
      .opp-score-low {
        background: hsla(45, 100%, 50%, 0.16);
        color: hsl(45, 100%, 50%);
      }
      .opp-score-none {
        background: hsla(220, 10%, 50%, 0.16);
        color: hsl(220, 10%, 60%);
      }
      .opp-desc-toggle {
        background: transparent;
        border: 1px dashed hsla(var(--border), 0.6);
        color: hsl(var(--muted-foreground));
        padding: 0.3rem 0.55rem;
        border-radius: 0.4rem;
        cursor: pointer;
        font-size: 0.65rem;
        font-weight: 600;
        font-family: 'JetBrains Mono', monospace;
        align-self: flex-start;
        transition: all 0.18s;
      }
      .opp-desc-toggle:hover { color: hsl(var(--primary)); border-color: hsl(var(--primary)); }
      .opp-desc-body {
        font-size: 0.7rem;
        color: hsl(var(--muted-foreground));
        line-height: 1.5;
        max-height: 8rem;
        overflow-y: auto;
        padding: 0.5rem;
        background: hsla(var(--muted), 0.3);
        border-radius: 0.4rem;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .opp-card-cta {
        margin-top: auto;
        background: hsla(var(--primary), 0.15);
        color: hsl(var(--primary));
        border: 1px solid hsla(var(--primary), 0.4);
        padding: 0.5rem 0.7rem;
        border-radius: 0.5rem;
        text-decoration: none;
        font-size: 0.72rem;
        font-weight: 700;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        display: block;
      }
      .opp-card-cta:hover {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        transform: translateY(-1px);
      }
      .opp-hover-preview {
        position: fixed;
        z-index: 100000;
        width: 320px;
        background: hsla(var(--card), 0.98);
        border: 1px solid hsl(var(--primary));
        border-radius: 0.7rem;
        padding: 0.85rem;
        box-shadow: 0 12px 36px hsla(var(--primary), 0.25), 0 0 0 1px hsla(var(--primary), 0.2);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.18s;
        backdrop-filter: blur(8px);
      }
      .opp-hover-preview.visible { opacity: 1; }
      .opp-hover-preview img {
        width: 100%;
        aspect-ratio: 16/9;
        object-fit: cover;
        border-radius: 0.45rem;
        margin-bottom: 0.6rem;
      }
      .opp-hover-preview .hp-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: hsl(var(--foreground));
        margin-bottom: 0.4rem;
        line-height: 1.3;
      }
      .opp-hover-preview .hp-desc {
        font-size: 0.7rem;
        color: hsl(var(--muted-foreground));
        line-height: 1.5;
        max-height: 6rem;
        overflow: hidden;
        position: relative;
      }
      .opp-hover-preview .hp-meta {
        font-size: 0.65rem;
        color: hsl(var(--muted-foreground));
        font-family: 'JetBrains Mono', monospace;
        margin-bottom: 0.4rem;
      }
      @keyframes oppShimmer {
        0% { background-position: -468px 0; }
        100% { background-position: 468px 0; }
      }
      .opp-skeleton {
        flex: 0 0 280px;
        scroll-snap-align: start;
        background: hsla(var(--card), 0.5);
        border: 1px solid hsla(var(--border), 0.4);
        border-radius: 0.85rem;
        padding: 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
      }
      .opp-skeleton-block {
        background: linear-gradient(90deg, hsla(var(--muted), 0.3) 8%, hsla(var(--muted), 0.6) 18%, hsla(var(--muted), 0.3) 33%);
        background-size: 800px 100%;
        animation: oppShimmer 1.4s infinite linear;
        border-radius: 0.4rem;
      }
      .opp-skel-thumb { width: 100%; aspect-ratio: 16/9; }
      .opp-skel-line { height: 0.7rem; }
      .opp-skel-line.short { width: 60%; }
      .opp-empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2.5rem 1rem;
        color: hsl(var(--muted-foreground));
        gap: 0.5rem;
      }
      .opp-empty-state .opp-empty-icon { font-size: 2.5rem; opacity: 0.6; }
      .opp-empty-state .opp-empty-title { font-size: 0.9rem; font-weight: 700; color: hsl(var(--foreground)); }
      .opp-empty-state .opp-empty-sub { font-size: 0.78rem; max-width: 320px; line-height: 1.5; }
      .opp-empty-state .opp-empty-link {
        margin-top: 0.6rem;
        padding: 0.5rem 1rem;
        background: hsla(var(--primary), 0.15);
        border: 1px solid hsla(var(--primary), 0.4);
        color: hsl(var(--primary));
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
      }
      .opp-empty-state .opp-empty-link:hover { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
      .opp-error-state {
        flex: 1;
        background: hsla(0, 70%, 50%, 0.08);
        border: 1px solid hsla(0, 70%, 50%, 0.3);
        border-radius: 0.7rem;
        padding: 1.25rem;
        color: hsl(0, 70%, 70%);
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin: 0 0.25rem;
      }
      .opp-error-state button {
        background: hsla(0, 70%, 50%, 0.2);
        color: hsl(0, 70%, 70%);
        border: 1px solid hsla(0, 70%, 50%, 0.4);
        padding: 0.45rem 0.8rem;
        border-radius: 0.45rem;
        cursor: pointer;
        font-weight: 700;
        font-size: 0.72rem;
      }
      .opp-error-state button:hover { background: hsla(0, 70%, 50%, 0.35); }

      /* --- Opportunity Funnel v2.5: Languages + Differentiate --- */
      .opp-lang-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-bottom: 0.5rem;
      }
      .opp-lang-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.4rem 0.7rem;
        border-radius: 999px;
        background: hsla(var(--input), 0.5);
        border: 1px solid hsla(var(--border), 0.6);
        color: hsl(var(--muted-foreground));
        font-size: 0.72rem;
        font-weight: 600;
        cursor: pointer;
        user-select: none;
        transition: all 0.18s ease;
      }
      .opp-lang-chip:hover { border-color: hsl(var(--primary)); }
      .opp-lang-chip.checked {
        background: linear-gradient(135deg, hsla(var(--primary), 0.18), hsla(var(--primary), 0.06));
        border-color: hsl(var(--primary));
        color: hsl(var(--primary));
        box-shadow: 0 0 0 1px hsla(var(--primary), 0.3);
      }
      .opp-lang-chip input { display: none; }
      .opp-lang-chip .opp-lang-flag { font-size: 0.95rem; }

      .opp-differentiate-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        width: 100%;
        justify-content: center;
        padding: 0.55rem 0.85rem;
        margin-top: 0.5rem;
        background: linear-gradient(135deg, hsl(var(--primary)), hsl(280, 70%, 55%));
        color: hsl(var(--primary-foreground));
        border: none;
        border-radius: 0.55rem;
        font-weight: 700;
        font-size: 0.75rem;
        cursor: pointer;
        letter-spacing: 0.02em;
        position: relative;
        overflow: hidden;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      .opp-differentiate-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px hsla(var(--primary), 0.35);
      }
      .opp-differentiate-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(120deg, transparent 30%, hsla(255,255,255,0.18) 50%, transparent 70%);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
      }
      .opp-differentiate-btn:hover::before { transform: translateX(100%); }
      .opp-differentiate-btn[disabled] {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      .opp-differentiate-btn .spin { animation: oppSpin 0.9s linear infinite; }
      @keyframes oppSpin { to { transform: rotate(360deg); } }

      .diff-modal-width { max-width: 540px; }
      .diff-preview {
        display: flex;
        gap: 0.85rem;
        padding: 0.85rem;
        background: hsla(var(--input), 0.4);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.7rem;
        margin-bottom: 1rem;
      }
      .diff-preview-thumb {
        width: 140px;
        aspect-ratio: 16/9;
        object-fit: cover;
        border-radius: 0.45rem;
        flex-shrink: 0;
        background: hsl(var(--background));
      }
      .diff-preview-info { flex: 1; min-width: 0; }
      .diff-preview-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: hsl(var(--foreground));
        line-height: 1.3;
        margin-bottom: 0.25rem;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .diff-preview-channel {
        font-size: 0.7rem;
        color: hsl(var(--muted-foreground));
        font-family: 'JetBrains Mono', monospace;
      }

      .diff-form-row { margin-bottom: 0.85rem; }
      .diff-form-label {
        display: block;
        font-size: 0.72rem;
        font-weight: 700;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.4rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .diff-form-select {
        width: 100%;
        padding: 0.6rem 0.75rem;
        background: hsla(var(--input), 0.6);
        color: hsl(var(--foreground));
        border: 1px solid hsla(var(--border), 0.7);
        border-radius: 0.5rem;
        font-size: 0.85rem;
        font-family: inherit;
        outline: none;
      }
      .diff-form-select:focus { border-color: hsl(var(--primary)); }

      .diff-radio-group { display: flex; flex-direction: column; gap: 0.4rem; }
      .diff-radio {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.55rem 0.7rem;
        background: hsla(var(--input), 0.45);
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.18s ease;
      }
      .diff-radio:hover { border-color: hsl(var(--primary)); }
      .diff-radio.checked {
        background: linear-gradient(135deg, hsla(var(--primary), 0.12), hsla(var(--primary), 0.04));
        border-color: hsl(var(--primary));
      }
      .diff-radio input { margin: 0; accent-color: hsl(var(--primary)); }
      .diff-radio-label { font-size: 0.82rem; color: hsl(var(--foreground)); font-weight: 600; }
      .diff-radio-sub { font-size: 0.7rem; color: hsl(var(--muted-foreground)); margin-left: auto; }

      .diff-steps {
        list-style: none;
        margin: 0.5rem 0 1rem 0;
        padding: 0.75rem 0.85rem;
        background: hsla(var(--input), 0.35);
        border: 1px dashed hsla(var(--border), 0.6);
        border-radius: 0.55rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .diff-steps li {
        font-size: 0.78rem;
        color: hsl(var(--secondary-foreground));
        display: flex;
        align-items: center;
        gap: 0.5rem;
        line-height: 1.4;
      }
      .diff-steps li::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: hsl(var(--primary));
        flex-shrink: 0;
      }

      .diff-submit-row { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
      .diff-submit-btn {
        padding: 0.7rem 1.4rem;
        background: linear-gradient(135deg, hsl(var(--primary)), hsl(280, 70%, 55%));
        color: hsl(var(--primary-foreground));
        border: none;
        border-radius: 0.55rem;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.18s ease;
      }
      .diff-submit-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px hsla(var(--primary), 0.35); }
      .diff-submit-btn[disabled] { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
      .diff-cancel-btn {
        padding: 0.7rem 1.1rem;
        background: transparent;
        color: hsl(var(--muted-foreground));
        border: 1px solid hsla(var(--border), 0.6);
        border-radius: 0.55rem;
        font-size: 0.82rem;
        cursor: pointer;
        font-weight: 600;
      }
      .diff-cancel-btn:hover { color: hsl(var(--foreground)); border-color: hsl(var(--primary)); }

      /* Two-step differentiation: review/edit view */
      .diff-review-details {
        margin-top: 0.6rem;
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.55rem;
        background: hsla(var(--background), 0.4);
      }
      .diff-review-details > summary {
        cursor: pointer;
        padding: 0.55rem 0.75rem;
        font-size: 0.78rem;
        font-weight: 600;
        color: hsl(var(--muted-foreground));
        user-select: none;
        list-style: none;
      }
      .diff-review-details > summary::-webkit-details-marker { display: none; }
      .diff-review-details > summary::before {
        content: '▸';
        margin-right: 0.4rem;
        transition: transform 0.15s ease;
        display: inline-block;
      }
      .diff-review-details[open] > summary::before { transform: rotate(90deg); }
      .diff-review-details[open] > summary { color: hsl(var(--foreground)); }
      .diff-review-readonly {
        padding: 0.6rem 0.85rem;
        border-top: 1px solid hsla(var(--border), 0.4);
        font-size: 0.78rem;
        line-height: 1.5;
        color: hsl(var(--muted-foreground));
        max-height: 220px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .diff-review-textarea {
        width: 100%;
        min-height: 280px;
        background: hsla(var(--background), 0.6);
        color: hsl(var(--foreground));
        border: 1px solid hsla(var(--border), 0.5);
        border-radius: 0.5rem;
        padding: 0.75rem;
        font-family: inherit;
        font-size: 0.85rem;
        line-height: 1.5;
        resize: vertical;
        box-sizing: border-box;
      }
      .diff-review-textarea:focus {
        outline: none;
        border-color: hsl(var(--primary));
        box-shadow: 0 0 0 2px hsla(var(--primary), 0.2);
      }
      .diff-char-count {
        font-size: 0.7rem;
        color: hsl(var(--muted-foreground));
        text-align: right;
        margin-top: 0.25rem;
      }

      /* Dashboard: manual start button + awaiting-approval badge */
      .start-btn {
        background: linear-gradient(135deg, hsl(142 70% 45%), hsl(190 90% 50%));
        color: white;
        font-weight: 600;
        border: none;
        border-radius: 0.5rem;
        padding: 0.55rem 1rem;
        font-size: 0.85rem;
        cursor: pointer;
        transition: transform 0.12s ease, box-shadow 0.15s ease;
      }
      .start-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px hsla(190 90% 50% / 0.35);
      }
      .approval-pending-badge {
        background: hsla(45 100% 50% / 0.15);
        color: hsl(45 100% 50%);
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }
      .phase1-pending-badge {
        background: hsla(190 90% 50% / 0.15);
        color: hsl(190 90% 50%);
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .phase1-pending-badge:hover {
        background: hsla(190 90% 50% / 0.25);
        transform: translateY(-1px);
      }
      .diff-timeout-warning {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: hsla(45 100% 50% / 0.1);
        border: 1px solid hsla(45 100% 50% / 0.3);
        border-radius: 0.5rem;
        font-size: 0.85rem;
      }
      .diff-error-msg {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: hsla(0 84% 60% / 0.1);
        border: 1px solid hsla(0 84% 60% / 0.3);
        border-radius: 0.5rem;
        font-size: 0.85rem;
      }
      .diff-error-msg p {
        margin: 0 0 0.5rem 0;
        color: hsl(0 84% 60%);
      }
      .diff-timeout-warning p {
        margin: 0 0 0.5rem 0;
      }

      /* Empty states */
      .empty-state {
        text-align: center;
        padding: 2rem 1rem;
        color: hsl(var(--muted-foreground));
        font-size: 0.875rem;
      }
      .empty-state-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.4;
      }
      /* Utility */
      .mt-1 { margin-top: 0.75rem; }
      .mt-2 { margin-top: 1.5rem; }
      .text-center { text-align: center; }
      /* ========================================
         COLAB STATUS BADGE (S3)
         ======================================== */
      .colab-status-wrap { position: relative; }
      .colab-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        padding: 0.4rem 0.75rem;
        border-radius: 0.625rem;
        border: 1px solid hsla(var(--border), 0.7);
        background: hsla(var(--secondary), 0.4);
        color: hsl(var(--muted-foreground));
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: all 0.2s;
        backdrop-filter: blur(10px);
      }
      .colab-badge:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      .colab-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: hsl(220, 10%, 50%);
        flex-shrink: 0;
        transition: background 0.25s, box-shadow 0.25s;
      }
      .colab-stopped .colab-dot { background: hsl(220, 10%, 50%); }
      .colab-starting .colab-dot { background: hsl(45, 100%, 55%); box-shadow: 0 0 8px hsla(45, 100%, 55%, 0.7); animation: colabPulse 1s ease-in-out infinite; }
      .colab-stopping .colab-dot { background: hsl(45, 100%, 55%); animation: colabPulse 1s ease-in-out infinite; }
      .colab-running .colab-dot { background: hsl(142, 70%, 50%); box-shadow: 0 0 8px hsla(142, 70%, 50%, 0.7); }
      .colab-error .colab-dot { background: hsl(0, 70%, 55%); box-shadow: 0 0 8px hsla(0, 70%, 55%, 0.7); }
      .colab-stopped { opacity: 0.7; }
      .colab-error { border-color: hsla(0, 70%, 55%, 0.4); color: hsl(0, 70%, 65%); }
      .colab-running { border-color: hsla(142, 70%, 50%, 0.4); color: hsl(142, 70%, 60%); }
      .colab-starting, .colab-stopping { border-color: hsla(45, 100%, 55%, 0.4); color: hsl(45, 100%, 60%); }
      @keyframes colabPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.25); opacity: 0.65; }
      }
      .colab-label { white-space: nowrap; }
      .colab-popover {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        width: 320px;
        background: hsla(220, 30%, 9%, 0.97);
        backdrop-filter: blur(30px) saturate(180%);
        border: 1px solid hsla(var(--primary), 0.3);
        border-radius: 0.85rem;
        box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 24px hsla(var(--primary), 0.1);
        z-index: 1000;
        animation: colabPopoverIn 0.18s ease;
      }
      @keyframes colabPopoverIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .colab-popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.7rem 0.95rem;
        border-bottom: 1px solid hsla(var(--border), 0.4);
        font-size: 0.78rem;
        font-weight: 700;
        color: hsl(var(--foreground));
      }
      .colab-popover-close {
        background: transparent;
        border: none;
        color: hsl(var(--muted-foreground));
        cursor: pointer;
        font-size: 1.1rem;
        line-height: 1;
        padding: 0;
      }
      .colab-popover-close:hover { color: hsl(var(--destructive)); }
      .colab-popover-body { padding: 0.7rem 0.95rem; }
      .colab-status-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        color: hsl(var(--muted-foreground));
        border-bottom: 1px dashed hsla(var(--border), 0.3);
      }
      .colab-status-row:last-of-type { border-bottom: none; }
      .colab-status-row b {
        color: hsl(var(--foreground));
        font-weight: 600;
        text-align: right;
        max-width: 60%;
      }
      .colab-popover-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.65rem;
      }
      .colab-action-btn {
        flex: 1;
        padding: 0.5rem 0.7rem;
        border-radius: 0.5rem;
        border: 1px solid hsla(var(--border), 0.6);
        background: hsla(var(--secondary), 0.3);
        color: hsl(var(--muted-foreground));
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: all 0.18s;
      }
      .colab-action-btn:hover { color: hsl(var(--foreground)); border-color: hsl(var(--primary)); }
      .colab-action-start:hover {
        background: hsla(142, 70%, 50%, 0.15);
        color: hsl(142, 70%, 60%);
        border-color: hsl(142, 70%, 50%);
      }
      .colab-action-stop:hover {
        background: hsla(0, 70%, 55%, 0.15);
        color: hsl(0, 70%, 65%);
        border-color: hsl(0, 70%, 55%);
      }
      .colab-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

      /* ========================================
         SCROLLBAR
         ======================================== */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: hsla(var(--border), 0.6); border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background: hsla(var(--primary), 0.4); }
      /* ========================================
         RESPONSIVE
         ======================================== */
      @media (max-width: 768px) {
        .app-main { padding: 1rem; }
        .meta-grid { grid-template-columns: 1fr; }
        .form-grid-2 { grid-template-columns: 1fr; }
        .help-topics { grid-template-columns: 1fr; }
      }

      /* ========================================
         SETTINGS — D-NOTE INSPIRED LAYOUT
         ======================================== */
      .settings-layout {
        display: flex;
        gap: 0;
        min-height: 460px;
      }
      .settings-sidebar {
        width: 200px;
        flex-shrink: 0;
        background: hsla(var(--background), 0.4);
        border-right: 1px solid hsla(var(--border), 0.5);
        padding: 1.25rem 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .settings-nav-item {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        font-size: var(--text-sm);
        color: hsl(var(--muted-foreground));
        background: transparent;
        border: none;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        position: relative;
      }
      .settings-nav-item:hover {
        background: hsla(var(--foreground), 0.05);
        color: hsl(var(--foreground));
      }
      .settings-nav-item.active {
        background: hsl(var(--foreground));
        color: hsl(var(--background));
        font-weight: 500;
        box-shadow: var(--shadow-sm);
      }
      .settings-nav-icon {
        font-size: 1rem;
        width: 22px;
        text-align: center;
        filter: grayscale(0.2);
      }
      .settings-content {
        flex: 1;
        padding: 1.5rem 1.75rem;
        overflow-y: auto;
        max-height: 65vh;
        animation: settingsFadeIn 0.32s ease;
      }
      @keyframes settingsFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .settings-section {
        margin-bottom: 1.75rem;
      }
      .settings-section:last-child {
        margin-bottom: 0;
      }
      .settings-section-header {
        margin-bottom: 0.85rem;
      }
      .settings-section-header h3 {
        font-size: 0.92rem;
        font-weight: 700;
        color: hsl(var(--foreground));
        margin: 0 0 0.18rem 0;
        letter-spacing: -0.005em;
      }
      .settings-section-header p {
        font-size: 0.74rem;
        color: hsl(var(--muted-foreground));
        margin: 0;
        line-height: 1.4;
      }

      /* Premium Theme Cards */
      .premium-theme-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.65rem;
      }
      .premium-theme-card {
        position: relative;
        padding: 0.55rem;
        background: hsla(var(--background), 0.5);
        border: 2px solid hsla(var(--border), 0.6);
        border-radius: 0.7rem;
        cursor: pointer;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: inherit;
        text-align: left;
        overflow: hidden;
      }
      .premium-theme-card:hover {
        transform: translateY(-2px);
        border-color: hsla(var(--primary), 0.4);
        box-shadow: 0 8px 20px -8px hsla(var(--primary), 0.3);
        background: hsla(var(--background), 0.8);
      }
      .premium-theme-card.active {
        border-color: hsl(var(--primary));
        background: linear-gradient(135deg, hsla(var(--primary), 0.08), hsla(var(--primary), 0.02));
        box-shadow: 0 0 0 1px hsl(var(--primary)), 0 8px 24px -10px hsla(var(--primary), 0.4);
      }
      .premium-theme-card.active::after {
        content: '✓';
        position: absolute;
        top: 0.4rem;
        right: 0.4rem;
        width: 18px;
        height: 18px;
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.65rem;
        font-weight: 800;
        box-shadow: 0 2px 6px hsla(var(--primary), 0.5);
      }
      .theme-preview {
        position: relative;
        width: 100%;
        height: 56px;
        border-radius: var(--radius-md);
        border: 1px solid hsla(0 0% 0% / 0.08);
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        transition: transform var(--duration-hover) var(--ease-out-expo);
      }
      .theme-stripe {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
      }
      .theme-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        margin-top: 12px;
        box-shadow: 0 0 0 4px hsla(0 0% 0% / 0.04), 0 0 16px currentColor;
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .premium-theme-card.active .theme-preview {
        transform: scale(1.04);
      }
      .theme-card-name {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 500;
        color: hsl(var(--foreground));
        line-height: 1.1;
        letter-spacing: -0.011em;
      }
      .theme-card-meta {
        font-family: var(--font-mono);
        font-size: 0.625rem;
        font-weight: 500;
        color: hsl(var(--muted-foreground));
        margin-top: 0.15rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      /* Mode toggle group */
      .mode-toggle-group {
        display: flex;
        gap: 0.5rem;
        background: hsla(var(--background), 0.5);
        padding: 0.3rem;
        border-radius: 0.6rem;
        border: 1px solid hsla(var(--border), 0.4);
      }
      .mode-toggle-group .lang-btn {
        flex: 1;
        background: transparent;
      }
      .mode-toggle-group .lang-btn.active {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        box-shadow: 0 2px 8px hsla(var(--primary), 0.4);
      }

      /* Settings toggle (iOS-style) */
      .settings-toggle {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
        user-select: none;
      }
      .settings-toggle input {
        display: none;
      }
      .settings-toggle-slider {
        position: relative;
        width: 38px;
        height: 22px;
        background: hsla(var(--muted), 0.8);
        border-radius: 11px;
        transition: background 0.25s ease;
        flex-shrink: 0;
      }
      .settings-toggle-slider::before {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        background: white;
        border-radius: 50%;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      .settings-toggle input:checked + .settings-toggle-slider {
        background: hsl(var(--primary));
      }
      .settings-toggle input:checked + .settings-toggle-slider::before {
        transform: translateX(16px);
      }
      .settings-toggle-label {
        font-size: 0.82rem;
        color: hsl(var(--foreground));
      }

      /* Language cards */
      .language-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.6rem;
      }
      .language-card {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.75rem 0.9rem;
        background: hsla(var(--background), 0.5);
        border: 1px solid hsla(var(--border), 0.6);
        border-radius: var(--radius-md);
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .language-card:hover {
        border-color: hsla(var(--primary), 0.4);
        background: hsla(var(--background), 0.7);
        transform: translateY(-1px);
      }
      .language-card.active {
        border-color: hsl(var(--primary));
        background: hsla(var(--primary), 0.06);
      }
      .language-flag {
        font-size: 1.5rem;
        line-height: 1;
      }
      .language-info {
        flex: 1;
      }
      .language-name {
        font-family: var(--font-body);
        font-size: var(--text-sm);
        font-weight: 500;
        color: hsl(var(--foreground));
        line-height: 1.1;
        letter-spacing: -0.011em;
      }
      .language-native {
        font-size: 0.68rem;
        color: hsl(var(--muted-foreground));
        margin-top: 0.15rem;
      }
      .language-check {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 18px;
        height: 18px;
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 700;
        opacity: 0;
        transform: scale(0.5);
        transition: all var(--duration-hover) var(--ease-out-expo);
      }
      .language-card.active .language-check {
        opacity: 1;
        transform: scale(1);
      }

      /* Account header */
      .account-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: hsla(var(--primary), 0.06);
        border: 1px solid hsla(var(--primary), 0.2);
        border-radius: var(--radius-lg);
        margin-bottom: 1.5rem;
      }
      .account-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: hsl(var(--primary));
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-size: 1.5rem;
        font-style: italic;
        font-weight: 500;
        color: hsl(var(--primary-foreground));
        box-shadow: 0 1px 2px hsla(0 0% 0% / 0.12);
        flex-shrink: 0;
      }
      .account-name {
        font-family: var(--font-display);
        font-variation-settings: "opsz" 144, "SOFT" 0;
        font-weight: 500;
        font-size: var(--text-md);
        letter-spacing: -0.02em;
        color: hsl(var(--foreground));
      }
      .account-role {
        font-family: var(--font-mono);
        font-size: 0.625rem;
        font-weight: 500;
        color: hsl(var(--muted-foreground));
        margin-top: 0.2rem;
        letter-spacing: 0.08em;
      }

      /* Theme transition smoothing — uses --transition-speed from design tokens */
      body, .app-header, .app-modal, .glass-card, .form-input, .form-textarea, .form-select, .lang-btn, .icon-btn, .btn-primary, .btn-publish, .modal-title, .settings-nav-item, .premium-theme-card, .language-card {
        transition: background-color var(--transition-speed) ease, color var(--transition-speed) ease, border-color var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
      }

      /* Responsive: collapse sidebar to top tabs on small screens */
      @media (max-width: 720px) {
        .settings-layout { flex-direction: column; min-height: 0; }
        .settings-sidebar {
          width: 100%;
          flex-direction: row;
          overflow-x: auto;
          border-right: none;
          border-bottom: 1px solid hsla(var(--border), 0.5);
          padding: 0.6rem;
        }
        .settings-nav-item {
          white-space: nowrap;
          flex-shrink: 0;
        }
        .settings-nav-item.active {
          box-shadow: inset 0 -3px 0 hsl(var(--primary));
        }
        .premium-theme-grid { grid-template-columns: repeat(2, 1fr); }
        .settings-content { max-height: 70vh; }
      }
    </style>
  </head>
  <body>
    <!-- Modal Backdrop -->
    <div class="modal-backdrop" id="modalBackdrop" onclick="closeAllModals()"></div>

    <!-- 1. Opportunity Funnel Modal -->
    <div class="app-modal modal-w-wide" id="opportunityModal">
      <div class="modal-header">
        <div class="modal-title">
          <div class="modal-title-icon">🔥</div>
          ${t.oppTitle}
        </div>
        <button class="modal-close" onclick="closeModal('opportunityModal')">×</button>
      </div>
      <div class="modal-body">

        <!-- STEP 1: Interest Selection -->
        <div id="opp-step-1">
          <div class="opp-step-header">
            <h3 class="opp-step-title">${currentLang === 'tr' ? 'İlgi Alanlarını Seç' : 'Pick Your Interests'}</h3>
            <p class="opp-step-sub">${currentLang === 'tr' ? 'Anahtar kelime veya niş ekleyin (örn: yapay zeka, video üretim). 1–5 etiket seçin.' : 'Add keywords or niches (e.g. ai, video production). Pick 1–5 tags.'}</p>
          </div>

          <div class="opp-input-row">
            <input
              type="text"
              id="opp-interest-input"
              class="opp-search-input"
              placeholder="${currentLang === 'tr' ? 'Bir ilgi alanı yazıp Enter\\u0027a bas' : 'Type an interest and press Enter'}"
              onkeydown="oppInputKey(event)"
            >
            <button type="button" class="btn-publish opp-add-btn" onclick="oppAddFromInput()">${currentLang === 'tr' ? 'Ekle' : 'Add'}</button>
          </div>

          <div class="opp-chips-label">${currentLang === 'tr' ? 'Seçilen' : 'Selected'}</div>
          <div class="opp-interest-chips" id="opp-chips-container">
            <span class="opp-chips-empty">${currentLang === 'tr' ? 'Henüz seçim yok.' : 'No tags yet.'}</span>
          </div>

          <div class="opp-chips-label" style="margin-top: 1.25rem;">${currentLang === 'tr' ? 'Diller' : 'Languages'}</div>
          <div class="opp-lang-row" id="opp-lang-container">
            <button type="button" class="opp-lang-chip checked" data-lang="tr" onclick="toggleOppLang(this)">
              <span class="opp-lang-flag">🇹🇷</span><span>Türkçe</span>
            </button>
            <button type="button" class="opp-lang-chip checked" data-lang="en" onclick="toggleOppLang(this)">
              <span class="opp-lang-flag">🇬🇧</span><span>English</span>
            </button>
            <button type="button" class="opp-lang-chip" data-lang="de" onclick="toggleOppLang(this)">
              <span class="opp-lang-flag">🇩🇪</span><span>Deutsch</span>
            </button>
            <button type="button" class="opp-lang-chip" data-lang="fr" onclick="toggleOppLang(this)">
              <span class="opp-lang-flag">🇫🇷</span><span>Français</span>
            </button>
            <button type="button" class="opp-lang-chip" data-lang="es" onclick="toggleOppLang(this)">
              <span class="opp-lang-flag">🇪🇸</span><span>Español</span>
            </button>
          </div>

          <div class="opp-chips-label" style="margin-top: 1.25rem;">${currentLang === 'tr' ? 'Öneriler' : 'Suggestions'}</div>
          <div class="opp-suggestions" id="opp-suggestions-container">
            ${['yapay zeka','yapay zeka 2026','türkçe ai','video üretim','shorts','ai tools'].map(s =>
              `<button type="button" class="opp-suggestion" onclick="addInterest('${s}')">+ ${s}</button>`
            ).join('')}
          </div>

          <div class="opp-step1-actions">
            <button type="button" class="btn-publish" id="opp-search-btn" onclick="searchOpportunities()" disabled>
              🔎 ${currentLang === 'tr' ? 'Fırsatları Ara' : 'Search Opportunities'}
            </button>
          </div>
        </div>

        <!-- STEP 2: Results -->
        <div id="opp-step-2" style="display:none;">
          <div class="opp-results-toolbar">
            <button type="button" class="opp-back-btn" onclick="openOppStep1()">← ${currentLang === 'tr' ? 'Geri' : 'Back'}</button>
            <input
              type="text"
              id="opp-results-search"
              class="opp-search-input opp-search-input-inline"
              placeholder="${currentLang === 'tr' ? 'Arama terimi' : 'Search query'}"
              onkeydown="oppResultsSearchKey(event)"
            >
            <button type="button" class="btn-publish opp-refresh-btn" onclick="rerunOpportunitySearch()">🔄 ${currentLang === 'tr' ? 'Yenile' : 'Refresh'}</button>
          </div>

          <div class="opp-results-meta" id="opp-results-meta"></div>

          <div class="opp-results-scroll" id="opp-list">
            <!-- Cards injected here -->
          </div>
        </div>

        <!-- Hover preview tooltip (single, repositioned per hover) -->
        <div class="opp-hover-preview" id="opp-hover-preview" style="display:none;"></div>

        <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
          <button class="btn-publish" onclick="closeModal('opportunityModal')" style="width:auto; padding: 0.5rem 1.25rem;">
            ${t.close}
          </button>
        </div>
      </div>
    </div>

    <!-- 1b. Differentiate Modal (S2.5) -->
    <div class="app-modal diff-modal-width" id="differentiateModal">
      <div class="modal-header">
        <div class="modal-title">
          <div class="modal-title-icon">✨</div>
          ${currentLang === 'tr' ? 'Videoyu Özgünleştir' : 'Differentiate Video'}
        </div>
        <button class="modal-close" onclick="closeModal('differentiateModal')">×</button>
      </div>
      <div class="modal-body">
        <!-- ── STEP 1: video selection + target lang/duration form ── -->
        <div id="diff-step1">
          <!-- Video preview -->
          <div class="diff-preview" id="diff-preview">
            <img id="diff-preview-thumb" class="diff-preview-thumb" src="" alt="">
            <div class="diff-preview-info">
              <div class="diff-preview-title" id="diff-preview-title">—</div>
              <div class="diff-preview-channel" id="diff-preview-channel">—</div>
            </div>
          </div>

          <!-- Target language -->
          <div class="diff-form-row">
            <label class="diff-form-label" for="diff-target-lang">${currentLang === 'tr' ? 'Hedef Dil' : 'Target Language'}</label>
            <select id="diff-target-lang" class="diff-form-select"></select>
          </div>

          <!-- Duration mode -->
          <div class="diff-form-row">
            <label class="diff-form-label">${currentLang === 'tr' ? 'Video Süresi' : 'Video Duration'}</label>
            <div class="diff-radio-group" id="diff-duration-group">
              <button type="button" class="diff-radio checked" data-mode="same" onclick="selectDurationMode(this)">
                <span class="diff-radio-label">${currentLang === 'tr' ? 'Aynı' : 'Same'}</span>
                <span class="diff-radio-sub">3-5 ${currentLang === 'tr' ? 'sahne' : 'scenes'}</span>
              </button>
              <button type="button" class="diff-radio" data-mode="shorter" onclick="selectDurationMode(this)">
                <span class="diff-radio-label">${currentLang === 'tr' ? 'Daha Kısa' : 'Shorter'}</span>
                <span class="diff-radio-sub">-30%</span>
              </button>
              <button type="button" class="diff-radio" data-mode="longer" onclick="selectDurationMode(this)">
                <span class="diff-radio-label">${currentLang === 'tr' ? 'Daha Uzun' : 'Longer'}</span>
                <span class="diff-radio-sub">+50%</span>
              </button>
            </div>
          </div>

          <!-- Steps -->
          <div>
            <label class="diff-form-label">${currentLang === 'tr' ? 'İşlem Özeti' : 'Process Summary'}</label>
            <ul class="diff-steps">
              <li>${currentLang === 'tr' ? 'Transkript çıkarılır (youtube-transcript)' : 'Transcript extracted (youtube-transcript)'}</li>
              <li>${currentLang === 'tr' ? 'Metin Gemini ile temizlenir' : 'Text cleaned with Gemini'}</li>
              <li>${currentLang === 'tr' ? 'Hedef dile çevrilir' : 'Translated to target language'}</li>
              <li>${currentLang === 'tr' ? 'Çeviriyi onaylarsanız sahne promptları üretilir' : 'After approval, scene prompts generated'}</li>
              <li>${currentLang === 'tr' ? "Dashboard'dan manuel başlatırsınız" : 'You start it manually from the dashboard'}</li>
            </ul>
          </div>

          <div class="diff-submit-row">
            <button type="button" class="diff-cancel-btn" onclick="closeModal('differentiateModal')">${t.close}</button>
            <button type="button" class="diff-submit-btn" id="diff-submit-btn" onclick="submitDifferentiate()">✨ ${currentLang === 'tr' ? 'Çeviriyi Üret' : 'Generate Translation'}</button>
          </div>
        </div>

        <!-- ── STEP 2: translation review + edit ── -->
        <div id="diff-step2" style="display:none;">
          <div class="diff-preview" id="diff-preview-step2">
            <img id="diff-preview-thumb-step2" class="diff-preview-thumb" src="" alt="">
            <div class="diff-preview-info">
              <div class="diff-preview-title" id="diff-preview-title-step2">—</div>
              <div class="diff-preview-channel" id="diff-preview-channel-step2">—</div>
            </div>
          </div>

          <details class="diff-review-details">
            <summary>${currentLang === 'tr' ? 'Orijinal Transkript' : 'Original Transcript'}</summary>
            <div class="diff-review-readonly" id="diff-original-text"></div>
          </details>

          <details class="diff-review-details">
            <summary>${currentLang === 'tr' ? 'Temizlenmiş Transkript' : 'Cleaned Transcript'}</summary>
            <div class="diff-review-readonly" id="diff-cleaned-text"></div>
          </details>

          <div class="diff-form-row" style="margin-top: 0.85rem;">
            <label class="diff-form-label" for="diff-translated-text">${currentLang === 'tr' ? 'Çevrilmiş Metin (düzenlenebilir)' : 'Translated Text (editable)'}</label>
            <textarea id="diff-translated-text" class="diff-review-textarea" oninput="updateDiffCharCount()"></textarea>
            <div class="diff-char-count" id="diff-char-count">0 ${currentLang === 'tr' ? 'karakter' : 'chars'}</div>
          </div>

          <div class="diff-submit-row">
            <button type="button" class="diff-cancel-btn" id="diff-cancel-step2-btn" onclick="cancelDifferentiate()">${currentLang === 'tr' ? 'İptal' : 'Cancel'}</button>
            <button type="button" class="diff-submit-btn" id="diff-approve-btn" onclick="approveTranslation()">✅ ${currentLang === 'tr' ? 'Onayla ve Prompt Üret' : 'Approve & Generate Prompts'}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Settings Modal (d-note inspired: sidebar tabs + content panel) -->
    <div class="app-modal modal-w-std" id="settingsModal">
      <div class="modal-header">
        <div class="modal-title">
          <div class="modal-title-icon">⚙️</div>
          ${t.settingsTitle}
        </div>
        <button class="modal-close" onclick="closeModal('settingsModal')">×</button>
      </div>
      <div class="modal-body" style="padding: 0;">
        <div class="settings-layout">
          <!-- Sol navigasyon -->
          <div class="settings-sidebar">
            <button class="settings-nav-item active" data-target="settings-appearance" onclick="switchSettingsTab(this)">
              <span class="settings-nav-icon">🎨</span>
              <span>${t.settingsAppearanceTab}</span>
            </button>
            <button class="settings-nav-item" data-target="settings-language" onclick="switchSettingsTab(this)">
              <span class="settings-nav-icon">🌐</span>
              <span>${t.settingsLanguageTab}</span>
            </button>
            <button class="settings-nav-item" data-target="settings-account" onclick="switchSettingsTab(this)">
              <span class="settings-nav-icon">👤</span>
              <span>${t.settingsAccountTab}</span>
            </button>
            <button class="settings-nav-item" data-target="settings-production" onclick="switchSettingsTab(this)">
              <span class="settings-nav-icon">🎬</span>
              <span>${currentLang === 'tr' ? 'Üretim' : 'Production'}</span>
            </button>
          </div>

          <!-- Sağ içerik -->
          <div class="settings-content">
            <!-- Appearance Tab -->
            <div class="tab-content active" id="settings-appearance">
              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${t.colorTheme}</h3>
                  <p>${currentLang === 'tr' ? 'Premium renk temalarından birini seçin' : 'Pick a premium color theme'}</p>
                </div>
                <div class="premium-theme-grid" id="themeGrid">
                  <!-- Default -->
                  <button type="button" class="premium-theme-card ${currentTheme === 'default' ? 'active' : ''}" data-theme="default" onclick="selectThemeCard(this)">
                    <div class="theme-preview" style="background: hsl(220 10% 96%); border-color: hsl(220 10% 88%);">
                      <div class="theme-stripe" style="background: hsl(220 10% 94%);"></div>
                      <div class="theme-dot" style="background: hsl(220 80% 50%); box-shadow: 0 0 8px hsla(220, 80%, 50%, 0.5);"></div>
                    </div>
                    <div class="theme-card-name">${currentLang === 'tr' ? 'Standart' : 'Standard'}</div>
                    <div class="theme-card-meta">STD</div>
                  </button>
                  <!-- Nebula -->
                  <button type="button" class="premium-theme-card ${currentTheme === 'nebula' ? 'active' : ''}" data-theme="nebula" onclick="selectThemeCard(this)">
                    <div class="theme-preview" style="background: hsl(250 34% 10%); border-color: hsl(250 34% 20%);">
                      <div class="theme-stripe" style="background: hsl(250 34% 18%);"></div>
                      <div class="theme-dot" style="background: hsl(263 90% 70%); box-shadow: 0 0 10px hsla(263, 90%, 70%, 0.6);"></div>
                    </div>
                    <div class="theme-card-name">Nebula</div>
                    <div class="theme-card-meta">NBL</div>
                  </button>
                  <!-- Forest -->
                  <button type="button" class="premium-theme-card ${currentTheme === 'forest' ? 'active' : ''}" data-theme="forest" onclick="selectThemeCard(this)">
                    <div class="theme-preview" style="background: hsl(150 20% 8%); border-color: hsl(150 20% 18%);">
                      <div class="theme-stripe" style="background: hsl(150 20% 15%);"></div>
                      <div class="theme-dot" style="background: hsl(142 70% 45%); box-shadow: 0 0 10px hsla(142, 70%, 45%, 0.6);"></div>
                    </div>
                    <div class="theme-card-name">Forest</div>
                    <div class="theme-card-meta">FOR</div>
                  </button>
                  <!-- Corporate Red -->
                  <button type="button" class="premium-theme-card ${currentTheme === 'corporate' ? 'active' : ''}" data-theme="corporate" onclick="selectThemeCard(this)">
                    <div class="theme-preview" style="background: hsl(0 0% 8%); border-color: hsl(0 0% 18%);">
                      <div class="theme-stripe" style="background: hsl(0 0% 15%);"></div>
                      <div class="theme-dot" style="background: hsl(0 84% 50%); box-shadow: 0 0 10px hsla(0, 84%, 50%, 0.6);"></div>
                    </div>
                    <div class="theme-card-name">Corporate</div>
                    <div class="theme-card-meta">COR</div>
                  </button>
                  <!-- Midnight Gold -->
                  <button type="button" class="premium-theme-card ${currentTheme === 'midnight' ? 'active' : ''}" data-theme="midnight" onclick="selectThemeCard(this)">
                    <div class="theme-preview" style="background: hsl(220 40% 6%); border-color: hsl(220 40% 15%);">
                      <div class="theme-stripe" style="background: hsl(220 40% 12%);"></div>
                      <div class="theme-dot" style="background: hsl(45 100% 50%); box-shadow: 0 0 10px hsla(45, 100%, 50%, 0.7);"></div>
                    </div>
                    <div class="theme-card-name">Midnight</div>
                    <div class="theme-card-meta">MID</div>
                  </button>
                  <!-- Sunset -->
                  <button type="button" class="premium-theme-card ${currentTheme === 'sunset' ? 'active' : ''}" data-theme="sunset" onclick="selectThemeCard(this)">
                    <div class="theme-preview" style="background: hsl(10 40% 8%); border-color: hsl(10 40% 20%);">
                      <div class="theme-stripe" style="background: hsl(10 40% 15%);"></div>
                      <div class="theme-dot" style="background: hsl(12 90% 60%); box-shadow: 0 0 10px hsla(12, 90%, 60%, 0.6);"></div>
                    </div>
                    <div class="theme-card-name">Sunset</div>
                    <div class="theme-card-meta">SUN</div>
                  </button>
                  <!-- Ocean -->
                  <button type="button" class="premium-theme-card ${currentTheme === 'ocean' ? 'active' : ''}" data-theme="ocean" onclick="selectThemeCard(this)">
                    <div class="theme-preview" style="background: hsl(200 40% 7%); border-color: hsl(200 40% 20%);">
                      <div class="theme-stripe" style="background: hsl(200 40% 15%);"></div>
                      <div class="theme-dot" style="background: hsl(190 90% 60%); box-shadow: 0 0 10px hsla(190, 90%, 60%, 0.6);"></div>
                    </div>
                    <div class="theme-card-name">Ocean</div>
                    <div class="theme-card-meta">OCN</div>
                  </button>
                  <!-- Cyberpunk -->
                  <button type="button" class="premium-theme-card ${currentTheme === 'cyberpunk' ? 'active' : ''}" data-theme="cyberpunk" onclick="selectThemeCard(this)">
                    <div class="theme-preview" style="background: hsl(290 50% 5%); border-color: hsl(320 100% 30%);">
                      <div class="theme-stripe" style="background: hsl(290 50% 15%);"></div>
                      <div class="theme-dot" style="background: hsl(320 100% 50%); box-shadow: 0 0 12px hsla(320, 100%, 50%, 0.7);"></div>
                    </div>
                    <div class="theme-card-name">Cyberpunk</div>
                    <div class="theme-card-meta">CYB</div>
                  </button>
                  <!-- Matrix (dark only) -->
                  <button type="button" class="premium-theme-card ${currentTheme === 'matrix' ? 'active' : ''}" data-theme="matrix" data-dark-only="true" onclick="selectThemeCard(this)">
                    <div class="theme-preview" style="background: hsl(120 100% 2%); border-color: hsl(120 60% 15%);">
                      <div class="theme-stripe" style="background: hsl(120 60% 8%);"></div>
                      <div class="theme-dot" style="background: hsl(120 100% 50%); box-shadow: 0 0 12px hsla(120, 100%, 50%, 0.8);"></div>
                    </div>
                    <div class="theme-card-name">Matrix</div>
                    <div class="theme-card-meta">MTX · ${currentLang === 'tr' ? 'sadece koyu' : 'dark only'}</div>
                  </button>
                </div>
              </div>

              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${t.lightDarkMode}</h3>
                  <p>${currentLang === 'tr' ? 'Açık ve koyu mod arasında geçiş yapın' : 'Switch between light and dark mode'}</p>
                </div>
                <div class="mode-toggle-group">
                  <button class="lang-btn" id="btn-light" onclick="setThemeMode('light')" style="flex:1;">
                    ☀️ ${t.light}
                  </button>
                  <button class="lang-btn" id="btn-dark" onclick="setThemeMode('dark')" style="flex:1;">
                    🌙 ${t.dark}
                  </button>
                </div>
              </div>

              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${currentLang === 'tr' ? 'Tema Geçişi' : 'Theme Transition'}</h3>
                  <p>${currentLang === 'tr' ? 'Tema değişiminde yumuşak geçiş animasyonu' : 'Smooth transition animation when changing themes'}</p>
                </div>
                <label class="settings-toggle">
                  <input type="checkbox" id="setting_theme_anim" onchange="toggleThemeAnim(this.checked)">
                  <span class="settings-toggle-slider"></span>
                  <span class="settings-toggle-label">${currentLang === 'tr' ? 'Animasyonları etkinleştir' : 'Enable animations'}</span>
                </label>
              </div>
            </div>

            <!-- Language Tab -->
            <div class="tab-content" id="settings-language">
              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${t.chooseLanguage}</h3>
                  <p>${currentLang === 'tr' ? 'Arayüz için tercih ettiğiniz dili seçin' : 'Choose your preferred interface language'}</p>
                </div>
                <div class="language-grid">
                  <button class="language-card ${currentLang === 'tr' ? 'active' : ''}" onclick="setLanguage('tr')">
                    <div class="language-flag">🇹🇷</div>
                    <div class="language-info">
                      <div class="language-name">Türkçe</div>
                      <div class="language-native">${currentLang === 'tr' ? 'Türkçe arayüz' : 'Turkish interface'}</div>
                    </div>
                    <div class="language-check">${currentLang === 'tr' ? '✓' : ''}</div>
                  </button>
                  <button class="language-card ${currentLang === 'en' ? 'active' : ''}" onclick="setLanguage('en')">
                    <div class="language-flag">🇬🇧</div>
                    <div class="language-info">
                      <div class="language-name">English</div>
                      <div class="language-native">${currentLang === 'tr' ? 'İngilizce arayüz' : 'English interface'}</div>
                    </div>
                    <div class="language-check">${currentLang === 'en' ? '✓' : ''}</div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Account Tab -->
            <div class="tab-content" id="settings-account">
              <div class="account-header">
                <div class="account-avatar">
                  ${user?.username?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <div class="account-name">${user?.username || 'admin'}</div>
                  <div class="account-role">AI PUBLISHER STUDIO</div>
                </div>
              </div>

              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${t.personalAvatar}</h3>
                  <p>${currentLang === 'tr' ? 'Profil avatarınızı yükleyin (PNG, JPG)' : 'Upload your profile avatar (PNG, JPG)'}</p>
                </div>
                <input type="file" class="form-input" id="setting_avatar_file" accept="image/*" onchange="encodeImageFileAsURL(this, 'avatar')" style="margin-bottom:0.35rem;">
                <input type="hidden" id="setting_avatar_base64">
                <div id="avatar_preview"></div>
              </div>
            </div>

            <!-- Production Tab -->
            <div class="tab-content" id="settings-production">
              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${t.textGridPosition}</h3>
                  <p>${currentLang === 'tr' ? 'Videolardaki metin yerleşim ızgarası' : 'Text positioning grid on videos'}</p>
                </div>
                <select class="form-select" id="setting_grid">
                  <option value="top-left">${t.topLeft}</option>
                  <option value="top-right">${t.topRight}</option>
                  <option value="center">${t.center}</option>
                  <option value="bottom-left">${t.bottomLeft}</option>
                  <option value="bottom-right">${t.bottomRight}</option>
                </select>
              </div>

              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${t.narratorTone}</h3>
                  <p>${currentLang === 'tr' ? 'Varsayılan anlatıcı tonu' : 'Default narrator tone'}</p>
                </div>
                <input type="text" class="form-input" id="setting_tone" placeholder="${t.defaultNarratorPlaceholder}" style="margin-bottom:0;">
              </div>

              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>YouTube API Key</h3>
                  <p>${currentLang === 'tr' ? 'YouTube yükleme için API anahtarı' : 'API key for YouTube uploads'}</p>
                </div>
                <input type="text" class="form-input font-mono" id="setting_yt_key" placeholder="AIzaSy..." style="margin-bottom:0; font-size:0.8rem;">
              </div>

              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${currentLang === 'tr' ? 'Wav2Lip Dudak Senkronizasyonu' : 'Wav2Lip Lip-Sync'}</h3>
                  <p>${currentLang === 'tr' ? 'Gerçek dudak senkronizasyonu (Wav2Lip). Sahnede yüz bulunamazsa orijinal video kullanılır.' : 'Real lip-sync via Wav2Lip. Falls back to original video when no face is detected.'}</p>
                </div>
                <label class="settings-toggle">
                  <input type="checkbox" id="setting_apply_lipsync" checked>
                  <span class="settings-toggle-slider"></span>
                  <span class="settings-toggle-label">${currentLang === 'tr' ? 'Lip-sync aktif' : 'Enable lip-sync'}</span>
                </label>
              </div>

              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${currentLang === 'tr' ? 'Bitiş Ekranı (End Screen)' : 'End Screen Overlay'}</h3>
                  <p>${currentLang === 'tr' ? 'Videonun son 5 saniyesine avatar + "Sonraki Videoyu İzleyin" bindirmesi ekler. Üretim süresini uzatır.' : 'Adds avatar + "Watch Next Video" overlay to the last 5 seconds. Adds processing time.'}</p>
                </div>
                <label class="settings-toggle">
                  <input type="checkbox" id="setting_apply_end_screen" checked>
                  <span class="settings-toggle-slider"></span>
                  <span class="settings-toggle-label">${currentLang === 'tr' ? 'End screen aktif' : 'Enable end screen'}</span>
                </label>
              </div>

              <button onclick="saveSettings()" class="btn-primary mt-2">${t.saveSettings}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Help Modal -->
    <div class="app-modal modal-w-sm" id="helpModal">
      <div class="modal-header">
        <div class="modal-title">
          <div class="modal-title-icon">❓</div>
          ${t.helpTitle}
        </div>
        <button class="modal-close" onclick="closeModal('helpModal')">×</button>
      </div>
      <div class="modal-body">
        <div class="help-search">
          <span class="help-search-icon">🔍</span>
          <input type="search" id="helpSearch" placeholder="${t.helpSearchPlaceholder}" oninput="filterHelp()">
        </div>
        <div class="help-topics" id="helpTopics">
          ${HELP_PAGES_DATA.map(p => `
            <button class="help-topic-btn" data-id="${p.id}" onclick="showHelpTopic('${p.id}')">
              <span></span> ${currentLang === 'tr' ? p.titleTr : p.titleEn}
            </button>
          `).join('')}
        </div>
        <div class="help-content" id="helpContent"></div>
        <div style="margin-top:1rem; padding-top:0.875rem; border-top:1px solid hsla(var(--border),0.3); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-family:'JetBrains Mono',monospace; font-size:0.6rem; color:hsl(var(--muted-foreground)); letter-spacing:0.06em;">
            ${t.shortcutHintText}
          </span>
          <button class="btn-publish" onclick="closeModal('helpModal')" style="width:auto; padding:0.4rem 0.875rem;">
            ${t.close}
          </button>
        </div>
      </div>
    </div>

    <!-- App Shell -->
    <div class="app-shell">
      <!-- Header -->
      <header class="app-header">
        <div class="header-brand">
          <div class="brand-icon">AP</div>
          <div class="brand-text">
            <span class="brand-name">AI <span>Publisher</span></span>
            <span class="brand-sub">${t.brandSubtitle}</span>
          </div>
        </div>
        <div class="header-actions">
          <!-- Colab status badge (S3) -->
          <div class="colab-status-wrap" id="colabStatusWrap">
            <button class="colab-badge colab-stopped" id="colabBadge" onclick="toggleColabPopover(event)" title="Colab GPU">
              <span class="colab-dot" id="colabDot"></span>
              <span class="colab-label" id="colabLabel">Colab</span>
            </button>
            <div class="colab-popover" id="colabPopover" style="display:none;">
              <div class="colab-popover-header">
                <strong>${currentLang === 'tr' ? 'Colab GPU Durumu' : 'Colab GPU Status'}</strong>
                <button class="colab-popover-close" onclick="closeColabPopover()">×</button>
              </div>
              <div class="colab-popover-body" id="colabPopoverBody">
                <div class="colab-status-row"><span>${currentLang === 'tr' ? 'Durum' : 'Status'}:</span><b id="colabPopStatus">—</b></div>
                <div class="colab-status-row"><span>URL:</span><b id="colabPopUrl" style="font-size:0.7rem; word-break:break-all;">—</b></div>
                <div class="colab-status-row"><span>${currentLang === 'tr' ? 'GPU Bellek' : 'GPU Memory'}:</span><b id="colabPopGpu">—</b></div>
                <div class="colab-status-row"><span>${currentLang === 'tr' ? 'Çalışma Süresi' : 'Uptime'}:</span><b id="colabPopUptime">—</b></div>
                <div class="colab-status-row" id="colabPopErrRow" style="display:none;"><span>${currentLang === 'tr' ? 'Hata' : 'Error'}:</span><b id="colabPopErr" style="color: hsl(0,70%,60%); font-size:0.7rem;">—</b></div>
                <div class="colab-popover-actions">
                  <button class="colab-action-btn colab-action-start" onclick="manualColabStart()">▶ ${currentLang === 'tr' ? 'Başlat' : 'Start'}</button>
                  <button class="colab-action-btn colab-action-stop" onclick="manualColabStop()">⏹ ${currentLang === 'tr' ? 'Durdur' : 'Stop'}</button>
                </div>
              </div>
            </div>
          </div>
          <div class="header-divider"></div>
          <button class="icon-btn" onclick="openModal('opportunityModal')" title="${t.oppTitle}">
            <span class="icon-btn-label">🔥</span>
          </button>
          <button class="icon-btn" onclick="openModal('settingsModal')" title="${t.settingsTitle}">
            <span class="icon-btn-label">⚙️</span>
          </button>
          <button class="icon-btn" onclick="openModal('helpModal')" title="${t.helpTitle}">
            <span class="icon-btn-label">?</span>
          </button>
          <div class="header-divider"></div>
          <a href="/logout" class="btn-logout">${t.logout}</a>
        </div>
      </header>

      <!-- Main -->
      <main class="app-main">
        <!-- Left: New Project Form -->
        <div class="animate-in">
          <form action="/create-job" method="POST" enctype="multipart/form-data" class="glass-card" style="margin-bottom: 1.5rem;">
            <div class="section-header">
              <span class="section-title"><span class="section-title-dot"></span>${t.newProject}</span>
            </div>
            <div class="form-stack">
              <div>
                <label class="form-label">${t.masterPrompt}</label>
                <textarea name="master_prompt" class="form-textarea" rows="3" required placeholder="${t.masterPromptPlaceholder}"></textarea>
              </div>
              <div>
                <label class="form-label">${t.productionNotes}</label>
                <textarea name="production_notes" class="form-textarea" rows="2" placeholder="${t.productionNotesPlaceholder}"></textarea>
              </div>
              <div class="form-grid-2">
                <div>
                  <label class="form-label">${t.characterFeatures}</label>
                  <textarea name="character_features" class="form-textarea" rows="2" placeholder="${t.characterFeaturesPlaceholder}" style="min-height:60px;"></textarea>
                </div>
                <div>
                  <label class="form-label">${t.refImage}</label>
                  <input type="file" name="material" class="form-input" accept="image/*" style="padding: 0.5rem;">
                </div>
              </div>
              <div>
                <label class="form-label">${t.playlistTarget}</label>
                <input type="text" name="playlist_id" class="form-input" placeholder="${t.playlistTargetPlaceholder}">
              </div>
              <div>
                <label class="form-label">${t.videoOptions}</label>
                <div class="checkbox-grid">
                  <label class="checkbox-item">
                    <input type="checkbox" name="has_shorts" value="1" checked>
                    ${t.hasShorts}
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="has_subtitles" value="1" checked>
                    ${t.hasSubtitles}
                  </label>
                </div>
              </div>
              <div>
                <label class="form-label">${t.publishPlatforms}</label>
                <div class="checkbox-grid">
                  <label class="checkbox-item"><input type="checkbox" name="platforms" value="youtube" checked> 📺 YouTube</label>
                  <label class="checkbox-item"><input type="checkbox" name="platforms" value="tiktok" checked> 🎵 TikTok</label>
                  <label class="checkbox-item"><input type="checkbox" name="platforms" value="x"> 𝕏 X</label>
                  <label class="checkbox-item"><input type="checkbox" name="platforms" value="meta"> 📘 Meta</label>
                </div>
              </div>
              <button type="submit" class="btn-primary">
                ▶ ${t.addToQueue}
              </button>
            </div>
          </form>
        </div>

        <!-- Right: Job Gallery -->
        <div>
          <!-- Active Queue -->
          <div class="glass-card animate-in animate-delay-1" style="margin-bottom: 1.5rem;">
            <div class="section-header">
              <span class="section-title"><span class="section-title-dot"></span>${t.studioQueue}</span>
              <span class="font-mono" style="font-size:0.65rem; color:hsl(var(--muted-foreground));">${queueJobs.length} ${t.jobsLabel}</span>
            </div>
            <div class="queue-scroll-container">
              ${queueCardsHTML.length > 0 ? queueCardsHTML : `<div class="empty-state"><div class="empty-state-icon">📭</div>${t.noActiveJobs}</div>`}
            </div>
          </div>

          <!-- Completed Projects -->
          <div class="glass-card animate-in animate-delay-2">
            <div class="section-header">
              <span class="section-title"><span class="section-title-dot"></span>${t.completedProjects}</span>
              <span class="font-mono" style="font-size:0.65rem; color:hsl(var(--muted-foreground));">${completedJobs.length} ${t.projectsLabel}</span>
            </div>
            <div id="completed-list">
              ${completedCardsHTML.length > 0 ? completedCardsHTML : `<div class="empty-state"><div class="empty-state-icon">🎬</div>${t.noCompletedJobs}</div>`}
            </div>
          </div>
        </div>
      </main>
    </div>

    <script>
      const trMsg = (tr, en) => '${currentLang}' === 'tr' ? tr : en;

      function fillJobForm(data) {
        document.querySelector('textarea[name="master_prompt"]').value = data.masterPrompt || '';
        document.querySelector('textarea[name="production_notes"]').value = data.productionNotes || '';
        document.querySelector('textarea[name="character_features"]').value = data.characterFeatures || '';
        document.querySelector('input[name="playlist_id"]').value = data.playlistId || '';

        document.querySelector('input[name="has_shorts"]').checked = !!data.hasShorts;
        document.querySelector('input[name="has_subtitles"]').checked = !!data.hasSubtitles;

        const platforms = data.platforms || [];
        document.querySelectorAll('input[name="platforms"]').forEach(cb => {
          cb.checked = platforms.includes(cb.value);
        });

        // Materyal (referans görsel) önizlemesi — yeni dosya yüklenmemişse sadece bilgi göster
        const matInput = document.querySelector('input[name="material"]');
        const matInfoId = 'material-retry-info';
        let matInfo = document.getElementById(matInfoId);
        if (matInfo) matInfo.remove();
        if (data.materialPath) {
          matInfo = document.createElement('div');
          matInfo.id = matInfoId;
          matInfo.style.cssText = 'margin-top:0.4rem; padding:0.5rem 0.75rem; background:hsla(var(--primary),0.08); border:1px solid hsla(var(--primary),0.2); border-radius:0.5rem; font-size:0.72rem; color:hsl(var(--muted-foreground)); display:flex; align-items:center; gap:0.5rem;';
          const matLabel = trMsg('Önceki materyal', 'Previous material');
          const matName = String(data.materialPath).split('/').pop();
          matInfo.innerHTML = '📎 <span style="flex:1;">' + matLabel + ': <code>' + matName + '</code></span><button type="button" onclick="this.parentElement.remove()" style="background:transparent;border:none;color:hsl(var(--muted-foreground));cursor:pointer;font-size:1rem;line-height:1;">×</button>';
          if (matInput && matInput.parentElement) matInput.parentElement.appendChild(matInfo);
        }

        // Scroll to form smoothly
        document.querySelector('form[action="/create-job"]').scrollIntoView({ behavior: 'smooth' });
        showToast(trMsg('Promptlar forma yazıldı!', 'Prompts filled in form!'), 'success');
      }

      // ==========================================
      // MODAL MANAGEMENT
      // ==========================================
      function openModal(id) {
        document.getElementById('modalBackdrop').style.display = 'block';
        document.getElementById(id).style.display = 'block';
        if (id === 'settingsModal') loadSettings();
        if (id === 'opportunityModal') openOppStep1();
      }
      function closeModal(id) {
        document.getElementById(id).style.display = 'none';
        const openModals = Array.from(document.querySelectorAll('.app-modal')).filter(m => m.style.display === 'block');
        if (openModals.length === 0) document.getElementById('modalBackdrop').style.display = 'none';
      }
      function closeAllModals() {
        document.querySelectorAll('.app-modal').forEach(m => m.style.display = 'none');
        document.getElementById('modalBackdrop').style.display = 'none';
      }

      // ==========================================
      // SETTINGS MODAL — TABS (d-note sidebar style)
      // ==========================================
      function switchSettingsTab(el) {
        const target = el.getAttribute('data-target');
        document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        const targetEl = document.getElementById(target);
        if (targetEl) {
          targetEl.classList.add('active');
          // Re-trigger animation
          targetEl.style.animation = 'none';
          setTimeout(() => targetEl.style.animation = '', 10);
        }
      }

      // Backward compatibility for old inline onclick="switchTab(...)"
      function switchTab(tabId) {
        const el = document.querySelector(\`[data-target="\${tabId}"]\`);
        if (el) switchSettingsTab(el);
      }

      // ==========================================
      // THEME & MODE SWITCHING
      // ==========================================
      function setThemeMode(mode) {
        const html = document.documentElement;
        if (mode === 'dark') html.classList.add('dark');
        else html.classList.remove('dark');
        document.getElementById('btn-light').classList.toggle('active', mode === 'light');
        document.getElementById('btn-dark').classList.toggle('active', mode === 'dark');
        saveSettingsExtra({ theme_mode: mode });
      }

      // ==========================================
      // PREMIUM THEME CARD SELECTION
      // ==========================================
      function selectThemeCard(el) {
        const theme = el.getAttribute('data-theme');
        const darkOnly = el.getAttribute('data-dark-only') === 'true';
        // Update active state
        document.querySelectorAll('.premium-theme-card').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        // Apply theme classes
        const html = document.documentElement;
        const allThemes = ['nebula','forest','corporate','midnight','sunset','ocean','cyberpunk','matrix'];
        allThemes.forEach(t => html.classList.remove('theme-' + t));
        if (theme !== 'default') html.classList.add('theme-' + theme);
        // Force dark mode for dark-only themes
        if (darkOnly && !html.classList.contains('dark')) {
          html.classList.add('dark');
          document.getElementById('btn-light').classList.remove('active');
          document.getElementById('btn-dark').classList.add('active');
        }
        saveSettingsExtra({ selected_theme: theme, theme_mode: darkOnly ? 'dark' : (html.classList.contains('dark') ? 'dark' : 'light') });
        // Animate the preview briefly
        const preview = el.querySelector('.theme-preview');
        if (preview) {
          preview.style.transform = 'scale(1.06)';
          setTimeout(() => preview.style.transform = '', 220);
        }
      }

      // Theme transition animation toggle
      function toggleThemeAnim(enabled) {
        document.documentElement.style.setProperty('--transition-speed', enabled ? '0.35s' : '0s');
        localStorage.setItem('theme-anim', enabled ? '1' : '0');
      }

      // Theme transition preference (restore from localStorage)
      try {
        const anim = localStorage.getItem('theme-anim');
        if (anim !== null) {
          document.documentElement.style.setProperty('--transition-speed', anim === '1' ? '0.35s' : '0s');
          const cb = document.getElementById('setting_theme_anim');
          if (cb) cb.checked = anim === '1';
        }
      } catch {}

      function saveSettingsExtra(data) {
        fetch('/save-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }

      // ==========================================
      // LANGUAGE SWITCHING
      // ==========================================
      function setLanguage(lang) {
        fetch('/save-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferred_language: lang })
        }).then(() => window.location.reload());
      }

      // ==========================================
      // HELP MODAL
      // ==========================================
      const helpData = ${JSON.stringify(HELP_PAGES_DATA)};
      function showHelpTopic(id) {
        document.querySelectorAll('.help-topic-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(\`[data-id="\${id}"]\`).classList.add('active');
        const topic = helpData.find(h => h.id === id);
        if (!topic) return;
        const isTr = '${currentLang}' === 'tr';
        document.getElementById('helpContent').innerHTML = \`
          <div class="help-section">
            <h4>\${isTr ? topic.titleTr : topic.titleEn}</h4>
            \${isTr ? topic.contentTr : topic.contentEn}
          </div>\`;
      }
      function filterHelp() {
        const q = document.getElementById('helpSearch').value.toLowerCase();
        document.querySelectorAll('.help-topic-btn').forEach(btn => {
          const name = btn.textContent.toLowerCase();
          btn.style.display = name.includes(q) ? 'flex' : 'none';
        });
      }

      // ==========================================
      // OPPORTUNITY FUNNEL (Sprint 2 — real YouTube API, no mocks)
      // ==========================================
      let oppInterests = [];
      let oppHoverTimer = null;

      function openOppStep1() {
        document.getElementById('opp-step-1').style.display = 'block';
        document.getElementById('opp-step-2').style.display = 'none';
        renderInterestChips();
        updateSearchButton();
      }

      function openOppStep2() {
        document.getElementById('opp-step-1').style.display = 'none';
        document.getElementById('opp-step-2').style.display = 'block';
      }

      function oppInputKey(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          oppAddFromInput();
        }
      }

      function oppAddFromInput() {
        const inp = document.getElementById('opp-interest-input');
        if (!inp) return;
        addInterest(inp.value);
        inp.value = '';
        inp.focus();
      }

      function addInterest(text) {
        text = (text || '').trim();
        if (!text) return;
        const lower = text.toLowerCase();
        if (oppInterests.map(t => t.toLowerCase()).includes(lower)) return;
        if (oppInterests.length >= 5) {
          showToast(trMsg('En fazla 5 ilgi alanı seçebilirsiniz', 'You can pick up to 5 interests'), 'error');
          return;
        }
        oppInterests.push(text);
        renderInterestChips();
        updateSearchButton();
      }

      function removeInterest(text) {
        oppInterests = oppInterests.filter(t => t !== text);
        renderInterestChips();
        updateSearchButton();
      }

      function renderInterestChips() {
        const container = document.getElementById('opp-chips-container');
        if (!container) return;
        if (oppInterests.length === 0) {
          container.innerHTML = '<span class="opp-chips-empty">' + trMsg('Henüz seçim yok.', 'No tags yet.') + '</span>';
          return;
        }
        container.innerHTML = oppInterests.map(t => {
          const safe = escapeHTML(t);
          return '<span class="opp-chip">' + safe +
            '<button type="button" data-remove="' + safe + '" title="' + trMsg('Kaldır', 'Remove') + '">×</button></span>';
        }).join('');
        container.querySelectorAll('button[data-remove]').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = Array.from(container.querySelectorAll('button[data-remove]')).indexOf(btn);
            if (idx >= 0) {
              oppInterests.splice(idx, 1);
              renderInterestChips();
              updateSearchButton();
            }
          });
        });
      }

      function updateSearchButton() {
        const btn = document.getElementById('opp-search-btn');
        if (!btn) return;
        btn.disabled = oppInterests.length === 0;
      }

      function buildSkeletonCards(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
          html += '<div class="opp-skeleton">' +
            '<div class="opp-skeleton-block opp-skel-thumb"></div>' +
            '<div class="opp-skeleton-block opp-skel-line"></div>' +
            '<div class="opp-skeleton-block opp-skel-line short"></div>' +
            '<div class="opp-skeleton-block opp-skel-line short"></div>' +
            '</div>';
        }
        return html;
      }

      function fmtCount(n) {
        n = Number(n) || 0;
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\\.0$/, '') + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\\.0$/, '') + 'K';
        return String(n);
      }

      function scoreClassFor(score) {
        if (score > 10) return 'opp-score-high';
        if (score >= 5) return 'opp-score-med';
        if (score >= 2) return 'opp-score-low';
        return 'opp-score-none';
      }

      function escapeHTML(s) {
        return String(s == null ? '' : s)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      }

      function rerunOpportunitySearch() {
        const inp = document.getElementById('opp-results-search');
        if (inp && inp.value.trim()) {
          oppInterests = inp.value.trim().split(/\\s+/).filter(Boolean).slice(0, 5);
        }
        searchOpportunities();
      }

      function oppResultsSearchKey(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          rerunOpportunitySearch();
        }
      }

      async function searchOpportunities() {
        if (oppInterests.length === 0) return;
        const q = oppInterests.join(' ');
        const langs = getSelectedLangs();
        if (langs.length === 0) {
          showToast(trMsg('En az 1 dil seçin', 'Pick at least 1 language'), 'error');
          return;
        }

        openOppStep2();
        const inp = document.getElementById('opp-results-search');
        if (inp) inp.value = q;

        const meta = document.getElementById('opp-results-meta');
        const list = document.getElementById('opp-list');
        if (meta) meta.textContent = trMsg('Aranıyor: ', 'Searching: ') + q + ' (' + langs.join(', ') + ')';
        if (list) list.innerHTML = buildSkeletonCards(5);

        try {
          const res = await fetch('/opportunity-videos?q=' + encodeURIComponent(q) + '&lang=' + encodeURIComponent(langs.join(',')));
          const data = await res.json();

          if (!data.success) {
            if (data.error === 'NO_API_KEY') {
              if (list) list.innerHTML =
                '<div class="opp-empty-state">' +
                  '<div class="opp-empty-icon">🔑</div>' +
                  '<div class="opp-empty-title">' + trMsg('YouTube API anahtarı yok', 'No YouTube API key') + '</div>' +
                  '<div class="opp-empty-sub">' + trMsg('Fırsatları çekebilmek için Ayarlar > Hesap Bilgileri altına YouTube Data API v3 anahtarınızı ekleyin.', 'Add your YouTube Data API v3 key under Settings > Account to fetch opportunities.') + '</div>' +
                  '<button type="button" class="opp-empty-link" onclick="closeModal(\\'opportunityModal\\'); openModal(\\'settingsModal\\');">⚙️ ' + trMsg('Ayarları Aç', 'Open Settings') + '</button>' +
                '</div>';
              if (meta) meta.textContent = '';
              return;
            }
            const errMsg = escapeHTML(data.message || data.error || 'unknown');
            if (list) list.innerHTML =
              '<div class="opp-error-state">' +
                '<div><strong>⚠️ ' + trMsg('YouTube API hatası', 'YouTube API error') + '</strong><br><small>' + errMsg + '</small></div>' +
                '<button type="button" onclick="searchOpportunities()">🔄 ' + trMsg('Tekrar Dene', 'Retry') + '</button>' +
              '</div>';
            if (meta) meta.textContent = '';
            return;
          }

          const videos = Array.isArray(data.videos) ? data.videos : [];
          if (videos.length === 0) {
            if (list) list.innerHTML =
              '<div class="opp-empty-state">' +
                '<div class="opp-empty-icon">🔍</div>' +
                '<div class="opp-empty-title">' + trMsg('Sonuç bulunamadı', 'No results found') + '</div>' +
                '<div class="opp-empty-sub">' + trMsg('Farklı anahtar kelimeler deneyin.', 'Try different keywords.') + '</div>' +
              '</div>';
            if (meta) meta.textContent = '';
            return;
          }

          if (meta) meta.textContent = videos.length + ' ' + trMsg('video bulundu · skora göre sıralı', 'videos found · sorted by score') + ' · "' + q + '"';

          if (list) list.innerHTML = videos.map((v, idx) => {
            const cls = scoreClassFor(v.score);
            const safeTitle = escapeHTML(v.title);
            const safeChannel = escapeHTML(v.channelTitle);
            const safeDesc = escapeHTML(v.description || '');
            const safeThumb = escapeHTML(v.thumbnail);
            const safeVid = escapeHTML(v.videoId);
            const ytUrl = 'https://www.youtube.com/watch?v=' + encodeURIComponent(v.videoId);
            return '<div class="opp-video-card" data-vid="' + safeVid + '" ' +
                'onmouseenter="oppShowPreview(event, ' + idx + ')" ' +
                'onmouseleave="oppHidePreview()" ' +
                'onmousemove="oppMovePreview(event)">' +
              '<div class="opp-card-thumb"><img loading="lazy" src="' + safeThumb + '" alt=""></div>' +
              '<div class="opp-card-title-2">' + safeTitle + '</div>' +
              '<div class="opp-card-channel">' +
                '<span>📺</span><span class="opp-card-channel-name" title="' + safeChannel + '">' + safeChannel + '</span>' +
                '<span>·</span><span>' + fmtCount(v.subscribers) + ' ' + trMsg('abone', 'subs') + '</span>' +
              '</div>' +
              '<div class="opp-card-stats">' +
                '<span>👁 ' + fmtCount(v.views) + '</span>' +
                '<span>👍 ' + fmtCount(v.likes) + '</span>' +
              '</div>' +
              '<span class="opp-score-badge ' + cls + '">🔥 ' + trMsg('Skor', 'Score') + ': ' + v.score + '</span>' +
              '<button type="button" class="opp-desc-toggle" onclick="oppToggleDesc(this)">▾ ' + trMsg('Açıklama', 'Description') + '</button>' +
              '<div class="opp-desc-body" style="display:none;">' + (safeDesc || '<em>' + trMsg('Açıklama yok', 'No description') + '</em>') + '</div>' +
              '<a class="opp-card-cta" href="' + ytUrl + '" target="_blank" rel="noopener">▶ ' + trMsg('Videoyu İncele', 'Open on YouTube') + '</a>' +
              '<button type="button" class="opp-differentiate-btn" onclick="openDifferentiateModal(window.__oppVideos[' + idx + '])">✨ ' + trMsg('Özgünleştir', 'Differentiate') + '</button>' +
            '</div>';
          }).join('');

          // Cache for hover preview + differentiate click
          window.__oppVideos = videos;
        } catch (err) {
          if (list) list.innerHTML =
            '<div class="opp-error-state">' +
              '<div><strong>⚠️ ' + trMsg('Ağ hatası', 'Network error') + '</strong><br><small>' + escapeHTML(err && err.message ? err.message : String(err)) + '</small></div>' +
              '<button type="button" onclick="searchOpportunities()">🔄 ' + trMsg('Tekrar Dene', 'Retry') + '</button>' +
            '</div>';
          if (meta) meta.textContent = '';
        }
      }

      function oppToggleDesc(btn) {
        const body = btn.nextElementSibling;
        if (!body) return;
        const open = body.style.display === 'block';
        body.style.display = open ? 'none' : 'block';
        btn.textContent = (open ? '▾ ' : '▴ ') + trMsg('Açıklama', 'Description');
      }

      function oppShowPreview(e, idx) {
        if (oppHoverTimer) clearTimeout(oppHoverTimer);
        oppHoverTimer = setTimeout(() => {
          const tip = document.getElementById('opp-hover-preview');
          const v = (window.__oppVideos || [])[idx];
          if (!tip || !v) return;
          tip.innerHTML =
            '<img src="' + escapeHTML(v.thumbnail) + '" alt="">' +
            '<div class="hp-meta">📺 ' + escapeHTML(v.channelTitle) + ' · ' + fmtCount(v.subscribers) + ' ' + trMsg('abone', 'subs') + '</div>' +
            '<div class="hp-title">' + escapeHTML(v.title) + '</div>' +
            '<div class="hp-desc">' + escapeHTML((v.description || '').slice(0, 320)) + '</div>';
          tip.style.display = 'block';
          oppMovePreview(e);
          requestAnimationFrame(() => tip.classList.add('visible'));
        }, 500);
      }

      function oppMovePreview(e) {
        const tip = document.getElementById('opp-hover-preview');
        if (!tip || tip.style.display === 'none') return;
        const pad = 16;
        const w = tip.offsetWidth || 320;
        const h = tip.offsetHeight || 220;
        let x = e.clientX + pad;
        let y = e.clientY + pad;
        if (x + w + pad > window.innerWidth) x = e.clientX - w - pad;
        if (y + h + pad > window.innerHeight) y = e.clientY - h - pad;
        if (x < pad) x = pad;
        if (y < pad) y = pad;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
      }

      function oppHidePreview() {
        if (oppHoverTimer) { clearTimeout(oppHoverTimer); oppHoverTimer = null; }
        const tip = document.getElementById('opp-hover-preview');
        if (!tip) return;
        tip.classList.remove('visible');
        setTimeout(() => { tip.style.display = 'none'; }, 180);
      }

      // ==========================================
      // OPPORTUNITY FUNNEL v2.5 — LANGUAGES + DIFFERENTIATE
      // ==========================================
      const OPP_LANG_OPTIONS = [
        { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'es', name: 'Español', flag: '🇪🇸' }
      ];
      let oppSelectedLangs = ['tr', 'en'];
      let oppDiffTarget = null; // currently selected source video for differentiation
      let oppDiffDuration = 'same';
      let oppDiffSubmitting = false;
      let oppDiffPendingJobId = null; // job id awaiting user approval

      function getSelectedLangs() {
        const out = [];
        const nodes = document.querySelectorAll('#opp-lang-container .opp-lang-chip');
        nodes.forEach((node) => {
          const code = node.getAttribute('data-lang');
          const checked = node.classList.contains('checked');
          if (code && checked) out.push(code);
        });
        return out;
      }

      function toggleOppLang(node) {
        if (!node) return;
        const checkbox = node.querySelector('input');
        const willCheck = !node.classList.contains('checked');
        if (willCheck) {
          node.classList.add('checked');
          if (checkbox) checkbox.checked = true;
        } else {
          // Don't allow unchecking the last language
          if (getSelectedLangs().length <= 1) {
            showToast(trMsg('En az 1 dil seçili olmalı', 'At least 1 language is required'), 'error');
            return;
          }
          node.classList.remove('checked');
          if (checkbox) checkbox.checked = false;
        }
        oppSelectedLangs = getSelectedLangs();
        updateSearchButton();
      }

      function updateSearchButton() {
        const btn = document.getElementById('opp-search-btn');
        if (!btn) return;
        const hasLangs = getSelectedLangs().length > 0;
        const hasInterests = oppInterests.length > 0;
        btn.disabled = !(hasLangs && hasInterests);
      }

      // Override original updateSearchButton to also factor in languages
      // (the original is now wrapped by the function declared below)

      function openDifferentiateModal(video) {
        if (!video || !video.videoId) return;
        oppDiffTarget = video;
        oppDiffDuration = 'same';
        oppDiffSubmitting = false;
        document.getElementById('diff-preview-thumb').src = video.thumbnail || '';
        document.getElementById('diff-preview-title').textContent = video.title || '';
        document.getElementById('diff-preview-channel').textContent = (video.channelTitle || '') + ' · ' + (video.views || 0) + ' views';

        // Build the target-language select using the languages the user picked in step 1
        const sel = document.getElementById('diff-target-lang');
        if (sel) {
          const selectedLangs = getSelectedLangs();
          // If user picked no language (shouldn't happen), fall back to 'tr'
          const langsToOffer = selectedLangs.length > 0 ? selectedLangs : ['tr'];
          const opts = langsToOffer.map((code) => {
            const found = OPP_LANG_OPTIONS.find((o) => o.code === code);
            const label = found ? (found.flag + ' ' + found.name) : code;
            return '<option value="' + escapeHTML(code) + '">' + escapeHTML(label) + '</option>';
          }).join('');
          sel.innerHTML = opts;
          sel.value = langsToOffer[0];
        }

        // Reset radio buttons
        const radios = document.querySelectorAll('#diff-duration-group .diff-radio');
        radios.forEach((r) => {
          if (r.getAttribute('data-mode') === 'same') {
            r.classList.add('checked');
            const ri = r.querySelector('input'); if (ri) ri.checked = true;
          } else {
            r.classList.remove('checked');
            const ri = r.querySelector('input'); if (ri) ri.checked = false;
          }
        });

        // Reset submit button
        const submit = document.getElementById('diff-submit-btn');
        if (submit) {
          submit.disabled = false;
          submit.innerHTML = '✨ ' + trMsg('Çeviriyi Üret', 'Generate Translation');
        }

        // Reset two-step view: show step 1, hide step 2, clear pending job
        const step1 = document.getElementById('diff-step1');
        const step2 = document.getElementById('diff-step2');
        if (step1) step1.style.display = '';
        if (step2) step2.style.display = 'none';
        oppDiffPendingJobId = null;

        openModal('differentiateModal');
      }

      function selectDurationMode(node) {
        if (!node) return;
        const mode = node.getAttribute('data-mode');
        oppDiffDuration = mode || 'same';
        const radios = document.querySelectorAll('#diff-duration-group .diff-radio');
        radios.forEach((r) => {
          if (r === node) {
            r.classList.add('checked');
            const ri = r.querySelector('input'); if (ri) ri.checked = true;
          } else {
            r.classList.remove('checked');
            const ri = r.querySelector('input'); if (ri) ri.checked = false;
          }
        });
      }

      async function submitDifferentiate() {
        if (oppDiffSubmitting) return;
        if (!oppDiffTarget) {
          showToast(trMsg('Önce bir video seçin', 'Pick a video first'), 'error');
          return;
        }
        const targetLang = document.getElementById('diff-target-lang').value;
        if (!targetLang) {
          showToast(trMsg('Hedef dil seçin', 'Pick a target language'), 'error');
          return;
        }
        const submit = document.getElementById('diff-submit-btn');
        oppDiffSubmitting = true;
        if (submit) {
          submit.disabled = true;
          submit.innerHTML = '<span class="spin">⏳</span> ' + trMsg('Çeviri hazırlanıyor...', 'Preparing translation...');
        }

        // Clear any stale timeout/error UI from a previous attempt
        const staleTimeout = document.getElementById('diff-timeout-warning');
        if (staleTimeout) staleTimeout.remove();
        const staleError = document.getElementById('diff-error-msg');
        if (staleError) staleError.remove();

        try {
          const res = await fetch('/differentiate-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoId: oppDiffTarget.videoId,
              sourceMeta: {
                videoId: oppDiffTarget.videoId,
                title: oppDiffTarget.title,
                channelTitle: oppDiffTarget.channelTitle,
                thumbnail: oppDiffTarget.thumbnail,
                description: oppDiffTarget.description,
                views: oppDiffTarget.views,
                likes: oppDiffTarget.likes,
                subscribers: oppDiffTarget.subscribers,
                score: oppDiffTarget.score
              },
              targetLang: targetLang,
              durationMode: oppDiffDuration
            })
          });
          const data = await res.json();
          if (!data.success) {
            showToast(trMsg('Hata: ', 'Error: ') + (data.error || 'unknown'), 'error');
            // Reset button
            if (submit) {
              submit.disabled = false;
              submit.innerHTML = '✨ ' + trMsg('Çeviriyi Üret', 'Generate Translation');
            }
            return;
          }

          // Got jobId — start polling for completion
          oppDiffPendingJobId = data.jobId;
          pollDifferentiationStatus(data.jobId, submit);
        } catch (err) {
          showToast(trMsg('Ağ hatası: ', 'Network error: ') + (err && err.message ? err.message : err), 'error');
          if (submit) {
            submit.disabled = false;
            submit.innerHTML = '✨ ' + trMsg('Çeviriyi Üret', 'Generate Translation');
          }
        } finally {
          oppDiffSubmitting = false;
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // Phase 1 polling: GET /differentiate-status/:jobId every 3s
      // ─────────────────────────────────────────────────────────────────────
      let diffPollInterval = null;
      let diffPollStartTime = 0;
      const DIFF_POLL_INTERVAL_MS = 3000;
      const DIFF_POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

      function pollDifferentiationStatus(jobId, submitBtn) {
        // Clear any existing poll
        if (diffPollInterval) {
          clearInterval(diffPollInterval);
          diffPollInterval = null;
        }
        diffPollStartTime = Date.now();

        const poll = async () => {
          // Timeout check
          if (Date.now() - diffPollStartTime > DIFF_POLL_TIMEOUT_MS) {
            clearInterval(diffPollInterval);
            diffPollInterval = null;
            showDiffTimeoutState(jobId, submitBtn);
            return;
          }

          try {
            const res = await fetch('/differentiate-status/' + jobId);
            const data = await res.json();

            if (!data.success) {
              clearInterval(diffPollInterval);
              diffPollInterval = null;
              showToast(data.error || trMsg('Hata', 'Error'), 'error');
              resetDiffSubmitBtn(submitBtn);
              return;
            }

            // Update submit button with progress
            if (submitBtn) {
              const stageText = data.stage || '';
              const progressText = (data.progress && data.progress > 0)
                ? ' (' + data.progress + '%)'
                : '';
              submitBtn.innerHTML = '<span class="spin">⏳</span> ' + (stageText ? stageText + progressText : trMsg('Çeviri hazırlanıyor...', 'Preparing translation...'));
            }

            if (data.status === 'awaiting_approval') {
              // Phase 1 done! Transform to Step 2
              clearInterval(diffPollInterval);
              diffPollInterval = null;
              resetDiffSubmitBtn(submitBtn);
              showDiffReviewStep(jobId, data, submitBtn);
            } else if (data.status === 'failed') {
              clearInterval(diffPollInterval);
              diffPollInterval = null;
              const errorMsg = data.error || trMsg('Bilinmeyen hata', 'Unknown error');
              showDiffFailedState(errorMsg, jobId, submitBtn);
            }
          } catch (err) {
            // Network blip — keep polling
            console.error('[diff poll] network error:', err);
          }
        };

        // First call immediately, then every 3s
        poll();
        diffPollInterval = setInterval(poll, DIFF_POLL_INTERVAL_MS);
      }

      function resetDiffSubmitBtn(submitBtn) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '✨ ' + trMsg('Çeviriyi Üret', 'Generate Translation');
        }
      }

      function showDiffTimeoutState(jobId, submitBtn) {
        const step1 = document.getElementById('diff-step1');
        if (!step1) return;

        // Remove previous warning if any
        const existingTimeout = document.getElementById('diff-timeout-warning');
        if (existingTimeout) existingTimeout.remove();

        const checkBtnSelector = submitBtn ? "'" + submitBtn.id + "'" : 'null';
        const warning = document.createElement('div');
        warning.id = 'diff-timeout-warning';
        warning.className = 'diff-timeout-warning';
        warning.innerHTML =
          '<p>⏳ ' + trMsg('Çeviri 5 dakikadan uzun sürüyor. Aşağıdaki butonla durumu kontrol edebilirsiniz.', 'Translation taking longer than 5 minutes. Use the button below to check status.') + '</p>' +
          '<button type="button" class="lang-btn" onclick="retryDiffStatusCheck(' + jobId + ', ' + checkBtnSelector + ')" style="width:auto;">' +
          trMsg('Durumu Kontrol Et', 'Check Status') + '</button>';
        step1.appendChild(warning);
      }

      function retryDiffStatusCheck(jobId, submitBtn) {
        // Remove the timeout warning and re-arm polling
        const existingTimeout = document.getElementById('diff-timeout-warning');
        if (existingTimeout) existingTimeout.remove();
        pollDifferentiationStatus(jobId, submitBtn || document.getElementById('diff-submit-btn'));
      }

      function showDiffFailedState(errorMsg, jobId, submitBtn) {
        resetDiffSubmitBtn(submitBtn);
        const step1 = document.getElementById('diff-step1');
        if (!step1) return;

        const existingError = document.getElementById('diff-error-msg');
        if (existingError) existingError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.id = 'diff-error-msg';
        errorDiv.className = 'diff-error-msg';
        errorDiv.innerHTML =
          '<p>❌ ' + trMsg('Hata: ', 'Error: ') + escapeHTML(errorMsg) + '</p>' +
          '<button type="button" class="lang-btn" onclick="retryDifferentiate()" style="width:auto;">' +
          trMsg('Yeniden Dene', 'Retry') + '</button>';
        step1.appendChild(errorDiv);
      }

      function retryDifferentiate() {
        // Clear error UI and re-trigger submit (preserves the original target)
        const err = document.getElementById('diff-error-msg');
        if (err) err.remove();
        const warn = document.getElementById('diff-timeout-warning');
        if (warn) warn.remove();
        submitDifferentiate();
      }

      function showDiffReviewStep(jobId, data, submitBtn) {
        oppDiffPendingJobId = jobId;

        // Show step 2, hide step 1
        const step1 = document.getElementById('diff-step1');
        const step2 = document.getElementById('diff-step2');
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = '';

        // Mirror source video info into step 2 preview
        const t2 = document.getElementById('diff-preview-thumb-step2');
        const ti2 = document.getElementById('diff-preview-title-step2');
        const tc2 = document.getElementById('diff-preview-channel-step2');
        const meta = data.sourceVideoMeta || (oppDiffTarget || {});
        if (t2) t2.src = meta.thumbnail || '';
        if (ti2) ti2.textContent = meta.title || '';
        if (tc2) tc2.textContent = (meta.channelTitle || '') + ' · ' + (meta.views || 0) + ' views';

        // Fill readonly + editable areas
        const origEl = document.getElementById('diff-original-text');
        const cleanEl = document.getElementById('diff-cleaned-text');
        const transEl = document.getElementById('diff-translated-text');
        if (origEl) origEl.textContent = data.originalText || '';
        if (cleanEl) cleanEl.textContent = data.cleanedText || '';
        if (transEl) transEl.value = data.translatedText || '';
        updateDiffCharCount();

        showToast(trMsg('Çeviri hazır. Lütfen gözden geçirip onaylayın.', 'Translation ready. Review and approve.'), 'success');
      }

      // Resume an in-progress differentiation (clicked from a job-card badge)
      async function resumeDifferentiation(jobId) {
        try {
          const res = await fetch('/differentiate-status/' + jobId);
          const data = await res.json();
          if (!data.success) {
            showToast(data.error || trMsg('Hata', 'Error'), 'error');
            return;
          }

          // Open the differentiation modal at step 1
          openModal('differentiateModal');
          const step1 = document.getElementById('diff-step1');
          const step2 = document.getElementById('diff-step2');
          if (step1) step1.style.display = '';
          if (step2) step2.style.display = 'none';

          // Hide Step 1's submit button — the user is just observing/resuming
          const submitBtn = document.getElementById('diff-submit-btn');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spin">⏳</span> ' + trMsg('Çeviri bekleniyor...', 'Awaiting translation...');
          }

          // Populate oppDiffTarget so the step-2 video preview has data
          const meta = data.sourceVideoMeta || {};
          oppDiffTarget = {
            videoId: meta.videoId || '',
            title: meta.title || '',
            channelTitle: meta.channelTitle || '',
            thumbnail: meta.thumbnail || '',
            description: meta.description || '',
            views: meta.views || 0,
            likes: meta.likes || 0,
            subscribers: meta.subscribers || 0,
            score: meta.score || 0
          };
          oppDiffPendingJobId = jobId;

          if (data.status === 'awaiting_approval') {
            // Jump straight to Step 2
            showDiffReviewStep(jobId, data, submitBtn);
          } else if (data.status === 'processing_phase1') {
            // Continue polling for completion
            pollDifferentiationStatus(jobId, submitBtn);
          } else if (data.status === 'failed') {
            // Show the failure UI but allow re-submit
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '✨ ' + trMsg('Çeviriyi Üret', 'Generate Translation');
            }
            showDiffFailedState(data.error || trMsg('Bilinmeyen hata', 'Unknown error'), jobId, submitBtn);
          }
        } catch (err) {
          showToast(trMsg('Bağlantı hatası', 'Connection error'), 'error');
        }
      }

      function updateDiffCharCount() {
        const ta = document.getElementById('diff-translated-text');
        const out = document.getElementById('diff-char-count');
        if (!ta || !out) return;
        const n = (ta.value || '').length;
        out.textContent = n + ' ' + trMsg('karakter', 'chars');
      }

      async function approveTranslation() {
        if (!oppDiffPendingJobId) {
          showToast(trMsg('Onaylanacak bir çeviri yok', 'No translation to approve'), 'error');
          return;
        }
        const ta = document.getElementById('diff-translated-text');
        const editedTranslation = ta ? (ta.value || '').trim() : '';
        if (!editedTranslation) {
          showToast(trMsg('Çeviri metni boş olamaz', 'Translation cannot be empty'), 'error');
          return;
        }
        const btn = document.getElementById('diff-approve-btn');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span class="spin">⏳</span> ' + trMsg('Sahneler üretiliyor...', 'Generating scenes...');
        }
        try {
          const res = await fetch('/approve-translation/' + oppDiffPendingJobId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ editedTranslation: editedTranslation })
          });
          const data = await res.json();
          if (data.success) {
            showToast(trMsg("✓ Onaylandı! Dashboard'a yönlendiriliyorsunuz...", '✓ Approved! Redirecting to dashboard...'), 'success');
            closeModal('differentiateModal');
            oppDiffPendingJobId = null;
            setTimeout(function() { window.location.href = '/'; }, 1500);
          } else {
            showToast(trMsg('Hata: ', 'Error: ') + (data.error || 'unknown'), 'error');
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = '✅ ' + trMsg('Onayla ve Prompt Üret', 'Approve & Generate Prompts');
            }
          }
        } catch (err) {
          showToast(trMsg('Ağ hatası: ', 'Network error: ') + (err && err.message ? err.message : err), 'error');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '✅ ' + trMsg('Onayla ve Prompt Üret', 'Approve & Generate Prompts');
          }
        }
      }

      async function cancelDifferentiate() {
        if (!oppDiffPendingJobId) {
          closeModal('differentiateModal');
          return;
        }
        const confirmMsg = trMsg('Bu özgünleştirmeyi iptal etmek istiyor musunuz? Job silinecek.', 'Cancel this differentiation? The job will be deleted.');
        if (!confirm(confirmMsg)) return;
        try {
          const res = await fetch('/differentiate-cancel/' + oppDiffPendingJobId, { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast(trMsg('İptal edildi', 'Cancelled'), 'success');
          } else {
            showToast(trMsg('İptal hatası: ', 'Cancel error: ') + (data.error || 'unknown'), 'error');
          }
        } catch (err) {
          showToast(trMsg('Ağ hatası: ', 'Network error: ') + (err && err.message ? err.message : err), 'error');
        } finally {
          oppDiffPendingJobId = null;
          closeModal('differentiateModal');
        }
      }

      // ==========================================
      // SETTINGS LOADER
      // ==========================================
      async function loadSettings() {
        const res = await fetch('/settings');
        const data = await res.json();
        if (data.success && data.user) {
          document.getElementById('setting_yt_key').value = data.user.youtube_api_key || '';
          document.getElementById('setting_grid').value = data.user.text_position_grid || 'top-left';
          document.getElementById('setting_tone').value = data.user.default_preset_tone || '';
          // S3: lip-sync toggle (default ON if column missing on legacy rows)
          const lipsyncEl = document.getElementById('setting_apply_lipsync');
          if (lipsyncEl) lipsyncEl.checked = (data.user.apply_lipsync === undefined ? 1 : data.user.apply_lipsync) === 1;
          // S4: end-screen toggle (default ON)
          const endScreenEl = document.getElementById('setting_apply_end_screen');
          if (endScreenEl) endScreenEl.checked = (data.user.apply_end_screen === undefined ? 1 : data.user.apply_end_screen) === 1;
          if (data.user.personal_avatar_base64) {
            // Hem hidden input'a hem de preview'a yaz — save sırasında eski avatar korunsun
            document.getElementById('setting_avatar_base64').value = data.user.personal_avatar_base64;
            document.getElementById('avatar_preview').innerHTML = '<img src="' + data.user.personal_avatar_base64 + '" style="max-width:80px;border-radius:50%;border:2px solid hsl(var(--primary));margin-top:0.5rem;">';
          }
        }
      }

      async function saveSettings() {
        const keyEl = document.getElementById('setting_yt_key');
        const gridEl = document.getElementById('setting_grid');
        const toneEl = document.getElementById('setting_tone');
        const avatarEl = document.getElementById('setting_avatar_base64');
        if (!keyEl || !gridEl || !toneEl || !avatarEl) {
          console.error('[saveSettings] missing form elements');
          showToast('${t.errorSave}', 'error');
          return;
        }
        const key = keyEl.value;
        const grid = gridEl.value;
        const tone = toneEl.value;
        // Eğer kullanıcı yeni dosya seçmediyse mevcut avatar'ı (loadSettings'ten gelen) koru
        const avatar = avatarEl.value || '';
        // S3: lip-sync toggle
        const lipsyncEl = document.getElementById('setting_apply_lipsync');
        const applyLipsync = lipsyncEl ? (lipsyncEl.checked ? 1 : 0) : 1;
        // S4: end-screen toggle
        const endScreenEl = document.getElementById('setting_apply_end_screen');
        const applyEndScreen = endScreenEl ? (endScreenEl.checked ? 1 : 0) : 1;
        const payload = { youtube_api_key: key, text_position_grid: grid, default_preset_tone: tone, apply_lipsync: applyLipsync, apply_end_screen: applyEndScreen };
        if (avatar) payload.personal_avatar_base64 = avatar;
        const res = await fetch('/save-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          closeModal('settingsModal');
          showToast('${t.successSave}', 'success');
        } else {
          showToast('${t.errorSave}', 'error');
        }
      }

      // ==========================================
      // IMAGE ENCODER
      // ==========================================
      function encodeImageFileAsURL(element, type) {
        const file = element.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = function() {
          document.getElementById('setting_' + type + '_base64').value = reader.result;
          const preview = document.getElementById(type + '_preview');
          if (preview) preview.innerHTML = '<img src="' + reader.result + '" style="max-width:80px;border-radius:50%;border:2px solid hsl(var(--primary));margin-top:0.5rem;">';
        };
        reader.readAsDataURL(file);
      }

      // ==========================================
      // TOAST NOTIFICATION
      // ==========================================
      function showToast(msg, type) {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = \`position:fixed;bottom:24px;right:24px;padding:0.75rem 1.25rem;border-radius:0.5rem;font-family:'JetBrains Mono',monospace;font-size:0.8rem;font-weight:600;z-index:99999;animation:cardEntrance 0.3s ease;border:1px solid \${type === 'success' ? 'hsl(142,60%,50%)' : 'hsl(0,70%,50%)'};background:hsla(\${type === 'success' ? '142,60%,10%' : '0,70%,10%'},0.95);color:\${type === 'success' ? 'hsl(142,60%,60%)' : 'hsl(0,70%,60%)'};box-shadow:0 8px 24px rgba(0,0,0,0.3);\`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2500);
      }

      // ==========================================
      // SSE LIVE PROGRESS
      // ==========================================
      const activeJobs = ${JSON.stringify(queueJobs.map(j => j.id))};
      activeJobs.forEach(jobId => {
        const es = new EventSource('/progress/' + jobId);
        es.onmessage = function(event) {
          const data = JSON.parse(event.data);
          const card = document.getElementById('job-card-' + jobId);
          if (!card) return;
          const badge = card.querySelector('.status-badge');
          if (badge) { badge.textContent = data.stage + ' (' + data.percent + '%)'; badge.className = 'status-badge status-processing'; }
          const fill = document.getElementById('progress-fill-' + jobId);
          if (fill) fill.style.width = data.percent + '%';
          const msg = document.getElementById('status-msg-' + jobId);
          if (msg) msg.textContent = '${t.estimated}' + (data.est_min || '?') + ' ${t.minUnit}';
          if (data.stage === 'Tamamlandı' || data.stage === 'Completed') {
            es.close();
            if (data.finalFilename) {
              const a = document.createElement('a'); a.href = '/videolar/' + data.finalFilename; a.download = data.finalFilename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
            }
            setTimeout(() => window.location.reload(), 2000);
          }
          if (data.stage === 'Hata Verdi' || data.stage === 'Error') {
            es.close();
            setTimeout(() => window.location.reload(), 2000);
          }
        };
      });

      // ==========================================
      // META SAVE & PUBLISH
      // ==========================================
      async function saveMeta(jobId) {
        const payload = {
          yt_title: document.getElementById('yt_title_' + jobId)?.value || '',
          yt_desc: document.getElementById('yt_desc_' + jobId)?.value || '',
          yt_tags: document.getElementById('yt_tags_' + jobId)?.value || '',
          tt_desc: document.getElementById('tt_desc_' + jobId)?.value || '',
          tt_tags: document.getElementById('tt_tags_' + jobId)?.value || '',
          x_desc: document.getElementById('x_desc_' + jobId)?.value || '',
          x_tags: document.getElementById('x_tags_' + jobId)?.value || '',
          meta_desc: document.getElementById('meta_desc_' + jobId)?.value || '',
          meta_tags: document.getElementById('meta_tags_' + jobId)?.value || '',
        };
        const res = await fetch('/save-meta/' + jobId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await res.json();
        showToast(result.success ? trMsg('Kaydedildi!', 'Saved!') : trMsg('Hata oluştu', 'Error'), result.success ? 'success' : 'error');
      }

      async function publish(jobId, platform) {
        showToast(platform.toUpperCase() + ' ' + trMsg('yayını başlatıldı...', 'publish started...'), 'success');
        const res = await fetch('/publish/' + jobId + '/' + platform, { method: 'POST' });
        const result = await res.json();
        const pubMsg = result.success ? platform.toUpperCase() + ' ' + trMsg('paylaşıldı!', 'published!') : platform.toUpperCase() + ' ' + trMsg('hata!', 'error!');
        showToast(pubMsg, result.success ? 'success' : 'error');
        if (result.success) setTimeout(() => window.location.reload(), 1500);
      }

      async function deleteJob(jobId) {
        const msg = '${currentLang}' === 'tr' ? 'Bu projeyi silmek istediğinize emin misiniz?' : 'Delete this project?';
        if (!confirm(msg)) return;
        const res = await fetch('/delete-job/' + jobId, { method: 'POST' });
        const result = await res.json();
        if (result.success) { const m = '${currentLang}' === 'tr' ? 'Silindi!' : 'Deleted!'; showToast(m, 'success'); window.location.reload(); }
        else { const m = '${currentLang}' === 'tr' ? 'Hata oluştu' : 'Error'; showToast(m, 'error'); }
      }

      async function retryJob(jobId) {
        const res = await fetch('/retry-job/' + jobId, { method: 'POST' });
        const result = await res.json();
        if (result.success) { const m = '${currentLang}' === 'tr' ? 'Yeniden kuyruğa eklendi!' : 'Re-queued!'; showToast(m, 'success'); window.location.reload(); }
        else { const m = '${currentLang}' === 'tr' ? 'Hata oluştu' : 'Error'; showToast(m, 'error'); }
      }

      async function startJob(jobId) {
        const msg = '${currentLang}' === 'tr'
          ? 'Projeyi başlatmak istediğinize emin misiniz? Colab GPU bağlantısı kurulacak.'
          : 'Start the project? Colab GPU will be connected.';
        if (!confirm(msg)) return;
        try {
          const res = await fetch('/start-job/' + jobId, { method: 'POST' });
          const result = await res.json();
          if (result.success) {
            const m = '${currentLang}' === 'tr' ? 'Kuyruğa eklendi!' : 'Queued!';
            showToast(m, 'success');
            window.location.reload();
          } else {
            showToast(result.error || 'Error', 'error');
          }
        } catch (err) {
          showToast((err && err.message) ? err.message : 'Network error', 'error');
        }
      }

      // S6: cancelJob — POST /cancel-job/:id
      // Marks the job as 'cancelled' in the DB; the worker bails out
      // at the next scene boundary. Reloads the page on success so
      // the new status badge is visible immediately.
      async function cancelJob(jobId) {
        const msg = '${currentLang}' === 'tr'
          ? 'Bu projeyi iptal etmek istediğinize emin misiniz? Devam eden üretim durdurulacak.'
          : 'Are you sure you want to cancel this project? Ongoing production will be stopped.';
        if (!confirm(msg)) return;
        try {
          const res = await fetch('/cancel-job/' + jobId, { method: 'POST' });
          const result = await res.json();
          if (result.success) {
            const m = '${currentLang}' === 'tr' ? 'İptal edildi' : 'Cancelled';
            showToast(m, 'success');
            window.location.reload();
          } else {
            showToast(result.error || 'Error', 'error');
          }
        } catch (err) {
          showToast((err && err.message) ? err.message : 'Network error', 'error');
        }
      }

      // Keyboard shortcut Ctrl+K for help
      document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openModal('helpModal'); }
        if (e.key === 'Escape') closeAllModals();
      });

      // Apply initial theme class on load
      const savedTheme = '${currentTheme}';
      if (savedTheme !== 'default') document.documentElement.classList.add('theme-' + savedTheme);

      // ==========================================
      // COLAB STATUS BADGE (S3) — SSE-driven (S4)
      // ==========================================
      let colabPopoverOpen = false;
      let colabEventSource = null;
      let colabReconnectTimer = null;

      function fmtUptime(secs) {
        if (secs == null) return '—';
        secs = Number(secs) || 0;
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return h + 'h ' + m + 'm';
        if (m > 0) return m + 'm ' + s + 's';
        return s + 's';
      }

      function renderColabBadge(state) {
        const badge = document.getElementById('colabBadge');
        const label = document.getElementById('colabLabel');
        if (!badge || !label) return;
        // Strip all state classes then add the right one
        ['colab-stopped','colab-starting','colab-running','colab-stopping','colab-error'].forEach(c => badge.classList.remove(c));
        const status = state && state.status ? state.status : 'stopped';
        badge.classList.add('colab-' + status);

        const isTr = '${currentLang}' === 'tr';
        if (status === 'stopped') {
          label.textContent = isTr ? '⚫ Colab' : '⚫ Colab';
        } else if (status === 'starting') {
          label.textContent = isTr ? '🟡 Başlatılıyor…' : '🟡 Starting…';
        } else if (status === 'stopping') {
          label.textContent = isTr ? '🟡 Durduruluyor…' : '🟡 Stopping…';
        } else if (status === 'running') {
          const mem = state.gpuMemoryGB;
          if (mem != null) {
            label.textContent = '🟢 T4 ' + Number(mem).toFixed(1) + 'GB';
          } else {
            label.textContent = '🟢 Colab';
          }
        } else if (status === 'error') {
          label.textContent = isTr ? '🔴 Hata' : '🔴 Error';
        }

        // Popover fields (only update if open or we still want fresh data)
        const sEl = document.getElementById('colabPopStatus');
        const uEl = document.getElementById('colabPopUrl');
        const gEl = document.getElementById('colabPopGpu');
        const upEl = document.getElementById('colabPopUptime');
        const eRow = document.getElementById('colabPopErrRow');
        const eEl = document.getElementById('colabPopErr');
        if (sEl) sEl.textContent = status;
        if (uEl) uEl.textContent = state.ngrokUrl || '—';
        if (gEl) gEl.textContent = state.gpuMemoryGB != null ? Number(state.gpuMemoryGB).toFixed(2) + ' GB' : '—';
        if (upEl) upEl.textContent = fmtUptime(state.uptimeSeconds);
        if (eRow && eEl) {
          if (state.lastError) {
            eRow.style.display = '';
            eEl.textContent = String(state.lastError).slice(0, 200);
          } else {
            eRow.style.display = 'none';
          }
        }
        // Disable Start/Stop based on state
        const startBtn = document.querySelector('.colab-action-start');
        const stopBtn = document.querySelector('.colab-action-stop');
        if (startBtn) startBtn.disabled = (status === 'starting' || status === 'stopping' || status === 'running');
        if (stopBtn) stopBtn.disabled = (status === 'stopped' || status === 'starting' || status === 'stopping');
      }

      async function pollColabStatus() {
        // Kept for manual "force refresh" calls (e.g. opening the popover).
        // The main update path is SSE; this is a one-shot fetch fallback.
        try {
          const res = await fetch('/colab-status', { credentials: 'same-origin' });
          if (!res.ok) return;
          const state = await res.json();
          renderColabBadge(state);
        } catch (err) {
          // Network blip — leave last-known state visible
        }
      }

      function startColabSSE() {
        // Close any existing connection
        if (colabEventSource) {
          try { colabEventSource.close(); } catch {}
          colabEventSource = null;
        }
        if (colabReconnectTimer) {
          clearTimeout(colabReconnectTimer);
          colabReconnectTimer = null;
        }
        if (typeof EventSource === 'undefined') {
          // Browser doesn't support SSE — fall back to polling once
          void pollColabStatus();
          return;
        }
        const es = new EventSource('/colab-status-stream');
        colabEventSource = es;
        es.onmessage = (e) => {
          try {
            const state = JSON.parse(e.data);
            renderColabBadge(state);
          } catch {}
        };
        es.onerror = () => {
          try { es.close(); } catch {}
          colabEventSource = null;
          // Reconnect after 5s
          colabReconnectTimer = setTimeout(startColabSSE, 5000);
        };
      }

      function toggleColabPopover(e) {
        if (e) e.stopPropagation();
        const pop = document.getElementById('colabPopover');
        if (!pop) return;
        colabPopoverOpen = !colabPopoverOpen;
        pop.style.display = colabPopoverOpen ? 'block' : 'none';
        if (colabPopoverOpen) void pollColabStatus();
      }

      function closeColabPopover() {
        const pop = document.getElementById('colabPopover');
        if (pop) pop.style.display = 'none';
        colabPopoverOpen = false;
      }

      // Close popover when clicking outside
      document.addEventListener('click', function(e) {
        if (!colabPopoverOpen) return;
        const wrap = document.getElementById('colabStatusWrap');
        if (wrap && !wrap.contains(e.target)) closeColabPopover();
      });

      async function manualColabStart() {
        const startBtn = document.querySelector('.colab-action-start');
        if (startBtn) startBtn.disabled = true;
        try {
          const res = await fetch('/colab-start', { method: 'POST', credentials: 'same-origin' });
          const data = await res.json();
          if (data.success) {
            showToast(trMsg('Colab başlatıldı', 'Colab started'), 'success');
          } else {
            showToast(trMsg('Hata: ', 'Error: ') + (data.error || 'unknown'), 'error');
          }
        } catch (err) {
          showToast(trMsg('Ağ hatası: ', 'Network error: ') + (err && err.message ? err.message : err), 'error');
        }
      }

      async function manualColabStop() {
        const stopBtn = document.querySelector('.colab-action-stop');
        if (stopBtn) stopBtn.disabled = true;
        try {
          const res = await fetch('/colab-stop', { method: 'POST', credentials: 'same-origin' });
          const data = await res.json();
          if (data.success) {
            showToast(trMsg('Colab durduruldu', 'Colab stopped'), 'success');
          } else {
            showToast(trMsg('Hata: ', 'Error: ') + (data.error || 'unknown'), 'error');
          }
        } catch (err) {
          showToast(trMsg('Ağ hatası: ', 'Network error: ') + (err && err.message ? err.message : err), 'error');
        }
      }

      // Boot SSE when the dashboard loads
      startColabSSE();
    </script>
  </body>
  </html>
  `;

  return dashboardHTML;
}
