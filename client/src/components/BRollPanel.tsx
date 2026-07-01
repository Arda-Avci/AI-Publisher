import { useState } from 'react';
import { Search, Film, Plus, X, Loader, CheckCircle } from 'lucide-react';

interface BRollPanelProps {
  jobId: number;
  scenes: { id: number; scene_number: number }[];
  csrfToken: string;
  onClose: () => void;
}

interface BRollClip {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  category: string;
  tags: string[];
}

export function BRollPanel({ jobId, scenes, csrfToken, onClose }: BRollPanelProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<BRollClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [insertScene, setInsertScene] = useState<number>(scenes[0]?.id || 0);
  const [inserting, setInserting] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`/api/v1/broll/search?q=${encodeURIComponent(query)}&jobId=${jobId}`, {
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (!res.ok) throw new Error(`Arama başarısız: ${res.status}`);
      const data: BRollClip[] = await res.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setSearching(false);
    }
  };

  const handleInsert = async () => {
    if (!selectedClip) return;
    setInserting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/broll/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ jobId, clipId: selectedClip, sceneId: insertScene }),
      });
      if (!res.ok) throw new Error(`Ekleme başarısız: ${res.status}`);
      setInserted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setInserting(false);
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
            <Film size={16} style={{ color: '#00F2FE' }} />
            <h3
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              B-Roll Yönetimi
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
            Ek B-Roll çekimlerini ara ve sahnelere ekle
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

      <div style={{ display: 'flex', gap: '8px' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="B-Roll ara... (örn: şehir manzarası, doğa)"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
            }}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: '#00F2FE',
            color: '#000',
            cursor: searching || !query.trim() ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            opacity: searching ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {searching ? <Loader size={14} className="spin" /> : <Search size={14} />}
          Ara
        </button>
      </div>

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

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Sonuçlar ({results.length})
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {results.map((clip) => {
              const isSelected = selectedClip === clip.id;
              return (
                <button
                  key={clip.id}
                  onClick={() => setSelectedClip(isSelected ? null : clip.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? '#00F2FE' : 'var(--border)'}`,
                    background: isSelected ? 'rgba(0,242,254,0.08)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {clip.thumbnail ? (
                      <img src={clip.thumbnail} alt={clip.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Film size={20} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: isSelected ? '#00F2FE' : 'var(--text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {clip.title}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {clip.duration}s
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {clip.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {results.length === 0 && !searching && (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 12px',
            color: 'var(--text-muted)',
          }}
        >
          <Film size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}>
            B-Roll klibi aramak için yukarıdaki alanı kullanın
          </div>
        </div>
      )}

      {selectedClip && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '12px',
            borderRadius: '8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Ekleme Konumu
          </span>
          <select
            value={insertScene}
            onChange={(e) => setInsertScene(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              width: '100%',
            }}
          >
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                Sahne {s.scene_number}
              </option>
            ))}
          </select>
          <button
            onClick={handleInsert}
            disabled={inserting || inserted}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: inserted ? 'rgba(34,197,94,0.15)' : '#00F2FE',
              color: inserted ? '#22c55e' : '#000',
              cursor: inserting || inserted ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              opacity: inserting ? 0.6 : 1,
            }}
          >
            {inserting ? <Loader size={14} className="spin" /> : inserted ? <CheckCircle size={14} /> : <Plus size={14} />}
            {inserting ? 'Ekleniyor...' : inserted ? 'Eklendi' : 'Sahneye Ekle'}
          </button>
        </div>
      )}
    </div>
  );
}
