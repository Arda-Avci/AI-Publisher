import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header.js';
import { ProjectForm } from './components/ProjectForm.js';
import { StudioPanel } from './components/StudioPanel.js';
import { GalleryPanel } from './components/GalleryPanel.js';
import { PhotoEditor } from './components/PhotoEditor.js';
import { LandingPage } from './components/LandingPage.js';
import { CharacterSelectorModal, extractCharacterNames } from './components/CharacterSelectorModal.js';
import type { Scene } from './components/Timeline.js';
import type { OpportunityVideo } from './components/Opportunities.js';
import type { Job, UserCredits, Language, Tab, ProductionTemplate, TtsProvider, Platform } from './types.js';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [language, setLanguage] = useState<Language>('tr');
  const [theme, setTheme] = useState('default');
  const [isDark, setIsDark] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [masterPrompt, setMasterPrompt] = useState('');
  const [productionNotes, setProductionNotes] = useState('');
  const [characterFeatures, setCharacterFeatures] = useState('');
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>('edge');
  const [ttsVoice, setTtsVoice] = useState('tr-TR-AhmetNeural');
  const [productionTemplate, setProductionTemplate] = useState<ProductionTemplate>('cinematic');
  const [hasShorts, setHasShorts] = useState(true);
  const [hasSubtitles, setHasSubtitles] = useState(true);
  const [brandKitEnabled, setBrandKitEnabled] = useState(false);
  const [kineticSubtitles, setKineticSubtitles] = useState(false);
  const [autoSfxPlacement, setAutoSfxPlacement] = useState(false);
  const [audioDucking, setAudioDucking] = useState(false);
  const [targetPlatforms, setTargetPlatforms] = useState<Platform[]>(['youtube']);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMusicFile, setSelectedMusicFile] = useState<File | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [metaYtTitle, setMetaYtTitle] = useState('');
  const [metaYtDesc, setMetaYtDesc] = useState('');
  const [metaYtTags, setMetaYtTags] = useState('');
  const [isMetaSaving, setIsMetaSaving] = useState(false);
  const [editingImageScene, setEditingImageScene] = useState<Scene | null>(null);
  const [charModalOpen, setCharModalOpen] = useState(false);
  const [charDetectedNames, setCharDetectedNames] = useState<string[]>([]);
  const [charPendingFormData, setCharPendingFormData] = useState<FormData | null>(null);
  const [existingCharacters, setExistingCharacters] = useState<any[]>([]);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [selectedModel, setSelectedModel] = useState('Publisher Cinematic V3');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [camIntensity, setCamIntensity] = useState(0.75);

  const t = useCallback((key: string, params?: Record<string, any>) => {
    let text = translations[key] || key;
    if (params) Object.entries(params).forEach(([k, v]) => text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v)));
    return text;
  }, [translations]);

  useEffect(() => { fetchSession(); }, []);
  useEffect(() => { fetchTranslations(); }, [language]);
  useEffect(() => { if (isLoggedIn) { fetchCredits(); const i = setInterval(fetchCredits, 15000); return () => clearInterval(i); } }, [isLoggedIn]);
  useEffect(() => { if (isLoggedIn) fetchJobs(); }, [isLoggedIn]);
  useEffect(() => { if (selectedJob) { fetchScenes(selectedJob.id); setupProgressStream(selectedJob.id); } else closeProgressStream(); return () => closeProgressStream(); }, [selectedJob]);
  useEffect(() => { const r = document.documentElement; r.className = `theme-${theme}`; if (isDark) r.classList.add('dark'); else r.classList.remove('dark'); }, [theme, isDark]);

  const fetchSession = async () => {
    try {
      const r = await fetch('/api/v1/csrf'); const d = await r.json();
      if (d.csrfToken) setCsrfToken(d.csrfToken);
      const r2 = await fetch('/api/v1/session'); const d2 = await r2.json();
      if (d2.userId) { setIsLoggedIn(true); if (d2.theme) setTheme(d2.theme); if (d2.lang) setLanguage(d2.lang); if (d2.isDark !== undefined) setIsDark(d2.isDark); }
      else setIsLoggedIn(false);
    } catch { setIsLoggedIn(false); }
  };

  const fetchTranslations = async () => { try { const r = await fetch(`/api/v1/locales?lang=${language}`); setTranslations(await r.json()); } catch {} };
  const fetchCredits = async () => { try { const r = await fetch('/api/v1/user/credits'); const d = await r.json(); if (d.success) setUserCredits({ credits: d.credits, limit: d.limit, resetDate: d.resetDate }); } catch {} };
  const fetchJobs = async () => { try { const r = await fetch('/api/v1/jobs'); const d = await r.json(); if (Array.isArray(d)) setJobs(d); else if (d.success && Array.isArray(d.jobs)) setJobs(d.jobs); } catch {} };
  const fetchScenes = async (id: number) => { try { const r = await fetch(`/api/v1/jobs/${id}/scenes`); const d = await r.json(); if (d.success) setScenes(d.scenes || []); } catch {} };

  const handleLoginDirect = async (u: string, p: string) => {
    setAuthError('');
    try {
      const r = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ username: u, password: p }) });
      const d = await r.json();
      if (d.success) { setIsLoggedIn(true); fetchSession(); } else { setAuthError(d.error || 'Giriş başarısız.'); throw new Error(d.error); }
    } catch (e: any) { setAuthError(e.message || 'Sunucu hatası.'); throw e; }
  };

  const handleLogout = async () => { try { await fetch('/logout', { method: 'POST', headers: { 'x-csrf-token': csrfToken } }); } catch {} setIsLoggedIn(false); setSelectedJob(null); };

  const setupProgressStream = (jobId: number) => {
    closeProgressStream();
    const es = new EventSource(`/api/v1/progress/stream?jobId=${jobId}`);
    es.onmessage = (e) => { try { const d = JSON.parse(e.data); if (d.stageKey) { setProgressMsg(d.colabMessage || d.stageKey); setProgressPercent(d.percent || 0); if (d.etaSeconds !== undefined) setEtaSeconds(d.etaSeconds); } if (d.stageKey === 'stageCompleted') { fetchJobs(); fetchScenes(jobId); closeProgressStream(); } } catch {} };
    es.onerror = () => { setTimeout(() => { if (selectedJob && selectedJob.id === jobId && selectedJob.status === 'processing') setupProgressStream(jobId); }, 5000); };
    eventSourceRef.current = es;
  };

  const closeProgressStream = () => { if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; } setProgressMsg(''); setProgressPercent(0); setEtaSeconds(null); };

  const handleUpdateScenes = async (updatedScenes: Scene[]) => {
    if (!selectedJob) return; setScenes(updatedScenes);
    try { await fetch(`/api/v1/jobs/${selectedJob.id}/scenes`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ scenes: updatedScenes }) }); } catch {}
  };

  const handleRegenerateScene = async (sceneId: number) => {
    if (!selectedJob) return;
    try { setProgressMsg('Sahne yeniden üretiliyor...'); const r = await fetch(`/api/v1/jobs/${selectedJob.id}/scenes/${sceneId}/regenerate`, { method: 'POST', headers: { 'x-csrf-token': csrfToken } }); const d = await r.json(); if (d.success) { fetchJobs(); fetchScenes(selectedJob.id); } else alert('Yeniden üretim hatası: ' + d.error); } catch (e: any) { alert('İletişim hatası: ' + e.message); }
  };

  const handleAddScene = async () => { if (!selectedJob) return; try { const r = await fetch(`/api/v1/jobs/${selectedJob.id}/scenes/add`, { method: 'POST', headers: { 'x-csrf-token': csrfToken } }); if ((await r.json()).success) fetchScenes(selectedJob.id); } catch {} };
  const handleDeleteScene = async (sceneId: number) => { if (!selectedJob) return; if (!confirm('Bu sahneyi silmek istediğinize emin misiniz?')) return; try { const r = await fetch(`/api/v1/jobs/${selectedJob.id}/scenes/${sceneId}/delete`, { method: 'POST', headers: { 'x-csrf-token': csrfToken } }); if ((await r.json()).success) fetchScenes(selectedJob.id); } catch {} };

  const handleUseAsPrompt = (video: OpportunityVideo) => { setMasterPrompt(video.title); setProductionNotes(`YouTube Link: https://youtube.com/watch?v=${video.videoId}\n${video.description}`); setActiveTab('create'); };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault(); if (!masterPrompt.trim()) return;
    const combined = `${masterPrompt} ${characterFeatures}`;
    const names = extractCharacterNames(combined);
    if (names.length > 0) {
      try { const r = await fetch('/api/v1/characters'); const j = await r.json(); setExistingCharacters(j.data || j || []); } catch {}
      const fd = new FormData();
      fd.append('master_prompt', masterPrompt); fd.append('production_notes', productionNotes); fd.append('character_features', characterFeatures);
      fd.append('tts_provider', ttsProvider); fd.append('tts_voice', ttsVoice); fd.append('production_template', productionTemplate);
      fd.append('has_shorts', hasShorts ? '1' : '0'); fd.append('has_subtitles', hasSubtitles ? '1' : '0');
      fd.append('brand_kit_enabled', brandKitEnabled ? '1' : '0'); fd.append('kinetic_subtitles', kineticSubtitles ? '1' : '0');
      fd.append('auto_sfx_placement', autoSfxPlacement ? '1' : '0'); fd.append('audio_ducking', audioDucking ? '1' : '0');
      targetPlatforms.forEach(p => fd.append('platforms[]', p)); if (selectedFile) fd.append('material', selectedFile); if (selectedMusicFile) fd.append('background_music', selectedMusicFile);
      setCharPendingFormData(fd); setCharDetectedNames(names); setCharModalOpen(true); return;
    }
    setFormLoading(true);
    const fd = new FormData();
    fd.append('master_prompt', masterPrompt); fd.append('production_notes', productionNotes); fd.append('character_features', characterFeatures);
    fd.append('tts_provider', ttsProvider); fd.append('tts_voice', ttsVoice); fd.append('production_template', productionTemplate);
    fd.append('has_shorts', hasShorts ? '1' : '0'); fd.append('has_subtitles', hasSubtitles ? '1' : '0');
    fd.append('brand_kit_enabled', brandKitEnabled ? '1' : '0'); fd.append('kinetic_subtitles', kineticSubtitles ? '1' : '0');
    fd.append('auto_sfx_placement', autoSfxPlacement ? '1' : '0'); fd.append('audio_ducking', audioDucking ? '1' : '0');
    targetPlatforms.forEach(p => fd.append('platforms[]', p)); if (selectedFile) fd.append('material', selectedFile); if (selectedMusicFile) fd.append('background_music', selectedMusicFile);
    try { await fetch('/create-job', { method: 'POST', headers: { 'x-csrf-token': csrfToken }, body: fd }); setMasterPrompt(''); setProductionNotes(''); setCharacterFeatures(''); setSelectedFile(null); setSelectedMusicFile(null); setBrandKitEnabled(false); setKineticSubtitles(false); setAutoSfxPlacement(false); setAudioDucking(false); fetchJobs(); setActiveTab('gallery'); } catch {} finally { setFormLoading(false); }
  };

  const handleCharModalConfirm = async (charMap: Record<string, { name: string; description: string; isNew: boolean }>) => {
    setCharModalOpen(false); if (!charPendingFormData) return;
    charPendingFormData.append('character_map', JSON.stringify(charMap));
    setFormLoading(true);
    try { await fetch('/create-job', { method: 'POST', headers: { 'x-csrf-token': csrfToken }, body: charPendingFormData }); setMasterPrompt(''); setProductionNotes(''); setCharacterFeatures(''); setSelectedFile(null); setSelectedMusicFile(null); setBrandKitEnabled(false); setKineticSubtitles(false); setAutoSfxPlacement(false); setAudioDucking(false); fetchJobs(); setActiveTab('gallery'); } catch {} finally { setFormLoading(false); setCharPendingFormData(null); }
  };

  const handleSaveMetaAndPublish = async () => {
    if (!selectedJob) return; setIsMetaSaving(true);
    try {
      const rs = await fetch(`/save-meta/${selectedJob.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ yt_title: metaYtTitle, yt_desc: metaYtDesc, yt_tags: metaYtTags, tt_desc: metaYtDesc.slice(0,150), tt_tags: metaYtTags, x_desc: metaYtDesc.slice(0,200), x_tags: metaYtTags, meta_desc: metaYtDesc, meta_tags: metaYtTags }) });
      const ds = await rs.json();
      if (ds.success) { const rp = await fetch(`/start-job/${selectedJob.id}`, { method: 'POST', headers: { 'x-csrf-token': csrfToken } }); const dp = await rp.json(); if (dp.success) { alert('Kopyalar kaydedildi ve Playwright paylaşım botu tetiklendi!'); fetchJobs(); } else alert('Yayınlama hatası: ' + dp.error); }
      else alert('Kayıt hatası: ' + ds.error);
    } catch (e: any) { alert('Hata: ' + e.message); } finally { setIsMetaSaving(false); }
  };

  const handleCancelJob = async (id: number) => {
    if (!confirm('Bu işi iptal etmek istediğinize emin misiniz?')) return;
    try { const r = await fetch(`/cancel-job/${id}`, { method: 'POST', headers: { 'x-csrf-token': csrfToken } }); const d = await r.json(); if (d.success) { fetchJobs(); if (selectedJob?.id === id) setSelectedJob(null); } else alert('Hata: ' + d.error); } catch (e: any) { alert('Hata: ' + e.message); }
  };

  const handleDeleteJob = async (id: number) => {
    if (!confirm('Bu projeyi silmek istediğinize emin misiniz?')) return;
    try { const r = await fetch(`/delete-job/${id}`, { method: 'POST', headers: { 'x-csrf-token': csrfToken } }); const d = await r.json(); if (d.success) { fetchJobs(); if (selectedJob?.id === id) setSelectedJob(null); } else alert('Hata: ' + d.error); } catch (e: any) { alert('Hata: ' + e.message); }
  };

  const handleSelectJob = (job: Job) => { setSelectedJob(job); setMetaYtTitle(job.yt_title || ''); setMetaYtDesc(job.yt_desc || ''); setMetaYtTags(job.yt_tags || ''); };
  const togglePlatform = (p: Platform) => setTargetPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  if (!isLoggedIn) return <LandingPage onLogin={handleLoginDirect} authError={authError} setAuthError={setAuthError} language={language} setLanguage={setLanguage} t={t} />;

  const mainTabs = ['Stüdyo', 'Galeri', 'Talk-Show', 'Karakterler'] as const;
  const [mainTab, setMainTab] = useState<typeof mainTabs[number]>('Stüdyo');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      <Header
        language={language} theme={theme} isDark={isDark} activeTab={activeTab}
        userCredits={userCredits} onSetTheme={setTheme} onToggleDark={() => setIsDark(!isDark)}
        onToggleLanguage={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
        onSetActiveTab={setActiveTab} onLogout={handleLogout} t={t}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT SIDEBAR — w-72 (288px) */}
        <aside style={{ width: 288, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'rgba(24,24,27,0.3)', overflowY: 'auto', zIndex: 10 }}>
          <ProjectForm
            masterPrompt={masterPrompt} productionNotes={productionNotes} characterFeatures={characterFeatures}
            ttsProvider={ttsProvider} ttsVoice={ttsVoice} productionTemplate={productionTemplate}
            hasShorts={hasShorts} hasSubtitles={hasSubtitles} brandKitEnabled={brandKitEnabled}
            kineticSubtitles={kineticSubtitles} autoSfxPlacement={autoSfxPlacement} audioDucking={audioDucking}
            targetPlatforms={targetPlatforms} formLoading={formLoading} userCredits={userCredits}
            onSetMasterPrompt={setMasterPrompt} onSetProductionNotes={setProductionNotes}
            onSetCharacterFeatures={setCharacterFeatures} onSetTtsProvider={setTtsProvider}
            onSetTtsVoice={setTtsVoice} onSetProductionTemplate={setProductionTemplate}
            onSetHasShorts={setHasShorts} onSetHasSubtitles={setHasSubtitles}
            onSetBrandKitEnabled={setBrandKitEnabled} onSetKineticSubtitles={setKineticSubtitles}
            onSetAutoSfxPlacement={setAutoSfxPlacement} onSetAudioDucking={setAudioDucking}
            onTogglePlatform={togglePlatform} onSetSelectedFile={setSelectedFile}
            onSetSelectedMusicFile={setSelectedMusicFile} onSubmit={handleSubmitJob} t={t}
            selectedModel={selectedModel} onSetSelectedModel={setSelectedModel}
            aspectRatio={aspectRatio} onSetAspectRatio={setAspectRatio}
            camIntensity={camIntensity} onSetCamIntensity={setCamIntensity}
          />
        </aside>

        {/* MAIN PANEL — flex: 1 */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg-primary)', backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          {/* Accent glow */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 500, height: 500, background: 'rgba(99,102,241,0.05)', borderRadius: '50%', filter: 'blur(100px)', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 0 }} />
          
          {/* Tab bar */}
          <div style={{ height: 40, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 4, zIndex: 1 }}>
            {mainTabs.map(tab => (
              <button key={tab} onClick={() => setMainTab(tab)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: mainTab === tab ? 600 : 400,
                  background: mainTab === tab ? 'var(--accent-light)' : 'transparent',
                  color: mainTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-sans)', transition: 'all 0.2s',
                }}
              >{tab}</button>
            ))}
          </div>

          {/* Content area */}
          <StudioPanel
            activeTab={mainTab === 'Stüdyo' ? 'create' : mainTab === 'Galeri' ? 'gallery' : mainTab === 'Talk-Show' ? 'groupchat' : 'create'}
            selectedJob={selectedJob} scenes={scenes} progressMsg={progressMsg} progressPercent={progressPercent}
            etaSeconds={etaSeconds} csrfToken={csrfToken}
            onSetSelectedJob={setSelectedJob}
            onUpdateScenes={handleUpdateScenes} onRegenerateScene={handleRegenerateScene}
            onAddScene={handleAddScene} onDeleteScene={handleDeleteScene}
            onSelectScene={(s: Scene) => setEditingImageScene(s)} onUseAsPrompt={handleUseAsPrompt}
            t={t}
            masterPrompt={masterPrompt} onSetMasterPrompt={setMasterPrompt}
            onSubmit={handleSubmitJob} formLoading={formLoading}
            mainTab={mainTab}
          />
        </main>

        {/* RIGHT SIDEBAR — w-80 (320px) */}
        <aside style={{ width: 320, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--bg-primary)', overflowY: 'auto', zIndex: 10 }}>
          <GalleryPanel
            jobs={jobs} selectedJob={selectedJob} metaYtTitle={metaYtTitle} metaYtDesc={metaYtDesc} metaYtTags={metaYtTags}
            isMetaSaving={isMetaSaving} progressMsg={progressMsg} progressPercent={progressPercent}
            onSelectJob={handleSelectJob} onRefreshJobs={fetchJobs} onCancelJob={handleCancelJob}
            onDeleteJob={handleDeleteJob} onSetMetaYtTitle={setMetaYtTitle} onSetMetaYtDesc={setMetaYtDesc}
            onSetMetaYtTags={setMetaYtTags} onSaveMetaAndPublish={handleSaveMetaAndPublish}
            userCredits={userCredits} t={t}
          />
        </aside>
      </div>

      {editingImageScene && (
        <PhotoEditor imageUrl={editingImageScene.image_path || `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="#131a2c" width="400" height="400"/><text x="200" y="200" text-anchor="middle" fill="#8e9bb4" font-family="sans-serif" font-size="14">Sahne Görseli Yok</text></svg>')}`}
          onClose={() => setEditingImageScene(null)}
          onSave={async (url: string) => { const updated = scenes.map(s => s.id === editingImageScene.id ? { ...s, image_path: url } : s); handleUpdateScenes(updated); setEditingImageScene(null); }}
        />
      )}

      {charModalOpen && (
        <CharacterSelectorModal isOpen={charModalOpen} onClose={() => { setCharModalOpen(false); setCharPendingFormData(null); }}
          onConfirm={handleCharModalConfirm} detectedNames={charDetectedNames} existingCharacters={existingCharacters} csrfToken={csrfToken}
        />
      )}
    </div>
  );
}
