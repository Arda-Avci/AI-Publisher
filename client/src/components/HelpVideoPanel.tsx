/**
 * HelpVideoPanel Component
 * Tutorial videos panel with modal for each feature
 */

import { useState, useEffect } from 'react';
import { HelpCircle, X, Play, ChevronLeft, ChevronRight, Clock, Check } from 'lucide-react';

interface HelpVideo {
  id: number;
  featureKey: string;
  title: string;
  description: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  sortOrder: number;
}

interface HelpVideoPanelProps {
  feature: string;
  language: 'tr' | 'en';
  onClose?: () => void;
}

const STORAGE_KEY = 'help_video_dismissed';

export function HelpVideoPanel({ feature, language, onClose }: HelpVideoPanelProps) {
  const [videos, setVideos] = useState<HelpVideo[]>([]);
  const [, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<HelpVideo | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed help for this feature
    const dismissed = localStorage.getItem(`${STORAGE_KEY}_${feature}`);
    if (!dismissed) {
      fetchHelpVideos();
      setIsVisible(true);
    }
  }, [feature]);

  const fetchHelpVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/help-videos/${feature}?lang=${language}`);
      const data = await res.json();
      if (data.success && data.videos) {
        setVideos(data.videos);
      }
    } catch (err) {
      console.error('Failed to fetch help videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const dismissHelp = () => {
    localStorage.setItem(`${STORAGE_KEY}_${feature}`, 'true');
    setIsVisible(false);
    onClose?.();
  };

  const goToNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedVideo(videos[currentIndex + 1]);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedVideo(videos[currentIndex - 1]);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible || videos.length === 0) return null;

  return (
    <>
      {/* Help Icon Button */}
      <button
        onClick={() => setSelectedVideo(videos[0])}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px var(--accent-glow)',
          zIndex: 50,
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title={language === 'tr' ? 'Yardım Videoları' : 'Help Videos'}
      >
        <HelpCircle size={24} color="white" />
      </button>

      {/* Video Modal */}
      {selectedVideo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(3, 5, 10, 0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedVideo(null);
            }
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-primary)',
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                  {language === 'tr' ? 'YARDIM VİDEOSU' : 'HELP VIDEO'}
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700 }}>
                  {selectedVideo.title}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Navigation arrows */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={goToPrev}
                    disabled={currentIndex === 0}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '6px',
                      cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                      opacity: currentIndex === 0 ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={goToNext}
                    disabled={currentIndex === videos.length - 1}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '6px',
                      cursor: currentIndex === videos.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: currentIndex === videos.length - 1 ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {currentIndex + 1} / {videos.length}
                </span>
                <button
                  onClick={() => setSelectedVideo(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Video Content Area */}
            <div
              style={{
                flex: 1,
                padding: '20px',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Video Player Placeholder / Embed */}
              <div
                style={{
                  aspectRatio: '16/9',
                  background: 'var(--bg-primary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {selectedVideo.videoUrl ? (
                  <video
                    src={selectedVideo.videoUrl}
                    controls
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <>
                    {/* Placeholder thumbnail */}
                    {selectedVideo.thumbnailUrl && (
                      <img
                        src={selectedVideo.thumbnailUrl}
                        alt={selectedVideo.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 30px var(--accent-glow)',
                        }}
                      >
                        <Play size={28} fill="white" style={{ marginLeft: '3px' }} />
                      </div>
                    </div>
                    {/* Duration badge */}
                    {selectedVideo.durationSeconds > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          right: '12px',
                          background: 'rgba(0,0,0,0.8)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Clock size={12} />
                        {formatDuration(selectedVideo.durationSeconds)}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Video Description */}
              <div>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {selectedVideo.description}
                </p>
              </div>

              {/* Video List (thumbnails) */}
              <div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: '8px',
                    display: 'block',
                  }}
                >
                  {language === 'tr' ? 'TÜM VİDEOLAR' : 'ALL VIDEOS'}
                </span>
                <div
                  style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}
                >
                  {videos.map((video, idx) => (
                    <div
                      key={video.id}
                      onClick={() => {
                        setSelectedVideo(video);
                        setCurrentIndex(idx);
                      }}
                      style={{
                        flex: '0 0 160px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border:
                          idx === currentIndex
                            ? '2px solid var(--accent)'
                            : '2px solid transparent',
                        opacity: idx === currentIndex ? 1 : 0.7,
                        transition: 'var(--transition)',
                      }}
                    >
                      <div
                        style={{
                          height: '90px',
                          background: 'var(--bg-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Play size={24} color="var(--text-muted)" />
                        )}
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-surface)' }}>
                        <p
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {video.title}
                        </p>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {formatDuration(video.durationSeconds)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-primary)',
              }}
            >
              <button
                onClick={dismissHelp}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Check size={14} />
                {language === 'tr' ? 'Bir daha gösterme' : "Don't show again"}
              </button>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {language === 'tr' ? 'Bu özellik için yardım' : `Help for ${feature}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * HelpVideoModal - Simple modal wrapper for embedding help videos anywhere
 */
export function HelpVideoModal({
  isOpen,
  onClose,
  title,
  videoUrl,
  description,
  language,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoUrl?: string;
  description?: string;
  language: 'tr' | 'en';
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(3, 5, 10, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '640px',
          maxHeight: '90vh',
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '20px', overflow: 'auto' }}>
          {videoUrl ? (
            <video src={videoUrl} controls style={{ width: '100%', borderRadius: '8px' }} />
          ) : (
            <div
              style={{
                aspectRatio: '16/9',
                background: 'var(--bg-primary)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>
                {language === 'tr' ? 'Video yakında eklenecek' : 'Video coming soon'}
              </span>
            </div>
          )}
          {description && (
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                marginTop: '16px',
                lineHeight: 1.6,
              }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
