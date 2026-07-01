import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Save, Loader } from 'lucide-react';
export function TranscriptEditorPanel({ jobId, csrfToken, onClose }) {
    const [scenes, setScenes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const loadTranscript = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/transcript/${jobId}`, {
                headers: { 'x-csrf-token': csrfToken },
            });
            const data = await res.json();
            setScenes(data.scenes || []);
            setLoaded(true);
        }
        catch (e) {
            console.error('Transcript load error:', e);
        }
        finally {
            setLoading(false);
        }
    };
    const updateSceneText = (sceneNumber, text) => {
        setScenes(prev => prev.map(s => s.scene_number === sceneNumber ? { ...s, speech_text: text } : s));
    };
    const saveTranscript = async () => {
        setSaving(true);
        try {
            await fetch(`/api/v1/transcript/${jobId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
                body: JSON.stringify({ scenes }),
            });
            onClose();
        }
        catch (e) {
            console.error('Transcript save error:', e);
        }
        finally {
            setSaving(false);
        }
    };
    const s = {
        root: { display: 'flex', flexDirection: 'column', gap: 12, height: '100%' },
        header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
        scene: { padding: 10, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card)' },
        label: { fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 4 },
        textarea: { width: '100%', minHeight: 60, padding: 8, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: 12, resize: 'vertical', fontFamily: 'inherit' },
        btn: { padding: '6px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 },
        btnPrimary: { padding: '6px 14px', borderRadius: 'var(--radius)', background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 },
    };
    if (!loaded && !loading) {
        return (_jsx("div", { style: { padding: 20, textAlign: 'center' }, children: _jsx("button", { onClick: loadTranscript, style: s.btnPrimary, children: "Transkripti Y\u00FCkle" }) }));
    }
    return (_jsxs("div", { style: s.root, children: [_jsxs("div", { style: s.header, children: [_jsx("h3", { style: { margin: 0, fontSize: 14, fontWeight: 600 }, children: "Transkript D\u00FCzenleyici" }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("button", { onClick: loadTranscript, style: s.btn, disabled: loading, children: loading ? _jsx(Loader, { size: 12, className: "spin" }) : 'Yenile' }), _jsx("button", { onClick: saveTranscript, style: s.btnPrimary, disabled: saving, children: saving ? _jsx(Loader, { size: 12, className: "spin" }) : _jsxs(_Fragment, { children: [_jsx(Save, { size: 12 }), " Kaydet"] }) })] })] }), _jsx("div", { style: { overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }, children: scenes.map((scene) => (_jsxs("div", { style: s.scene, children: [_jsxs("div", { style: s.label, children: ["Sahne ", scene.scene_number] }), _jsx("textarea", { value: scene.speech_text, onChange: (e) => updateSceneText(scene.scene_number, e.target.value), style: s.textarea })] }, scene.scene_number))) })] }));
}
