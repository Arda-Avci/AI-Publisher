import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';

type AdminPage = 'dashboard' | 'users' | 'help-videos' | 'system';

const navItems: { id: AdminPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'help-videos', label: 'Help Videos', icon: HelpCircle },
  { id: 'system', label: 'System', icon: Activity },
];

export default function AdminLayout({
  children,
  currentPage,
  onNavigate,
  onLogout,
  username,
}: {
  children: React.ReactNode;
  currentPage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  username: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <aside
        className={`flex flex-col border-r border-gray-800 bg-gray-900/50 backdrop-blur-sm transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}
      >
        <div className="flex items-center justify-between h-14 px-3 border-b border-gray-800">
          {!collapsed && (
            <span className="text-sm font-semibold tracking-wider text-amber-400 uppercase truncate">
              Admin
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 py-3 space-y-1 px-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${
                  currentPage === id
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent'
                }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2 px-2 py-2 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            {!collapsed && <span className="truncate">{username}</span>}
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2 mt-1 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

export type { AdminPage };
