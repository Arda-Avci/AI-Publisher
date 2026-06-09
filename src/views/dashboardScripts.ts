export function getDashboardScripts(params: {
  t: Record<string, string>;
  queueJobs: any[];
  currentLang: string;
  currentTheme: string;
  HELP_PAGES_DATA: any[];
}): string {
  const { t, queueJobs, currentLang, currentTheme, HELP_PAGES_DATA } = params;
  return `
    <script>
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
                'onmouseleave="oppHidePreview()" ' +
                'onmousemove="oppMovePreview(event)">' +
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
        let x = e.clientX - (w / 2);
        let y = e.clientY - h - pad;
        if (x + w + pad > window.innerWidth) x = window.innerWidth - w - pad;
        if (x < pad) x = pad;
        if (y < pad) y = e.clientY + pad;
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
          submit.innerHTML = '✨ Özgünleştir & Çevir';
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
              submit.innerHTML = '✨ Özgünleştir & Çevir';
            }
            return;
          }

          oppDiffPendingJobId = data.jobId;
          pollDifferentiationStatus(data.jobId, submit);
        } catch (err) {
          showToast('Hata: ' + (err && err.message ? err.message : err), 'error');
          if (submit) {
            submit.disabled = false;
            submit.innerHTML = '✨ Özgünleştir & Çevir';
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
          showToast('Ayarlar başarıyla kaydedildi.', 'success');
        } else {
          showToast('Ayarlar kaydedilirken hata oluştu.', 'error');
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

      function showToast(msg, type) {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:0.75rem 1.25rem;border-radius:0.5rem;font-family:"JetBrains Mono",monospace;font-size:0.8rem;font-weight:600;z-index:99999;animation:cardEntrance 0.3s ease;border:1px solid ' + (type === 'success' ? 'hsl(142,60%,50%)' : 'hsl(0,70%,50%)') + ';background:hsla(' + (type === 'success' ? '142,60%,10%' : '0,70%,10%') + ',0.95);color:' + (type === 'success' ? 'hsl(142,60%,60%)' : 'hsl(0,70%,60%)') + ';box-shadow:0 8px 24px rgba(0,0,0,0.3);';
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2500);
      }

      const activeJobs = ${JSON.stringify(queueJobs.map(j => j.id))};
      activeJobs.forEach(jobId => {
        const es = new EventSource('/progress/' + jobId);
        es.onmessage = function(event) {
          const data = JSON.parse(event.data);
          
          let displayStage = data.stage || '';
          if (data.stageKey && window.i18n[data.stageKey]) {
            displayStage = window.i18n[data.stageKey];
            if (data.stageKey === 'stageSceneGenerating') {
              displayStage = displayStage.replace('{{sceneNumber}}', data.sceneNumber || '?');
            }
            if (data.stageKey === 'stageColabProgress') {
              displayStage = displayStage.replace('{{colabMessage}}', data.colabMessage || data.colabStage || '');
            }
          }
          
          const term = document.getElementById('rabbitmq-terminal');
          const termLog = document.getElementById('rabbitmq-log-content');
          if (term && termLog && displayStage) {
            term.style.display = 'block';
            const time = new Date().toLocaleTimeString();
            const logLine = document.createElement('div');
            logLine.style.marginBottom = '4px';
            let logText = '[' + time + '] [RABBITMQ] Job ' + jobId + ' -> ' + displayStage + ' (' + (data.percent || 0) + '%)';
            if (data.colabMessage) logText += ' | ' + data.colabMessage + (data.etaSeconds ? ' [ETA:' + data.etaSeconds + 's]' : '');
            logLine.textContent = logText;
            termLog.appendChild(logLine);
            term.scrollTop = term.scrollHeight;
          }

          const card = document.getElementById('job-card-' + jobId);
          if (!card) return;
          const badge = card.querySelector('.status-badge');
          if (badge && displayStage) { badge.textContent = displayStage + ' (' + (data.percent || 0) + '%)'; badge.className = 'status-badge status-processing'; }
          const fill = document.getElementById('progress-fill-' + jobId);
          if (fill && data.percent !== undefined) fill.style.width = data.percent + '%';
          const msg = document.getElementById('status-msg-' + jobId);
          if (msg && data.est_min !== undefined) msg.textContent = 'Tahmini: ' + data.est_min + ' dk';
          if (data.stageKey === 'stageCompleted' || data.stageKey === 'stageError' || data.stageKey === 'stageCancelled' || displayStage === 'Tamamlandı' || displayStage === 'Hata Oluştu') {
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
        ['colab-stopped','colab-starting','colab-running','colab-stopping','colab-error'].forEach(c => badge.classList.remove(c));
        const status = state && state.status ? state.status : 'stopped';
        badge.classList.add('colab-' + status);

        const isTr = '${currentLang}' === 'tr';
        if (status === 'stopped') {
          label.textContent = '⚫ Colab';
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
        const startBtn = document.querySelector('.colab-action-start');
        const stopBtn = document.querySelector('.colab-action-stop');
        if (startBtn) startBtn.disabled = (status === 'starting' || status === 'stopping' || status === 'running');
        if (stopBtn) stopBtn.disabled = (status === 'stopped' || status === 'starting' || status === 'stopping');
      }

      async function pollColabStatus() {
        try {
          const res = await fetch('/colab-status', { credentials: 'same-origin' });
          if (!res.ok) return;
          const state = await res.json();
          renderColabBadge(state);
        } catch (err) {
        }
      }

      function startColabSSE() {
        if (colabEventSource) {
          try { colabEventSource.close(); } catch {}
          colabEventSource = null;
        }
        if (colabReconnectTimer) {
          clearTimeout(colabReconnectTimer);
          colabReconnectTimer = null;
        }
        if (typeof EventSource === 'undefined') {
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

      document.addEventListener('click', function(e) {
        if (!colabPopoverOpen) return;
        const wrap = document.getElementById('colabStatusWrap');
        if (wrap && !wrap.contains(e.target)) closeColabPopover();
      });

      async function manualColabStart() {
        showToast('Colab GPU başlatılıyor...', 'success');
        try {
          const res = await fetch('/colab-start', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast('Başlatma sinyali gönderildi.', 'success');
          } else {
            showToast('Hata: ' + (data.error || 'unknown'), 'error');
          }
        } catch (err) {
          showToast('Bağlantı hatası.', 'error');
        }
      }

      async function manualColabStop() {
        showToast('Colab GPU durduruluyor...', 'success');
        try {
          const res = await fetch('/colab-stop', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast('Durdurma sinyali gönderildi.', 'success');
          } else {
            showToast('Hata: ' + (data.error || 'unknown'), 'error');
          }
        } catch (err) {
          showToast('Bağlantı hatası.', 'error');
        }
      }

      startColabSSE();
    </script>
  `;
}
