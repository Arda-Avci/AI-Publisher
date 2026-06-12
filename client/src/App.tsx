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
import type {
  Job, UserCredits,
  Language, Tab, ProductionTemplate, TtsProvider, Platform,
} from './types.js';

export default function App() {
  // Auth & session
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [csrfToken, setCsrfToken] = useState<string>('');

  // UI state
  const [language, setLanguage] = useState<Language>('tr');
  const [theme, setTheme] = useState<string>('default');
  const [isDark, setIsDark] = useState<boolean>(true);

  // App core state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);

  // Creation form state
  const [masterPrompt, setMasterPrompt] = useState<string>('');
  const [productionNotes, setProductionNotes] = useState<string>('');
  const [characterFeatures, setCharacterFeatures] = useState<string>('');
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>('edge');
  const [ttsVoice, setTtsVoice] = useState<string>('tr-TR-AhmetNeural');
  const [productionTemplate, setProductionTemplate] = useState<ProductionTemplate>('cinematic');
  const [hasShorts, setHasShorts] = useState<boolean>(true);
  const [hasSubtitles, setHasSubtitles] = useState<boolean>(true);
  const [brandKitEnabled, setBrandKitEnabled] = useState<boolean>(false);
  const [kineticSubtitles, setKineticSubtitles] = useState<boolean>(false);
  const [autoSfxPlacement, setAutoSfxPlacement] = useState<boolean>(false);
  const [audioDucking, setAudioDucking] = useState<boolean>(false);
  const [targetPlatforms, setTargetPlatforms] = useState<Platform[]>(['youtube']);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMusicFile, setSelectedMusicFile] = useState<File | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Meta editor state
  const [metaYtTitle, setMetaYtTitle] = useState<string>('');
  const [metaYtDesc, setMetaYtDesc] = useState<string>('');
  const [metaYtTags, setMetaYtTags] = useState<string>('');
  const [isMetaSaving, setIsMetaSaving] = useState<boolean>(false);

  // Photo editor modal
  const [editingImageScene, setEditingImageScene] = useState<Scene | null>(null);

  // Character selector for video production
  const [charModalOpen, setCharModalOpen] = useState(false);
  const [charDetectedNames, setCharDetectedNames] = useState<string[]>([]);
  const [charPendingFormData, setCharPendingFormData] = useState<FormData | null>(null);
  const [existingCharacters, setExistingCharacters] = useState<any[]>([]);

  // SSE progress
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // i18n helper
  const t = useCallback((key: string, params?: Record<string, any>): string => {
    let text = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return text;
  }, [translations]);

  // Initial session fetch
  useEffect(() => { fetchSession(); }, []);

  // Translations when language changes
  useEffect(() => { fetchTranslations(); }, [language]);

  // Credits when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchCredits();
      const interval = setInterval(fetchCredits, 15000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // Jobs when logged in
  useEffect(() => { if (isLoggedIn) fetchJobs(); }, [isLoggedIn]);

  // Scene fetch + SSE when job changes
  useEffect(() => {
    if (selectedJob) {
      fetchScenes(selectedJob.id);
      setupProgressStream(selectedJob.id);
    } else {
      closeProgressStream();
    }
    return () => closeProgressStream();
  }, [selectedJob]);

  // Apply theme/dark class to html
  useEffect(() => {
    const root = document.documentElement;
    root.className = `theme-${theme}`;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme, isDark]);

  // ===== API methods =====

  const fetchSession = async () => {
    try {
      const resCsrf = await fetch('/api/v1/csrf');
      const dataCsrf = await resCsrf.json();
      if (dataCsrf.csrfToken) setCsrfToken(dataCsrf.csrfToken);

      const res = await fetch('/api/v1/session');
      const data = await res.json();
      if (data.userId) {
        setIsLoggedIn(true);
        if (data.theme) setTheme(data.theme);
        if (data.lang) setLanguage(data.lang);
        if (data.isDark !== undefined) setIsDark(data.isDark);
      } else {
        setIsLoggedIn(false);
      }
    } catch {
      setIsLoggedIn(false);
    }
  };

  const fetchTranslations = async () => {
    try {
      const res = await fetch(`/api/v1/locales?lang=${language}`);
      const data = await res.json();
      setTranslations(data);
    } catch (err) {
      console.error('Failed to fetch translations:', err);
    }
  };

  const fetchCredits = async () => {
    try {
      const res = await fetch('/api/v1/user/credits');
      const data = await res.json();
      if (data.success) {
        setUserCredits({
          credits: data.credits,
          limit: data.limit,
          resetDate: data.resetDate,
        });
      }
    } catch (err) {
      console.error('Failed to fetch user credits:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/v1/jobs');
      const data = await res.json();
      if (Array.isArray(data)) setJobs(data);
      else if (data.success && Array.isArray(data.jobs)) setJobs(data.jobs);
    } catch (err) {
      console.error('Fetch jobs failed:', err);
    }
  };

  const fetchScenes = async (jobId: number) => {
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/scenes`);
      const data = await res.json();
      if (data.success) setScenes(data.scenes || []);
    } catch (err) {
      console.error('Fetch scenes failed:', err);
    }
  };

  // ===== Auth =====

  const handleLoginDirect = async (u: string, p: string) => {
    setAuthError('');
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (data.success) {
        setIsLoggedIn(true);
        fetchSession();
      } else {
        setAuthError(data.error || 'Giriş başarısız.');
        throw new Error(data.error || 'Giriş başarısız.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Sunucu hatası.');
      throw err;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/logout', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
    } catch { /* ignore */ }
    setIsLoggedIn(false);
    setSelectedJob(null);
  };

  // ===== SSE progress =====

  const setupProgressStream = (jobId: number) => {
    closeProgressStream();
    eventSourceRef.current = new EventSource(`/api/v1/progress/stream?jobId=${jobId}`);

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.stageKey) {
          setProgressMsg(data.colabMessage || data.stageKey);
          setProgressPercent(data.percent || 0);
          if (data.etaSeconds !== undefined) setEtaSeconds(data.etaSeconds);
        }
        if (data.stageKey === 'stageCompleted') {
          fetchJobs();
          fetchScenes(jobId);
          closeProgressStream();
        }
      } catch { /* ignored */ }
    };

    eventSourceRef.current.onerror = () => {
      setTimeout(() => {
        if (selectedJob && selectedJob.id === jobId && selectedJob.status === 'processing') {
          setupProgressStream(jobId);
        }
      }, 5000);
    };
  };

  const closeProgressStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setProgressMsg('');
    setProgressPercent(0);
    setEtaSeconds(null);
  };

  // ===== Job lifecycle =====

  const handleUpdateScenes = async (updatedScenes: Scene[]) => {
    if (!selectedJob) return;
    setScenes(updatedScenes);
    try {
      await fetch(`/api/v1/jobs/${selectedJob.id}/scenes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ scenes: updatedScenes }),
      });
    } catch (err) {
      console.error('Scenes save failed:', err);
    }
  };

  const handleRegenerateScene = async (sceneId: number) => {
    if (!selectedJob) return;
    try {
      setProgressMsg('Sahne yeniden üretiliyor...');
      const res = await fetch(`/api/v1/jobs/${selectedJob.id}/scenes/${sceneId}/regenerate`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
        fetchScenes(selectedJob.id);
      } else {
        alert('Yeniden üretim hatası: ' + data.error);
      }
    } catch (err: any) {
      alert('İletişim hatası: ' + err.message);
    }
  };

  const handleAddScene = async () => {
    if (!selectedJob) return;
    try {
      const res = await fetch(`/api/v1/jobs/${selectedJob.id}/scenes/add`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      const data = await res.json();
      if (data.success) fetchScenes(selectedJob.id);
    } catch (err) {
      console.error('Add scene failed:', err);
    }
  };

  const handleDeleteScene = async (sceneId: number) => {
    if (!selectedJob) return;
    if (!confirm('Bu sahneyi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/v1/jobs/${selectedJob.id}/scenes/${sceneId}/delete`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      const data = await res.json();
      if (data.success) fetchScenes(selectedJob.id);
    } catch (err) {
      console.error('Delete scene failed:', err);
    }
  };

  const handleUseAsPrompt = (video: OpportunityVideo) => {
    setMasterPrompt(video.title);
    setProductionNotes(`YouTube Link: https://youtube.com/watch?v=${video.videoId}\nVideo Açıklaması:\n${video.description}`);
    setActiveTab('create');
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPrompt.trim()) return;

    // Detect @character references
    const combinedText = `${masterPrompt} ${characterFeatures}`;
    const names = extractCharacterNames(combinedText);

    if (names.length > 0) {
      // Fetch existing characters and show modal
      try {
        const res = await fetch('/api/v1/characters');
        const json = await res.json();
        const chars = json.data || json || [];
        setExistingCharacters(chars);

        // Check if @me exists as a character; if not, offer to auto-create
        if (names.includes('me') && !chars.some((c: any) => c.slug === 'me')) {
          // @me will be handled in the modal
        }
      } catch { /* ignore */ }

      // Build formData but don't submit yet — store for later
      const fd = new FormData();
      fd.append('master_prompt', masterPrompt);
      fd.append('production_notes', productionNotes);
      fd.append('character_features', characterFeatures);
      fd.append('tts_provider', ttsProvider);
      fd.append('tts_voice', ttsVoice);
      fd.append('production_template', productionTemplate);
      fd.append('has_shorts', hasShorts ? '1' : '0');
      fd.append('has_subtitles', hasSubtitles ? '1' : '0');
      fd.append('brand_kit_enabled', brandKitEnabled ? '1' : '0');
      fd.append('kinetic_subtitles', kineticSubtitles ? '1' : '0');
      fd.append('auto_sfx_placement', autoSfxPlacement ? '1' : '0');
      fd.append('audio_ducking', audioDucking ? '1' : '0');
      targetPlatforms.forEach((p) => fd.append('platforms[]', p));
      if (selectedFile) fd.append('material', selectedFile);
      if (selectedMusicFile) fd.append('background_music', selectedMusicFile);
      setCharPendingFormData(fd);
      setCharDetectedNames(names);
      setCharModalOpen(true);
      return; // Wait for modal confirmation
    }

    // No characters detected — submit directly
    setFormLoading(true);
    const formData = new FormData();
    formData.append('master_prompt', masterPrompt);
    formData.append('production_notes', productionNotes);
    formData.append('character_features', characterFeatures);
    formData.append('tts_provider', ttsProvider);
    formData.append('tts_voice', ttsVoice);
    formData.append('production_template', productionTemplate);
    formData.append('has_shorts', hasShorts ? '1' : '0');
    formData.append('has_subtitles', hasSubtitles ? '1' : '0');
    formData.append('brand_kit_enabled', brandKitEnabled ? '1' : '0');
    formData.append('kinetic_subtitles', kineticSubtitles ? '1' : '0');
    formData.append('auto_sfx_placement', autoSfxPlacement ? '1' : '0');
    formData.append('audio_ducking', audioDucking ? '1' : '0');
    targetPlatforms.forEach((p) => formData.append('platforms[]', p));
    if (selectedFile) formData.append('material', selectedFile);
    if (selectedMusicFile) formData.append('background_music', selectedMusicFile);

    try {
      await fetch('/create-job', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: formData,
      });
      setMasterPrompt('');
      setProductionNotes('');
      setCharacterFeatures('');
      setSelectedFile(null);
      setSelectedMusicFile(null);
      setBrandKitEnabled(false);
      setKineticSubtitles(false);
      setAutoSfxPlacement(false);
      setAudioDucking(false);
      fetchJobs();
      setActiveTab('gallery');
    } catch (err) {
      console.error('Job creation failed:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCharModalConfirm = async (charMap: Record<string, { name: string; description: string; isNew: boolean }>) => {
    setCharModalOpen(false);
    if (!charPendingFormData) return;

    // Append character mappings to form data
    charPendingFormData.append('character_map', JSON.stringify(charMap));
    setFormLoading(true);
    try {
      await fetch('/create-job', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: charPendingFormData,
      });
      setMasterPrompt('');
      setProductionNotes('');
      setCharacterFeatures('');
      setSelectedFile(null);
      setSelectedMusicFile(null);
      setBrandKitEnabled(false);
      setKineticSubtitles(false);
      setAutoSfxPlacement(false);
      setAudioDucking(false);
      fetchJobs();
      setActiveTab('gallery');
    } catch (err) {
      console.error('Job creation failed:', err);
    } finally {
      setFormLoading(false);
      setCharPendingFormData(null);
    }
  };

  const handleSaveMetaAndPublish = async () => {
    if (!selectedJob) return;
    setIsMetaSaving(true);
    try {
      const resSave = await fetch(`/save-meta/${selectedJob.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          yt_title: metaYtTitle,
          yt_desc: metaYtDesc,
          yt_tags: metaYtTags,
          tt_desc: metaYtDesc.slice(0, 150),
          tt_tags: metaYtTags,
          x_desc: metaYtDesc.slice(0, 200),
          x_tags: metaYtTags,
          meta_desc: metaYtDesc,
          meta_tags: metaYtTags,
        }),
      });
      const dataSave = await resSave.json();
      if (dataSave.success) {
        const resPub = await fetch(`/start-job/${selectedJob.id}`, {
          method: 'POST',
          headers: { 'x-csrf-token': csrfToken },
        });
        const dataPub = await resPub.json();
        if (dataPub.success) {
          alert('Kopyalar kaydedildi ve Playwright paylaşım botu tetiklendi!');
          fetchJobs();
        } else {
          alert('Yayınlama hatası: ' + dataPub.error);
        }
      } else {
        alert('Kayıt hatası: ' + dataSave.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setIsMetaSaving(false);
    }
  };

  const handleCancelJob = async (jobId: number) => {
    if (!confirm('Bu işi iptal etmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/cancel-job/${jobId}`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
        if (selectedJob?.id === jobId) setSelectedJob(null);
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!confirm('Bu projeyi ve diskteki dosyalarını silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/delete-job/${jobId}`, {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
      });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
        if (selectedJob?.id === jobId) setSelectedJob(null);
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    setMetaYtTitle(job.yt_title || '');
    setMetaYtDesc(job.yt_desc || '');
    setMetaYtTags(job.yt_tags || '');
  };

  const togglePlatform = (p: Platform) => {
    setTargetPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  // ===== Render =====

  if (!isLoggedIn) {
    return (
      <LandingPage
        onLogin={handleLoginDirect}
        authError={authError}
        setAuthError={setAuthError}
        language={language}
        setLanguage={setLanguage}
        t={t}
      />
    );
  }

  return (
    <div className="app-grid">
      <Header
        language={language}
        theme={theme}
        isDark={isDark}
        activeTab={activeTab}
        userCredits={userCredits}
        onSetTheme={setTheme}
        onToggleDark={() => setIsDark(!isDark)}
        onToggleLanguage={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
        onSetActiveTab={setActiveTab}
        onLogout={handleLogout}
        t={t}
      />

      <div className="app-body">
        <ProjectForm
          masterPrompt={masterPrompt}
          productionNotes={productionNotes}
          characterFeatures={characterFeatures}
          ttsProvider={ttsProvider}
          ttsVoice={ttsVoice}
          productionTemplate={productionTemplate}
          hasShorts={hasShorts}
          hasSubtitles={hasSubtitles}
          brandKitEnabled={brandKitEnabled}
          kineticSubtitles={kineticSubtitles}
          autoSfxPlacement={autoSfxPlacement}
          audioDucking={audioDucking}
          targetPlatforms={targetPlatforms}
          formLoading={formLoading}
          userCredits={userCredits}
          onSetMasterPrompt={setMasterPrompt}
          onSetProductionNotes={setProductionNotes}
          onSetCharacterFeatures={setCharacterFeatures}
          onSetTtsProvider={setTtsProvider}
          onSetTtsVoice={setTtsVoice}
          onSetProductionTemplate={setProductionTemplate}
          onSetHasShorts={setHasShorts}
          onSetHasSubtitles={setHasSubtitles}
          onSetBrandKitEnabled={setBrandKitEnabled}
          onSetKineticSubtitles={setKineticSubtitles}
          onSetAutoSfxPlacement={setAutoSfxPlacement}
          onSetAudioDucking={setAudioDucking}
          onTogglePlatform={togglePlatform}
          onSetSelectedFile={setSelectedFile}
          onSetSelectedMusicFile={setSelectedMusicFile}
          onSubmit={handleSubmitJob}
          t={t}
        />

        <StudioPanel
          activeTab={activeTab}
          selectedJob={selectedJob}
          scenes={scenes}
          progressMsg={progressMsg}
          progressPercent={progressPercent}
          etaSeconds={etaSeconds}
          onSetSelectedJob={setSelectedJob}
          onUpdateScenes={handleUpdateScenes}
          onRegenerateScene={handleRegenerateScene}
          onAddScene={handleAddScene}
          onDeleteScene={handleDeleteScene}
          onSelectScene={(scene: Scene) => setEditingImageScene(scene)}
          onUseAsPrompt={handleUseAsPrompt}
          t={t}
        />

        <GalleryPanel
          jobs={jobs}
          selectedJob={selectedJob}
          metaYtTitle={metaYtTitle}
          metaYtDesc={metaYtDesc}
          metaYtTags={metaYtTags}
          isMetaSaving={isMetaSaving}
          progressMsg={progressMsg}
          progressPercent={progressPercent}
          userCredits={userCredits}
          onSelectJob={handleSelectJob}
          onRefreshJobs={fetchJobs}
          onCancelJob={handleCancelJob}
          onDeleteJob={handleDeleteJob}
          onSetMetaYtTitle={setMetaYtTitle}
          onSetMetaYtDesc={setMetaYtDesc}
          onSetMetaYtTags={setMetaYtTags}
          onSaveMetaAndPublish={handleSaveMetaAndPublish}
          t={t}
        />
      </div>

      {editingImageScene && (
        <PhotoEditor
          imageUrl={editingImageScene.image_path || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="#131a2c" width="400" height="400"/><text x="200" y="200" text-anchor="middle" fill="#8e9bb4" font-family="sans-serif" font-size="14">Sahne Görseli Yok</text></svg>')}
          onClose={() => setEditingImageScene(null)}
          onSave={async (newImageUrl: string) => {
            const updated = scenes.map((s) =>
              s.id === editingImageScene.id ? { ...s, image_path: newImageUrl } : s
            );
            handleUpdateScenes(updated);
            setEditingImageScene(null);
          }}
        />
      )}

      {charModalOpen && (
        <CharacterSelectorModal
          isOpen={charModalOpen}
          onClose={() => { setCharModalOpen(false); setCharPendingFormData(null); }}
          onConfirm={handleCharModalConfirm}
          detectedNames={charDetectedNames}
          existingCharacters={existingCharacters}
          csrfToken={csrfToken}
        />
      )}
    </div>
  );
}
