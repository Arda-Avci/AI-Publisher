import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Users, Video, Play, TrendingUp, Activity } from 'lucide-react';
const statCards = [
    {
        label: 'Total Users',
        key: 'totalUsers',
        icon: Users,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
    },
    {
        label: 'Total Jobs',
        key: 'totalJobs',
        icon: Video,
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
    },
    {
        label: 'Active Jobs',
        key: 'activeJobs',
        icon: Play,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
    },
    {
        label: 'Videos Published',
        key: 'totalVideos',
        icon: TrendingUp,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
    },
];
export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch('/api/v1/admin/stats')
            .then((r) => r.json())
            .then((d) => {
            if (d.success)
                setStats(d.stats);
        })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" }) }));
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-100 tracking-tight", children: "Dashboard" }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: "System overview and key metrics" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8", children: statCards.map(({ label, key, icon: Icon, color, bg }) => (_jsxs("div", { className: "bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("span", { className: "text-xs font-medium text-gray-500 uppercase tracking-wider", children: label }), _jsx("div", { className: `p-2 rounded-lg ${bg}`, children: _jsx(Icon, { size: 16, className: color }) })] }), _jsx("span", { className: "text-3xl font-bold text-gray-100", children: stats?.[key] ?? 0 }), _jsx("div", { className: "mt-2 h-1 bg-gray-800 rounded-full overflow-hidden", children: _jsx("div", { className: `h-full rounded-full ${color.replace('text-', 'bg-')} opacity-60`, style: { width: `${Math.min(100, ((stats?.[key] ?? 0) / 100) * 100)}%` } }) })] }, key))) }), _jsxs("div", { className: "bg-gray-900/60 border border-gray-800 rounded-xl p-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx(Activity, { size: 20, className: "text-amber-400" }), _jsx("h2", { className: "text-lg font-semibold text-gray-100", children: "Quick Actions" })] }), _jsx("p", { className: "text-sm text-gray-500", children: "Select a section from the sidebar to manage users, help videos, or system settings." })] })] }));
}
