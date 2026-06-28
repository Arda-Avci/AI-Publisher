/**
 * Dashboard view builder.
 * Pure function — returns the full dashboard HTML for a given request.
 */
import { getDashboardStyles } from './dashboardStyles.js';
import { getDashboardScripts } from './dashboardScripts.js';
import { Logger } from '../lib/logger.js';

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface DashboardParams {
  currentLang: 'tr' | 'en' | 'de' | 'fr' | 'es' | 'ar';
  currentTheme: string;
  t: Record<string, string>;
  user: any;
  queueJobs: any[];
  completedJobs: any[];
  themeStyles: string;
  isDark: boolean;
  csrfToken?: string;
  cspNonce?: string;
}

export function buildDashboardHTML(params: DashboardParams): string {
  const {
    currentLang,
    currentTheme,
    t,
    user,
    queueJobs,
    completedJobs,
    themeStyles,
    isDark,
    csrfToken,
    cspNonce,
  } = params;

  const HELP_PAGES_DATA = [
    {
      id: 'general',
      titleTr: 'Genel Bakış',
      titleEn: 'Overview',
      contentTr: `<h3>Platformumuza Hoş Geldiniz!</h3>
        <p>AI Publisher, Docker konteyner GPU gücü ve gelişmiş Node.js otomasyon kütüphanelerini (Playwright, FFmpeg) bir araya getirerek dakikalar içinde SEO uyumlu, viral sosyal medya videoları üretmenizi sağlar.</p>
        <p><strong>Temel Özellikler:</strong></p>
        <ul>
          <li>Ardışık Akıllı Sahne Sürekliliği (Autoregressive Chaining)</li>
          <li>Ses klonlama destekli yapay zekâ dudak senkronizasyonu (Lip-Sync)</li>
          <li>Gelişmiş dikey video (Shorts) dönüştürme ve etkileşim callout yerleşimleri</li>
          <li>Playwright ile YouTube, TikTok, X ve Meta üzerinde tam otomatik yayınlama</li>
        </ul>`,
      contentEn: `<h3>Welcome to our Platform!</h3>
        <p>AI Publisher combines Docker container GPU power and advanced Node.js automation libraries (Playwright, FFmpeg) to let you produce SEO-friendly, viral social media videos in minutes.</p>
        <p><strong>Key Features:</strong></p>
        <ul>
          <li>Autoregressive Chaining for Scene Continuity</li>
          <li>AI Lip-Sync with voice cloning</li>
          <li>Advanced vertical video (Shorts) transformation and callout overlays</li>
          <li>Fully automated posting on YouTube, TikTok, X, and Meta using Playwright</li>
        </ul>`,
    },
    {
      id: 'production',
      titleTr: 'Video Üretim Süreci',
      titleEn: 'Video Production',
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
          <li><strong>Wav2Lip Lip-Sync:</strong> Enable lip-sync to synchronize face movements with synthesized audio.</li>
        </ol>`,
    },
    {
      id: 'publishing',
      titleTr: 'Sosyal Medya Yayını',
      titleEn: 'Social Media Publishing',
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
        <p>Once video production is complete, you can review the generated titles and descriptions, and hit "Publish" to start the automated flow in the background.</p>`,
    },
  ];

  const queueCardsHTML = queueJobs
    .map((job) => {
      const isProcessing = job.status === 'processing';
      const isFailed = job.status === 'failed';
      const isPending = job.status === 'pending';
      const isAwaitingApproval = job.status === 'awaiting_approval';
      const isProcessingPhase1 = job.status === 'processing_phase1';

      var approvalBadge = isAwaitingApproval
        ? '<span class="approval-pending-badge" onclick="resumeDifferentiation(' +
          job.id +
          ')">⏳ ' +
          t.awaitingapprova72 +
          '</span>'
        : '';
      var phase1Badge = isProcessingPhase1
        ? '<span class="phase1-pending-badge" onclick="resumeDifferentiation(' +
          job.id +
          ')">⏳ ' +
          t.translationpend73 +
          '</span>'
        : '';
      var failedBadge = isFailed
        ? '<span class="phase1-pending-badge" style="background:hsla(0 84% 60% / 0.15);color:hsl(0 84% 60%);" onclick="resumeDifferentiation(' +
          job.id +
          ')">❌ ' +
          t.failed74 +
          '</span>'
        : '';

      var startBtn = isPending
        ? '<button onclick="window.loadJobIntoForm(' +
          job.id +
          ')" class="start-btn" style="background: hsla(210, 70%, 50%, 0.15); color: hsl(210, 70%, 60%); border-color: hsla(210, 70%, 50%, 0.4); margin-right: 5px;">✏️ ' +
          t.btnEdit +
          '</button><button onclick="startJob(' +
          job.id +
          ')" class="start-btn">▶ ' +
          t.btnQueueAdd +
          '</button>'
        : '';


      let targetPlatforms = [];
      try {
        targetPlatforms = JSON.parse(job.target_platforms || '[]');
      } catch (e) {}

      const jobDataJson = escapeHtml(
        JSON.stringify({
          masterPrompt: job.master_prompt || '',
          productionNotes: job.production_notes || '',
          characterFeatures: job.character_features || '',
          transcriptText:
            job.transcript_translated || job.transcript_cleaned || job.transcript || '',
          playlistId: job.playlist_id || '',
          materialPath: job.material_path || '',
          hasShorts: job.has_shorts === 1,
          hasSubtitles: job.has_subtitles === 1,
          platforms: targetPlatforms,
          differentiationDurationMode: job.differentiation_duration_mode || 'same',
          differentiationLayout: job.differentiation_layout === 1,
        }),
      );

      return `
      <div class="job-card" id="job-card-${job.id}">
        <div class="job-header">
          <h3>${t.project} #${job.id}</h3>
          <span class="status-badge status-${job.status}">${escapeHtml(job.current_stage || '')} (${job.progress_percent}%)</span>
        </div>
        ${approvalBadge ? '<div style="margin-bottom:0.5rem;">' + approvalBadge + '</div>' : ''}
        ${phase1Badge ? '<div style="margin-bottom:0.5rem;">' + phase1Badge + '</div>' : ''}
        ${failedBadge ? '<div style="margin-bottom:0.5rem;">' + failedBadge + '</div>' : ''}
        <p class="prompt"><strong>Prompt:</strong> ${escapeHtml(job.master_prompt || '')}</p>

        ${
          isProcessing
            ? `
          <div class="progress-bar-container">
            <div class="progress-bar-fill" id="progress-fill-${job.id}" style="width: ${job.progress_percent}%"></div>
          </div>
          <p class="status-msg" id="status-msg-${job.id}">' + (t.labelEstimatedTime) + ': ${job.estimated_minutes ? job.estimated_minutes.toFixed(1) : '?'} ' + (t.labelMinutesUnit) + '</p>
        `
            : ''
        }

        <div class="action-buttons" style="margin-top: 15px; display: flex; gap: 10px;">
          ${startBtn}
          ${isFailed ? `<button onclick="fillJobForm('${jobDataJson}')" class="retry-btn">Yeniden Dene</button>` : ''}
          <button onclick="deleteJob('${job.id}')" class="delete-btn">Sil</button>
        </div>
      </div>
    `;
    })
    .join('');

  const completedCardsHTML = completedJobs
    .map((job) => {
      let platforms = [];
      try {
        platforms = JSON.parse(job.target_platforms || '[]');
      } catch (e) {}

      const ytCancelBtn =
        job.yt_status === 'publishing'
          ? `<button onclick="cancelPublish('${job.id}', 'youtube')" class="cancel-btn pub-cancel-btn" style="margin-left:5px;">✕ ${t.cancel76 || 'İptal Et'}</button>`
          : '';
      const ttCancelBtn =
        job.tt_status === 'publishing'
          ? `<button onclick="cancelPublish('${job.id}', 'tiktok')" class="cancel-btn pub-cancel-btn" style="margin-left:5px;">✕ ${t.cancel76 || 'İptal Et'}</button>`
          : '';
      const xCancelBtn =
        job.x_status === 'publishing'
          ? `<button onclick="cancelPublish('${job.id}', 'x')" class="cancel-btn pub-cancel-btn" style="margin-left:5px;">✕ ${t.cancel76 || 'İptal Et'}</button>`
          : '';
      const metaCancelBtn =
        job.meta_status === 'publishing'
          ? `<button onclick="cancelPublish('${job.id}', 'meta')" class="cancel-btn pub-cancel-btn" style="margin-left:5px;">✕ ${t.cancel76 || 'İptal Et'}</button>`
          : '';

      const jobDataJson = escapeHtml(
        JSON.stringify({
          masterPrompt: job.master_prompt || '',
          productionNotes: job.production_notes || '',
          characterFeatures: job.character_features || '',
          transcriptText:
            job.transcript_translated || job.transcript_cleaned || job.transcript || '',
          playlistId: job.playlist_id || '',
          materialPath: job.material_path || '',
          hasShorts: job.has_shorts === 1,
          hasSubtitles: job.has_subtitles === 1,
          platforms: platforms,
          differentiationDurationMode: job.differentiation_duration_mode || 'same',
          differentiationLayout: job.differentiation_layout === 1,
        }),
      );

      let coverSelectorHTML = '';
      if (job.cover_images) {
        try {
          const coverList = JSON.parse(job.cover_images);
          if (Array.isArray(coverList) && coverList.length > 0) {
            const selectedCoverName = job.cover_image_path
              ? job.cover_image_path.split(/[\\/]/).pop()
              : '';
            const coverOptions = coverList
              .map((cPath, idx) => {
                const cName = cPath.split('/').pop();
                const isSelected = cName === selectedCoverName;
                const activeClass = isSelected ? 'active' : '';
                return `
              <div class="cover-option-card ${activeClass}" onclick="selectCover('${job.id}', ${idx}, this)" style="
                position: relative;
                cursor: pointer;
                border: 2px solid ${isSelected ? 'hsl(var(--primary))' : 'hsla(var(--border), 0.3)'};
                border-radius: 0.5rem;
                overflow: hidden;
                transition: all 0.2s;
                aspect-ratio: 16/9;
                background: hsl(var(--card));
              ">
                <img src="${cPath}" style="width: 100%; height: 100%; object-fit: cover;" alt="Kapak ${idx}">
                <div style="
                  position: absolute;
                  bottom: 0; left: 0; right: 0;
                  background: rgba(0,0,0,0.6);
                  color: #fff;
                  font-size: 0.65rem;
                  padding: 2px 6px;
                  text-align: center;
                  font-family: 'JetBrains Mono', monospace;
                ">
                  ${isSelected ? '✓ Seçili Kapak' : `Kapak Alternatif ${idx + 1}`}
                </div>
              </div>
            `;
              })
              .join('');

            coverSelectorHTML = `
            <div class="cover-selector-section" style="margin-bottom: 1.5rem; margin-top: 1rem;">
              <h5 style="margin-bottom: 0.5rem; font-size: 0.85rem; font-weight: 600;">🖼️ ' + (t.labelCoverPhotoSelect) + '</h5>
              <div class="cover-options-grid" style="
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
              ">
                ${coverOptions}
              </div>
            </div>
          `;
          }
        } catch (e) {
          Logger.warn('Cover images JSON parse hatası', e);
        }
      }

      return `
      <div class="job-card completed-job-card" id="job-card-${job.id}">
        <div class="job-header">
          <h3>' + (t.labelProject) + ' #${job.id}</h3>
          <span class="status-badge status-${job.status}">' + (t.labelCompletedStatus) + '</span>
        </div>
        <p class="prompt"><strong>Prompt:</strong> ${escapeHtml(job.master_prompt || '')}</p>
        
        <div class="video-container">
          <video controls width="100%">
            <source src="/videolar/${job.final_filename}" type="video/mp4">
          </video>
        </div>

        ${
          job.viral_score !== null && job.viral_score !== undefined
            ? `
          <div style="background: rgba(0, 242, 254, 0.1); border: 1px solid #00F2FE; padding: 10px; border-radius: 8px; margin-top: 15px; font-weight: bold; color: #00F2FE; display: flex; align-items: center; gap: 8px;">
            🔥 AI Viralite Skoru: ${job.viral_score} / 100
          </div>
        `
            : ''
        }

        <button onclick="analyzeViralScore('${job.id}')" class="pub-btn" id="viral-btn-${job.id}" style="background: linear-gradient(135deg, #FF007F, #7F00FF); margin-top:10px; width: 100%;">📈 AI Viralite Analizi Yap</button>
        <div id="viral_score_result_${job.id}" style="margin-top: 10px; display:none; background:hsla(var(--border), 0.15); border: 1px solid hsla(var(--border), 0.3); padding:12px; border-radius:8px; font-size:0.85rem;"></div>

        ${coverSelectorHTML}
        
        <div class="marketing-meta">
          <h4>Yapay Zekâ Pazarlama & SEO Detayları (2026 Standartları)</h4>
          <div class="meta-section">
            <h5>YouTube Shorts</h5>
            <input type="text" id="yt_title_${job.id}" value="${escapeHtml(job.yt_title || '')}" placeholder="YouTube Başlık">
            <textarea id="yt_desc_${job.id}" placeholder="YouTube Açıklama">${escapeHtml(job.yt_desc || '')}</textarea>
            <input type="text" id="yt_tags_${job.id}" value="${escapeHtml(job.yt_tags || '')}" placeholder="YouTube Etiketler">
            <div style="display:flex; align-items:center;">
              <button onclick="publish('${job.id}', 'youtube')" class="pub-btn" ${job.yt_status === 'publishing' ? 'disabled' : ''}>YouTube Paylaş (${job.yt_status})</button>
              ${ytCancelBtn}
            </div>
          </div>
          
          <div class="meta-section">
            <h5>TikTok</h5>
            <textarea id="tt_desc_${job.id}" placeholder="TikTok Açıklama">${escapeHtml(job.tt_desc || '')}</textarea>
            <input type="text" id="tt_tags_${job.id}" value="${escapeHtml(job.tt_tags || '')}" placeholder="TikTok Etiketler">
            <div style="display:flex; align-items:center;">
              <button onclick="publish('${job.id}', 'tiktok')" class="pub-btn" ${job.tt_status === 'publishing' ? 'disabled' : ''}>TikTok Paylaş (${job.tt_status})</button>
              ${ttCancelBtn}
            </div>
          </div>
 
          <div class="meta-section">
            <h5>X (Twitter)</h5>
            <textarea id="x_desc_${job.id}" placeholder="X Açıklama">${escapeHtml(job.x_desc || '')}</textarea>
            <input type="text" id="x_tags_${job.id}" value="${escapeHtml(job.x_tags || '')}" placeholder="X Etiketler">
            <div style="display:flex; align-items:center;">
              <button onclick="publish('${job.id}', 'x')" class="pub-btn" ${job.x_status === 'publishing' ? 'disabled' : ''}>X Paylaş (${job.x_status})</button>
              ${xCancelBtn}
            </div>
          </div>
 
          <div class="meta-section">
            <h5>Meta (Reels)</h5>
            <textarea id="meta_desc_${job.id}" placeholder="Meta Açıklama">${escapeHtml(job.meta_desc || '')}</textarea>
            <input type="text" id="meta_tags_${job.id}" value="${escapeHtml(job.meta_tags || '')}" placeholder="Meta Etiketler">
            <div style="display:flex; align-items:center;">
              <button onclick="publish('${job.id}', 'meta')" class="pub-btn" ${job.meta_status === 'publishing' ? 'disabled' : ''}>Meta Reels Paylaş (${job.meta_status})</button>
              ${metaCancelBtn}
            </div>
          </div>
          
          <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 10px;">
            <button onclick="saveMeta('${job.id}')" class="save-btn">Tüm Metinleri Güncelle & Kaydet</button>
            <button onclick="fillJobForm('${jobDataJson}')" class="retry-btn" style="width: 100%;">Yeniden Dene</button>
            <button onclick="deleteJob('${job.id}')" class="delete-btn" style="width: 100%;">Projeyi Sil</button>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  const dashboardHTML = `
  <!DOCTYPE html>
  <html lang="${currentLang}" class="theme-${currentTheme} ${isDark ? 'dark' : ''}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="${csrfToken || ''}">
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
            ${['yapay zeka', 'yapay zeka 2026', 'türkçe ai', 'video üretim', 'shorts', 'ai tools']
              .map(
                (s) =>
                  `<button type="button" class="opp-suggestion" onclick="addInterest('${s}')">+ ${s}</button>`,
              )
              .join('')}
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
            <button class="settings-nav-item" data-target="settings-characters" onclick="switchSettingsTab(this)">
              <span class="settings-nav-icon">👥</span>
              <span>Karakterlerim</span>
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
                  <button class="language-card ${currentLang === 'de' ? 'active' : ''}" onclick="setLanguage('de')">
                    <div class="language-flag">🇩🇪</div>
                    <div class="language-info">
                      <div class="language-name">Deutsch</div>
                      <div class="language-native">German interface</div>
                    </div>
                    <div class="language-check">${currentLang === 'de' ? '✓' : ''}</div>
                  </button>
                  <button class="language-card ${currentLang === 'fr' ? 'active' : ''}" onclick="setLanguage('fr')">
                    <div class="language-flag">🇫🇷</div>
                    <div class="language-info">
                      <div class="language-name">Français</div>
                      <div class="language-native">French interface</div>
                    </div>
                    <div class="language-check">${currentLang === 'fr' ? '✓' : ''}</div>
                  </button>
                  <button class="language-card ${currentLang === 'es' ? 'active' : ''}" onclick="setLanguage('es')">
                    <div class="language-flag">🇪🇸</div>
                    <div class="language-info">
                      <div class="language-name">Español</div>
                      <div class="language-native">Spanish interface</div>
                    </div>
                    <div class="language-check">${currentLang === 'es' ? '✓' : ''}</div>
                  </button>
                  <button class="language-card ${currentLang === 'ar' ? 'active' : ''}" onclick="setLanguage('ar')">
                    <div class="language-flag">🇸🇦</div>
                    <div class="language-info">
                      <div class="language-name">العربية</div>
                      <div class="language-native">Arabic interface</div>
                    </div>
                    <div class="language-check">${currentLang === 'ar' ? '✓' : ''}</div>
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
 
              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>Marka Kimliği (Brand Kit)</h3>
                  <p>Videolarda kullanılacak marka logosu, altyazı renkleri ve yazı tipini belirleyin.</p>
                </div>
                <div class="form-grid-2" style="margin-bottom:0.75rem;">
                  <div>
                    <label class="form-label" style="font-size:0.75rem;opacity:0.8;">Marka Logosu</label>
                    <input type="file" class="form-input" id="setting_brand_logo_file" accept="image/*" onchange="encodeImageFileAsURL(this, 'brand_logo')" style="margin-bottom:0.35rem;">
                    <input type="hidden" id="setting_brand_logo_base64">
                    <div id="brand_logo_preview"></div>
                  </div>
                  <div>
                    <label class="form-label" style="font-size:0.75rem;opacity:0.8;">Birincil Renk (Neon)</label>
                    <input type="color" class="form-input" id="setting_brand_primary_color" value="#00F2FE" style="height:38px;padding:2px;cursor:pointer;">
                  </div>
                </div>
                <div class="form-grid-2">
                  <div>
                    <label class="form-label" style="font-size:0.75rem;opacity:0.8;">İkincil Renk</label>
                    <input type="color" class="form-input" id="setting_brand_secondary_color" value="#9B51E0" style="height:38px;padding:2px;cursor:pointer;">
                  </div>
                  <div>
                    <label class="form-label" style="font-size:0.75rem;opacity:0.8;">Yazı Tipi Dosya Yolu / Adı</label>
                    <input type="text" class="form-input" id="setting_brand_font_path" placeholder="Arial veya C:/Windows/Fonts/arial.ttf">
                  </div>
                </div>
              </div>
 
              <div class="settings-section" style="margin-top: 1.25rem;">
                <div class="settings-section-header">
                  <h3>Ses Klonlama (Voice Cloning)</h3>
                  <p>Kendi sesinizi klonlayarak özel işlerinizde ses sentezlemek için kısa bir ses kaydı (MP3/WAV) yükleyin.</p>
                </div>
                <div class="form-grid-1">
                  <div>
                    <label class="form-label" style="font-size:0.75rem;opacity:0.8;">Referans Ses Dosyası</label>
                    <input type="file" class="form-input" id="setting_personal_voice_file" accept="audio/*" onchange="encodeAudioFileAsURL(this)" style="margin-bottom:0.35rem;">
                    <input type="hidden" id="setting_personal_voice_base64">
                    <div id="personal_voice_preview" style="margin-top: 0.5rem; font-size: 0.75rem; color: hsl(var(--primary));"></div>
                  </div>
                </div>
              </div>

              <button onclick="saveSettings()" class="btn-primary mt-2">${t.saveSettings}</button>
            </div>

            <!-- Characters Tab -->
            <div class="tab-content" id="settings-characters">
              <div class="settings-section">
                <div class="settings-section-header">
                  <h3>Karakterlerim</h3>
                  <p>Videolarınızda <code>@karakter_adı</code> şeklinde çağırabileceğiniz özel karakterlerinizi yönetin.</p>
                </div>
                
                <!-- Character creation form -->
                <div class="glass-card" style="padding: 1rem; margin-bottom: 1.5rem; background: hsla(var(--border), 0.1);">
                  <h4 style="margin-bottom: 0.75rem; font-size: 0.9rem; font-weight: 600;">✨ Yeni Karakter Ekle</h4>
                  <div class="form-stack">
                    <div>
                      <label class="form-label" style="font-size:0.75rem;">Karakter Adı (örn: sibel)</label>
                      <input type="text" class="form-input" id="new_char_name" placeholder="sibel" style="font-size:0.8rem; margin-bottom:0.5rem;">
                    </div>
                    <div>
                      <label class="form-label" style="font-size:0.75rem;">Fiziksel Özellikler (Avatar promptu)</label>
                      <textarea class="form-input" id="new_char_prompt" rows="2" placeholder="mavi gözlü, sarı saçlı kadın..." style="font-size:0.8rem; min-height:45px; margin-bottom:0.5rem;"></textarea>
                    </div>
                    <div class="form-grid-2" style="margin-bottom:0.5rem;">
                      <div>
                        <label class="form-label" style="font-size:0.75rem;">Referans Fotoğraf (Opsiyonel)</label>
                        <input type="file" class="form-input" id="new_char_image_file" accept="image/*" onchange="encodeImageFileAsURL(this, 'character')" style="font-size:0.8rem;">
                        <input type="hidden" id="new_char_image_base64">
                      </div>
                      <div>
                        <label class="form-label" style="font-size:0.75rem;">Ses Dosyası (XTTS Klonlama için - Opsiyonel)</label>
                        <input type="file" class="form-input" id="new_char_voice_file" accept="audio/*" onchange="encodeCharacterVoiceFileAsURL(this)" style="font-size:0.8rem;">
                        <input type="hidden" id="new_char_voice_base64">
                      </div>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:0.5rem;">
                      <button type="button" onclick="createCharacter()" class="btn-primary" style="flex:1; padding:0.5rem;">Ekle</button>
                      <button type="button" onclick="generateCharacterAvatar()" class="btn-publish" style="flex:1; padding:0.5rem; background:linear-gradient(135deg,#7F00FF,#FF007F);">SD Avatar Üret</button>
                    </div>
                  </div>
                </div>

                <!-- Characters List -->
                <div class="characters-list-wrap">
                  <h4 style="margin-bottom: 0.75rem; font-size: 0.9rem; font-weight: 600;">👥 Kayıtlı Karakterler</h4>
                  <div id="settings-characters-list" class="form-stack" style="gap:10px;">
                    <div style="color:hsl(var(--muted-foreground)); font-style:italic; font-size:0.8rem;">Karakterler yükleniyor...</div>
                  </div>
                </div>
              </div>
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
          ${HELP_PAGES_DATA.map(
            (p) => `
            <button class="help-topic-btn" data-id="${p.id}" onclick="showHelpTopic('${p.id}')">
              <span></span> ${currentLang === 'tr' ? p.titleTr : p.titleEn}
            </button>
          `,
          ).join('')}
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

    <!-- 4. Kredi / Abonelik Satın Al Modal (iyzico) -->
    <div class="app-modal modal-w-std" id="paymentModal">
      <div class="modal-header">
        <div class="modal-title">
          <div class="modal-title-icon">💳</div>
          Kredi / Abonelik Satın Al
        </div>
        <button class="modal-close" onclick="closeModal('paymentModal')">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:1.5rem; text-align:center;">
          <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:0.4rem;">Kredilerinizi Güncelleyin, Üretime Devam Edin!</h3>
          <p style="font-size:0.85rem;color:hsl(var(--muted-foreground));">iyzico güvencesiyle tek seferlik paket veya aylık abonelik satın alabilirsiniz.</p>
        </div>
        
        <!-- Options Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 12px; margin-bottom:1.5rem;" id="paymentOptions">
          <!-- Paket 1: Başlangıç (50 Kredi) -->
          <div class="glass-card payment-package-card" style="padding: 1.25rem; text-align: center; border: 1px solid hsla(var(--border), 0.4); border-radius: 0.75rem; cursor: pointer; transition: all 0.2s;" onclick="initiateIyzicoPayment('basic')">
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🌱</div>
            <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.25rem;">Başlangıç</h4>
            <div style="font-size: 0.75rem; color:hsl(var(--muted-foreground)); margin-bottom: 0.25rem;">50 Kredi</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: hsl(var(--primary)); margin-bottom: 0.5rem;">100 TL</div>
            <button class="btn-publish" style="width: 100%; font-size:0.8rem;">Satın Al</button>
          </div>
          <!-- Paket 2: Profesyonel (250 Kredi) -->
          <div class="glass-card payment-package-card" style="padding: 1.25rem; text-align: center; border: 2px solid hsl(var(--primary)); border-radius: 0.75rem; cursor: pointer; transition: all 0.2s; position:relative;" onclick="initiateIyzicoPayment('pro')">
            <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: hsl(var(--primary)); color: #000; font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 99px;">POPÜLER</span>
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🪙</div>
            <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.25rem;">Profesyonel</h4>
            <div style="font-size: 0.75rem; color:hsl(var(--muted-foreground)); margin-bottom: 0.25rem;">250 Kredi</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: hsl(var(--primary)); margin-bottom: 0.5rem;">450 TL</div>
            <button class="btn-publish" style="width: 100%; font-size:0.8rem;">Satın Al</button>
          </div>
          <!-- Paket 3: Kurumsal (1000 Kredi) -->
          <div class="glass-card payment-package-card" style="padding: 1.25rem; text-align: center; border: 1px solid hsla(var(--border), 0.4); border-radius: 0.75rem; cursor: pointer; transition: all 0.2s;" onclick="initiateIyzicoPayment('enterprise')">
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🏢</div>
            <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.25rem;">Kurumsal</h4>
            <div style="font-size: 0.75rem; color:hsl(var(--muted-foreground)); margin-bottom: 0.25rem;">1000 Kredi</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: hsl(var(--primary)); margin-bottom: 0.5rem;">1.500 TL</div>
            <button class="btn-publish" style="width: 100%; font-size:0.8rem;">Satın Al</button>
          </div>
          <!-- Paket 4: Gümüş Abonelik -->
          <div class="glass-card payment-package-card" style="padding: 1.25rem; text-align: center; border: 1px solid hsla(var(--border), 0.4); border-radius: 0.75rem; cursor: pointer; transition: all 0.2s;" onclick="initiateIyzicoPayment('sub_silver')">
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🚀</div>
            <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.25rem;">Gümüş Abonelik</h4>
            <div style="font-size: 0.75rem; color:hsl(var(--muted-foreground)); margin-bottom: 0.25rem;">300 Kredi / ay</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: hsl(var(--primary)); margin-bottom: 0.5rem;">299 TL / ay</div>
            <button class="btn-primary" style="width: 100%; font-size:0.8rem;">Abone Ol</button>
          </div>
          <!-- Paket 5: Altın Abonelik -->
          <div class="glass-card payment-package-card" style="padding: 1.25rem; text-align: center; border: 1px solid hsla(var(--border), 0.4); border-radius: 0.75rem; cursor: pointer; transition: all 0.2s;" onclick="initiateIyzicoPayment('sub_gold')">
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">👑</div>
            <h4 style="font-size:0.9rem; font-weight:700; margin-bottom:0.25rem;">Altın Abonelik</h4>
            <div style="font-size: 0.75rem; color:hsl(var(--muted-foreground)); margin-bottom: 0.25rem;">1000 Kredi / ay</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: hsl(var(--primary)); margin-bottom: 0.5rem;">799 TL / ay</div>
            <button class="btn-primary" style="width: 100%; font-size:0.8rem;">Abone Ol</button>
          </div>
        </div>

        <!-- iyzico iFrame container -->
        <div id="iyzico-iframe-wrapper" style="display:none; border:1px solid hsla(var(--border), 0.3); border-radius:0.75rem; overflow:hidden; min-height:450px; background:#fff; padding:10px; position:relative;">
          <div style="text-align: center; padding: 2rem;" id="payment-loading">
            <span class="spin" style="font-size:2rem; display:inline-block; margin-bottom:1rem;">⏳</span>
            <p>iyzico Güvenli Ödeme Formu Yükleniyor...</p>
          </div>
          <div id="iyzipay-checkout-form" class="responsive"></div>
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
          <div class="user-credits-badge" style="font-family:'Geist',sans-serif;font-size:0.85rem;font-weight:600;background:hsla(var(--primary),0.1);color:hsl(var(--primary));padding:0.4rem 0.8rem;border-radius:0.5rem;border:1px solid hsla(var(--primary),0.2);display:flex;align-items:center;gap:0.35rem;cursor:pointer;" onclick="openPaymentModal()" title="Kredi Satın Al">
            🪙 <span id="headerCredits">${user?.credits !== undefined ? user.credits : 0}</span> / ${user?.monthly_credit_limit || 100} Kredi
          </div>
          <div class="header-divider"></div>
          <div class="docker-status-wrap" id="dockerStatusWrap">
            <span class="docker-badge" id="dockerBadge" title="Docker Servisleri">
              <span class="docker-dot" id="dockerDot"></span>
              <span class="docker-label" id="dockerLabel">Docker</span>
            </span>
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
            <input type="hidden" name="csrfToken" value="${csrfToken || ''}">
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
              <!-- Character Profile Selector -->
              <div style="margin-top:0.35rem; border-top:1px solid hsla(var(--primary),0.08); padding-top:0.5rem;">
                <label class="form-label" style="font-size:0.72rem; opacity:0.8;">Karakter Profili (opsiyonel)</label>
                <div style="display:flex;gap:0.5rem;align-items:center;">
                  <select id="characterProfileSelect" class="form-select" style="flex:1;">
                    <option value="">-- Karakter Seçin --</option>
                  </select>
                  <button type="button" id="newCharBtn" class="btn-secondary" style="white-space:nowrap; font-size:0.75rem; padding:0.4rem 0.8rem;">+ Yeni</button>
                </div>
                <input type="hidden" name="character_profiles" id="characterProfilesInput" value="">
                <div id="selectedCharacterDisplay" style="margin-top:0.3rem; display:flex; flex-wrap:wrap; gap:0.3rem;"></div>
              </div>
              <div class="form-grid-2">
                <div>
                  <label class="form-label">Arka Plan Müziği (Background Music)</label>
                  <input type="file" name="background_music" class="form-input" accept="audio/*" style="padding: 0.5rem;">
                </div>
                <div>
                  <label class="form-label">${t.playlistTarget}</label>
                  <input type="text" name="playlist_id" class="form-input" placeholder="${t.playlistTargetPlaceholder}">
                </div>
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
                  <label class="checkbox-item">
                    <input type="checkbox" name="brand_kit_enabled" value="1">
                    💼 ${t.labelBrandKitActive}
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="kinetic_subtitles" value="1">
                    ✨ Kinetik Altyazı
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="auto_sfx_placement" value="1">
                    🔊 Uzamsal Ses
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="audio_ducking" value="1">
                    🎵 Ses Ördekleme
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" name="deep_think" value="1">
                    🧠 ${t.deepThink}
                    <small style="display:block;opacity:0.6;font-size:0.6rem;margin-top:2px;">${t.deepThinkHint}</small>
                  </label>
                  <label class="checkbox-item">
                    <input type="checkbox" id="loraEnabled" name="lora_enabled" value="1">
                    🎭 ${t.loraEnabled}
                    <small style="display:block;opacity:0.6;font-size:0.6rem;margin-top:2px;">${t.loraEnabledHint}</small>
                  </label>
                </div>
              </div>

              <!-- LoRA Options (shown when loraEnabled checked) -->
              <div id="loraOptions" style="display:none; margin-top:10px; padding:10px; background:var(--surface); border-radius:8px;">
                <div class="option-group">
                  <label>${t.characterImages}</label>
                  <span class="hint">${t.characterImagesHint}</span>
                  <input type="file" id="characterImages" name="character_images" accept="image/*" multiple>
                </div>

                <div class="option-group">
                  <label>${t.pretrainedLora}</label>
                  <span class="hint">${t.pretrainedLoraHint}</span>
                  <select id="pretrainedLoraSelect" name="pretrained_lora_id">
                    <option value="">${t.pretrainedLoraNone}</option>
                  </select>
                  <button type="button" id="loadPretrainedBtn" class="btn-secondary" style="margin-top:5px;">${t.pretrainedLoraLoad}</button>
                  <div id="pretrainedStatus" style="margin-top:5px; font-size:0.85em; color:var(--text-muted);"></div>
                </div>

                <div class="option-item">
                  <input type="checkbox" id="multiCharacter" name="multi_character" value="1">
                  <label for="multiCharacter">${t.multiCharacter}</label>
                  <span class="hint">${t.multiCharacterHint}</span>
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
                <label class="form-label">${t.productionTemplate}</label>
                <select name="production_template" class="form-select" onchange="
                  const hints = {
                    cinematic: '${escapeHtml(t.templateCinematicDesc || '')}',
                    dynamic: '${escapeHtml(t.templateDynamicDesc || '')}',
                    simple: '${escapeHtml(t.templateSimpleDesc || '')}',
                    pixar: '${escapeHtml(t.templatePixarDesc || 'Pixar stili 3D animasyon ve çizgi film tarzı yüksek kaliteli çocuk/sosyal medya videoları için Wan 2.1 modelini otonom prompt yönlendirmesiyle çalıştırır.')}',
                    animatediff: '${escapeHtml(t.templateAnimatediffDesc || 'SD 1.5 tabanlı AnimateDiff ile metinden akıcı animasyonlu videolar üretir. Çizgi film/stilize animasyon için idealdir.')}',
                    svd: '${escapeHtml(t.templateSvdDesc || 'Stability AI Stable Video Diffusion XT ile görselden yüksek kaliteli video üretir. Düşük VRAM tüketimi ile 25 kare video sentezler.')}',
                    wan25: '${escapeHtml(t.templateWan25Desc || 'Alibaba Wan2.5 ile 1080p, 5s/clip, 3-4x hız artışı')}',
                    'wan2.2-comfyui': '${escapeHtml(t.templateWan22ComfyuiDesc || 'RunPod ComfyUI Serverless üzerinden Wan2.2 modeli ile yüksek kaliteli 1080p, 5s video sentezler.')}'
                  };
                  document.getElementById('template-hint').innerText = hints[this.value];
                ">
                  <option value="cinematic" selected>${t.templateCinematic}</option>
                  <option value="dynamic">${t.templateDynamic}</option>
                  <option value="simple">${t.templateSimple}</option>
                  <option value="pixar">${t.templatePixar || 'Pixar 3D Çizgi Film / Animasyon (Wan 2.1)'}</option>
                  <option value="animatediff">${t.templateAnimatediff || 'AnimateDiff (SD 1.5 Tabanlı)'}</option>
                  <option value="svd">${t.templateSvd || 'SVD-XT (Stable Video Diffusion)'}</option>
                  <option value="wan25">${t.templateWan25 || 'Wan2.5 (3-4x Hızlı)'}</option>
                  <option value="wan2.2-comfyui">${t.templateWan22Comfyui || 'Wan2.2 (ComfyUI Serverless)'}</option>
                </select>
                <small style="opacity:0.6;font-size:0.65rem;display:block;margin-top:4px;" id="template-hint">${t.templateCinematicDesc}</small>
              </div>
              <div class="form-grid-2">
                <div>
                  <label class="form-label">TTS Sağlayıcı</label>
                  <select name="tts_provider" class="form-input" onchange="ttsVoiceHint(this.value)">
                    <option value="xtts">🎙️ XTTS-v2 (Coqui, ses klonlama)</option>
                    <option value="f5tts">🧬 F5-TTS (Zero-Shot Klonlama)</option>
                    <option value="openai">🤖 OpenAI TTS (API anahtarı gerekli)</option>
                    <option value="edge">🌐 Edge Speech (ücretsiz, API gerekmez)</option>
                  </select>
                </div>
                <div>
                  <label class="form-label">TTS Ses</label>
                  <input type="text" name="tts_voice" class="form-input" id="tts-voice-input" value="Claribel Dervla" placeholder="Claribel Dervla">
                  <small style="opacity:0.6;font-size:0.65rem;" id="tts-voice-hint">XTTS: Claribel Dervla / OpenAI: alloy,echo,fable,nova,shimmer / Edge: tr-TR-EmelNeural</small>
                </div>
              </div>
              <div>
                <label class="form-label">Üretim Modu</label>
                <select name="production_mode" class="form-select">
                  <option value="short">📱 Short Video (≤60sn, hook & loop)</option>
                  <option value="film">🎬 Film / Uzun Video</option>
                  <option value="series" class="admin-only">📺 Dizi (yalnızca admin)</option>
                </select>
                <small style="opacity:0.6;font-size:0.65rem;display:block;margin-top:4px;" id="mode-hint">
                  Short: hızlı kanca + ölçek şoku + kusursuz döngü. Film/seri: storyboard + sinematik anlatım.
                </small>
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
              <div id="rabbitmq-terminal" class="glass-card" style="margin-top:1.5rem; background:#000; padding:1rem; border-radius:8px; font-family:'JetBrains Mono', monospace; font-size:0.75rem; color:#0f0; max-height:200px; overflow-y:auto; display:block; border: 1px solid #333;">
                <div style="color:#666; margin-bottom:0.5rem; text-transform:uppercase; font-size:0.65rem; border-bottom:1px solid #333; padding-bottom:0.25rem;">RabbitMQ Queue Stream</div>
                <div id="rabbitmq-log-content">
                  <div style="color: #666; font-style: italic;" id="rabbitmq-placeholder">[SYSTEM] RabbitMQ Queue Stream dinleniyor. Bekleyen aktif işlem yok...</div>
                </div>
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

    <!-- Character Creation Modal -->
    <div id="charModal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:1000; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
      <div class="glass-card" style="max-width:480px; width:90%; max-height:90vh; overflow-y:auto; padding:1.5rem; margin:auto; position:relative; top:50%; transform:translateY(-50%); border:1px solid hsla(var(--primary),0.2);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h3 style="margin:0; font-size:1rem;">Yeni Karakter Oluştur</h3>
          <button type="button" onclick="closeCharModal()" style="background:transparent; border:none; color:hsl(var(--muted-foreground)); font-size:1.4rem; cursor:pointer; line-height:1;">&times;</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.75rem;">
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:600;margin-bottom:0.2rem;">Karakter Adı *</label>
            <input type="text" id="charName" class="form-input" placeholder="örn: Ayşe Yılmaz" style="width:100%;">
          </div>
          <div style="display:flex; gap:0.75rem;">
            <div style="flex:1;">
              <label style="display:block;font-size:0.75rem;font-weight:600;margin-bottom:0.2rem;">Cinsiyet</label>
              <select id="charGender" class="form-select" style="width:100%;">
                <option value="female">Kadın</option>
                <option value="male">Erkek</option>
                <option value="unspecified">Belirtilmemiş</option>
              </select>
            </div>
            <div style="flex:1;">
              <label style="display:block;font-size:0.75rem;font-weight:600;margin-bottom:0.2rem;">Yaş</label>
              <input type="number" id="charAge" class="form-input" value="30" min="1" max="120" style="width:100%;">
            </div>
          </div>
          <div>
            <label style="display:block;font-size:0.75rem;font-weight:600;margin-bottom:0.2rem;">Referans Fotoğraf (opsiyonel)</label>
            <input type="file" id="charPhoto" class="form-input" accept="image/*" style="padding:0.4rem; width:100%;">
            <small style="opacity:0.6;font-size:0.6rem;">Yüklenirse AI fotoğrafı analiz edip karakter profilini otomatik doldurur.</small>
            <div id="charPhotoPreview" style="margin-top:0.3rem; display:none;">
              <img id="charPhotoImg" style="max-width:120px; border-radius:8px; border:1px solid hsla(var(--primary),0.2);">
            </div>
          </div>
          <div id="charAnalysisResult" style="display:none; padding:0.5rem; background:hsla(var(--primary),0.05); border-radius:0.5rem; font-size:0.7rem;"></div>
          <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:0.5rem;">
            <button type="button" onclick="closeCharModal()" class="btn-secondary" style="font-size:0.75rem; padding:0.4rem 1rem;">İptal</button>
            <button type="button" id="charSaveBtn" class="btn-publish" style="font-size:0.75rem; padding:0.4rem 1rem;">💾 Kaydet &amp; Seç</button>
          </div>
        </div>
      </div>
    </div>
    <!-- End Character Modal -->

    ${getDashboardScripts({ t, queueJobs, currentLang, currentTheme, HELP_PAGES_DATA, csrfToken, cspNonce })}
  </body>
  </html>
  `;

  return dashboardHTML;
}
