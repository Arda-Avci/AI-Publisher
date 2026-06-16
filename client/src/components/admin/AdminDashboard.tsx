import { useEffect, useState } from 'react';
import { Users, Video, Play, TrendingUp, Activity } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalJobs: number;
  activeJobs: number;
  totalVideos: number;
}

const statCards = [
  { label: 'Total Users', key: 'totalUsers' as const, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { label: 'Total Jobs', key: 'totalJobs' as const, icon: Video, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { label: 'Active Jobs', key: 'activeJobs' as const, icon: Play, color: 'text-green-400', bg: 'bg-green-500/10' },
  { label: 'Videos Published', key: 'totalVideos' as const, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/admin/stats')
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">System overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, key, icon: Icon, color, bg }) => (
          <div key={key} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon size={16} className={color} />
              </div>
            </div>
            <span className="text-3xl font-bold text-gray-100">{stats?.[key] ?? 0}</span>
            <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color.replace('text-', 'bg-')} opacity-60`}
                style={{ width: `${Math.min(100, ((stats?.[key] ?? 0) / 100) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity size={20} className="text-amber-400" />
          <h2 className="text-lg font-semibold text-gray-100">Quick Actions</h2>
        </div>
        <p className="text-sm text-gray-500">Select a section from the sidebar to manage users, help videos, or system settings.</p>
      </div>
    </div>
  );
}
