import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { UserPlus, User, Edit3, Trash2, Image as ImageIcon, Loader, Wand2, Sparkles } from 'lucide-react';
import { PhotoEditor } from './PhotoEditor.js';
const ARCHETYPES = ['protagonist', 'mentor', 'comic_relief', 'antagonist', 'supporting', 'narrator'];
const VOICE_PROVIDERS = ['edge', 'openai', 'xtts'];
const VOICE_DEFAULTS = {
    edge: 'tr-TR-AhmetNeural',
    openai: 'alloy',
    xtts: '',
};
const s = {
    panel: {
        background: 'var(--card)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    sectionTitle: {
        fontSize: '12px',
        fontWeight: 'bold',
        color: 'var(--primary)',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    card: {
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '10px',
    },
    cardBody: {
        flex: 1,
        minWidth: 0,
    },
    cardName: {
        fontSize: '13px',
        fontWeight: 'bold',
        color: 'white',
        marginBottom: '2px',
    },
    cardDesc: {
        fontSize: '11px',
        color: 'var(--text-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginBottom: '4px',
    },
    cardMeta: {
        fontSize: '10px',
        color: 'var(--text-muted)',
        display: 'flex',
        gap: '12px',
    },
    cardActions: {
        display: 'flex',
        gap: '6px',
        flexShrink: 0,
    },
    iconBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '16px',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    label: {
        fontSize: '10px',
        color: 'var(--text-muted)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
    },
    input: {
        width: '100%',
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        color: 'white',
        padding: '7px 10px',
        fontSize: '12px',
        outline: 'none',
    },
    textarea: {
        width: '100%',
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        color: 'white',
        padding: '7px 10px',
        fontSize: '12px',
        outline: 'none',
        resize: 'none',
        minHeight: '60px',
    },
    select: {
        width: '100%',
        background: '#070a14',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        color: 'white',
        padding: '7px 10px',
        fontSize: '12px',
        outline: 'none',
    },
    fileRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    fileBtn: {
        background: 'rgba(0, 242, 254, 0.08)',
        border: '1px dashed var(--border)',
        borderRadius: '4px',
        color: 'var(--primary)',
        padding: '6px 12px',
        fontSize: '11px',
        cursor: 'pointer',
    },
    formActions: {
        display: 'flex',
        gap: '8px',
        marginTop: '4px',
    },
    btnPrimary: {
        flex: 1,
        background: 'var(--primary)',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
    },
    btnCancel: {
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        color: 'var(--text-muted)',
        padding: '8px 12px',
        fontSize: '12px',
        cursor: 'pointer',
    },
    empty: {
        textAlign: 'center',
        padding: '24px',
        fontSize: '12px',
        color: 'var(--text-muted)',
    },
    thread: {
        width: '40px',
        height: '40px',
        borderRadius: '6px',
        background: 'rgba(0, 242, 254, 0.05)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
    },
    thumb: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
};
export function CharacterCreationPanel({ csrfToken, onCharactersChange }) {
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [roleArchetype, setRoleArchetype] = useState('protagonist');
    const [voiceProvider, setVoiceProvider] = useState('edge');
    const [voiceId, setVoiceId] = useState(VOICE_DEFAULTS.edge);
    const [referenceImage, setReferenceImage] = useState('');
    const [avatarStyle, setAvatarStyle] = useState('realistic');
    const [avatarSource, setAvatarSource] = useState('ai');
    const [editingAvatarUrl, setEditingAvatarUrl] = useState(null);
    const [generatingAvatar, setGeneratingAvatar] = useState(false);
    const fetchCharacters = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/characters', { credentials: 'include' });
            if (res.ok) {
                const json = await res.json();
                if (Array.isArray(json.data)) {
                    setCharacters(json.data);
                    onCharactersChange?.(json.data);
                }
            }
        }
        catch {
            /* server may be offline */
        }
        finally {
            setLoading(false);
        }
    }, [onCharactersChange]);
    useEffect(() => {
        fetchCharacters();
    }, [fetchCharacters]);
    const resetForm = () => {
        setName('');
        setDescription('');
        setRoleArchetype('protagonist');
        setVoiceProvider('edge');
        setVoiceId(VOICE_DEFAULTS.edge);
        setReferenceImage('');
        setEditingId(null);
        setShowForm(false);
    };
    const handleEdit = (char) => {
        setName(char.name);
        setDescription(char.description);
        setRoleArchetype(char.role_archetype);
        setVoiceProvider(char.voice_provider);
        setVoiceId(char.voice_id);
        setReferenceImage(char.reference_image || '');
        setEditingId(char.id);
        setShowForm(true);
    };
    const handleProviderChange = (provider) => {
        setVoiceProvider(provider);
        if (!editingId) {
            setVoiceId(VOICE_DEFAULTS[provider] || '');
        }
    };
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            setReferenceImage(reader.result);
            setAvatarSource('upload');
        };
        reader.readAsDataURL(file);
    };
    const handleGenerateAvatar = async () => {
        if (!description.trim())
            return;
        setGeneratingAvatar(true);
        try {
            const res = await fetch('/api/v1/characters/generate-avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, avatar_style: avatarStyle }),
            });
            const data = await res.json();
            if (data.status === 'success' && data.avatar_base64) {
                setReferenceImage(data.avatar_base64);
                setAvatarSource('ai');
            }
        }
        catch { /* ignore */ }
        finally {
            setGeneratingAvatar(false);
        }
    };
    const handleAvatarSave = (newUrl) => {
        setReferenceImage(newUrl);
        setEditingAvatarUrl(null);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim())
            return;
        setSaving(true);
        try {
            const body = {
                name: name.trim(),
                description: description.trim(),
                role_archetype: roleArchetype,
                voice_provider: voiceProvider,
                voice_id: voiceId,
            };
            if (referenceImage) {
                body.reference_image = referenceImage;
            }
            const url = editingId ? `/api/v1/characters/${editingId}` : '/api/v1/characters';
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken,
                },
                credentials: 'include',
                body: JSON.stringify(body),
            });
            if (res.ok) {
                resetForm();
                await fetchCharacters();
            }
        }
        catch {
            /* handle silently */
        }
        finally {
            setSaving(false);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm('Bu karakteri silmek istediğinize emin misiniz?'))
            return;
        try {
            const res = await fetch(`/api/v1/characters/${id}`, {
                method: 'DELETE',
                headers: { 'X-CSRF-Token': csrfToken },
                credentials: 'include',
            });
            if (res.ok) {
                await fetchCharacters();
            }
        }
        catch {
            /* handle silently */
        }
    };
    return (_jsxs("div", { style: s.panel, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { style: s.sectionTitle, children: [_jsx(User, { size: 14 }), "KARAKTERLER"] }), !showForm && (_jsx("button", { onClick: () => setShowForm(true), style: s.iconBtn, title: "Yeni Karakter", children: _jsx(UserPlus, { size: 16, style: { color: 'var(--primary)' } }) }))] }), showForm && (_jsxs("form", { onSubmit: handleSubmit, style: s.form, children: [_jsxs("div", { style: s.field, children: [_jsx("label", { style: s.label, children: "Karakter Ad\u0131 *" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "\u00D6rn: Miki Fare", required: true, style: s.input })] }), _jsxs("div", { style: s.field, children: [_jsx("label", { style: s.label, children: "Fiziksel / Ki\u015Fisel Tasvir" }), _jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value), placeholder: "small brown mouse with big ears, blue overalls", style: s.textarea })] }), _jsxs("div", { style: s.field, children: [_jsx("label", { style: s.label, children: "Rol / Arketip" }), _jsx("select", { value: roleArchetype, onChange: (e) => setRoleArchetype(e.target.value), style: s.select, children: ARCHETYPES.map((a) => (_jsx("option", { value: a, children: a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }, a))) })] }), _jsxs("div", { style: s.field, children: [_jsx("label", { style: s.label, children: "Ses Sa\u011Flay\u0131c\u0131" }), _jsx("select", { value: voiceProvider, onChange: (e) => handleProviderChange(e.target.value), style: s.select, children: VOICE_PROVIDERS.map((vp) => (_jsx("option", { value: vp, children: vp === 'edge' ? 'Edge Speech' : vp === 'openai' ? 'OpenAI TTS' : 'XTTS' }, vp))) })] }), _jsxs("div", { style: s.field, children: [_jsx("label", { style: s.label, children: "Ses ID" }), _jsx("input", { type: "text", value: voiceId, onChange: (e) => setVoiceId(e.target.value), placeholder: VOICE_DEFAULTS[voiceProvider] || 'Ses ID girin...', style: s.input })] }), _jsxs("div", { style: s.field, children: [_jsx("label", { style: s.label, children: "Avatar Stili" }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx("button", { type: "button", onClick: () => setAvatarStyle('realistic'), style: {
                                            flex: 1, padding: '6px 8px', fontSize: '11px', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                            background: avatarStyle === 'realistic' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            color: avatarStyle === 'realistic' ? '#0b0f19' : 'var(--text-muted)',
                                        }, children: "Ger\u00E7ek\u00E7i" }), _jsx("button", { type: "button", onClick: () => setAvatarStyle('animatic'), style: {
                                            flex: 1, padding: '6px 8px', fontSize: '11px', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                            background: avatarStyle === 'animatic' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            color: avatarStyle === 'animatic' ? '#0b0f19' : 'var(--text-muted)',
                                        }, children: "Animatik" })] })] }), _jsxs("div", { style: s.field, children: [_jsx("label", { style: s.label, children: "Referans G\u00F6rseli" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsxs("div", { style: s.fileRow, children: [_jsxs("label", { style: s.fileBtn, children: [_jsx("input", { type: "file", accept: "image/*", onChange: handleImageUpload, style: { display: 'none' } }), _jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(ImageIcon, { size: 12 }), referenceImage ? 'Değiştir' : 'Yükle'] })] }), _jsxs("button", { type: "button", onClick: handleGenerateAvatar, disabled: generatingAvatar || !description.trim(), style: {
                                                    ...s.fileBtn, borderStyle: 'solid',
                                                    opacity: generatingAvatar || !description.trim() ? 0.5 : 1,
                                                }, children: [generatingAvatar ? (_jsx(Loader, { size: 12, className: "pulse" })) : (_jsx(Sparkles, { size: 12 })), "AI \u00DCret"] }), referenceImage && (_jsxs("button", { type: "button", onClick: () => setEditingAvatarUrl(referenceImage), style: { ...s.fileBtn, borderStyle: 'solid' }, children: [_jsx(Wand2, { size: 12 }), " D\u00FCzenle"] }))] }), referenceImage && (_jsxs("span", { style: { fontSize: '10px', color: avatarSource === 'ai' ? 'var(--primary)' : 'var(--success)' }, children: ["Kaynak: ", avatarSource === 'ai' ? 'AI Üretimi' : 'Yükleme'] }))] })] }), referenceImage && (_jsx("div", { style: { width: 80, height: 80, borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }, children: _jsx("img", { src: referenceImage, alt: "preview", style: { width: '100%', height: '100%', objectFit: 'cover' } }) })), _jsxs("div", { style: s.formActions, children: [_jsxs("button", { type: "submit", disabled: saving || !name.trim(), style: {
                                    ...s.btnPrimary,
                                    opacity: saving || !name.trim() ? 0.5 : 1,
                                }, children: [saving ? _jsx(Loader, { size: 12, className: "pulse" }) : null, editingId ? 'Güncelle' : 'Oluştur'] }), _jsx("button", { type: "button", onClick: resetForm, style: s.btnCancel, children: "\u0130ptal" })] })] })), loading ? (_jsxs("div", { style: s.empty, children: [_jsx(Loader, { size: 14, className: "pulse", style: { marginRight: 6 } }), "Y\u00FCkleniyor..."] })) : characters.length === 0 ? (_jsx("div", { style: s.empty, children: "Hen\u00FCz karakter eklenmemi\u015F. \"Yeni Karakter\" butonuna t\u0131klayarak ba\u015Flay\u0131n." })) : (_jsx("div", { style: s.list, children: characters.map((char) => (_jsxs("div", { style: s.card, children: [_jsx("div", { style: s.thread, children: char.reference_image ? (_jsx("img", { src: char.reference_image, alt: char.name, style: s.thumb })) : (_jsx(User, { size: 18, style: { color: 'var(--text-muted)', opacity: 0.4 } })) }), _jsxs("div", { style: s.cardBody, children: [_jsx("div", { style: s.cardName, children: char.name }), _jsx("div", { style: s.cardDesc, children: char.description }), _jsxs("div", { style: s.cardMeta, children: [_jsx("span", { children: char.role_archetype.replace(/_/g, ' ') }), _jsxs("span", { children: [char.voice_provider, " / ", char.voice_id] })] })] }), _jsxs("div", { style: s.cardActions, children: [_jsx("button", { onClick: () => handleEdit(char), style: { ...s.iconBtn, color: 'var(--primary)' }, title: "D\u00FCzenle", children: _jsx(Edit3, { size: 14 }) }), _jsx("button", { onClick: () => handleDelete(char.id), style: { ...s.iconBtn, color: 'rgba(239, 68, 68, 0.7)' }, title: "Sil", children: _jsx(Trash2, { size: 14 }) })] })] }, char.id))) })), editingAvatarUrl && (_jsx(PhotoEditor, { imageUrl: editingAvatarUrl, onSave: handleAvatarSave, onClose: () => setEditingAvatarUrl(null) }))] }));
}
