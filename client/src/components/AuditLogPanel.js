import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { RefreshCw, Search } from 'lucide-react';
export function AuditLogPanel({ csrfToken }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(0);
    const limit = 50;
    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
            if (filter)
                params.set('action', filter);
            const res = await fetch(`/api/v1/audit?${params}`, {
                headers: { 'x-csrf-token': csrfToken },
            });
            const data = await res.json();
            setLogs(data.logs || data || []);
        }
        catch (e) {
            console.error('Audit fetch error:', e);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchLogs(); }, [page, filter]);
    const s = {
        root: { display: 'flex', flexDirection: 'column', gap: 12, height: '100%' },
        header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
        search: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--foreground)', fontSize: 12, flex: 1 },
        table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
        th: { textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
        td: { padding: '6px', borderBottom: '1px solid var(--border)' },
        badge: (action) => ({
            padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
            background: action.includes('login') ? 'rgba(34,197,94,0.15)' : action.includes('failed') ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
            color: action.includes('login') ? '#22c55e' : action.includes('failed') ? '#ef4444' : '#6366f1',
        }),
        pagination: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 },
        btn: { padding: '4px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 11 },
    };
    return (_jsxs("div", { style: s.root, children: [_jsxs("div", { style: s.header, children: [_jsx("h3", { style: { margin: 0, fontSize: 14, fontWeight: 600 }, children: "Audit Log" }), _jsxs("div", { style: { display: 'flex', gap: 6, alignItems: 'center' }, children: [_jsxs("div", { style: s.search, children: [_jsx(Search, { size: 14, style: { opacity: 0.5 } }), _jsx("input", { placeholder: "Filtrele...", value: filter, onChange: (e) => { setFilter(e.target.value); setPage(0); }, style: { border: 'none', background: 'transparent', color: 'var(--foreground)', outline: 'none', width: '100%', fontSize: 12 } })] }), _jsxs("button", { onClick: fetchLogs, style: { ...s.btn, display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx(RefreshCw, { size: 12, className: loading ? 'spin' : '' }), " Yenile"] })] })] }), _jsx("div", { style: { overflow: 'auto', flex: 1 }, children: _jsxs("table", { style: s.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: s.th, children: "Zaman" }), _jsx("th", { style: s.th, children: "Eylem" }), _jsx("th", { style: s.th, children: "Varl\u0131k" }), _jsx("th", { style: s.th, children: "IP" })] }) }), _jsx("tbody", { children: logs.map((log) => (_jsxs("tr", { children: [_jsx("td", { style: s.td, children: new Date(log.created_at).toLocaleString('tr') }), _jsx("td", { style: s.td, children: _jsx("span", { style: s.badge(log.action), children: log.action }) }), _jsxs("td", { style: s.td, children: [log.entity_type, log.entity_id ? ` #${log.entity_id}` : ''] }), _jsx("td", { style: s.td, children: log.ip_address || '-' })] }, log.id))) })] }) }), _jsxs("div", { style: s.pagination, children: [_jsx("button", { onClick: () => setPage(Math.max(0, page - 1)), disabled: page === 0, style: s.btn, children: "\u00D6nceki" }), _jsxs("span", { style: { fontSize: 11, color: 'var(--muted-foreground)' }, children: ["Sayfa ", page + 1] }), _jsx("button", { onClick: () => setPage(page + 1), disabled: logs.length < limit, style: s.btn, children: "Sonraki" })] })] }));
}
