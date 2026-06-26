import { useState, useRef, useMemo } from 'react';
import { Play, Loader, Zap } from 'lucide-react';
import type { Scene } from './Timeline.js';
import { Timeline } from './Timeline.js';
import type { OpportunityVideo } from './Opportunities.js';
import type { Job, Tab } from '../types.js';
import { CharacterCreationPanel } from './CharacterCreationPanel.js';
import { TalkShowEditor } from './TalkShowEditor.js';
import { DynamicCaptions } from './DynamicCaptions.js';
import type { CaptionWord } from './DynamicCaptions.js';
import { MuseTalkPanel } from './MuseTalkPanel.js';
import { EditQueuePanel } from './EditQueuePanel.js';
import { CameraControlPanel } from './CameraControlPanel.js';

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
  selectedJob,
  scenes,
  progressMsg,
  progressPercent,
  etaSeconds,
  csrfToken,
  onSetSelectedJob: _onSetSelectedJob,
  onUpdateScenes: _onUpdateScenes,
  onRegenerateScene: _onRegenerateScene,
  onAddScene: _onAddScene,
  onDeleteScene: _onDeleteScene,
  onSelectScene: _onSelectScene,
  onUseAsPrompt: _onUseAsPrompt,
  t: _t,
  masterPrompt,
  onSetMasterPrompt,
  onSubmit,
  formLoading,
  mainTab,
}: StudioPanelProps) {
  const [playheadTime, setPlayheadTime] = useState(0);
  const [selectedSceneId, setSelectedSceneId] = useState<number | undefined>();
  const [showMuseTalk, setShowMuseTalk] = useState(false);
  const [showEditQueue, setShowEditQueue] = useState(false);
  const [showCameraControl, setShowCameraControl] = useState(false);
  if (mainTab === 'Galeri') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {selectedJob ? (
          <VideoPreview
            selectedJob={selectedJob}
            scenes={scenes}
            progressMsg={progressMsg}
            progressPercent={progressPercent}
            etaSeconds={etaSeconds}
            masterPrompt={masterPrompt}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            <Play size={48} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
              Galeriden bir proje seçin
            </span>
            <span style={{ fontSize: '12px', opacity: 0.6 }}>
              Sağ paneldeki listeden bir video seçerek önizleyebilirsiniz
            </span>
          </div>
        )}
      </div>
    );
  }

  if (mainTab === 'Talk-Show') {
    return (
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <TalkShowEditor />
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

  if (mainTab !== 'Stüdyo') {
    return null;
  }

  const handleSelectScene = (scene: Scene) => {
    setSelectedSceneId(scene.id);
    _onSelectScene(scene);
  };

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 24px 100px 24px',
          gap: '16px',
        }}
      >
        <VideoPreview
          selectedJob={selectedJob}
          scenes={scenes}
          progressMsg={progressMsg}
          progressPercent={progressPercent}
          etaSeconds={etaSeconds}
          masterPrompt={masterPrompt}
          onTimeUpdate={setPlayheadTime}
        />
        {selectedJob && scenes.length > 0 && (
          <Timeline
            scenes={scenes}
            onUpdateScenes={_onUpdateScenes}
            onRegenerateScene={_onRegenerateScene}
            onAddScene={_onAddScene}
            onDeleteScene={_onDeleteScene}
            onSelectScene={handleSelectScene}
            selectedSceneId={selectedSceneId}
            playheadTime={playheadTime}
          />
        )}
        {selectedJob && selectedSceneId && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 4px',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => setShowMuseTalk(!showMuseTalk)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                border: `1px solid ${showMuseTalk ? 'var(--gold)' : 'var(--border)'}`,
                background: showMuseTalk ? 'rgba(200,164,92,0.12)' : 'rgba(255,255,255,0.04)',
                color: showMuseTalk ? 'var(--gold)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s',
              }}
            >
              🎭 Dudak Senkronizasyonu (MuseTalk)
            </button>
            <button
              onClick={() => setShowEditQueue(!showEditQueue)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                border: `1px solid ${showEditQueue ? 'var(--gold)' : 'var(--border)'}`,
                background: showEditQueue ? 'rgba(200,164,92,0.12)' : 'rgba(255,255,255,0.04)',
                color: showEditQueue ? 'var(--gold)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s',
              }}
            >
              ✏️ AI Edit Queue
            </button>
            <button
              onClick={() => setShowCameraControl(!showCameraControl)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                border: `1px solid ${showCameraControl ? 'var(--gold)' : 'var(--border)'}`,
                background: showCameraControl ? 'rgba(200,164,92,0.12)' : 'rgba(255,255,255,0.04)',
                color: showCameraControl ? 'var(--gold)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s',
              }}
            >
              📷 Kamera Kontrol
            </button>
          </div>
        )}
        {selectedJob &&
          showMuseTalk &&
          selectedSceneId &&
          (() => {
            const scene = scenes.find((s) => s.id === selectedSceneId);
            return scene ? (
              <MuseTalkPanel
                sceneId={scene.id}
                sceneImagePath={scene.image_path}
                sceneAudioPath={scene.audio_path}
                csrfToken={csrfToken}
                onClose={() => setShowMuseTalk(false)}
              />
            ) : null;
          })()}
        {selectedJob && showEditQueue && (
          <EditQueuePanel
            jobId={selectedJob.id}
            scenes={scenes.map((s) => ({ id: s.id, scene_number: s.scene_number }))}
            csrfToken={csrfToken}
            onClose={() => setShowEditQueue(false)}
          />
        )}
        {selectedJob && showCameraControl && selectedSceneId && (() => {
          const scene = scenes.find((s) => s.id === selectedSceneId);
          if (!scene) return null;
          return (
            <CameraControlPanel
              scene={scene}
              scenes={scenes}
              onUpdateSceneField={(sceneId, field, value) => {
                const updated = scenes.map((s) =>
                  s.id === sceneId ? { ...s, [field]: value } : s
                );
                _onUpdateScenes(updated);
              }}
              onClose={() => setShowCameraControl(false)}
            />
          );
        })()}
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
  masterPrompt,
  onSetMasterPrompt,
  onSubmit,
  formLoading,
}: {
  masterPrompt: string;
  onSetMasterPrompt: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  formLoading: boolean;
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
        {formLoading ? <Loader size={16} className="spin" /> : <Zap size={16} />}
        {formLoading ? 'Üretiliyor…' : 'Üret'}
      </button>
    </form>
  );
}

