import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * ApiKeyManager - API Key Management Interface
 * Premium glassmorphism/cyberpunk design
 */
import { useState, useEffect, useCallback } from 'react';
const PROVIDER_COLORS = {
    openai: { accent: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
    anthropic: { accent: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
    google: { accent: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
    zen: { accent: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
    custom: { accent: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' },
};
const PROVIDER_LOGOS = {
    openai: '◈',
    anthropic: '◉',
    google: '◎',
    zen: '◐',
    custom: '◇',
};
export function ApiKeyManager({ language: _language, t, onShowToast }) {
    const [apiKeys, setApiKeys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingKey, setEditingKey] = useState(null);
    // Form state
    const [formName, setFormName] = useState('');
    const [formProvider, setFormProvider] = useState('openai');
    const [formBaseUrl, setFormBaseUrl] = useState('');
    const [formKey, setFormKey] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fetchApiKeys = useCallback(async () => {
        setIsLoading(true);
        try {
            const r = await fetch('/api/v1/api-keys');
            const d = await r.json();
            if (d.apiKeys)
                setApiKeys(d.apiKeys);
        }
        catch (err) {
            console.error('Failed to fetch API keys:', err);
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchApiKeys();
    }, [fetchApiKeys]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formName.trim() || !formKey.trim())
            return;
        setIsSubmitting(true);
        try {
            const url = editingKey
                ? `/api/v1/api-keys/${editingKey.id}`
                : '/api/v1/api-keys';
            const method = editingKey ? 'PUT' : 'POST';
            const r = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formName,
                    provider: formProvider,
                    baseUrl: formBaseUrl || undefined,
                    key: formKey,
                }),
            });
            if (r.ok) {
                onShowToast?.(editingKey ? t('api_key_updated') : t('api_key_added'), 'success');
                resetForm();
                fetchApiKeys();
            }
            else {
                throw new Error('Failed to save API key');
            }
        }
        catch (err) {
            onShowToast?.(t('api_key_save_failed'), 'error');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm(t('confirm_delete_key')))
            return;
        try {
            const r = await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE' });
            if (r.ok) {
                onShowToast?.(t('api_key_deleted'), 'success');
                fetchApiKeys();
            }
            else {
                throw new Error('Failed to delete');
            }
        }
        catch (err) {
            onShowToast?.(t('api_key_delete_failed'), 'error');
        }
    };
    const handleTest = async (id) => {
        try {
            const r = await fetch(`/api/v1/api-keys/${id}/test`, { method: 'POST' });
            if (r.ok) {
                onShowToast?.(t('api_key_valid'), 'success');
            }
            else {
                throw new Error('Test failed');
            }
        }
        catch (err) {
            onShowToast?.(t('api_key_test_failed'), 'error');
        }
    };
    const resetForm = () => {
        setFormName('');
        setFormProvider('openai');
        setFormBaseUrl('');
        setFormKey('');
        setEditingKey(null);
        setShowAddModal(false);
    };
    const openEditModal = (key) => {
        setEditingKey(key);
        setFormName(key.name);
        setFormProvider(key.provider);
        setFormBaseUrl(key.baseUrl || '');
        setFormKey('');
        setShowAddModal(true);
    };
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };
    return (_jsxs("div", { style: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '20px',
            background: 'rgba(10, 10, 20, 0.6)',
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            minHeight: '400px',
        }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                }, children: [_jsxs("div", { children: [_jsx("h2", { style: {
                                    margin: 0,
                                    fontSize: '18px',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #E5E7EB, #A78BFA)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }, children: t('api_keys') }), _jsx("p", { style: {
                                    margin: '4px 0 0 0',
                                    fontSize: '12px',
                                    color: '#6B7280',
                                }, children: t('api_keys_description') })] }), _jsxs("button", { onClick: () => setShowAddModal(true), style: {
                            padding: '10px 18px',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(59, 130, 246, 0.8))',
                            border: '1px solid rgba(139, 92, 246, 0.5)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                        }, onMouseEnter: e => e.currentTarget.style.transform = 'translateY(-2px)', onMouseLeave: e => e.currentTarget.style.transform = 'translateY(0)', children: [_jsx("span", { style: { fontSize: '16px' }, children: "+" }), t('add_api_key')] })] }), isLoading ? (_jsxs("div", { style: { textAlign: 'center', padding: '40px', color: '#6B7280' }, children: [t('loading'), "..."] })) : apiKeys.length === 0 ? (_jsxs("div", { style: {
                    textAlign: 'center',
                    padding: '60px 20px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '10px',
                    border: '1px dashed rgba(139, 92, 246, 0.3)',
                }, children: [_jsx("div", { style: {
                            width: '56px',
                            height: '56px',
                            margin: '0 auto 16px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            opacity: 0.5,
                        }, children: "\uD83D\uDD11" }), _jsx("div", { style: { fontSize: '14px', color: '#9CA3AF', marginBottom: '8px' }, children: t('no_api_keys') }), _jsx("div", { style: { fontSize: '12px', color: '#6B7280' }, children: t('add_first_key') })] })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: apiKeys.map(apiKey => {
                    const colors = PROVIDER_COLORS[apiKey.provider] || PROVIDER_COLORS.custom;
                    const logo = PROVIDER_LOGOS[apiKey.provider] || PROVIDER_LOGOS.custom;
                    return (_jsxs("div", { style: {
                            padding: '16px',
                            background: 'rgba(20, 20, 35, 0.6)',
                            borderRadius: '10px',
                            border: `1px solid ${colors.accent}30`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            transition: 'all 0.2s ease',
                        }, onMouseEnter: e => e.currentTarget.style.borderColor = `${colors.accent}60`, onMouseLeave: e => e.currentTarget.style.borderColor = `${colors.accent}30`, children: [_jsx("div", { style: {
                                    width: '44px',
                                    height: '44px',
                                    background: colors.bg,
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    color: colors.accent,
                                    border: `1px solid ${colors.accent}40`,
                                    boxShadow: `0 0 15px ${colors.accent}20`,
                                }, children: logo }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }, children: [_jsx("span", { style: { fontSize: '14px', fontWeight: 600, color: '#E5E7EB' }, children: apiKey.name }), _jsx("span", { style: {
                                                    padding: '2px 8px',
                                                    background: colors.bg,
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    color: colors.accent,
                                                    fontFamily: 'var(--font-mono)',
                                                    textTransform: 'uppercase',
                                                }, children: apiKey.provider })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#6B7280' }, children: [_jsx("span", { style: { fontFamily: 'var(--font-mono)' }, children: apiKey.keyHash }), apiKey.baseUrl && (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2022" }), _jsx("span", { style: { maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }, children: apiKey.baseUrl })] }))] })] }), _jsxs("div", { style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                    gap: '2px',
                                }, children: [_jsxs("span", { style: { fontSize: '10px', color: '#6B7280' }, children: [t('added'), " ", formatDate(apiKey.createdAt)] }), apiKey.lastUsedAt && (_jsxs("span", { style: { fontSize: '10px', color: '#6B7280' }, children: [t('last_used'), " ", formatDate(apiKey.lastUsedAt)] }))] }), _jsxs("div", { style: { display: 'flex', gap: '6px' }, children: [_jsx("button", { onClick: () => handleTest(apiKey.id), title: t('test_key'), style: {
                                            width: '32px',
                                            height: '32px',
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                            borderRadius: '6px',
                                            color: '#60A5FA',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease',
                                        }, onMouseEnter: e => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)'), onMouseLeave: e => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'), children: "\u2713" }), _jsx("button", { onClick: () => openEditModal(apiKey), title: t('edit_key'), style: {
                                            width: '32px',
                                            height: '32px',
                                            background: 'rgba(139, 92, 246, 0.15)',
                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                            borderRadius: '6px',
                                            color: '#A78BFA',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease',
                                        }, onMouseEnter: e => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)'), onMouseLeave: e => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'), children: "\u270E" }), _jsx("button", { onClick: () => handleDelete(apiKey.id), title: t('delete_key'), style: {
                                            width: '32px',
                                            height: '32px',
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            borderRadius: '6px',
                                            color: '#F87171',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease',
                                        }, onMouseEnter: e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'), onMouseLeave: e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'), children: "\u00D7" })] })] }, apiKey.id));
                }) })), showAddModal && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(6px)',
                }, onClick: () => resetForm(), children: _jsxs("div", { style: {
                        background: 'linear-gradient(135deg, rgba(25, 25, 50, 0.98), rgba(15, 15, 35, 0.99))',
                        padding: '28px',
                        borderRadius: '14px',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        width: '420px',
                        maxWidth: '90vw',
                        boxShadow: '0 0 60px rgba(139, 92, 246, 0.3)',
                    }, onClick: e => e.stopPropagation(), children: [_jsx("h3", { style: {
                                margin: '0 0 20px 0',
                                fontSize: '16px',
                                fontWeight: 700,
                                color: '#E5E7EB',
                            }, children: editingKey ? t('edit_api_key') : t('add_new_api_key') }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { style: { marginBottom: '16px' }, children: [_jsx("label", { style: {
                                                display: 'block',
                                                fontSize: '11px',
                                                color: '#9CA3AF',
                                                marginBottom: '6px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }, children: t('key_name') }), _jsx("input", { type: "text", value: formName, onChange: e => setFormName(e.target.value), placeholder: "My OpenAI Key", required: true, style: {
                                                width: '100%',
                                                padding: '12px 14px',
                                                background: 'rgba(0, 0, 0, 0.5)',
                                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }, onFocus: e => e.target.style.borderColor = 'rgba(139, 92, 246, 0.6)', onBlur: e => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)' })] }), _jsxs("div", { style: { marginBottom: '16px' }, children: [_jsx("label", { style: {
                                                display: 'block',
                                                fontSize: '11px',
                                                color: '#9CA3AF',
                                                marginBottom: '6px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }, children: t('provider') }), _jsxs("select", { value: formProvider, onChange: e => setFormProvider(e.target.value), style: {
                                                width: '100%',
                                                padding: '12px 14px',
                                                background: 'rgba(0, 0, 0, 0.5)',
                                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                cursor: 'pointer',
                                            }, children: [_jsx("option", { value: "openai", children: "OpenAI" }), _jsx("option", { value: "anthropic", children: "Anthropic" }), _jsx("option", { value: "google", children: "Google" }), _jsx("option", { value: "zen", children: "Zen API" }), _jsx("option", { value: "custom", children: "Custom Provider" })] })] }), formProvider === 'custom' && (_jsxs("div", { style: { marginBottom: '16px' }, children: [_jsx("label", { style: {
                                                display: 'block',
                                                fontSize: '11px',
                                                color: '#9CA3AF',
                                                marginBottom: '6px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }, children: "Base URL" }), _jsx("input", { type: "url", value: formBaseUrl, onChange: e => setFormBaseUrl(e.target.value), placeholder: "https://api.example.com/v1", style: {
                                                width: '100%',
                                                padding: '12px 14px',
                                                background: 'rgba(0, 0, 0, 0.5)',
                                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }, onFocus: e => e.target.style.borderColor = 'rgba(139, 92, 246, 0.6)', onBlur: e => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)' })] })), _jsxs("div", { style: { marginBottom: '24px' }, children: [_jsxs("label", { style: {
                                                display: 'block',
                                                fontSize: '11px',
                                                color: '#9CA3AF',
                                                marginBottom: '6px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }, children: [t('api_key'), editingKey && _jsxs("span", { style: { fontWeight: 400, marginLeft: '8px' }, children: ["(", t('leave_empty_keep'), ")"] })] }), _jsx("input", { type: "password", value: formKey, onChange: e => setFormKey(e.target.value), placeholder: editingKey ? '••••••••••••••••' : 'sk-...', required: !editingKey, style: {
                                                width: '100%',
                                                padding: '12px 14px',
                                                background: 'rgba(0, 0, 0, 0.5)',
                                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                fontFamily: editingKey ? 'var(--font-mono)' : 'inherit',
                                            }, onFocus: e => e.target.style.borderColor = 'rgba(139, 92, 246, 0.6)', onBlur: e => e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)' })] }), _jsxs("div", { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end' }, children: [_jsx("button", { type: "button", onClick: resetForm, style: {
                                                padding: '10px 20px',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                color: '#9CA3AF',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                            }, children: t('cancel') }), _jsx("button", { type: "submit", disabled: isSubmitting || (!editingKey && !formKey.trim()), style: {
                                                padding: '10px 24px',
                                                background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: (isSubmitting || (!editingKey && !formKey.trim())) ? 'not-allowed' : 'pointer',
                                                opacity: (isSubmitting || (!editingKey && !formKey.trim())) ? 0.5 : 1,
                                            }, children: isSubmitting ? t('saving') : (editingKey ? t('update') : t('save')) })] })] })] }) }))] }));
}
