import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type React from 'react';
import {
  RefreshCw,
  Trash2,
  Share2,
  Loader,
  Cpu,
  Zap,
  Beaker,
  ChevronDown,
  ChevronUp,
  Monitor,
  Video,
  TrendingUp,
  ImageUp,
  Download,
} from 'lucide-react';
import { CoverSelector } from './CoverSelector.js';
import type { Job, UserCredits } from '../types.js';

interface DockerStatusData {
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

interface LogLine {
  text: string;
  isMain?: boolean;
  indent?: boolean;
  progress?: number;
}

interface SystemLogEntry {
  time: string;
  lines: LogLine[];
}

interface GalleryPanelProps {
  jobs: Job[];
  selectedJob: Job | null;
  metaYtTitle: string;
  metaYtDesc: string;
  metaYtTags: string;
  metaTtDesc: string;
  metaTtTags: string;
  metaXDesc: string;
  metaXTags: string;
  metaMetaDesc: string;
  metaMetaTags: string;
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
  onSetMetaTtDesc: (v: string) => void;
  onSetMetaTtTags: (v: string) => void;
  onSetMetaXDesc: (v: string) => void;
  onSetMetaXTags: (v: string) => void;
  onSetMetaMetaDesc: (v: string) => void;
  onSetMetaMetaTags: (v: string) => void;
  onSaveMetaAndPublish: () => void;
  onAnalyzeViralScore?: (jobId: number) => void;
  onSelectCover?: (jobId: number, path: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const statusLabel = (status: Job['status']): string => {
  const labels: Record<Job['status'], string> = {
    pending: 'Beklemede',
    processing: 'İşleniyor',
    completed: 'Tamamlandı',
    failed: 'Başarısız',
    awaiting_approval: 'Onay Bekliyor',
  };
  return labels[status] || status;
};

export function GalleryPanel({
  jobs,
  selectedJob,
  metaYtTitle,
  metaYtDesc,
  metaYtTags,
  metaTtDesc,
  metaTtTags,
  metaXDesc,
  metaXTags,
  metaMetaDesc,
  metaMetaTags,
  isMetaSaving,
  progressMsg,
  progressPercent,
  userCredits,
  onSelectJob,
  onRefreshJobs,
  onCancelJob,
  onDeleteJob,
  onSetMetaYtTitle,
  onSetMetaYtDesc,
  onSetMetaYtTags,
  onSetMetaTtDesc,
  onSetMetaTtTags,
  onSetMetaXDesc,
  onSetMetaXTags,
  onSetMetaMetaDesc,
  onSetMetaMetaTags,
  onSaveMetaAndPublish,
  onAnalyzeViralScore,
  onSelectCover,
  t,
}: GalleryPanelProps) {
  const [systemLogEntries, setSystemLogEntries] = useState<SystemLogEntry[]>([
    {
      time: new Date().toLocaleTimeString('tr-TR'),
      lines: [
        { text: 'AI Publisher sistemi başlatıldı', isMain: true },
        { text: 'WebSocket bağlantısı kuruldu', indent: true },
      ],
    },
  ]);

  const addLog = useCallback((lines: LogLine[]) => {
    setSystemLogEntries((prev) =>
      [...prev, { time: new Date().toLocaleTimeString('tr-TR'), lines }].slice(-50),
    );
  }, []);

  const prevJobKey = useMemo(() => {
    if (!selectedJob) return null;
    return `${selectedJob.id}_${selectedJob.status}`;
  }, [selectedJob?.id, selectedJob?.status]);

  const [lastProcessedKey, setLastProcessedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!prevJobKey || prevJobKey === lastProcessedKey) return;
    setLastProcessedKey(prevJobKey);
    if (selectedJob!.status === 'processing') {
      addLog([
        { text: `Proje #${selectedJob!.id} işleniyor`, isMain: true },
        { text: `Sahneler: 0 / ${selectedJob!.total_scenes}`, indent: true },
      ]);
    } else if (selectedJob!.status === 'completed') {
      addLog([
        { text: `Proje #${selectedJob!.id} tamamlandı`, isMain: true },
        { text: `Final video hazır`, indent: true },
      ]);
    } else {
      addLog([
        { text: `Proje #${selectedJob!.id} → ${statusLabel(selectedJob!.status)}`, isMain: true },
      ]);
    }
  }, [prevJobKey, lastProcessedKey, addLog]);

