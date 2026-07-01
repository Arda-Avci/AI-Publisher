import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { Search, Shield, ShieldOff, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const limit = 50;
    const fetchUsers = useCallback(async () => {
        try {
            const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
            if (search)
                params.set('search', search);
            const r = await fetch(`/api/v1/admin/users?${params}`);
            const d = await r.json();
            if (d.success) {
                setUsers(d.users);
                setTotal(d.total);
            }
        }
        catch (e) {
            console.error(e);
        }
        finally {
            setLoading(false);
        }
    }, [offset, search]);
    useEffect(() => {
        let cancelled = false;
        const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
        if (search)
            params.set('search', search);
        fetch(`/api/v1/admin/users?${params}`)
            .then((r) => r.json())
            .then((d) => {
            if (!cancelled && d.success) {
                setUsers(d.users);
                setTotal(d.total);
            }
        })
            .catch((e) => {
            if (!cancelled)
                console.error(e);
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [offset, search]);
    const toggleAdmin = async (id) => {
        try {
            const r = await fetch(`/api/v1/admin/users/${id}/toggle-admin`, { method: 'PATCH' });
            const d = await r.json();
            if (d.success)
                fetchUsers();
        }
        catch (e) {
            console.error(e);
        }
    };
    const deleteUser = async (id) => {
        if (!confirm('Delete this user? This action cannot be undone.'))
            return;
        try {
            const r = await fetch(`/api/v1/admin/users/${id}`, { method: 'DELETE' });
            const d = await r.json();
            if (d.success) {
                fetchUsers();
                window.showToast?.('success', 'Kullanıcı Silindi', 'Kullanıcı başarıyla silindi.');
            }
            else {
                window.showToast?.('error', 'Silme Hatası', d.error || 'Bilinmeyen hata');
            }
        }
        catch (e) {
            console.error(e);
            window.showToast?.('error', 'Sistem Hatası', e.message);
        }
    };
    const handleSearch = (e) => {
        e.preventDefault();
        setOffset(0);
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-100 tracking-tight", children: "Users" }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: "Manage registered users and admin permissions" })] }), _jsx("form", { onSubmit: handleSearch, className: "mb-6", children: _jsxs("div", { className: "relative max-w-md", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search by username...", className: "w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors" })] }) }), _jsxs("div", { className: "bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-800 bg-gray-900/80", children: [_jsx("th", { className: "text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider", children: "ID" }), _jsx("th", { className: "text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Username" }), _jsx("th", { className: "text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Admin" }), _jsx("th", { className: "text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Lang" }), _jsx("th", { className: "text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Theme" }), _jsx("th", { className: "text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Created" }), _jsx("th", { className: "text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-800/50", children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "py-12 text-center text-gray-500", children: _jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto" }) }) })) : users.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "py-12 text-center text-gray-500", children: "No users found" }) })) : (users.map((user) => (_jsxs("tr", { className: "hover:bg-gray-800/30 transition-colors", children: [_jsxs("td", { className: "py-3 px-4 text-gray-400 font-mono text-xs", children: ["#", user.id] }), _jsx("td", { className: "py-3 px-4", children: _jsx("span", { className: "text-gray-200 font-medium", children: user.username }) }), _jsx("td", { className: "py-3 px-4", children: _jsx("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                      ${user.is_admin ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-800 text-gray-500'}`, children: user.is_admin ? 'Admin' : 'User' }) }), _jsx("td", { className: "py-3 px-4 text-gray-400", children: user.preferred_language || '—' }), _jsx("td", { className: "py-3 px-4 text-gray-400", children: user.selected_theme || '—' }), _jsx("td", { className: "py-3 px-4 text-gray-500 text-xs", children: user.created_at ? new Date(user.created_at).toLocaleDateString() : '—' }), _jsx("td", { className: "py-3 px-4", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => toggleAdmin(user.id), className: `p-1.5 rounded-lg transition-colors
                          ${user.is_admin
                                                                ? 'text-amber-400 hover:bg-amber-500/10'
                                                                : 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/10'}`, title: user.is_admin ? 'Revoke admin' : 'Grant admin', children: user.is_admin ? _jsx(Shield, { size: 15 }) : _jsx(ShieldOff, { size: 15 }) }), _jsx("button", { onClick: () => deleteUser(user.id), className: "p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors", title: "Delete user", children: _jsx(Trash2, { size: 15 }) })] }) })] }, user.id)))) })] }) }), total > limit && (_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/80", children: [_jsxs("span", { className: "text-xs text-gray-500", children: [total, " total users"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { disabled: offset === 0, onClick: () => setOffset(Math.max(0, offset - limit)), className: "p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors", children: _jsx(ChevronLeft, { size: 16 }) }), _jsx("button", { disabled: offset + limit >= total, onClick: () => setOffset(offset + limit), className: "p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors", children: _jsx(ChevronRight, { size: 16 }) })] })] }))] })] }));
}
