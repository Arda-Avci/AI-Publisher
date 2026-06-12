import { useState } from 'react';
import { Search, Flame, Eye, Sparkles, TrendingUp, AlertCircle, Loader } from 'lucide-react';

export interface OpportunityVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  views: number;
  score: number;
  description: string;
  publishedAt: string;
}

interface OpportunitiesProps {
  onUseAsPrompt: (video: OpportunityVideo) => void;
}

export const Opportunities: React.FC<OpportunitiesProps> = ({ onUseAsPrompt }) => {
  const [query, setQuery] = useState<string>('yapay zeka');
  const [selectedLang, setSelectedLang] = useState<string>('tr');
  const [videos, setVideos] = useState<OpportunityVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<OpportunityVideo | null>(null);

  const fetchOpportunities = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/opportunity-videos?q=${encodeURIComponent(query)}&lang=${selectedLang}`);
      const data = await res.json();
      if (data.success) {
        setVideos(data.videos || []);
      } else {
        setErrorMsg(data.message || 'Fırsat videoları yüklenemedi.');
      }
    } catch (err: any) {
      setErrorMsg(`Sunucu bağlantı hatası: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatViews = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}B`;
    return count.toString();
  };

  return (
    <div className="opportunities-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {/* Search Header */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
        <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px' }}>FIRSATLAR HUNİSİ (VIRAL TRENDS)</span>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Viral trend araması..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOpportunities()}
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'white',
              padding: '8px 12px 8px 36px',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Language selector */}
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          style={{
            background: 'var(--bg-surface)',
            color: 'white',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '8px',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="tr">TR (Türkçe)</option>
          <option value="en">EN (İngilizce)</option>
          <option value="de">DE (Almanca)</option>
          <option value="fr">FR (Fransızca)</option>
          <option value="es">ES (İspanyolca)</option>
        </select>

        <button onClick={fetchOpportunities} className="btn btn-primary" style={{ padding: '8px 16px' }} disabled={loading}>
          {loading ? <Loader size={14} className="pulse" /> : 'Ara'}
        </button>
      </div>

      {/* Error notification */}
      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius)',
          padding: '12px',
          fontSize: '12px',
          color: 'var(--danger)',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Horizontal Scroll Cards List */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '110px', color: 'var(--text-muted)', fontSize: '13px', gap: '8px' }}>
          <Loader size={18} className="pulse" style={{ color: 'var(--primary)' }} />
          <span>Mevcut viral videolar taranıyor...</span>
        </div>
      ) : videos.length > 0 ? (
        <div className="horizontal-scroll" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
          {videos.map((video) => (
            <div
              key={video.videoId}
              onClick={() => setSelectedVideo(video)}
              className="opp-card glass"
              style={{
                minWidth: '180px',
                width: '180px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '8px',
                cursor: 'pointer',
                transition: 'var(--transition)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = '0 0 15px var(--primary-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Thumbnail with Score badge */}
              <div style={{ height: '90px', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <img src={video.thumbnail} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                
                {/* Score badge */}
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  background: 'linear-gradient(135deg, #ef4444, #ff8c00)',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  padding: '2px 5px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                }}>
                  <Flame size={8} /> Skor {video.score}
                </div>
              </div>

              {/* Title & Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'white',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineBreak: 'anywhere',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  height: '32px',
                  lineHeight: '16px'
                }}>
                  {video.title}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>
                    {video.channelTitle}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                    <Eye size={10} /> {formatViews(video.views)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '110px', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '13px' }}>
          Taramaya başlamak için arama yapın.
        </div>
      )}

      {/* Video Details Modal Overlay */}
      {selectedVideo && (
        <div className="modal-overlay glass" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(5, 7, 12, 0.85)'
        }} onClick={() => setSelectedVideo(null)}>
          <div className="modal-card" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            width: '90%',
            maxWidth: '500px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h4 style={{ color: 'white', fontWeight: 600, fontSize: '14px', lineHeight: '20px' }}>
                {selectedVideo.title}
              </h4>
            </div>

            <img src={selectedVideo.thumbnail} alt={selectedVideo.title} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px' }} />

            <div style={{ display: 'flex', gap: '15px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div>Kanal: <strong style={{ color: 'white' }}>{selectedVideo.channelTitle}</strong></div>
              <div>İzlenme: <strong style={{ color: 'white' }}>{selectedVideo.views.toLocaleString()}</strong></div>
              <div>Skor: <strong style={{ color: 'var(--primary)' }}>{selectedVideo.score} / 15</strong></div>
            </div>

            <div style={{
              background: 'var(--bg-timeline)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              maxHeight: '120px',
              overflowY: 'auto',
              lineHeight: '16px'
            }}>
              {selectedVideo.description || 'Açıklama bulunmuyor.'}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => setSelectedVideo(null)}>
                Kapat
              </button>
              <button
                className="btn btn-primary"
                style={{ flexGrow: 1, gap: '6px' }}
                onClick={() => {
                  onUseAsPrompt(selectedVideo);
                  setSelectedVideo(null);
                }}
              >
                <Sparkles size={14} /> Prompt Olarak Kullan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
