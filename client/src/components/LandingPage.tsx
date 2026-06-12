import React, { useState, useEffect } from 'react';
import { 
  Film, Sparkles, Send, Moon, Sun, Play, X, 
  Globe, FileVideo, MessageSquare, CheckSquare, 
  ArrowRight, Share2, Loader, Download, ArrowUpRight, CheckCircle2, Shield
} from 'lucide-react';

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

export function LandingPage({ 
  onLogin, 
  authError, 
  setAuthError, 
  language, 
  setLanguage, 
  t 
}: LandingPageProps) {
  const [demoVideos, setDemoVideos] = useState<DemoVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [selectedVideo, setSelectedVideo] = useState<DemoVideo | null>(null);
  
  // Login form state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchDemoVideos();
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

  return (
    <div style={{ 
      background: 'radial-gradient(ellipse at top, #111827, #070a14)', 
      color: '#ffffff', 
      minHeight: '100vh', 
      fontFamily: 'var(--font-sans)', 
      overflowY: 'auto',
      position: 'relative'
    }}>
      
      {/* GLOW DECORATIONS */}
      <div style={{
        position: 'absolute', top: 0, left: '25%', width: '400px', height: '400px',
        background: 'rgba(0, 242, 254, 0.1)', filter: 'blur(150px)', borderRadius: '50%', pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute', top: '40%', right: '15%', width: '500px', height: '500px',
        background: 'rgba(155, 81, 224, 0.08)', filter: 'blur(180px)', borderRadius: '50%', pointerEvents: 'none'
      }}></div>

      {/* HEADER / NAVBAR */}
      <header style={{
        height: '70px', padding: '0 40px', display: 'flex', justifyContent: 'space-between', 
        alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)', sticky: 'top', zIndex: 10, background: 'rgba(7, 10, 20, 0.7)'
      } as any}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Film size={26} style={{ color: 'var(--primary)' }} />
          <span className="gradient-text" style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '1px' }}>AI-PUBLISHER</span>
          <span style={{ fontSize: '10px', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>Lansman</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Dil Değiştirici */}
          <button 
            onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px' }}
          >
            <Globe size={14} style={{ marginRight: '4px' }} />
            {language.toUpperCase()}
          </button>

          {/* Giriş Yap / Panel Aç */}
          <button 
            onClick={() => {
              setAuthError('');
              setIsLoginOpen(true);
            }} 
            className="btn btn-primary"
            style={{ fontWeight: 'bold', fontSize: '13px', borderRadius: '8px', padding: '8px 20px' }}
          >
            {t('login') || 'Giriş Yap'}
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={{
        padding: '100px 40px 80px 40px', textAlign: 'center', maxWidth: '900px', margin: '0 auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px', 
          background: 'rgba(0, 242, 254, 0.06)', border: '1px solid rgba(0, 242, 254, 0.2)',
          padding: '6px 16px', borderRadius: '30px', fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold'
        }}>
          <Sparkles size={12} className="pulse" />
          <span>{t('heroBadge') || 'Otonom Video Üretiminin Geleceği'}</span>
        </div>

        <h1 style={{
          fontSize: '52px', fontWeight: 800, lineHeight: '62px', letterSpacing: '-1px',
          background: 'linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0
        }}>
          Sosyal Medya Videolarınızı <span className="gradient-text">Otonom</span> Üretin ve Yayınlayın
        </h1>

        <p style={{
          fontSize: '18px', color: 'var(--text-muted)', lineHeight: '28px', maxWidth: '700px', margin: 0
        }}>
          Yapay zeka modellerini kullanarak metinlerinizden sahneler arası devamlılığı olan, seslendirilmiş, sarı altyazılı dikey/yatay videolar sentezleyin. Playwright botlarıyla YouTube, TikTok, X ve Meta Reels üzerinde tek tıkla yayınlayın.
        </p>

        <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
          <button 
            onClick={() => setIsLoginOpen(true)}
            className="btn btn-primary"
            style={{ padding: '14px 32px', fontSize: '15px', fontWeight: 'bold', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            {t('heroCTA') || 'Hemen Başla'} <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section style={{
        maxWidth: '1200px', margin: '0 auto', padding: '0 40px 80px 40px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px'
      }}>
        {/* Feature 1 */}
        <div className="glass" style={{
          padding: '30px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex', flexDirection: 'column', gap: '15px', transition: 'var(--transition)'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
          }}>
            <Film size={24} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Devamlı Sahne Üretimi</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '20px' }}>
            Image-to-Video zincirleme yapısıyla önceki sahnenin son karesinden beslenerek akıllı ve tutarlı sahne geçişleri üretir.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="glass" style={{
          padding: '30px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex', flexDirection: 'column', gap: '15px', transition: 'var(--transition)'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(155, 81, 224, 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)'
          }}>
            <MessageSquare size={24} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Dinamik Lipsync & TTS</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '20px' }}>
            Ses genliğine göre dudak-çene esnetme filtresi ve XTTS / OpenAI / Edge-TTS seslendirmeleriyle senkronize dublaj.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="glass" style={{
          padding: '30px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex', flexDirection: 'column', gap: '15px', transition: 'var(--transition)'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)'
          }}>
            <Share2 size={24} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Otonom Yayınlama Botu</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '20px' }}>
            Çerez güvenli Playwright otomasyonu ile YouTube Shorts, TikTok ve X hesaplarınızda videoları başlığıyla otomatik paylaşır.
          </p>
        </div>
      </section>

      {/* DEMO VIDEOS VITRINE GRID */}
      <section style={{
        maxWidth: '1200px', margin: '0 auto', padding: '0 40px 100px 40px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
          <div>
            <h2 style={{ fontSize: '30px', fontWeight: 800, margin: 0 }}>
              AI Tarafından Üretilen <span className="gradient-text">Örnek Çalışmalar</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '6px' }}>
              Platformumuzun farklı üretim modları ve senaryolarından derlenmiş lansman galerisi.
            </p>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: '8px', background: 'var(--bg-surface)' }}>
            Toplam: <strong>{demoVideos.length} Video</strong>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: '15px' }}>
            <Loader size={32} className="pulse" style={{ color: 'var(--primary)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Demo galerisi yükleniyor...</span>
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px'
          }}>
            {demoVideos.map((video) => (
              <div 
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className="glass"
                style={{
                  borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)',
                  overflow: 'hidden', cursor: 'pointer', transition: 'var(--transition)',
                  display: 'flex', flexDirection: 'column', height: '100%',
                  background: 'rgba(19, 26, 44, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 242, 254, 0.15)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                {/* VIDEO PLACEHOLDER THUMBNAIL */}
                <div style={{
                  height: '150px', background: 'linear-gradient(220deg, #131b2e 0%, #090c15 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                  borderBottom: '1px solid rgba(255,255,255,0.03)'
                }}>
                  <Play size={32} style={{ color: 'var(--primary)', filter: 'drop-shadow(0 0 10px rgba(0,242,254,0.6))' }} />
                  <span style={{
                    position: 'absolute', top: '10px', right: '10px', fontSize: '9px',
                    background: 'rgba(155, 81, 224, 0.15)', color: 'var(--secondary)',
                    padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase'
                  }}>
                    {video.production_template}
                  </span>
                </div>

                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#ffffff', lineClamp: '2', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
                    {video.master_prompt}
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineClamp: '3', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '16px' } as any}>
                    {video.production_notes}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Proje #{video.id}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>
                      Detayları Gör <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.05)', padding: '40px', textAlign: 'center',
        color: 'var(--text-muted)', fontSize: '13px', background: 'rgba(7, 10, 20, 0.8)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={14} /> Güvenli Çerez Altyapısı</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} /> Otomatik Montaj & Altyazı</span>
        </div>
        <div>© 2026 AI-PUBLISHER. Tüm Hakları Saklıdır.</div>
      </footer>

      {/* VIDEO PLAYER MODAL */}
      {selectedVideo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(3, 5, 10, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass" style={{
            width: '90%', maxWidth: '960px', maxHeight: '90%', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex',
            flexDirection: 'column', background: '#0a0d16', boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            {/* Modal Header */}
            <div style={{
              height: '50px', padding: '0 20px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--primary)' }}>Video Detay ve Simülasyonu</span>
              <button 
                onClick={() => setSelectedVideo(null)} 
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', overflowY: 'auto' }}>
              {/* Left Side - Video Player */}
              <div style={{
                background: '#04060b', display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '20px', borderRight: '1px solid rgba(255,255,255,0.05)',
                minHeight: '350px'
              }}>
                <video 
                  src={`/videolar/${selectedVideo.final_filename}`} 
                  controls 
                  autoPlay
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

              {/* Right Side - Meta Details */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{selectedVideo.master_prompt}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <span style={{ fontSize: '10px', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      Şablon: {selectedVideo.production_template.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px' }}>
                      Completed
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Yapay Zeka Promptu (Temsili)</span>
                  <div style={{ background: '#070a14', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#e5e7eb', lineHeight: '18px' }}>
                    {selectedVideo.character_features || 'Avatar prompt template.'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Yapay Zeka Seslendirme Metni (TTS)</span>
                  <div style={{ background: '#070a14', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#e5e7eb', lineHeight: '18px' }}>
                    {selectedVideo.production_notes}
                  </div>
                </div>

                {selectedVideo.yt_title && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>Otomatik Sosyal Medya Kopyaları</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Başlık (YouTube Shorts):</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{selectedVideo.yt_title}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Açıklama & Etiketler:</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: '#070a14', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-line' }}>
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

      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(3, 5, 10, 0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <form onSubmit={handleLoginSubmit} className="glass" style={{
            padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px',
            display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid rgba(255,255,255,0.08)',
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
              <Film size={44} className="gradient-text" style={{ color: 'var(--primary)', marginBottom: '10px' }} />
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
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  background: '#070a14', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'white', padding: '12px',
                  outline: 'none', fontSize: '14px', transition: 'var(--transition)'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Şifre</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  background: '#070a14', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'white', padding: '12px',
                  outline: 'none', fontSize: '14px', transition: 'var(--transition)'
                }}
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
