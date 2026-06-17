import { useEffect, useState, useCallback } from 'react';
import { Search, Shield, ShieldOff, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: number;
  username: string;
  is_admin: number;
  preferred_language: string | null;
  selected_theme: string | null;
  created_at: string | null;
  last_login_at: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 50;

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
      if (search) params.set('search', search);
      const r = await fetch(`/api/v1/admin/users?${params}`);
      const d = await r.json();
      if (d.success) {
        setUsers(d.users);
        setTotal(d.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [offset, search]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    if (search) params.set('search', search);
    fetch(`/api/v1/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) { setUsers(d.users); setTotal(d.total); } })
      .catch((e) => { if (!cancelled) console.error(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [offset, search]);

  const toggleAdmin = async (id: number) => {
    try {
      const r = await fetch(`/api/v1/admin/users/${id}/toggle-admin`, { method: 'PATCH' });
      const d = await r.json();
      if (d.success) fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return;
    try {
      const r = await fetch(`/api/v1/admin/users/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) fetchUsers();
      else alert(d.error);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Users</h1>
        <p className="text-sm text-gray-500 mt-1">Manage registered users and admin permissions</p>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
          />
        </div>
      </form>

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/80">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lang
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Theme
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">#{user.id}</td>
                    <td className="py-3 px-4">
                      <span className="text-gray-200 font-medium">{user.username}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                      ${user.is_admin ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-800 text-gray-500'}`}
                      >
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{user.preferred_language || '—'}</td>
                    <td className="py-3 px-4 text-gray-400">{user.selected_theme || '—'}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAdmin(user.id)}
                          className={`p-1.5 rounded-lg transition-colors
                          ${
                            user.is_admin
                              ? 'text-amber-400 hover:bg-amber-500/10'
                              : 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/10'
                          }`}
                          title={user.is_admin ? 'Revoke admin' : 'Grant admin'}
                        >
                          {user.is_admin ? <Shield size={15} /> : <ShieldOff size={15} />}
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 bg-gray-900/80">
            <span className="text-xs text-gray-500">{total} total users</span>
            <div className="flex items-center gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
