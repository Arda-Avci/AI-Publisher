export function getDashboardScripts(params: {
  t: Record<string, string>;
  queueJobs: any[];
  currentLang: string;
  currentTheme: string;
  HELP_PAGES_DATA: any[];
  csrfToken?: string;
  cspNonce?: string;
}): string {
  const { t, queueJobs, currentLang, currentTheme, HELP_PAGES_DATA, csrfToken, cspNonce } = params;
  return `
    <script nonce="${cspNonce || ''}">
      window.csrfToken = "${csrfToken || ''}";

      // CSP Bypass for Inline Event Handlers via MutationObserver
      (function() {
        const inlineEvents = ['click', 'change', 'keyup', 'keydown', 'submit', 'mouseenter', 'mouseleave', 'input'];
        
        function bindElementEvents(el) {
          if (el.nodeType !== 1) return;
          inlineEvents.forEach(eventName => {
            const attrName = 'on' + eventName;
            if (el.hasAttribute(attrName)) {
              const handlerStr = el.getAttribute(attrName);
              el.removeAttribute(attrName);
              
              el.addEventListener(eventName, function(event) {
                try {
                  const fn = new Function('event', handlerStr);
                  fn.call(el, event);
                } catch (err) {
                  console.error('CSP inline handler error (' + attrName + '):', err);
                }
              });
            }
          });
        }

        function processNode(node) {
          if (node.nodeType !== 1) return;
          bindElementEvents(node);
          const children = node.querySelectorAll('*');
          children.forEach(bindElementEvents);
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            processNode(document.body);
            startObserving();
          });
        } else {
          processNode(document.body);
          startObserving();
        }

        function startObserving() {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
              mutation.addedNodes.forEach(node => {
                processNode(node);
              });
            });
          });
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      })();

      // Global fetch interceptor to append CSRF token
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        options = options || {};
        options.headers = options.headers || {};
        if (window.csrfToken) {
          if (options.headers instanceof Headers) {
            options.headers.set('X-CSRF-Token', window.csrfToken);
          } else {
            options.headers['X-CSRF-Token'] = window.csrfToken;
          }
        }
        return originalFetch(url, options);
      };

      window.i18n = ${JSON.stringify(t)};
      const queueJobsData = ${JSON.stringify(queueJobs)};
      const trMsg = (tr, en) => '${currentLang}' === 'tr' ? tr : en;

      window.loadJobIntoForm = function(jobId) {
        const job = queueJobsData.find(j => j.id === jobId);
        if (!job) return;
        fillJobForm({
          masterPrompt: job.master_prompt,
          productionNotes: job.production_notes,
          characterFeatures: job.character_features,
          playlistId: job.playlist_id,
          transcriptText: job.transcript_translated || job.transcript_cleaned || job.transcript || '',
          materialPath: job.material_path,
          hasShorts: job.has_shorts,
          hasSubtitles: job.has_subtitles,
          platforms: job.target_platforms ? JSON.parse(job.target_platforms) : []
        });
        const ej = document.getElementById('edit_job_id');
        if(ej) ej.value = job.id;
        const btn = document.querySelector('#jobForm button[type="submit"]');
        if(btn) btn.innerHTML = '✨ Düzenlemeyi Kaydet & Kuyruğa Ekle';
        document.getElementById('new-project-panel').scrollIntoView({behavior:'smooth'});
        showToast('Proje forma yüklendi. Düzenleyip kaydedebilirsiniz.', 'info');
      };

      function fillJobForm(data) {
        document.querySelector('textarea[name="master_prompt"]').value = data.masterPrompt || '';
        document.querySelector('textarea[name="production_notes"]').value = data.productionNotes || '';
        document.querySelector('textarea[name="character_features"]').value = data.characterFeatures || '';
        document.querySelector('input[name="playlist_id"]').value = data.playlistId || '';
        
        const transcriptTextarea = document.querySelector('textarea[name="transcript_text"]');
        if (transcriptTextarea) transcriptTextarea.value = data.transcriptText || '';

        document.querySelector('input[name="has_shorts"]').checked = !!data.hasShorts;
        document.querySelector('input[name="has_subtitles"]').checked = !!data.hasSubtitles;

        const diffLayoutInput = document.querySelector('input[name="differentiation_layout"]');
        if (diffLayoutInput) diffLayoutInput.checked = data.differentiationLayout !== false;

        const diffDurationInput = document.querySelector('select[name="differentiation_duration_mode"]');
        if (diffDurationInput) diffDurationInput.value = data.differentiationDurationMode || 'same';

        const platforms = data.platforms || [];
        document.querySelectorAll('input[name="platforms"]').forEach(cb => {
          cb.checked = platforms.includes(cb.value);
        });

        const matInput = document.querySelector('input[name="material"]');
        const matInfoId = 'material-retry-info';
        let matInfo = document.getElementById(matInfoId);
        if (matInfo) matInfo.remove();
        if (data.materialPath) {
          matInfo = document.createElement('div');
          matInfo.id = matInfoId;
          matInfo.style.cssText = 'margin-top:0.4rem; padding:0.5rem 0.75rem; background:hsla(var(--primary),0.08); border:1px solid hsla(var(--primary),0.2); border-radius:0.5rem; font-size:0.72rem; color:hsl(var(--muted-foreground)); display:flex; align-items:center; gap:0.5rem;';
          const matLabel = '';
          const matName = String(data.materialPath).split('/').pop();
          matInfo.innerHTML = '📎 <span style="flex:1;">' + matLabel + ': <code>' + matName + '</code></span><button type="button" onclick="this.parentElement.remove()" style="background:transparent;border:none;color:hsl(var(--muted-foreground));cursor:pointer;font-size:1rem;line-height:1;">×</button>';
          if (matInput && matInput.parentElement) matInput.parentElement.appendChild(matInfo);
        }

        document.querySelector('form[action="/create-job"]').scrollIntoView({ behavior: 'smooth' });
      }

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

      function ttsVoiceHint(provider) {
        const hint = document.getElementById('tts-voice-hint');
        const input = document.getElementById('tts-voice-input');
        const defaults = { xtts: 'Claribel Dervla', f5tts: 'default', openai: 'alloy', edge: 'tr-TR-EmelNeural' };
        const hints = {
          xtts: 'XTTS: Claribel Dervla / herhangi bir ses adı',
          f5tts: 'F5-TTS: default (zero-shot, referans ses kullanılır)',
          openai: 'OpenAI: alloy, echo, fable, nova, shimmer',
          edge: 'Edge: tr-TR-EmelNeural, tr-TR-AhmetNeural, en-US-JennyNeural'
        };
        input.placeholder = defaults[provider] || 'Claribel Dervla';
        if (!input.value || input.value === defaults.xtts || input.value === 'default' || input.value === 'alloy' || input.value === 'tr-TR-EmelNeural') {
          input.value = defaults[provider] || 'Claribel Dervla';
        }
        hint.textContent = hints[provider] || hints.xtts;
      }

      function switchSettingsTab(el) {
        const target = el.getAttribute('data-target');
        document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        const targetEl = document.getElementById(target);
        if (targetEl) {
          targetEl.classList.add('active');
          targetEl.style.animation = 'none';
          setTimeout(() => targetEl.style.animation = '', 10);
        }
      }

      function switchTab(tabId) {
        const el = document.querySelector('[data-target="' + tabId + '"]');
        if (el) switchSettingsTab(el);
      }

      function setThemeMode(mode) {
        const html = document.documentElement;
        if (mode === 'dark') html.classList.add('dark');
        else html.classList.remove('dark');
        document.getElementById('btn-light').classList.toggle('active', mode === 'light');
        document.getElementById('btn-dark').classList.toggle('active', mode === 'dark');
        saveSettingsExtra({ theme_mode: mode });
      }

      function selectThemeCard(el) {
        const theme = el.getAttribute('data-theme');
        const darkOnly = el.getAttribute('data-dark-only') === 'true';
        document.querySelectorAll('.premium-theme-card').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        const html = document.documentElement;
        const allThemes = ['nebula','forest','corporate','midnight','sunset','ocean','cyberpunk','matrix'];
        allThemes.forEach(t => html.classList.remove('theme-' + t));
        if (theme !== 'default') html.classList.add('theme-' + theme);
        if (darkOnly && !html.classList.contains('dark')) {
          html.classList.add('dark');
          document.getElementById('btn-light').classList.remove('active');
          document.getElementById('btn-dark').classList.add('active');
        }
        saveSettingsExtra({ selected_theme: theme, theme_mode: darkOnly ? 'dark' : (html.classList.contains('dark') ? 'dark' : 'light') });
        const preview = el.querySelector('.theme-preview');
        if (preview) {
          preview.style.transform = 'scale(1.06)';
          setTimeout(() => preview.style.transform = '', 220);
        }
      }

      function toggleThemeAnim(enabled) {
        document.documentElement.style.setProperty('--transition-speed', enabled ? '0.35s' : '0s');
        localStorage.setItem('theme-anim', enabled ? '1' : '0');
      }

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

      function setLanguage(lang) {
        fetch('/save-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferred_language: lang })
        }).then(() => window.location.reload());
      }

      const helpData = ${JSON.stringify(HELP_PAGES_DATA)};
      function showHelpTopic(id) {
        document.querySelectorAll('.help-topic-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-id="' + id + '"]').classList.add('active');
        const topic = helpData.find(h => h.id === id);
        if (!topic) return;
        const isTr = '${currentLang}' === 'tr';
        document.getElementById('helpContent').innerHTML = 
          '<div class="help-section"><h4>' + (isTr ? topic.titleTr : topic.titleEn) + '</h4>' +
          (isTr ? topic.contentTr : topic.contentEn) + '</div>';
      }
      function filterHelp() {
        const q = document.getElementById('helpSearch').value.toLowerCase();
        document.querySelectorAll('.help-topic-btn').forEach(btn => {
          const name = btn.textContent.toLowerCase();
          btn.style.display = name.includes(q) ? 'flex' : 'none';
        });
      }

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
          showToast('En fazla 5 ilgi alanı ekleyebilirsiniz.', 'error');
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
          container.innerHTML = '<span class="opp-chips-empty">Henüz ilgi alanı eklenmedi</span>';
          return;
        }
        container.innerHTML = oppInterests.map(t => {
          const safe = escapeHTML(t);
          return '<span class="opp-chip">' + safe +
            '<button type="button" data-remove="' + safe + '" title="Sil">×</button></span>';
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
        const hasLangs = getSelectedLangs().length > 0;
        const hasInterests = oppInterests.length > 0;
        btn.disabled = !(hasLangs && hasInterests);
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
          showToast('Lütfen en az bir dil seçin.', 'error');
          return;
        }

        openOppStep2();
        const inp = document.getElementById('opp-results-search');
        if (inp) inp.value = q;

        const meta = document.getElementById('opp-results-meta');
        const list = document.getElementById('opp-list');
        if (meta) meta.textContent = q + ' (' + langs.join(', ') + ')';
        if (list) list.innerHTML = buildSkeletonCards(5);

        try {
          const res = await fetch('/opportunity-videos?q=' + encodeURIComponent(q) + '&lang=' + encodeURIComponent(langs.join(',')));
          const data = await res.json();

          if (!data.success) {
            if (data.error === 'NO_API_KEY') {
              if (list) list.innerHTML =
                '<div class="opp-empty-state">' +
                  '<div class="opp-empty-icon">🔑</div>' +
                  '<div class="opp-empty-title">YouTube API Key Eksik</div>' +
                  '<div class="opp-empty-sub">Opportunity Funnel özelliğini kullanabilmek için Ayarlar panelinden geçerli bir API anahtarı eklemelisiniz.</div>' +
                  '<button type="button" class="opp-empty-link" onclick="closeModal(\\'opportunityModal\\'); openModal(\\'settingsModal\\');">⚙️ Ayarlar\\'a Git</button>' +
                '</div>';
              if (meta) meta.textContent = '';
              return;
            }
            const errMsg = escapeHTML(data.message || data.error || 'unknown');
            if (list) list.innerHTML =
              '<div class="opp-error-state">' +
                '<div><strong>⚠️ Arama Hatası</strong><br><small>' + errMsg + '</small></div>' +
                '<button type="button" onclick="searchOpportunities()">🔄 Yeniden Dene</button>' +
              '</div>';
            if (meta) meta.textContent = '';
            return;
          }

          const videos = Array.isArray(data.videos) ? data.videos : [];
          if (videos.length === 0) {
            if (list) list.innerHTML =
              '<div class="opp-empty-state">' +
                '<div class="opp-empty-icon">🔍</div>' +
                '<div class="opp-empty-title">Sonuç Bulunamadı</div>' +
                '<div class="opp-empty-sub">Aradığınız kriterlere uygun viral potansiyele sahip video bulunamadı. Lütfen başka anahtar kelimeler deneyin.</div>' +
              '</div>';
            if (meta) meta.textContent = '';
            return;
          }

          if (meta) meta.textContent = videos.length + ' video bulundu · "' + q + '"';

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
                'onmouseleave="oppHidePreview()">' +
              '<div class="opp-card-thumb"><img loading="lazy" src="' + safeThumb + '" alt=""></div>' +
              '<div class="opp-card-title-2">' + safeTitle + '</div>' +
              '<div class="opp-card-channel">' +
                '<span>📺</span><span class="opp-card-channel-name" title="' + safeChannel + '">' + safeChannel + '</span>' +
                '<span>·</span><span>' + fmtCount(v.subscribers) + ' subs</span>' +
              '</div>' +
              '<div class="opp-card-stats">' +
                '<span>👁 ' + fmtCount(v.views) + '</span>' +
                '<span>👍 ' + fmtCount(v.likes) + '</span>' +
              '</div>' +
              '<span class="opp-score-badge ' + cls + '">🔥 Skor: ' + v.score + '</span>' +
              '<button type="button" class="opp-desc-toggle" onclick="oppToggleDesc(this)">▾ Açıklama</button>' +
              '<div class="opp-desc-body" style="display:none;">' + (safeDesc || '<em>Açıklama yok</em>') + '</div>' +
              '<a class="opp-card-cta" href="' + ytUrl + '" target="_blank" rel="noopener">▶ Oynat</a>' +
              '<button type="button" class="opp-differentiate-btn" onclick="openDifferentiateModal(window.__oppVideos[' + idx + '])">✨ Özgünleştir</button>' +
            '</div>';
          }).join('');
 
          window.__oppVideos = videos;
        } catch (err) {
          if (list) list.innerHTML =
            '<div class="opp-error-state">' +
              '<div><strong>⚠️ Hata Oluştu</strong><br><small>' + escapeHTML(err && err.message ? err.message : String(err)) + '</small></div>' +
              '<button type="button" onclick="searchOpportunities()">🔄 Yeniden Dene</button>' +
            '</div>';
          if (meta) meta.textContent = '';
        }
      }
 
      function oppToggleDesc(btn) {
        const body = btn.nextElementSibling;
        if (!body) return;
        const open = body.style.display === 'block';
        body.style.display = open ? 'none' : 'block';
        btn.textContent = (open ? '▾ Açıklama' : '▴ Kapat');
      }
 
      function oppShowPreview(e, idx) {
        if (oppHoverTimer) clearTimeout(oppHoverTimer);
        const target = e.target || e.srcElement;
        const card = target ? target.closest('.opp-video-card') : null;
        oppHoverTimer = setTimeout(() => {
          const tip = document.getElementById('opp-hover-preview');
          const v = (window.__oppVideos || [])[idx];
          if (!tip || !v) return;
          tip.innerHTML =
            '<img src="' + escapeHTML(v.thumbnail) + '" alt="">' +
            '<div class="hp-meta">📺 ' + escapeHTML(v.channelTitle) + ' · ' + fmtCount(v.subscribers) + ' subs</div>' +
            '<div class="hp-title">' + escapeHTML(v.title) + '</div>' +
            '<div class="hp-desc">' + escapeHTML((v.description || '').slice(0, 320)) + '</div>';
          tip.style.display = 'block';
          
          if (card) {
            const rect = card.getBoundingClientRect();
            const pad = 8;
            const w = tip.offsetWidth || 320;
            const h = tip.offsetHeight || 220;
            
            // Pop-up'ı doğrudan videonun (kartın) üzerine yerleştiriyoruz (X: ortalanmış, Y: kartın tam üst kenarı)
            let x = rect.left + (rect.width - w) / 2;
            let y = rect.top;
            
            if (x + w + pad > window.innerWidth) x = window.innerWidth - w - pad;
            if (x < pad) x = pad;
            if (y + h + pad > window.innerHeight) y = window.innerHeight - h - pad;
            if (y < pad) y = pad;
            
            tip.style.left = x + 'px';
            tip.style.top = y + 'px';
          }
          
          requestAnimationFrame(() => tip.classList.add('visible'));
        }, 500);
      }
 
      function oppHidePreview() {
        if (oppHoverTimer) { clearTimeout(oppHoverTimer); oppHoverTimer = null; }
        const tip = document.getElementById('opp-hover-preview');
        if (!tip) return;
        tip.classList.remove('visible');
        setTimeout(() => { tip.style.display = 'none'; }, 180);
      }

      const OPP_LANG_OPTIONS = [
        { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'es', name: 'Español', flag: '🇪🇸' }
      ];
      let oppSelectedLangs = ['tr', 'en'];
      let oppDiffTarget = null;
      let oppDiffDuration = 'same';
      let oppDiffSubmitting = false;
      let oppDiffPendingJobId = null;

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
          if (getSelectedLangs().length <= 1) {
            showToast('En az bir dil seçili olmalıdır.', 'error');
            return;
          }
          node.classList.remove('checked');
          if (checkbox) checkbox.checked = false;
        }
        oppSelectedLangs = getSelectedLangs();
        updateSearchButton();
      }

      function openDifferentiateModal(video) {
        if (!video || !video.videoId) return;
        oppDiffTarget = video;
        oppDiffDuration = 'same';
        oppDiffSubmitting = false;
        document.getElementById('diff-preview-thumb').src = video.thumbnail || '';
        document.getElementById('diff-preview-title').textContent = video.title || '';
        document.getElementById('diff-preview-channel').textContent = (video.channelTitle || '') + ' · ' + (video.views || 0) + ' views';

        const sel = document.getElementById('diff-target-lang');
        if (sel) {
          const opts = OPP_LANG_OPTIONS.map((found) => {
            const label = found.flag + ' ' + found.name;
            return '<option value="' + escapeHTML(found.code) + '">' + escapeHTML(label) + '</option>';
          }).join('');
          sel.innerHTML = opts;
          sel.value = 'tr';
        }

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

        const submit = document.getElementById('diff-submit-btn');
        if (submit) {
          submit.disabled = false;
          submit.innerHTML = '✨ Özgünleştir & Üretimi Başlat';
        }

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
          showToast('Lütfen geçerli bir video seçin.', 'error');
          return;
        }
        const targetLang = document.getElementById('diff-target-lang').value;
        if (!targetLang) {
          showToast('Lütfen hedef dil seçin.', 'error');
          return;
        }
        const submit = document.getElementById('diff-submit-btn');
        oppDiffSubmitting = true;
        if (submit) {
          submit.disabled = true;
          submit.innerHTML = '<span class="spin">⏳</span> İşleniyor...';
        }

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
            showToast('Hata: ' + (data.error || 'unknown'), 'error');
            if (submit) {
              submit.disabled = false;
              submit.innerHTML = '✨ Özgünleştir & Üretimi Başlat';
            }
            return;
          }

          closeModal('differentiateModal');
          closeModal('opportunityModal');
          showToast(trMsg('Üretim otonom olarak sıraya alındı!', 'Production started autonomously!'), 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (err) {
          showToast('Hata: ' + (err && err.message ? err.message : err), 'error');
          if (submit) {
            submit.disabled = false;
            submit.innerHTML = '✨ Özgünleştir & Üretimi Başlat';
          }
        } finally {
          oppDiffSubmitting = false;
        }
      }

      let diffPollInterval = null;
      let diffPollStartTime = 0;
      const DIFF_POLL_INTERVAL_MS = 3000;
      const DIFF_POLL_TIMEOUT_MS = 5 * 60 * 1000;

      function pollDifferentiationStatus(jobId, submitBtn) {
        if (diffPollInterval) {
          clearInterval(diffPollInterval);
          diffPollInterval = null;
        }
        diffPollStartTime = Date.now();

        const poll = async () => {
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
              showToast(data.error || 'Bağlantı hatası', 'error');
              resetDiffSubmitBtn(submitBtn);
              return;
            }

            if (submitBtn) {
              const stageText = data.stage || 'İşleniyor';
              const progressText = (data.progress && data.progress > 0)
                ? ' (' + data.progress + '%)'
                : '';
              submitBtn.innerHTML = '<span class="spin">⏳</span> ' + stageText + progressText;
            }

            if (data.status === 'pending') {
              clearInterval(diffPollInterval);
              diffPollInterval = null;
              resetDiffSubmitBtn(submitBtn);
              closeModal('differentiateModal');
              showToast(trMsg('Başarıyla özgünleştirildi!', 'Successfully differentiated!'), 'success');
              
              fillJobForm({
                masterPrompt: data.masterPrompt,
                productionNotes: data.productionNotes,
                transcriptText: data.translatedText,
                materialPath: data.materialPath
              });
              
              document.querySelector('#jobForm')?.scrollIntoView({ behavior: 'smooth' });
              
            } else if (data.status === 'failed') {
              clearInterval(diffPollInterval);
              diffPollInterval = null;
              const errorMsg = data.error || 'Bilinmeyen hata';
              showDiffFailedState(errorMsg, jobId, submitBtn);
            }
          } catch (err) {
            console.error('[diff poll] network error:', err);
          }
        };

        poll();
        diffPollInterval = setInterval(poll, DIFF_POLL_INTERVAL_MS);
      }

      function resetDiffSubmitBtn(submitBtn) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '✨ Özgünleştir & Çevir';
        }
      }

      function showDiffTimeoutState(jobId, submitBtn) {
        const step1 = document.getElementById('diff-step1');
        if (!step1) return;

        const existingTimeout = document.getElementById('diff-timeout-warning');
        if (existingTimeout) existingTimeout.remove();

        const checkBtnSelector = submitBtn ? "'" + submitBtn.id + "'" : 'null';
        const warning = document.createElement('div');
        warning.id = 'diff-timeout-warning';
        warning.className = 'diff-timeout-warning';
        warning.innerHTML =
          '<p>⏳ İşlem zaman aşımına uğruyor. Lütfen arka plan durumunu kontrol edin.</p>' +
          '<button type="button" class="lang-btn" onclick="retryDiffStatusCheck(' + jobId + ', ' + checkBtnSelector + ')" style="width:auto;">Durumu Yeniden Sorgula</button>';
        step1.appendChild(warning);
      }

      function retryDiffStatusCheck(jobId, submitBtn) {
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
          '<p>❌ Hata Oluştu: ' + escapeHTML(errorMsg) + '</p>' +
          '<button type="button" class="lang-btn" onclick="retryDifferentiate()" style="width:auto;">Yeniden Dene</button>';
        step1.appendChild(errorDiv);
      }

      function retryDifferentiate() {
        const err = document.getElementById('diff-error-msg');
        if (err) err.remove();
        const warn = document.getElementById('diff-timeout-warning');
        if (warn) warn.remove();
        submitDifferentiate();
      }

      function showDiffReviewStep(jobId, data, submitBtn) {
        oppDiffPendingJobId = jobId;

        const step1 = document.getElementById('diff-step1');
        const step2 = document.getElementById('diff-step2');
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = '';

        const t2 = document.getElementById('diff-preview-thumb-step2');
        const ti2 = document.getElementById('diff-preview-title-step2');
        const tc2 = document.getElementById('diff-preview-channel-step2');
        const meta = data.sourceVideoMeta || (oppDiffTarget || {});
        if (t2) t2.src = meta.thumbnail || '';
        if (ti2) ti2.textContent = meta.title || '';
        if (tc2) tc2.textContent = (meta.channelTitle || '') + ' · ' + (meta.views || 0) + ' views';

        const origEl = document.getElementById('diff-original-text');
        const cleanEl = document.getElementById('diff-cleaned-text');
        const transEl = document.getElementById('diff-translated-text');
        if (origEl) origEl.textContent = data.originalText || '';
        if (cleanEl) cleanEl.textContent = data.cleanedText || '';
        if (transEl) transEl.value = data.translatedText || '';
        updateDiffCharCount();
      }

      async function resumeDifferentiation(jobId) {
        try {
          const res = await fetch('/differentiate-status/' + jobId);
          const data = await res.json();
          if (!data.success) {
            showToast(data.error || 'Bağlantı hatası', 'error');
            return;
          }

          openModal('differentiateModal');
          const step1 = document.getElementById('diff-step1');
          const step2 = document.getElementById('diff-step2');
          if (step1) step1.style.display = '';
          if (step2) step2.style.display = 'none';

          const submitBtn = document.getElementById('diff-submit-btn');
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spin">⏳</span> İşleniyor...';
          }

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

          if (data.status === 'pending') {
            fillJobForm({
                masterPrompt: data.masterPrompt,
                productionNotes: data.productionNotes,
                transcriptText: data.translatedText,
                materialPath: data.materialPath
            });
            closeModal('differentiateModal');
          } else if (data.status === 'processing_phase1') {
            pollDifferentiationStatus(jobId, submitBtn);
          } else if (data.status === 'failed') {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '✨ Özgünleştir & Çevir';
            }
            showDiffFailedState(data.error || 'İşlem başarısız oldu.', jobId, submitBtn);
          }
        } catch (err) {
          showToast('Hata oluştu.', 'error');
        }
      }

      function updateDiffCharCount() {
        const ta = document.getElementById('diff-translated-text');
        const out = document.getElementById('diff-char-count');
        if (!ta || !out) return;
        const n = (ta.value || '').length;
        out.textContent = n + ' karakter';
      }

      async function approveTranslation() {
        if (!oppDiffPendingJobId) {
          showToast('Kuyruk ID eksik.', 'error');
          return;
        }
        const ta = document.getElementById('diff-translated-text');
        const editedTranslation = ta ? (ta.value || '').trim() : '';
        if (!editedTranslation) {
          showToast('Lütfen çevrilmiş metni girin.', 'error');
          return;
        }
        const btn = document.getElementById('diff-approve-btn');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span class="spin">⏳</span> Onaylanıyor...';
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
            showToast('Hata: ' + (data.error || 'unknown'), 'error');
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = '✅ Onayla & Video Üret';
            }
          }
        } catch (err) {
          showToast('Hata: ' + (err && err.message ? err.message : err), 'error');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '✅ Onayla & Video Üret';
          }
        }
      }

      async function cancelDifferentiate() {
        if (!oppDiffPendingJobId) {
          closeModal('differentiateModal');
          return;
        }
        if (!confirm('İptal etmek istediğinize emin misiniz?')) return;
        try {
          const res = await fetch('/differentiate-cancel/' + oppDiffPendingJobId, { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast('Özgünleştirme iptal edildi.', 'success');
          } else {
            showToast('Hata: ' + (data.error || 'unknown'), 'error');
          }
        } catch (err) {
          showToast('Hata: ' + (err && err.message ? err.message : err), 'error');
        } finally {
          oppDiffPendingJobId = null;
          closeModal('differentiateModal');
        }
      }

      async function loadSettings() {
        const res = await fetch('/settings');
        const data = await res.json();
        if (data.success && data.user) {
          document.getElementById('setting_yt_key').value = data.user.youtube_api_key || '';
          document.getElementById('setting_grid').value = data.user.text_position_grid || 'top-left';
          document.getElementById('setting_tone').value = data.user.default_preset_tone || '';
          const lipsyncEl = document.getElementById('setting_apply_lipsync');
          if (lipsyncEl) lipsyncEl.checked = (data.user.apply_lipsync === undefined ? 1 : data.user.apply_lipsync) === 1;
          const endScreenEl = document.getElementById('setting_apply_end_screen');
          if (endScreenEl) endScreenEl.checked = (data.user.apply_end_screen === undefined ? 1 : data.user.apply_end_screen) === 1;
          if (data.user.personal_avatar_base64) {
            document.getElementById('setting_avatar_base64').value = data.user.personal_avatar_base64;
            document.getElementById('avatar_preview').innerHTML = '<img src="' + data.user.personal_avatar_base64 + '" style="max-width:80px;border-radius:50%;border:2px solid hsl(var(--primary));margin-top:0.5rem;">';
          }
          // Brand kit loading
          const primaryColorEl = document.getElementById('setting_brand_primary_color');
          if (primaryColorEl) primaryColorEl.value = data.user.brand_primary_color || '#00F2FE';
          const secondaryColorEl = document.getElementById('setting_brand_secondary_color');
          if (secondaryColorEl) secondaryColorEl.value = data.user.brand_secondary_color || '#9B51E0';
          const fontPathEl = document.getElementById('setting_brand_font_path');
          if (fontPathEl) fontPathEl.value = data.user.brand_font_path || '';
          if (data.user.brand_logo_base64) {
            const logoInput = document.getElementById('setting_brand_logo_base64');
            if (logoInput) logoInput.value = data.user.brand_logo_base64;
            const logoPreview = document.getElementById('brand_logo_preview');
            if (logoPreview) logoPreview.innerHTML = '<img src="' + data.user.brand_logo_base64 + '" style="max-width:80px;border-radius:4px;border:2px solid hsl(var(--primary));margin-top:0.5rem;">';
          }
          // Personal voice loading
          if (data.user.personal_voice_base64) {
            const voiceInput = document.getElementById('setting_personal_voice_base64');
            if (voiceInput) voiceInput.value = data.user.personal_voice_base64;
            const voicePreview = document.getElementById('personal_voice_preview');
            if (voicePreview) voicePreview.innerHTML = '🎵 Ses dosyası yüklü (' + Math.round(data.user.personal_voice_base64.length * 0.75 / 1024) + ' KB)';
          }
        }
      }

      async function saveSettings() {
        const keyEl = document.getElementById('setting_yt_key');
        const gridEl = document.getElementById('setting_grid');
        const toneEl = document.getElementById('setting_tone');
        const avatarEl = document.getElementById('setting_avatar_base64');
        if (!keyEl || !gridEl || !toneEl || !avatarEl) {
          showToast('Ayarlar formu eksik.', 'error');
          return;
        }
        const key = keyEl.value;
        const grid = gridEl.value;
        const tone = toneEl.value;
        const avatar = avatarEl.value || '';
        const lipsyncEl = document.getElementById('setting_apply_lipsync');
        const applyLipsync = lipsyncEl ? (lipsyncEl.checked ? 1 : 0) : 1;
        const endScreenEl = document.getElementById('setting_apply_end_screen');
        const applyEndScreen = endScreenEl ? (endScreenEl.checked ? 1 : 0) : 1;

        // Brand kit values
        const primaryColor = document.getElementById('setting_brand_primary_color')?.value || '#00F2FE';
        const secondaryColor = document.getElementById('setting_brand_secondary_color')?.value || '#FFFFFF';
        const fontPath = document.getElementById('setting_brand_font_path')?.value || '';
        const brandLogo = document.getElementById('setting_brand_logo_base64')?.value || '';
        const personalVoice = document.getElementById('setting_personal_voice_base64')?.value || '';

        const payload = { 
          youtube_api_key: key, 
          text_position_grid: grid, 
          default_preset_tone: tone, 
          apply_lipsync: applyLipsync, 
          apply_end_screen: applyEndScreen,
          brand_primary_color: primaryColor,
          brand_secondary_color: secondaryColor,
          brand_font_path: fontPath,
          brand_logo_base64: brandLogo,
          personal_voice_base64: personalVoice
        };
        if (avatar) payload.personal_avatar_base64 = avatar;
        
        const res = await fetch('/save-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          closeModal('settingsModal');
          showToast('Ayarlar başarıyla kaydedildi.', 'success');
        } else {
          showToast('Ayarlar kaydedilirken hata oluştu.', 'error');
        }
      }

      async function analyzeViralScore(jobId) {
        const btn = document.getElementById('viral-btn-' + jobId);
        const resultDiv = document.getElementById('viral_score_result_' + jobId);
        if (!btn || !resultDiv) return;

        btn.disabled = true;
        btn.innerHTML = '<span class="spin">⏳</span> AI Viralite Analizi Yapılıyor...';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="opacity:0.6;font-family:JetBrains Mono,monospace;">Kapak ve ilk 3 saniyelik kanca inceleniyor...</div>';

        try {
          const res = await fetch('/api/v1/jobs/' + jobId + '/viral-score', { method: 'POST' });
          const data = await res.json();
          if (data.success && data.analysis) {
            const { score, hookQuality, pacingFeedback, visualAppeal, suggestions } = data.analysis;
            resultDiv.innerHTML = 
              '<div style="font-weight:bold; color:hsl(var(--primary)); margin-bottom:8px; font-size: 1rem;">🔥 Analiz Tamamlandı (Skor: ' + score + '/100)</div>' +
              '<div style="margin-bottom:6px;"><strong>Kanca Kalitesi:</strong> ' + hookQuality + '</div>' +
              '<div style="margin-bottom:6px;"><strong>Tempo Değerlendirmesi:</strong> ' + pacingFeedback + '</div>' +
              '<div style="margin-bottom:6px;"><strong>Görsel Çekicilik:</strong> ' + visualAppeal + '</div>' +
              '<div style="margin-top:8px; font-weight:600;">💡 İyileştirme Tavsiyeleri:</div>' +
              '<ul style="margin-top:4px; padding-left:16px; list-style-type:disc; line-height: 1.4;">' +
                suggestions.map(s => '<li>' + s + '</li>').join('') +
              '</ul>';
            btn.innerHTML = '📈 AI Viralite Analizini Yenile';
            btn.disabled = false;
          } else {
            showToast('Viralite analizi hatası.', 'error');
            resultDiv.style.display = 'none';
            btn.disabled = false;
            btn.innerHTML = '📈 AI Viralite Analizi Yap';
          }
        } catch (err) {
          showToast('Bağlantı hatası.', 'error');
          resultDiv.style.display = 'none';
          btn.disabled = false;
          btn.innerHTML = '📈 AI Viralite Analizi Yap';
        }
      }

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

      function encodeAudioFileAsURL(element) {
        const file = element.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = function() {
          document.getElementById('setting_personal_voice_base64').value = reader.result;
          const preview = document.getElementById('personal_voice_preview');
          if (preview) preview.innerHTML = '🎵 Ses dosyası başarıyla yüklendi ve kodlandı (' + Math.round(file.size / 1024) + ' KB)';
        };
        reader.readAsDataURL(file);
      }

      function showToast(msg, type) {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:0.75rem 1.25rem;border-radius:0.5rem;font-family:"JetBrains Mono",monospace;font-size:0.8rem;font-weight:600;z-index:99999;animation:cardEntrance 0.3s ease;border:1px solid ' + (type === 'success' ? 'hsl(142,60%,50%)' : 'hsl(0,70%,50%)') + ';background:hsla(' + (type === 'success' ? '142,60%,10%' : '0,70%,10%') + ',0.95);color:' + (type === 'success' ? 'hsl(142,60%,60%)' : 'hsl(0,70%,60%)') + ';box-shadow:0 8px 24px rgba(0,0,0,0.3);';
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2500);
      }

      window.trackedJobs = new Set();

      window.trackJobProgress = function(jobId) {
        if (window.trackedJobs.has(jobId)) return;
        window.trackedJobs.add(jobId);

        const es = new EventSource('/api/v1/progress/stream?jobId=' + jobId);
        
        es.onmessage = function(event) {
          const data = JSON.parse(event.data);
          
          let displayStage = data.stage || '';
          if (data.stageKey && window.i18n[data.stageKey]) {
            displayStage = window.i18n[data.stageKey];
            if (data.stageKey === 'stageSceneGenerating') {
              displayStage = displayStage.replace('{{sceneNumber}}', data.sceneNumber || '?');
            }
            if (data.stageKey === 'stageDockerProgress') {
              displayStage = displayStage.replace('{{dockerMessage}}', data.dockerMessage || data.dockerStage || '');
            }
          }
          
          const term = document.getElementById('rabbitmq-terminal');
          const termLog = document.getElementById('rabbitmq-log-content');
          if (term && termLog && displayStage) {
            term.style.display = 'block';
            const placeholder = document.getElementById('rabbitmq-placeholder');
            if (placeholder) placeholder.remove();
            const time = new Date().toLocaleTimeString();
            const logLine = document.createElement('div');
            logLine.style.marginBottom = '4px';
            let pctVal = data.percent || 0;
            if (data.stageKey === 'stageDockerProgress' && data.dockerPercent !== undefined) {
              pctVal = data.dockerPercent;
            }
            let logText = '[' + time + '] [RABBITMQ] Job ' + jobId + ' -> ' + displayStage + ' (' + pctVal + '%)';
            if (data.dockerMessage) logText += ' | ' + data.dockerMessage + (data.etaSeconds ? ' [ETA:' + data.etaSeconds + 's]' : '');
            logLine.textContent = logText;
            termLog.appendChild(logLine);
            term.scrollTop = term.scrollHeight;
          }

          const card = document.getElementById('job-card-' + jobId);
          if (!card) return;
          const badge = card.querySelector('.status-badge');
          if (badge && displayStage) {
            let badgePct = data.percent || 0;
            if (data.stageKey === 'stageDockerProgress' && data.dockerPercent !== undefined) {
              badgePct = data.dockerPercent;
            }
            badge.textContent = displayStage + ' (' + badgePct + '%)';
            badge.className = 'status-badge status-processing';
          }
          const fill = document.getElementById('progress-fill-' + jobId);
          if (fill && data.percent !== undefined) fill.style.width = data.percent + '%';
          const msg = document.getElementById('status-msg-' + jobId);
          if (msg && data.est_min !== undefined) msg.textContent = 'Tahmini: ' + data.est_min + ' dk';
          if (data.stageKey === 'stageCompleted' || data.stageKey === 'stageError' || data.stageKey === 'stageCancelled' || displayStage === 'Tamamlandı' || displayStage === 'Hata Oluştu') {
            es.close();
            window.trackedJobs.delete(jobId);
            if (data.finalFilename) {
              const a = document.createElement('a'); a.href = '/videolar/' + data.finalFilename; a.download = data.finalFilename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
            }
            setTimeout(() => window.location.reload(), 2000);
          }
          if (data.stage === 'Hata Verdi' || data.stage === 'Error') {
            es.close();
            window.trackedJobs.delete(jobId);
            setTimeout(() => window.location.reload(), 2000);
          }
        };

        es.onerror = function() {
          es.close();
          window.trackedJobs.delete(jobId);
          setTimeout(() => {
            window.trackJobProgress(jobId);
          }, 5000);
        };
      };

      const activeJobs = ${JSON.stringify(queueJobs.filter((j) => j.status === 'pending' || j.status === 'processing' || j.status === 'processing_phase1').map((j) => j.id))};
      activeJobs.forEach(jobId => {
        window.trackJobProgress(jobId);
      });

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
        showToast(result.success ? 'Metinler başarıyla güncellendi.' : 'Hata oluştu.', result.success ? 'success' : 'error');
      }

      async function publish(jobId, platform) {
        showToast(platform.toUpperCase() + ' paylaşımı başlatıldı...', 'success');
        const res = await fetch('/publish/' + jobId + '/' + platform, { method: 'POST' });
        const result = await res.json();
        const pubMsg = result.success ? platform.toUpperCase() + ' başarıyla yüklendi.' : platform.toUpperCase() + ' yüklenirken hata oluştu.';
        showToast(pubMsg, result.success ? 'success' : 'error');
        if (result.success) setTimeout(() => window.location.reload(), 1500);
      }

      // LoRA toggle - show/hide options
      document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'loraEnabled') {
          const loraOptions = document.getElementById('loraOptions');
          if (loraOptions) loraOptions.style.display = e.target.checked ? 'block' : 'none';
          if (e.target.checked) loadPretrainedList();
        }
      });

      function loadPretrainedList() {
        fetch('/api/v1/lora/pretrained')
          .then(function(r) { return r.json(); })
          .then(function(resp) {
            if (!resp.success) return;
            var sel = document.getElementById('pretrainedLoraSelect');
            if (!sel) return;
            var existing = sel.querySelectorAll('option:not([value=""])');
            existing.forEach(function(o) { o.remove(); });
            resp.data.forEach(function(lora) {
              var opt = document.createElement('option');
              opt.value = lora.id;
              opt.setAttribute('data-source', lora.source || '');
              opt.textContent = lora.name + ' (' + lora.type + ')';
              sel.appendChild(opt);
            });
          })
          .catch(function() {});
      }

      document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'loadPretrainedBtn') {
          var sel = document.getElementById('pretrainedLoraSelect');
          if (!sel || !sel.value) return;
          var status = document.getElementById('pretrainedStatus');
          if (status) status.textContent = 'Loading...';
          fetch('/api/v1/lora/pretrained/load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hf_repo: sel.value })
          })
          .then(function(r) { return r.json(); })
          .then(function(resp) {
            if (status) {
              if (resp.success) status.textContent = '✅ Loaded: ' + (resp.data && resp.data.weights_path ? resp.data.weights_path : '');
              else status.textContent = '❌ Failed to load';
            }
          })
          .catch(function() { if (status) status.textContent = '❌ Error'; });
        }
      });

      document.getElementById('jobForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const origText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ İşlem yapılıyor...';

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.platforms = formData.getAll('platforms');
        data.has_shorts = formData.get('has_shorts') === 'on';
        data.has_subtitles = formData.get('has_subtitles') === 'on';

        // Append LoRA-related fields
        var loraCb = document.getElementById('loraEnabled');
        if (loraCb && loraCb.checked) {
          var charFiles = document.getElementById('characterImages');
          if (charFiles && charFiles.files && charFiles.files.length > 0) {
            for (var i = 0; i < charFiles.files.length; i++) {
              formData.append('character_images', charFiles.files[i]);
            }
          }
          var multiCb = document.getElementById('multiCharacter');
          if (multiCb && multiCb.checked) {
            formData.append('multi_character', '1');
          }
        }
        
        const editJobInput = document.getElementById('edit_job_id');
        const editJobId = editJobInput ? editJobInput.value : '';

        try {
          let res;
          if (editJobId) {
            res = await fetch('/start-job/' + editJobId, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                 master_prompt: data.master_prompt,
                 production_notes: data.production_notes,
                 transcript_translated: data.transcript_text
              })
            });
            const result = await res.json();
            if (result.success) {
              window.location.reload();
            } else {
              showToast(result.error || 'Hata oluştu', 'error');
              submitBtn.disabled = false;
              submitBtn.innerHTML = origText;
            }
          } else {
            res = await fetch('/create-job', {
              method: 'POST',
              body: formData
            });
            if (res.ok) {
              window.location.reload();
            } else {
              const result = await res.json().catch(() => ({ error: 'Hata oluştu' }));
              showToast(result.error || 'Hata oluştu', 'error');
              submitBtn.disabled = false;
              submitBtn.innerHTML = origText;
            }
          }
        } catch (err) {
          showToast((err && err.message) ? err.message : 'Bağlantı hatası', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      });

      async function deleteJob(jobId) {
        const res = await fetch('/delete-job/' + jobId, { method: 'POST' });
        const result = await res.json();
        if (result.success) { showToast('Proje silindi.', 'success'); window.location.reload(); }
        else { showToast('Silme hatası oluştu.', 'error'); }
      }

      async function retryJob(jobId) {
        const res = await fetch('/retry-job/' + jobId, { method: 'POST' });
        const result = await res.json();
        if (result.success) { showToast('Kuyruğa yeniden eklendi.', 'success'); window.location.reload(); }
        else { showToast('Hata oluştu.', 'error'); }
      }

      async function startJob(jobId) {
        try {
          const res = await fetch('/start-job/' + jobId, { method: 'POST' });
          const result = await res.json();
          if (result.success) {
            showToast('İş kuyruğa eklendi.', 'success');
            window.location.reload();
          } else {
            showToast(result.error || 'Hata oluştu', 'error');
          }
        } catch (err) {
          showToast('Bağlantı hatası', 'error');
        }
      }

      async function cancelJob(jobId) {
        try {
          const res = await fetch('/cancel-job/' + jobId, { method: 'POST' });
          const result = await res.json();
          if (result.success) {
            showToast('İş iptal edildi.', 'success');
            window.location.reload();
          } else {
            showToast(result.error || 'Hata oluştu', 'error');
          }
        } catch (err) {
          showToast('Bağlantı hatası', 'error');
        }
      }

      async function cancelPublish(jobId, platform) {
        if (!confirm(platform.toUpperCase() + ' paylaşımını iptal etmek istediğinize emin misiniz?')) return;
        showToast(platform.toUpperCase() + ' paylaşımı iptal ediliyor...', 'success');
        try {
          const res = await fetch('/cancel-publish/' + jobId + '/' + platform, { method: 'POST' });
          const result = await res.json();
          if (result.success) {
            showToast('Paylaşım iptal edildi.', 'success');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            showToast('Hata: ' + (result.error || 'unknown'), 'error');
          }
        } catch (err) {
          showToast('Bağlantı hatası', 'error');
        }
      }

      document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openModal('helpModal'); }
        if (e.key === 'Escape') closeAllModals();
      });

      const savedTheme = '${currentTheme}';
      if (savedTheme !== 'default') document.documentElement.classList.add('theme-' + savedTheme);

      function renderDockerBadge() {
        const label = document.getElementById('dockerLabel');
        const dot = document.getElementById('dockerDot');
        if (!label) return;
        label.textContent = '🟢 Docker';
        if (dot) dot.style.background = 'hsl(142,70%,50%)';
      }

      async function pollDockerStatus() {
        try {
          const res = await fetch('/docker-status', { credentials: 'same-origin' });
          if (!res.ok) { renderDockerBadge(); return; }
          const state = await res.json();
          const label = document.getElementById('dockerLabel');
          if (label) {
            if (state.healthy) {
              label.textContent = '🟢 Docker';
            } else {
              label.textContent = '🟡 Docker Kısmi';
            }
          }
        } catch {
          renderDockerBadge();
        }
      }

      setInterval(pollDockerStatus, 30000);
      void pollDockerStatus();

      async function selectCover(jobId, coverIndex, element) {
        try {
          const res = await fetch('/select-cover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: parseInt(jobId, 10), coverIndex })
          });
          const data = await res.json();
          if (data.success) {
            showToast(trMsg('Kapak resmi başarıyla güncellendi.', 'Cover image updated successfully.'), 'success');
            const container = element.parentElement;
            container.querySelectorAll('.cover-option-card').forEach((card, idx) => {
              card.classList.toggle('active', idx === coverIndex);
              card.style.borderColor = idx === coverIndex ? 'hsl(var(--primary))' : 'hsla(var(--border), 0.3)';
              const label = card.querySelector('div');
              if (label) {
                label.textContent = idx === coverIndex ? trMsg('✓ Seçili Kapak', '✓ Selected Cover') : trMsg('Kapak Alternatif ', 'Cover Alternative ') + (idx + 1);
              }
            });
          } else {
            showToast(data.error || 'Kapak güncellenemedi.', 'error');
          }
        } catch (err) {
          showToast('Bağlantı hatası.', 'error');
        }
      }

      void pollDockerStatus();

      // ── Payment / Kredi ──

      async function fetchCredits() {
        try {
          const res = await fetch('/api/v1/user/credits');
          if (!res.ok) return;
          const data = await res.json();
          const el = document.getElementById('headerCredits');
          if (el) el.textContent = data.credits ?? data.credits === 0 ? String(data.credits) : '0';
        } catch { /* ignore */ }
      }

      function openPaymentModal() {
        document.getElementById('paymentOptions').style.display = '';
        document.getElementById('iyzico-iframe-wrapper').style.display = 'none';
        openModal('paymentModal');
        fetchSubscriptionStatus();
      }

      async function fetchSubscriptionStatus() {
        try {
          const res = await fetch('/api/v1/subscriptions/status');
          const data = await res.json();
          let subHtml = '';
          if (data.success && data.data) {
            const sub = data.data;
            subHtml = '<div style="margin-top:1rem;padding:1rem;border:1px solid hsla(var(--primary),0.3);border-radius:0.75rem;background:hsla(var(--primary),0.05);">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">' +
              '<div><strong>Aktif Abonelik:</strong> ' + trMsg('G\u00fcm\u00fc\u015f', 'Silver') + '</div>' +
              '<span style="display:inline-block;background:hsl(142,70%,50%);color:#000;font-size:0.7rem;font-weight:700;padding:1px 6px;border-radius:99px;margin-left:0.4rem;">' + trMsg('Aktif', 'Active') + '</span>' +
              '<button class="btn-publish" style="font-size:0.75rem;padding:0.3rem 0.8rem;background:hsla(0,70%,50%,0.15);color:hsl(0,70%,60%);border:1px solid hsla(0,70%,50%,0.3);" onclick="cancelSubscription()">' + trMsg('\u0130ptal Et', 'Cancel') + '</button>' +
              '</div></div>';
          } else {
            subHtml = '<div style="margin-top:0.8rem;font-size:0.8rem;color:hsl(var(--muted-foreground));text-align:center;">' + trMsg('Aktif aboneli\u011finiz bulunmuyor.', 'No active subscription.') + '</div>';
          }
          // Eski status varsa replace, yoksa append
          let existing = document.getElementById('sub-status-bar');
          if (!existing) {
            existing = document.createElement('div');
            existing.id = 'sub-status-bar';
            document.getElementById('paymentOptions').after(existing);
          }
          existing.innerHTML = subHtml;
        } catch (err) {
          console.error('Abonelik sorgulama hatası:', err);
        }
      }

      async function cancelSubscription() {
        if (!confirm(trMsg('Aboneliğiniz iptal edilecek. Emin misiniz?', 'Your subscription will be cancelled. Are you sure?'))) return;
        try {
          const res = await fetch('/api/v1/subscriptions/cancel', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast(trMsg('Abonelik iptal edildi.', 'Subscription cancelled.'), 'success');
            fetchSubscriptionStatus();
          } else {
            showToast(data.error || trMsg('İptal başarısız.', 'Cancel failed.'), 'error');
          }
        } catch (err) {
          showToast(trMsg('Bağlantı hatası.', 'Connection error.'), 'error');
        }
      }

      async function initiateIyzicoPayment(packageId) {
        const optionsEl = document.getElementById('paymentOptions');
        const iframeWrapper = document.getElementById('iyzico-iframe-wrapper');
        const checkoutForm = document.getElementById('iyzipay-checkout-form');
        const loadingEl = document.getElementById('payment-loading');

        optionsEl.style.display = 'none';
        iframeWrapper.style.display = '';
        if (loadingEl) loadingEl.style.display = '';

        try {
          const res = await fetch('/api/v1/payments/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packageId }),
          });
          const data = await res.json();

          if (data.status === 'success' && data.checkoutFormContent) {
            if (loadingEl) loadingEl.style.display = 'none';
            checkoutForm.innerHTML = data.checkoutFormContent;

            const scripts = checkoutForm.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
              const oldScript = scripts[i];
              const newScript = document.createElement('script');
              if (oldScript.src) {
                newScript.src = oldScript.src;
              } else {
                newScript.textContent = oldScript.textContent;
              }
              oldScript.parentNode.replaceChild(newScript, oldScript);
            }
          } else {
            showToast(data.error || trMsg('Ödeme formu yüklenemedi.', 'Payment form failed to load.'), 'error');
            openPaymentModal();
          }
        } catch (err) {
          showToast(trMsg('Bağlantı hatası.', 'Connection error.'), 'error');
          openPaymentModal();
        }
      }

      // Handle payment redirect (iyzico webhook → ?payment=...)
      (function() {
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');
        if (paymentStatus === 'success') {
          fetchCredits();
          showToast(trMsg('Ödeme başarılı! Kredileriniz yüklendi 🎉', 'Payment successful! Credits loaded 🎉'), 'success');
          window.history.replaceState({}, '', window.location.pathname);
        } else if (paymentStatus === 'failed' || paymentStatus === 'error') {
          showToast(trMsg('Ödeme başarısız oldu. Tekrar deneyin.', 'Payment failed. Please try again.'), 'error');
          window.history.replaceState({}, '', window.location.pathname);
        } else if (paymentStatus === 'user_not_found') {
          showToast(trMsg('Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.', 'User not found. Please login again.'), 'error');
          window.history.replaceState({}, '', window.location.pathname);
        }
      })();

      // Fetch credits on load
      fetchCredits();
    </script>
  `;
}
