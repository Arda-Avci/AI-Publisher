import { useState } from 'react';
import { Scissors, X, Loader, CheckCircle } from 'lucide-react';

interface CutPanelProps {
  jobId: number;
  scenes: { id: number; scene_number: number; duration?: number }[];
  csrfToken: string;
  onClose: () => void;
}

interface TrimResult {
  success: boolean;
  outputPath: string;
  duration: number;
}

export function CutPanel({ jobId, scenes, csrfToken, onClose }: CutPanelProps) {
  const [mode, setMode] = useState<'trim' | 'split'>('trim');
  const [selectedScene, setSelectedScene] = useState<number>(scenes[0]?.id || 0);
  const [trimStart, setTrimStart] = useState('00:00:00');
  const [trimEnd, setTrimEnd] = useState('00:00:06');
  const [splitPoint, setSplitPoint] = useState('00:00:03');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrim = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/v1/cut/trim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ jobId, sceneId: selectedScene, start: trimStart, end: trimEnd }),
      });
      if (!res.ok) throw new Error(`Kırpma başarısız: ${res.status}`);
      const data: TrimResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const handleSplit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/v1/cut/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ jobId, sceneId: selectedScene, splitPoint }),
      });
      if (!res.ok) throw new Error(`Bölme başarısız: ${res.status}`);
      const data: TrimResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
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
            <Scissors size={16} style={{ color: '#9B51E0' }} />
            <h3
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Video Kırpma
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
            Zaman çizelgesi tabanlı kırpma ve bölme kontrolleri
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

      <div style={{ display: 'flex', gap: '6px' }}>
        {(['trim', 'split'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setResult(null); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${mode === m ? '#9B51E0' : 'var(--border)'}`,
              background: mode === m ? 'rgba(155,81,224,0.12)' : 'var(--bg-surface)',
              color: mode === m ? '#9B51E0' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Scissors size={12} />
            {m === 'trim' ? 'Kırp' : 'Böl'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Hedef Sahne
        </span>
        <select
          value={selectedScene}
          onChange={(e) => setSelectedScene(Number(e.target.value))}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            width: '100%',
          }}
        >
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              Sahne {s.scene_number}{s.duration ? ` (${s.duration}s)` : ''}
            </option>
          ))}
        </select>
      </div>

      {mode === 'trim' ? (
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              Başlangıç
            </span>
            <input
              type="text"
              value={trimStart}
              onChange={(e) => setTrimStart(e.target.value)}
              placeholder="00:00:00"
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              Bitiş
            </span>
            <input
              type="text"
              value={trimEnd}
              onChange={(e) => setTrimEnd(e.target.value)}
              placeholder="00:00:06"
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
            Bölme Noktası
          </span>
          <input
            type="text"
            value={splitPoint}
            onChange={(e) => setSplitPoint(e.target.value)}
            placeholder="00:00:03"
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              width: '100%',
            }}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Bu noktada sahne iki parçaya bölünecektir
          </span>
        </div>
      )}

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

      {result && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} style={{ color: '#22c55e' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e', fontFamily: 'var(--font-sans)' }}>
              İşlem Başarılı
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Çıktı: {result.outputPath} — Süre: {result.duration}s
          </span>
        </div>
      )}

      <button
        onClick={mode === 'trim' ? handleTrim : handleSplit}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '10px 16px',
          borderRadius: '8px',
          border: 'none',
          background: '#9B51E0',
          color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: 'var(--font-sans)',
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.2s',
        }}
      >
        {loading ? <Loader size={14} className="spin" /> : <Scissors size={14} />}
        {loading ? 'İşleniyor...' : mode === 'trim' ? 'Kırp' : 'Böl'}
      </button>
    </div>
  );
}
