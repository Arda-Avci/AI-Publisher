import { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Loader, AlertCircle, Edit3, Trash2, ChevronDown, ChevronUp, Save, X } from 'lucide-react';

interface NicheProfile {
  id: string;
  name: string;
  industry: string;
  target_audience: string;
  tone: string;
  content_style: string;
  keywords: string[];
  platforms: string[];
  competitor_accounts: string[];
  created_at: string;
  updated_at: string;
}

const INDUSTRIES = [
  { value: 'tech', label_tr: 'Teknoloji', label_en: 'Technology' },
  { value: 'fashion', label_tr: 'Moda', label_en: 'Fashion' },
  { value: 'food', label_tr: 'Yemek & İçecek', label_en: 'Food & Beverage' },
  { value: 'health', label_tr: 'Sağlık & Wellness', label_en: 'Health & Wellness' },
  { value: 'education', label_tr: 'Eğitim', label_en: 'Education' },
  { value: 'finance', label_tr: 'Finans', label_en: 'Finance' },
  { value: 'entertainment', label_tr: 'Eğlence', label_en: 'Entertainment' },
  { value: 'gaming', label_tr: 'Oyun', label_en: 'Gaming' },
  { value: 'real-estate', label_tr: 'Emlak', label_en: 'Real Estate' },
  { value: 'automotive', label_tr: 'Otomotiv', label_en: 'Automotive' },
  { value: 'travel', label_tr: 'Seyahat', label_en: 'Travel' },
  { value: 'fitness', label_tr: 'Fitness', label_en: 'Fitness' },
  { value: 'music', label_tr: 'Müzik', label_en: 'Music' },
  { value: 'art', label_tr: 'Sanat', label_en: 'Art' },
  { value: 'crypto', label_tr: 'Kripto', label_en: 'Crypto' },
];

const TONES = [
  { value: 'professional', label_tr: 'Profesyonel', label_en: 'Professional' },
  { value: 'casual', label_tr: 'Günlük', label_en: 'Casual' },
  { value: 'humorous', label_tr: 'Espirili', label_en: 'Humorous' },
  { value: 'inspirational', label_tr: 'İlham Verici', label_en: 'Inspirational' },
  { value: 'educational', label_tr: 'Eğitici', label_en: 'Educational' },
  { value: 'dramatic', label_tr: 'Dramatik', label_en: 'Dramatic' },
  { value: 'mysterious', label_tr: 'Gizemli', label_en: 'Mysterious' },
];

const PLATFORMS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
];

const DEFAULT_PROFILE: Omit<NicheProfile, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  industry: '',
  target_audience: '',
  tone: '',
  content_style: '',
  keywords: [],
  platforms: [],
  competitor_accounts: [],
};

