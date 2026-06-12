import { useState, useRef } from 'react';
import { Play, Loader, Zap } from 'lucide-react';
import type { Scene } from './Timeline.js';
import type { OpportunityVideo } from './Opportunities.js';
import type { Job, TalkShowResult, Tab } from '../types.js';
import { CharacterCreationPanel } from './CharacterCreationPanel.js';

interface StudioPanelProps {
  activeTab: Tab;
  selectedJob: Job | null;
  scenes: Scene[];
  progressMsg: string;
  progressPercent: number;
  etaSeconds: number | null;
  csrfToken: string;
  onSetSelectedJob: (j: Job | null) => void;
  onUpdateScenes: (s: Scene[]) => void;
  onRegenerateScene: (sceneId: number) => void;
  onAddScene: () => void;
  onDeleteScene: (sceneId: number) => void;
  onSelectScene: (scene: Scene) => void;
  onUseAsPrompt: (video: OpportunityVideo) => void;
  t: (key: string, params?: Record<string, any>) => string;
  masterPrompt: string;
  onSetMasterPrompt: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  formLoading: boolean;
  mainTab: string;
}

export function StudioPanel({
  activeTab: _activeTab,
  selectedJob, progressMsg, progressPercent, etaSeconds,
  csrfToken,
  onSetSelectedJob: _onSetSelectedJob,
  onUpdateScenes: _onUpdateScenes,
  onRegenerateScene: _onRegenerateScene,
  onAddScene: _onAddScene,
  onDeleteScene: _onDeleteScene,
  onSelectScene: _onSelectScene,
  onUseAsPrompt: _onUseAsPrompt,
  t: _t,
  masterPrompt, onSetMasterPrompt, onSubmit, formLoading, mainTab,
}: StudioPanelProps) {
  if (mainTab === 'Galeri') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', zIndex: 1 }}>
        {selectedJob ? (
          <VideoPreview
            selectedJob={selectedJob}
            progressMsg={progressMsg}
            progressPercent={progressPercent}
            etaSeconds={etaSeconds}
            masterPrompt={masterPrompt}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            <Play size={48} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)' }}>Galeriden bir proje seçin</span>
            <span style={{ fontSize: '12px', opacity: 0.6 }}>Sağ paneldeki listeden bir video seçerek önizleyebilirsiniz</span>
          </div>
        )}
      </div>
    );
  }

  if (mainTab === 'Talk-Show') {
    return (
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <TalkShowPanel />
      </div>
    );
  }

  if (mainTab === 'Karakterler') {
    return (
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <CharacterCreationPanel csrfToken={csrfToken} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 100px 24px' }}>
        <VideoPreview
          selectedJob={selectedJob}
          progressMsg={progressMsg}
          progressPercent={progressPercent}
          etaSeconds={etaSeconds}
          masterPrompt={masterPrompt}
        />
      </div>
      <FloatingPrompt
        masterPrompt={masterPrompt}
        onSetMasterPrompt={onSetMasterPrompt}
        onSubmit={onSubmit}
        formLoading={formLoading}
      />
    </div>
  );
}

