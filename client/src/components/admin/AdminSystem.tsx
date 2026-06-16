import { useState, useEffect } from 'react';
import { Cpu, Database, Globe, HardDrive, Server, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  nodeVersion: string;
  platform: string;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
  cpuUsage: { user: number; system: number };
  dbConnections: number;
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  colabConnected: boolean;
}

export default function AdminSystem() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHealth = async () => {
    try {
      const r = await fetch('/api/v1/admin/system');
      const d = await r.json();
      if (d.success) setHealth(d.data);
      else setError(d.error);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchHealth(); }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number) => {
    const d = Math.floor(seconds / 86400); const h = Math.floor((seconds % 86400) / 3600); const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      healthy: 'bg-green-500/10 text-green-400 border-green-500/30',
      degraded: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      down: 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${colors[status] || colors.degraded}`}>
        {status === 'healthy' ? <CheckCircle size={12} /> : status === 'down' ? <XCircle size={12} /> : <AlertTriangle size={12} />}
        {status}
      </span>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">System Health</h1>
        <button onClick={() => { setLoading(true); fetchHealth(); }} className="px-3 py-1.5 text-sm text-gray-400 hover:text-amber-400 border border-gray-700 hover:border-amber-500/50 rounded-lg transition-colors">
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{error}</div>
      )}

      {health && (
        <div className="space-y-6">
          {/* Status row */}
          <div className="flex items-center gap-4 p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl">
            <div className={`p-3 rounded-xl ${health.status === 'healthy' ? 'bg-green-500/10' : health.status === 'down' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
              {health.status === 'healthy' ? <CheckCircle size={24} className="text-green-400" /> : health.status === 'down' ? <XCircle size={24} className="text-red-400" /> : <AlertTriangle size={24} className="text-yellow-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-200">System Status</span>
                <StatusBadge status={health.status} />
              </div>
              <p className="text-xs text-gray-500">Uptime: {formatDuration(health.uptime)} · Node {health.nodeVersion} · {health.platform}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Memory */}
            <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-gray-200">Memory</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Heap Used</span><span className="text-gray-200">{formatBytes(health.memoryUsage.heapUsed)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Heap Total</span><span className="text-gray-200">{formatBytes(health.memoryUsage.heapTotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">RSS</span><span className="text-gray-200">{formatBytes(health.memoryUsage.rss)}</span></div>
                <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.min((health.memoryUsage.heapUsed / health.memoryUsage.heapTotal) * 100, 100)}%` }} />
                </div>
              </div>
            </div>

            {/* CPU */}
            <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-gray-200">CPU</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">User</span><span className="text-gray-200">{(health.cpuUsage.user / 1000).toFixed(1)}s</span></div>
                <div className="flex justify-between"><span className="text-gray-500">System</span><span className="text-gray-200">{(health.cpuUsage.system / 1000).toFixed(1)}s</span></div>
              </div>
            </div>

            {/* Database */}
            <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Database size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-gray-200">Database</h3>
              </div>
              <div className="text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Connections</span><span className="text-gray-200">{health.dbConnections}</span></div>
              </div>
            </div>

            {/* Colab */}
            <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Globe size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-gray-200">Colab Server</h3>
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${health.colabConnected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {health.colabConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Job Queue Stats */}
          <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Server size={16} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-gray-200">Job Queue</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Active', value: health.activeJobs, color: 'text-blue-400' },
                { label: 'Queued', value: health.queuedJobs, color: 'text-yellow-400' },
                { label: 'Completed', value: health.completedJobs, color: 'text-green-400' },
                { label: 'Failed', value: health.failedJobs, color: 'text-red-400' },
              ].map(item => (
                <div key={item.label} className="text-center p-3 bg-gray-900/50 rounded-lg">
                  <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer meta */}
          <p className="text-center text-xs text-gray-600">
            <Clock size={12} className="inline mr-1" />
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
