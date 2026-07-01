import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { HelpCircle, Video, Edit3, Trash2 } from 'lucide-react';
function FormFields({ form, setForm, }) {
    return (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-400 block mb-1", children: "Feature Key" }), _jsx("input", { name: "featureKey", value: form.featureKey, onChange: (e) => setForm({ ...form, featureKey: e.target.value }), className: "w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none text-gray-200", required: true })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-xs text-gray-400 block mb-1", children: "Title (TR)" }), _jsx("input", { value: form.titleTr, onChange: (e) => setForm({ ...form, titleTr: e.target.value }), className: "w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200", required: true })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-xs text-gray-400 block mb-1", children: "Title (EN)" }), _jsx("input", { value: form.titleEn, onChange: (e) => setForm({ ...form, titleEn: e.target.value }), className: "w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200", required: true })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-xs text-gray-400 block mb-1", children: "Description (TR)" }), _jsx("textarea", { value: form.descriptionTr, onChange: (e) => setForm({ ...form, descriptionTr: e.target.value }), rows: 2, className: "w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-xs text-gray-400 block mb-1", children: "Description (EN)" }), _jsx("textarea", { value: form.descriptionEn, onChange: (e) => setForm({ ...form, descriptionEn: e.target.value }), rows: 2, className: "w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("div", { className: "flex-[2]", children: [_jsx("label", { className: "text-xs text-gray-400 block mb-1", children: "Video URL" }), _jsx("input", { value: form.videoUrl, onChange: (e) => setForm({ ...form, videoUrl: e.target.value }), className: "w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-xs text-gray-400 block mb-1", children: "Duration (sec)" }), _jsx("input", { type: "number", value: form.durationSeconds, onChange: (e) => setForm({ ...form, durationSeconds: parseInt(e.target.value) || 0 }), className: "w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" })] }), _jsxs("div", { className: "w-20", children: [_jsx("label", { className: "text-xs text-gray-400 block mb-1", children: "Sort" }), _jsx("input", { type: "number", value: form.sortOrder, onChange: (e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 }), className: "w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" })] })] })] }));
}
export default function AdminHelpVideos() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({
        featureKey: '',
        titleTr: '',
        titleEn: '',
        descriptionTr: '',
        descriptionEn: '',
        videoUrl: '',
        thumbnailUrl: '',
        durationSeconds: 0,
        sortOrder: 0,
    });
    const fetchVideos = async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/v1/help-videos');
            const d = await r.json();
            if (d.success)
                setVideos(d.videos || []);
        }
        catch (e) {
            console.error('Failed to fetch help videos', e);
        }
        setLoading(false);
    };
    useEffect(() => {
        let cancelled = false;
        fetch('/api/v1/help-videos')
            .then((r) => r.json())
            .then((d) => {
            if (!cancelled && d.success)
                setVideos(d.videos || []);
        })
            .catch((e) => {
            if (!cancelled)
                console.error('Failed to fetch help videos', e);
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/v1/help-videos/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            setShowAdd(false);
            setForm({
                featureKey: '',
                titleTr: '',
                titleEn: '',
                descriptionTr: '',
                descriptionEn: '',
                videoUrl: '',
                thumbnailUrl: '',
                durationSeconds: 0,
                sortOrder: 0,
            });
            fetchVideos();
        }
        catch (e) {
            console.error('Failed to create help video', e);
        }
    };
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editing)
            return;
        try {
            await fetch(`/api/v1/help-videos/admin/${editing.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titleTr: form.titleTr,
                    titleEn: form.titleEn,
                    descriptionTr: form.descriptionTr,
                    descriptionEn: form.descriptionEn,
                    videoUrl: form.videoUrl,
                    thumbnailUrl: form.thumbnailUrl,
                    durationSeconds: form.durationSeconds,
                    sortOrder: form.sortOrder,
                }),
            });
            setEditing(null);
            fetchVideos();
        }
        catch (e) {
            console.error('Failed to update help video', e);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm('Delete this help video?'))
            return;
        try {
            await fetch(`/api/v1/help-videos/admin/${id}`, { method: 'DELETE' });
            fetchVideos();
        }
        catch (e) {
            console.error('Failed to delete help video', e);
        }
    };
    const startEdit = (v) => {
        setEditing(v);
        setForm({
            featureKey: v.featureKey,
            titleTr: v.title,
            titleEn: v.title,
            descriptionTr: v.description || '',
            descriptionEn: v.description || '',
            videoUrl: v.videoUrl || '',
            thumbnailUrl: v.thumbnailUrl || '',
            durationSeconds: v.durationSeconds || 0,
            sortOrder: v.sortOrder || 0,
        });
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-100", children: "Help Videos" }), _jsx("button", { onClick: () => {
                            setShowAdd(true);
                            setEditing(null);
                        }, className: "px-4 py-2 text-sm font-medium text-gray-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors", children: "+ Add Video" })] }), showAdd && (_jsxs("form", { onSubmit: handleCreate, className: "p-4 mb-6 bg-gray-800/50 border border-gray-700 rounded-xl", children: [_jsx("h2", { className: "text-sm font-semibold text-amber-400 mb-4", children: "New Help Video" }), _jsxs("div", { className: "space-y-3", children: [_jsx(FormFields, { form: form, setForm: setForm }), _jsxs("div", { className: "flex gap-2 justify-end pt-2", children: [_jsx("button", { type: "button", onClick: () => setShowAdd(false), className: "px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors", children: "Cancel" }), _jsx("button", { type: "submit", className: "px-4 py-1.5 text-sm font-medium text-gray-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors", children: "Create" })] })] })] })), editing && (_jsxs("form", { onSubmit: handleUpdate, className: "p-4 mb-6 bg-gray-800/50 border border-amber-500/30 rounded-xl", children: [_jsxs("h2", { className: "text-sm font-semibold text-amber-400 mb-4", children: ["Edit: ", editing.title] }), _jsxs("div", { className: "space-y-3", children: [_jsx(FormFields, { form: form, setForm: setForm }), _jsxs("div", { className: "flex gap-2 justify-end pt-2", children: [_jsx("button", { type: "button", onClick: () => setEditing(null), className: "px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors", children: "Cancel" }), _jsx("button", { type: "submit", className: "px-4 py-1.5 text-sm font-medium text-gray-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors", children: "Save" })] })] })] })), loading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" }) })) : videos.length === 0 ? (_jsxs("div", { className: "text-center py-16 text-gray-500", children: [_jsx(HelpCircle, { size: 48, className: "mx-auto mb-3 opacity-30" }), _jsx("p", { className: "text-sm", children: "No help videos yet. Add your first one." })] })) : (_jsx("div", { className: "space-y-2", children: videos.map((v) => (_jsxs("div", { className: "flex items-center gap-4 p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg hover:border-gray-600 transition-colors", children: [_jsx("div", { className: "w-16 h-10 bg-gray-800 rounded flex items-center justify-center text-gray-600 shrink-0", children: _jsx(Video, { size: 20 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-gray-200 truncate", children: v.title }), _jsxs("p", { className: "text-xs text-gray-500 truncate", children: [v.featureKey, " \u00B7 ", v.description || ''] })] }), _jsx("div", { className: "text-xs text-gray-500 shrink-0", children: v.durationSeconds > 0
                                ? `${Math.floor(v.durationSeconds / 60)}:${(v.durationSeconds % 60).toString().padStart(2, '0')}`
                                : '—' }), _jsxs("div", { className: "flex gap-1 shrink-0", children: [_jsx("button", { onClick: () => startEdit(v), className: "p-1.5 text-gray-500 hover:text-amber-400 transition-colors", title: "Edit", children: _jsx(Edit3, { size: 14 }) }), _jsx("button", { onClick: () => handleDelete(v.id), className: "p-1.5 text-gray-500 hover:text-red-400 transition-colors", title: "Delete", children: _jsx(Trash2, { size: 14 }) })] })] }, v.id))) }))] }));
}
