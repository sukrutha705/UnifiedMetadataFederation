import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../services/api';

interface AuditLogResponse {
  id: number;
  username: string;
  role: string;
  action: string;
  catalog_name: string | null;
  metadata_id: number | null;
  timestamp: string;
}

const Audits: React.FC = () => {
  const [audits, setAudits] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAudits = async () => {
    try {
      const response = await api.get('/dashboard/audits');
      setAudits(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch audits:', err);
      setError('Unable to retrieve system audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
    const interval = setInterval(fetchAudits, 8000); // refresh every 8s
    return () => clearInterval(interval);
  }, []);

  const filteredAudits = audits.filter(
    (audit) =>
      audit.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (audit.catalog_name && audit.catalog_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getActionStyle = (action: string) => {
    if (action.startsWith('CLIENT_')) {
      return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
    }
    switch (action) {
      case 'LOGIN':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      case 'CREATE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'UPDATE':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'DELETE':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'RECONCILE':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700/50';
    }
  };

  const getActionIcon = (action: string) => {
    if (action === 'LOGIN') return '🔑';
    if (action.includes('CREATE')) return '➕';
    if (action.includes('UPDATE')) return '✏️';
    if (action.includes('DELETE')) return '🗑️';
    if (action.includes('RECONCILE')) return '🔄';
    return '⚡';
  };

  const getSeverity = (action: string) => {
    if (action === 'DELETE' || action === 'CLIENT_DELETE') return { label: 'CRITICAL', style: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    if (action === 'UPDATE' || action === 'CLIENT_UPDATE' || action === 'RECONCILE') return { label: 'WARNING', style: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'INFO', style: 'text-slate-400 bg-slate-800 border-slate-700/50' };
  };

  const quickFilters = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'RECONCILE', 'LOGIN'];

  return (
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            System Audit Center
          </h2>
          <p className="text-sm text-slate-500">
            Immutable tracking logs of all system operations, authentications, and adjustments.
          </p>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            fetchAudits();
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 rounded-lg hover:text-slate-200 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> REFRESH
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm max-w-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-1.5">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action, user, role, or catalog..."
            className="w-full bg-transparent border-none text-xs text-slate-350 focus:outline-none pl-3"
          />
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2">Quick Filters:</span>
          {quickFilters.map(filter => (
            <button
              key={filter}
              onClick={() => setSearchQuery(filter === 'ALL' ? '' : filter)}
              className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border transition-all ${
                (filter === 'ALL' && !searchQuery) || (filter !== 'ALL' && searchQuery.toUpperCase().includes(filter))
                  ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-slate-900 rounded-xl"></div>
          <div className="h-64 bg-slate-900 rounded-xl"></div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-850 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Catalog</th>
                  <th className="px-6 py-4">Metadata ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-550 text-xs">
                      No audit records found matching query
                    </td>
                  </tr>
                ) : (
                  filteredAudits.map((audit) => (
                    <tr key={audit.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {new Date(audit.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-200">
                        {audit.username}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">{audit.role}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase border px-2 py-0.5 rounded flex items-center gap-1.5 w-max ${getActionStyle(audit.action)}`}>
                          <span>{getActionIcon(audit.action)}</span>
                          {audit.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-black uppercase border px-2 py-0.5 rounded ${getSeverity(audit.action).style}`}>
                          {getSeverity(audit.action).label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {audit.catalog_name ? (
                          <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {audit.catalog_name}
                          </span>
                        ) : (
                          <span className="text-slate-650 italic text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {audit.metadata_id !== null ? `#${audit.metadata_id}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Audits;
