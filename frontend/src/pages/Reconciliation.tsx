import React, { useState } from 'react';
import { GitMerge, Check, AlertCircle, RefreshCw, Info } from 'lucide-react';
import api from '../services/api';

interface ReconciliationResponse {
  object_name: string;
  source_of_truth: string;
  updated_catalogs: string[];
  status: string;
}

const Reconciliation: React.FC = () => {
  const [objectName, setObjectName] = useState('customer');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<ReconciliationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectName.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    setResult(null);

    try {
      const response = await api.post(`/client/reconcile/${encodeURIComponent(objectName)}`);
      setResult(response.data);
    } catch (err: any) {
      console.error('Reconciliation check failed:', err);
      if (err.response && err.response.status === 404) {
        setError(`Failed to reconcile. Object "${objectName}" was not found or is already consistent across all catalogs.`);
      } else {
        setError('An error occurred during metadata reconciliation execution.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Orchestration & Reconciliation Center
        </h2>
        <p className="text-sm text-slate-500">
          Enforce the source-of-truth schema values across all active catalogs automatically.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={runReconciliation} className="max-w-xl">
        <div className="flex gap-4">
          <input
            type="text"
            value={objectName}
            onChange={(e) => setObjectName(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
            placeholder="Enter inconsistent object name (e.g. customer)"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? 'RECONCILING...' : 'RECONCILE SCHEMA'}
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm max-w-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="max-w-3xl p-8 bg-slate-900/20 border border-slate-850 rounded-2xl animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 w-1/4 rounded"></div>
          <div className="h-4 bg-slate-800 w-1/2 rounded"></div>
          <div className="h-20 bg-slate-800 rounded"></div>
        </div>
      )}

      {!loading && searched && result && (
        <div className="max-w-2xl space-y-6">
          {/* Success message banner */}
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-sm">
            <Check className="w-5 h-5 shrink-0 bg-green-500/20 rounded-full p-0.5" />
            <div>
              <p className="font-semibold">Reconciliation Executed Successfully!</p>
              <p className="text-xs text-green-500/80 mt-0.5">
                The consistency engine synced all metadata records to match the canonical source of truth.
              </p>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/85">
              <GitMerge className="w-5 h-5 text-violet-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Sync Details for: "{result.object_name}"
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Source of truth catalog */}
              <div className="p-4 bg-slate-900/50 border border-slate-850 rounded-xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Canonical Source of Truth
                </span>
                <span className="text-xl font-black text-slate-200 mt-2 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-violet-500 rounded-full"></span>
                  {result.source_of_truth}
                </span>
              </div>

              {/* Updated catalogs count */}
              <div className="p-4 bg-slate-900/50 border border-slate-850 rounded-xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Catalogs Sync-Updated
                </span>
                <span className="text-xl font-black text-slate-200 mt-2">
                  {result.updated_catalogs.length}
                </span>
              </div>
            </div>

            {/* List of updated catalogs */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Updated Target Connections
              </h4>
              {result.updated_catalogs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  All databases were already fully synchronized. No target updates were required.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {result.updated_catalogs.map((catalog) => (
                    <span
                      key={catalog}
                      className="text-xs font-black uppercase text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20"
                    >
                      {catalog}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info card on reconciliation priority logic */}
      <div className="max-w-2xl p-6 bg-slate-900/20 border border-slate-850 rounded-2xl flex items-start gap-4">
        <Info className="w-6 h-6 text-violet-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider">
            Reconciliation Priorities
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            The platform compares metadata attributes (object type, description, and owner name) across databases. If a mismatch is detected, reconciliation copies the values from the highest-priority catalog (priority hierarchy: <strong className="text-slate-400">Spark (1)</strong> &gt; <strong className="text-slate-400">PostgreSQL (2)</strong> &gt; <strong className="text-slate-400">OpenSearch (3)</strong>) to override other catalogs, rebuilds the cache, and writes events/auditing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reconciliation;
