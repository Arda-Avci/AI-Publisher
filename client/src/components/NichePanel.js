import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Loader, AlertCircle, Edit3, Trash2, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
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
const DEFAULT_PROFILE = {
    name: '',
    industry: '',
    target_audience: '',
    tone: '',
    content_style: '',
    keywords: [],
    platforms: [],
    competitor_accounts: [],
};
export function NichePanel({ language }) {
    const isTr = language === 'tr';
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(DEFAULT_PROFILE);
    const [keywordInput, setKeywordInput] = useState('');
    const [competitorInput, setCompetitorInput] = useState('');
    const [expandedProfile, setExpandedProfile] = useState(null);
    const [saving, setSaving] = useState(false);
    const t = useCallback((tr, en) => isTr ? tr : en, [isTr]);
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
            }
            else {
                setError(data.error || t('Profiller yüklenemedi', 'Failed to load profiles'));
            }
        }
        catch (err) {
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
            }
            else {
                setError(data.error || t('Kaydetme başarısız', 'Save failed'));
            }
        }
        catch (err) {
            setError(err.message || t('Kaydetme başarısız', 'Save failed'));
        }
        setSaving(false);
    };
    const editProfile = (profile) => {
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
    const deleteProfile = async (id) => {
        if (!confirm(t('Bu profili silmek istediğinize emin misiniz?', 'Are you sure you want to delete this profile?')))
            return;
        try {
            await fetch(`/api/v1/niche/profiles/${id}`, { method: 'DELETE' });
            fetchProfiles();
        }
        catch (err) {
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
    const removeKeyword = (kw) => {
        setForm({ ...form, keywords: form.keywords.filter(k => k !== kw) });
    };
    const addCompetitor = () => {
        const comp = competitorInput.trim();
        if (comp && !form.competitor_accounts.includes(comp)) {
            setForm({ ...form, competitor_accounts: [...form.competitor_accounts, comp] });
            setCompetitorInput('');
        }
    };
    const removeCompetitor = (comp) => {
        setForm({ ...form, competitor_accounts: form.competitor_accounts.filter(c => c !== comp) });
    };
    const togglePlatform = (platform) => {
        const platforms = form.platforms.includes(platform)
            ? form.platforms.filter(p => p !== platform)
            : [...form.platforms, platform];
        setForm({ ...form, platforms });
    };
    const formatDate = (d) => {
        try {
            return new Date(d).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
                day: 'numeric', month: 'short', year: 'numeric',
            });
        }
        catch {
            return d;
        }
    };
    const getIndustryLabel = (value) => {
        const ind = INDUSTRIES.find(i => i.value === value);
        return ind ? (isTr ? ind.label_tr : ind.label_en) : value;
    };
    const getToneLabel = (value) => {
        const tone = TONES.find(t => t.value === value);
        return tone ? (isTr ? tone.label_tr : tone.label_en) : value;
    };
    const s = {
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
            textTransform: 'uppercase',
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
            boxSizing: 'border-box',
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
            resize: 'vertical',
            boxSizing: 'border-box',
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
    return (_jsxs("div", { style: s.panel, role: "region", "aria-label": t('Niche Profil Yönetimi', 'Niche Profile Management'), children: [_jsxs("div", { style: s.card, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }, children: [_jsx("div", { style: { width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Layers, { size: 16, color: "white" }) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }, children: t('Niche Profil Yönetimi', 'Niche Profile Management') }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: t('Sektöre özel içerik profilleri oluşturun ve yönetin', 'Create and manage industry-specific content profiles') })] })] }), !showForm ? (_jsxs("button", { style: { ...s.btn, ...s.btnPrimary, width: '100%', justifyContent: 'center' }, onClick: () => { setForm(DEFAULT_PROFILE); setEditingId(null); setShowForm(true); }, children: [_jsx(Plus, { size: 14 }), t('Yeni Niche Profil Oluştur', 'Create New Niche Profile')] })) : (_jsxs("div", { style: { border: '1px solid var(--border)', borderRadius: 10, padding: 20, background: 'var(--bg-primary)' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }, children: editingId ? t('Profili Düzenle', 'Edit Profile') : t('Yeni Niche Profil', 'New Niche Profile') }), _jsx("button", { style: { ...s.btn, padding: '6px 12px', background: 'transparent', color: 'var(--text-muted)' }, onClick: () => { setShowForm(false); setEditingId(null); }, "aria-label": t('Kapat', 'Close'), children: _jsx(X, { size: 14 }) })] }), _jsxs("div", { style: s.grid2, children: [_jsxs("div", { children: [_jsx("label", { style: s.label, children: t('PROFİL ADI', 'PROFILE NAME') }), _jsx("input", { style: s.input, value: form.name, onChange: e => setForm({ ...form, name: e.target.value }), placeholder: t('Örn: TechStartup İçecek', 'E.g: TechStartup Content') })] }), _jsxs("div", { children: [_jsx("label", { style: s.label, children: t('SEKTÖR', 'INDUSTRY') }), _jsxs("select", { style: s.select, value: form.industry, onChange: e => setForm({ ...form, industry: e.target.value }), children: [_jsx("option", { value: "", children: t('Sektör seçin...', 'Select industry...') }), INDUSTRIES.map(ind => (_jsx("option", { value: ind.value, children: isTr ? ind.label_tr : ind.label_en }, ind.value)))] })] }), _jsxs("div", { children: [_jsx("label", { style: s.label, children: t('HEDEF KİTLE', 'TARGET AUDIENCE') }), _jsx("input", { style: s.input, value: form.target_audience, onChange: e => setForm({ ...form, target_audience: e.target.value }), placeholder: t('Örn: 18-35 yaş teknoloji meraklıları', 'E.g: 18-35 tech enthusiasts') })] }), _jsxs("div", { children: [_jsx("label", { style: s.label, children: t('TUTUM / TON', 'TONE') }), _jsxs("select", { style: s.select, value: form.tone, onChange: e => setForm({ ...form, tone: e.target.value }), children: [_jsx("option", { value: "", children: t('Ton seçin...', 'Select tone...') }), TONES.map(tone => (_jsx("option", { value: tone.value, children: isTr ? tone.label_tr : tone.label_en }, tone.value)))] })] })] }), _jsxs("div", { style: { marginTop: 16 }, children: [_jsx("label", { style: s.label, children: t('İÇERİK STİLİ', 'CONTENT STYLE') }), _jsx("textarea", { style: s.textarea, value: form.content_style, onChange: e => setForm({ ...form, content_style: e.target.value }), placeholder: t('İçerik stilinizi tanımlayın...', 'Describe your content style...'), rows: 3 })] }), _jsxs("div", { style: { marginTop: 16 }, children: [_jsx("label", { style: s.label, children: t('PLATFORMLAR', 'PLATFORMS') }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 }, children: PLATFORMS.map(p => (_jsx("button", { type: "button", onClick: () => togglePlatform(p.value), style: {
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
                                            }, "aria-pressed": form.platforms.includes(p.value), children: p.label }, p.value))) })] }), _jsxs("div", { style: { marginTop: 16 }, children: [_jsx("label", { style: s.label, children: t('ANAHTAR KELİMELER', 'KEYWORDS') }), _jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 8 }, children: [_jsx("input", { style: { ...s.input, flex: 1 }, value: keywordInput, onChange: e => setKeywordInput(e.target.value), onKeyDown: e => { if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addKeyword();
                                                } }, placeholder: t('Anahtar kelime ekleyin ve Enter tuşuna basın', 'Add keyword and press Enter') }), _jsx("button", { style: { ...s.btn, ...s.btnSecondary, padding: '8px 16px' }, onClick: addKeyword, children: _jsx(Plus, { size: 12 }) })] }), form.keywords.length > 0 && (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 }, children: form.keywords.map(kw => (_jsxs("span", { style: { ...s.chip, cursor: 'pointer' }, onClick: () => removeKeyword(kw), children: [kw, " ", _jsx(X, { size: 10 })] }, kw))) }))] }), _jsxs("div", { style: { marginTop: 16 }, children: [_jsx("label", { style: s.label, children: t('RAKIP HESAPLAR', 'COMPETITOR ACCOUNTS') }), _jsxs("div", { style: { display: 'flex', gap: 8, marginBottom: 8 }, children: [_jsx("input", { style: { ...s.input, flex: 1 }, value: competitorInput, onChange: e => setCompetitorInput(e.target.value), onKeyDown: e => { if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addCompetitor();
                                                } }, placeholder: t('Rakip hesap ekleyin ve Enter tuşuna basın', 'Add competitor account and press Enter') }), _jsx("button", { style: { ...s.btn, ...s.btnSecondary, padding: '8px 16px' }, onClick: addCompetitor, children: _jsx(Plus, { size: 12 }) })] }), form.competitor_accounts.length > 0 && (_jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 6 }, children: form.competitor_accounts.map(comp => (_jsxs("span", { style: { ...s.chip, cursor: 'pointer', background: 'hsla(38,90%,50%,0.08)', color: 'hsl(38,90%,50%)', borderColor: 'hsla(38,90%,50%,0.2)' }, onClick: () => removeCompetitor(comp), children: [comp, " ", _jsx(X, { size: 10 })] }, comp))) }))] }), _jsx("button", { style: { ...s.btn, ...s.btnPrimary, width: '100%', justifyContent: 'center', marginTop: 16 }, onClick: saveProfile, disabled: saving, children: saving ? (_jsxs(_Fragment, { children: [_jsx(Loader, { size: 14, className: "spin" }), " ", t('Kaydediliyor...', 'Saving...')] })) : (_jsxs(_Fragment, { children: [_jsx(Save, { size: 14 }), " ", editingId ? t('Güncelle', 'Update') : t('Oluştur', 'Create')] })) })] })), error && (_jsxs("div", { style: { padding: '10px 14px', background: 'hsla(0,70%,50%,0.1)', border: '1px solid hsla(0,70%,50%,0.2)', borderRadius: 8, fontSize: 12, color: 'hsl(0,70%,60%)', marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }, role: "alert", children: [_jsx(AlertCircle, { size: 14 }), error] }))] }), _jsxs("div", { style: s.card, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsx("div", { style: { fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }, children: t('Niche Profiller', 'Niche Profiles') }), _jsxs("button", { style: { ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 12px' }, onClick: fetchProfiles, disabled: loading, children: [loading ? _jsx(Loader, { size: 12, className: "spin" }) : _jsx(Layers, { size: 12 }), t('Yenile', 'Refresh')] })] }), loading ? (_jsx("div", { style: { textAlign: 'center', padding: 20, color: 'var(--text-muted)' }, children: _jsx(Loader, { size: 16, className: "spin" }) })) : profiles.length === 0 ? (_jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }, children: t('Henüz niche profili oluşturulmadı.', 'No niche profiles created yet.') })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: profiles.map(profile => {
                            const isExpanded = expandedProfile === profile.id;
                            return (_jsxs("div", { style: {
                                    border: isExpanded ? '2px solid hsl(var(--primary))' : '1px solid var(--border)',
                                    borderRadius: 10,
                                    overflow: 'hidden',
                                    background: isExpanded ? 'hsla(var(--primary),0.05)' : 'var(--bg-primary)',
                                    transition: 'all 0.15s',
                                }, children: [_jsxs("button", { type: "button", onClick: () => setExpandedProfile(isExpanded ? null : profile.id), style: {
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
                                        }, "aria-expanded": isExpanded, "aria-label": `${profile.name} - ${getIndustryLabel(profile.industry)}`, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(Layers, { size: 14, style: { color: 'hsl(var(--primary))' } }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600 }, children: profile.name }), _jsxs("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: [getIndustryLabel(profile.industry), profile.tone && ` · ${getToneLabel(profile.tone)}`] })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', gap: 4 }, children: [profile.platforms.slice(0, 3).map(p => (_jsx("span", { style: s.chip, children: p }, p))), profile.platforms.length > 3 && (_jsxs("span", { style: s.chip, children: ["+", profile.platforms.length - 3] }))] }), isExpanded ? _jsx(ChevronUp, { size: 14 }) : _jsx(ChevronDown, { size: 14 })] })] }), isExpanded && (_jsxs("div", { style: { padding: '12px 16px', borderTop: '1px solid var(--border)' }, children: [_jsxs("div", { style: s.grid2, children: [_jsxs("div", { children: [_jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: t('Hedef Kitle', 'Target Audience') }), _jsx("div", { style: { fontSize: 12, marginTop: 4, color: 'var(--text-primary)' }, children: profile.target_audience || '-' })] }), _jsxs("div", { children: [_jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: t('İçerik Stili', 'Content Style') }), _jsx("div", { style: { fontSize: 12, marginTop: 4, color: 'var(--text-primary)' }, children: profile.content_style || '-' })] })] }), profile.keywords.length > 0 && (_jsxs("div", { style: { marginTop: 12 }, children: [_jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: t('Anahtar Kelimeler', 'Keywords') }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }, children: profile.keywords.map(kw => (_jsx("span", { style: s.chip, children: kw }, kw))) })] })), profile.competitor_accounts.length > 0 && (_jsxs("div", { style: { marginTop: 12 }, children: [_jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: t('Rakip Hesaplar', 'Competitor Accounts') }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }, children: profile.competitor_accounts.map(comp => (_jsx("span", { style: { ...s.chip, background: 'hsla(38,90%,50%,0.08)', color: 'hsl(38,90%,50%)', borderColor: 'hsla(38,90%,50%,0.2)' }, children: comp }, comp))) })] })), _jsxs("div", { style: { marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }, children: [t('Oluşturulma:', 'Created:'), " ", formatDate(profile.created_at), profile.updated_at !== profile.created_at && (_jsxs("span", { style: { marginLeft: 12 }, children: [t('Güncellenme:', 'Updated:'), " ", formatDate(profile.updated_at)] }))] }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }, children: [_jsxs("button", { style: { ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 12px' }, onClick: (e) => { e.stopPropagation(); editProfile(profile); }, "aria-label": t('Düzenle', 'Edit'), children: [_jsx(Edit3, { size: 12 }), t('Düzenle', 'Edit')] }), _jsxs("button", { style: { ...s.btn, fontSize: 11, padding: '6px 12px', background: 'transparent', border: '1px solid hsla(0,70%,50%,0.3)', color: 'hsl(0,70%,60%)' }, onClick: (e) => { e.stopPropagation(); deleteProfile(profile.id); }, "aria-label": t('Sil', 'Delete'), children: [_jsx(Trash2, { size: 12 }), t('Sil', 'Delete')] })] })] }))] }, profile.id));
                        }) }))] })] }));
}
