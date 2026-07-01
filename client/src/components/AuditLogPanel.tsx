import React, { useState, useEffect } from 'react';
import { RefreshCw, Search } from 'lucide-react';

interface AuditEntry {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  details: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface Props {
  csrfToken: string;
}

export function AuditLogPanel({ csrfToken }: Props) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (filter) params.set('action', filter);
      const res = await fetch(`/api/v1/audit?${params}`, {
        headers: { 'x-csrf-token': csrfToken },
      });
      const data = await res.json();
      setLogs(data.logs || data || []);
    } catch (e) {
      console.error('Audit fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page, filter]);

  const s: Record<string, any> = {
    root: { display: 'flex', flexDirection: 'column', gap: 12, height: '100%' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    search: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--foreground)', fontSize: 12, flex: 1 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
    th: { textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    td: { padding: '6px', borderBottom: '1px solid var(--border)' },
    badge: (action: string) => ({
      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: action.includes('login') ? 'rgba(34,197,94,0.15)' : action.includes('failed') ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
      color: action.includes('login') ? '#22c55e' : action.includes('failed') ? '#ef4444' : '#6366f1',
    }),
    pagination: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 },
    btn: { padding: '4px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 11 },
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Audit Log</h3>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={s.search}>
            <Search size={14} style={{ opacity: 0.5 }} />
            <input
              placeholder="Filtrele..."
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(0); }}
              style={{ border: 'none', background: 'transparent', color: 'var(--foreground)', outline: 'none', width: '100%', fontSize: 12 }}
            />
          </div>
          <button onClick={fetchLogs} style={{ ...s.btn, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={12} className={loading ? 'spin' : ''} /> Yenile
          </button>
        </div>
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Zaman</th>
              <th style={s.th}>Eylem</th>
              <th style={s.th}>Varlık</th>
              <th style={s.th}>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td style={s.td}>{new Date(log.created_at).toLocaleString('tr')}</td>
                <td style={s.td}><span style={s.badge(log.action)}>{log.action}</span></td>
                <td style={s.td}>{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}</td>
                <td style={s.td}>{log.ip_address || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={s.pagination}>
        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={s.btn}>Önceki</button>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Sayfa {page + 1}</span>
        <button onClick={() => setPage(page + 1)} disabled={logs.length < limit} style={s.btn}>Sonraki</button>
      </div>
    </div>
  );
}
