import { useState, useEffect } from 'react';
import { HelpCircle, Video, Edit3, Trash2 } from 'lucide-react';

interface HelpVideo {
  id: number;
  featureKey: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  sortOrder: number;
}

export default function AdminHelpVideos() {
  const [videos, setVideos] = useState<HelpVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HelpVideo | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ featureKey: '', titleTr: '', titleEn: '', descriptionTr: '', descriptionEn: '', videoUrl: '', thumbnailUrl: '', durationSeconds: 0, sortOrder: 0 });

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/v1/help-videos');
      const d = await r.json();
      if (d.success) setVideos(d.videos || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchVideos(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/v1/help-videos/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setShowAdd(false);
      setForm({ featureKey: '', titleTr: '', titleEn: '', descriptionTr: '', descriptionEn: '', videoUrl: '', thumbnailUrl: '', durationSeconds: 0, sortOrder: 0 });
      fetchVideos();
    } catch {}
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await fetch(`/api/v1/help-videos/admin/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        titleTr: form.titleTr, titleEn: form.titleEn,
        descriptionTr: form.descriptionTr, descriptionEn: form.descriptionEn,
        videoUrl: form.videoUrl, thumbnailUrl: form.thumbnailUrl,
        durationSeconds: form.durationSeconds, sortOrder: form.sortOrder,
      })});
      setEditing(null);
      fetchVideos();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this help video?')) return;
    try {
      await fetch(`/api/v1/help-videos/admin/${id}`, { method: 'DELETE' });
      fetchVideos();
    } catch {}
  };

  const startEdit = (v: HelpVideo) => {
    setEditing(v);
    setForm({
      featureKey: v.featureKey, titleTr: v.title, titleEn: v.title,
      descriptionTr: v.description || '', descriptionEn: v.description || '',
      videoUrl: v.videoUrl || '', thumbnailUrl: v.thumbnailUrl || '',
      durationSeconds: v.durationSeconds || 0, sortOrder: v.sortOrder || 0,
    });
  };

  const FormFields = () => (
    <>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Feature Key</label>
        <input name="featureKey" value={form.featureKey} onChange={e => setForm({...form, featureKey: e.target.value})}
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none text-gray-200" required />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">Title (TR)</label>
          <input value={form.titleTr} onChange={e => setForm({...form, titleTr: e.target.value})}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" required />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">Title (EN)</label>
          <input value={form.titleEn} onChange={e => setForm({...form, titleEn: e.target.value})}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" required />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">Description (TR)</label>
          <textarea value={form.descriptionTr} onChange={e => setForm({...form, descriptionTr: e.target.value})} rows={2}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">Description (EN)</label>
          <textarea value={form.descriptionEn} onChange={e => setForm({...form, descriptionEn: e.target.value})} rows={2}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-[2]">
          <label className="text-xs text-gray-400 block mb-1">Video URL</label>
          <input value={form.videoUrl} onChange={e => setForm({...form, videoUrl: e.target.value})}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">Duration (sec)</label>
          <input type="number" value={form.durationSeconds} onChange={e => setForm({...form, durationSeconds: parseInt(e.target.value) || 0})}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" />
        </div>
        <div className="w-20">
          <label className="text-xs text-gray-400 block mb-1">Sort</label>
          <input type="number" value={form.sortOrder} onChange={e => setForm({...form, sortOrder: parseInt(e.target.value) || 0})}
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none text-gray-200" />
        </div>
      </div>
    </>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Help Videos</h1>
        <button onClick={() => { setShowAdd(true); setEditing(null); }} className="px-4 py-2 text-sm font-medium text-gray-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors">
          + Add Video
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleCreate} className="p-4 mb-6 bg-gray-800/50 border border-gray-700 rounded-xl">
          <h2 className="text-sm font-semibold text-amber-400 mb-4">New Help Video</h2>
          <div className="space-y-3">
            <FormFields />
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-1.5 text-sm font-medium text-gray-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors">Create</button>
            </div>
          </div>
        </form>
      )}

      {/* Edit form */}
      {editing && (
        <form onSubmit={handleUpdate} className="p-4 mb-6 bg-gray-800/50 border border-amber-500/30 rounded-xl">
          <h2 className="text-sm font-semibold text-amber-400 mb-4">Edit: {editing.title}</h2>
          <div className="space-y-3">
            <FormFields />
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-1.5 text-sm font-medium text-gray-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors">Save</button>
            </div>
          </div>
        </form>
      )}

      {/* Video list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <HelpCircle size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No help videos yet. Add your first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map(v => (
            <div key={v.id} className="flex items-center gap-4 p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg hover:border-gray-600 transition-colors">
              <div className="w-16 h-10 bg-gray-800 rounded flex items-center justify-center text-gray-600 shrink-0">
                <Video size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{v.title}</p>
                <p className="text-xs text-gray-500 truncate">{v.featureKey} · {v.description || ''}</p>
              </div>
              <div className="text-xs text-gray-500 shrink-0">{v.durationSeconds > 0 ? `${Math.floor(v.durationSeconds / 60)}:${(v.durationSeconds % 60).toString().padStart(2, '0')}` : '—'}</div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(v)} className="p-1.5 text-gray-500 hover:text-amber-400 transition-colors" title="Edit"><Edit3 size={14} /></button>
                <button onClick={() => handleDelete(v.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
