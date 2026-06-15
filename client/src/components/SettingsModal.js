import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { X, User, Palette, Globe, Monitor, Mic, Save, Loader, Upload, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { PhotoEditor } from './PhotoEditor.js';
const THEMES = [
    { id: 'default', name: 'Standard', meta: 'STD', color: 'hsl(220 80% 50%)', bg: 'hsl(220 10% 96%)' },
    { id: 'nebula', name: 'Nebula', meta: 'NBL', color: 'hsl(263 90% 70%)', bg: 'hsl(250 34% 10%)' },
    { id: 'forest', name: 'Forest', meta: 'FOR', color: 'hsl(142 70% 45%)', bg: 'hsl(150 20% 8%)' },
    { id: 'corporate', name: 'Corporate', meta: 'COR', color: 'hsl(0 84% 50%)', bg: 'hsl(0 0% 8%)' },
    { id: 'midnight', name: 'Midnight', meta: 'MID', color: 'hsl(45 100% 50%)', bg: 'hsl(220 40% 6%)' },
    { id: 'sunset', name: 'Sunset', meta: 'SUN', color: 'hsl(12 90% 60%)', bg: 'hsl(10 40% 8%)' },
    { id: 'ocean', name: 'Ocean', meta: 'OCN', color: 'hsl(190 90% 60%)', bg: 'hsl(200 40% 7%)' },
    { id: 'cyberpunk', name: 'Cyberpunk', meta: 'CYB', color: 'hsl(320 100% 50%)', bg: 'hsl(290 50% 5%)' },
    { id: 'matrix', name: 'Matrix', meta: 'MTX', color: 'hsl(120 100% 50%)', bg: 'hsl(120 100% 2%)' },
];
const s = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    modal: {
        background: 'var(--bg-primary)', border: '1px solid var(--border)',
        borderRadius: 12, width: 800, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
    },
    headerTitle: { fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 },
    body: { display: 'flex', flex: 1, overflow: 'hidden' },
    sidebar: {
        width: 200, borderRight: '1px solid var(--border)',
        padding: '12px 0', overflowY: 'auto', flexShrink: 0,
    },
    content: { flex: 1, padding: 20, overflowY: 'auto' },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' },
    sectionDesc: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 },
    label: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' },
    input: {
        width: '100%', padding: '8px 12px', borderRadius: 6,
        border: '1px solid var(--border)', background: 'var(--bg-surface)',
        color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    },
    select: {
        width: '100%', padding: '8px 12px', borderRadius: 6,
        border: '1px solid var(--border)', background: 'var(--bg-surface)',
        color: 'var(--text-primary)', fontSize: 13,
    },
    themeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
    themeName: { fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' },
    themeMeta: { fontSize: 9, color: 'var(--text-muted)' },
    toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' },
    toggleLabel: { fontSize: 13, color: 'var(--text-primary)' },
    charCard: {
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
        borderRadius: 8, border: '1px solid var(--border)',
        background: 'var(--bg-surface)', marginBottom: 8,
    },
    charAvatar: {
        width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden',
    },
    btnStatic: {
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px',
        borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    },
};
// Dynamic style helpers (can't be in the static s object due to function types)
const navItemStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
    width: '100%', border: 'none', background: active ? 'var(--accent-light)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer',
    fontSize: 13, textAlign: 'left', transition: 'all 0.2s',
    borderRight: active ? '2px solid var(--accent)' : '2px solid transparent',
});
const themeCardStyle = (active) => ({
    padding: 8, borderRadius: 8, cursor: 'pointer', textAlign: 'center',
    border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-light)' : 'transparent',
    transition: 'all 0.2s',
});
const toggleStyle = (on) => ({
    width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
    background: on ? 'var(--accent)' : 'var(--border)',
    position: 'relative', transition: 'all 0.2s', padding: 0,
});
const toggleKnobStyle = (on) => ({
    width: 18, height: 18, borderRadius: '50%', background: 'white',
    position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'all 0.2s',
});
const langCardStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
    borderRadius: 8, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-light)' : 'var(--bg-surface)',
    marginBottom: 8,
});
export function SettingsModal({ isOpen, onClose, language, theme, isDark, csrfToken, onSetTheme, onToggleDark, onToggleLanguage, t }) {
    const [activeTab, setActiveTab] = useState('appearance');
    const [characters, setCharacters] = useState([]);
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
    const [avatarStyleSetting, setAvatarStyleSetting] = useState('realistic');
    const [editingAvatarUrl, setEditingAvatarUrl] = useState(null);
    const fileInputRef = useRef(null);
    const voiceInputRef = useRef(null);
    const brandLogoInputRef = useRef(null);
    const charAvatarInputRef = useRef(null);
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
        }
        catch { }
    };
    const loadCharacters = async () => {
        try {
            const r = await fetch('/api/v1/characters');
            const d = await r.json();
            if (d.status === 'success')
                setCharacters(d.data || []);
        }
        catch { }
    };
    useEffect(() => {
        if (!isOpen)
            return;
        loadSettings();
        loadCharacters();
    }, [isOpen]);
    const saveSettings = async () => {
        setSaving(true);
        try {
            await fetch('/save-settings', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
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
        }
        catch { }
        finally {
            setSaving(false);
        }
    };
    const createCharacter = async () => {
        if (!newCharName.trim())
            return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('name', newCharName.trim());
            fd.append('description', newCharDesc.trim());
            if (newCharAvatar) {
                const blob = await fetch(newCharAvatar).then(r => r.blob());
                fd.append('avatar', blob, 'avatar.png');
            }
            await fetch('/api/v1/characters', { method: 'POST', body: fd });
            setNewCharName('');
            setNewCharDesc('');
            setNewCharAvatar('');
            loadCharacters();
        }
        catch { }
        finally {
            setLoading(false);
        }
    };
    const generateAvatar = async () => {
        if (!newCharDesc.trim())
            return;
        setGeneratingAvatar(true);
        try {
            const r = await fetch('/api/v1/characters/generate-avatar', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCharName, description: newCharDesc, avatar_style: avatarStyleSetting }),
            });
            const d = await r.json();
            if (d.status === 'success' && d.avatar_base64)
                setNewCharAvatar(d.avatar_base64);
        }
        catch { }
        finally {
            setGeneratingAvatar(false);
        }
    };
    const handleAvatarSave = (newUrl) => {
        setNewCharAvatar(newUrl);
        setEditingAvatarUrl(null);
    };
    const deleteCharacter = async (id) => {
        try {
            await fetch(`/api/v1/characters/${id}`, { method: 'DELETE', headers: { 'x-csrf-token': csrfToken } });
            loadCharacters();
        }
        catch { }
    };
    const encodeFileAsBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    if (!isOpen)
        return null;
    const tabs = [
        { id: 'appearance', label: t('settingsAppearanceTab') || 'Görünüm', icon: _jsx(Palette, { size: 16 }) },
        { id: 'language', label: t('settingsLanguageTab') || 'Dil', icon: _jsx(Globe, { size: 16 }) },
        { id: 'account', label: t('settingsAccountTab') || 'Hesap', icon: _jsx(User, { size: 16 }) },
        { id: 'production', label: t('production108') || 'Üretim', icon: _jsx(Monitor, { size: 16 }) },
        { id: 'characters', label: 'Karakterler', icon: _jsx(Mic, { size: 16 }) },
    ];
    return (_jsx("div", { style: s.overlay, onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { style: s.modal, children: [_jsxs("div", { style: s.header, children: [_jsxs("div", { style: s.headerTitle, children: [_jsx(Sparkles, { size: 18 }), " ", t('settingsTitle') || 'Ayarlar'] }), _jsx("button", { onClick: onClose, style: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }, children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { style: s.body, children: [_jsx("div", { style: s.sidebar, children: tabs.map(tab => (_jsxs("button", { style: navItemStyle(activeTab === tab.id), onClick: () => setActiveTab(tab.id), children: [tab.icon, " ", tab.label] }, tab.id))) }), _jsxs("div", { style: s.content, children: [activeTab === 'appearance' && (_jsxs("div", { children: [_jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: t('colorTheme') || 'Renk Teması' }), _jsx("div", { style: s.sectionDesc, children: t('pickapremiumcol109') || 'Premium bir tema seçin' }), _jsx("div", { style: s.themeGrid, children: THEMES.map(th => (_jsxs("div", { style: themeCardStyle(theme === th.id), onClick: () => { onSetTheme(th.id); fetch('/save-settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ selected_theme: th.id }) }).catch(() => { }); }, children: [_jsx("div", { style: { height: 40, borderRadius: 4, background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, position: 'relative', overflow: 'hidden' }, children: _jsx("div", { style: { width: 10, height: 10, borderRadius: '50%', background: th.color, boxShadow: `0 0 8px ${th.color}` } }) }), _jsx("div", { style: s.themeName, children: th.name }), _jsx("div", { style: s.themeMeta, children: th.meta })] }, th.id))) })] }), _jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: t('lightDarkMode') || 'Aydınlık/Karanlık' }), _jsx("div", { style: s.sectionDesc, children: t('switchbetweenli112') || 'Aydınlık veya karanlık mod' }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("button", { onClick: () => { if (isDark) {
                                                                onToggleDark();
                                                                fetch('/save-settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ theme_mode: 'light' }) }).catch(() => { });
                                                            } }, style: {
                                                                ...s.btnStatic, flex: 1, justifyContent: 'center',
                                                                background: !isDark ? 'var(--accent)' : 'var(--bg-surface)',
                                                                color: !isDark ? 'white' : 'var(--text-muted)',
                                                            }, children: ["\u2600\uFE0F ", t('light') || 'Aydınlık'] }), _jsxs("button", { onClick: () => { if (!isDark) {
                                                                onToggleDark();
                                                                fetch('/save-settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ theme_mode: 'dark' }) }).catch(() => { });
                                                            } }, style: {
                                                                ...s.btnStatic, flex: 1, justifyContent: 'center',
                                                                background: isDark ? 'var(--accent)' : 'var(--bg-surface)',
                                                                color: isDark ? 'white' : 'var(--text-muted)',
                                                            }, children: ["\uD83C\uDF19 ", t('dark') || 'Karanlık'] })] })] }), _jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: t('themetransition113') || 'Tema Geçişi' }), _jsx("div", { style: s.sectionDesc, children: t('smoothtransitio114') || 'Yumuşak tema geçişleri' }), _jsxs("label", { style: s.toggleRow, children: [_jsx("span", { style: s.toggleLabel, children: t('enableanimation115') || 'Animasyonları Etkinleştir' }), _jsx("button", { style: toggleStyle(true), onClick: () => { }, children: _jsx("div", { style: toggleKnobStyle(true) }) })] })] })] })), activeTab === 'language' && (_jsx("div", { children: _jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: t('chooseLanguage') || 'Dil Seçimi' }), _jsx("div", { style: s.sectionDesc, children: t('chooseyourprefe116') || 'Tercih ettiğiniz dili seçin' }), _jsxs("div", { style: langCardStyle(language === 'tr'), onClick: () => { if (language !== 'tr') {
                                                    onToggleLanguage();
                                                    fetch('/api/v1/set-language', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: 'tr' }) }).catch(() => { });
                                                } }, children: [_jsx("span", { style: { fontSize: 24 }, children: "\uD83C\uDDF9\uD83C\uDDF7" }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 14 }, children: "T\u00FCrk\u00E7e" }), _jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)' }, children: t('turkishinterfac117') || 'Türkçe arayüz' })] }), language === 'tr' && _jsx("span", { style: { color: 'var(--accent)', fontSize: 18 }, children: "\u2713" })] }), _jsxs("div", { style: langCardStyle(language === 'en'), onClick: () => { if (language !== 'en') {
                                                    onToggleLanguage();
                                                    fetch('/api/v1/set-language', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: 'en' }) }).catch(() => { });
                                                } }, children: [_jsx("span", { style: { fontSize: 24 }, children: "\uD83C\uDDEC\uD83C\uDDE7" }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 14 }, children: "English" }), _jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)' }, children: t('englishinterfac118') || 'English interface' })] }), language === 'en' && _jsx("span", { style: { color: 'var(--accent)', fontSize: 18 }, children: "\u2713" })] })] }) })), activeTab === 'account' && (_jsx("div", { children: _jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: t('personalAvatar') || 'Profil Resmi' }), _jsx("div", { style: s.sectionDesc, children: t('uploadyourprofi119') || 'Profil resminizi yükleyin' }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", style: { display: 'none' }, onChange: async (e) => { const f = e.target.files?.[0]; if (f) {
                                                    const b64 = await encodeFileAsBase64(f);
                                                    await fetch('/save-settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken }, body: JSON.stringify({ personal_avatar_base64: b64 }) });
                                                } } }), _jsxs("button", { onClick: () => fileInputRef.current?.click(), style: { ...s.btnStatic, background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }, children: [_jsx(Upload, { size: 14 }), " ", t('upload') || 'Yükle'] })] }) })), activeTab === 'production' && (_jsxs("div", { children: [_jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: t('textGridPosition') || 'Metin Izgara Konumu' }), _jsx("div", { style: s.sectionDesc, children: t('textpositioning120') || 'Video üzerindeki metin konumu' }), _jsxs("select", { style: s.select, value: textGrid, onChange: e => setTextGrid(e.target.value), children: [_jsx("option", { value: "top-left", children: t('topLeft') || 'Sol Üst' }), _jsx("option", { value: "top-right", children: t('topRight') || 'Sağ Üst' }), _jsx("option", { value: "center", children: t('center') || 'Orta' }), _jsx("option", { value: "bottom-left", children: t('bottomLeft') || 'Sol Alt' }), _jsx("option", { value: "bottom-right", children: t('bottomRight') || 'Sağ Alt' })] })] }), _jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: t('narratorTone') || 'Anlatıcı Tonu' }), _jsx("div", { style: s.sectionDesc, children: t('defaultnarrator121') || 'Varsayılan anlatıcı tonu' }), _jsx("input", { style: s.input, value: narratorTone, onChange: e => setNarratorTone(e.target.value), placeholder: t('defaultNarratorPlaceholder') || 'Örn: Profesyonel, samimi, dramatik' })] }), _jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: "YouTube API Key" }), _jsx("div", { style: s.sectionDesc, children: t('apikeyforyoutub122') || 'YouTube Data API anahtarı' }), _jsx("input", { style: { ...s.input, fontFamily: 'var(--font-mono)' }, value: ytApiKey, onChange: e => setYtApiKey(e.target.value), placeholder: "AIzaSy..." })] }), _jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: t('wav2liplipsync123') || 'Wav2Lip Senkronizasyonu' }), _jsx("div", { style: s.sectionDesc, children: t('reallipsyncviaw124') || 'Gerçek dudak senkronizasyonu' }), _jsxs("label", { style: s.toggleRow, children: [_jsx("span", { style: s.toggleLabel, children: t('enablelipsync125') || 'Dudak senkronizasyonu' }), _jsx("button", { style: toggleStyle(applyLipsync), onClick: () => setApplyLipsync(!applyLipsync), children: _jsx("div", { style: toggleKnobStyle(applyLipsync) }) })] })] }), _jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: t('endscreenoverla126') || 'Bitiş Ekranı' }), _jsx("div", { style: s.sectionDesc, children: t('addsavatarwatch127') || 'Avatar ve kanal abone ekranı' }), _jsxs("label", { style: s.toggleRow, children: [_jsx("span", { style: s.toggleLabel, children: t('enableendscreen128') || 'Bitiş ekranı' }), _jsx("button", { style: toggleStyle(applyEndScreen), onClick: () => setApplyEndScreen(!applyEndScreen), children: _jsx("div", { style: toggleKnobStyle(applyEndScreen) }) })] })] }), _jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: "Marka Kimli\u011Fi (Brand Kit)" }), _jsx("div", { style: s.sectionDesc, children: "Videolarda kullan\u0131lacak marka logosu, renkler ve yaz\u0131 tipi" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }, children: [_jsxs("div", { children: [_jsx("label", { style: s.label, children: "Marka Logosu" }), _jsx("input", { ref: brandLogoInputRef, type: "file", accept: "image/*", style: { display: 'none' }, onChange: async (e) => { const f = e.target.files?.[0]; if (f)
                                                                        setBrandLogo(await encodeFileAsBase64(f)); } }), _jsxs("button", { onClick: () => brandLogoInputRef.current?.click(), style: { ...s.btnStatic, background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }, children: [_jsx(Upload, { size: 14 }), " Y\u00FCkle"] }), brandLogo && _jsx("div", { style: { marginTop: 4, fontSize: 11, color: 'var(--success)' }, children: "\u2713 Y\u00FCklendi" })] }), _jsxs("div", { children: [_jsx("label", { style: s.label, children: "Birincil Renk" }), _jsx("input", { type: "color", value: brandPrimaryColor, onChange: e => setBrandPrimaryColor(e.target.value), style: { width: '100%', height: 36, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-surface)', cursor: 'pointer', padding: 2 } })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }, children: [_jsxs("div", { children: [_jsx("label", { style: s.label, children: "\u0130kincil Renk" }), _jsx("input", { type: "color", value: brandSecondaryColor, onChange: e => setBrandSecondaryColor(e.target.value), style: { width: '100%', height: 36, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-surface)', cursor: 'pointer', padding: 2 } })] }), _jsxs("div", { children: [_jsx("label", { style: s.label, children: "Yaz\u0131 Tipi" }), _jsx("input", { style: s.input, value: brandFontPath, onChange: e => setBrandFontPath(e.target.value), placeholder: "Arial" })] })] })] }), _jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: "Ses Klonlama (Voice Cloning)" }), _jsx("div", { style: s.sectionDesc, children: "Kendi sesinizi klonlamak i\u00E7in k\u0131sa bir ses kayd\u0131 y\u00FCkleyin" }), _jsx("input", { ref: voiceInputRef, type: "file", accept: "audio/*", style: { display: 'none' }, onChange: async (e) => { const f = e.target.files?.[0]; if (f)
                                                        setPersonalVoice(await encodeFileAsBase64(f)); } }), _jsxs("button", { onClick: () => voiceInputRef.current?.click(), style: { ...s.btnStatic, background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }, children: [_jsx(Upload, { size: 14 }), " Ses Dosyas\u0131 Y\u00FCkle"] }), personalVoice && _jsx("div", { style: { marginTop: 4, fontSize: 11, color: 'var(--success)' }, children: "\u2713 Ses dosyas\u0131 y\u00FCklendi" })] }), _jsxs("button", { onClick: saveSettings, disabled: saving, style: { ...s.btnStatic, background: 'var(--accent)', color: 'white', marginTop: 16 }, children: [saving ? _jsx(Loader, { size: 14, className: "spin" }) : _jsx(Save, { size: 14 }), t('saveSettings') || 'Kaydet'] })] })), activeTab === 'characters' && (_jsxs("div", { children: [_jsxs("div", { style: s.section, children: [_jsx("div", { style: s.sectionTitle, children: "\u2728 Yeni Karakter Ekle" }), _jsx("div", { style: s.sectionDesc, children: "Videolar\u0131n\u0131zda @karakter_ad\u0131 ile \u00E7a\u011F\u0131rabilece\u011Finiz karakterler" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsx("input", { style: s.input, value: newCharName, onChange: e => setNewCharName(e.target.value), placeholder: "Karakter ad\u0131 (\u00F6rn: sibel)" }), _jsx("textarea", { style: { ...s.input, minHeight: 60, resize: 'vertical' }, value: newCharDesc, onChange: e => setNewCharDesc(e.target.value), placeholder: "Fiziksel \u00F6zellikler (avatar promptu)" }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: () => setAvatarStyleSetting('realistic'), style: { ...s.btnStatic, flex: 1, justifyContent: 'center', background: avatarStyleSetting === 'realistic' ? 'var(--accent)' : 'var(--bg-surface)', color: avatarStyleSetting === 'realistic' ? 'white' : 'var(--text-muted)', border: '1px solid var(--border)' }, children: "Ger\u00E7ek\u00E7i" }), _jsx("button", { onClick: () => setAvatarStyleSetting('animatic'), style: { ...s.btnStatic, flex: 1, justifyContent: 'center', background: avatarStyleSetting === 'animatic' ? 'var(--accent)' : 'var(--bg-surface)', color: avatarStyleSetting === 'animatic' ? 'white' : 'var(--text-muted)', border: '1px solid var(--border)' }, children: "Animatik" })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("input", { ref: charAvatarInputRef, type: "file", accept: "image/*", style: { display: 'none' }, onChange: async (e) => { const f = e.target.files?.[0]; if (f)
                                                                        setNewCharAvatar(await encodeFileAsBase64(f)); } }), _jsxs("button", { onClick: () => charAvatarInputRef.current?.click(), style: { ...s.btnStatic, background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }, children: [_jsx(Upload, { size: 14 }), " Foto\u011Fraf Y\u00FCkle"] }), _jsxs("button", { onClick: generateAvatar, disabled: generatingAvatar, style: { ...s.btnStatic, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', color: 'white' }, children: [generatingAvatar ? _jsx(Loader, { size: 14, className: "spin" }) : _jsx(Sparkles, { size: 14 }), " SD Avatar \u00DCret"] }), newCharAvatar && (_jsxs("button", { onClick: () => setEditingAvatarUrl(newCharAvatar), style: { ...s.btnStatic, background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }, children: [_jsx(Wand2, { size: 14 }), " D\u00FCzenle"] })), _jsxs("button", { onClick: createCharacter, disabled: loading || !newCharName.trim(), style: { ...s.btnStatic, background: 'var(--accent)', color: 'white' }, children: [loading ? _jsx(Loader, { size: 14, className: "spin" }) : _jsx(User, { size: 14 }), " Ekle"] })] }), newCharAvatar && (_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }, children: [_jsx("img", { src: newCharAvatar, alt: "Avatar preview", style: { width: 80, height: 80, borderRadius: 8, objectFit: 'cover' } }), _jsxs("span", { style: { fontSize: 10, color: 'var(--text-muted)' }, children: ["Kaynak: ", newCharAvatar.startsWith('data:') ? 'AI/Yükleme' : 'URL'] })] })), editingAvatarUrl && (_jsx(PhotoEditor, { imageUrl: editingAvatarUrl, onSave: handleAvatarSave, onClose: () => setEditingAvatarUrl(null) }))] })] }), _jsxs("div", { style: s.section, children: [_jsxs("div", { style: s.sectionTitle, children: ["\uD83D\uDC65 Kay\u0131tl\u0131 Karakterler (", characters.length, ")"] }), characters.length === 0 ? (_jsx("div", { style: { fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }, children: "Hen\u00FCz karakter eklenmemi\u015F." })) : (characters.map(c => (_jsxs("div", { style: s.charCard, children: [_jsx("div", { style: s.charAvatar, children: c.reference_image_base64
                                                                ? _jsx("img", { src: c.reference_image_base64, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })
                                                                : _jsx(User, { size: 18, style: { color: 'var(--accent)' } }) }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { fontWeight: 600, fontSize: 13 }, children: ["@", c.name] }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: c.description || 'Açıklama yok' })] }), _jsx("button", { onClick: () => deleteCharacter(c.id), style: { ...s.btnStatic, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }, children: _jsx(Trash2, { size: 14 }) })] }, c.id))))] })] }))] })] })] }) }));
}
