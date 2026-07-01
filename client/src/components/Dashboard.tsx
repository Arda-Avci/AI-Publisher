import { useMemo, useState } from 'react';
import { Video, Film, CheckCircle, Clock, Plus, Play, BarChart3, TrendingUp, Sparkles, Zap } from 'lucide-react';
import type { Job, UserCredits } from '../types.js';

interface DashboardProps {
  jobs: Job[];
  userCredits: UserCredits | null;
  onSelectJob: (job: Job) => void;
  onNewProject: () => void;
  onOpenGallery: () => void;
  t: (key: string, params?: any) => string;
}

export function Dashboard({ jobs, userCredits, onSelectJob, onNewProject, onOpenGallery, t }: DashboardProps) {
  const [, setAutoPlay] = useState(false);

  const stats = useMemo(() => {
    const completed = jobs.filter(j => j.status === 'completed');
    const processing = jobs.filter(j => j.status === 'processing');
    const pending = jobs.filter(j => j.status === 'pending');
    const failed = jobs.filter(j => j.status === 'failed');
    const awaiting = jobs.filter(j => j.status === 'awaiting_approval');
    const totalScenes = jobs.reduce((sum, j) => sum + (j.total_scenes || 0), 0);
    const completedScenes = jobs.reduce((sum, j) => sum + (j.completed_scenes || 0), 0);
    return { completed, processing, pending, failed, awaiting, totalScenes, completedScenes };
  }, [jobs]);

  const recentCompleted = useMemo(() => {
    return [...stats.completed].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 6);
  }, [stats.completed]);

  const creditRatio = userCredits && userCredits.limit > 0 ? userCredits.credits / userCredits.limit : 1;
  const creditColor = creditRatio > 0.8 ? '#ef4444' : creditRatio > 0.5 ? '#f59e0b' : '#22c55e';

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            AI Publisher
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {t('Otonom AI video üretim ve pazarlama platformu', 'Autonomous AI video production & marketing platform')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onNewProject}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={14} /> {t('Yeni Proje', 'New Project')}
          </button>
          <button
            onClick={onOpenGallery}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Film size={14} /> {t('Tüm Projeler', 'All Projects')}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard icon={<Video size={16} />} label={t('Toplam Video', 'Total Videos')} value={stats.completed.length + stats.awaiting.length} color="#7F00FF" />
        <StatCard icon={<CheckCircle size={16} />} label={t('Tamamlanan', 'Completed')} value={stats.completed.length} color="#22c55e" />
        <StatCard icon={<Clock size={16} />} label={t('İşleniyor', 'Processing')} value={stats.processing.length} color="#f59e0b" />
        <StatCard icon={<BarChart3 size={16} />} label={t('Toplam Sahne', 'Total Scenes')} value={`${stats.completedScenes}/${stats.totalScenes}`} color="#3b82f6" />
        <StatCard icon={<TrendingUp size={16} />} label={t('Başarısız', 'Failed')} value={stats.failed.length} color="#ef4444" />
      </div>

      {/* Credits + Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="glass" style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={13} /> {t('Kredi Durumu', 'Credit Status')}
          </div>
          {userCredits ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {userCredits.credits}
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}> / {userCredits.limit}</span>
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(creditRatio * 100, 100)}%`, height: '100%', background: creditColor, borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
              {userCredits.resetDate && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                  {t('Sıfırlanma', 'Reset')}: {new Date(userCredits.resetDate).toLocaleDateString('tr-TR')}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('Yükleniyor...', 'Loading...')}</div>
          )}
        </div>

        <div className="glass" style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>{t('Hızlı İşlemler', 'Quick Actions')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <QuickActionBtn icon={<Plus size={13} />} label={t('Yeni Proje', 'New Project')} onClick={onNewProject} />
            <QuickActionBtn icon={<Film size={13} />} label={t('Galeri', 'Gallery')} onClick={onOpenGallery} />
            <QuickActionBtn icon={<Sparkles size={13} />} label={t('AI Asistan', 'AI Assistant')} onClick={() => window.showToast?.('info', 'AI Asistan', 'Yakında kullanıma sunulacak')} />
          </div>
        </div>
      </div>

      {/* Recent Completed Videos */}
      {recentCompleted.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Play size={14} /> {t('Son Üretilen Videolar', 'Recent Videos')}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
              ({recentCompleted.length} {t('video', 'videos')})
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {recentCompleted.map(job => (
              <div
                key={job.id}
                onClick={() => onSelectJob(job)}
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
              >
                {job.final_filename ? (
                  <div style={{ aspectRatio: '16/9', background: '#000', position: 'relative' }}>
                    <video
                      src={`/videolar/${job.final_filename}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      muted
                      autoPlay={autoPlay}
                      loop
                      playsInline
                      onMouseOver={e => { if (!autoPlay) (e.currentTarget as HTMLVideoElement).play(); }}
                      onMouseOut={e => { if (!autoPlay) (e.currentTarget as HTMLVideoElement).pause(); }}
                    />
                    <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.7)', color: 'white' }}>
                      #{job.id}
                    </div>
                  </div>
                ) : (
                  <div style={{ aspectRatio: '16/9', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Video size={24} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  </div>
                )}
                <div style={{ padding: '10px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.yt_title || job.master_prompt?.slice(0, 60) || `Proje #${job.id}`}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{job.total_scenes || 0} {t('sahne', 'scenes')}</span>
                    <span>{job.model_type || 'CogVideoX-5b'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {jobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🎬</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            {t('Henüz video üretilmedi', 'No videos produced yet')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            {t('İlk AI videonuzu oluşturmak için yeni bir proje başlatın.', 'Start a new project to create your first AI video.')}
          </div>
          <button
            onClick={onNewProject}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Plus size={16} /> {t('İlk Projeyi Başlat', 'Start First Project')}
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="glass" style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function QuickActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.2s',
      }}
      onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-primary)'; }}
    >
      {icon} {label}
    </button>
  );
}
