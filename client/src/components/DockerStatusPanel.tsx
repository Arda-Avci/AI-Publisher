import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Cpu, HardDrive } from 'lucide-react';

interface Container {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  gpu?: string;
  vram_used?: number;
  vram_total?: number;
  ports?: string;
  uptime?: string;
}

interface Props {
  csrfToken: string;
}

export function DockerStatusPanel({ csrfToken }: Props) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<any | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/docker/status', {
        headers: { 'x-csrf-token': csrfToken },
      });
      const data = await res.json();
      setContainers(data.containers || data || []);
    } catch (e) {
      console.error('Docker status error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const s: Record<string, any> = {
    root: { display: 'flex', flexDirection: 'column', gap: 12, height: '100%' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 },
    card: { padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card)' },
    name: { fontWeight: 600, fontSize: 12, marginBottom: 4 },
    status: (st: string) => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: st === 'running' ? 'rgba(34,197,94,0.15)' : st === 'stopped' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
      color: st === 'running' ? '#22c55e' : st === 'stopped' ? '#ef4444' : '#eab308',
    }),
    info: { fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 },
    btn: { padding: '4px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 },
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Docker Containers</h3>
        <button onClick={fetchStatus} style={s.btn}>
          <RefreshCw size={12} className={loading ? 'spin' : ''} /> Yenile
        </button>
      </div>

      <div style={s.grid}>
        {containers.map((c) => (
          <div key={c.name} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={s.name}>{c.name}</span>
              <span style={s.status(c.status)}>{c.status}</span>
            </div>
            {c.gpu && <div style={s.info}><Cpu size={11} /> {c.gpu}</div>}
            {c.vram_used !== undefined && (
              <div style={s.info}><HardDrive size={11} /> {c.vram_used?.toFixed(1)}GB / {c.vram_total?.toFixed(1)}GB</div>
            )}
            {c.ports && <div style={s.info}>Ports: {c.ports}</div>}
            {c.uptime && <div style={s.info}>Uptime: {c.uptime}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
