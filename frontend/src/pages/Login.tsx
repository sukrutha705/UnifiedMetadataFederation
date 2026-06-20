import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, User as UserIcon, AlertCircle, Database } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, username: string, role: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    try {
      const response = await axios.post(`${backendUrl}/auth/login`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;

      // Decode JWT token to extract role (basic base64 decode of middle section)
      try {
        const payloadBase64 = access_token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        const role = payload.role || 'Viewer';
        onLoginSuccess(access_token, username, role);
        navigate('/');
      } catch (err) {
        console.error('Error parsing token:', err);
        onLoginSuccess(access_token, username, 'Viewer');
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Connection failed. Please make sure the backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0,transparent_55%)] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-4">
            <Database className="w-6 h-6 text-violet-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-wide text-center">
            Unified Metadata Federation
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
            Dell Hackathon Demo Center
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm leading-snug">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] disabled:opacity-50 text-sm tracking-wider uppercase"
          >
            {loading ? 'Authenticating...' : 'AUTHENTICATE'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500">
          <p>Demo accounts: Admin (admin/admin123), Engineer (engineer/engineer123), Viewer (viewer/viewer123)</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
