import { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Palette,
  Globe,
  Monitor,
  Mic,
  Save,
  Loader,
  Upload,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import type { Language } from '../types.js';
import { PhotoEditor } from './PhotoEditor.js';

type SettingsTab = 'appearance' | 'language' | 'account' | 'production' | 'characters';

interface Character {
  id: number;
  name: string;
  description: string;
  reference_image_base64?: string;
}

const THEMES = [
  {
    id: 'default',
    name: 'Standard',
    meta: 'STD',
    color: 'hsl(220 80% 50%)',
    bg: 'hsl(220 10% 96%)',
  },
  { id: 'nebula', name: 'Nebula', meta: 'NBL', color: 'hsl(263 90% 70%)', bg: 'hsl(250 34% 10%)' },
  { id: 'forest', name: 'Forest', meta: 'FOR', color: 'hsl(142 70% 45%)', bg: 'hsl(150 20% 8%)' },
  { id: 'corporate', name: 'Corporate', meta: 'COR', color: 'hsl(0 84% 50%)', bg: 'hsl(0 0% 8%)' },
  {
    id: 'midnight',
    name: 'Midnight',
    meta: 'MID',
    color: 'hsl(45 100% 50%)',
    bg: 'hsl(220 40% 6%)',
  },
  { id: 'sunset', name: 'Sunset', meta: 'SUN', color: 'hsl(12 90% 60%)', bg: 'hsl(10 40% 8%)' },
  { id: 'ocean', name: 'Ocean', meta: 'OCN', color: 'hsl(190 90% 60%)', bg: 'hsl(200 40% 7%)' },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    meta: 'CYB',
    color: 'hsl(320 100% 50%)',
    bg: 'hsl(290 50% 5%)',
  },
  { id: 'matrix', name: 'Matrix', meta: 'MTX', color: 'hsl(120 100% 50%)', bg: 'hsl(120 100% 2%)' },
];

const s = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    width: 800,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  },
  headerTitle: { fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: 200,
    borderRight: '1px solid var(--border)',
    padding: '12px 0',
    overflowY: 'auto' as const,
    flexShrink: 0,
  },
  content: { flex: 1, padding: 20, overflowY: 'auto' as const },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' },
  sectionDesc: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 },
  label: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: 13,
  },
  themeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' as const, gap: 8 },
  themeName: { fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' },
  themeMeta: { fontSize: 9, color: 'var(--text-muted)' },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  toggleLabel: { fontSize: 13, color: 'var(--text-primary)' },
  charCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    marginBottom: 8,
  },
  charAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'var(--accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  btnStatic: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  },
};

// Dynamic style helpers (can't be in the static s object due to function types)
const navItemStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  width: '100%',
  border: 'none',
  background: active ? 'var(--accent-light)' : 'transparent',
  color: active ? 'var(--accent)' : 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: 13,
  textAlign: 'left' as const,
  transition: 'all 0.2s',
  borderRight: active ? '2px solid var(--accent)' : '2px solid transparent',
});

const themeCardStyle = (active: boolean): React.CSSProperties => ({
  padding: 8,
  borderRadius: 8,
  cursor: 'pointer',
  textAlign: 'center' as const,
  border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  background: active ? 'var(--accent-light)' : 'transparent',
  transition: 'all 0.2s',
});

const toggleStyle = (on: boolean): React.CSSProperties => ({
  width: 40,
  height: 22,
  borderRadius: 11,
  border: 'none',
  cursor: 'pointer',
  background: on ? 'var(--accent)' : 'var(--border)',
  position: 'relative' as const,
  transition: 'all 0.2s',
  padding: 0,
});

const toggleKnobStyle = (on: boolean): React.CSSProperties => ({
  width: 18,
  height: 18,
  borderRadius: '50%',
  background: 'white',
  position: 'absolute' as const,
  top: 2,
  left: on ? 20 : 2,
  transition: 'all 0.2s',
});

const langCardStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  background: active ? 'var(--accent-light)' : 'var(--bg-surface)',
  marginBottom: 8,
});

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  theme: string;
  isDark: boolean;
  csrfToken: string;
  onSetTheme: (t: string) => void;
  onToggleDark: () => void;
  onToggleLanguage: () => void;
  t: (key: string, params?: Record<string, any>) => string;
}

