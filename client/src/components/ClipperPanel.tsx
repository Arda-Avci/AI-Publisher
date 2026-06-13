/**
 * ClipperPanel - Autonomous Clipping & Smart Cropper Interface
 * Premium glassmorphism/cyberpunk design supporting future editing workflows
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Language } from '../types.js';

interface ClipSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  score: number;
  reason?: string;
  highlights?: string[];
  suggestedCaption?: string;
  suggestedHashtags?: string[];
}

interface ClipJob {
  id: string;
  videoId: number;
  userId: number;
  sourceVideoPath: string;
  segments: ClipSegment[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  outputPaths?: string[];
}

interface ClipperPanelProps {
  language: Language;
  t: (key: string, params?: Record<string, unknown>) => string;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function ClipperPanel({ language, t, onShowToast }: ClipperPanelProps) {
  // Form states
  const [videoPath, setVideoPath] = useState('');
  const [minDuration, setMinDuration] = useState(30);
  const [maxDuration, setMaxDuration] = useState(90);
  const [targetCount, setTargetCount] = useState(5);

  // Future features states (Ready for Phase D, E, F, G, H backends)
  const [cropMode, setCropMode] = useState<'face_tracking' | 'center' | 'static'>('center');
  const [splitLayout, setSplitLayout] = useState<'none' | 'vertical' | 'horizontal'>('none');
  const [bottomTemplate, setBottomTemplate] = useState<'minecraft' | 'satisfying' | 'custom'>('minecraft');
  const [dubbingLang, setDubbingLang] = useState<'none' | 'tr' | 'en' | 'de' | 'es'>('none');
  const [subtitleStyle, setSubtitleStyle] = useState<'dynamic_hormozi' | 'modern_minimal' | 'classic_embedded'>('dynamic_hormozi');
  const [subtitleEffect, setSubtitleEffect] = useState<'bounce' | 'pulse' | 'shake' | 'none'>('bounce');
  const [colorGrading, setColorGrading] = useState('');

  // UI / Data states
  const [jobs, setJobs] = useState<ClipJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<ClipJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all clip jobs
  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetch('/api/v1/clipper/list');
      const d = await r.json();
      if (d.clips) {
        setJobs(d.clips);
        // Keep selected job updated if it is in the list
        if (selectedJob) {
          const updated = d.clips.find((j: ClipJob) => j.id === selectedJob.id);
          if (updated) setSelectedJob(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch clip jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    fetchJobs();
    // Poll active jobs if any
    const activePoll = setInterval(() => {
      const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'processing');
      if (hasActive) {
        fetchJobs();
      }
    }, 4000);
    return () => clearInterval(activePoll);
  }, [fetchJobs, jobs]);

  // Submit new clipping job
  const handleStartExtraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPath.trim()) {
      onShowToast?.(language === 'tr' ? 'Lütfen bir video yolu belirtin.' : 'Please provide a video path.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const r = await fetch('/api/v1/clipper/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath,
          minDuration,
          maxDuration,
          targetCount,
          // Sending future features parameters so backend receives them safely
          cropMode,
          splitLayout,
          bottomTemplate,
          dubbingLang,
          subtitleStyle,
          subtitleEffect,
          colorGrading,
        }),
      });
      const d = await r.json();
      if (r.ok && d.jobId) {
        onShowToast?.(
          language === 'tr' 
            ? 'Otonom kırpma işlemi asenkron kuyrukta başlatıldı.' 
            : 'Autonomous clipping job started in the async queue.',
          'success'
        );
        setVideoPath('');
        fetchJobs();
      } else {
        onShowToast?.(d.error || (language === 'tr' ? 'İşlem başlatılamadı.' : 'Failed to start job.'), 'error');
      }
    } catch (err) {
      onShowToast?.(language === 'tr' ? 'Bağlantı hatası oluştu.' : 'Connection error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export single clip segment
  const handleExportSegment = async (jobId: string, segmentId: string) => {
    try {
      onShowToast?.(
        language === 'tr' ? 'Klip dışa aktarılıyor (FFmpeg)...' : 'Exporting clip (FFmpeg)...',
        'info'
      );
      const r = await fetch(`/api/v1/clipper/${jobId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentIds: [segmentId],
          aspectRatio: cropMode === 'static' ? '16:9' : '9:16',
          addSubtitles: subtitleStyle !== 'classic_embedded',
          // Additional future parameters
          splitLayout,
          bottomTemplate,
          dubbingLang,
          subtitleStyle,
          subtitleEffect,
          colorGrading,
        }),
      });
      const d = await r.json();
      if (r.ok && d.outputPaths) {
        onShowToast?.(
          language === 'tr' ? 'Klip başarıyla dışa aktarıldı!' : 'Clip successfully exported!',
          'success'
        );
        fetchJobs();
      } else {
        onShowToast?.(d.error || 'Export failed', 'error');
      }
    } catch (err) {
      onShowToast?.('Export failed', 'error');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flex: 1,
      minHeight: 0,
      gap: '12px',
      padding: '12px',
      background: 'rgba(10, 10, 20, 0.6)',
      borderRadius: '12px',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden'
    }}>
      {/* Sol Panel: Parametreler & Form */}
      <div style={{
        width: '340px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        paddingRight: '12px',
        overflowY: 'auto'
      }}>
        <div style={{
          padding: '12px',
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
        }}>
          <h3 style={{
            margin: '0 0 4px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#A78BFA',
            letterSpacing: '0.02em',
          }}>
            {language === 'tr' ? 'Otonom Kırpıcı & Clipper' : 'Autonomous Clipper'}
          </h3>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {language === 'tr' 
              ? 'Uzun yatay videoları analiz edin ve en yüksek viral skora sahip dikey kesitleri otomatik çıkarın.' 
              : 'Analyze long horizontal videos and automatically extract vertical highlights with high viral potential.'}
          </p>
        </div>

        <form onSubmit={handleStartExtraction} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Video Dosya Yolu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#D1D5DB' }}>
              {language === 'tr' ? 'Video Dosya Yolu' : 'Video File Path'}
            </label>
            <input
              type="text"
              value={videoPath}
              onChange={e => setVideoPath(e.target.value)}
              placeholder="C:/Proje/AI-Publisher/videolar/video.mp4"
              required
              style={{
                padding: '8px 10px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Süre Parametreleri */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: '#D1D5DB' }}>
                {language === 'tr' ? 'Min Süre (sn)' : 'Min Duration (s)'}
              </label>
              <input
                type="number"
                value={minDuration}
                onChange={e => setMinDuration(Number(e.target.value))}
                min={5}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 600, color: '#D1D5DB' }}>
                {language === 'tr' ? 'Max Süre (sn)' : 'Max Duration (s)'}
              </label>
              <input
                type="number"
                value={maxDuration}
                onChange={e => setMaxDuration(Number(e.target.value))}
                max={300}
                style={{
                  padding: '8px 10px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Hedef Klip Sayısı */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#D1D5DB' }}>
              {language === 'tr' ? 'Klip Adedi' : 'Target Clip Count'}
            </label>
            <input
              type="number"
              value={targetCount}
              onChange={e => setTargetCount(Number(e.target.value))}
              min={1}
              max={20}
              style={{
                padding: '8px 10px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{
            margin: '8px 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            paddingTop: '8px'
          }}>
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '11px',
              fontWeight: 600,
              color: '#C4B5FD',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {language === 'tr' ? 'Gelişmiş Kurgu Seçenekleri' : 'Advanced Editing Options'}
            </h4>

            {/* Smart Cropper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
              <label style={{ fontSize: '10px', color: '#9CA3AF' }}>
                {language === 'tr' ? 'Smart Cropper (Akıllı Kırpma)' : 'Smart Cropper Mode'}
              </label>
              <select
                value={cropMode}
                onChange={e => setCropMode(e.target.value as any)}
                style={{
                  padding: '6px 8px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '11px',
                  outline: 'none',
                }}
              >
                <option value="center">{language === 'tr' ? 'Merkez Odaklama' : 'Center Crop'}</option>
                <option value="face_tracking">{language === 'tr' ? 'Aktif Yüz Takibi (Faz G)' : 'Active Face Tracking (Phase G)'}</option>
                <option value="static">{language === 'tr' ? 'Statik Geniş Ekran (16:9)' : 'Static Widescreen (16:9)'}</option>
              </select>
            </div>

            {/* Split Screen */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
              <label style={{ fontSize: '10px', color: '#9CA3AF' }}>
                {language === 'tr' ? 'A/B Split-Screen Düzeni' : 'A/B Split-Screen Layout'}
              </label>
              <select
                value={splitLayout}
                onChange={e => setSplitLayout(e.target.value as any)}
                style={{
                  padding: '6px 8px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '11px',
                  outline: 'none',
                }}
              >
                <option value="none">{language === 'tr' ? 'Dikey Tek Ekran' : 'Single Vertical'}</option>
                <option value="vertical">{language === 'tr' ? 'Üst/Alt Bölünmüş Ekran' : 'Top/Bottom Split'}</option>
                <option value="horizontal">{language === 'tr' ? 'Yan Yana Bölünmüş Ekran' : 'Side-by-Side Split'}</option>
              </select>
            </div>

            {/* Split Screen Template */}
            {splitLayout !== 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                <label style={{ fontSize: '10px', color: '#9CA3AF' }}>
                  {language === 'tr' ? 'Alt Ekran Video Şablonu' : 'Bottom Screen Template'}
                </label>
                <select
                  value={bottomTemplate}
                  onChange={e => setBottomTemplate(e.target.value as any)}
                  style={{
                    padding: '6px 8px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                >
                  <option value="minecraft">Minecraft Parkour</option>
                  <option value="satisfying">ASMR / Satisfying Video</option>
                  <option value="custom">{language === 'tr' ? 'Özel Dosya Yolu...' : 'Custom File Path...'}</option>
                </select>
              </div>
            )}

            {/* Dubbing Lang */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
              <label style={{ fontSize: '10px', color: '#9CA3AF' }}>
                {language === 'tr' ? 'Çok Dilli Dublaj (Faz D)' : 'Voice Dubbing (Phase D)'}
              </label>
              <select
                value={dubbingLang}
                onChange={e => setDubbingLang(e.target.value as any)}
                style={{
                  padding: '6px 8px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '11px',
                  outline: 'none',
                }}
              >
                <option value="none">{language === 'tr' ? 'Orijinal Ses' : 'Original Audio'}</option>
                <option value="tr">Türkçe (Dublaj)</option>
                <option value="en">English (Dubbing)</option>
                <option value="de">Deutsch (Dubbing)</option>
                <option value="es">Español (Dubbing)</option>
              </select>
            </div>

            {/* Subtitle Styles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: '#9CA3AF' }}>
                  {language === 'tr' ? 'Altyazı Stili' : 'Subtitle Style'}
                </label>
                <select
                  value={subtitleStyle}
                  onChange={e => setSubtitleStyle(e.target.value as any)}
                  style={{
                    padding: '6px 8px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                >
                  <option value="dynamic_hormozi">{language === 'tr' ? 'Hormozi Tarzı' : 'Hormozi Style'}</option>
                  <option value="modern_minimal">{language === 'tr' ? 'Minimal Modern' : 'Minimal'}</option>
                  <option value="classic_embedded">{language === 'tr' ? 'FFmpeg Drawtext' : 'Drawtext'}</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', color: '#9CA3AF' }}>
                  {language === 'tr' ? 'Animasyon Efekti' : 'Animation Effect'}
                </label>
                <select
                  value={subtitleEffect}
                  onChange={e => setSubtitleEffect(e.target.value as any)}
                  style={{
                    padding: '6px 8px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '11px',
                    outline: 'none',
                  }}
                >
                  <option value="bounce">Bounce (Zıpla)</option>
                  <option value="pulse">Pulse (Vurgu)</option>
                  <option value="shake">Shake (Sarsıntı)</option>
                  <option value="none">None (Düz)</option>
                </select>
              </div>
            </div>

            {/* Color Grading */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: '#9CA3AF' }}>
                {language === 'tr' ? 'Renk Derecelendirme (Faz E)' : 'Color Grading (Phase E)'}
              </label>
              <input
                type="text"
                value={colorGrading}
                onChange={e => setColorGrading(e.target.value)}
                placeholder="Warm Cinematic, Cyberpunk Neon, Vintage..."
                style={{
                  padding: '6px 8px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '11px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(99, 102, 241, 0.8))',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
              marginTop: '8px'
            }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #fff',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite'
                }} />
                {language === 'tr' ? 'Analiz Ediliyor...' : 'Analyzing Video...'}
              </>
            ) : (
              <>
                <span>✂️</span> {language === 'tr' ? 'Klipleri Çıkar' : 'Extract Clips'}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Sağ Panel: Aktif İşler & Sonuç Segmentler */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflow: 'hidden'
      }}>
        {/* İşlerin Listesi */}
        <div style={{
          maxHeight: '180px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {language === 'tr' ? 'Clipper Görev Geçmişi' : 'Clipper Job History'}
          </h4>

          {jobs.map(job => {
            const isSelected = selectedJob?.id === job.id;
            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                style={{
                  padding: '8px 12px',
                  background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(30, 30, 55, 0.4)',
                  border: isSelected ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#E5E7EB' }}>
                    {job.sourceVideoPath.split(/[/\\]/).pop()}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {new Date(job.createdAt).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {job.segments?.length > 0 && (
                    <span style={{
                      fontSize: '10px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      color: '#60A5FA'
                    }}>
                      {job.segments.length} Clips
                    </span>
                  )}
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    background: job.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : job.status === 'failed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: job.status === 'completed' ? '#34D399' : job.status === 'failed' ? '#F87171' : '#FBBF24'
                  }}>
                    {job.status}
                  </span>
                </div>
              </div>
            );
          })}

          {jobs.length === 0 && !isLoading && (
            <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center' }}>
              {language === 'tr' ? 'Henüz kırpma görevi oluşturulmadı.' : 'No clipping jobs created yet.'}
            </div>
          )}
        </div>

        {/* Seçilen İşin Segmentleri */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflow: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '12px', color: '#E5E7EB', fontWeight: 600 }}>
              {selectedJob 
                ? `${t('segments')} - ${selectedJob.sourceVideoPath.split(/[/\\]/).pop()}`
                : (language === 'tr' ? 'Çıkartılan Viral Klipler' : 'Extracted Viral Clips')}
            </h4>
          </div>

          {selectedJob ? (
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '10px',
              paddingBottom: '12px'
            }}>
              {selectedJob.status === 'completed' && selectedJob.segments?.map(segment => (
                <div
                  key={segment.id}
                  style={{
                    background: 'rgba(20, 20, 35, 0.7)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                    transition: 'transform 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* Viral Puan Göstergesi */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(236, 72, 153, 0.3)'
                  }}>
                    {segment.score}
                  </div>

                  <div>
                    {/* Süre Bilgisi */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '10px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        color: '#9CA3AF',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        ⏱️ {segment.startTime.toFixed(1)}s - {segment.endTime.toFixed(1)}s ({segment.duration.toFixed(1)}s)
                      </span>
                    </div>

                    {/* Metin / Caption */}
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 600, color: '#F3F4F6' }}>
                      {segment.suggestedCaption || (language === 'tr' ? 'Klip Başlığı' : 'Clip Caption')}
                    </h5>

                    {/* Gerekçe */}
                    <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {segment.reason || 'General viral momentum'}
                    </p>

                    {/* Hashtag listesi */}
                    {segment.suggestedHashtags && segment.suggestedHashtags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {segment.suggestedHashtags.map((tag, idx) => (
                          <span key={idx} style={{ fontSize: '9px', color: '#C4B5FD', fontFamily: 'var(--font-mono)' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      onClick={() => handleExportSegment(selectedJob.id, segment.id)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid #10B981',
                        borderRadius: '4px',
                        color: '#34D399',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}
                    >
                      {language === 'tr' ? 'Kırp ve Export' : 'Crop & Export'}
                    </button>
                    <button
                      onClick={() => onShowToast?.(language === 'tr' ? 'Sosyal Medya Yayın Motoru Tetiklendi!' : 'Social Media Publisher Triggered!', 'success')}
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid #8B5CF6',
                        borderRadius: '4px',
                        color: '#A78BFA',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'}
                    >
                      🚀
                    </button>
                  </div>
                </div>
              ))}

              {selectedJob.status === 'processing' && (
                <div style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  color: 'var(--text-muted)'
                }}>
                  <div className="spinner" style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(139, 92, 246, 0.2)',
                    borderTopColor: '#8B5CF6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '12px'
                  }} />
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#E5E7EB' }}>
                    {language === 'tr' ? 'Video Deşifre Ediliyor ve Viral Segmentler Analiz Ediliyor...' : 'Transcribing and Analyzing Video Highlights...'}
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                    {language === 'tr' ? 'Lütfen bekleyin, bu işlem videonun uzunluğuna bağlı olarak birkaç dakika sürebilir.' : 'Please wait, this might take a few minutes depending on the video length.'}
                  </div>
                </div>
              )}

              {selectedJob.status === 'failed' && (
                <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: '#F87171', fontSize: '12px' }}>
                  ❌ {language === 'tr' ? 'Kırpıcı analizi başarısız oldu.' : 'Clipper analysis failed.'}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              background: 'rgba(0, 0, 0, 0.1)',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>✂️</div>
              <div style={{ fontSize: '12px' }}>
                {language === 'tr' 
                  ? 'Klipleri görmek için listeden bir clipper görevi seçin veya soldan yeni bir tane başlatın.' 
                  : 'Select a clipper job from the list or start a new one to view viral clips.'}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
