import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { LayoutDashboard, Users, HelpCircle, LogOut, ChevronLeft, ChevronRight, Activity, } from 'lucide-react';
const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'help-videos', label: 'Help Videos', icon: HelpCircle },
    { id: 'system', label: 'System', icon: Activity },
];
export default function AdminLayout({ children, currentPage, onNavigate, onLogout, username, }) {
    const [collapsed, setCollapsed] = useState(false);
    return (_jsxs("div", { className: "flex h-screen bg-gray-950 text-gray-100", children: [_jsxs("aside", { className: `flex flex-col border-r border-gray-800 bg-gray-900/50 backdrop-blur-sm transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`, children: [_jsxs("div", { className: "flex items-center justify-between h-14 px-3 border-b border-gray-800", children: [!collapsed && (_jsx("span", { className: "text-sm font-semibold tracking-wider text-amber-400 uppercase truncate", children: "Admin" })), _jsx("button", { onClick: () => setCollapsed(!collapsed), className: "p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors", children: collapsed ? _jsx(ChevronRight, { size: 16 }) : _jsx(ChevronLeft, { size: 16 }) })] }), _jsx("nav", { className: "flex-1 py-3 space-y-1 px-2", children: navItems.map(({ id, label, icon: Icon }) => (_jsxs("button", { onClick: () => onNavigate(id), className: `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${currentPage === id
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent'}`, children: [_jsx(Icon, { size: 18, className: "shrink-0" }), !collapsed && _jsx("span", { className: "truncate", children: label })] }, id))) }), _jsxs("div", { className: "p-3 border-t border-gray-800", children: [_jsxs("div", { className: "flex items-center gap-2 px-2 py-2 text-xs text-gray-500", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-green-500 shrink-0" }), !collapsed && _jsx("span", { className: "truncate", children: username })] }), _jsxs("button", { onClick: onLogout, className: "flex items-center gap-3 w-full px-3 py-2 mt-1 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors", children: [_jsx(LogOut, { size: 18, className: "shrink-0" }), !collapsed && _jsx("span", { children: "Logout" })] })] })] }), _jsx("main", { className: "flex-1 overflow-auto", children: _jsx("div", { className: "p-6 max-w-7xl mx-auto", children: children }) })] }));
}