  const prevScenes = useMemo(() => {
    if (!selectedJob) return -1;
    return selectedJob.completed_scenes;
  }, [selectedJob?.completed_scenes]);
  const [lastScenes, setLastScenes] = useState(-1);

  useEffect(() => {
    if (!selectedJob || prevScenes <= lastScenes) return;
    setLastScenes(prevScenes);
    addLog([
      {
        text: `Sahne ${selectedJob.completed_scenes}/${selectedJob.total_scenes} tamamlandı`,
        isMain: true,
      },
    ]);
  }, [prevScenes, lastScenes, selectedJob, addLog]);

  const [lastMsg, setLastMsg] = useState('');

  useEffect(() => {
    if (!progressMsg || progressMsg === lastMsg) return;
    setLastMsg(progressMsg);
    const lines: LogLine[] = [{ text: progressMsg, isMain: true }];
    if (progressPercent > 0 && progressPercent < 100) {
      lines.push({ text: '', progress: progressPercent });
    }
    addLog(lines);
  }, [progressMsg, progressPercent, lastMsg, addLog]);

  const recentProductions = useMemo(
    () => jobs.filter((j) => j.status === 'completed').slice(-4),
    [jobs],
  );

  const isProcessing = selectedJob?.status === 'processing';
  const showMeta =
    selectedJob &&
    (selectedJob.status === 'awaiting_approval' || selectedJob.status === 'completed');

