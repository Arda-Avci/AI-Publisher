import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Loader, AlertCircle, Wifi, WifiOff } from 'lucide-react';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface PipecatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function PipecatPanel({ language }: { language: 'tr' | 'en' }) {
  const isTr = language === 'tr';
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<PipecatMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [transcript, setTranscript] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = useCallback((tr: string, en: string) => isTr ? tr : en, [isTr]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    setStatus('connecting');
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const ws = new WebSocket('ws://localhost:8765');
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        ws.send(JSON.stringify({ type: 'start', language }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'assistant_message') {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: data.content,
              timestamp: Date.now(),
            }]);
          } else if (data.type === 'user_transcript') {
            setTranscript(data.content);
          } else if (data.type === 'audio') {
            playAudio(data.data);
          } else if (data.type === 'video_frame') {
            renderVideoFrame(data.data);
          } else if (data.type === 'error') {
            setError(data.message || t('Sunucu hatası', 'Server error'));
          }
        } catch {
          /* ignore parse errors */
        }
      };

      ws.onerror = () => {
        setError(t('WebSocket bağlantı hatası', 'WebSocket connection error'));
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;
      };
    } catch (err: any) {
      setError(err.message || t('Medya erişimi reddedildi', 'Media access denied'));
      setStatus('error');
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setStatus('disconnected');
    setMessages([]);
    setTranscript('');
  };

  const playAudio = (base64Audio: string) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
      audio.play().catch(() => { /* ignore autoplay block */ });
    } catch { /* ignore */ }
  };

  const renderVideoFrame = (base64Frame: string) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.src = `data:image/jpeg;base64,${base64Frame}`;
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const statusLabel = () => {
    switch (status) {
      case 'connecting': return { label: t('Bağlanıyor...', 'Connecting...'), color: 'hsl(38,90%,50%)' };
      case 'connected': return { label: t('Bağlı', 'Connected'), color: 'hsl(142,60%,50%)' };
      case 'error': return { label: t('Hata', 'Error'), color: 'hsl(0,70%,50%)' };
      default: return { label: t('Bağlantı Yok', 'Disconnected'), color: 'var(--text-muted)' };
    }
  };

  const s: Record<string, React.CSSProperties> = {
    panel: {
      flex: 1,
      padding: '24px',
      overflowY: 'auto',
      position: 'relative',
      zIndex: 1,
      maxWidth: 960,
      margin: '0 auto',
    },
    card: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      marginBottom: 20,
    },
    label: {
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-muted)',
      marginBottom: 6,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
    },
    btn: {
      padding: '10px 24px',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      transition: 'all 0.2s',
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
      color: 'white',
    },
    btnSecondary: {
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      color: 'var(--text-primary)',
    },
    videoContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
      marginBottom: 20,
    },
    videoWrapper: {
      position: 'relative',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      aspectRatio: '16/9',
    },
    videoLabel: {
      position: 'absolute',
      top: 8,
      left: 8,
      fontSize: 10,
      fontWeight: 600,
      color: 'white',
      background: 'rgba(0,0,0,0.6)',
      padding: '2px 8px',
      borderRadius: 4,
      zIndex: 10,
    },
    chatContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxHeight: 300,
      overflowY: 'auto',
      padding: 16,
      background: 'var(--bg-primary)',
      borderRadius: 8,
      border: '1px solid var(--border)',
      marginBottom: 16,
    },
    message: (isUser: boolean) => ({
      padding: '8px 14px',
      borderRadius: 8,
      maxWidth: '80%',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      background: isUser ? 'hsla(var(--primary),0.15)' : 'var(--bg-surface)',
      border: '1px solid var(--border)',
      fontSize: 13,
      color: 'var(--text-primary)',
      lineHeight: 1.5,
    }),
    chip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 6,
      fontSize: 11,
      background: 'hsla(var(--primary),0.08)',
      color: 'hsl(var(--primary))',
      border: '1px solid hsla(var(--primary),0.2)',
    },
    controlBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
  };

  return (
    <div style={s.panel} role="region" aria-label={t('Ses/Video Pipeline', 'Voice/Video Pipeline')}>
      {/* Header Card */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('Pipecat Ses/Video Pipeline', 'Pipecat Voice/Video Pipeline')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {t('WebSocket üzerinden gerçek zamanlı ses ve video sohbeti', 'Real-time voice and video chat via WebSocket')}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            {status === 'connected' ? <Wifi size={14} color="hsl(142,60%,50%)" /> : <WifiOff size={14} color="var(--text-muted)" />}
            <span style={{ ...s.chip, color: statusLabel().color, borderColor: statusLabel().color, background: 'transparent' }}>
              {statusLabel().label}
            </span>
          </div>
        </div>

        {/* Video Feeds */}
        <div style={s.videoContainer}>
          <div style={s.videoWrapper}>
            <span style={s.videoLabel}>{t('Yerel', 'Local')}</span>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              aria-label={t('Yerel video', 'Local video')}
            />
          </div>
          <div style={s.videoWrapper}>
            <span style={s.videoLabel}>{t('Uzaktan', 'Remote')}</span>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              aria-label={t('Uzaktan video', 'Remote video')}
            />
          </div>
        </div>

        {/* Controls */}
        <div style={s.controlBar}>
          {status === 'disconnected' || status === 'error' ? (
            <button
              style={{ ...s.btn, ...s.btnPrimary }}
              onClick={connect}
              disabled={status === 'connecting'}
              aria-label={t('Bağlan', 'Connect')}
            >
              {status === 'connecting' ? (
                <><Loader size={14} className="spin" /> {t('Bağlanıyor...', 'Connecting...')}</>
              ) : (
                <><Phone size={14} /> {t('Bağlan', 'Connect')}</>
              )}
            </button>
          ) : (
            <>
              <button
                style={{ ...s.btn, ...s.btnSecondary }}
                onClick={toggleMute}
                aria-label={isMuted ? t('Sesi Aç', 'Unmute') : t('Sesi Kapat', 'Mute')}
                aria-pressed={isMuted}
              >
                {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              <button
                style={{ ...s.btn, ...s.btnSecondary }}
                onClick={toggleVideo}
                aria-label={isVideoEnabled ? t('Videoyu Kapat', 'Disable Video') : t('Videoyu Aç', 'Enable Video')}
                aria-pressed={!isVideoEnabled}
              >
                {isVideoEnabled ? <Video size={14} /> : <VideoOff size={14} />}
              </button>
              <button
                style={{ ...s.btn, ...s.btnPrimary, background: 'hsl(0,70%,50%)' }}
                onClick={disconnect}
                aria-label={t('Bağlantıyı Kes', 'Disconnect')}
              >
                <PhoneOff size={14} /> {t('Bağlantıyı Kes', 'Disconnect')}
              </button>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{ padding: '10px 14px', background: 'hsla(0,70%,50%,0.1)', border: '1px solid hsla(0,70%,50%,0.2)', borderRadius: 8, fontSize: 12, color: 'hsl(0,70%,60%)', marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}
            role="alert"
          >
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Live Transcript */}
      {status === 'connected' && (
        <div style={s.card}>
          <div style={s.label}>{t('CANLI DEŞİFRE', 'LIVE TRANSCRIPT')}</div>
          {transcript && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
              {transcript}
            </div>
          )}

          {/* Chat Messages */}
          {messages.length > 0 && (
            <div style={{ ...s.chatContainer, marginTop: 16 }} role="log" aria-label={t('Sohbet geçmişi', 'Chat history')}>
              {messages.map((msg, i) => (
                <div key={i} style={s.message(msg.role === 'user')}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, fontWeight: 600 }}>
                    {msg.role === 'user' ? t('Sen', 'You') : t('Asistan', 'Assistant')}
                  </div>
                  {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Connection Info */}
      <div style={s.card}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong>{t('Bağlantı Noktası:', 'Endpoint:')}</strong> ws://localhost:8765
          <br />
          <strong>{t('Protokol:', 'Protocol:')}</strong> WebSocket + WebRTC
          <br />
          <strong>{t('Desteklenen:', 'Features:')}</strong> {t('Ses, Video, Canlı Deşifre', 'Voice, Video, Live Transcript')}
        </div>
      </div>
    </div>
  );
}