export function NichePanel({ language }: { language: 'tr' | 'en' }) {
  const isTr = language === 'tr';
  const [profiles, setProfiles] = useState<NicheProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_PROFILE);
  const [keywordInput, setKeywordInput] = useState('');
  const [competitorInput, setCompetitorInput] = useState('');
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const t = useCallback((tr: string, en: string) => isTr ? tr : en, [isTr]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/niche/profiles');
      const data = await res.json();
      if (data.status === 'success') {
        setProfiles(data.data || []);
      } else {
        setError(data.error || t('Profiller yüklenemedi', 'Failed to load profiles'));
      }
    } catch (err: any) {
      setError(err.message || t('Bağlantı hatası', 'Connection error'));
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!form.name.trim()) {
      setError(t('Profil adı gerekli', 'Profile name is required'));
      return;
    }
    if (!form.industry) {
      setError(t('Sektör seçimi gerekli', 'Industry selection is required'));
      return;
    }

    setError('');
    setSaving(true);
    try {
      const url = editingId ? `/api/v1/niche/profiles/${editingId}` : '/api/v1/niche/create';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchProfiles();
        setShowForm(false);
        setEditingId(null);
        setForm(DEFAULT_PROFILE);
      } else {
        setError(data.error || t('Kaydetme başarısız', 'Save failed'));
      }
    } catch (err: any) {
      setError(err.message || t('Kaydetme başarısız', 'Save failed'));
    }
    setSaving(false);
  };

  const editProfile = (profile: NicheProfile) => {
    setForm({
      name: profile.name,
      industry: profile.industry,
      target_audience: profile.target_audience,
      tone: profile.tone,
      content_style: profile.content_style,
      keywords: profile.keywords,
      platforms: profile.platforms,
      competitor_accounts: profile.competitor_accounts,
    });
    setEditingId(profile.id);
    setShowForm(true);
  };

  const deleteProfile = async (id: string) => {
    if (!confirm(t('Bu profili silmek istediğinize emin misiniz?', 'Are you sure you want to delete this profile?'))) return;
    try {
      await fetch(`/api/v1/niche/profiles/${id}`, { method: 'DELETE' });
      fetchProfiles();
    } catch (err: any) {
      setError(err.message || t('Silme hatası', 'Delete error'));
    }
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !form.keywords.includes(kw)) {
      setForm({ ...form, keywords: [...form.keywords, kw] });
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setForm({ ...form, keywords: form.keywords.filter(k => k !== kw) });
  };

  const addCompetitor = () => {
    const comp = competitorInput.trim();
    if (comp && !form.competitor_accounts.includes(comp)) {
      setForm({ ...form, competitor_accounts: [...form.competitor_accounts, comp] });
      setCompetitorInput('');
    }
  };

  const removeCompetitor = (comp: string) => {
    setForm({ ...form, competitor_accounts: form.competitor_accounts.filter(c => c !== comp) });
  };

  const togglePlatform = (platform: string) => {
    const platforms = form.platforms.includes(platform)
      ? form.platforms.filter(p => p !== platform)
      : [...form.platforms, platform];
    setForm({ ...form, platforms });
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return d; }
  };

  const getIndustryLabel = (value: string) => {
    const ind = INDUSTRIES.find(i => i.value === value);
    return ind ? (isTr ? ind.label_tr : ind.label_en) : value;
  };

  const getToneLabel = (value: string) => {
    const tone = TONES.find(t => t.value === value);
    return tone ? (isTr ? tone.label_tr : tone.label_en) : value;
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
    input: {
      width: '100%',
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
      color: 'var(--text-primary)',
      outline: 'none',
      fontFamily: 'var(--font-sans)',
      boxSizing: 'border-box' as const,
    },
    select: {
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      color: 'var(--text-primary)',
      outline: 'none',
      cursor: 'pointer',
      width: '100%',
    },
    textarea: {
      width: '100%',
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
      color: 'var(--text-primary)',
      outline: 'none',
      fontFamily: 'var(--font-sans)',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
      minHeight: 60,
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
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
    },
  };

  return (
    <div style={s.panel} role="region" aria-label={t('Niche Profil Yönetimi', 'Niche Profile Management')}>
      {/* Header Card */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('Niche Profil Yönetimi', 'Niche Profile Management')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {t('Sektöre özel içerik profilleri oluşturun ve yönetin', 'Create and manage industry-specific content profiles')}
            </div>
          </div>
        </div>

        {!showForm ? (
          <button
            style={{ ...s.btn, ...s.btnPrimary, width: '100%', justifyContent: 'center' }}
            onClick={() => { setForm(DEFAULT_PROFILE); setEditingId(null); setShowForm(true); }}
          >
            <Plus size={14} />
            {t('Yeni Niche Profil Oluştur', 'Create New Niche Profile')}
          </button>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 20, background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingId ? t('Profili Düzenle', 'Edit Profile') : t('Yeni Niche Profil', 'New Niche Profile')}
              </div>
              <button
                style={{ ...s.btn, padding: '6px 12px', background: 'transparent', color: 'var(--text-muted)' }}
                onClick={() => { setShowForm(false); setEditingId(null); }}
                aria-label={t('Kapat', 'Close')}
              >
                <X size={14} />
              </button>
            </div>

            <div style={s.grid2}>
              <div>
                <label style={s.label}>{t('PROFİL ADI', 'PROFILE NAME')}</label>
                <input
                  style={s.input}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={t('Örn: TechStartup İçecek', 'E.g: TechStartup Content')}
                />
              </div>
              <div>
                <label style={s.label}>{t('SEKTÖR', 'INDUSTRY')}</label>
                <select
                  style={s.select}
                  value={form.industry}
                  onChange={e => setForm({ ...form, industry: e.target.value })}
                >
                  <option value="">{t('Sektör seçin...', 'Select industry...')}</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind.value} value={ind.value}>
                      {isTr ? ind.label_tr : ind.label_en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={s.label}>{t('HEDEF KİTLE', 'TARGET AUDIENCE')}</label>
                <input
                  style={s.input}
                  value={form.target_audience}
                  onChange={e => setForm({ ...form, target_audience: e.target.value })}
                  placeholder={t('Örn: 18-35 yaş teknoloji meraklıları', 'E.g: 18-35 tech enthusiasts')}
                />
              </div>
              <div>
                <label style={s.label}>{t('TUTUM / TON', 'TONE')}</label>
                <select
                  style={s.select}
                  value={form.tone}
                  onChange={e => setForm({ ...form, tone: e.target.value })}
                >
                  <option value="">{t('Ton seçin...', 'Select tone...')}</option>
                  {TONES.map(tone => (
                    <option key={tone.value} value={tone.value}>
                      {isTr ? tone.label_tr : tone.label_en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content Style */}
            <div style={{ marginTop: 16 }}>
              <label style={s.label}>{t('İÇERİK STİLİ', 'CONTENT STYLE')}</label>
              <textarea
                style={s.textarea}
                value={form.content_style}
                onChange={e => setForm({ ...form, content_style: e.target.value })}
                placeholder={t('İçerik stilinizi tanımlayın...', 'Describe your content style...')}
                rows={3}
              />
            </div>

            {/* Platforms */}
            <div style={{ marginTop: 16 }}>
              <label style={s.label}>{t('PLATFORMLAR', 'PLATFORMS')}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PLATFORMS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: form.platforms.includes(p.value)
                        ? '2px solid hsl(var(--primary))'
                        : '1px solid var(--border)',
                      background: form.platforms.includes(p.value)
                        ? 'hsla(var(--primary),0.1)'
                        : 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'all 0.15s',
                    }}
                    aria-pressed={form.platforms.includes(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div style={{ marginTop: 16 }}>
              <label style={s.label}>{t('ANAHTAR KELİMELER', 'KEYWORDS')}</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  style={{ ...s.input, flex: 1 }}
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                  placeholder={t('Anahtar kelime ekleyin ve Enter tuşuna basın', 'Add keyword and press Enter')}
                />
                <button
                  style={{ ...s.btn, ...s.btnSecondary, padding: '8px 16px' }}
                  onClick={addKeyword}
                >
                  <Plus size={12} />
                </button>
              </div>
              {form.keywords.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.keywords.map(kw => (
                    <span key={kw} style={{ ...s.chip, cursor: 'pointer' }} onClick={() => removeKeyword(kw)}>
                      {kw} <X size={10} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Competitor Accounts */}
            <div style={{ marginTop: 16 }}>
              <label style={s.label}>{t('RAKIP HESAPLAR', 'COMPETITOR ACCOUNTS')}</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  style={{ ...s.input, flex: 1 }}
                  value={competitorInput}
                  onChange={e => setCompetitorInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompetitor(); } }}
                  placeholder={t('Rakip hesap ekleyin ve Enter tuşuna basın', 'Add competitor account and press Enter')}
                />
                <button
                  style={{ ...s.btn, ...s.btnSecondary, padding: '8px 16px' }}
                  onClick={addCompetitor}
                >
                  <Plus size={12} />
                </button>
              </div>
              {form.competitor_accounts.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {form.competitor_accounts.map(comp => (
                    <span key={comp} style={{ ...s.chip, cursor: 'pointer', background: 'hsla(38,90%,50%,0.08)', color: 'hsl(38,90%,50%)', borderColor: 'hsla(38,90%,50%,0.2)' }} onClick={() => removeCompetitor(comp)}>
                      {comp} <X size={10} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              style={{ ...s.btn, ...s.btnPrimary, width: '100%', justifyContent: 'center', marginTop: 16 }}
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <><Loader size={14} className="spin" /> {t('Kaydediliyor...', 'Saving...')}</>
              ) : (
                <><Save size={14} /> {editingId ? t('Güncelle', 'Update') : t('Oluştur', 'Create')}</>
              )}
            </button>
          </div>
        )}

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

      {/* Profiles List */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {t('Niche Profiller', 'Niche Profiles')}
          </div>
          <button
            style={{ ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 12px' }}
            onClick={fetchProfiles}
            disabled={loading}
          >
            {loading ? <Loader size={12} className="spin" /> : <Layers size={12} />}
            {t('Yenile', 'Refresh')}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
            <Loader size={16} className="spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {t('Henüz niche profili oluşturulmadı.', 'No niche profiles created yet.')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profiles.map(profile => {
              const isExpanded = expandedProfile === profile.id;
              return (
                <div
                  key={profile.id}
                  style={{
                    border: isExpanded ? '2px solid hsl(var(--primary))' : '1px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: isExpanded ? 'hsla(var(--primary),0.05)' : 'var(--bg-primary)',
                    transition: 'all 0.15s',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedProfile(isExpanded ? null : profile.id)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                    }}
                    aria-expanded={isExpanded}
                    aria-label={`${profile.name} - ${getIndustryLabel(profile.industry)}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Layers size={14} style={{ color: 'hsl(var(--primary))' }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{profile.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {getIndustryLabel(profile.industry)}
                          {profile.tone && ` · ${getToneLabel(profile.tone)}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {profile.platforms.slice(0, 3).map(p => (
                          <span key={p} style={s.chip}>{p}</span>
                        ))}
                        {profile.platforms.length > 3 && (
                          <span style={s.chip}>+{profile.platforms.length - 3}</span>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                      <div style={s.grid2}>
                        <div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {t('Hedef Kitle', 'Target Audience')}
                          </span>
                          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-primary)' }}>
                            {profile.target_audience || '-'}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {t('İçerik Stili', 'Content Style')}
                          </span>
                          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-primary)' }}>
                            {profile.content_style || '-'}
                          </div>
                        </div>
                      </div>

                      {profile.keywords.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {t('Anahtar Kelimeler', 'Keywords')}
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                            {profile.keywords.map(kw => (
                              <span key={kw} style={s.chip}>{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {profile.competitor_accounts.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {t('Rakip Hesaplar', 'Competitor Accounts')}
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                            {profile.competitor_accounts.map(comp => (
                              <span key={comp} style={{ ...s.chip, background: 'hsla(38,90%,50%,0.08)', color: 'hsl(38,90%,50%)', borderColor: 'hsla(38,90%,50%,0.2)' }}>
                                {comp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                        {t('Oluşturulma:', 'Created:')} {formatDate(profile.created_at)}
                        {profile.updated_at !== profile.created_at && (
                          <span style={{ marginLeft: 12 }}>
                            {t('Güncellenme:', 'Updated:')} {formatDate(profile.updated_at)}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                        <button
                          style={{ ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 12px' }}
                          onClick={(e) => { e.stopPropagation(); editProfile(profile); }}
                          aria-label={t('Düzenle', 'Edit')}
                        >
                          <Edit3 size={12} />
                          {t('Düzenle', 'Edit')}
                        </button>
                        <button
                          style={{ ...s.btn, fontSize: 11, padding: '6px 12px', background: 'transparent', border: '1px solid hsla(0,70%,50%,0.3)', color: 'hsl(0,70%,60%)' }}
                          onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }}
                          aria-label={t('Sil', 'Delete')}
                        >
                          <Trash2 size={12} />
                          {t('Sil', 'Delete')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