function FloatingPrompt({
  masterPrompt, onSetMasterPrompt, onSubmit, formLoading,
}: {
  masterPrompt: string; onSetMasterPrompt: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; formLoading: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (masterPrompt.trim() && !formLoading) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{
        position: 'absolute',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '48rem',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${focused ? 'var(--accent)' : 'var(--border-subtle)'}`,
        borderRadius: '16px',
        padding: '8px',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        boxShadow: focused ? '0 0 24px var(--accent-glow)' : undefined,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        zIndex: 10,
      }}
    >
      <textarea
        ref={textareaRef}
        value={masterPrompt}
        onChange={(e) => onSetMasterPrompt(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder="Bir video konsepti yazın…"
        rows={1}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          lineHeight: '24px',
          padding: '4px 8px',
          resize: 'none',
        }}
      />
      <button
        type="submit"
        disabled={formLoading || !masterPrompt.trim()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '10px 18px',
          borderRadius: '12px',
          border: 'none',
          background: 'white',
          color: '#09090b',
          fontWeight: 700,
          fontSize: '13px',
          cursor: formLoading || !masterPrompt.trim() ? 'not-allowed' : 'pointer',
          opacity: formLoading ? 0.6 : 1,
          whiteSpace: 'nowrap',
          transition: 'opacity 0.2s',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {formLoading ? (
          <Loader size={16} className="spin" />
        ) : (
          <Zap size={16} />
        )}
        {formLoading ? 'Üretiliyor…' : 'Üret'}
      </button>
    </form>
  );
}

function VideoPreview({
  selectedJob, progressMsg, progressPercent, etaSeconds, masterPrompt,
}: {
  selectedJob: Job | null; progressMsg: string; progressPercent: number;
  etaSeconds: number | null; masterPrompt: string;
}) {
  const hasVideo = selectedJob?.final_filename;
  const isProcessing = selectedJob?.status === 'processing';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '56rem',
        aspectRatio: '16 / 9',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        background: '#000',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {hasVideo ? (
        <video
          src={`/videolar/${selectedJob!.final_filename}`}
          controls
          style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 0 }}
        />
      ) : isProcessing ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--accent)', position: 'relative', zIndex: 2 }}>
          <Loader size={48} className="pulse" />
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'white' }}>
            Video Üretiliyor ({progressPercent}%)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Aşama: {progressMsg}</div>
          {etaSeconds !== null && (
            <div style={{
              fontSize: '11px', color: 'var(--warning)',
              background: 'rgba(234,179,8,0.08)',
              padding: '4px 10px', borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
            }}>
              Kalan: {Math.floor(etaSeconds / 60)}dk {etaSeconds % 60}sn
            </div>
          )}
        </div>
      ) : (
        <>
          {/* play button */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 0 20px rgba(99,102,241,0.3)',
              position: 'relative',
              zIndex: 2,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(99,102,241,0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(99,102,241,0.3)'; }}
          >
            <Play size={28} style={{ color: 'white', marginLeft: '3px' }} />
          </div>

          {/* info badges */}
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'flex', gap: '8px', zIndex: 2 }}>
            <span style={{
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              4K UHD
            </span>
            <span style={{
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              24 FPS
            </span>
          </div>

          {/* prompt text */}
          <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 2, textAlign: 'center', width: '80%' }}>
            <span style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              maxWidth: '100%',
            }}>
              {masterPrompt || 'Yukarıdaki prompt alanına bir video konsepti yazın ve Üret butonuna tıklayın'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function TalkShowPanel() {
  const [topic, setTopic] = useState('Derbi analizi');
  const [homeTeam, setHomeTeam] = useState('Galatasaray');
  const [awayTeam, setAwayTeam] = useState('Fenerbahçe');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TalkShowResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const now = new Date().toISOString();
      const venue = homeTeam === 'Galatasaray' ? 'Rams Park' : homeTeam === 'Fenerbahçe' ? 'Ülker Stadyumu' : homeTeam === 'Beşiktaş' ? 'Tüpraş Stadyumu' : `${homeTeam} Stadyumu`;
      const res = await fetch('/api/v1/talkshow/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          match: { homeTeam, awayTeam, kickoff: now, venue, competition: 'Trendyol Süper Lig' },
          rounds: 3,
          language: 'tr',
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Talk-Show hatası');
      setResult(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputGlassStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: '6px',
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    backdropFilter: 'blur(16px)', color: 'white', fontSize: '12px',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-mono)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', position: 'relative' }}>
      <div className="glass" style={{ padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Konu</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} style={inputGlassStyle} />
          </div>
          <div style={{ flex: '1 1 120px', minWidth: '100px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Ev Sahibi</label>
            <input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} style={inputGlassStyle} />
          </div>
          <div style={{ flex: '1 1 120px', minWidth: '100px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Deplasman</label>
            <input value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} style={inputGlassStyle} />
          </div>
          <button onClick={handleSubmit} disabled={loading}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            {loading ? 'Analiz Ediliyor...' : 'Analiz Başlat'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px', color: 'var(--accent)', fontSize: '13px' }}>
          <Loader size={20} className="pulse" />
          Talk-Show hazırlanıyor...
        </div>
      )}

      {result && (
        <div className="glass" style={{ borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: 'bold', color: 'var(--secondary)' }}>
            {result.topic} — {result.match.homeTeam} vs {result.match.awayTeam}
          </div>
          <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            {result.transcript.map((msg, i) => (
              <div key={i} className="terminal-line" style={{
                padding: '10px 12px', borderRadius: '8px',
                background: msg.role === 'meta_orchestrator' ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: msg.role === 'meta_orchestrator' ? 'var(--secondary)' : 'var(--accent)' }}>
                    {msg.speaker}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {msg.sentiment === 'bullish' ? '📈' : msg.sentiment === 'bearish' ? '📉' : '➖'} %{Math.round(msg.confidence * 100)}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', lineHeight: '18px', fontFamily: 'var(--font-mono)' }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'rgba(234,179,8,0.05)' }}>
            <div style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: 'bold', marginBottom: '4px' }}>
              Fikir Birliği:{' '}
              {result.consensus.pick === 'home' ? result.match.homeTeam
                : result.consensus.pick === 'away' ? result.match.awayTeam
                : result.consensus.pick === 'draw' ? 'Beraberlik'
                : 'Fikir Birliği Yok'}
              <span style={{ fontWeight: 'normal' }}> (%{Math.round(result.consensus.confidence * 100)} güven)</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {result.consensus.rationale}
            </div>
          </div>
          <div style={{ padding: '8px 16px', fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
            {(result.durationMs / 1000).toFixed(1)}s
          </div>
        </div>
      )}

      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        padding: '12px 16px', background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)', borderTop: '1px solid var(--border)',
        borderRadius: '10px', textAlign: 'center', fontSize: '11px',
        color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
      }}>
        Bir spor konusu girin ve AI uzmanlarının analizini dinleyin
      </div>
    </div>
  );
}
