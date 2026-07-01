import { useState } from 'react';
import { Music, Zap, CheckCircle, Loader, X } from 'lucide-react';

interface BeatSyncPanelProps {
  jobId: number;
  csrfToken: string;
  onClose: () => void;
}

interface BeatData {
  bpm: number;
  beats: number[];
  timeSignature: string;
  totalBeats: number;
}

interface SyncOption {
  id: string;
  label: string;
  description: string;
  color: string;
}

const SYNC_OPTIONS: SyncOption[] = [
  { id: 'cut_on_beat', label: 'Kesim Noktaları', description: 'Sahne geçişlerini beat noktalarına hizala', color: '#00F2FE' },
  { id: 'fade_to_beat', label: 'Fade Hizalama', description: 'Sahne geçişlerini beat'e göre yumuşak geçişlerle ayarla', color: '#9B51E0' },
  { id: 'speed_ramp', label: 'Hız Rampası', description: 'Beat noktalarında hız değişimi efekti uygula', color: '#F59E0B' },
  { id: 'zoom_pulse', label: 'Zoom Pulse', description: 'Beat noktalarında ritmik zum efekti', color: '#EF4444' },
];

export function BeatSyncPanel({ jobId, csrfToken, onClose }: BeatSyncPanelProps) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [beatData, setBeatData] = useState<BeatData | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/beatsync/analyze?jobId=${jobId}`, {
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (!res.ok) throw new Error(`Analiz başarısız: ${res.status}`);
      const data: BeatData = await res.json();
      setBeatData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/beatsync/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ jobId, options: Array.from(selectedOptions) }),
      });
      if (!res.ok) throw new Error(`Uygulama başarısız: ${res.status}`);
      setApplied(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setApplying(false);
    }
  };

  const toggleOption = (id: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Music size={16} style={{ color: 'var(--gold)' }} />
            <h3
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Beat Senkronizasyonu
            </h3>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            BPM algılama ve ritmik geçiş efektleri
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '8px',
          border: `1px solid ${loading ? 'var(--border)' : 'var(--gold)'}`,
          background: loading ? 'var(--bg-surface)' : 'rgba(212,175,55,0.08)',
          color: loading ? 'var(--text-muted)' : 'var(--gold)',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          transition: 'all 0.2s',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        {loading ? <Loader size={14} className="spin" /> : <Zap size={14} />}
        {loading ? 'Analiz Ediliyor...' : 'Beat Analizi Başlat'}
      </button>

      {error && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            fontSize: '11px',
            color: '#EF4444',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {error}
        </div>
      )}

      {beatData && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '12px',
            borderRadius: '8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                BPM
              </span>
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                {beatData.bpm}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                Zaman İmzası
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {beatData.timeSignature}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                Toplam Beat
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {beatData.totalBeats}
              </span>
            </div>
          </div>

          <div
            style={{
              height: '32px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '4px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}
          >
            {beatData.beats.map((beat, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${(beat / (beatData.beats[beatData.beats.length - 1] || 1)) * 100}%`,
                  top: '4px',
                  bottom: '4px',
                  width: '2px',
                  background: i % 4 === 0 ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
                  borderRadius: '1px',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {beatData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Senkronizasyon Seçenekleri
          </span>
          {SYNC_OPTIONS.map((opt) => {
            const isSelected = selectedOptions.has(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleOption(opt.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: `1px solid ${isSelected ? opt.color : 'var(--border)'}`,
                  background: isSelected ? `${opt.color}10` : 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = opt.color;
                    e.currentTarget.style.background = `${opt.color}08`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg-surface)';
                  }
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: isSelected ? `${opt.color}20` : 'var(--bg-surface-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {isSelected ? (
                    <CheckCircle size={14} style={{ color: opt.color }} />
                  ) : (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: `1.5px solid ${opt.color}` }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? opt.color : 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                    {opt.label}
                  </span>
                  <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', lineHeight: 1.4, marginTop: '2px' }}>
                    {opt.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {beatData && selectedOptions.size > 0 && (
        <button
          onClick={handleApply}
          disabled={applying || applied}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: applied ? 'rgba(34,197,94,0.15)' : 'var(--gold)',
            color: applied ? '#22c55e' : '#000',
            cursor: applying || applied ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            opacity: applying ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          {applying ? <Loader size={14} className="spin" /> : applied ? <CheckCircle size={14} /> : <Zap size={14} />}
          {applying ? 'Uygulanıyor...' : applied ? 'Uygulandı' : 'Uygula'}
        </button>
      )}
    </div>
  );
}
