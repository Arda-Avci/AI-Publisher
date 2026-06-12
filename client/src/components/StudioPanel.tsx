import { useState } from 'react';
import { Loader, FileVideo, Download } from 'lucide-react';
import type { Scene } from './Timeline.js';
import type { OpportunityVideo } from './Opportunities.js';
import { Timeline } from './Timeline.js';
import { Opportunities } from './Opportunities.js';
import type { Tab, Job, TalkShowResult } from '../types.js';

interface StudioPanelProps {
  activeTab: Tab;
  selectedJob: Job | null;
  scenes: Scene[];
  progressMsg: string;
  progressPercent: number;
  etaSeconds: number | null;
  onSetSelectedJob: (j: Job | null) => void;
  onUpdateScenes: (s: Scene[]) => void;
  onRegenerateScene: (sceneId: number) => void;
  onAddScene: () => void;
  onDeleteScene: (sceneId: number) => void;
  onSelectScene: (scene: Scene) => void;
  onUseAsPrompt: (video: OpportunityVideo) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

export function StudioPanel({
  activeTab, selectedJob, scenes, progressMsg, progressPercent, etaSeconds,
  onUpdateScenes, onRegenerateScene, onAddScene, onDeleteScene, onSelectScene,
  onUseAsPrompt, t: _t,
}: StudioPanelProps) {
  return (
    <main style={{
      flexGrow: 1, display: 'flex', flexDirection: 'column',
      background: '#090d16', borderRight: '1px solid var(--border)',
    }}>
      <TabBar activeTab={activeTab} />
      <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto' }}>
        {activeTab === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            <PreviewPanel
              selectedJob={selectedJob}
              progressMsg={progressMsg}
              progressPercent={progressPercent}
              etaSeconds={etaSeconds}
            />
            {selectedJob && (
              <div className="glass" style={{ padding: '15px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <Timeline
                  scenes={scenes}
                  onUpdateScenes={onUpdateScenes}
                  onRegenerateScene={onRegenerateScene}
                  onAddScene={onAddScene}
                  onDeleteScene={onDeleteScene}
                  onSelectScene={(scene: Scene) => onSelectScene(scene)}
                />
              </div>
            )}
          </div>
        )}
        {activeTab === 'opportunities' && (
          <div className="glass" style={{ padding: '20px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <Opportunities onUseAsPrompt={onUseAsPrompt} />
          </div>
        )}
        {activeTab === 'groupchat' && <TalkShowPanel />}
      </div>
    </main>
  );
}

function TabBar({ activeTab }: { activeTab: Tab }) {
  const tabs: { key: Tab; label: string; primary: string }[] = [
    { key: 'create', label: 'Stüdyo & Timeline', primary: 'var(--primary)' },
    { key: 'opportunities', label: 'Fırsatlar Hunisi', primary: 'var(--primary)' },
    { key: 'groupchat', label: 'AI Talk-Show', primary: 'var(--secondary)' },
  ];

  return (
    <div style={{ height: '40px', background: 'var(--card)', display: 'flex', borderBottom: '1px solid var(--border)' }}>
      {tabs.map(({ key, label, primary }) => (
        <div
          key={key}
          style={{
            flexGrow: 1, border: 'none',
            background: activeTab === key ? 'rgba(0, 242, 254, 0.05)' : 'transparent',
            color: activeTab === key ? primary : 'var(--text-muted)',
            fontWeight: activeTab === key ? 'bold' : 'normal',
            borderBottom: activeTab === key ? `2px solid ${primary}` : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '12px',
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function PreviewPanel({
  selectedJob, progressMsg, progressPercent, etaSeconds,
}: {
  selectedJob: Job | null; progressMsg: string; progressPercent: number; etaSeconds: number | null;
}) {
  return (
    <div style={{
      flexGrow: 1, minHeight: '300px', background: '#05070c', borderRadius: '10px',
      border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
    }}>
      {selectedJob?.final_filename ? (
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
              <a
                href={`/videolar/shorts_${selectedJob.final_filename.replace(/^film_/, '')}`}
                download
                className="btn btn-primary"
                style={{ fontSize: '11px', padding: '6px 12px' }}
              >
                <Download size={12} /> Dikey Shorts İndir
              </a>
            )}
          </div>
        </div>
      ) : selectedJob?.status === 'processing' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--primary)' }}>
          <Loader size={48} className="pulse" />
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Video Üretiliyor ({progressPercent}%)</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Aşama: {progressMsg}</div>
          {etaSeconds !== null && (
            <div style={{
              fontSize: '11px', color: 'var(--warning)',
              background: 'rgba(234,179,8,0.08)', padding: '4px 10px', borderRadius: '4px',
            }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass" style={{ padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Konu</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'white', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: '1 1 120px', minWidth: '100px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ev Sahibi</label>
            <input
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'white', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: '1 1 120px', minWidth: '100px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Deplasman</label>
            <input
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--card)', color: 'white', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px', color: 'var(--primary)', fontSize: '13px' }}>
          <Loader size={20} className="pulse" />
          Talk-Show hazırlanıyor...
        </div>
      )}

      {result && (
        <div className="glass" style={{ borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: 'bold', color: 'var(--secondary)' }}>
            {result.topic} — {result.match.homeTeam} vs {result.match.awayTeam}
          </div>
          <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.transcript.map((msg, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: '8px',
                background: msg.role === 'meta_orchestrator' ? 'rgba(155,81,224,0.08)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: msg.role === 'meta_orchestrator' ? 'var(--secondary)' : 'var(--primary)' }}>
                    {msg.speaker}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {msg.sentiment === 'bullish' ? '📈' : msg.sentiment === 'bearish' ? '📉' : '➖'} %{Math.round(msg.confidence * 100)}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', lineHeight: '18px' }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--border)',
            background: 'rgba(234,179,8,0.05)',
          }}>
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
          <div style={{ padding: '8px 16px', fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
            {(result.durationMs / 1000).toFixed(1)}s
          </div>
        </div>
      )}
    </div>
  );
}
