/**
 * Dashboard view builder.
 * Pure function — returns the full dashboard HTML for a given request.
 */
import { getDashboardStyles } from './dashboardStyles.js';
import { getDashboardScripts } from './dashboardScripts.js';

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

    var approvalBadge = isAwaitingApproval
      ? '<span class="approval-pending-badge" onclick="resumeDifferentiation(' + job.id + ')">⏳ ' + (t.awaitingapprova72) + '</span>'
      : '';
    var phase1Badge = isProcessingPhase1
      ? '<span class="phase1-pending-badge" onclick="resumeDifferentiation(' + job.id + ')">⏳ ' + (t.translationpend73) + '</span>'
      : '';
    var failedBadge = isFailed
      ? '<span class="phase1-pending-badge" style="background:hsla(0 84% 60% / 0.15);color:hsl(0 84% 60%);" onclick="resumeDifferentiation(' + job.id + ')">❌ ' + (t.failed74) + '</span>'
      : '';

    var startBtn = isPending
      ? '<button onclick="window.loadJobIntoForm(' + job.id + ')" class="start-btn" style="background: hsla(210, 70%, 50%, 0.15); color: hsl(210, 70%, 60%); border-color: hsla(210, 70%, 50%, 0.4); margin-right: 5px;">✏️ Düzenle</button><button onclick="startJob(' + job.id + ')" class="start-btn">▶ Kuyruğa Ekle</button>'
      : '';

    var cancelBtn = ''; // Bir job prod için gönderilmediyse gösterilmesine gerek yok

    let targetPlatforms = [];
    try { targetPlatforms = JSON.parse(job.target_platforms || '[]'); } catch(e) {}
    
    const jobDataJson = JSON.stringify({
      masterPrompt: job.master_prompt || '',
      productionNotes: job.production_notes || '',
      characterFeatures: job.character_features || '',
      transcriptText: job.transcript_translated || job.transcript_cleaned || job.transcript || '',
      playlistId: job.playlist_id || '',
      materialPath: job.material_path || '',
      hasShorts: job.has_shorts === 1,
      hasSubtitles: job.has_subtitles === 1,
      platforms: targetPlatforms,
      differentiationDurationMode: job.differentiation_duration_mode || 'same',
      differentiationLayout: job.differentiation_layout === 1
    }).replace(/'/g, "&#39;").replace(/"/g, "&quot;");

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
          ${isFailed ? `<button onclick="fillJobForm(${jobDataJson})" class="retry-btn">Yeniden Dene</button>` : ''}
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

    const ytCancelBtn = job.yt_status === 'publishing'
      ? `<button onclick="cancelPublish('${job.id}', 'youtube')" class="cancel-btn pub-cancel-btn" style="margin-left:5px;">✕ ${t.cancel76 || 'İptal Et'}</button>`
      : '';
    const ttCancelBtn = job.tt_status === 'publishing'
      ? `<button onclick="cancelPublish('${job.id}', 'tiktok')" class="cancel-btn pub-cancel-btn" style="margin-left:5px;">✕ ${t.cancel76 || 'İptal Et'}</button>`
      : '';
    const xCancelBtn = job.x_status === 'publishing'
      ? `<button onclick="cancelPublish('${job.id}', 'x')" class="cancel-btn pub-cancel-btn" style="margin-left:5px;">✕ ${t.cancel76 || 'İptal Et'}</button>`
      : '';
    const metaCancelBtn = job.meta_status === 'publishing'
      ? `<button onclick="cancelPublish('${job.id}', 'meta')" class="cancel-btn pub-cancel-btn" style="margin-left:5px;">✕ ${t.cancel76 || 'İptal Et'}</button>`
      : '';

    const jobDataJson = JSON.stringify({
      masterPrompt: job.master_prompt || '',
      productionNotes: job.production_notes || '',
      characterFeatures: job.character_features || '',
      transcriptText: job.transcript_translated || job.transcript_cleaned || job.transcript || '',
      playlistId: job.playlist_id || '',
      materialPath: job.material_path || '',
      hasShorts: job.has_shorts === 1,
      hasSubtitles: job.has_subtitles === 1,
      platforms: platforms,
      differentiationDurationMode: job.differentiation_duration_mode || 'same',
      differentiationLayout: job.differentiation_layout === 1
    }).replace(/'/g, "&#39;").replace(/"/g, "&quot;");

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
            <div style="display:flex; align-items:center;">
              <button onclick="publish('${job.id}', 'youtube')" class="pub-btn" ${job.yt_status === 'publishing' ? 'disabled' : ''}>YouTube Paylaş (${job.yt_status})</button>
              ${ytCancelBtn}
            </div>
          </div>
          
          <div class="meta-section">
            <h5>TikTok</h5>
            <textarea id="tt_desc_${job.id}" placeholder="TikTok Açıklama">${job.tt_desc || ''}</textarea>
            <input type="text" id="tt_tags_${job.id}" value="${job.tt_tags || ''}" placeholder="TikTok Etiketler">
            <div style="display:flex; align-items:center;">
              <button onclick="publish('${job.id}', 'tiktok')" class="pub-btn" ${job.tt_status === 'publishing' ? 'disabled' : ''}>TikTok Paylaş (${job.tt_status})</button>
              ${ttCancelBtn}
            </div>
          </div>
 
          <div class="meta-section">
            <h5>X (Twitter)</h5>
            <textarea id="x_desc_${job.id}" placeholder="X Açıklama">${job.x_desc || ''}</textarea>
            <input type="text" id="x_tags_${job.id}" value="${job.x_tags || ''}" placeholder="X Etiketler">
            <div style="display:flex; align-items:center;">
              <button onclick="publish('${job.id}', 'x')" class="pub-btn" ${job.x_status === 'publishing' ? 'disabled' : ''}>X Paylaş (${job.x_status})</button>
              ${xCancelBtn}
            </div>
          </div>
 
          <div class="meta-section">
            <h5>Meta (Reels)</h5>
            <textarea id="meta_desc_${job.id}" placeholder="Meta Açıklama">${job.meta_desc || ''}</textarea>
            <input type="text" id="meta_tags_${job.id}" value="${job.meta_tags || ''}" placeholder="Meta Etiketler">
            <div style="display:flex; align-items:center;">
              <button onclick="publish('${job.id}', 'meta')" class="pub-btn" ${job.meta_status === 'publishing' ? 'disabled' : ''}>Meta Reels Paylaş (${job.meta_status})</button>
              ${metaCancelBtn}
            </div>
          </div>
          
          <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
            <button onclick="saveMeta('${job.id}')" class="save-btn">Tüm Metinleri Güncelle & Kaydet</button>
            <button onclick="fillJobForm(${jobDataJson})" class="retry-btn" style="width: 100%;">Yeniden Dene</button>
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
    ${getDashboardStyles(themeStyles)}
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
            <h3 class="opp-step-title">${t.pickyourinteres77}</h3>
            <p class="opp-step-sub">${t.addkeywordsorni78}</p>
          </div>
 
          <div class="opp-input-row">
            <input
              type="text"
              id="opp-interest-input"
              class="opp-search-input"
              placeholder="${t.typeaninteresta79}"
              onkeydown="oppInputKey(event)"
            >
            <button type="button" class="btn-publish opp-add-btn" onclick="oppAddFromInput()">${t.add80}</button>
          </div>
 
          <div class="opp-chips-label">${t.selected81}</div>
          <div class="opp-interest-chips" id="opp-chips-container">
            <span class="opp-chips-empty">${t.notagsyet82}</span>
          </div>
 
          <div class="opp-chips-label" style="margin-top: 1.25rem;">${t.languages83}</div>
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
 
          <div class="opp-chips-label" style="margin-top: 1.25rem;">${t.suggestions84}</div>
          <div class="opp-suggestions" id="opp-suggestions-container">
            ${['yapay zeka','yapay zeka 2026','türkçe ai','video üretim','shorts','ai tools'].map(s =>
              `<button type="button" class="opp-suggestion" onclick="addInterest('${s}')">+ ${s}</button>`
            ).join('')}
          </div>
 
          <div class="opp-step1-actions">
            <button type="button" class="btn-publish" id="opp-search-btn" onclick="searchOpportunities()" disabled>
              🔎 ${t.searchopportuni85}
            </button>
          </div>
        </div>
 
        <!-- STEP 2: Results -->
        <div id="opp-step-2" style="display:none;">
          <div class="opp-results-toolbar">
            <button type="button" class="opp-back-btn" onclick="openOppStep1()">← ${t.back86}</button>
            <input
              type="text"
              id="opp-results-search"
              class="opp-search-input opp-search-input-inline"
              placeholder="${t.searchquery87}"
              onkeydown="oppResultsSearchKey(event)"
            >
            <button type="button" class="btn-publish opp-refresh-btn" onclick="rerunOpportunitySearch()">🔄 ${t.refresh88}</button>
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
 
    <!-- 1b. Differentiate Modal -->
    <div class="app-modal diff-modal-width" id="differentiateModal">
      <div class="modal-header">
        <div class="modal-title">
          <div class="modal-title-icon">✨</div>
          ${t.differentiatevi89}
        </div>
        <button class="modal-close" onclick="closeModal('differentiateModal')">×</button>
      </div>
      <div class="modal-body">
        <div id="diff-step1">
          <div class="diff-preview" id="diff-preview">
            <img id="diff-preview-thumb" class="diff-preview-thumb" src="" alt="">
            <div class="diff-preview-info">
              <div class="diff-preview-title" id="diff-preview-title">—</div>
              <div class="diff-preview-channel" id="diff-preview-channel">—</div>
            </div>
          </div>
 
          <div class="diff-form-row">
            <label class="diff-form-label" for="diff-target-lang">${t.targetlanguage90}</label>
            <select id="diff-target-lang" class="diff-form-select"></select>
          </div>
 
          <div class="diff-form-row">
            <label class="diff-form-label">${t.videoduration91}</label>
            <div class="diff-radio-group" id="diff-duration-group">
              <button type="button" class="diff-radio checked" data-mode="same" onclick="selectDurationMode(this)">
                <span class="diff-radio-label">${t.same92}</span>
                <span class="diff-radio-sub">3-5 ${t.scenes93}</span>
              </button>
              <button type="button" class="diff-radio" data-mode="shorter" onclick="selectDurationMode(this)">
                <span class="diff-radio-label">${t.shorter94}</span>
                <span class="diff-radio-sub">-30%</span>
              </button>
              <button type="button" class="diff-radio" data-mode="longer" onclick="selectDurationMode(this)">
                <span class="diff-radio-label">${t.longer95}</span>
                <span class="diff-radio-sub">+50%</span>
              </button>
            </div>
          </div>
 
          <div>
            <label class="diff-form-label">${t.processsummary96}</label>
            <ul class="diff-steps">
              <li>${t.transcriptextra97}</li>
              <li>${t.textcleanedwith98}</li>
              <li>${t.translatedtotar99}</li>
              <li>${t.afterapprovalsc100}</li>
              <li>${currentLang === 'tr' ? "Dashboard'dan manuel başlatırsınız" : 'You start it manually from the dashboard'}</li>
            </ul>
          </div>
 
          <div class="diff-submit-row">
            <button type="button" class="diff-cancel-btn" onclick="closeModal('differentiateModal')">${t.close}</button>
            <button type="button" class="diff-submit-btn" id="diff-submit-btn" onclick="submitDifferentiate()">✨ ${t.generatetransla101}</button>
          </div>
        </div>
 
        <div id="diff-step2" style="display:none;">
          <div class="diff-preview" id="diff-preview-step2">
            <img id="diff-preview-thumb-step2" class="diff-preview-thumb" src="" alt="">
            <div class="diff-preview-info">
              <div class="diff-preview-title" id="diff-preview-title-step2">—</div>
              <div class="diff-preview-channel" id="diff-preview-channel-step2">—</div>
            </div>
          </div>
 
          <details class="diff-review-details">
            <summary>${t.originaltranscr102}</summary>
            <div class="diff-review-readonly" id="diff-original-text"></div>
          </details>
 
          <details class="diff-review-details">
            <summary>${t.cleanedtranscri103}</summary>
            <div class="diff-review-readonly" id="diff-cleaned-text"></div>
          </details>
 
          <div class="diff-form-row" style="margin-top: 0.85rem;">
            <label class="diff-form-label" for="diff-translated-text">${t.translatedtexte104}</label>
            <textarea id="diff-translated-text" class="diff-review-textarea" oninput="updateDiffCharCount()"></textarea>
            <div class="diff-char-count" id="diff-char-count">0 ${t.chars105}</div>
          </div>
 
          <div class="diff-submit-row">
            <button type="button" class="diff-cancel-btn" id="diff-cancel-step2-btn" onclick="cancelDifferentiate()">${t.cancel106}</button>
            <button type="button" class="diff-submit-btn" id="diff-approve-btn" onclick="approveTranslation()">✅ ${t.approvegenerate107}</button>
          </div>
        </div>
      </div>
    </div>
 
    <!-- 2. Settings Modal -->
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
              <span>${t.production108}</span>
            </button>
          </div>
 
          <div class="settings-content">
            <!-- Appearance Tab -->
            <div class="tab-content active" id="settings-appearance">
              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${t.colorTheme}</h3>
                  <p>${t.pickapremiumcol109}</p>
                </div>
                <div class="premium-theme-grid" id="themeGrid">
                  <!-- Default -->
                  <button type="button" class="premium-theme-card ${currentTheme === 'default' ? 'active' : ''}" data-theme="default" onclick="selectThemeCard(this)">
                    <div class="theme-preview" style="background: hsl(220 10% 96%); border-color: hsl(220 10% 88%);">
                      <div class="theme-stripe" style="background: hsl(220 10% 94%);"></div>
                      <div class="theme-dot" style="background: hsl(220 80% 50%); box-shadow: 0 0 8px hsla(220, 80%, 50%, 0.5);"></div>
                    </div>
                    <div class="theme-card-name">${t.standard110}</div>
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
                    <div class="theme-card-name">Sunset</div>
                    <div class="theme-card-meta">SUN</div>
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
                  <!-- Matrix -->
                  <button type="button" class="premium-theme-card ${currentTheme === 'matrix' ? 'active' : ''}" data-theme="matrix" data-dark-only="true" onclick="selectThemeCard(this)">
                    <div class="theme-preview" style="background: hsl(120 100% 2%); border-color: hsl(120 60% 15%);">
                      <div class="theme-stripe" style="background: hsl(120 60% 8%);"></div>
                      <div class="theme-dot" style="background: hsl(120 100% 50%); box-shadow: 0 0 12px hsla(120, 100%, 50%, 0.8);"></div>
                    </div>
                    <div class="theme-card-name">Matrix</div>
                    <div class="theme-card-meta">MTX · ${t.darkonly111}</div>
                  </button>
                </div>
              </div>
 
              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${t.lightDarkMode}</h3>
                  <p>${t.switchbetweenli112}</p>
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
                  <h3>${t.themetransition113}</h3>
                  <p>${t.smoothtransitio114}</p>
                </div>
                <label class="settings-toggle">
                  <input type="checkbox" id="setting_theme_anim" onchange="toggleThemeAnim(this.checked)">
                  <span class="settings-toggle-slider"></span>
                  <span class="settings-toggle-label">${t.enableanimation115}</span>
                </label>
              </div>
            </div>
 
            <!-- Language Tab -->
            <div class="tab-content" id="settings-language">
              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${t.chooseLanguage}</h3>
                  <p>${t.chooseyourprefe116}</p>
                </div>
                <div class="language-grid">
                  <button class="language-card ${currentLang === 'tr' ? 'active' : ''}" onclick="setLanguage('tr')">
                    <div class="language-flag">🇹🇷</div>
                    <div class="language-info">
                      <div class="language-name">Türkçe</div>
                      <div class="language-native">${t.turkishinterfac117}</div>
                    </div>
                    <div class="language-check">${currentLang === 'tr' ? '✓' : ''}</div>
                  </button>
                  <button class="language-card ${currentLang === 'en' ? 'active' : ''}" onclick="setLanguage('en')">
                    <div class="language-flag">🇬🇧</div>
                    <div class="language-info">
                      <div class="language-name">English</div>
                      <div class="language-native">${t.englishinterfac118}</div>
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
                  <p>${t.uploadyourprofi119}</p>
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
                  <p>${t.textpositioning120}</p>
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
                  <p>${t.defaultnarrator121}</p>
                </div>
                <input type="text" class="form-input" id="setting_tone" placeholder="${t.defaultNarratorPlaceholder}" style="margin-bottom:0;">
              </div>
 
              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>YouTube API Key</h3>
                  <p>${t.apikeyforyoutub122}</p>
                </div>
                <input type="text" class="form-input font-mono" id="setting_yt_key" placeholder="AIzaSy..." style="margin-bottom:0; font-size:0.8rem;">
              </div>
 
              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${t.wav2liplipsync123}</h3>
                  <p>${t.reallipsyncviaw124}</p>
                </div>
                <label class="settings-toggle">
                  <input type="checkbox" id="setting_apply_lipsync" checked>
                  <span class="settings-toggle-slider"></span>
                  <span class="settings-toggle-label">${t.enablelipsync125}</span>
                </label>
              </div>
 
              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>${t.endscreenoverla126}</h3>
                  <p>${t.addsavatarwatch127}</p>
                </div>
                <label class="settings-toggle">
                  <input type="checkbox" id="setting_apply_end_screen" checked>
                  <span class="settings-toggle-slider"></span>
                  <span class="settings-toggle-label">${t.enableendscreen128}</span>
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
      <header class="app-header">
        <div class="header-brand">
          <div class="brand-icon">AP</div>
          <div class="brand-text">
            <span class="brand-name">AI <span>Publisher</span></span>
            <span class="brand-sub">${t.brandSubtitle}</span>
          </div>
        </div>
        <div class="header-actions">
          <div class="colab-status-wrap" id="colabStatusWrap">
            <button class="colab-badge colab-stopped" id="colabBadge" onclick="toggleColabPopover(event)" title="Colab GPU">
              <span class="colab-dot" id="colabDot"></span>
              <span class="colab-label" id="colabLabel">Colab</span>
            </button>
            <div class="colab-popover" id="colabPopover" style="display:none;">
              <div class="colab-popover-header">
                <strong>${t.colabgpustatus129}</strong>
                <button class="colab-popover-close" onclick="closeColabPopover()">×</button>
              </div>
              <div class="colab-popover-body" id="colabPopoverBody">
                <div class="colab-status-row"><span>${t.status130}:</span><b id="colabPopStatus">—</b></div>
                <div class="colab-status-row"><span>URL:</span><b id="colabPopUrl" style="font-size:0.7rem; word-break:break-all;">—</b></div>
                <div class="colab-status-row"><span>${t.gpumemory131}:</span><b id="colabPopGpu">—</b></div>
                <div class="colab-status-row"><span>${t.uptime132}:</span><b id="colabPopUptime">—</b></div>
                <div class="colab-status-row" id="colabPopErrRow" style="display:none;"><span>${t.error133}:</span><b id="colabPopErr" style="color: hsl(0,70%,60%); font-size:0.7rem;">—</b></div>
                <div class="colab-popover-actions">
                  <button class="colab-action-btn colab-action-start" onclick="manualColabStart()">▶ ${t.start134}</button>
                  <button class="colab-action-btn colab-action-stop" onclick="manualColabStop()">⏹ ${t.stop135}</button>
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
 
      <main class="app-main">
        <div class="animate-in" id="new-project-panel">
          <form id="jobForm" action="/create-job" method="POST" enctype="multipart/form-data" class="glass-card" style="margin-bottom: 1.5rem;">
            <input type="hidden" id="edit_job_id" value="">
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
              <div>
                <label class="form-label">Çeviri Metni (Düzenlenebilir)</label>
                <textarea name="transcript_text" class="form-textarea" rows="4" placeholder="Videonun çevrilmiş metni (veya seslendirilecek metin) buraya gelecek."></textarea>
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
                  <label class="checkbox-item">
                    <input type="checkbox" name="differentiation_layout" value="1" checked>
                    ${t.differentiationLayout}
                  </label>
                </div>
              </div>
              <div>
                <label class="form-label">${t.differentiationDurationMode}</label>
                <select name="differentiation_duration_mode" class="form-select">
                  <option value="same">${t.same}</option>
                  <option value="shorter">${t.shorter}</option>
                  <option value="longer">${t.longer}</option>
                </select>
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
              <div id="rabbitmq-terminal" class="glass-card" style="margin-top:1.5rem; background:#000; padding:1rem; border-radius:8px; font-family:'JetBrains Mono', monospace; font-size:0.75rem; color:#0f0; max-height:200px; overflow-y:auto; display:none; border: 1px solid #333;">
                <div style="color:#666; margin-bottom:0.5rem; text-transform:uppercase; font-size:0.65rem; border-bottom:1px solid #333; padding-bottom:0.25rem;">RabbitMQ Queue Stream</div>
                <div id="rabbitmq-log-content"></div>
              </div>
            </div>
          </form>
        </div>
 
        <div>
          <div class="glass-card animate-in animate-delay-1" style="margin-bottom: 1.5rem;">
            <div class="section-header">
              <span class="section-title"><span class="section-title-dot"></span>${t.studioQueue}</span>
              <span class="font-mono" style="font-size:0.65rem; color:hsl(var(--muted-foreground));">${queueJobs.length} ${t.jobsLabel}</span>
            </div>
            <div class="queue-scroll-container">
              ${queueCardsHTML.length > 0 ? queueCardsHTML : `<div class="empty-state"><div class="empty-state-icon">📭</div>${t.noActiveJobs}</div>`}
            </div>
          </div>
 
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
    ${getDashboardScripts({ t, queueJobs, currentLang, currentTheme, HELP_PAGES_DATA })}
  </body>
  </html>
  `;

  return dashboardHTML;
}
