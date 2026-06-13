import { useState, useEffect, useRef } from 'react';
import {
  Film, Sparkles, Play, X, Globe, ArrowRight, Share2,
  Loader, Download, ArrowUpRight, Heart, TrendingUp, BookOpen, Star, Activity, Music
} from 'lucide-react';
import { landingPageStyles, initScrollAnimations, initNumberAnimations } from './LandingPageAnimations.js';

interface Scene {
  id: number;
  scene_number: number;
  video_prompt: string;
  speech_text: string;
  sfx_prompt: string;
  camera_motion: string;
}

interface DemoVideo {
  id: number;
  master_prompt: string;
  production_notes: string;
  character_features: string;
  final_filename: string;
  production_template: string;
  total_scenes: number;
  completed_scenes: number;
  yt_title?: string;
  yt_desc?: string;
  yt_tags?: string;
  tt_desc?: string;
  tt_tags?: string;
  scenes?: Scene[];
}

interface LandingPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  authError: string;
  setAuthError: (err: string) => void;
  language: 'tr' | 'en';
  setLanguage: (lang: 'tr' | 'en') => void;
  t: (key: string, params?: Record<string, any>) => string;
}

export function LandingPage({ onLogin, authError, setAuthError, language, setLanguage, t }: LandingPageProps) {
  const [demoVideos, setDemoVideos] = useState<DemoVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<DemoVideo | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Tümü');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const galleryRef = useRef<HTMLElement>(null);

  const categories = ['Tümü', 'Çocuk', 'Reklam', 'Eğitim', 'Komedi', 'Spiritüel', 'Spor'];
  const categoryIcon: Record<string, any> = {
    'Tümü': Film, 'Çocuk': Heart, 'Reklam': TrendingUp, 'Eğitim': BookOpen,
    'Komedi': Star, 'Spiritüel': Sparkles, 'Spor': Activity
  };
  const categoryMap: Record<string, string> = {
    'Çocuk': 'cocuk', 'Reklam': 'reklam', 'Eğitim': 'egitim',
    'Komedi': 'komedi', 'Spiritüel': 'spirituel', 'Spor': 'spor'
  };
  const categoryGradients: Record<string, string> = {
    'Çocuk': 'linear-gradient(135deg, #1e1b4b, #312e81)',
    'Reklam': 'linear-gradient(135deg, #1c1917, #292524)',
    'Eğitim': 'linear-gradient(135deg, #172554, #1e3a5f)',
    'Komedi': 'linear-gradient(135deg, #052e16, #14532d)',
    'Spiritüel': 'linear-gradient(135deg, #1e1b4b, #3b0764)',
    'Spor': 'linear-gradient(135deg, #1f1315, #4a0e17)',
  };
  const aiModels = ['CogVideoX', 'Wan 2.1', 'HunyuanVideo', 'XTTS-v2', 'Wav2Lip', 'AudioLDM2'];

  const filteredVideos = activeCategory === 'Tümü'
    ? demoVideos
    : demoVideos.filter(v => v.production_template?.toLowerCase() === categoryMap[activeCategory]);

  const showPlaceholders = !loading && demoVideos.length === 0;

  const placeholderItems = showPlaceholders
    ? (activeCategory === 'Tümü' ? ['Çocuk', 'Reklam', 'Eğitim', 'Komedi', 'Spiritüel', 'Spor'] : [activeCategory])
    : [];

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';

    fetchDemoVideos();
    // Initialize scroll animations
    const cleanup = initScrollAnimations();
    initNumberAnimations();

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.height = originalHeight;
      cleanup();
    };
  }, []);

  const fetchDemoVideos = async () => {
    try {
      const res = await fetch('/api/v1/public/demo-videos');
      const data = await res.json();
      if (data.success && Array.isArray(data.videos)) {
        setDemoVideos(data.videos);
      }
    } catch (err) {
      console.error('Failed to fetch demo videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setAuthError('');
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setAuthError(err.message || 'Giriş başarısız.');
    } finally {
      setLoginLoading(false);
    }
  };

  const scrollToGallery = () => {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      minHeight: '100vh',
      fontFamily: 'var(--font-sans)',
      position: 'relative'
    }}>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        ${landingPageStyles}
      `}</style>

      {/* GLOW DECORATIONS */}
      <div style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '600px',
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />
      <div style={{
        position: 'fixed', bottom: '-100px', right: '-100px',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* ========== NAVBAR ========== */}
      <header className="navbar" style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: '64px', padding: '0 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        background: 'rgba(9,9,11,0.8)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Film size={18} style={{ color: 'white' }} />
          </div>
          <span className="gradient-text" style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '0.5px' }}>
            AI-PUBLISHER
          </span>
          <span style={{
            fontSize: '9px', background: 'var(--accent-glow)', color: 'var(--accent)',
            padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold', letterSpacing: '0.5px'
          }}>
            PRO
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px' }}
          >
            <Globe size={14} style={{ marginRight: '4px' }} />
            {language.toUpperCase()}
          </button>
          <button
            onClick={() => { setAuthError(''); setIsLoginOpen(true); }}
            className="btn btn-primary"
            style={{ fontWeight: 'bold', fontSize: '13px', borderRadius: '8px', padding: '8px 20px' }}
          >
            {t('login') || 'Giriş Yap'}
          </button>
        </div>
      </header>

      {/* ========== HERO SECTION ========== */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '80px 40px 60px',
        maxWidth: '1200px', margin: '0 auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px'
      }}>
        {/* Badge */}
        <div className="hero-badge" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'var(--accent-light)', border: '1px solid rgba(99,102,241,0.2)',
          padding: '6px 18px', borderRadius: '30px', fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold'
        }}>
          <Sparkles size={12} />
          <span>{t('heroBadge') || 'Otonom Video Üretiminin Geleceği'}</span>
        </div>

        {/* Title */}
        <h1 className="hero-title" style={{
          fontSize: '56px', fontWeight: 800, lineHeight: '1.1', letterSpacing: '-2px',
          textAlign: 'center', margin: 0, maxWidth: '850px'
        }}>
          <span className="gradient-text">Otonom AI Video<br />Üretim Platformu</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle" style={{
          fontSize: '17px', color: 'var(--text-muted)', lineHeight: '1.6',
          textAlign: 'center', maxWidth: '600px', margin: 0
        }}>
          Prompt'tan sosyal medyaya, tek tıkla. Colab GPU'su ile 4K video üretin.
        </p>

        {/* CTA Buttons */}
        <div className="hero-ctas" style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          <button
            onClick={() => setIsLoginOpen(true)}
            className="btn btn-primary"
            style={{
              padding: '16px 32px', fontSize: '15px', fontWeight: 'bold',
              borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px'
            }}
          >
            {t('heroCTA') || 'Hemen Başla'} <ArrowRight size={18} />
          </button>
          <button
            onClick={scrollToGallery}
            className="btn btn-secondary"
            style={{
              padding: '16px 32px', fontSize: '15px', fontWeight: 'bold',
              borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px'
            }}
          >
            <Play size={16} /> Örnekleri İzle
          </button>
        </div>

        {/* Video Player Area */}
        <div className="hero-video hero-float" style={{
          position: 'relative', width: '100%', maxWidth: '960px',
          borderRadius: '16px', overflow: 'hidden', marginTop: '20px',
          aspectRatio: '16/9',
          background: 'linear-gradient(220deg, #1e1b4b 0%, #09090b 100%)',
          border: '1px solid var(--border)',
          boxShadow: '0 0 80px rgba(99,102,241,0.1), 0 20px 60px rgba(0,0,0,0.5)'
        }}>
          {/* Gradient overlay top/bottom */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(9,9,11,0.4) 0%, transparent 40%, transparent 60%, rgba(9,9,11,0.4) 100%)',
            zIndex: 1, pointerEvents: 'none'
          }} />
          {/* Grid pattern */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.08,
            backgroundImage: [
              'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)'
            ].join(', '),
            backgroundSize: '60px 60px', zIndex: 0
          }} />
          {/* Center play button */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 2
          }}>
            <div className="hero-play-btn" style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 40px var(--accent-glow)',
              transition: 'var(--transition)'
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 60px var(--accent-glow)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 40px var(--accent-glow)'; }}
            >
              <Play size={28} fill="white" style={{ marginLeft: '3px' }} />
            </div>
          </div>
          {/* Bottom gradient */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
            background: 'linear-gradient(transparent, rgba(9,9,11,0.8))',
            zIndex: 1
          }} />
        </div>

        {/* Stat Badges */}
        <div className="hero-stats" style={{
          display: 'flex', gap: '48px', justifyContent: 'center', alignItems: 'center', marginTop: '10px'
        }}>
          {[
            { num: '50K+', label: 'Video' },
            { num: '5+', label: 'AI Model' },
            { num: '4', label: 'Platform' }
          ].map((stat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="gradient-text" style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {stat.num}
              </span>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {stat.label}
              </span>
              {i < 2 && <div style={{ width: '1px', height: '30px', background: 'var(--border)', marginLeft: '12px' }} />}
            </div>
          ))}
        </div>
      </section>

      {/* ========== DEMO VIDEO GALLERY ========== */}
      <section ref={galleryRef} style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1200px', margin: '0 auto', padding: '60px 40px 80px',
        scrollMarginTop: '80px'
      }}>
        {/* Section Header */}
        <div className="reveal-on-scroll" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
            AI Tarafından Üretilen <span className="gradient-text">Örnek Çalışmalar</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '8px' }}>
            Platformumuzun farklı üretim modları ve senaryolarından derlenmiş lansman galerisi.
          </p>
        </div>

        {/* Category Filter Buttons */}
        <div style={{
          display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '36px', flexWrap: 'wrap'
        }}>
          {categories.map(cat => {
            const Icon = categoryIcon[cat];
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 18px', borderRadius: '30px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer',
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: isActive ? 'var(--accent-glow)' : 'var(--bg-surface)',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'var(--transition)',
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-muted)'; }
                }}
              >
                <Icon size={14} />
                {cat}
              </button>
            );
          })}
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px'
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass" style={{
                borderRadius: '12px', overflow: 'hidden'
              }}>
                <div className="pulse" style={{ height: '160px', background: 'var(--bg-surface)' }} />
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="pulse" style={{ height: '14px', width: '70%', background: 'var(--bg-surface)', borderRadius: '4px' }} />
                  <div className="pulse" style={{ height: '10px', width: '50%', background: 'var(--bg-surface)', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px'
          }}>
            {showPlaceholders
              ? placeholderItems.map((cat) => {
                  const Icon = categoryIcon[cat];
                  return (
                    <div
                      key={cat}
                      className="glass gallery-card"
                      style={{
                        borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                        transition: 'var(--transition)',
                        border: '1px solid var(--border)',
                        height: '100%'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(99,102,241,0.15)';
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      <div style={{
                        height: '160px',
                        background: categoryGradients[cat],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', borderBottom: '1px solid var(--border)'
                      }}>
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(0,0,0,0.2)'
                        }}>
                          <div style={{
                            width: '64px', height: '64px', borderRadius: '16px',
                            background: 'rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Icon size={28} style={{ color: 'rgba(255,255,255,0.7)' }} />
                          </div>
                        </div>
                        <span style={{
                          position: 'absolute', top: '12px', right: '12px',
                          fontSize: '10px', background: 'var(--bg-surface)',
                          color: 'var(--text-muted)',
                          padding: '3px 10px', borderRadius: '20px', fontWeight: 600
                        }}>
                          {cat}
                        </span>
                      </div>
                      <div style={{ padding: '16px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {cat} Kategorisi
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: '1.4' }}>
                          AI tarafından üretilmiş örnek {cat.toLowerCase()} videosu
                        </p>
                      </div>
                    </div>
                  );
                })
              : filteredVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="glass gallery-card"
                    style={{
                      borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                      transition: 'var(--transition)',
                      border: '1px solid var(--border)',
                      height: '100%'
                    }}
                    onMouseEnter={(e) => {
                      setHoveredCard(video.id);
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 30px rgba(99,102,241,0.15)';
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      setHoveredCard(null);
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    {/* Video Thumbnail */}
                    <div style={{
                      height: '160px',
                      background: 'linear-gradient(220deg, #131b2e, #090c15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', borderBottom: '1px solid var(--border)'
                    }}>
                      {hoveredCard === video.id && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(0,0,0,0.5)',
                          transition: 'var(--transition)'
                        }}>
                          <div style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent), #4f46e5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px var(--accent-glow)'
                          }}>
                            <Play size={20} fill="white" style={{ marginLeft: '2px' }} />
                          </div>
                        </div>
                      )}
                      <span style={{
                        position: 'absolute', top: '12px', right: '12px',
                        fontSize: '10px', background: 'rgba(99,102,241,0.15)',
                        color: 'var(--accent)',
                        padding: '3px 10px', borderRadius: '20px', fontWeight: 600, textTransform: 'uppercase'
                      }}>
                        {video.production_template || 'GENEL'}
                      </span>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <h4 style={{
                        fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {video.master_prompt}
                      </h4>
                      <p style={{
                        fontSize: '12px', color: 'var(--text-muted)', margin: 0,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden', lineHeight: '1.4'
                      }}>
                        {video.production_notes}
                      </p>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)'
                      }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          #{video.id} &middot; {video.total_scenes} Sahne
                        </span>
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          fontSize: '12px', color: 'var(--accent)', fontWeight: 600
                        }}>
                          Detay <ArrowUpRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
              ))}
            {!loading && !showPlaceholders && filteredVideos.length === 0 && (
              <div style={{
                gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0',
                color: 'var(--text-muted)', fontSize: '14px'
              }}>
                Bu kategoride henüz video bulunmuyor.
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========== FEATURES BENTO ========== */}
      <section style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1200px', margin: '0 auto', padding: '60px 40px 80px'
      }}>
        <div className="reveal-on-scroll" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0 }}>
            Güçlü <span className="gradient-text">Özellikler</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '8px' }}>
            AI destekli video üretim platformunun tüm yetenekleri
          </p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1fr',
          gridTemplateRows: '1fr 1fr', gap: '20px',
          minHeight: '320px'
        }}>
          {/* Large Left Card */}
          <div className="glass bento-card" style={{
            gridRow: '1 / 3',
            borderRadius: '16px', padding: '40px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            gap: '20px', border: '1px solid var(--border)',
            transition: 'var(--transition)',
            position: 'relative', overflow: 'hidden'
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              position: 'absolute', top: '-50px', right: '-50px',
              width: '200px', height: '200px',
              background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Film size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>AI Video Üretimi</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', marginTop: '12px', maxWidth: '440px' }}>
                CogVideoX ve HunyuanVideo ile metinden veya görselden 4K video üretin. Image-to-Video zincirleme yapısıyla sahneler arası tutarlılık sağlayın.
              </p>
            </div>
          </div>

          {/* Top Right Card */}
          <div className="glass bento-card" style={{
            gridRow: '1 / 2',
            borderRadius: '16px', padding: '32px',
            display: 'flex', flexDirection: 'column', gap: '16px',
            border: '1px solid var(--border)', transition: 'var(--transition)',
            overflow: 'hidden', position: 'relative'
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(167,139,250,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'rgba(167,139,250,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--secondary)'
            }}>
              <Music size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Ses &amp; Lip-Sync</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '8px' }}>
                XTTS-v2 çok dilli ses sentezi ve Wav2Lip dudak senkronizasyonu ile gerçekçi karakter seslendirmesi.
              </p>
            </div>
          </div>

          {/* Bottom Right Card */}
          <div className="glass bento-card" style={{
            gridRow: '2 / 3',
            borderRadius: '16px', padding: '32px',
            display: 'flex', flexDirection: 'column', gap: '16px',
            border: '1px solid var(--border)', transition: 'var(--transition)',
            overflow: 'hidden', position: 'relative'
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(34,197,94,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'rgba(34,197,94,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--success)'
            }}>
              <Share2 size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Otomatik Yayınla</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '8px' }}>
                Playwright botları ile YouTube, TikTok, X ve Meta Reels hesaplarında tek tıkla yayın.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== AI MODELS CAROUSEL ========== */}
      <section style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1200px', margin: '0 auto', padding: '40px 40px 60px',
        overflow: 'hidden'
      }}>
        <div className="marquee-container" style={{ overflow: 'hidden', width: '100%', position: 'relative' }}>
          <div className="marquee-track" style={{
            display: 'flex', gap: '12px', width: 'fit-content',
            animation: 'marquee 30s linear infinite'
          }}>
            {[...aiModels, ...aiModels].map((model, i) => (
              <span
                key={i}
                className="glass"
                style={{
                  padding: '10px 24px', borderRadius: '30px',
                  whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 600,
                  border: '1px solid var(--border)', color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.3px',
                  display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
              >
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)'
                }} />
                {model}
              </span>
            ))}
          </div>
          {/* Fade edges */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '60px',
            background: 'linear-gradient(90deg, var(--bg-primary), transparent)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px',
            background: 'linear-gradient(270deg, var(--bg-primary), transparent)',
            pointerEvents: 'none'
          }} />
        </div>
      </section>

      {/* ========== STATS SECTION ========== */}
      <section className="reveal-on-scroll" style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1200px', margin: '0 auto', padding: '60px 40px'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '80px', alignItems: 'center'
        }}>
          {[
            { num: '50.000+', label: 'Video Üretildi' },
            { num: '25.000+', label: 'Kullanıcı' },
            { num: '4', label: 'Sosyal Medya Platformu' }
          ].map((stat, i) => (
            <div key={i} className="stat-item" style={{ textAlign: 'center' }}>
              <div className="gradient-text stat-number" style={{
                fontSize: '42px', fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1
              }}>
                {stat.num}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px', fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="reveal-on-scroll" style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1200px', margin: '0 auto', padding: '40px 40px 80px'
      }}>
        <div className="glass cta-section" style={{
          borderRadius: '20px', padding: '60px 40px', textAlign: 'center',
          border: '1px solid rgba(99,102,241,0.15)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(167,139,250,0.03))',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: '-100px', right: '-100px',
            width: '400px', height: '400px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <h2 style={{ fontSize: '36px', fontWeight: 800, margin: 0 }}>
            Hemen <span className="gradient-text">Ücretsiz Başlayın</span>
          </h2>
          <p style={{
            color: 'var(--text-muted)', fontSize: '15px', marginTop: '12px',
            maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto'
          }}>
            Kredi kartı gerekmez. Colab GPU'su ile hemen video üretmeye başlayın.
          </p>
          <button
            onClick={() => setIsLoginOpen(true)}
            className="btn btn-primary"
            style={{
              marginTop: '24px', padding: '16px 36px', fontSize: '15px',
              fontWeight: 'bold', borderRadius: '12px',
              display: 'inline-flex', alignItems: 'center', gap: '10px'
            }}
          >
            {t('heroCTA') || 'Başla'} <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="reveal-on-scroll" style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid var(--border)',
        padding: '48px 40px 32px',
        background: 'rgba(9,9,11,0.5)'
      }}>
        <div className="footer-content" style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Film size={14} style={{ color: 'white' }} />
              </div>
              <span className="gradient-text" style={{ fontWeight: 800, fontSize: '16px' }}>AI-PUBLISHER</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              &copy; 2026 T&uuml;m Haklar&#305; Sakl&#305;d&#305;r.
            </div>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '60px' }}>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'FAQ', 'Changelog'] },
              { title: 'Resources', links: ['Dokümantasyon', 'API Referans', 'Blog', 'Topluluk'] },
              { title: 'Company', links: ['Hakkımızda', 'İletişim', 'Gizlilik', 'Kullanım Şartları'] }
            ].map((group) => (
              <div key={group.title}>
                <div style={{
                  fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)',
                  marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {group.title}
                </div>
                {group.links.map((link) => (
                  <div key={link} className="footer-link" style={{
                    fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px',
                    cursor: 'pointer', transition: 'var(--transition)'
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    {link}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </footer>

      {/* ========== VIDEO PLAYER MODAL ========== */}
      {selectedVideo && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(3, 5, 10, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass modal-content" style={{
            width: '90%', maxWidth: '960px', maxHeight: '90%', borderRadius: '16px',
            border: '1px solid var(--border-hover)', overflow: 'hidden', display: 'flex',
            flexDirection: 'column', background: '#0a0d16', boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            {/* Modal Header */}
            <div style={{
              height: '50px', padding: '0 20px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', borderBottom: '1px solid var(--border)'
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--accent)' }}>Video Detay</span>
              <button
                onClick={() => setSelectedVideo(null)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', overflowY: 'auto' }}>
              {/* Left - Video Player */}
              <div style={{
                background: '#04060b', display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '20px', borderRight: '1px solid var(--border)',
                minHeight: '350px'
              }}>
                <video
                  src={`/videolar/${selectedVideo.final_filename}`}
                  controls autoPlay
                  style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid var(--border)' }}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <a href={`/videolar/${selectedVideo.final_filename}`} download className="btn btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }}>
                    <Download size={12} /> Yatay İndir
                  </a>
                  <a href={`/videolar/shorts_${selectedVideo.final_filename.replace(/^demo_video_/, '')}`} download className="btn btn-primary" style={{ fontSize: '11px', padding: '6px 12px' }}>
                    <Download size={12} /> Dikey İndir
                  </a>
                </div>
              </div>

              {/* Right - Meta Details */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{selectedVideo.master_prompt}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <span style={{
                      fontSize: '10px', background: 'var(--accent-glow)', color: 'var(--accent)',
                      padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold'
                    }}>
                      Şablon: {selectedVideo.production_template.toUpperCase()}
                    </span>
                    <span style={{
                      fontSize: '10px', background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px'
                    }}>
                      Completed
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Yapay Zeka Promptu (Temsili)</span>
                  <div style={{
                    background: '#070a14', border: '1px solid var(--border)',
                    borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#e5e7eb', lineHeight: '18px'
                  }}>
                    {selectedVideo.character_features || 'Avatar prompt template.'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Yapay Zeka Seslendirme Metni (TTS)</span>
                  <div style={{
                    background: '#070a14', border: '1px solid var(--border)',
                    borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#e5e7eb', lineHeight: '18px'
                  }}>
                    {selectedVideo.production_notes}
                  </div>
                </div>

                {selectedVideo.yt_title && (
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    borderTop: '1px solid var(--border)', paddingTop: '15px'
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold' }}>
                      Otomatik Sosyal Medya Kopyaları
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Başlık (YouTube Shorts):</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{selectedVideo.yt_title}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Açıklama & Etiketler:</span>
                      <span style={{
                        fontSize: '11px', color: 'var(--text-muted)', background: '#070a14',
                        padding: '8px', borderRadius: '4px', whiteSpace: 'pre-line'
                      }}>
                        {selectedVideo.yt_desc}
                        {selectedVideo.yt_tags && `\n\n${selectedVideo.yt_tags}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== LOGIN MODAL ========== */}
      {isLoginOpen && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(3, 5, 10, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <form onSubmit={handleLoginSubmit} className="glass login-form" style={{
            padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px',
            display: 'flex', flexDirection: 'column', gap: '20px',
            border: '1px solid var(--border-hover)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', background: '#0a0d16', position: 'relative'
          }}>
            <button
              type="button"
              onClick={() => setIsLoginOpen(false)}
              style={{
                position: 'absolute', top: '15px', right: '15px',
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.15))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <Film size={28} style={{ color: 'var(--accent)' }} />
              </div>
              <h2 className="gradient-text" style={{ fontWeight: 800, fontSize: '22px', letterSpacing: '0.5px' }}>AI-PUBLISHER</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Otonom Video Pazarlama Portalı</p>
            </div>

            {authError && (
              <div style={{
                color: 'var(--danger)', fontSize: '12px', textAlign: 'center',
                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '8px', borderRadius: '6px'
              }}>
                {authError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Kullanıcı Adı</label>
              <input
                type="text" required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  background: '#070a14', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'white', padding: '12px',
                  outline: 'none', fontSize: '14px', transition: 'var(--transition)'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Şifre</label>
              <input
                type="password" required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  background: '#070a14', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'white', padding: '12px',
                  outline: 'none', fontSize: '14px', transition: 'var(--transition)'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="btn btn-primary"
              style={{ padding: '12px', width: '100%', fontWeight: 'bold', fontSize: '14px', borderRadius: '8px', marginTop: '10px' }}
            >
              {loginLoading ? <Loader size={14} className="pulse" /> : 'Giriş Yap'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
