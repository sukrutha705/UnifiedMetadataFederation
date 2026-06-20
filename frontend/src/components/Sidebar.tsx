import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Database,
  CheckCircle,
  GitMerge,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  userRole?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Smart Search', path: '/search', icon: Search },
    { name: 'Metadata', path: '/metadata', icon: Database },
    { name: 'Consistency', path: '/consistency', icon: CheckCircle },
    { name: 'Reconciliation', path: '/reconciliation', icon: GitMerge },
    { name: 'Events', path: '/events', icon: Clock },
    { name: 'Audits', path: '/audits', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-violet-500" />
          <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            UMFP CORES
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-400 group-hover:text-slate-100'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {userRole && (
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Active Role</p>
              <p className="text-sm font-semibold text-slate-300">{userRole}</p>
            </div>
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
