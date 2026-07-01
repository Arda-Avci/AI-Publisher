import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Cpu, HardDrive } from 'lucide-react';
export function DockerStatusPanel({ csrfToken }) {
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef(null);
    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v1/docker/status', {
                headers: { 'x-csrf-token': csrfToken },
            });
            const data = await res.json();
            setContainers(data.containers || data || []);
        }
        catch (e) {
            console.error('Docker status error:', e);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchStatus();
        intervalRef.current = setInterval(fetchStatus, 30000);
        return () => { if (intervalRef.current)
            clearInterval(intervalRef.current); };
    }, []);
    const s = {
        root: { display: 'flex', flexDirection: 'column', gap: 12, height: '100%' },
        header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 },
        card: { padding: 12, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card)' },
        name: { fontWeight: 600, fontSize: 12, marginBottom: 4 },
        status: (st) => ({
            display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
            background: st === 'running' ? 'rgba(34,197,94,0.15)' : st === 'stopped' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
            color: st === 'running' ? '#22c55e' : st === 'stopped' ? '#ef4444' : '#eab308',
        }),
        info: { fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 },
        btn: { padding: '4px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 },
    };
    return (_jsxs("div", { style: s.root, children: [_jsxs("div", { style: s.header, children: [_jsx("h3", { style: { margin: 0, fontSize: 14, fontWeight: 600 }, children: "Docker Containers" }), _jsxs("button", { onClick: fetchStatus, style: s.btn, children: [_jsx(RefreshCw, { size: 12, className: loading ? 'spin' : '' }), " Yenile"] })] }), _jsx("div", { style: s.grid, children: containers.map((c) => (_jsxs("div", { style: s.card, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { style: s.name, children: c.name }), _jsx("span", { style: s.status(c.status), children: c.status })] }), c.gpu && _jsxs("div", { style: s.info, children: [_jsx(Cpu, { size: 11 }), " ", c.gpu] }), c.vram_used !== undefined && (_jsxs("div", { style: s.info, children: [_jsx(HardDrive, { size: 11 }), " ", c.vram_used?.toFixed(1), "GB / ", c.vram_total?.toFixed(1), "GB"] })), c.ports && _jsxs("div", { style: s.info, children: ["Ports: ", c.ports] }), c.uptime && _jsxs("div", { style: s.info, children: ["Uptime: ", c.uptime] })] }, c.name))) })] }));
}
