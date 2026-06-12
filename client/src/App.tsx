import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, Sparkles, Settings, Send, LogOut, Moon, Sun, 
  RefreshCw, Play, CheckCircle, AlertTriangle, Eye, 
  Trash2, Globe, FileVideo, MessageSquare, 
  CheckSquare, HelpCircle, ArrowRight, Save, Share2, Loader, Download
} from 'lucide-react';
import { Timeline, Scene } from './components/Timeline.js';
import { PhotoEditor } from './components/PhotoEditor.js';
import { Opportunities, OpportunityVideo } from './components/Opportunities.js';
import { LandingPage } from './components/LandingPage.js';

interface Job {
  id: number;
  master_prompt: string;
  production_notes: string;
  character_features: string;
  material_path?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'awaiting_approval';
  current_stage: string;
  progress_percent: number;
  final_filename?: string;
  cover_image_path?: string;
  cover_images?: string;
  total_scenes: number;
  completed_scenes: number;
  estimated_minutes: number;
  yt_title?: string;
  yt_desc?: string;
  yt_tags?: string;
  tt_desc?: string;
  tt_tags?: string;
  x_desc?: string;
  x_tags?: string;
  meta_desc?: string;
  meta_tags?: string;
  tts_provider?: string;
  tts_voice?: string;
  model_type?: string;
  has_shorts?: number;
}