  return (
    <aside
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 16px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <DockerStatusPanel />
        {userCredits && (
          <CreditsBadge
            credits={userCredits.credits}
            limit={userCredits.limit}
            resetDate={userCredits.resetDate}
          />
        )}
        {isProcessing && (
          <ProgressTracker
            progressMsg={progressMsg}
            progressPercent={progressPercent}
            onCancel={() => onCancelJob(selectedJob.id)}
          />
        )}
{showMeta && (
            <MetaEditor
              job={selectedJob}
              ytTitle={metaYtTitle}
              ytDesc={metaYtDesc}
              ytTags={metaYtTags}
              ttDesc={metaTtDesc}
              ttTags={metaTtTags}
              xDesc={metaXDesc}
              xTags={metaXTags}
              metaDesc={metaMetaDesc}
              metaTags={metaMetaTags}
              isSaving={isMetaSaving}
              onSetYtTitle={onSetMetaYtTitle}
              onSetYtDesc={onSetMetaYtDesc}
              onSetYtTags={onSetMetaYtTags}
              onSetTtDesc={onSetMetaTtDesc}
              onSetTtTags={onSetMetaTtTags}
              onSetXDesc={onSetMetaXDesc}
              onSetXTags={onSetMetaXTags}
              onSetMetaDesc={onSetMetaMetaDesc}
              onSetMetaTags={onSetMetaMetaTags}
              onSave={onSaveMetaAndPublish}
              onAnalyzeViralScore={onAnalyzeViralScore}
              onSelectCover={onSelectCover}
              onRefreshJobs={onRefreshJobs}
            />
          )}
      </div>

      {selectedJob?.status === 'completed' && selectedJob.final_filename && (
        <div style={{ padding: '0 16px', marginTop: 12 }}>
          <div
            style={{
              aspectRatio: '16/9',
              borderRadius: 10,
              overflow: 'hidden',
              background: '#000',
              border: '1px solid var(--border)',
            }}
          >
            <video
              src={`/videolar/${selectedJob.final_filename}`}
              controls
              style={{ width: '100%', height: '100%', display: 'block' }}
              preload="metadata"
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <a
              href={`/videolar/${selectedJob.final_filename}`}
              download
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              ⬇ İndir
            </a>
          </div>
        </div>
      )}

      {selectedJob ? (
        <>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              marginTop: '12px',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(24,24,27,0.5)',
              }}
            >
              <Monitor size={14} style={{ color: 'var(--accent)' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.5px',
                }}
              >
                SİSTEM LOGLARI
              </span>
            </div>
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              {systemLogEntries.length === 0 ? (
                <div style={{ opacity: 0.4 }}>Sistem hazır, bekleniyor...</div>
              ) : (
                systemLogEntries.map((entry, i) => <SystemLogEntry key={i} entry={entry} />)
              )}
            </div>
          </div>

          {recentProductions.length > 0 && (
            <div
              style={{
                height: '33%',
                minHeight: '100px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                Son Üretimler
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {recentProductions.map((job) => (
                    <RecentThumbnail key={job.id} job={job} onSelect={() => onSelectJob(job)} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <h4
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: 'var(--text-muted)',
                letterSpacing: '0.5px',
              }}
            >
              {t('gallery')}
            </h4>
            <button
              onClick={onRefreshJobs}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RefreshCw size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="glass"
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Proje #{job.id}
                  </span>
                  <StatusBadge status={job.status} />
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'white',
                    fontWeight: 600,
                    marginTop: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {job.master_prompt}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Sahneler: {job.completed_scenes} / {job.total_scenes} | Model:{' '}
                  {job.model_type || 'CogVideo'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteJob(job.id);
                  }}
                  title="Projeyi Sil"
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(239, 68, 68, 0.7)',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function SystemLogEntry({ entry: { lines } }: { entry: SystemLogEntry }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      {lines.map((line, i) => {
        if (line.progress !== undefined) {
          return (
            <div key={i} style={{ marginTop: '4px', marginBottom: '4px', paddingLeft: '16px' }}>
              <div
                style={{
                  height: '4px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${line.progress}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    boxShadow: '0 0 8px var(--accent-glow)',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        }
        if (i === 0 || line.isMain) {
          return (
            <div key={i} style={{ color: 'var(--accent)', marginBottom: '1px' }}>
              <span style={{ opacity: 0.7 }}>&gt;&gt; </span>
              {line.text}
            </div>
          );
        }
        return (
          <div
            key={i}
            style={{
              paddingLeft: '16px',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '1px',
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
}

function RecentThumbnail({ job, onSelect }: { job: Job; onSelect: () => void }) {
  const coverUrl = job.cover_image_path;

  return (
    <div
      onClick={onSelect}
      style={{
        aspectRatio: '16/9',
        borderRadius: '8px',
        background: coverUrl ? `url(${coverUrl}) center / cover no-repeat` : 'var(--bg-surface)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        opacity: 0.5,
        transition: 'opacity 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.opacity = '0.5';
      }}
      title={job.master_prompt}
    >
      {!coverUrl && <Video size={20} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />}
    </div>
  );
}

function StatusBadge({ status }: { status: Job['status'] }) {
  const dotColors: Record<Job['status'], string> = {
    completed: 'var(--success)',
    failed: 'var(--danger)',
    processing: 'var(--warning)',
    pending: 'var(--text-muted)',
    awaiting_approval: 'var(--warning)',
  };
  const color = dotColors[status] || 'var(--text-muted)';
  return (
    <span
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        display: 'inline-block',
        background: color,
        boxShadow: `0 0 6px ${color}`,
      }}
    />
  );
}

function ProgressTracker({
  progressMsg,
  progressPercent,
  onCancel,
}: {
  progressMsg: string;
  progressPercent: number;
  onCancel: () => void;
}) {
  return (
    <div
      className="glass"
      style={{
        padding: '15px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
      }}
    >
      <h4
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: 'var(--accent)',
          marginBottom: '8px',
        }}
      >
        İlerleme
      </h4>
      <div
        style={{
          fontSize: '11px',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>
          Aşama: <strong>{progressMsg}</strong>
        </span>
        <span>{progressPercent}%</span>
      </div>
      <div
        style={{
          height: '6px',
          background: 'var(--bg-primary)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent), var(--secondary))',
            transition: 'width 0.3s ease',
            borderRadius: '3px',
          }}
        />
      </div>
      <button
        onClick={onCancel}
        className="btn btn-danger"
        style={{
          width: '100%',
          padding: '5px',
          fontSize: '11px',
          marginTop: '12px',
        }}
      >
        Üretimi İptal Et
      </button>
    </div>
  );
}

type PlatformTab = 'youtube' | 'tiktok' | 'x' | 'meta';

function MetaEditor({
  job,
  ytTitle,
  ytDesc,
  ytTags,
  ttDesc,
  ttTags,
  xDesc,
  xTags,
  metaDesc,
  metaTags,
  isSaving,
  onSetYtTitle,
  onSetYtDesc,
  onSetYtTags,
  onSetTtDesc,
  onSetTtTags,
  onSetXDesc,
  onSetXTags,
  onSetMetaDesc,
  onSetMetaTags,
  onSave,
  onAnalyzeViralScore,
  onSelectCover,
  onRefreshJobs,
}: {
  job: Job;
  ytTitle: string;
  ytDesc: string;
  ytTags: string;
  ttDesc: string;
  ttTags: string;
  xDesc: string;
  xTags: string;
  metaDesc: string;
  metaTags: string;
  isSaving: boolean;
  onSetYtTitle: (v: string) => void;
  onSetYtDesc: (v: string) => void;
  onSetYtTags: (v: string) => void;
  onSetTtDesc: (v: string) => void;
  onSetTtTags: (v: string) => void;
  onSetXDesc: (v: string) => void;
  onSetXTags: (v: string) => void;
  onSetMetaDesc: (v: string) => void;
  onSetMetaTags: (v: string) => void;
  onSave: () => void;
  onAnalyzeViralScore?: (jobId: number) => void;
  onSelectCover?: (jobId: number, path: string) => void;
  onRefreshJobs: () => void;
}) {
  const [platformTab, setPlatformTab] = useState<PlatformTab>('youtube');
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [selectedCover, setSelectedCover] = useState('');
  const [kurguLoading, setKurguLoading] = useState(false);
  const [denoise, setDenoise] = useState(true);
  const [equalize, setEqualize] = useState(false);
  const [deecho, setDeecho] = useState(true);
  const [useFaceTracking, setUseFaceTracking] = useState(true);
  const [maskX, setMaskX] = useState('0.1');
  const [maskY, setMaskY] = useState('0.2');
  const [maskW, setMaskW] = useState('0.3');
  const [maskH, setMaskH] = useState('0.4');
  const [upscaleLoading, setUpscaleLoading] = useState(false);
  const upscaleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (job.cover_images) {
      try {
        const parsed = JSON.parse(job.cover_images);
        if (Array.isArray(parsed)) setCoverImages(parsed);
      } catch {}
    }
    if (job.cover_image_path) setSelectedCover(job.cover_image_path);
  }, [job.cover_images, job.cover_image_path]);

  const handleSelectCover = (path: string) => {
    setSelectedCover(path);
    if (onSelectCover) onSelectCover(job.id, path);
  };

  const handleGazeFix = async () => {
    if (!job.final_filename) return;
    setKurguLoading(true);
    try {
      const res = await fetch('/api/v1/editor/gaze-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath: `videolar/${job.final_filename}`, smooth: true }),
      });
      const data = await res.json();
      if (data.success) {
        window.showToast?.('success', 'Göz Teması Düzeltme', 'Göz teması düzeltme işlemi başarıyla tamamlandı!');
        onRefreshJobs();
      } else {
        window.showToast?.('error', 'Göz Teması Hatası', data.error || 'Bilinmeyen hata');
      }
    } catch (err: any) {
      window.showToast?.('error', 'Göz Teması Hatası', err.message);
    } finally {
      setKurguLoading(false);
    }
  };

  const handleEnhanceAudio = async () => {
    if (!job.final_filename) return;
    setKurguLoading(true);
    try {
      const res = await fetch('/api/v1/editor/enhance-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: `videolar/${job.final_filename}`,
          denoise,
          equalize,
          deecho,
          levelDb: -3,
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.showToast?.('success', 'Ses İyileştirme', 'Ses iyileştirme işlemi başarıyla tamamlandı!');
        onRefreshJobs();
      } else {
        window.showToast?.('error', 'Ses İyileştirme Hatası', data.error || 'Bilinmeyen hata');
      }
    } catch (err: any) {
      window.showToast?.('error', 'Ses İyileştirme Hatası', err.message);
    } finally {
      setKurguLoading(false);
    }
  };

  const handleReframe = async () => {
    if (!job.final_filename) return;
    setKurguLoading(true);
    try {
      const res = await fetch('/api/v1/editor/reframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: `videolar/${job.final_filename}`,
          useFaceTracking,
          startTime: 0,
          duration: 30,
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.showToast?.('success', 'Reframe (9:16)', 'Yeniden çerçeveleme (9:16) başarıyla tamamlandı!');
        onRefreshJobs();
      } else {
        window.showToast?.('error', 'Reframe Hatası', data.error || 'Bilinmeyen hata');
      }
    } catch (err: any) {
      window.showToast?.('error', 'Reframe Hatası', err.message);
    } finally {
      setKurguLoading(false);
    }
  };

  const [exportLoading, setExportLoading] = useState(false);

  const handleExportZip = async () => {
    if (!job.id) return;
    setExportLoading(true);
    try {
      const res = await fetch(`/api/v1/export/${job.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const link = document.createElement('a');
        link.href = data.url;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.showToast?.('success', 'Dışa Aktar', 'Export ZIP başarıyla oluşturuldu!');
      } else {
        window.showToast?.('error', 'Export Hatası', data.error || 'Bilinmeyen hata');
      }
    } catch (err: any) {
      window.showToast?.('error', 'Export Hatası', err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleUpscale = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpscaleLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('scale', '4');
      const res = await fetch('/api/v1/editor/upscale', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        window.showToast?.('success', '4K Upscale', 'Görsel başarıyla 4K çözünürlüğe yükseltildi!');
      } else {
        window.showToast?.('error', 'Upscale Hatası', data.error || 'Bilinmeyen hata');
      }
    } catch (err: any) {
      window.showToast?.('error', 'Upscale Hatası', err.message);
    } finally {
      setUpscaleLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleInpaintVideo = async () => {
    if (!job.final_filename) return;
    setKurguLoading(true);
    try {
      const res = await fetch('/api/v1/editor/inpaint-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: `videolar/${job.final_filename}`,
          masks: [
            {
              x: parseFloat(maskX) || 0.1,
              y: parseFloat(maskY) || 0.2,
              width: parseFloat(maskW) || 0.3,
              height: parseFloat(maskH) || 0.4,
            },
          ],
          strength: 0.8,
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.showToast?.('success', 'Nesne Silme (Inpaint)', 'Video nesne silme işlemi başarıyla tamamlandı!');
        onRefreshJobs();
      } else {
        window.showToast?.('error', 'Nesne Silme Hatası', data.error || 'Bilinmeyen hata');
      }
    } catch (err: any) {
      window.showToast?.('error', 'Nesne Silme Hatası', err.message);
    } finally {
      setKurguLoading(false);
    }
  };

  const platTabs: { key: PlatformTab; label: string; icon: string }[] = [
    { key: 'youtube', label: 'YouTube', icon: '▶' },
    { key: 'tiktok', label: 'TikTok', icon: '♪' },
    { key: 'x', label: 'X (Twitter)', icon: '𝕏' },
    { key: 'meta', label: 'Meta', icon: 'ⓕ' },
  ];

  return (
    <div
      className="glass"
      style={{
        padding: '15px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>
          SOSYAL MEDYA KOPYALARI
        </h4>
        {job.status === 'awaiting_approval' && (
          <span
            style={{
              fontSize: '9px',
              background: 'var(--warning)',
              color: '#0b0f19',
              padding: '2px 5px',
              borderRadius: '3px',
              fontWeight: 'bold',
              fontFamily: 'var(--font-mono)',
            }}
          >
            ONAY BEKLİYOR
          </span>
        )}
      </div>

      {job.viral_score !== null && job.viral_score !== undefined && (
        <div
          style={{
            background: 'rgba(0, 242, 254, 0.1)',
            border: '1px solid #00F2FE',
            padding: '8px 12px',
            borderRadius: '6px',
            fontWeight: 'bold',
            color: '#00F2FE',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          <TrendingUp size={14} /> AI Viralite Skoru: {job.viral_score} / 100
        </div>
      )}

      {onAnalyzeViralScore && (
        <button
          onClick={() => onAnalyzeViralScore!(job.id)}
          style={{
            background: 'linear-gradient(135deg, #FF007F, #7F00FF)',
            border: 'none',
            color: 'white',
            padding: '8px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <TrendingUp size={12} /> AI Viralite Analizi Yap
        </button>
      )}

      {onSelectCover && (
        <CoverSelector
          coverImages={coverImages}
          selectedCover={selectedCover}
          onSelect={handleSelectCover}
        />
      )}

      {/* Platform Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {platTabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setPlatformTab(key)}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: platformTab === key ? 700 : 400,
              background: platformTab === key ? 'var(--accent-light)' : 'transparent',
              color: platformTab === key ? 'var(--accent)' : 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.2s',
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* YouTube Fields */}
      {platformTab === 'youtube' && (
        <>
          <MetaField label="Video Başlığı (YouTube)">
            <input type="text" value={ytTitle} onChange={(e) => onSetYtTitle(e.target.value)} style={inputStyle} />
          </MetaField>
          <MetaField label="Video Açıklaması">
            <textarea value={ytDesc} onChange={(e) => onSetYtDesc(e.target.value)} style={{ ...inputStyle, height: '80px', resize: 'none' }} />
          </MetaField>
          <MetaField label="Etiketler / Hashtags (virgülle ayırın)">
            <input type="text" value={ytTags} onChange={(e) => onSetYtTags(e.target.value)} style={inputStyle} />
          </MetaField>
        </>
      )}

      {/* TikTok Fields */}
      {platformTab === 'tiktok' && (
        <>
          <MetaField label="TikTok Açıklaması (max 150 karakter)">
            <textarea value={ttDesc} onChange={(e) => onSetTtDesc(e.target.value)} style={{ ...inputStyle, height: '60px', resize: 'none' }} maxLength={150} />
          </MetaField>
          <MetaField label="Etiketler / Hashtags">
            <input type="text" value={ttTags} onChange={(e) => onSetTtTags(e.target.value)} style={inputStyle} />
          </MetaField>
        </>
      )}

      {/* X (Twitter) Fields */}
      {platformTab === 'x' && (
        <>
          <MetaField label="X (Twitter) Açıklaması (max 200 karakter)">
            <textarea value={xDesc} onChange={(e) => onSetXDesc(e.target.value)} style={{ ...inputStyle, height: '60px', resize: 'none' }} maxLength={200} />
          </MetaField>
          <MetaField label="Hashtags">
            <input type="text" value={xTags} onChange={(e) => onSetXTags(e.target.value)} style={inputStyle} />
          </MetaField>
        </>
      )}

      {/* Meta (Facebook/Instagram) Fields */}
      {platformTab === 'meta' && (
        <>
          <MetaField label="Meta (Facebook/Instagram) Açıklaması">
            <textarea value={metaDesc} onChange={(e) => onSetMetaDesc(e.target.value)} style={{ ...inputStyle, height: '80px', resize: 'none' }} />
          </MetaField>
          <MetaField label="Hashtags">
            <input type="text" value={metaTags} onChange={(e) => onSetMetaTags(e.target.value)} style={inputStyle} />
          </MetaField>
        </>
      )}

      {/* AI PREMIUM KURGU VE DÜZELTME ARAÇLARI */}
      <div
        style={{
          marginTop: '8px',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            color: 'var(--accent)',
            letterSpacing: '0.05em',
          }}
        >
          AI PREMIUM KURGU ARAÇLARI
        </div>

        {/* Gaze Correction */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={handleGazeFix}
            disabled={kurguLoading}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '11px',
              fontWeight: 600,
              cursor: kurguLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {kurguLoading ? <Loader size={12} className="spin" /> : '👁️'} Göz Temasını Düzelt
          </button>
        </div>

        {/* 4K Upscale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input
            ref={upscaleInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpscale}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => upscaleInputRef.current?.click()}
            disabled={upscaleLoading}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '11px',
              fontWeight: 600,
              cursor: upscaleLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {upscaleLoading ? <Loader size={12} className="spin" /> : <ImageUp size={12} />} 4K Upscale (Real-ESRGAN)
          </button>
        </div>

        {/* Studio Sound */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px',
            borderRadius: '6px',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Stüdyo Sesi Filtreleri
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={denoise}
                onChange={(e) => setDenoise(e.target.checked)}
              />{' '}
              Gürültü Sil
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={deecho}
                onChange={(e) => setDeecho(e.target.checked)}
              />{' '}
              Yankı Sil
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={equalize}
                onChange={(e) => setEqualize(e.target.checked)}
              />{' '}
              EQ Ayarla
            </label>
          </div>
          <button
            onClick={handleEnhanceAudio}
            disabled={kurguLoading}
            style={{
              padding: '6px',
              borderRadius: '4px',
              border: 'none',
              background: 'var(--accent)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 600,
              cursor: kurguLoading ? 'not-allowed' : 'pointer',
            }}
          >
            Sesi İyileştir (Studio Sound)
          </button>
        </div>

        {/* Smart Reframe */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px',
            borderRadius: '6px',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Akıllı Yeniden Çerçeveleme (9:16)
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={useFaceTracking}
              onChange={(e) => setUseFaceTracking(e.target.checked)}
            />{' '}
            OpenCV Yüz Takibi Kullan
          </label>
          <button
            onClick={handleReframe}
            disabled={kurguLoading}
            style={{
              padding: '6px',
              borderRadius: '4px',
              border: 'none',
              background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 600,
              cursor: kurguLoading ? 'not-allowed' : 'pointer',
            }}
          >
            Dikey Formatına Çevir (9:16)
          </button>
        </div>

        {/* Video Inpainting */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px',
            borderRadius: '6px',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Hafif Nesne / Maske Silici
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }}>
            <input
              type="text"
              placeholder="X"
              value={maskX}
              onChange={(e) => setMaskX(e.target.value)}
              style={{ ...inputStyle, padding: '4px', fontSize: '9px', textAlign: 'center' }}
            />
            <input
              type="text"
              placeholder="Y"
              value={maskY}
              onChange={(e) => setMaskY(e.target.value)}
              style={{ ...inputStyle, padding: '4px', fontSize: '9px', textAlign: 'center' }}
            />
            <input
              type="text"
              placeholder="W"
              value={maskW}
              onChange={(e) => setMaskW(e.target.value)}
              style={{ ...inputStyle, padding: '4px', fontSize: '9px', textAlign: 'center' }}
            />
            <input
              type="text"
              placeholder="H"
              value={maskH}
              onChange={(e) => setMaskH(e.target.value)}
              style={{ ...inputStyle, padding: '4px', fontSize: '9px', textAlign: 'center' }}
            />
          </div>
          <button
            onClick={handleInpaintVideo}
            disabled={kurguLoading}
            style={{
              padding: '6px',
              borderRadius: '4px',
              border: 'none',
              background: '#ef4444',
              color: 'white',
              fontSize: '10px',
              fontWeight: 600,
              cursor: kurguLoading ? 'not-allowed' : 'pointer',
            }}
          >
            Seçilen Alanı Maskele ve Sil
          </button>
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className="btn btn-primary"
        style={{
          width: '100%',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
          {isSaving ? <Loader size={12} className="pulse" /> : <Share2 size={12} />}
          {isSaving
            ? 'Kaydediliyor...'
            : job.status === 'awaiting_approval'
              ? 'Onayla ve Yayınla'
              : 'Metinleri Kaydet ve Paylaş'}
        </button>

        <button
          onClick={handleExportZip}
          disabled={exportLoading || (job.status !== 'completed' && job.status !== 'awaiting_approval')}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            fontSize: '11px',
            fontWeight: 600,
            cursor: exportLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            opacity: (job.status !== 'completed' && job.status !== 'awaiting_approval') ? 0.4 : 1,
          }}
        >
          {exportLoading ? <Loader size={12} className="spin" /> : <Download size={12} />}
          {exportLoading ? 'ZIP Oluşturuluyor...' : 'Export ZIP (FilmFreeway)'}
        </button>
      </div>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function DockerStatusPanel() {
  const [data, setData] = useState<DockerStatusData | null>(null);
  const [testResults, setTestResults] = useState<ModelTestEntry[] | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/v1/docker/status');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatus();

    const sseUrl = `/api/v1/docker/stream`;
    let eventSource: EventSource | null = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data);
        setData(json);
      } catch (e) {
        console.error('[SSE-docker] parse error', e, event.data);
      }
    };

    eventSource.onerror = (evt) => {
      console.error('[SSE-docker] connection error', evt);
      if (eventSource) {
        eventSource.close();
      }
      setTimeout(() => {
        if (eventSource) {
          eventSource = new EventSource(sseUrl, { withCredentials: true });
        }
      }, 5000);
    };

    const interval = setInterval(fetchStatus, 30_000);

    return () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      clearInterval(interval);
    };
  }, []);

  const handleTestModels = async () => {
    setTestLoading(true);
    setTestOpen(true);
    try {
      const res = await fetch('/api/v1/docker/test-models');
      const json = await res.json();
      setTestResults(Array.isArray(json) ? json : (json.results ?? []));
    } catch {
      setTestResults([
        { model: 'Bağlantı Hatası', status: 'error', error: 'Sunucuya ulaşılamadı' },
      ]);
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
    <div
      className="glass"
      style={{
        padding: '14px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Cpu size={14} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)', flex: 1 }}>
          Docker GPU
        </span>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isRunning ? '#22c55e' : '#ef4444',
            display: 'inline-block',
            boxShadow: isRunning ? '0 0 6px #22c55e' : '0 0 6px #ef4444',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
        <Row
          label="GPU"
          value={
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {gpuModel}
              {isL4 && <Zap size={10} style={{ color: '#eab308' }} aria-label="L4" />}
            </span>
          }
        />
        <Row
          label="VRAM"
          value={vramTotal > 0 ? `${vramUsed.toFixed(1)} / ${vramTotal.toFixed(1)} GB` : '—'}
        />
        <Row
          label="Durum"
          value={
            <span style={{ color: isRunning ? '#22c55e' : '#ef4444' }}>
              {isRunning ? 'Çalışıyor' : 'Durduruldu'}
            </span>
          }
        />
      </div>
      <button
        onClick={handleTestModels}
        className="btn btn-primary"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '11px',
          padding: '6px 10px',
        }}
      >
        <Beaker size={12} />
        Modelleri Test Et
      </button>
      {testOpen && testResults && (
        <div style={{ marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
          <div
            onClick={() => setTestOpen(!testOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            Test Sonuçları
            {testOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {testResults.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.25)',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span style={{ fontWeight: 600 }}>{r.model}</span>
                <span
                  style={{
                    color:
                      r.status === 'loaded' || r.status === 'ok'
                        ? '#22c55e'
                        : r.status === 'error'
                          ? '#ef4444'
                          : 'var(--text-muted)',
                  }}
                >
                  {r.status === 'loaded' || r.status === 'ok'
                    ? '✓'
                    : r.status === 'error'
                      ? '✗'
                      : r.status}
                  {r.vram != null ? `  ${r.vram.toFixed(1)} GB` : ''}
                  {r.error ? `  ${r.error}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {testLoading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <Loader size={12} className="pulse" />
          Test ediliyor...
        </div>
      )}
    </div>
  );
}

function CreditsBadge({
  credits,
  limit,
  resetDate,
}: {
  credits: number;
  limit: number;
  resetDate?: string;
}) {
  const ratio = limit > 0 ? credits / limit : 1;
  const barColor =
    ratio > 0.8 ? 'var(--danger)' : ratio > 0.5 ? 'var(--warning)' : 'var(--success)';
  return (
    <div
      className="glass"
      style={{
        padding: '10px 14px',
        borderRadius: '10px',
        border: `1px solid ${barColor}33`,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
          Krediniz
        </span>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>
          {credits}{' '}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
            / {limit}
          </span>
        </span>
      </div>
      <div
        style={{
          height: '4px',
          background: 'var(--bg-primary)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(ratio * 100, 100)}%`,
            height: '100%',
            background: barColor,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {resetDate && (
        <div
          style={{
            fontSize: '9px',
            color: 'var(--text-muted)',
            textAlign: 'right',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Sıfırlanma: {new Date(resetDate).toLocaleDateString('tr-TR')}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'white' }}>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'white',
  padding: '6px 10px',
  fontSize: '11px',
  outline: 'none',
  fontFamily: 'var(--font-mono)',
};
