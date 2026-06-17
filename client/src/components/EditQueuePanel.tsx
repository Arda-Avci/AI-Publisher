import React, { useState, useEffect, useCallback } from 'react';
import { Send, RotateCcw, CheckCircle, AlertCircle, History, List, X } from 'lucide-react';

interface EditItem {
  id: number;
  job_id: number;
  command: string;
  target_scene: number | null;
  status: 'pending' | 'applied' | 'failed';
  created_at: string;
}

interface EditQueuePanelProps {
  jobId: number;
  scenes: { id: number; scene_number: number }[];
  csrfToken: string;
  onClose?: () => void;
}

const s: Record<string, React.CSSProperties> = {
  panel: {
    background: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(0,0,0,0.2)',
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: '12px',
    letterSpacing: '0.08em',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  body: {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    background: 'rgba(0,0,0,0.3)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '12px',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
  },
  select: {
    background: 'rgba(0,0,0,0.3)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '11px',
    outline: 'none',
    cursor: 'pointer',
  },
  btn: {
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    border: '1px solid var(--border)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  btnPrimary: {
    background: 'var(--gold)',
    color: '#000',
    borderColor: 'var(--gold)',
  },
  btnSmall: {
    padding: '4px 8px',
    fontSize: '10px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '6px',
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,255,255,0.04)',
    fontSize: '11px',
  },
  statusBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '9px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
};

export const EditQueuePanel: React.FC<EditQueuePanelProps> = ({
  jobId,
  scenes,
  csrfToken,
  onClose,
}) => {
  const [command, setCommand] = useState('');
  const [targetScene, setTargetScene] = useState<number | ''>('');
  const [history, setHistory] = useState<EditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      const r = await fetch(`/api/v1/edit-queue/history/${jobId}`, {
        headers: { 'x-csrf-token': csrfToken },
      });
      const d = await r.json();
      if (d.success) setHistory(d.history || []);
    } catch {
      /* silent */
    }
  }, [jobId, csrfToken]);

  useEffect(() => {
    setLoading(true);
    fetchHistory().finally(() => setLoading(false));
  }, [fetchHistory]);

  const handleSubmit = async () => {
    if (!command.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/v1/edit-queue/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({
          jobId,
          command: command.trim(),
          targetScene: targetScene || undefined,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setCommand('');
        await fetchHistory();
      } else {
        setError(d.error || 'Hata');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async (editId: number) => {
    try {
      const r = await fetch(`/api/v1/edit-queue/apply/${editId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ jobId }),
      });
      const d = await r.json();
      if (d.success) await fetchHistory();
      else setError(d.error || 'Apply hatası');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUndo = async (editId: number) => {
    try {
      const r = await fetch(`/api/v1/edit-queue/undo/${editId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ jobId }),
      });
      const d = await r.json();
      if (d.success) await fetchHistory();
      else setError(d.error || 'Undo hatası');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const statusStyle = (status: string): React.CSSProperties => ({
    ...s.statusBadge,
    background:
      status === 'applied'
        ? 'rgba(34,197,94,0.12)'
        : status === 'failed'
          ? 'rgba(239,68,68,0.12)'
          : 'rgba(200,164,92,0.12)',
    color:
      status === 'applied'
        ? 'var(--success)'
        : status === 'failed'
          ? 'var(--accent)'
          : 'var(--gold)',
  });

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <div style={s.headerTitle}>
          <List size={14} style={{ color: 'var(--gold)' }} />
          AI EDİT QUEUE
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div style={s.body}>
        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={s.inputRow}>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder='Örn: "2. sahneyi daha parlak yap" veya "ses seviyesini artır"'
              style={s.input}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <select
              value={targetScene}
              onChange={(e) => setTargetScene(e.target.value ? Number(e.target.value) : '')}
              style={s.select}
            >
              <option value="">Tümü</option>
              {scenes.map((s) => (
                <option key={s.id} value={s.scene_number}>
                  Sahne #{s.scene_number}
                </option>
              ))}
            </select>
            <button
              onClick={handleSubmit}
              disabled={submitting || !command.trim()}
              style={{
                ...s.btn,
                ...s.btnPrimary,
                opacity: submitting || !command.trim() ? 0.4 : 1,
                cursor: submitting || !command.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={12} />
              {submitting ? '...' : 'Gönder'}
            </button>
          </div>
          {error && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <AlertCircle size={11} /> {error}
              <button
                onClick={() => setError('')}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={10} />
              </button>
            </div>
          )}
        </div>

        {/* History */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <History size={12} style={{ color: 'var(--text-muted)' }} />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Geçmiş ({history.length})
          </span>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '16px',
              color: 'var(--text-muted)',
              fontSize: '11px',
            }}
          >
            Yükleniyor...
          </div>
        ) : history.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '16px',
              color: 'var(--text-muted)',
              fontSize: '11px',
            }}
          >
            Henüz edit emri gönderilmedi
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {history.map((edit) => (
              <div key={edit.id} style={s.historyItem}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {edit.command}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                    <span style={statusStyle(edit.status)}>{edit.status}</span>
                    {edit.target_scene && (
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        Sahne #{edit.target_scene}
                      </span>
                    )}
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {new Date(edit.created_at).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {edit.status !== 'applied' && (
                    <button
                      onClick={() => handleApply(edit.id)}
                      style={{
                        ...s.btn,
                        ...s.btnSmall,
                        color: 'var(--success)',
                        borderColor: 'rgba(34,197,94,0.3)',
                      }}
                      title="Uygula"
                    >
                      <CheckCircle size={10} /> Uygula
                    </button>
                  )}
                  {edit.status === 'applied' && (
                    <button
                      onClick={() => handleUndo(edit.id)}
                      style={{
                        ...s.btn,
                        ...s.btnSmall,
                        color: 'var(--accent)',
                        borderColor: 'rgba(239,68,68,0.3)',
                      }}
                      title="Geri Al"
                    >
                      <RotateCcw size={10} /> Geri Al
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
