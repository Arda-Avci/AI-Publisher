import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
export default function AuditLogPanel() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const r = await fetch(`/api/v1/audit?page=${page}&limit=${pagination.limit}`);
            const d = await r.json();
            if (d.success) {
                setLogs(d.data);
                setPagination(d.pagination);
            }
            else {
                setError(d.error || 'Failed to fetch audit logs');
            }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        setLoading(false);
    };
    useEffect(() => {
        fetchLogs(1);
    }, []);
    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage);
        }
    };
    if (loading && logs.length === 0) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-xl font-bold text-gray-100", children: "Audit Log" }), _jsx("button", { onClick: () => fetchLogs(pagination.page), className: "px-3 py-1.5 text-sm text-gray-400 hover:text-amber-400 border border-gray-700 hover:border-amber-500/50 rounded-lg transition-colors", children: "Refresh" })] }), error && (_jsx("div", { className: "p-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400", children: error })), _jsx("div", { className: "bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-700/50", children: [_jsx("th", { className: "text-left p-4 text-gray-400 font-medium", children: "Timestamp" }), _jsx("th", { className: "text-left p-4 text-gray-400 font-medium", children: "User" }), _jsx("th", { className: "text-left p-4 text-gray-400 font-medium", children: "Action" }), _jsx("th", { className: "text-left p-4 text-gray-400 font-medium", children: "Entity" }), _jsx("th", { className: "text-left p-4 text-gray-400 font-medium", children: "IP" })] }) }), _jsx("tbody", { children: logs.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "text-center p-8 text-gray-500", children: "No audit logs found" }) })) : (logs.map((log, index) => (_jsxs("tr", { className: "border-b border-gray-700/30 hover:bg-gray-800/50 transition-colors", children: [_jsx("td", { className: "p-4 text-gray-300", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Clock, { size: 14, className: "text-gray-500" }), formatDate(log.timestamp)] }) }), _jsx("td", { className: "p-4 text-gray-200", children: log.user }), _jsx("td", { className: "p-4", children: _jsx("span", { className: "inline-flex items-center px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full", children: log.action }) }), _jsx("td", { className: "p-4 text-gray-200", children: log.entity }), _jsx("td", { className: "p-4 text-gray-400 font-mono text-xs", children: log.ip })] }, index)))) })] }) }), pagination.totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-between mt-6", children: [_jsxs("p", { className: "text-sm text-gray-500", children: ["Showing ", ((pagination.page - 1) * pagination.limit) + 1, " to", ' ', Math.min(pagination.page * pagination.limit, pagination.total), " of", ' ', pagination.total, " logs"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => handlePageChange(pagination.page - 1), disabled: pagination.page === 1, className: "p-2 text-gray-400 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: _jsx(ChevronLeft, { size: 16 }) }), _jsxs("span", { className: "text-sm text-gray-300", children: ["Page ", pagination.page, " of ", pagination.totalPages] }), _jsx("button", { onClick: () => handlePageChange(pagination.page + 1), disabled: pagination.page === pagination.totalPages, className: "p-2 text-gray-400 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: _jsx(ChevronRight, { size: 16 }) })] })] }))] }));
}
