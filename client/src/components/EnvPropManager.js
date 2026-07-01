import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, X, Tag, Palette, MapPin, Sun, Layers } from 'lucide-react';
const ENV_CATEGORIES = ['indoor', 'outdoor', 'fantasy', 'sci-fi', 'historical', 'nature', 'urban', 'abstract', 'custom'];
const PROP_CATEGORIES = ['furniture', 'vehicle', 'weapon', 'technology', 'natural', 'decoration', 'lighting', 'costume', 'food', 'animal', 'custom'];
const CATEGORY_COLORS = {
    indoor: 'hsl(210,60%,55%)',
    outdoor: 'hsl(120,55%,45%)',
    fantasy: 'hsl(280,70%,60%)',
    'sci-fi': 'hsl(190,80%,50%)',
    historical: 'hsl(35,60%,50%)',
    nature: 'hsl(150,60%,40%)',
    urban: 'hsl(0,0%,50%)',
    abstract: 'hsl(320,70%,55%)',
    furniture: 'hsl(25,50%,55%)',
    vehicle: 'hsl(200,65%,50%)',
    weapon: 'hsl(0,70%,50%)',
    technology: 'hsl(170,70%,45%)',
    natural: 'hsl(130,55%,45%)',
    decoration: 'hsl(340,60%,55%)',
    lighting: 'hsl(45,90%,50%)',
    costume: 'hsl(300,60%,55%)',
    food: 'hsl(15,80%,55%)',
    animal: 'hsl(30,70%,50%)',
    custom: 'hsl(0,0%,60%)',
};
const defaultEnvForm = {
    name: '', category: 'indoor', description: '', mood_tags: '', color_palette: '', lighting_notes: '',
};
const defaultPropForm = {
    name: '', category: 'furniture', description: '', environment_id: null, interaction_notes: '',
};
const m = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
    },
    modal: {
        background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
        width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)', overflow: 'hidden',
    },
    modalHeader: {
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
    },
    modalBody: {
        padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14,
    },
    modalFooter: {
        padding: '14px 20px', borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0,
    },
    categoryBadge: (cat) => ({
        display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4,
        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
        background: `${CATEGORY_COLORS[cat] || CATEGORY_COLORS.custom}20`,
        color: CATEGORY_COLORS[cat] || CATEGORY_COLORS.custom,
        border: `1px solid ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.custom}40`,
    }),
    colorCircle: (hex) => ({
        width: 16, height: 16, borderRadius: '50%', background: hex,
        border: '1px solid var(--border)', flexShrink: 0,
    }),
};
export function EnvPropManager({ language }) {
    const isTr = language === 'tr';
    const t = useCallback((tr, en) => isTr ? tr : en, [isTr]);
    const [tab, setTab] = useState('env');
    const [environments, setEnvironments] = useState([]);
    const [props, setProps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filterEnvId, setFilterEnvId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [envForm, setEnvForm] = useState(defaultEnvForm);
    const [propForm, setPropForm] = useState(defaultPropForm);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const styles = {
        panel: {
            flex: 1, padding: '24px', overflowY: 'auto', position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto',
        },
        tabs: {
            display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-primary)',
            borderRadius: 10, padding: 4, border: '1px solid var(--border)',
        },
        tab: (active) => ({
            flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: active ? 'var(--bg-surface)' : 'transparent',
            color: active ? 'var(--text-primary)' : 'var(--text-muted)',
            transition: 'all 0.2s',
        }),
        headerRow: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
        },
        envCard: {
            background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10,
            padding: 16, marginBottom: 10,
        },
        propCard: {
            background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '10px 14px', marginBottom: 6,
        },
        cardTop: {
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8,
        },
        cardTitle: {
            fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8,
        },
        tagChip: {
            display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4,
            fontSize: 10, background: 'hsla(var(--primary),0.08)', color: 'hsl(var(--primary))',
            border: '1px solid hsla(var(--primary),0.15)',
        },
        paletteRow: {
            display: 'flex', gap: 4, alignItems: 'center', marginTop: 4,
        },
        btn: {
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s',
        },
        btnPrimary: {
            background: 'linear-gradient(135deg, #7F00FF, #FF007F)', color: 'white',
        },
        btnSecondary: {
            background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)',
        },
        btnDanger: {
            background: 'hsla(0,70%,50%,0.15)', border: '1px solid hsla(0,70%,50%,0.3)', color: 'hsl(0,70%,55%)',
        },
        btnSmall: {
            padding: '5px 10px', fontSize: 11,
        },
        label: {
            display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
            marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em',
        },
        input: {
            width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
            outline: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
        },
        textarea: {
            width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
            outline: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
            resize: 'vertical', minHeight: 60,
        },
        select: {
            width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
            outline: 'none', cursor: 'pointer',
        },
        empty: {
            fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px 0', textAlign: 'center',
        },
        actionRow: {
            display: 'flex', gap: 4, flexShrink: 0,
        },
    };
    const fetchEnvironments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/env-props/environments');
            const d = await res.json();
            if (d.status === 'success')
                setEnvironments(d.data || []);
        }
        catch { /* ignore */ }
        setLoading(false);
    };
    const fetchProps = async () => {
        setLoading(true);
        try {
            const qs = filterEnvId ? `?environment_id=${filterEnvId}` : '';
            const res = await fetch(`/api/v1/env-props/props${qs}`);
            const d = await res.json();
            if (d.status === 'success')
                setProps(d.data || []);
        }
        catch { /* ignore */ }
        setLoading(false);
    };
    useEffect(() => { fetchEnvironments(); }, []);
    useEffect(() => { fetchProps(); }, [filterEnvId]);
    const openAddEnv = () => {
        setEditingId(null);
        setEnvForm(defaultEnvForm);
        setError('');
        setShowModal(true);
    };
    const openEditEnv = (env) => {
        setEditingId(env.id);
        setEnvForm({
            name: env.name,
            category: env.category,
            description: env.description || '',
            mood_tags: (env.mood_tags || []).join(', '),
            color_palette: (env.color_palette || []).join(', '),
            lighting_notes: env.lighting_notes || '',
        });
        setError('');
        setShowModal(true);
    };
    const openAddProp = () => {
        setEditingId(null);
        setPropForm(defaultPropForm);
        setError('');
        setShowModal(true);
    };
    const openEditProp = (p) => {
        setEditingId(p.id);
        setPropForm({
            name: p.name,
            category: p.category,
            description: p.description || '',
            environment_id: p.environment_id,
            interaction_notes: p.interaction_notes || '',
        });
        setError('');
        setShowModal(true);
    };
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setError('');
    };
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget)
            handleCloseModal();
    };
    useEffect(() => {
        if (!showModal)
            return;
        const handler = (e) => {
            if (e.key === 'Escape')
                handleCloseModal();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [showModal]);
    const validateEnvForm = () => {
        if (!envForm.name.trim())
            return t('İsim zorunludur.', 'Name is required.');
        if (!ENV_CATEGORIES.includes(envForm.category))
            return t('Geçersiz kategori.', 'Invalid category.');
        return null;
    };
    const validatePropForm = () => {
        if (!propForm.name.trim())
            return t('İsim zorunludur.', 'Name is required.');
        if (!PROP_CATEGORIES.includes(propForm.category))
            return t('Geçersiz kategori.', 'Invalid category.');
        return null;
    };
    const saveEnv = async () => {
        const err = validateEnvForm();
        if (err) {
            setError(err);
            return;
        }
        setSaving(true);
        setError('');
        try {
            const body = {
                name: envForm.name.trim(),
                category: envForm.category,
                description: envForm.description.trim(),
                mood_tags: envForm.mood_tags.split(',').map(s => s.trim()).filter(Boolean),
                color_palette: envForm.color_palette.split(',').map(s => s.trim()).filter(Boolean),
                lighting_notes: envForm.lighting_notes.trim(),
            };
            if (editingId) {
                const res = await fetch(`/api/v1/env-props/environments/${editingId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
                });
                const d = await res.json();
                if (d.status !== 'success') {
                    setError(d.error || t('Güncellenemedi.', 'Failed to update.'));
                    setSaving(false);
                    return;
                }
            }
            else {
                const res = await fetch('/api/v1/env-props/environments', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
                });
                const d = await res.json();
                if (d.status !== 'success') {
                    setError(d.error || t('Oluşturulamadı.', 'Failed to create.'));
                    setSaving(false);
                    return;
                }
            }
            handleCloseModal();
            fetchEnvironments();
        }
        catch (e) {
            setError(e.message || t('Bağlantı hatası.', 'Connection error.'));
        }
        setSaving(false);
    };
    const saveProp = async () => {
        const err = validatePropForm();
        if (err) {
            setError(err);
            return;
        }
        setSaving(true);
        setError('');
        try {
            const body = {
                name: propForm.name.trim(),
                category: propForm.category,
                description: propForm.description.trim(),
                environment_id: propForm.environment_id,
                interaction_notes: propForm.interaction_notes.trim(),
            };
            if (editingId) {
                const res = await fetch(`/api/v1/env-props/props/${editingId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
                });
                const d = await res.json();
                if (d.status !== 'success') {
                    setError(d.error || t('Güncellenemedi.', 'Failed to update.'));
                    setSaving(false);
                    return;
                }
            }
            else {
                const res = await fetch('/api/v1/env-props/props', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
                });
                const d = await res.json();
                if (d.status !== 'success') {
                    setError(d.error || t('Oluşturulamadı.', 'Failed to create.'));
                    setSaving(false);
                    return;
                }
            }
            handleCloseModal();
            fetchProps();
        }
        catch (e) {
            setError(e.message || t('Bağlantı hatası.', 'Connection error.'));
        }
        setSaving(false);
    };
    const deleteEnv = async (id) => {
        try {
            const res = await fetch(`/api/v1/env-props/environments/${id}`, { method: 'DELETE' });
            const d = await res.json();
            if (d.status === 'success') {
                fetchEnvironments();
                setDeleteConfirm(null);
            }
        }
        catch { /* ignore */ }
    };
    const deleteProp = async (id) => {
        try {
            const res = await fetch(`/api/v1/env-props/props/${id}`, { method: 'DELETE' });
            const d = await res.json();
            if (d.status === 'success') {
                fetchProps();
                setDeleteConfirm(null);
            }
        }
        catch { /* ignore */ }
    };
    const renderModal = () => {
        if (!showModal)
            return null;
        const isEnvForm = tab === 'env';
        return (_jsx("div", { style: m.overlay, onClick: handleOverlayClick, children: _jsxs("div", { style: m.modal, onClick: e => e.stopPropagation(), children: [_jsxs("div", { style: m.modalHeader, children: [_jsx("span", { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }, children: editingId ? (isEnvForm ? t('Ortam Düzenle', 'Edit Environment') : t('Nesne Düzenle', 'Edit Prop')) : (isEnvForm ? t('Yeni Ortam', 'New Environment') : t('Yeni Nesne', 'New Prop')) }), _jsx("button", { onClick: handleCloseModal, style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }, children: _jsx(X, { size: 18 }) })] }), _jsxs("div", { style: m.modalBody, children: [isEnvForm ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("label", { style: styles.label, children: [t('İSİM', 'NAME'), " *"] }), _jsx("input", { style: styles.input, value: envForm.name, onChange: e => setEnvForm({ ...envForm, name: e.target.value }), placeholder: t('Ortam adı', 'Environment name') })] }), _jsxs("div", { children: [_jsxs("label", { style: styles.label, children: [t('KATEGORİ', 'CATEGORY'), " *"] }), _jsx("select", { style: styles.select, value: envForm.category, onChange: e => setEnvForm({ ...envForm, category: e.target.value }), children: ENV_CATEGORIES.map(c => _jsx("option", { value: c, children: c }, c)) })] }), _jsxs("div", { children: [_jsx("label", { style: styles.label, children: t('AÇIKLAMA', 'DESCRIPTION') }), _jsx("textarea", { style: styles.textarea, value: envForm.description, onChange: e => setEnvForm({ ...envForm, description: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { style: styles.label, children: t('RÖNTAGLAR (virgülle ayır)', 'MOOD TAGS (comma-separated)') }), _jsx("input", { style: styles.input, value: envForm.mood_tags, onChange: e => setEnvForm({ ...envForm, mood_tags: e.target.value }), placeholder: t('karanlık, gizemli, büyüleyici', 'dark, mysterious, enchanting') })] }), _jsxs("div", { children: [_jsx("label", { style: styles.label, children: t('RENK PALETİ (hex, virgülle ayır)', 'COLOR PALETTE (hex, comma-separated)') }), _jsx("input", { style: styles.input, value: envForm.color_palette, onChange: e => setEnvForm({ ...envForm, color_palette: e.target.value }), placeholder: "#1a1a2e, #16213e, #0f3460" })] }), _jsxs("div", { children: [_jsx("label", { style: styles.label, children: t('IŞIK NOTLARI', 'LIGHTING NOTES') }), _jsx("textarea", { style: styles.textarea, value: envForm.lighting_notes, onChange: e => setEnvForm({ ...envForm, lighting_notes: e.target.value }), placeholder: t('Loş ışık, arkadan aydınlatma...', 'Dim light, backlighting...') })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsxs("label", { style: styles.label, children: [t('İSİM', 'NAME'), " *"] }), _jsx("input", { style: styles.input, value: propForm.name, onChange: e => setPropForm({ ...propForm, name: e.target.value }), placeholder: t('Nesne adı', 'Prop name') })] }), _jsxs("div", { children: [_jsxs("label", { style: styles.label, children: [t('KATEGORİ', 'CATEGORY'), " *"] }), _jsx("select", { style: styles.select, value: propForm.category, onChange: e => setPropForm({ ...propForm, category: e.target.value }), children: PROP_CATEGORIES.map(c => _jsx("option", { value: c, children: c }, c)) })] }), _jsxs("div", { children: [_jsx("label", { style: styles.label, children: t('AÇIKLAMA', 'DESCRIPTION') }), _jsx("textarea", { style: styles.textarea, value: propForm.description, onChange: e => setPropForm({ ...propForm, description: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { style: styles.label, children: t('ORTA', 'ENVIRONMENT') }), _jsxs("select", { style: styles.select, value: propForm.environment_id ?? '', onChange: e => setPropForm({ ...propForm, environment_id: e.target.value ? Number(e.target.value) : null }), children: [_jsx("option", { value: "", children: t('— Seçilmedi —', '— None —') }), environments.map(env => _jsx("option", { value: env.id, children: env.name }, env.id))] })] }), _jsxs("div", { children: [_jsx("label", { style: styles.label, children: t('ETKİLEŞİM NOTLARI', 'INTERACTION NOTES') }), _jsx("textarea", { style: styles.textarea, value: propForm.interaction_notes, onChange: e => setPropForm({ ...propForm, interaction_notes: e.target.value }), placeholder: t('Karakterler bu nesneyle nasıl etkileşir?', 'How do characters interact with this prop?') })] })] })), error && (_jsx("div", { style: { padding: '8px 12px', background: 'hsla(0,70%,50%,0.1)', border: '1px solid hsla(0,70%,50%,0.2)', borderRadius: 8, fontSize: 12, color: 'hsl(0,70%,60%)' }, children: error }))] }), _jsxs("div", { style: m.modalFooter, children: [_jsx("button", { onClick: handleCloseModal, style: { ...styles.btn, ...styles.btnSecondary }, children: t('İptal', 'Cancel') }), _jsx("button", { onClick: isEnvForm ? saveEnv : saveProp, disabled: saving, style: { ...styles.btn, ...styles.btnPrimary, opacity: saving ? 0.6 : 1 }, children: saving ? t('Kaydediliyor...', 'Saving...') : t('Kaydet', 'Save') })] })] }) }));
    };
    const renderDeleteConfirm = () => {
        if (!deleteConfirm)
            return null;
        return (_jsx("div", { style: m.overlay, onClick: () => setDeleteConfirm(null), children: _jsxs("div", { style: { ...m.modal, width: 380 }, onClick: e => e.stopPropagation(), children: [_jsx("div", { style: m.modalHeader, children: _jsx("span", { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }, children: t('Silme Onayı', 'Delete Confirmation') }) }), _jsx("div", { style: { padding: 20, fontSize: 13, color: 'var(--text-primary)' }, children: t('Bu öğeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', 'Are you sure you want to delete this item? This action cannot be undone.') }), _jsxs("div", { style: m.modalFooter, children: [_jsx("button", { onClick: () => setDeleteConfirm(null), style: { ...styles.btn, ...styles.btnSecondary }, children: t('İptal', 'Cancel') }), _jsx("button", { onClick: () => {
                                    if (deleteConfirm.type === 'env')
                                        deleteEnv(deleteConfirm.id);
                                    else
                                        deleteProp(deleteConfirm.id);
                                }, style: { ...styles.btn, ...styles.btnDanger }, children: t('Sil', 'Delete') })] })] }) }));
    };
    return (_jsxs("div", { style: styles.panel, children: [_jsxs("div", { style: styles.tabs, children: [_jsxs("button", { style: styles.tab(tab === 'env'), onClick: () => setTab('env'), children: [_jsx(MapPin, { size: 13, style: { marginRight: 6, verticalAlign: 'middle' } }), t('Ortamlar', 'Environments')] }), _jsxs("button", { style: styles.tab(tab === 'prop'), onClick: () => setTab('prop'), children: [_jsx(Layers, { size: 13, style: { marginRight: 6, verticalAlign: 'middle' } }), t('Nesneler', 'Props')] })] }), tab === 'env' ? (_jsxs("div", { children: [_jsxs("div", { style: styles.headerRow, children: [_jsx("div", { style: { fontSize: 13, color: 'var(--text-muted)' }, children: t(`${environments.length} ortam`, `${environments.length} environments`) }), _jsxs("button", { onClick: openAddEnv, style: { ...styles.btn, ...styles.btnPrimary }, children: [_jsx(Plus, { size: 14 }), " ", t('Ortam Ekle', 'Add Environment')] })] }), loading && environments.length === 0 ? (_jsx("div", { style: styles.empty, children: t('Yükleniyor...', 'Loading...') })) : environments.length === 0 ? (_jsx("div", { style: styles.empty, children: t('Henüz ortam eklenmemiş.', 'No environments added yet.') })) : (environments.map(env => (_jsxs("div", { style: styles.envCard, children: [_jsxs("div", { style: styles.cardTop, children: [_jsxs("div", { style: styles.cardTitle, children: [_jsx(MapPin, { size: 14, style: { color: 'var(--text-muted)' } }), env.name, _jsx("span", { style: m.categoryBadge(env.category), children: env.category })] }), _jsxs("div", { style: styles.actionRow, children: [_jsx("button", { onClick: () => openEditEnv(env), style: { ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }, children: _jsx(Edit3, { size: 11 }) }), _jsx("button", { onClick: () => setDeleteConfirm({ id: env.id, type: 'env' }), style: { ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }, children: _jsx(Trash2, { size: 11 }) })] })] }), env.description && (_jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }, children: env.description })), env.mood_tags.length > 0 && (_jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }, children: [_jsx(Tag, { size: 11, style: { color: 'var(--text-muted)', marginRight: 2, alignSelf: 'center' } }), env.mood_tags.map((tag, i) => (_jsx("span", { style: styles.tagChip, children: tag }, i)))] })), env.color_palette.length > 0 && (_jsxs("div", { style: styles.paletteRow, children: [_jsx(Palette, { size: 11, style: { color: 'var(--text-muted)', marginRight: 2 } }), env.color_palette.map((hex, i) => (_jsx("span", { style: m.colorCircle(hex), title: hex }, i)))] })), env.lighting_notes && (_jsxs("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }, children: [_jsx(Sun, { size: 11, style: { marginRight: 4, verticalAlign: 'middle' } }), env.lighting_notes] }))] }, env.id))))] })) : (_jsxs("div", { children: [_jsxs("div", { style: styles.headerRow, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontSize: 13, color: 'var(--text-muted)' }, children: t(`${props.length} nesne`, `${props.length} props`) }), _jsxs("select", { style: { ...styles.select, width: 'auto', padding: '4px 8px', fontSize: 11 }, value: filterEnvId ?? '', onChange: e => setFilterEnvId(e.target.value ? Number(e.target.value) : null), children: [_jsx("option", { value: "", children: t('Tüm ortamlar', 'All environments') }), environments.map(env => (_jsx("option", { value: env.id, children: env.name }, env.id)))] })] }), _jsxs("button", { onClick: openAddProp, style: { ...styles.btn, ...styles.btnPrimary }, children: [_jsx(Plus, { size: 14 }), " ", t('Nesne Ekle', 'Add Prop')] })] }), loading && props.length === 0 ? (_jsx("div", { style: styles.empty, children: t('Yükleniyor...', 'Loading...') })) : props.length === 0 ? (_jsx("div", { style: styles.empty, children: t('Henüz nesne eklenmemiş.', 'No props added yet.') })) : (props.map(p => {
                        const envName = p.environment_name || environments.find(e => e.id === p.environment_id)?.name || '';
                        return (_jsxs("div", { style: styles.propCard, children: [_jsxs("div", { style: styles.cardTop, children: [_jsxs("div", { style: styles.cardTitle, children: [_jsx(Layers, { size: 13, style: { color: 'var(--text-muted)' } }), p.name, _jsx("span", { style: m.categoryBadge(p.category), children: p.category }), envName && (_jsxs("span", { style: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }, children: [_jsx(MapPin, { size: 10, style: { marginRight: 2, verticalAlign: 'middle' } }), envName] }))] }), _jsxs("div", { style: styles.actionRow, children: [_jsx("button", { onClick: () => openEditProp(p), style: { ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }, children: _jsx(Edit3, { size: 11 }) }), _jsx("button", { onClick: () => setDeleteConfirm({ id: p.id, type: 'prop' }), style: { ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }, children: _jsx(Trash2, { size: 11 }) })] })] }), p.description && (_jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }, children: p.description })), p.interaction_notes && (_jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }, children: p.interaction_notes }))] }, p.id));
                    }))] })), renderModal(), renderDeleteConfirm()] }));
}
