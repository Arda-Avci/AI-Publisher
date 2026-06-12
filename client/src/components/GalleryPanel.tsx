import { useState, useEffect } from 'react';
import type React from 'react';
import { RefreshCw, Trash2, Share2, Loader, Cpu, Zap,  Beaker, ChevronDown, ChevronUp } from 'lucide-react';
import type { Job, UserCredits } from '../types.js';

/* ─── Colab status types ─── */

interface ColabStatusData {
  gpu?: string;
  gpuModel?: string;
  vram_used?: number;
  vram_total?: number;
  status?: string;
  isRunning?: boolean;
}

interface ModelTestEntry {
  model: string;
  status: string;
  vram?: number;
  error?: string;
}

/* ─── Props ─── */

interface GalleryPanelProps {
  jobs: Job[];
  selectedJob: Job | null;
  metaYtTitle: string;
  metaYtDesc: string;
  metaYtTags: string;
  isMetaSaving: boolean;
  progressMsg: string;
  progressPercent: number;
  userCredits?: UserCredits | null;
  onSelectJob: (job: Job) => void;
  onRefreshJobs: () => void;
  onCancelJob: (id: number) => void;
  onDeleteJob: (id: number) => void;
  onSetMetaYtTitle: (v: string) => void;
  onSetMetaYtDesc: (v: string) => void;
  onSetMetaYtTags: (v: string) => void;
  onSaveMetaAndPublish: () => void;
  t: (key: string, params?: Record<string, any>) => string;
}

