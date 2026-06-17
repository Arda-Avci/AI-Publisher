import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  Upload,
  Play,
  Square,
  Loader,
  CheckCircle,
  AlertCircle,
  X,
  User,
} from 'lucide-react';

interface MuseTalkPanelProps {
  sceneId?: number;
  sceneImagePath?: string;
  sceneAudioPath?: string;
  csrfToken: string;
  onClose?: () => void;
  onResult?: (videoPath: string) => void;
}

type JobStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

const s: Record<string, React.CSSProperties> = {
  panel: {
    background: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(0,0,0,0.2)',
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.08em',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  body: {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  row: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  section: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  uploadZone: {
    border: '1px dashed rgba(255,255,255,0.12)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    minHeight: '100px',
    justifyContent: 'center',
  },
  previewImg: {
    width: '100%',
    maxHeight: '120px',
    borderRadius: '6px',
    objectFit: 'cover',
  },
  btn: {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    border: '1px solid var(--border)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s',
  },
  btnPrimary: {
    background: 'var(--gold)',
    color: '#000',
    border: '1px solid var(--gold)',
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  statusBar: {
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  resultVideo: {
    width: '100%',
    borderRadius: '8px',
    maxHeight: '200px',
  },
};

export const MuseTalkPanel: React.FC<MuseTalkPanelProps> = ({
  sceneId,
  sceneImagePath,
  sceneAudioPath,
  csrfToken,
  onClose,
  onResult,
}) => {
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string>(sceneImagePath || '');
  const [audioSource, setAudioSource] = useState<'scene' | 'upload'>('scene');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [error, setError] = useState<string>('');
  const [resultUrl, setResultUrl] = useState<string>('');
  const [pollCount, setPollCount] = useState(0);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleFaceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaceFile(file);
    const url = URL.createObjectURL(file);
    setFacePreview(url);
    if (e.target) e.target.value = '';
  }, []);

  const handleAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    setAudioSource('upload');
    if (e.target) e.target.value = '';
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setStatus('processing');
      setPollCount(0);

      pollingRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/v1/musetalk/status/${id}`, {
            headers: { 'x-csrf-token': csrfToken },
          });
          const d = await r.json();
          if (!d.success) {
            setStatus('failed');
            setError(d.error || 'Status check failed');
            if (pollingRef.current) clearInterval(pollingRef.current);
            return;
          }
          if (d.status === 'completed') {
            setStatus('completed');
            setResultUrl(d.outputPath || '');
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (d.outputPath && onResult) onResult(d.outputPath);
          } else if (d.status === 'failed') {
            setStatus('failed');
            setError(d.error || 'Generation failed');
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
          setPollCount((prev) => prev + 1);
        } catch (err: any) {
          setError(err.message);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      }, 2000);
    },
    [csrfToken, onResult],
  );

  const uploadFaceToServer = async (): Promise<string | null> => {
    if (!faceFile) return null;
    const formData = new FormData();
    formData.append('file', faceFile);
    try {
      const r = await fetch('/api/v1/upload', { method: 'POST', body: formData });
      const d = await r.json();
      return d.url || d.path || null;
    } catch {
      setError('Face upload failed');
      return null;
    }
  };

  const uploadAudioToServer = async (): Promise<string | null> => {
    if (audioSource === 'scene' && sceneAudioPath) return sceneAudioPath;
    if (!audioFile) return null;
    const formData = new FormData();
    formData.append('file', audioFile);
    try {
      const r = await fetch('/api/v1/upload', { method: 'POST', body: formData });
      const d = await r.json();
      return d.url || d.path || null;
    } catch {
      setError('Audio upload failed');
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!faceFile && !facePreview) {
      setError('Lütfen bir yüz görseli seçin');
      return;
    }
    setError('');
    setStatus('uploading');

    const facePath = faceFile ? await uploadFaceToServer() : sceneImagePath || null;
    const audioPath = await uploadAudioToServer();

    if (!facePath || !audioPath) {
      setError('Dosyalar yüklenemedi');
      setStatus('idle');
      return;
    }

    try {
      const r = await fetch('/api/v1/musetalk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({
          faceImagePath: facePath,
          audioPath,
          jobId: `mt_${sceneId || Date.now()}`,
        }),
      });
      const d = await r.json();
      if (!d.success) {
        setError(d.error || 'Generate failed');
        setStatus('idle');
        return;
      }
      startPolling(d.jobId);
    } catch (err: any) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const handleCancel = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setStatus('idle');
  };

  const isProcessing = status === 'uploading' || status === 'processing';

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <div style={s.headerTitle}>
          <User size={14} style={{ color: 'var(--gold)' }} />
          MUSE TALK — Dudak Senkronizasyonu
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div style={s.body}>
        {/* Face & Audio row */}
        <div style={s.row}>
          {/* Face Image */}
          <div style={s.section}>
            <span style={s.sectionLabel}>Yüz Görseli</span>
            <div
              style={s.uploadZone}
              onClick={() => faceInputRef.current?.click()}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              {facePreview ? (
                <img src={facePreview} alt="face" style={s.previewImg} />
              ) : (
                <>
                  <Camera size={24} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Yüz fotoğrafı seç
                  </span>
                </>
              )}
            </div>
            <input
              ref={faceInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFaceUpload}
              style={{ display: 'none' }}
            />
          </div>

          {/* Audio Source */}
          <div style={s.section}>
            <span style={s.sectionLabel}>Ses Kaynağı</span>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              <button
                onClick={() => setAudioSource('scene')}
                style={{
                  ...s.btn,
                  padding: '4px 8px',
                  fontSize: '10px',
                  background: audioSource === 'scene' ? 'rgba(200,164,92,0.15)' : 'transparent',
                  borderColor: audioSource === 'scene' ? 'var(--gold)' : 'var(--border)',
                  color: audioSource === 'scene' ? 'var(--gold)' : 'var(--text-muted)',
                }}
              >
                Sahne Sesi
              </button>
              <button
                onClick={() => {
                  setAudioSource('upload');
                  audioInputRef.current?.click();
                }}
                style={{
                  ...s.btn,
                  padding: '4px 8px',
                  fontSize: '10px',
                  background: audioSource === 'upload' ? 'rgba(200,164,92,0.15)' : 'transparent',
                  borderColor: audioSource === 'upload' ? 'var(--gold)' : 'var(--border)',
                  color: audioSource === 'upload' ? 'var(--gold)' : 'var(--text-muted)',
                }}
              >
                <Upload size={10} /> Yükle
              </button>
            </div>
            <div
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                padding: '6px 8px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {audioSource === 'scene' && sceneAudioPath
                ? `🎤 Sahne sesi: ${sceneAudioPath.split('/').pop() || 'mevcut'}`
                : audioSource === 'upload' && audioFile
                  ? `📁 ${audioFile.name}`
                  : 'Ses seçilmedi'}
            </div>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Generate Button */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleGenerate}
            disabled={isProcessing || (!faceFile && !facePreview)}
            style={{
              ...s.btn,
              ...s.btnPrimary,
              ...(isProcessing || (!faceFile && !facePreview) ? s.btnDisabled : {}),
            }}
          >
            {isProcessing ? (
              <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Play size={12} />
            )}
            {isProcessing ? 'İşleniyor...' : 'Dudak Senkronizasyonu Oluştur'}
          </button>
          {isProcessing && (
            <button
              onClick={handleCancel}
              style={{ ...s.btn, color: 'var(--accent)', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              <Square size={12} /> İptal
            </button>
          )}
        </div>

        {/* Status / Error */}
        {status === 'processing' && (
          <div
            style={{
              ...s.statusBar,
              background: 'rgba(200,164,92,0.08)',
              border: '1px solid rgba(200,164,92,0.15)',
            }}
          >
            <Loader
              size={14}
              style={{ color: 'var(--gold)', animation: 'spin 1s linear infinite' }}
            />
            <span style={{ color: 'var(--gold)' }}>
              Dudak senkronizasyonu oluşturuluyor... ({pollCount}s)
            </span>
          </div>
        )}
        {error && (
          <div
            style={{
              ...s.statusBar,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
          >
            <AlertCircle size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--accent)' }}>{error}</span>
            <button
              onClick={() => setError('')}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Result */}
        {status === 'completed' && resultUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                ...s.statusBar,
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.15)',
              }}
            >
              <CheckCircle size={14} style={{ color: 'var(--success)' }} />
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                Dudak senkronizasyonu tamamlandı
              </span>
            </div>
            <video src={resultUrl} controls style={s.resultVideo} autoPlay loop muted />
          </div>
        )}
      </div>
    </div>
  );
};
