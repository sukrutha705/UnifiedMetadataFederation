import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

interface MetadataConflict {
  field: string;
  values: Record<string, string | null>;
}

interface ConsistencyResponse {
  object_name: string;
  consistent: boolean;
  conflicts: MetadataConflict[];
}

const Consistency: React.FC = () => {
  const location = useLocation();
  const initialObjectName = location.state?.objectName || 'customer';
  const [objectName, setObjectName] = useState(initialObjectName);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<ConsistencyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.objectName) {
      const autoCheck = async () => {
        setLoading(true);
        setError(null);
        setSearched(true);
        try {
          const response = await api.get(`/client/consistency/${encodeURIComponent(location.state.objectName)}`);
          setResult(response.data);
        } catch (err: any) {
          if (err.response && err.response.status === 404) {
            setError(`Object "${location.state.objectName}" was not found in any metadata catalog registry.`);
          } else {
            setError('An error occurred while checking metadata consistency.');
          }
        } finally {
          setLoading(false);
        }
      };
      autoCheck();
    }
  }, [location.state?.objectName]);

  const checkConsistency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectName.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    setResult(null);

    try {
      const response = await api.get(`/client/consistency/${encodeURIComponent(objectName)}`);
      setResult(response.data);
    } catch (err: any) {
      console.error('Consistency check failed:', err);
      if (err.response && err.response.status === 404) {
        setError(`Object "${objectName}" was not found in any metadata catalog registry.`);
      } else {
        setError('An error occurred while checking metadata consistency.');
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
          Consistency Audit Center
        </h2>
        <p className="text-sm text-slate-500">
          Verify metadata schema matching across multi-cloud database catalogs.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={checkConsistency} className="max-w-xl">
        <div className="flex gap-4">
          <input
            type="text"
            value={objectName}
            onChange={(e) => setObjectName(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
            placeholder="Enter metadata object name (e.g. customer, orders)"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? 'AUDITING...' : 'AUDIT CONSISTENCY'}
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
          <div className="h-24 bg-slate-800 rounded"></div>
        </div>
      )}

      {!loading && searched && result && (
        <div className="max-w-3xl space-y-6">
          {/* Consistency Card Indicator */}
          <div
            className={`p-6 border rounded-2xl flex items-center gap-4 ${
              result.consistent
                ? 'bg-green-500/5 border-green-500/20 text-green-400'
                : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
            }`}
          >
            {result.consistent ? (
              <ShieldCheck className="w-12 h-12 text-green-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-rose-500 shrink-0 animate-pulse" />
            )}
            <div>
              <h3 className="text-lg font-bold tracking-wide">
                {result.consistent ? 'Metadata is fully consistent' : 'Metadata conflicts detected!'}
              </h3>
              <p className="text-xs text-slate-450 mt-1">
                {result.consistent
                  ? `All catalog entries for "${result.object_name}" share matching type, owner, and description.`
                  : `Differing attribute values exist for "${result.object_name}" across database connections.`}
              </p>
            </div>
          </div>

          {/* Conflict details table */}
          {!result.consistent && result.conflicts.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Mismatched Field Telemetry
                </h4>
              </div>

              <div className="divide-y divide-slate-850">
                {result.conflicts.map((conflict) => (
                  <div key={conflict.field} className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
                        {conflict.field}
                      </span>
                      <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase font-black">
                        CONFLICT
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      {Object.entries(conflict.values).map(([catalog, value]) => (
                        <div
                          key={catalog}
                          className="p-3 bg-slate-900/50 border border-slate-850 rounded-xl flex flex-col justify-between"
                        >
                          <span className="text-[10px] font-black uppercase text-slate-500">
                            {catalog}
                          </span>
                          <span className="text-xs font-medium text-slate-350 mt-1.5 truncate">
                            {value || <span className="text-slate-650 italic">Null</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.consistent && (
            <div className="p-6 bg-slate-900/25 border border-slate-850 rounded-2xl text-slate-500 text-xs flex items-center justify-center">
              No conflicts to resolve. The metadata schema matching is fully aligned.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Consistency;
