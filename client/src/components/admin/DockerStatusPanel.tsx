import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DockerStatus {
  connected: boolean;
  version?: string;
  os?: string;
  architecture?: string;
  containers: number;
  images: number;
}

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'created' | 'exited';
  ports: string;
  created: string;
}

interface DockerStatusResponse {
  success: boolean;
  data: DockerStatus;
  error?: string;
}

interface DockerContainersResponse {
  success: boolean;
  data: DockerContainer[];
  error?: string;
}

export default function DockerStatusPanel() {
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDockerData = async () => {
    setLoading(true);
    try {
      const [statusRes, containersRes] = await Promise.all([
        fetch('/api/v1/docker/status'),
        fetch('/api/v1/docker/containers'),
      ]);

      const statusData: DockerStatusResponse = await statusRes.json();
      const containersData: DockerContainersResponse = await containersRes.json();

      if (statusData.success) {
        setStatus(statusData.data);
      } else {
        setError(statusData.error || 'Failed to fetch Docker status');
      }

      if (containersData.success) {
        setContainers(containersData.data);
      } else {
        setError(containersData.error || 'Failed to fetch Docker containers');
      }

      setLastRefresh(new Date());
    } catch (e: unknown) {
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      running: 'bg-green-500/10 text-green-400 border-green-500/30',
      stopped: 'bg-red-500/10 text-red-400 border-red-500/30',
      paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      created: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      exited: 'bg-red-500/10 text-red-400 border-red-500/30',
    };

    const icons: Record<string, typeof CheckCircle> = {
      running: CheckCircle,
      stopped: XCircle,
      paused: AlertTriangle,
      created: AlertTriangle,
      exited: XCircle,
    };

    const Icon = icons[status] || AlertTriangle;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${colors[status] || colors.stopped}`}
      >
        <Icon size={12} />
        {status}
      </span>
    );
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-100">Docker Status</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchDockerData}
            disabled={loading}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-amber-400 border border-gray-700 hover:border-amber-500/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {status && (
        <div className="space-y-6">
          {/* Docker Connection Status */}
          <div className="flex items-center gap-4 p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl">
            <div
              className={`p-3 rounded-xl ${status.connected ? 'bg-green-500/10' : 'bg-red-500/10'}`}
            >
              {status.connected ? (
                <CheckCircle size={24} className="text-green-400" />
              ) : (
                <XCircle size={24} className="text-red-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-200">Docker Engine</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${status.connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                >
                  {status.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {status.version && (
                <p className="text-xs text-gray-500">
                  Version: {status.version} · {status.os} · {status.architecture}
                </p>
              )}
            </div>
          </div>

          {/* Docker Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-400">{status.containers}</div>
                <div className="text-sm text-gray-500 mt-1">Containers</div>
              </div>
            </div>
            <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-400">{status.images}</div>
                <div className="text-sm text-gray-500 mt-1">Images</div>
              </div>
            </div>
          </div>

          {/* Containers List */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-200">Containers</h3>
            </div>
            {containers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No containers found</div>
            ) : (
              <div className="divide-y divide-gray-700/30">
                {containers.map((container) => (
                  <div
                    key={container.id}
                    className="p-4 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-gray-200 truncate">
                            {container.name}
                          </span>
                          {getStatusBadge(container.status)}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{container.image}</div>
                        {container.ports && (
                          <div className="text-xs text-gray-500 mt-1">Ports: {container.ports}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 ml-4">
                        {new Date(container.created).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auto-refresh indicator */}
          <p className="text-center text-xs text-gray-600">
            Auto-refreshes every 30 seconds
          </p>
        </div>
      )}
    </div>
  );
}