import { useState } from 'react';
import {
  Sparkles,
  Video,
  HelpCircle,
  Palette,
  Copy,
  Check,
  Wand2,
  RefreshCw,
  Layers,
} from 'lucide-react';

interface AiAssistantPanelProps {
  language: string;
  t: (key: string) => string;
}

export function AiAssistantPanel({ language: _language, t: _t }: AiAssistantPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'tutorial' | 'landing' | 'theme' | 'color'>(
    'tutorial',
  );
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // States for Tutorial
  const [tutorialFeature, setTutorialFeature] = useState('Chat-to-Edit');
  const [tutorialResult, setTutorialResult] = useState<any>(null);

  // States for Landing Assets
  const [landingNiche, setLandingNiche] = useState('Yapay Zeka Video Üretimi');
  const [landingResult, setLandingResult] = useState<any>(null);

  // States for Custom Theme
  const [themeStyle, setThemeStyle] = useState('Neon Cyberpunk Dark');
  const [themeResult, setThemeResult] = useState<any>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateTutorial = async () => {
    if (!tutorialFeature.trim()) return;
    setLoading(true);
    setTutorialResult(null);
    try {
      const res = await fetch('/api/v1/ai-helper/tutorial-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureName: tutorialFeature }),
      });
      const data = await res.json();
      if (data.success) {
        setTutorialResult(data.data);
      } else {
        alert('Eğitim promptları üretilemedi: ' + data.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLandingAssets = async () => {
    if (!landingNiche.trim()) return;
    setLoading(true);
    setLandingResult(null);
    try {
      const res = await fetch('/api/v1/ai-helper/landing-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: landingNiche }),
      });
      const data = await res.json();
      if (data.success) {
        setLandingResult(data.data);
      } else {
        alert('Vitrin promptları üretilemedi: ' + data.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTheme = async () => {
    if (!themeStyle.trim()) return;
    setLoading(true);
    setThemeResult(null);
    try {
      const res = await fetch('/api/v1/ai-helper/custom-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleDescription: themeStyle }),
      });
      const data = await res.json();
      if (data.success) {
        setThemeResult(data.data);
      } else {
        alert('Tema renk paleti üretilemedi: ' + data.error);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTheme = () => {
    if (!themeResult || !themeResult.colors) return;
    const colors = themeResult.colors;

    // Uygula
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(
        `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`,
        value as string,
      );
    });

    // Bazı fallback / custom isimlendirmeler
    document.documentElement.style.setProperty('--cyan', colors.primary);
    document.documentElement.style.setProperty('--cyan-foreground', colors.primaryForeground);

    // Arka plan rengine göre soft cam rengi
    const bgParts = colors.background.split(' ');
    if (bgParts.length >= 3) {
      document.documentElement.style.setProperty(
        '--surface-glass',
        `hsla(${bgParts[0]}, ${bgParts[1]}, 8%, 0.6)`,
      );
    }

    alert(`"${themeResult.themeName}" teması başarıyla uygulandı!`);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        color: 'white',
      }}
    >
      {/* Sub Tabs Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(24, 24, 27, 0.2)',
          gap: '12px',
        }}
      >
        <button
          onClick={() => setActiveSubTab('tutorial')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeSubTab === 'tutorial' ? 'var(--accent-light)' : 'transparent',
            color: activeSubTab === 'tutorial' ? 'var(--accent)' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          <HelpCircle size={16} />
          Eğitim Planlayıcı
        </button>
        <button
          onClick={() => setActiveSubTab('landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeSubTab === 'landing' ? 'var(--accent-light)' : 'transparent',
            color: activeSubTab === 'landing' ? 'var(--accent)' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          <Video size={16} />
          Vitrin & Landing Varlıkları
        </button>
        <button
          onClick={() => setActiveSubTab('theme')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeSubTab === 'theme' ? 'var(--accent-light)' : 'transparent',
            color: activeSubTab === 'theme' ? 'var(--accent)' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          <Palette size={16} />
          Tema Sihirbazı
        </button>
        <button
          onClick={() => setActiveSubTab('color')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeSubTab === 'color' ? 'var(--accent-light)' : 'transparent',
            color: activeSubTab === 'color' ? 'var(--accent)' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
        >
          <Sparkles size={16} />
          Renk Onizleme
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {activeSubTab === 'tutorial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Öğretici Video Planlayıcı</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Platformdaki herhangi bir özelliğin nasıl kullanılacağını gösteren, viral dikey
                formatta Shorts / TikTok senaryo ve görsel prompt planını oluşturun.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Örn: Chat-to-Edit, Fırsatlar Hunisi, Remotion Video..."
                value={tutorialFeature}
                onChange={(e) => setTutorialFeature(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleGenerateTutorial}
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '10px 20px', gap: '8px' }}
              >
                {loading ? <RefreshCw className="spin" size={16} /> : <Wand2 size={16} />}
                Plan Oluştur
              </button>
            </div>

            {tutorialResult && (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '10px' }}
              >
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>
                    Eğitim Başlığı: {tutorialResult.tutorialTitle}
                  </h4>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    position: 'relative',
                  }}
                >
                  {/* Timeline bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '20px',
                      top: '20px',
                      bottom: '20px',
                      width: '2px',
                      background: 'var(--border)',
                      zIndex: 0,
                    }}
                  />

                  {tutorialResult.scenes.map((scene: any) => (
                    <div
                      key={scene.sceneNumber}
                      style={{
                        display: 'flex',
                        gap: '20px',
                        zIndex: 1,
                        position: 'relative',
                      }}
                    >
                      {/* Badge Number */}
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          color: 'var(--bg-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          boxShadow: '0 0 12px var(--accent-glow)',
                          flexShrink: 0,
                        }}
                      >
                        {scene.sceneNumber}
                      </div>

                      {/* Scene Info Card */}
                      <div
                        className="glass"
                        style={{
                          flex: 1,
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: 'var(--accent)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            EKRAN AKSİYONU: {scene.screenAction}
                          </span>
                          {scene.sfxPrompt && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              SFX: {scene.sfxPrompt}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: 'var(--text-muted)',
                              }}
                            >
                              GÖRSEL PROMPT
                            </span>
                            <button
                              onClick={() =>
                                handleCopy(scene.videoPrompt, `v-${scene.sceneNumber}`)
                              }
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              {copiedId === `v-${scene.sceneNumber}` ? (
                                <Check size={14} style={{ color: 'var(--success)' }} />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>
                          <p
                            style={{
                              fontSize: '13px',
                              margin: 0,
                              color: 'white',
                              lineHeight: '20px',
                              background: 'rgba(0,0,0,0.2)',
                              padding: '10px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255,255,255,0.02)',
                            }}
                          >
                            {scene.videoPrompt}
                          </p>
                        </div>

                        {scene.speechText && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                SESLENDİRME METNİ
                              </span>
                              <button
                                onClick={() =>
                                  handleCopy(scene.speechText, `s-${scene.sceneNumber}`)
                                }
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                }}
                              >
                                {copiedId === `s-${scene.sceneNumber}` ? (
                                  <Check size={14} style={{ color: 'var(--success)' }} />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                            <p
                              style={{
                                fontSize: '13px',
                                margin: 0,
                                color: 'var(--text-muted)',
                                lineHeight: '20px',
                                fontStyle: 'italic',
                              }}
                            >
                              "{scene.speechText}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'landing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '850px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                Açılış Sayfası Varlık Tasarımcısı
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Landing page galerisi veya vitrin için konsept / niş bazlı video ve kapak görseli
                üretim promptlarını tasarlayın.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Örn: fitness, siber güvenlik, lüks seyahat, aşçılık..."
                value={landingNiche}
                onChange={(e) => setLandingNiche(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleGenerateLandingAssets}
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '10px 20px', gap: '8px' }}
              >
                {loading ? <RefreshCw className="spin" size={16} /> : <Wand2 size={16} />}
                Varlıkları Üret
              </button>
            </div>

            {landingResult && (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginTop: '10px' }}
              >
                {/* Hero Section Asset */}
                <div
                  className="glass"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.05))',
                    border: '1px solid var(--accent)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} style={{ color: 'var(--accent)' }} />
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Açılış Sayfası Hero Tanıtım Videosu
                    </span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>
                      {landingResult.heroVideo.title}
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                      {landingResult.heroVideo.description}
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '12px',
                      borderRadius: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}
                      >
                        HERO VIDEO PROMPT
                      </span>
                      <button
                        onClick={() => handleCopy(landingResult.heroVideo.prompt, 'hero-p')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedId === 'hero-p' ? (
                          <Check size={14} style={{ color: 'var(--success)' }} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                    <p style={{ fontSize: '13px', margin: 0, lineHeight: '20px', color: 'white' }}>
                      {landingResult.heroVideo.prompt}
                    </p>
                  </div>
                </div>

                {/* Showcase Showcase Videos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Galeri / Vitrin Üretim Şablonları
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {landingResult.showcaseVideos.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="glass"
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--accent-light)',
                              color: 'var(--accent)',
                              fontWeight: 'bold',
                            }}
                          >
                            {item.category.toUpperCase()}
                          </span>
                          <h5 style={{ fontSize: '14px', fontWeight: 700, margin: '8px 0 4px 0' }}>
                            {item.title}
                          </h5>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                            {item.description}
                          </p>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            background: 'rgba(0,0,0,0.15)',
                            padding: '10px',
                            borderRadius: '6px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '9px',
                                color: 'var(--text-muted)',
                                fontWeight: 'bold',
                              }}
                            >
                              VİDEO PROMPT
                            </span>
                            <button
                              onClick={() => handleCopy(item.videoPrompt, `sc-v-${idx}`)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              {copiedId === `sc-v-${idx}` ? (
                                <Check size={12} style={{ color: 'var(--success)' }} />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                          <p
                            style={{
                              fontSize: '12px',
                              margin: 0,
                              color: 'white',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {item.videoPrompt}
                          </p>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            background: 'rgba(0,0,0,0.15)',
                            padding: '10px',
                            borderRadius: '6px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '9px',
                                color: 'var(--text-muted)',
                                fontWeight: 'bold',
                              }}
                            >
                              KAPAK GÖRSELİ PROMPT
                            </span>
                            <button
                              onClick={() => handleCopy(item.coverPrompt, `sc-c-${idx}`)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              {copiedId === `sc-c-${idx}` ? (
                                <Check size={12} style={{ color: 'var(--success)' }} />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                          <p
                            style={{
                              fontSize: '12px',
                              margin: 0,
                              color: 'white',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {item.coverPrompt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Özel Renk Teması Sihirbazı</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Yapay zekadan istediğiniz atmosferi tanımlayarak yepyeni bir arayüz stili üretmesini
                isteyin. Üretilen renk paletini tek tıkla canlı olarak uygulayın!
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Örn: Midnight Ocean Blue, Sakura Pink Blossom, Cyberpunk Poison Yellow..."
                value={themeStyle}
                onChange={(e) => setThemeStyle(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleGenerateTheme}
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '10px 20px', gap: '8px' }}
              >
                {loading ? <RefreshCw className="spin" size={16} /> : <Wand2 size={16} />}
                Tema Üret
              </button>
            </div>

            {themeResult && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.2fr',
                  gap: '24px',
                  marginTop: '10px',
                }}
              >
                {/* Palette Colors Detail */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700 }}>
                    {themeResult.themeName} Renkleri
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {Object.entries(themeResult.colors).map(([name, val]: [string, any]) => (
                      <div
                        key={name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <span
                          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                        >
                          {name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                            {val}
                          </span>
                          <span
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '3px',
                              background: `hsl(${val})`,
                              border: '1px solid rgba(255,255,255,0.2)',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleApplyTheme}
                    className="btn btn-primary"
                    style={{
                      padding: '12px',
                      gap: '8px',
                      width: '100%',
                      fontSize: '13px',
                      fontWeight: 'bold',
                    }}
                  >
                    <Palette size={16} />
                    Temayı Arayüze Uygula
                  </button>
                </div>

                {/* Real-time Interactive Preview Container */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Canlı Önizleme Kutusu</h4>
                  <div
                    style={{
                      background: `hsl(${themeResult.colors.background})`,
                      color: `hsl(${themeResult.colors.foreground})`,
                      border: `1px solid hsl(${themeResult.colors.border})`,
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      height: '280px',
                      justifyContent: 'space-between',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                      transition: 'all 0.3s',
                    }}
                  >
                    {/* Header preview */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: `1px solid hsl(${themeResult.colors.border})`,
                        paddingBottom: '8px',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                        {themeResult.themeName} Studio
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          color: `hsl(${themeResult.colors.mutedForeground})`,
                        }}
                      >
                        Kredi: 1,500
                      </span>
                    </div>

                    {/* Card preview */}
                    <div
                      style={{
                        background: `hsl(${themeResult.colors.card})`,
                        color: `hsl(${themeResult.colors.cardForeground})`,
                        border: `1px solid hsl(${themeResult.colors.border})`,
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: `hsl(${themeResult.colors.accent})`,
                        }}
                      >
                        VİDEO PROJESİ #21
                      </span>
                      <p
                        style={{
                          fontSize: '12px',
                          margin: 0,
                          color: `hsl(${themeResult.colors.foreground})`,
                        }}
                      >
                        AI video motoru için prompt ve tema asistanı devrede.
                      </p>
                    </div>

                    {/* Button preview */}
                    <button
                      style={{
                        background: `hsl(${themeResult.colors.primary})`,
                        color: `hsl(${themeResult.colors.primaryForeground})`,
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Sparkles size={12} />
                      Premium Aksiyon Butonu
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
