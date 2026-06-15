import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader, Sparkles, Play, RefreshCw, Check, Edit3, Save, User, Monitor, Video, X } from 'lucide-react';
import type { Character, Platform, ScriptWithSegments, ScriptSegment, Script } from '../types.js';

type EditorMode = 'config' | 'edit' | 'progress';

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'x', label: 'X' },
  { id: 'meta', label: 'Meta' },
];

const s: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex', flexDirection: 'column', gap: '16px', height: '100%',
  },
  card: {
    background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)',
    padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
  },
  sectionTitle: {
    fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)',
    letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px',
  },
  label: {
    fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600,
    textTransform: 'uppercase' as const, letterSpacing: '0.3px',
  },
  input: {
    width: '100%', background: '#070a14', border: '1px solid var(--border)',
    borderRadius: '4px', color: 'white', padding: '7px 10px', fontSize: '12px', outline: 'none',
  },
  textarea: {
    width: '100%', background: '#070a14', border: '1px solid var(--border)',
    borderRadius: '4px', color: 'white', padding: '7px 10px', fontSize: '12px',
    outline: 'none', resize: 'none' as const, minHeight: '60px',
  },
  select: {
    width: '100%', background: '#070a14', border: '1px solid var(--border)',
    borderRadius: '4px', color: 'white', padding: '7px 10px', fontSize: '12px', outline: 'none',
  },
  chip: {
    padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  btn: {
    padding: '8px 16px', borderRadius: '6px', border: 'none',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  badge: {
    padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
  },
  progressBar: {
    height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: '4px',
    background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
    transition: 'width 0.5s ease',
  },
};

export function TalkShowEditor() {
  const [mode, setMode] = useState<EditorMode>('config');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);

  const [shows, setShows] = useState<any[]>([]);
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const [newShowTitle, setNewShowTitle] = useState('');

  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<ScriptWithSegments | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [savingSegmentId, setSavingSegmentId] = useState<number | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editDialogue, setEditDialogue] = useState('');

  const [jobId, setJobId] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [jobStatus, setJobStatus] = useState<string>('');

  const esRef = useRef<EventSource | null>(null);

  const fetchCharacters = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/characters', { credentials: 'include' });
      if (r.ok) { const d = await r.json(); setCharacters(d.data || []); }
    } catch {}
  }, []);

  const fetchShows = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/jobs?limit=20', { credentials: 'include' });
      if (r.ok) { const d = await r.json(); setShows(d.data || []); }
    } catch {}
  }, []);

  useEffect(() => { fetchCharacters(); fetchShows(); }, [fetchCharacters, fetchShows]);

  const createShow = async () => {
    if (!newShowTitle.trim()) return;
    try {
      const fd = new FormData();
      fd.append('master_prompt', newShowTitle.trim());
      fd.append('target_platforms', JSON.stringify(selectedPlatforms));
      const r = await fetch('/create-job', { method: 'POST', body: fd, credentials: 'include' });
      if (r.ok) { const d = await r.json(); setSelectedShowId(d.id); setNewShowTitle(''); fetchShows(); }
    } catch {}
  };

  const generateScript = async () => {
    if (!selectedShowId) return;
    setScriptLoading(true);
    try {
      const r = await fetch('/api/v1/talkshow/scripts/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_id: selectedShowId }),
        credentials: 'include',
      });
      if (r.ok) { const d = await r.json(); setSelectedScript(d.data); setMode('edit'); fetchScripts(); }
    } catch {} finally { setScriptLoading(false); }
  };

  const fetchScripts = async () => {
    if (!selectedShowId) return;
    try {
      const r = await fetch(`/api/v1/talkshow/${selectedShowId}/scripts`, { credentials: 'include' });
      if (r.ok) { const d = await r.json(); setScripts(d.data || []); }
    } catch {}
  };

  const selectScript = async (scriptId: number) => {
    try {
      const r = await fetch(`/api/v1/talkshow/scripts/${scriptId}`, { credentials: 'include' });
      if (r.ok) { const d = await r.json(); setSelectedScript(d.data); setMode('edit'); }
    } catch {}
  };

  const handleRegenerate = async (segmentId: number) => {
    if (!selectedScript) return;
    setRegeneratingId(segmentId);
    try {
      const r = await fetch(`/api/v1/talkshow/scripts/${selectedScript.id}/regenerate/${segmentId}`, {
        method: 'POST', credentials: 'include',
      });
      if (r.ok) {
        const d = await r.json();
        setSelectedScript(prev => {
          if (!prev) return prev;
          return { ...prev, segments: prev.segments.map(s => s.id === segmentId ? d.data : s) };
        });
      }
    } catch {} finally { setRegeneratingId(null); }
  };

  const startEditing = (segment: ScriptSegment) => {
    setEditingSegmentId(segment.id);
    setEditDialogue(segment.dialogue_text);
  };

  const saveSegment = async (segmentId: number) => {
    if (!selectedScript) return;
    setSavingSegmentId(segmentId);
    try {
      const r = await fetch(`/api/v1/talkshow/scripts/${selectedScript.id}/segments/${segmentId}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialogue_text: editDialogue }),
      });
      if (r.ok) {
        const d = await r.json();
        setSelectedScript(prev => {
          if (!prev) return prev;
          return { ...prev, segments: prev.segments.map(s => s.id === segmentId ? d.data : s) };
        });
        setEditingSegmentId(null);
      }
    } catch {} finally { setSavingSegmentId(null); }
  };

  const produceVideo = async () => {
    if (!selectedScript) return;
    try {
      const r = await fetch(`/api/v1/talkshow/scripts/${selectedScript.id}/produce`, {
        method: 'POST', credentials: 'include',
      });
      if (r.ok) {
        const d = await r.json();
        setJobId(d.data.jobId);
        setMode('progress');
        setProgressPercent(0);
        setProgressMsg('Video üretimi başlatılıyor...');
      }
    } catch {}
  };

  useEffect(() => {
    if (!jobId) return;
    const es = new EventSource(`/api/v1/progress/stream?jobId=${jobId}`, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.percent !== undefined) setProgressPercent(d.percent);
        if (d.stageKey) setProgressMsg(d.colabMessage || d.stageKey);
        if (d.stageKey === 'stageCompleted') {
          setJobStatus('completed');
          es.close();
        }
      } catch {}
    };
    es.onerror = () => {
      setTimeout(() => {
        fetch(`/api/v1/jobs/${jobId}`, { credentials: 'include' }).then(r => r.json()).then(d => {
          if (d.data?.status === 'completed') { setJobStatus('completed'); setProgressPercent(100); setProgressMsg('Video hazır!'); }
        }).catch(() => {});
      }, 3000);
    };
    esRef.current = es;
    return () => { es.close(); };
  }, [jobId]);

  return (
    <div style={s.panel}>
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {(['config', 'edit', 'progress'] as EditorMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              ...s.btn, flex: 1, justifyContent: 'center',
              background: mode === m ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: mode === m ? '#0b0f19' : 'var(--text-muted)',
              opacity: m === 'progress' && !jobId ? 0.4 : 1,
            }}
            disabled={m === 'progress' && !jobId}
          >
            {m === 'config' ? <Monitor size={14} /> : m === 'edit' ? <Edit3 size={14} /> : <Play size={14} />}
            {m === 'config' ? 'Yapılandırma' : m === 'edit' ? 'Düzenle' : 'İlerleme'}
          </button>
        ))}
      </div>

      {/* ── CONFIG SCREEN ── */}
      {mode === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={s.card}>
            <div style={s.sectionTitle}><Monitor size={14} /> Gösteri Seç / Oluştur</div>
            <div>
              <label style={s.label}>Mevcut Gösteriler</label>
              <select
                style={s.select}
                value={selectedShowId ?? ''}
                onChange={e => setSelectedShowId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- Seçin --</option>
                {shows.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.master_prompt?.substring(0, 50)} (#{s.id})</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Yeni Gösteri</label>
                <input
                  style={s.input} value={newShowTitle}
                  onChange={e => setNewShowTitle(e.target.value)}
                  placeholder="Talk-show başlığı..."
                />
              </div>
              <button onClick={createShow} disabled={!newShowTitle.trim()} style={{ ...s.btn, background: 'var(--primary)', color: '#0b0f19', whiteSpace: 'nowrap' }}>
                <Video size={14} /> Oluştur
              </button>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.sectionTitle}><User size={14} /> Karakterler</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {characters.map(c => (
                <div key={c.id} style={{ ...s.chip, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--primary)' }} />
                  <span>{c.name}</span>
                </div>
              ))}
              {characters.length === 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Henüz karakter yok. Karakterler sekmesinden ekleyin.
                </span>
              )}
            </div>
          </div>

          <div style={s.card}>
            <div style={s.sectionTitle}><Monitor size={14} /> Hedef Platformlar</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PLATFORMS.map(p => {
                const active = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatforms(prev => active ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                    style={{
                      ...s.chip,
                      background: active ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: active ? '#0b0f19' : 'var(--text-muted)',
                      border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    {active && <Check size={12} />}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={generateScript}
            disabled={scriptLoading || !selectedShowId}
            style={{
              ...s.btn, background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white', justifyContent: 'center', width: '100%', padding: '12px',
              opacity: scriptLoading || !selectedShowId ? 0.5 : 1,
            }}
          >
            {scriptLoading ? <Loader size={14} className="pulse" /> : <Sparkles size={14} />}
            {scriptLoading ? 'Script Oluşturuluyor...' : 'AI ile Script Oluştur'}
          </button>
        </div>
      )}

      {/* ── EDIT SCREEN ── */}
      {mode === 'edit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
          {/* Script selector for show */}
          {!selectedScript && (
            <div style={s.card}>
              <div style={s.sectionTitle}><Edit3 size={14} /> Script Seç</div>
              {scripts.length === 0 ? (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bu gösteri için script bulunamadı. Önce script oluşturun.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {scripts.map(s => (
                    <button
                      key={s.id}
                      onClick={() => selectScript(s.id)}
                      style={{
                        textAlign: 'left', padding: '10px 12px', borderRadius: '6px',
                        border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)',
                        color: 'white', cursor: 'pointer', fontSize: '12px',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{s.title}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {s.scene_count} sahne · {s.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Script segments editor */}
          {selectedScript && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'auto' }}>
              <div style={{
                ...s.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{selectedScript.title}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ ...s.badge, background: 'var(--primary)', color: '#0b0f19' }}>
                    {selectedScript.segments.length} Sahne
                  </span>
                  <button onClick={produceVideo} style={{ ...s.btn, background: 'linear-gradient(135deg, #FF007F, #7F00FF)', color: 'white', fontSize: '11px' }}>
                    <Play size={12} /> Video Üret
                  </button>
                </div>
              </div>

              {selectedScript.segments.map((seg, i) => (
                <div key={seg.id} style={{
                  background: '#070a14', borderRadius: '8px', border: '1px solid var(--border)',
                  padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={s.badge}>{i + 1}</span>
                      <span style={{ ...s.badge, background: 'rgba(0,242,254,0.1)', color: 'var(--primary)', fontSize: '9px' }}>
                        {seg.scene_type}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)' }}>
                        {seg.character_name}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {seg.duration_seconds}s · {seg.camera_instruction}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {editingSegmentId !== seg.id ? (
                        <button onClick={() => startEditing(seg)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}>
                          <Edit3 size={12} />
                        </button>
                      ) : (
                        <button onClick={() => saveSegment(seg.id)} disabled={savingSegmentId === seg.id} style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', padding: '4px' }}>
                          {savingSegmentId === seg.id ? <Loader size={12} className="pulse" /> : <Save size={12} />}
                        </button>
                      )}
                      <button onClick={() => handleRegenerate(seg.id)} disabled={regeneratingId === seg.id} style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', padding: '4px' }}>
                        {regeneratingId === seg.id ? <Loader size={12} className="pulse" /> : <RefreshCw size={12} />}
                      </button>
                    </div>
                  </div>
                  {(editingSegmentId === seg.id) ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <textarea
                        value={editDialogue}
                        onChange={e => setEditDialogue(e.target.value)}
                        style={{ ...s.textarea, minHeight: '50px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                      />
                      <button onClick={() => setEditingSegmentId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', lineHeight: '18px', fontFamily: 'var(--font-mono)' }}>
                      {seg.dialogue_text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROGRESS SCREEN ── */}
      {mode === 'progress' && (
        <div style={{ ...s.card, flex: 1, justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>Video Üretim Süreci</div>

            <div style={s.progressBar}>
              <div style={{ ...s.progressFill, width: `${progressPercent}%` }} />
            </div>

            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>
              %{progressPercent}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {jobStatus !== 'completed' && <Loader size={14} className="pulse" />}
              {progressMsg || 'İşleniyor...'}
            </div>

            {jobStatus === 'completed' && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <span style={{ ...s.badge, background: 'var(--success)', color: 'white' }}>
                  ✓ Video Hazır
                </span>
                <button onClick={() => setMode('config')} style={{ ...s.btn, background: 'var(--bg-surface)', color: 'white', border: '1px solid var(--border)', fontSize: '11px' }}>
                  Yeni Proje
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