export default function App() {
  // Authentication & Settings
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [csrfToken, setCsrfToken] = useState<string>('');

  // UI state
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [theme, setTheme] = useState<string>('default');
  const [isDark, setIsDark] = useState<boolean>(true);

  // App core state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'gallery' | 'opportunities' | 'groupchat'>('create');
  
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [userCredits, setUserCredits] = useState<{ credits: number; limit: number; resetDate: string } | null>(null);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);

  // Creation form state
  const [masterPrompt, setMasterPrompt] = useState<string>('');
  const [productionNotes, setProductionNotes] = useState<string>('');
  const [characterFeatures, setCharacterFeatures] = useState<string>('');
  const [ttsProvider, setTtsProvider] = useState<string>('edge');
  const [ttsVoice, setTtsVoice] = useState<string>('tr-TR-AhmetNeural');
  const [productionTemplate, setProductionTemplate] = useState<'cinematic' | 'dynamic' | 'simple' | 'pixar'>('cinematic');
  const [hasShorts, setHasShorts] = useState<boolean>(true);
  const [hasSubtitles, setHasSubtitles] = useState<boolean>(true);
  const [brandKitEnabled, setBrandKitEnabled] = useState<boolean>(false);
  const [kineticSubtitles, setKineticSubtitles] = useState<boolean>(false);
  const [autoSfxPlacement, setAutoSfxPlacement] = useState<boolean>(false);
  const [audioDucking, setAudioDucking] = useState<boolean>(false);
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['youtube']);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMusicFile, setSelectedMusicFile] = useState<File | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Editing details (Awaiting Approval / Metadata)
  const [metaYtTitle, setMetaYtTitle] = useState<string>('');
  const [metaYtDesc, setMetaYtDesc] = useState<string>('');
  const [metaYtTags, setMetaYtTags] = useState<string>('');
  const [isMetaSaving, setIsMetaSaving] = useState<boolean>(false);

  // Photo Editor Modal state
  const [editingImageScene, setEditingImageScene] = useState<Scene | null>(null);

  // SSE & Polling
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch CSRF & Session on mount
  useEffect(() => {
    fetchSession();
  }, []);

  // Fetch translations when language changes
  useEffect(() => {
    fetchTranslations();
  }, [language]);

  // Fetch credits periodically when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchCredits();
      const interval = setInterval(fetchCredits, 15000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

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
          resetDate: data.resetDate
        });
        setCreditHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch user credits:', err);
    }
  };

  // Fetch jobs when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchJobs();
    }
  }, [isLoggedIn]);

  // Load scenes when selectedJob changes
  useEffect(() => {
    if (selectedJob) {
      fetchScenes(selectedJob.id);
      setupProgressStream(selectedJob.id);
    } else {
      closeProgressStream();
    }
    return () => closeProgressStream();
  }, [selectedJob]);

  // Apply Theme & Mode class to HTML tag
  useEffect(() => {
    const root = document.documentElement;
    root.className = `theme-${theme}`;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, isDark]);

  const fetchSession = async () => {
    try {
      // Get CSRF Token
      const resCsrf = await fetch('/api/v1/csrf');
      const dataCsrf = await resCsrf.json();
      if (dataCsrf.csrfToken) {
        setCsrfToken(dataCsrf.csrfToken);
      }

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
    } catch (err) {
      setIsLoggedIn(false);
    }
  };

  const handleLoginDirect = async (u: string, p: string) => {
    setAuthError('');
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ username: u, password: p })
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
        headers: { 'x-csrf-token': csrfToken }
      });
      setIsLoggedIn(false);
      setSelectedJob(null);
    } catch (err) {
      setIsLoggedIn(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/v1/jobs');
      const data = await res.json();
      // Backend direct return layout support
      if (Array.isArray(data)) {
        setJobs(data);
      } else if (data.success && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error('Fetch jobs failed:', err);
    }
  };

  const fetchScenes = async (jobId: number) => {
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/scenes`);
      const data = await res.json();
      if (data.success) {
        setScenes(data.scenes || []);
      }
    } catch (err) {
      console.error('Fetch scenes failed:', err);
    }
  };

  const handleUpdateScenes = async (updatedScenes: Scene[]) => {
    if (!selectedJob) return;
    setScenes(updatedScenes);
    try {
      const res = await fetch(`/api/v1/jobs/${selectedJob.id}/scenes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ scenes: updatedScenes })
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Sahneler güncellenemedi:', data.error);
      }
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
        headers: { 'x-csrf-token': csrfToken }
      });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
        // Force reload scenes
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
        headers: { 'x-csrf-token': csrfToken }
      });
      const data = await res.json();
      if (data.success) {
        fetchScenes(selectedJob.id);
      }
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
        headers: { 'x-csrf-token': csrfToken }
      });
      const data = await res.json();
      if (data.success) {
        fetchScenes(selectedJob.id);
      }
    } catch (err) {
      console.error('Delete scene failed:', err);
    }
  };

  // SSE Connection
  const setupProgressStream = (jobId: number) => {
    closeProgressStream();
    eventSourceRef.current = new EventSource(`/api/v1/progress/stream?jobId=${jobId}`);
    
    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.stageKey) {
          setProgressMsg(data.colabMessage || data.stageKey);
          setProgressPercent(data.percent || 0);
          if (data.etaSeconds !== undefined) {
            setEtaSeconds(data.etaSeconds);
          }
        }
        if (data.stageKey === 'stageCompleted') {
          fetchJobs();
          fetchScenes(jobId);
          closeProgressStream();
        }
      } catch (err) {
        // Ignored
      }
    };

    eventSourceRef.current.onerror = () => {
      // Reconnection fallback
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

  // Opportunities click callback
  const handleUseAsPrompt = (video: OpportunityVideo) => {
    setMasterPrompt(video.title);
    setProductionNotes(`YouTube Link: https://youtube.com/watch?v=${video.videoId}\nVideo Açıklaması:\n${video.description}`);
    setActiveTab('create');
  };

  // Submit Create Job
  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPrompt.trim()) return;

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
    
    targetPlatforms.forEach(p => formData.append('platforms[]', p));

    if (selectedFile) {
      formData.append('material', selectedFile);
    }
    if (selectedMusicFile) {
      formData.append('background_music', selectedMusicFile);
    }

    try {
      const res = await fetch('/create-job', {
        method: 'POST',
        headers: { 'x-csrf-token': csrfToken },
        body: formData
      });
      
      // Since backend redirects, we reload jobs
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

  // Save meta & publish
  const handleSaveMetaAndPublish = async () => {
    if (!selectedJob) return;
    setIsMetaSaving(true);
    try {
      // 1. Save Meta
      const resSave = await fetch(`/save-meta/${selectedJob.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
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
          meta_tags: metaYtTags
        })
      });
      const dataSave = await resSave.json();

      if (dataSave.success) {
        // 2. Start Social Publish
        const resPub = await fetch(`/start-job/${selectedJob.id}`, {
          method: 'POST',
          headers: { 'x-csrf-token': csrfToken }
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
        headers: { 'x-csrf-token': csrfToken }
      });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
        }
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
        headers: { 'x-csrf-token': csrfToken }
      });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
        }
      } else {
        alert('Hata: ' + data.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  // Language translation helper
  const t = (key: string, params?: Record<string, any>): string => {
    let text = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return text;
  };

  // Render Landing page if not logged in
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
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* HEADER NAVBAR */}
      <header className="header glass" style={{ height: '60px', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Film size={24} style={{ color: 'var(--primary)' }} />
          <span className="gradient-text" style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '1px' }}>AI-PUBLISHER</span>
          <span style={{ fontSize: '10px', background: 'var(--secondary-glow)', color: 'var(--secondary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>PRO v4</span>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Credit Display */}
          {userCredits && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0, 242, 254, 0.08)',
                border: '1px solid rgba(0, 242, 254, 0.2)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--primary)',
                fontWeight: 'bold',
                position: 'relative',
                cursor: 'pointer'
              }}
              title={t('creditResetDate', { date: new Date(userCredits.resetDate).toLocaleDateString() })}
            >
              <RefreshCw size={12} className="pulse" />
              <span>
                {t('userCredits', { credits: userCredits.credits, limit: userCredits.limit })}
              </span>
            </div>
          )}

          {/* Opportunities Section Shortcut */}
          <button 
            onClick={() => setActiveTab('opportunities')}
            className="btn btn-secondary"
            style={{ 
              padding: '6px 12px', 
              fontSize: '12px', 
              background: activeTab === 'opportunities' ? 'var(--primary-glow)' : 'transparent',
              borderColor: activeTab === 'opportunities' ? 'var(--primary)' : 'var(--border)'
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--primary)' }} />
            {t('opportunities')}
          </button>

          {/* Group Chat Shortcut */}
          <button 
            onClick={() => setActiveTab('groupchat')}
            className="btn btn-secondary"
            style={{ 
              padding: '6px 12px', 
              fontSize: '12px', 
              background: activeTab === 'groupchat' ? 'var(--secondary-glow)' : 'transparent',
              borderColor: activeTab === 'groupchat' ? 'var(--secondary)' : 'var(--border)'
            }}
          >
            <MessageSquare size={14} style={{ color: 'var(--secondary)' }} />
            Grup Sohbeti
          </button>

          {/* Theme Selector */}
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'white', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
          >
            <option value="default">🌐 Default Cyan</option>
            <option value="nebula">🌌 Nebula Purple</option>
            <option value="forest">🌲 Forest Green</option>
            <option value="corporate">💼 Corporate Red</option>
            <option value="midnight">🌙 Midnight Gold</option>
            <option value="sunset">🌇 Sunset Orange</option>
            <option value="ocean">🌊 Ocean Cyan</option>
            <option value="cyberpunk">⚡ Cyberpunk Magenta</option>
            <option value="matrix">📟 Matrix Green</option>
          </select>

          {/* Dark Mode toggle */}
          <button 
            onClick={() => setIsDark(!isDark)} 
            className="btn btn-secondary"
            style={{ padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Language Selector */}
          <button 
            onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 'bold' }}
          >
            {language.toUpperCase()}
          </button>

          {/* Logout */}
          <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>
            <LogOut size={14} /> {t('logout')}
          </button>
        </div>
      </header>

      {/* CORE CONTENT */}
      <div className="main-content" style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* LEFT FORM SIDEBAR */}
        <aside className="sidebar-left" style={{ width: '300px', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--card)', padding: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', alignItems: 'center' }}>
            <Film size={16} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>{t('newProject')}</h3>
          </div>

          <form onSubmit={handleSubmitJob} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Master Prompt */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('masterPrompt')}</label>
              <textarea 
                required
                value={masterPrompt}
                onChange={(e) => setMasterPrompt(e.target.value)}
                placeholder="Yapay zeka modellerinin video hikayesini oluşturması için master prompt girin..."
                style={{ width: '100%', height: '80px', background: '#070a14', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', padding: '8px', fontSize: '12px', resize: 'none', outline: 'none' }}
              />
            </div>

            {/* Production Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('notes')}</label>
              <textarea 
                value={productionNotes}
                onChange={(e) => setProductionNotes(e.target.value)}
                placeholder="Süre tercihleri, ton veya sahne akışı notları..."
                style={{ width: '100%', height: '60px', background: '#070a14', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', padding: '8px', fontSize: '12px', resize: 'none', outline: 'none' }}
              />
            </div>

            {/* Character features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('charSpecs')}</label>
              <input 
                type="text"
                value={characterFeatures}
                onChange={(e) => setCharacterFeatures(e.target.value)}
                placeholder="Örn: Mavi gözlü sarışın erkek çocuk, Pixar stili"
                style={{ width: '100%', background: '#070a14', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', padding: '8px', fontSize: '12px', outline: 'none' }}
              />
            </div>

            {/* File Upload (Material) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Başlangıç Referans Görseli / Videosu</label>
              <input 
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                style={{ fontSize: '11px', color: 'var(--text-muted)' }}
              />
            </div>

            {/* File Upload (Background Music) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Arka Plan Müziği (Background Music)</label>
              <input 
                type="file"
                accept="audio/*"
                onChange={(e) => setSelectedMusicFile(e.target.files?.[0] || null)}
                style={{ fontSize: '11px', color: 'var(--text-muted)' }}
              />
            </div>

            {/* Video Uretim Sablonu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{t('productionTemplate')}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(['cinematic', 'dynamic', 'simple', 'pixar'] as const).map((tpl) => {
                  const titleKey = tpl === 'cinematic' 
                    ? 'templateCinematic' 
                    : tpl === 'dynamic' 
                    ? 'templateDynamic' 
                    : tpl === 'simple' 
                    ? 'templateSimple' 
                    : 'templatePixar';
                  const descKey = tpl === 'cinematic' 
                    ? 'templateCinematicDesc' 
                    : tpl === 'dynamic' 
                    ? 'templateDynamicDesc' 
                    : tpl === 'simple' 
                    ? 'templateSimpleDesc' 
                    : 'templatePixarDesc';
                  const isSelected = productionTemplate === tpl;
                  
                  return (
                    <div 
                      key={tpl}
                      onClick={() => setProductionTemplate(tpl)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(0, 242, 254, 0.04)' : '#070a14',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          border: '2px solid ' + (isSelected ? 'var(--primary)' : 'var(--text-muted)'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isSelected && (
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                          )}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: isSelected ? 'white' : 'var(--text-muted)' }}>
                          {t(titleKey) || tpl.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, paddingLeft: '22px' }}>
                        {t(descKey) || ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TTS Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('ttsProvider')}</label>
              <select 
                value={ttsProvider}
                onChange={(e) => {
                  setTtsProvider(e.target.value);
                  setTtsVoice(e.target.value === 'openai' ? 'alloy' : 'tr-TR-AhmetNeural');
                }}
                style={{ width: '100%', background: '#070a14', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', padding: '8px', fontSize: '12px', outline: 'none' }}
              >
                <option value="edge">Edge Speech (Ücretsiz)</option>
                <option value="openai">OpenAI TTS (Ücretli)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('ttsVoice')}</label>
              {ttsProvider === 'openai' ? (
                <select 
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  style={{ width: '100%', background: '#070a14', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', padding: '8px', fontSize: '12px', outline: 'none' }}
                >
                  <option value="alloy">Alloy</option>
                  <option value="echo">Echo</option>
                  <option value="fable">Fable</option>
                  <option value="onyx">Onyx</option>
                  <option value="nova">Nova</option>
                  <option value="shimmer">Shimmer</option>
                </select>
              ) : (
                <select 
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  style={{ width: '100%', background: '#070a14', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', padding: '8px', fontSize: '12px', outline: 'none' }}
                >
                  <option value="tr-TR-AhmetNeural">Ahmet (TR - Erkek)</option>
                  <option value="tr-TR-EmelNeural">Emel (TR - Kadın)</option>
                  <option value="en-US-GuyNeural">Guy (EN - Erkek)</option>
                  <option value="en-US-JennyNeural">Jenny (EN - Kadın)</option>
                </select>
              )}
            </div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={hasShorts} onChange={(e) => setHasShorts(e.target.checked)} />
                Dikey Shorts Varyantı Üret (9:16)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={hasSubtitles} onChange={(e) => setHasSubtitles(e.target.checked)} />
                Sarı Altyazı Ekle (Burn-in SRT)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={brandKitEnabled} onChange={(e) => setBrandKitEnabled(e.target.checked)} />
                💼 Marka Kiti Aktif
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={kineticSubtitles} onChange={(e) => setKineticSubtitles(e.target.checked)} />
                ✨ Kinetik Altyazı
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={autoSfxPlacement} onChange={(e) => setAutoSfxPlacement(e.target.checked)} />
                🔊 Uzamsal Ses
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={audioDucking} onChange={(e) => setAudioDucking(e.target.checked)} />
                🎵 Ses Ördekleme
              </label>
            </div>

            {/* Target platforms */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('platformSelect')}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {['youtube', 'tiktok', 'x', 'meta'].map(plat => (
                  <label key={plat} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', textTransform: 'capitalize', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={targetPlatforms.includes(plat)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetPlatforms([...targetPlatforms, plat]);
                        } else {
                          setTargetPlatforms(targetPlatforms.filter(p => p !== plat));
                        }
                      }}
                    />
                    {plat === 'meta' ? 'Facebook Reels' : plat}
                  </label>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={formLoading || (userCredits !== null && userCredits.credits < 15)} 
              className="btn btn-primary" 
              style={{ 
                padding: '12px', 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                background: (userCredits !== null && userCredits.credits < 15) ? 'rgba(239, 68, 68, 0.15)' : 'var(--primary)',
                borderColor: (userCredits !== null && userCredits.credits < 15) ? 'rgba(239, 68, 68, 0.3)' : 'var(--primary)',
                color: (userCredits !== null && userCredits.credits < 15) ? 'var(--danger)' : 'white'
              }}
            >
              {formLoading ? <Loader size={14} className="pulse" /> : <Send size={14} />}
              {(userCredits !== null && userCredits.credits < 15) ? t('insufficientCredits') : t('createBtn')}
            </button>
          </form>
        </aside>

        {/* MIDDLE PREVIEW & OPPORTUNITIES & TIMELINE PANEL */}
        <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', background: '#090d16', borderRight: '1px solid var(--border)' }}>
          {/* TAB BAR HEADER */}
          <div style={{ height: '40px', background: 'var(--card)', display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button 
              onClick={() => setActiveTab('create')}
              style={{
                flexGrow: 1, border: 'none', background: activeTab === 'create' ? 'rgba(0, 242, 254, 0.05)' : 'transparent',
                color: activeTab === 'create' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'create' ? 'bold' : 'normal', borderBottom: activeTab === 'create' ? '2px solid var(--primary)' : 'none',
                cursor: 'pointer', fontSize: '12px'
              }}
            >
              Stüdyo & Timeline
            </button>
            <button 
              onClick={() => setActiveTab('opportunities')}
              style={{
                flexGrow: 1, border: 'none', background: activeTab === 'opportunities' ? 'rgba(0, 242, 254, 0.05)' : 'transparent',
                color: activeTab === 'opportunities' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'opportunities' ? 'bold' : 'normal', borderBottom: activeTab === 'opportunities' ? '2px solid var(--primary)' : 'none',
                cursor: 'pointer', fontSize: '12px'
              }}
            >
              Fırsatlar Hunisi
            </button>
            <button 
              onClick={() => setActiveTab('groupchat')}
              style={{
                flexGrow: 1, border: 'none', background: activeTab === 'groupchat' ? 'rgba(155, 81, 224, 0.05)' : 'transparent',
                color: activeTab === 'groupchat' ? 'var(--secondary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'groupchat' ? 'bold' : 'normal', borderBottom: activeTab === 'groupchat' ? '2px solid var(--secondary)' : 'none',
                cursor: 'pointer', fontSize: '12px'
              }}
            >
              Grup Sohbetinden Video
            </button>
          </div>

          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto' }}>
            {activeTab === 'create' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                {/* VIDEO PREVIEW OR BLANK */}
                <div style={{
                  flexGrow: 1, minHeight: '300px', background: '#05070c', borderRadius: '10px',
                  border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'
                }}>
                  {selectedJob && selectedJob.final_filename ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px' }}>
                      <video 
                        src={`/videolar/${selectedJob.final_filename}`} 
                        controls 
                        style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '8px', border: '1px solid var(--border)' }}
                      />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <a href={`/videolar/${selectedJob.final_filename}`} download className="btn btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }}>
                          <Download size={12} /> Yatay Videoyu İndir
                        </a>
                        {selectedJob.has_shorts !== 0 && (
                          <a href={`/videolar/shorts_${selectedJob.final_filename.replace(/^film_/, '')}`} download className="btn btn-primary" style={{ fontSize: '11px', padding: '6px 12px' }}>
                            <Download size={12} /> Dikey Shorts İndir
                          </a>
                        )}
                      </div>
                    </div>
                  ) : selectedJob && selectedJob.status === 'processing' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--primary)' }}>
                      <Loader size={48} className="pulse" />
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Video Üretiliyor ({progressPercent}%)</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Aşama: {progressMsg}</div>
                      {etaSeconds !== null && (
                        <div style={{ fontSize: '11px', color: 'var(--warning)', background: 'rgba(234,179,8,0.08)', padding: '4px 10px', borderRadius: '4px' }}>
                          Kalan Tahmini Süre: {Math.floor(etaSeconds / 60)} dk {etaSeconds % 60} sn
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                      <FileVideo size={48} />
                      <span>Oynatılacak video seçilmedi. Galeriden bir proje seçin veya yeni oluşturun.</span>
                    </div>
                  )}
                </div>

                {/* TIMELINE EDIT AREA */}
                {selectedJob && (
                  <div className="glass" style={{ padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <Timeline 
                      scenes={scenes}
                      onUpdateScenes={handleUpdateScenes}
                      onRegenerateScene={handleRegenerateScene}
                      onAddScene={handleAddScene}
                      onDeleteScene={handleDeleteScene}
                      onSelectScene={(scene: Scene) => setEditingImageScene(scene)}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'opportunities' && (
              <div className="glass" style={{ padding: '20px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <Opportunities onUseAsPrompt={handleUseAsPrompt} />
              </div>
            )}

            {activeTab === 'groupchat' && (
              <div className="glass" style={{ padding: '30px', borderRadius: '10px', border: '1px dashed var(--secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', textAlign: 'center' }}>
                <MessageSquare size={48} style={{ color: 'var(--secondary)' }} />
                <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>{t('groupChatTitle')}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '500px', lineHeight: '20px' }}>{t('groupChatDesc')}</p>
                <div style={{ fontSize: '12px', background: 'rgba(155, 81, 224, 0.1)', color: 'var(--secondary)', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
                  {t('comingSoon')}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT GALLERY & METADATA PANEL */}
        <aside className="sidebar-right" style={{ width: '340px', flexShrink: 0, background: 'var(--card)', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Active Job / Progress Tracker */}
          {selectedJob && selectedJob.status === 'processing' && (
            <div className="glass" style={{ padding: '15px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(0, 242, 254, 0.02)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>{t('progress')}</h4>
              <div style={{ fontSize: '11px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Aşama: <strong>{progressMsg}</strong></span>
                <span>{progressPercent}%</span>
              </div>
              <div style={{ height: '6px', background: '#070a14', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }}></div>
              </div>
              <button onClick={() => handleCancelJob(selectedJob.id)} className="btn btn-danger" style={{ width: '100%', padding: '5px', fontSize: '11px', marginTop: '12px' }}>
                Üretimi İptal Et
              </button>
            </div>
          )}

          {/* Social Meta / Publisher Config (Awaiting Approval or Completed) */}
          {selectedJob && (selectedJob.status === 'awaiting_approval' || selectedJob.status === 'completed') && (
            <div className="glass" style={{ padding: '15px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>SOSYAL MEDYA KOPYALARI</h4>
                {selectedJob.status === 'awaiting_approval' && (
                  <span style={{ fontSize: '9px', background: 'var(--warning)', color: '#0b0f19', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold' }}>ONAY BEKLİYOR</span>
                )}
              </div>

              {/* Title input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Video Başlığı (YouTube)</label>
                <input 
                  type="text" 
                  value={metaYtTitle}
                  onChange={(e) => setMetaYtTitle(e.target.value)}
                  style={{ background: '#070a14', border: '1px solid var(--border)', borderRadius: '4px', color: 'white', padding: '6px 10px', fontSize: '12px', outline: 'none' }}
                />
              </div>

              {/* Description input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Video Açıklaması</label>
                <textarea 
                  value={metaYtDesc}
                  onChange={(e) => setMetaYtDesc(e.target.value)}
                  style={{ height: '80px', background: '#070a14', border: '1px solid var(--border)', borderRadius: '4px', color: 'white', padding: '6px 10px', fontSize: '11px', outline: 'none', resize: 'none' }}
                />
              </div>

              {/* Tags input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Etiketler / Hashtags (virgülle ayırın)</label>
                <input 
                  type="text" 
                  value={metaYtTags}
                  onChange={(e) => setMetaYtTags(e.target.value)}
                  style={{ background: '#070a14', border: '1px solid var(--border)', borderRadius: '4px', color: 'white', padding: '6px 10px', fontSize: '12px', outline: 'none' }}
                />
              </div>

              {/* Save / Approve Button */}
              <button 
                onClick={handleSaveMetaAndPublish}
                disabled={isMetaSaving}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Share2 size={12} />
                {isMetaSaving ? 'Kaydediliyor...' : (selectedJob.status === 'awaiting_approval' ? 'Onayla ve Yayınla' : 'Metinleri Kaydet ve Paylaş')}
              </button>
            </div>
          )}

          {/* PROJECT GALLERY */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{t('gallery')}</h4>
              <button onClick={fetchJobs} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <RefreshCw size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {jobs.map((job) => {
                const isActive = selectedJob?.id === job.id;
                return (
                  <div 
                    key={job.id}
                    onClick={() => {
                      setSelectedJob(job);
                      setMetaYtTitle(job.yt_title || '');
                      setMetaYtDesc(job.yt_desc || '');
                      setMetaYtTags(job.yt_tags || '');
                    }}
                    className="glass"
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: isActive ? 'rgba(0, 242, 254, 0.03)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Proje #{job.id}</span>
                      <span style={{
                        fontSize: '9px', fontWeight: 'bold',
                        color: job.status === 'completed' ? 'var(--success)' : (job.status === 'failed' ? 'var(--danger)' : 'var(--warning)')
                      }}>
                        {job.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'white', fontWeight: 600, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.master_prompt}
                    </div>

                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Sahneler: {job.completed_scenes} / {job.total_scenes} | Model: {job.model_type || 'CogVideo'}
                    </div>

                    {/* Delete button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteJob(job.id);
                      }}
                      title="Projeyi Sil"
                      style={{
                        position: 'absolute', bottom: '8px', right: '8px',
                        background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.7)',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* PHOTO EDITOR MODAL (ODYSSEUS) */}
      {editingImageScene && (
        <PhotoEditor 
          imageUrl={editingImageScene.image_path || '/uploads/scene_placeholder.jpg'}
          onClose={() => setEditingImageScene(null)}
          onSave={async (newImageUrl: string) => {
            // Update local scene visual path
            const updated = scenes.map(s => {
              if (s.id === editingImageScene.id) {
                return { ...s, image_path: newImageUrl };
              }
              return s;
            });
            handleUpdateScenes(updated);
            setEditingImageScene(null);
          }}
        />
      )}
    </div>
  );
}
