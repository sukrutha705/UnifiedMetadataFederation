import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Cpu } from 'lucide-react';

interface NavbarProps {
  username?: string;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ username, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur text-slate-100 flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <Cpu className="w-5 h-5 text-indigo-400" />
        <h1 className="text-md font-semibold tracking-wider bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Unified Metadata Federation Platform
        </h1>
      </div>

      <div className="flex items-center gap-6">
        {username && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50">
            <User className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
              {username}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-semibold tracking-wider text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          LOGOUT
        </button>
      </div>
    </header>
  );
};

export default Navbar;
