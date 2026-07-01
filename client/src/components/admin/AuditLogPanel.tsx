import { useState, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  ip: string;
}

interface AuditLogResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export default function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchLogs = async (page: number = 1) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/audit?page=${page}&limit=${pagination.limit}`);
      const d: AuditLogResponse = await r.json();
      if (d.success) {
        setLogs(d.data);
        setPagination(d.pagination);
      } else {
        setError(d.error || 'Failed to fetch audit logs');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchLogs(newPage);
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-100">Audit Log</h2>
        <button
          onClick={() => fetchLogs(pagination.page)}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-amber-400 border border-gray-700 hover:border-amber-500/50 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="text-left p-4 text-gray-400 font-medium">Timestamp</th>
              <th className="text-left p-4 text-gray-400 font-medium">User</th>
              <th className="text-left p-4 text-gray-400 font-medium">Action</th>
              <th className="text-left p-4 text-gray-400 font-medium">Entity</th>
              <th className="text-left p-4 text-gray-400 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-8 text-gray-500">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-700/30 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="p-4 text-gray-300">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-500" />
                      {formatDate(log.timestamp)}
                    </div>
                  </td>
                  <td className="p-4 text-gray-200">{log.user}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-gray-200">{log.entity}</td>
                  <td className="p-4 text-gray-400 font-mono text-xs">{log.ip}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} logs
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 text-gray-400 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-300">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 text-gray-400 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}