export function SettingsModal({
  isOpen,
  onClose,
  language,
  theme,
  isDark,
  csrfToken,
  onSetTheme,
  onToggleDark,
  onToggleLanguage,
  t,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Production settings
  const [textGrid, setTextGrid] = useState('top-left');
  const [narratorTone, setNarratorTone] = useState('');
  const [ytApiKey, setYtApiKey] = useState('');
  const [applyLipsync, setApplyLipsync] = useState(true);
  const [applyEndScreen, setApplyEndScreen] = useState(true);
  const [brandLogo, setBrandLogo] = useState('');
  const [brandPrimaryColor, setBrandPrimaryColor] = useState('#00F2FE');
  const [brandSecondaryColor, setBrandSecondaryColor] = useState('#9B51E0');
  const [brandFontPath, setBrandFontPath] = useState('');
  const [personalVoice, setPersonalVoice] = useState('');

  // New character form
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [newCharAvatar, setNewCharAvatar] = useState('');
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarStyleSetting, setAvatarStyleSetting] = useState<'realistic' | 'animatic'>(
    'realistic',
  );
  const [editingAvatarUrl, setEditingAvatarUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const brandLogoInputRef = useRef<HTMLInputElement>(null);
  const charAvatarInputRef = useRef<HTMLInputElement>(null);

  const loadSettings = async () => {
    try {
      const r = await fetch('/settings');
      const d = await r.json();
      if (d.success && d.user) {
        setTextGrid(d.user.text_position_grid || 'top-left');
        setNarratorTone(d.user.default_preset_tone || '');
        setYtApiKey(d.user.youtube_api_key || '');
        setApplyLipsync(d.user.apply_lipsync === 1);
        setApplyEndScreen(d.user.apply_end_screen === 1);
        setBrandLogo(d.user.brand_logo_base64 || '');
        setBrandPrimaryColor(d.user.brand_primary_color || '#00F2FE');
        setBrandSecondaryColor(d.user.brand_secondary_color || '#9B51E0');
        setBrandFontPath(d.user.brand_font_path || '');
        setPersonalVoice(d.user.personal_voice_base64 || '');
      }
    } catch {}
  };

  const loadCharacters = async () => {
    try {
      const r = await fetch('/api/v1/characters');
      const d = await r.json();
      if (d.status === 'success') setCharacters(d.data || []);
    } catch {}
  };

  useEffect(() => {
    if (!isOpen) return;
    loadSettings();
    loadCharacters();
  }, [isOpen]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({
          text_position_grid: textGrid,
          default_preset_tone: narratorTone,
          youtube_api_key: ytApiKey,
          apply_lipsync: applyLipsync,
          apply_end_screen: applyEndScreen,
          brand_logo_base64: brandLogo,
          brand_primary_color: brandPrimaryColor,
          brand_secondary_color: brandSecondaryColor,
          brand_font_path: brandFontPath,
          personal_voice_base64: personalVoice,
          theme_mode: isDark ? 'dark' : 'light',
        }),
      });
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const createCharacter = async () => {
    if (!newCharName.trim()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', newCharName.trim());
      fd.append('description', newCharDesc.trim());
      if (newCharAvatar) {
        const blob = await fetch(newCharAvatar).then((r) => r.blob());
        fd.append('avatar', blob, 'avatar.png');
      }
      await fetch('/api/v1/characters', { method: 'POST', body: fd });
      setNewCharName('');
      setNewCharDesc('');
      setNewCharAvatar('');
      loadCharacters();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const generateAvatar = async () => {
    if (!newCharDesc.trim()) return;
    setGeneratingAvatar(true);
    try {
      const r = await fetch('/api/v1/characters/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCharName,
          description: newCharDesc,
          avatar_style: avatarStyleSetting,
        }),
      });
      const d = await r.json();
      if (d.status === 'success' && d.avatar_base64) setNewCharAvatar(d.avatar_base64);
    } catch {
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const handleAvatarSave = (newUrl: string) => {
    setNewCharAvatar(newUrl);
    setEditingAvatarUrl(null);
  };

  const deleteCharacter = async (id: number) => {
    try {
      await fetch(`/api/v1/characters/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken },
      });
      loadCharacters();
    } catch {}
  };

  const encodeFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'appearance',
      label: t('settingsAppearanceTab') || 'Görünüm',
      icon: <Palette size={16} />,
    },
    { id: 'language', label: t('settingsLanguageTab') || 'Dil', icon: <Globe size={16} /> },
    { id: 'account', label: t('settingsAccountTab') || 'Hesap', icon: <User size={16} /> },
    { id: 'production', label: t('production108') || 'Üretim', icon: <Monitor size={16} /> },
    { id: 'characters', label: 'Karakterler', icon: <Mic size={16} /> },
  ];

  return (
    <div
      style={s.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={s.modal}>
        <div style={s.header}>
          <div style={s.headerTitle}>
            <Sparkles size={18} /> {t('settingsTitle') || 'Ayarlar'}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={s.body}>
          <div style={s.sidebar}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                style={navItemStyle(activeTab === tab.id)}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
          <div style={s.content}>
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>{t('colorTheme') || 'Renk Teması'}</div>
                  <div style={s.sectionDesc}>
                    {t('pickapremiumcol109') || 'Premium bir tema seçin'}
                  </div>
                  <div style={s.themeGrid}>
                    {THEMES.map((th) => (
                      <div
                        key={th.id}
                        style={themeCardStyle(theme === th.id)}
                        onClick={() => {
                          onSetTheme(th.id);
                          fetch('/save-settings', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-csrf-token': csrfToken,
                            },
                            body: JSON.stringify({ selected_theme: th.id }),
                          }).catch(() => {});
                        }}
                      >
                        <div
                          style={{
                            height: 40,
                            borderRadius: 4,
                            background: th.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 6,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: th.color,
                              boxShadow: `0 0 8px ${th.color}`,
                            }}
                          />
                        </div>
                        <div style={s.themeName}>{th.name}</div>
                        <div style={s.themeMeta}>{th.meta}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>{t('lightDarkMode') || 'Aydınlık/Karanlık'}</div>
                  <div style={s.sectionDesc}>
                    {t('switchbetweenli112') || 'Aydınlık veya karanlık mod'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        if (isDark) {
                          onToggleDark();
                          fetch('/save-settings', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-csrf-token': csrfToken,
                            },
                            body: JSON.stringify({ theme_mode: 'light' }),
                          }).catch(() => {});
                        }
                      }}
                      style={{
                        ...s.btnStatic,
                        flex: 1,
                        justifyContent: 'center',
                        background: !isDark ? 'var(--accent)' : 'var(--bg-surface)',
                        color: !isDark ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      ☀️ {t('light') || 'Aydınlık'}
                    </button>
                    <button
                      onClick={() => {
                        if (!isDark) {
                          onToggleDark();
                          fetch('/save-settings', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-csrf-token': csrfToken,
                            },
                            body: JSON.stringify({ theme_mode: 'dark' }),
                          }).catch(() => {});
                        }
                      }}
                      style={{
                        ...s.btnStatic,
                        flex: 1,
                        justifyContent: 'center',
                        background: isDark ? 'var(--accent)' : 'var(--bg-surface)',
                        color: isDark ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      🌙 {t('dark') || 'Karanlık'}
                    </button>
                  </div>
                </div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>{t('themetransition113') || 'Tema Geçişi'}</div>
                  <div style={s.sectionDesc}>
                    {t('smoothtransitio114') || 'Yumuşak tema geçişleri'}
                  </div>
                  <label style={s.toggleRow}>
                    <span style={s.toggleLabel}>
                      {t('enableanimation115') || 'Animasyonları Etkinleştir'}
                    </span>
                    <button style={toggleStyle(true)} onClick={() => {}}>
                      <div style={toggleKnobStyle(true)} />
                    </button>
                  </label>
                </div>
              </div>
            )}

            {/* Language Tab */}
            {activeTab === 'language' && (
              <div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>{t('chooseLanguage') || 'Dil Seçimi'}</div>
                  <div style={s.sectionDesc}>
                    {t('chooseyourprefe116') || 'Tercih ettiğiniz dili seçin'}
                  </div>
                  <div
                    style={langCardStyle(language === 'tr')}
                    onClick={() => {
                      if (language !== 'tr') {
                        onToggleLanguage();
                        fetch('/api/v1/set-language', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ lang: 'tr' }),
                        }).catch(() => {});
                      }
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🇹🇷</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Türkçe</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {t('turkishinterfac117') || 'Türkçe arayüz'}
                      </div>
                    </div>
                    {language === 'tr' && (
                      <span style={{ color: 'var(--accent)', fontSize: 18 }}>✓</span>
                    )}
                  </div>
                  <div
                    style={langCardStyle(language === 'en')}
                    onClick={() => {
                      if (language !== 'en') {
                        onToggleLanguage();
                        fetch('/api/v1/set-language', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ lang: 'en' }),
                        }).catch(() => {});
                      }
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🇬🇧</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>English</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {t('englishinterfac118') || 'English interface'}
                      </div>
                    </div>
                    {language === 'en' && (
                      <span style={{ color: 'var(--accent)', fontSize: 18 }}>✓</span>
                    )}
                  </div>
                  <div
                    style={langCardStyle(language === 'de')}
                    onClick={() => {
                      if (language !== 'de') {
                        onToggleLanguage();
                        fetch('/api/v1/set-language', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ lang: 'de' }),
                        }).catch(() => {});
                      }
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🇩🇪</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Deutsch</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        German interface
                      </div>
                    </div>
                    {language === 'de' && (
                      <span style={{ color: 'var(--accent)', fontSize: 18 }}>✓</span>
                    )}
                  </div>
                  <div
                    style={langCardStyle(language === 'fr')}
                    onClick={() => {
                      if (language !== 'fr') {
                        onToggleLanguage();
                        fetch('/api/v1/set-language', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ lang: 'fr' }),
                        }).catch(() => {});
                      }
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🇫🇷</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Français</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        French interface
                      </div>
                    </div>
                    {language === 'fr' && (
                      <span style={{ color: 'var(--accent)', fontSize: 18 }}>✓</span>
                    )}
                  </div>
                  <div
                    style={langCardStyle(language === 'es')}
                    onClick={() => {
                      if (language !== 'es') {
                        onToggleLanguage();
                        fetch('/api/v1/set-language', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ lang: 'es' }),
                        }).catch(() => {});
                      }
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🇪🇸</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Español</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Spanish interface
                      </div>
                    </div>
                    {language === 'es' && (
                      <span style={{ color: 'var(--accent)', fontSize: 18 }}>✓</span>
                    )}
                  </div>
                  <div
                    style={langCardStyle(language === 'ar')}
                    onClick={() => {
                      if (language !== 'ar') {
                        onToggleLanguage();
                        fetch('/api/v1/set-language', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ lang: 'ar' }),
                        }).catch(() => {});
                      }
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🇸🇦</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>العربية</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Arabic interface
                      </div>
                    </div>
                    {language === 'ar' && (
                      <span style={{ color: 'var(--accent)', fontSize: 18 }}>✓</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>{t('personalAvatar') || 'Profil Resmi'}</div>
                  <div style={s.sectionDesc}>
                    {t('uploadyourprofi119') || 'Profil resminizi yükleyin'}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const b64 = await encodeFileAsBase64(f);
                        await fetch('/save-settings', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-csrf-token': csrfToken,
                          },
                          body: JSON.stringify({ personal_avatar_base64: b64 }),
                        });
                      }
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      ...s.btnStatic,
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <Upload size={14} /> {t('upload') || 'Yükle'}
                  </button>
                </div>
              </div>
            )}

            {/* Production Tab */}
            {activeTab === 'production' && (
              <div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>{t('textGridPosition') || 'Metin Izgara Konumu'}</div>
                  <div style={s.sectionDesc}>
                    {t('textpositioning120') || 'Video üzerindeki metin konumu'}
                  </div>
                  <select
                    style={s.select}
                    value={textGrid}
                    onChange={(e) => setTextGrid(e.target.value)}
                  >
                    <option value="top-left">{t('topLeft') || 'Sol Üst'}</option>
                    <option value="top-right">{t('topRight') || 'Sağ Üst'}</option>
                    <option value="center">{t('center') || 'Orta'}</option>
                    <option value="bottom-left">{t('bottomLeft') || 'Sol Alt'}</option>
                    <option value="bottom-right">{t('bottomRight') || 'Sağ Alt'}</option>
                  </select>
                </div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>{t('narratorTone') || 'Anlatıcı Tonu'}</div>
                  <div style={s.sectionDesc}>
                    {t('defaultnarrator121') || 'Varsayılan anlatıcı tonu'}
                  </div>
                  <input
                    style={s.input}
                    value={narratorTone}
                    onChange={(e) => setNarratorTone(e.target.value)}
                    placeholder={
                      t('defaultNarratorPlaceholder') || 'Örn: Profesyonel, samimi, dramatik'
                    }
                  />
                </div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>YouTube API Key</div>
                  <div style={s.sectionDesc}>
                    {t('apikeyforyoutub122') || 'YouTube Data API anahtarı'}
                  </div>
                  <input
                    style={{ ...s.input, fontFamily: 'var(--font-mono)' }}
                    value={ytApiKey}
                    onChange={(e) => setYtApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                  />
                </div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>
                    {t('wav2liplipsync123') || 'Wav2Lip Senkronizasyonu'}
                  </div>
                  <div style={s.sectionDesc}>
                    {t('reallipsyncviaw124') || 'Gerçek dudak senkronizasyonu'}
                  </div>
                  <label style={s.toggleRow}>
                    <span style={s.toggleLabel}>
                      {t('enablelipsync125') || 'Dudak senkronizasyonu'}
                    </span>
                    <button
                      style={toggleStyle(applyLipsync)}
                      onClick={() => setApplyLipsync(!applyLipsync)}
                    >
                      <div style={toggleKnobStyle(applyLipsync)} />
                    </button>
                  </label>
                </div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>{t('endscreenoverla126') || 'Bitiş Ekranı'}</div>
                  <div style={s.sectionDesc}>
                    {t('addsavatarwatch127') || 'Avatar ve kanal abone ekranı'}
                  </div>
                  <label style={s.toggleRow}>
                    <span style={s.toggleLabel}>{t('enableendscreen128') || 'Bitiş ekranı'}</span>
                    <button
                      style={toggleStyle(applyEndScreen)}
                      onClick={() => setApplyEndScreen(!applyEndScreen)}
                    >
                      <div style={toggleKnobStyle(applyEndScreen)} />
                    </button>
                  </label>
                </div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>Marka Kimliği (Brand Kit)</div>
                  <div style={s.sectionDesc}>
                    Videolarda kullanılacak marka logosu, renkler ve yazı tipi
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={s.label}>Marka Logosu</label>
                      <input
                        ref={brandLogoInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) setBrandLogo(await encodeFileAsBase64(f));
                        }}
                      />
                      <button
                        onClick={() => brandLogoInputRef.current?.click()}
                        style={{
                          ...s.btnStatic,
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <Upload size={14} /> Yükle
                      </button>
                      {brandLogo && (
                        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--success)' }}>
                          ✓ Yüklendi
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={s.label}>Birincil Renk</label>
                      <input
                        type="color"
                        value={brandPrimaryColor}
                        onChange={(e) => setBrandPrimaryColor(e.target.value)}
                        style={{
                          width: '100%',
                          height: 36,
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          background: 'var(--bg-surface)',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 12,
                      marginTop: 12,
                    }}
                  >
                    <div>
                      <label style={s.label}>İkincil Renk</label>
                      <input
                        type="color"
                        value={brandSecondaryColor}
                        onChange={(e) => setBrandSecondaryColor(e.target.value)}
                        style={{
                          width: '100%',
                          height: 36,
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          background: 'var(--bg-surface)',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      />
                    </div>
                    <div>
                      <label style={s.label}>Yazı Tipi</label>
                      <input
                        style={s.input}
                        value={brandFontPath}
                        onChange={(e) => setBrandFontPath(e.target.value)}
                        placeholder="Arial"
                      />
                    </div>
                  </div>
                </div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>Ses Klonlama (Voice Cloning)</div>
                  <div style={s.sectionDesc}>
                    Kendi sesinizi klonlamak için kısa bir ses kaydı yükleyin
                  </div>
                  <input
                    ref={voiceInputRef}
                    type="file"
                    accept="audio/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) setPersonalVoice(await encodeFileAsBase64(f));
                    }}
                  />
                  <button
                    onClick={() => voiceInputRef.current?.click()}
                    style={{
                      ...s.btnStatic,
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <Upload size={14} /> Ses Dosyası Yükle
                  </button>
                  {personalVoice && (
                    <div style={{ marginTop: 4, fontSize: 11, color: 'var(--success)' }}>
                      ✓ Ses dosyası yüklendi
                    </div>
                  )}
                </div>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  style={{
                    ...s.btnStatic,
                    background: 'var(--accent)',
                    color: 'white',
                    marginTop: 16,
                  }}
                >
                  {saving ? <Loader size={14} className="spin" /> : <Save size={14} />}
                  {t('saveSettings') || 'Kaydet'}
                </button>
              </div>
            )}

            {/* Characters Tab */}
            {activeTab === 'characters' && (
              <div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>✨ Yeni Karakter Ekle</div>
                  <div style={s.sectionDesc}>
                    Videolarınızda @karakter_adı ile çağırabileceğiniz karakterler
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      style={s.input}
                      value={newCharName}
                      onChange={(e) => setNewCharName(e.target.value)}
                      placeholder="Karakter adı (örn: sibel)"
                    />
                    <textarea
                      style={{ ...s.input, minHeight: 60, resize: 'vertical' }}
                      value={newCharDesc}
                      onChange={(e) => setNewCharDesc(e.target.value)}
                      placeholder="Fiziksel özellikler (avatar promptu)"
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setAvatarStyleSetting('realistic')}
                        style={{
                          ...s.btnStatic,
                          flex: 1,
                          justifyContent: 'center',
                          background:
                            avatarStyleSetting === 'realistic'
                              ? 'var(--accent)'
                              : 'var(--bg-surface)',
                          color: avatarStyleSetting === 'realistic' ? 'white' : 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        Gerçekçi
                      </button>
                      <button
                        onClick={() => setAvatarStyleSetting('animatic')}
                        style={{
                          ...s.btnStatic,
                          flex: 1,
                          justifyContent: 'center',
                          background:
                            avatarStyleSetting === 'animatic'
                              ? 'var(--accent)'
                              : 'var(--bg-surface)',
                          color: avatarStyleSetting === 'animatic' ? 'white' : 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        Animatik
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        ref={charAvatarInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) setNewCharAvatar(await encodeFileAsBase64(f));
                        }}
                      />
                      <button
                        onClick={() => charAvatarInputRef.current?.click()}
                        style={{
                          ...s.btnStatic,
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <Upload size={14} /> Fotoğraf Yükle
                      </button>
                      <button
                        onClick={generateAvatar}
                        disabled={generatingAvatar}
                        style={{
                          ...s.btnStatic,
                          background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
                          color: 'white',
                        }}
                      >
                        {generatingAvatar ? (
                          <Loader size={14} className="spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}{' '}
                        SD Avatar Üret
                      </button>
                      {newCharAvatar && (
                        <button
                          onClick={() => setEditingAvatarUrl(newCharAvatar)}
                          style={{
                            ...s.btnStatic,
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <Wand2 size={14} /> Düzenle
                        </button>
                      )}
                      <button
                        onClick={createCharacter}
                        disabled={loading || !newCharName.trim()}
                        style={{ ...s.btnStatic, background: 'var(--accent)', color: 'white' }}
                      >
                        {loading ? <Loader size={14} className="spin" /> : <User size={14} />} Ekle
                      </button>
                    </div>
                    {newCharAvatar && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                        <img
                          src={newCharAvatar}
                          alt="Avatar preview"
                          style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          Kaynak: {newCharAvatar.startsWith('data:') ? 'AI/Yükleme' : 'URL'}
                        </span>
                      </div>
                    )}
                    {editingAvatarUrl && (
                      <PhotoEditor
                        imageUrl={editingAvatarUrl}
                        onSave={handleAvatarSave}
                        onClose={() => setEditingAvatarUrl(null)}
                      />
                    )}
                  </div>
                </div>
                <div style={s.section}>
                  <div style={s.sectionTitle}>👥 Kayıtlı Karakterler ({characters.length})</div>
                  {characters.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Henüz karakter eklenmemiş.
                    </div>
                  ) : (
                    characters.map((c) => (
                      <div key={c.id} style={s.charCard}>
                        <div style={s.charAvatar}>
                          {c.reference_image_base64 ? (
                            <img
                              src={c.reference_image_base64}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <User size={18} style={{ color: 'var(--accent)' }} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>@{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {c.description || 'Açıklama yok'}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteCharacter(c.id)}
                          style={{
                            ...s.btnStatic,
                            background: 'rgba(239,68,68,0.1)',
                            color: 'var(--danger)',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