export function GalleryPanel({
  jobs, selectedJob, metaYtTitle, metaYtDesc, metaYtTags, isMetaSaving,
  progressMsg, progressPercent, userCredits,
  onSelectJob, onRefreshJobs, onCancelJob, onDeleteJob,
  onSetMetaYtTitle, onSetMetaYtDesc, onSetMetaYtTags,
  onSaveMetaAndPublish, t,
}: GalleryPanelProps) {
  return (
    <aside className="sidebar-right" style={{
      width: '340px', flexShrink: 0, background: 'var(--card)',
      padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px',
    }}>
      <ColabStatusPanel />

      {userCredits && (
        <CreditsBadge credits={userCredits.credits} limit={userCredits.limit} resetDate={userCredits.resetDate} />
      )}

      {selectedJob?.status === 'processing' && (
        <ProgressTracker
          progressMsg={progressMsg}
          progressPercent={progressPercent}
          onCancel={() => onCancelJob(selectedJob.id)}
        />
      )}

      {selectedJob && (selectedJob.status === 'awaiting_approval' || selectedJob.status === 'completed') && (
        <MetaEditor
          status={selectedJob.status}
          ytTitle={metaYtTitle}
          ytDesc={metaYtDesc}
          ytTags={metaYtTags}
          isSaving={isMetaSaving}
          onSetYtTitle={onSetMetaYtTitle}
          onSetYtDesc={onSetMetaYtDesc}
          onSetYtTags={onSetMetaYtTags}
          onSave={onSaveMetaAndPublish}
        />
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            {t('gallery')}
          </h4>
          <button
            onClick={onRefreshJobs}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={12} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {jobs.map((job) => {
            const isActive = selectedJob?.id === job.id;
            return (
              <div
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="glass"
                style={{
                  padding: '10px', borderRadius: '8px',
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: isActive ? 'rgba(0, 242, 254, 0.03)' : 'var(--bg-surface)',
                  cursor: 'pointer', transition: 'var(--transition)', position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Proje #{job.id}</span>
                  <StatusBadge status={job.status} />
                </div>
                <div style={{
                  fontSize: '12px', color: 'white', fontWeight: 600, marginTop: '4px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {job.master_prompt}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Sahneler: {job.completed_scenes} / {job.total_scenes} | Model: {job.model_type || 'CogVideo'}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteJob(job.id); }}
                  title="Projeyi Sil"
                  style={{
                    position: 'absolute', bottom: '8px', right: '8px',
                    background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.7)', cursor: 'pointer',
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
  );
}

function StatusBadge({ status }: { status: Job['status'] }) {
  const colors: Record<Job['status'], string> = {
    completed: 'var(--success)',
    failed: 'var(--danger)',
    processing: 'var(--warning)',
    pending: 'var(--text-muted)',
    awaiting_approval: 'var(--warning)',
  };
  return (
    <span style={{ fontSize: '9px', fontWeight: 'bold', color: colors[status] || 'var(--text-muted)' }}>
      {status.toUpperCase()}
    </span>
  );
}

function ProgressTracker({
  progressMsg, progressPercent, onCancel,
}: {
  progressMsg: string; progressPercent: number; onCancel: () => void;
}) {
  return (
    <div className="glass" style={{
      padding: '15px', borderRadius: '10px', border: '1px solid var(--border)',
      background: 'rgba(0, 242, 254, 0.02)',
    }}>
      <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>İlerleme</h4>
      <div style={{ fontSize: '11px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Aşama: <strong>{progressMsg}</strong></span>
        <span>{progressPercent}%</span>
      </div>
      <div style={{ height: '6px', background: '#070a14', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
      </div>
      <button onClick={onCancel} className="btn btn-danger" style={{ width: '100%', padding: '5px', fontSize: '11px', marginTop: '12px' }}>
        Üretimi İptal Et
      </button>
    </div>
  );
}

function MetaEditor({
  status, ytTitle, ytDesc, ytTags, isSaving,
  onSetYtTitle, onSetYtDesc, onSetYtTags, onSave,
}: {
  status: string; ytTitle: string; ytDesc: string; ytTags: string; isSaving: boolean;
  onSetYtTitle: (v: string) => void; onSetYtDesc: (v: string) => void; onSetYtTags: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="glass" style={{
      padding: '15px', borderRadius: '10px', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>SOSYAL MEDYA KOPYALARI</h4>
        {status === 'awaiting_approval' && (
          <span style={{ fontSize: '9px', background: 'var(--warning)', color: '#0b0f19', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold' }}>
            ONAY BEKLİYOR
          </span>
        )}
      </div>

      <MetaField label="Video Başlığı (YouTube)">
        <input type="text" value={ytTitle} onChange={(e) => onSetYtTitle(e.target.value)}
          style={inputStyle} />
      </MetaField>
      <MetaField label="Video Açıklaması">
        <textarea value={ytDesc} onChange={(e) => onSetYtDesc(e.target.value)}
          style={{ ...inputStyle, height: '80px', resize: 'none' }} />
      </MetaField>
      <MetaField label="Etiketler / Hashtags (virgülle ayırın)">
        <input type="text" value={ytTags} onChange={(e) => onSetYtTags(e.target.value)}
          style={inputStyle} />
      </MetaField>

      <button
        onClick={onSave}
        disabled={isSaving}
        className="btn btn-primary"
        style={{ width: '100%', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
      >
        {isSaving ? <Loader size={12} className="pulse" /> : <Share2 size={12} />}
        {isSaving ? 'Kaydediliyor...' : (status === 'awaiting_approval' ? 'Onayla ve Yayınla' : 'Metinleri Kaydet ve Paylaş')}
      </button>
    </div>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}

/* ─── Colab Status Panel ─── */

function ColabStatusPanel() {
  const [data, setData] = useState<ColabStatusData | null>(null);
  const [testResults, setTestResults] = useState<ModelTestEntry[] | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/v1/colab/status');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch { /* server may be offline */ }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleTestModels = async () => {
    setTestLoading(true);
    setTestOpen(true);
    try {
      const res = await fetch('/api/v1/colab/test-models');
      const json = await res.json();
      setTestResults(Array.isArray(json) ? json : json.results ?? []);
    } catch {
      setTestResults([{ model: 'Bağlantı Hatası', status: 'error', error: 'Sunucuya ulaşılamadı' }]);
    } finally {
      setTestLoading(false);
    }
  };

  const gpuModel = data?.gpu ?? data?.gpuModel ?? 'Bağlı Değil';
  const isRunning = data?.isRunning ?? data?.status === 'running';
  const vramUsed = data?.vram_used ?? 0;
  const vramTotal = data?.vram_total ?? 0;
  const isL4 = gpuModel.toLowerCase().includes('l4');

  return (
    <div className="glass" style={{
      padding: '14px', borderRadius: '10px', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Cpu size={14} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', flex: 1 }}>Colab GPU</span>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isRunning ? '#22c55e' : '#ef4444',
          display: 'inline-block',
          boxShadow: isRunning ? '0 0 6px #22c55e' : '0 0 6px #ef4444',
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
        <Row label="GPU" value={
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {gpuModel}
            {isL4 && <Zap size={10} style={{ color: '#eab308' }} aria-label="L4"/>}
          </span>
        } />
        <Row label="VRAM" value={
          vramTotal > 0 ? `${vramUsed.toFixed(1)} / ${vramTotal.toFixed(1)} GB` : '—'
        } />
        <Row label="Durum" value={
          <span style={{ color: isRunning ? '#22c55e' : '#ef4444' }}>
            {isRunning ? 'Çalışıyor' : 'Durduruldu'}
          </span>
        } />
      </div>

      <button
        onClick={handleTestModels}
        className="btn btn-primary"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', padding: '6px 10px' }}
      >
        <Beaker size={12} />
        Modelleri Test Et
      </button>

      {testOpen && testResults && (
        <div style={{ marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <div
            onClick={() => setTestOpen(!testOpen)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}
          >
            Test Sonuçları
            {testOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {testResults.map((r, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.25)', fontSize: '10px',
              }}>
                <span style={{ fontWeight: 600 }}>{r.model}</span>
                <span style={{
                  color: r.status === 'loaded' || r.status === 'ok' ? '#22c55e' :
                         r.status === 'error' ? '#ef4444' : 'var(--text-muted)',
                }}>
                  {r.status === 'loaded' || r.status === 'ok' ? '✓' : r.status === 'error' ? '✗' : r.status}
                  {r.vram != null ? `  ${r.vram.toFixed(1)} GB` : ''}
                  {r.error ? `  ${r.error}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {testLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <Loader size={12} className="pulse" />
          Test ediliyor...
        </div>
      )}
    </div>
  );
}

/* ─── Credits Badge ─── */

function CreditsBadge({ credits, limit, resetDate }: { credits: number; limit: number; resetDate?: string }) {
  const ratio = limit > 0 ? credits / limit : 1;
  const barColor = ratio > 0.8 ? 'var(--danger)' : ratio > 0.5 ? 'var(--warning)' : 'var(--success)';
  return (
    <div className="glass" style={{
      padding: '10px 14px', borderRadius: '10px', border: `1px solid ${barColor}33`,
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Krediniz</span>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>
          {credits} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>/ {limit}</span>
        </span>
      </div>
      <div style={{ height: '4px', background: '#070a14', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(ratio * 100, 100)}%`, height: '100%', background: barColor, transition: 'width 0.3s ease' }} />
      </div>
      {resetDate && (
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right' }}>
          Sıfırlanma: {new Date(resetDate).toLocaleDateString('tr-TR')}
        </div>
      )}
    </div>
  );
}

/* ─── Inline helper ─── */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'white' }}>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#070a14', border: '1px solid var(--border)', borderRadius: '4px',
  color: 'white', padding: '6px 10px', fontSize: '12px', outline: 'none',
};
