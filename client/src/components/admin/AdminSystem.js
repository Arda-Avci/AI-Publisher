import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Cpu, Database, Globe, HardDrive, Server, Clock, AlertTriangle, CheckCircle, XCircle, FileText, Box, Activity, } from 'lucide-react';
import AuditLogPanel from './AuditLogPanel';
import DockerStatusPanel from './DockerStatusPanel';
function StatusBadge({ status }) {
    const colors = {
        healthy: 'bg-green-500/10 text-green-400 border-green-500/30',
        degraded: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        down: 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    return (_jsxs("span", { className: `inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${colors[status] || colors.degraded}`, children: [status === 'healthy' ? (_jsx(CheckCircle, { size: 12 })) : status === 'down' ? (_jsx(XCircle, { size: 12 })) : (_jsx(AlertTriangle, { size: 12 })), status] }));
}
export default function AdminSystem() {
    const [activeTab, setActiveTab] = useState('health');
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const fetchHealth = async () => {
        try {
            const r = await fetch('/api/v1/admin/system');
            const d = await r.json();
            if (d.success)
                setHealth(d.data);
            else
                setError(d.error);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        setLoading(false);
    };
    useEffect(() => {
        let cancelled = false;
        fetch('/api/v1/admin/system')
            .then((r) => r.json())
            .then((d) => {
            if (!cancelled) {
                if (d.success)
                    setHealth(d.data);
                else
                    setError(d.error);
            }
        })
            .catch((e) => {
            if (!cancelled)
                setError(e instanceof Error ? e.message : String(e));
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    const formatBytes = (bytes) => {
        if (!bytes)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };
    const formatDuration = (seconds) => {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
    };
    if (loading)
        return (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" }) }));
    const tabs = [
        { id: 'health', label: 'System Health', icon: Activity },
        { id: 'audit', label: 'Audit Log', icon: FileText },
        { id: 'docker', label: 'Docker Status', icon: Box },
    ];
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-100", children: "System Management" }), activeTab === 'health' && (_jsx("button", { onClick: () => {
                            setLoading(true);
                            fetchHealth();
                        }, className: "px-3 py-1.5 text-sm text-gray-400 hover:text-amber-400 border border-gray-700 hover:border-amber-500/50 rounded-lg transition-colors", children: "Refresh" }))] }), _jsx("div", { className: "flex space-x-1 mb-6 bg-gray-800/30 p-1 rounded-lg border border-gray-700/50", children: tabs.map((tab) => (_jsxs("button", { onClick: () => setActiveTab(tab.id), className: `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab.id
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent'}`, children: [_jsx(tab.icon, { size: 16 }), tab.label] }, tab.id))) }), activeTab === 'health' && (_jsxs("div", { children: [error && (_jsx("div", { className: "p-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400", children: error })), health && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center gap-4 p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl", children: [_jsx("div", { className: `p-3 rounded-xl ${health.status === 'healthy' ? 'bg-green-500/10' : health.status === 'down' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`, children: health.status === 'healthy' ? (_jsx(CheckCircle, { size: 24, className: "text-green-400" })) : health.status === 'down' ? (_jsx(XCircle, { size: 24, className: "text-red-400" })) : (_jsx(AlertTriangle, { size: 24, className: "text-yellow-400" })) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "text-sm font-semibold text-gray-200", children: "System Status" }), _jsx(StatusBadge, { status: health.status })] }), _jsxs("p", { className: "text-xs text-gray-500", children: ["Uptime: ", formatDuration(health.uptime), " \u00B7 Node ", health.nodeVersion, " \u00B7", ' ', health.platform] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(HardDrive, { size: 16, className: "text-amber-400" }), _jsx("h3", { className: "text-sm font-semibold text-gray-200", children: "Memory" })] }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-500", children: "Heap Used" }), _jsx("span", { className: "text-gray-200", children: formatBytes(health.memoryUsage.heapUsed) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-500", children: "Heap Total" }), _jsx("span", { className: "text-gray-200", children: formatBytes(health.memoryUsage.heapTotal) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-500", children: "RSS" }), _jsx("span", { className: "text-gray-200", children: formatBytes(health.memoryUsage.rss) })] }), _jsx("div", { className: "w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden", children: _jsx("div", { className: "h-full bg-amber-400 rounded-full transition-all", style: {
                                                                width: `${Math.min((health.memoryUsage.heapUsed / health.memoryUsage.heapTotal) * 100, 100)}%`,
                                                            } }) })] })] }), _jsxs("div", { className: "p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(Cpu, { size: 16, className: "text-amber-400" }), _jsx("h3", { className: "text-sm font-semibold text-gray-200", children: "CPU" })] }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-500", children: "User" }), _jsxs("span", { className: "text-gray-200", children: [(health.cpuUsage.user / 1000).toFixed(1), "s"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-500", children: "System" }), _jsxs("span", { className: "text-gray-200", children: [(health.cpuUsage.system / 1000).toFixed(1), "s"] })] })] })] }), _jsxs("div", { className: "p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(Database, { size: 16, className: "text-amber-400" }), _jsx("h3", { className: "text-sm font-semibold text-gray-200", children: "Database" })] }), _jsx("div", { className: "text-sm", children: _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-500", children: "Connections" }), _jsx("span", { className: "text-gray-200", children: health.dbConnections })] }) })] }), _jsxs("div", { className: "p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(Globe, { size: 16, className: "text-amber-400" }), _jsx("h3", { className: "text-sm font-semibold text-gray-200", children: "Docker GPU" })] }), _jsx("div", { className: "text-sm", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-gray-500", children: "Status" }), _jsx("span", { className: `inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${health.dockerConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`, children: health.dockerConnected ? 'Connected' : 'Disconnected' })] }) })] })] }), _jsxs("div", { className: "p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(Server, { size: 16, className: "text-amber-400" }), _jsx("h3", { className: "text-sm font-semibold text-gray-200", children: "Job Queue" })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
                                            { label: 'Active', value: health.activeJobs, color: 'text-blue-400' },
                                            { label: 'Queued', value: health.queuedJobs, color: 'text-yellow-400' },
                                            { label: 'Completed', value: health.completedJobs, color: 'text-green-400' },
                                            { label: 'Failed', value: health.failedJobs, color: 'text-red-400' },
                                        ].map((item) => (_jsxs("div", { className: "text-center p-3 bg-gray-900/50 rounded-lg", children: [_jsx("div", { className: `text-2xl font-bold ${item.color}`, children: item.value }), _jsx("div", { className: "text-xs text-gray-500 mt-1", children: item.label })] }, item.label))) })] }), _jsxs("p", { className: "text-center text-xs text-gray-600", children: [_jsx(Clock, { size: 12, className: "inline mr-1" }), "Last updated: ", new Date().toLocaleString()] })] }))] })), activeTab === 'audit' && _jsx(AuditLogPanel, {}), activeTab === 'docker' && _jsx(DockerStatusPanel, {})] }));
}