function VideoPreview({
  selectedJob,
  scenes,
  progressMsg,
  progressPercent,
  etaSeconds,
  masterPrompt,
  onTimeUpdate,
}: {
  selectedJob: Job | null;
  scenes: Scene[];
  progressMsg: string;
  progressPercent: number;
  etaSeconds: number | null;
  masterPrompt: string;
  onTimeUpdate?: (t: number) => void;
}) {
  const hasVideo = selectedJob?.final_filename;
  const status = selectedJob?.status;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const words = useMemo(() => {
    if (!scenes || scenes.length === 0) return [];
    const allWords: CaptionWord[] = [];
    const rate = 0.35;
    scenes.forEach((scene) => {
      const text = scene.speech_text || '';
      const tokens = text.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return;
      const sceneOffset = (scene.scene_number - 1) * 6;
      tokens.forEach((word: string, i: number) => {
        allWords.push({
          word,
          start: sceneOffset + i * rate,
          end: sceneOffset + (i + 1) * rate,
        });
      });
    });
    return allWords;
  }, [scenes]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);
      onTimeUpdate?.(t);
    }
  };

  const renderPlaceholder = () => {
    if (!selectedJob) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: '40px',
            textAlign: 'center',
            zIndex: 2,
          }}
        >
          <div className="gold-logo" style={{ fontSize: '14px', letterSpacing: '0.25em' }}>
            AI PUBLISHER STUDIO
          </div>
          <div style={{ width: '40px', height: '1px', background: 'var(--gold)', opacity: 0.6 }} />
          <h3
            style={{
              fontSize: '28px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              maxWidth: '500px',
              lineHeight: '1.4',
            }}
          >
            Sinematik Prodüksiyonunuzu Başlatın
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              maxWidth: '400px',
              lineHeight: '1.6',
            }}
          >
            {masterPrompt ||
              'Aşağıdaki alana bir video konsepti girin veya galeriden daha önce ürettiğiniz bir projeyi seçerek önizleyin.'}
          </p>
        </div>
      );
    }

    if (status === 'pending') {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: '40px',
            textAlign: 'center',
            zIndex: 2,
          }}
        >
          <div
            className="pulse"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold)' }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--gold)',
                boxShadow: '0 0 8px var(--gold)',
              }}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              İŞLEM BEKLEMEDE
            </span>
          </div>
          <h3
            style={{
              fontSize: '28px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              maxWidth: '500px',
              lineHeight: '1.4',
            }}
          >
            Sunucu Sırası Bekleniyor
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              maxWidth: '400px',
              lineHeight: '1.6',
            }}
          >
            Prodüksiyon talebiniz kuyruğa alındı. Docker GPU container hazır olduğunda otonom video
            üretim süreci otomatik olarak başlayacaktır.
          </p>
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: '40px',
            textAlign: 'center',
            zIndex: 2,
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent)',
                boxShadow: '0 0 8px var(--accent)',
              }}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              ÜRETİM BAŞARISIZ
            </span>
          </div>
          <h3
            style={{
              fontSize: '28px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              maxWidth: '500px',
              lineHeight: '1.4',
            }}
          >
            Kurgu Sırasında Hata Oluştu
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              maxWidth: '400px',
              lineHeight: '1.6',
            }}
          >
            Medya sentezi veya miksaj aşamasında bir sorunla karşılaşıldı. Detayları sistem
            loglarından inceleyebilir veya yeni bir konseptle tekrar deneyebilirsiniz.
          </p>
        </div>
      );
    }

    if (status === 'awaiting_approval') {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: '40px',
            textAlign: 'center',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold)' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--gold)',
                boxShadow: '0 0 8px var(--gold)',
              }}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              ONAY BEKLİYOR
            </span>
          </div>
          <h3
            style={{
              fontSize: '28px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              maxWidth: '500px',
              lineHeight: '1.4',
            }}
          >
            Sosyal Medya Yayın Onayı
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              maxWidth: '400px',
              lineHeight: '1.6',
            }}
          >
            Video üretimi başarıyla tamamlandı. Sağ panelden yapay zeka tarafından hazırlanan kopya
            metinlerini düzenleyip onaylayarak yayın motorunu tetikleyebilirsiniz.
          </p>
        </div>
      );
    }

    if (status === 'processing') {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            padding: '40px',
            textAlign: 'center',
            zIndex: 2,
          }}
        >
          <Loader size={36} className="spin" style={{ color: 'var(--accent)' }} />
          <h3
            style={{
              fontSize: '28px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              maxWidth: '500px',
              lineHeight: '1.4',
            }}
          >
            Video Üretiliyor ({progressPercent}%)
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-muted)',
              maxWidth: '400px',
              lineHeight: '1.6',
            }}
          >
            Aşama: <strong>{progressMsg || 'Başlatılıyor...'}</strong>
          </p>
          {etaSeconds !== null && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--gold)',
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                padding: '6px 14px',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Tahmini Kalan Süre: {Math.floor(etaSeconds / 60)}dk {etaSeconds % 60}sn
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          padding: '40px',
          textAlign: 'center',
          zIndex: 2,
        }}
      >
        <div className="gold-logo" style={{ fontSize: '14px', letterSpacing: '0.25em' }}>
          AI PUBLISHER
        </div>
        <div style={{ width: '40px', height: '1px', background: 'var(--gold)', opacity: 0.6 }} />
        <h3
          style={{
            fontSize: '28px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-serif)',
            fontWeight: 400,
            maxWidth: '500px',
            lineHeight: '1.4',
          }}
        >
          Prodüksiyon Sentezleniyor
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            maxWidth: '400px',
            lineHeight: '1.6',
          }}
        >
          Video kurgusu veya medya sentez süreci henüz tamamlanmadı. Lütfen bekleyin.
        </p>
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '56rem',
        aspectRatio: '16 / 9',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        background: '#040810',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
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
          background:
            'linear-gradient(180deg, rgba(5,7,11,0.9) 0%, transparent 60%, rgba(5,7,11,0.9) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {hasVideo ? (
        <video
          ref={videoRef}
          src={`/videolar/${selectedJob!.final_filename}`}
          controls
          onTimeUpdate={handleTimeUpdate}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            position: 'relative',
            zIndex: 0,
          }}
        />
      ) : (
        renderPlaceholder()
      )}

      {/* DynamicCaptions overlay */}
      {hasVideo && words.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
            width: '80%',
            maxWidth: '700px',
          }}
        >
          <DynamicCaptions
            words={words}
            currentTime={currentTime}
            animationType="bounce"
            highlightColor="#FFD700"
            baseColor="#FFFFFF"
            fontSize={28}
            visible={true}
            align="center"
            autoPlay={true}
          />
        </div>
      )}

      {/* Info badges when preview is active */}
      {hasVideo && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            display: 'flex',
            gap: '8px',
            zIndex: 2,
          }}
        >
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(5, 7, 11, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
              border: '1px solid var(--border)',
            }}
          >
            4K UHD
          </span>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              background: 'rgba(5, 7, 11, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
              border: '1px solid var(--border)',
            }}
          >
            24 FPS
          </span>
        </div>
      )}

      {/* Prompt text when preview is active */}
      {hasVideo && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            textAlign: 'center',
            width: '70%',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              maxWidth: '100%',
              letterSpacing: '0.02em',
            }}
          >
            {selectedJob?.master_prompt}
          </span>
        </div>
      )}
    </div>
  );
}
