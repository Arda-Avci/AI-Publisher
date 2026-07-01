import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
export default function DockerStatusPanel() {
    const [status, setStatus] = useState(null);
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const fetchDockerData = async () => {
        setLoading(true);
        try {
            const [statusRes, containersRes] = await Promise.all([
                fetch('/api/v1/docker/status'),
                fetch('/api/v1/docker/containers'),
            ]);
            const statusData = await statusRes.json();
            const containersData = await containersRes.json();
            if (statusData.success) {
                setStatus(statusData.data);
            }
            else {
                setError(statusData.error || 'Failed to fetch Docker status');
            }
            if (containersData.success) {
                setContainers(containersData.data);
            }
            else {
                setError(containersData.error || 'Failed to fetch Docker containers');
            }
            setLastRefresh(new Date());
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        setLoading(false);
    };
    useEffect(() => {
        fetchDockerData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchDockerData, 30000);
        return () => clearInterval(interval);
    }, []);
    const getStatusBadge = (status) => {
        const colors = {
            running: 'bg-green-500/10 text-green-400 border-green-500/30',
            stopped: 'bg-red-500/10 text-red-400 border-red-500/30',
            paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
            created: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
            exited: 'bg-red-500/10 text-red-400 border-red-500/30',
        };
        const icons = {
            running: CheckCircle,
            stopped: XCircle,
            paused: AlertTriangle,
            created: AlertTriangle,
            exited: XCircle,
        };
        const Icon = icons[status] || AlertTriangle;
        return (_jsxs("span", { className: `inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${colors[status] || colors.stopped}`, children: [_jsx(Icon, { size: 12 }), status] }));
    };
    if (loading && !status) {
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-xl font-bold text-gray-100", children: "Docker Status" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "text-xs text-gray-500", children: ["Last updated: ", lastRefresh.toLocaleTimeString()] }), _jsx("button", { onClick: fetchDockerData, disabled: loading, className: "px-3 py-1.5 text-sm text-gray-400 hover:text-amber-400 border border-gray-700 hover:border-amber-500/50 rounded-lg transition-colors disabled:opacity-50", children: _jsx(RefreshCw, { size: 14, className: loading ? 'animate-spin' : '' }) })] })] }), error && (_jsx("div", { className: "p-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400", children: error })), status && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center gap-4 p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl", children: [_jsx("div", { className: `p-3 rounded-xl ${status.connected ? 'bg-green-500/10' : 'bg-red-500/10'}`, children: status.connected ? (_jsx(CheckCircle, { size: 24, className: "text-green-400" })) : (_jsx(XCircle, { size: 24, className: "text-red-400" })) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "text-sm font-semibold text-gray-200", children: "Docker Engine" }), _jsx("span", { className: `inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${status.connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`, children: status.connected ? 'Connected' : 'Disconnected' })] }), status.version && (_jsxs("p", { className: "text-xs text-gray-500", children: ["Version: ", status.version, " \u00B7 ", status.os, " \u00B7 ", status.architecture] }))] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx("div", { className: "p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-3xl font-bold text-amber-400", children: status.containers }), _jsx("div", { className: "text-sm text-gray-500 mt-1", children: "Containers" })] }) }), _jsx("div", { className: "p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-3xl font-bold text-amber-400", children: status.images }), _jsx("div", { className: "text-sm text-gray-500 mt-1", children: "Images" })] }) })] }), _jsxs("div", { className: "bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden", children: [_jsx("div", { className: "p-4 border-b border-gray-700/50", children: _jsx("h3", { className: "text-sm font-semibold text-gray-200", children: "Containers" }) }), containers.length === 0 ? (_jsx("div", { className: "p-8 text-center text-gray-500", children: "No containers found" })) : (_jsx("div", { className: "divide-y divide-gray-700/30", children: containers.map((container) => (_jsx("div", { className: "p-4 hover:bg-gray-800/50 transition-colors", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-200 truncate", children: container.name }), getStatusBadge(container.status)] }), _jsx("div", { className: "text-xs text-gray-500 truncate", children: container.image }), container.ports && (_jsxs("div", { className: "text-xs text-gray-500 mt-1", children: ["Ports: ", container.ports] }))] }), _jsx("div", { className: "text-xs text-gray-500 ml-4", children: new Date(container.created).toLocaleDateString() })] }) }, container.id))) }))] }), _jsx("p", { className: "text-center text-xs text-gray-600", children: "Auto-refreshes every 30 seconds" })] }))] }));
}
