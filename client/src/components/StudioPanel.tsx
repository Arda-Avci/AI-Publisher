import { Loader, FileVideo, Download, MessageSquare } from 'lucide-react';
import type { Scene } from './Timeline.js';
import type { OpportunityVideo } from './Opportunities.js';
import { Timeline } from './Timeline.js';
import { Opportunities } from './Opportunities.js';
import type { Tab, Job } from '../types.js';

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
  onUseAsPrompt, t,
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
        {activeTab === 'groupchat' && (
          <div className="glass" style={{
            padding: '30px', borderRadius: '10px', border: '1px dashed var(--secondary)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', textAlign: 'center',
          }}>
            <MessageSquare size={48} style={{ color: 'var(--secondary)' }} />
            <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>{t('groupChatTitle')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '500px', lineHeight: '20px' }}>
              {t('groupChatDesc')}
            </p>
            <div style={{
              fontSize: '12px', background: 'rgba(155, 81, 224, 0.1)',
              color: 'var(--secondary)', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold',
            }}>
              {t('comingSoon')}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function TabBar({ activeTab }: { activeTab: Tab }) {
  const tabs: { key: Tab; label: string; primary: string }[] = [
    { key: 'create', label: 'Stüdyo & Timeline', primary: 'var(--primary)' },
    { key: 'opportunities', label: 'Fırsatlar Hunisi', primary: 'var(--primary)' },
    { key: 'groupchat', label: 'Grup Sohbetinden Video', primary: 'var(--secondary)' },
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
