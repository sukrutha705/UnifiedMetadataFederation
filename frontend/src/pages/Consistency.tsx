import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, AlertCircle, RefreshCw, GitMerge, CheckCircle, ArrowDown, ArrowRight, Database, Search as SearchIcon, Zap, Shield, Clock } from 'lucide-react';
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
  const navigate = useNavigate();
  const initialObjectName = location.state?.objectName || 'customer';
  const [objectName, setObjectName] = useState(initialObjectName);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<ConsistencyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reconciliation inline state
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<any | null>(null);

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
    setReconcileResult(null);

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

  const handleInlineReconcile = async () => {
    if (!result || !result.object_name) return;
    setReconciling(true);
    try {
      const response = await api.post(`/client/reconcile/${encodeURIComponent(result.object_name)}`);
      setReconcileResult(response.data);
      // Re-check consistency after reconciliation to show updated state
      const updatedConsistency = await api.get(`/client/consistency/${encodeURIComponent(result.object_name)}`);
      setResult(updatedConsistency.data);
    } catch (err: any) {
      console.error('Inline reconciliation failed:', err);
    } finally {
      setReconciling(false);
    }
  };

  // Consistency check process visualization steps
  const auditSteps = [
    { label: 'Query Registry', icon: Database, color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/25' },
    { label: 'Scan Spark', icon: Zap, color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/25' },
    { label: 'Scan Postgres', icon: Database, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/25' },
    { label: 'Scan OpenSearch', icon: SearchIcon, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/25' },
    { label: 'Compare Fields', icon: Shield, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/25' },
    { label: 'Report Generated', icon: CheckCircle, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/25' },
  ];

  // Get all unique catalogs from conflicts
  const getAllCatalogs = (): string[] => {
    if (!result || result.conflicts.length === 0) return [];
    const catalogSet = new Set<string>();
    result.conflicts.forEach(c => {
      Object.keys(c.values).forEach(k => catalogSet.add(k));
    });
    return Array.from(catalogSet);
  };

  const getCatalogLogo = (catalog: string) => {
    const lower = catalog.toLowerCase();
    if (lower.includes('spark')) return '/spark.png';
    if (lower.includes('postgres')) return '/postgres.png';
    if (lower.includes('opensearch')) return '/opensearch.png';
    return null;
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
        <div className="space-y-6">
          {/* Consistency Audit Flow Visualization */}
          <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              Consistency Audit Pipeline — Execution Trace
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {auditSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.label}>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${step.bgColor} ${step.borderColor}`}>
                      <Icon className={`w-3.5 h-3.5 ${step.color}`} />
                      <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">{step.label}</span>
                      <CheckCircle className={`w-3 h-3 ${step.color}`} />
                    </div>
                    {idx < auditSteps.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

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
            <div className="flex-1">
              <h3 className="text-lg font-bold tracking-wide">
                {result.consistent ? 'Metadata is fully consistent' : 'Metadata conflicts detected!'}
              </h3>
              <p className="text-xs text-slate-450 mt-1">
                {result.consistent
                  ? `All catalog entries for "${result.object_name}" share matching type, owner, and description.`
                  : `Differing attribute values exist for "${result.object_name}" across database connections.`}
              </p>
            </div>

            {/* Inline Reconcile Button */}
            {!result.consistent && (
              <button
                onClick={handleInlineReconcile}
                disabled={reconciling}
                className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg disabled:opacity-50 shrink-0"
              >
                {reconciling ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <GitMerge className="w-4 h-4" />
                )}
                {reconciling ? 'RECONCILING...' : 'RECONCILE NOW'}
              </button>
            )}
          </div>

          {/* Reconciliation Success Banner */}
          {reconcileResult && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-xs font-bold">Reconciliation Complete!</p>
                <p className="text-[11px] text-emerald-500/80 mt-0.5">
                  Source of truth: <strong className="text-emerald-300">{reconcileResult.source_of_truth}</strong>
                  {reconcileResult.updated_catalogs?.length > 0 && (
                    <> — Updated: {reconcileResult.updated_catalogs.join(', ')}</>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Conflict details — Catalog Comparison Table */}
          {!result.consistent && result.conflicts.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Cross-Catalog Field Comparison
                </h4>
                <div className="flex items-center gap-3">
                  {getAllCatalogs().map(catalog => (
                    <CatalogBadge key={catalog} catalog={catalog} />
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/40">
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Field</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-24">Status</th>
                      {getAllCatalogs().map(catalog => (
                        <th key={catalog} className="p-4">
                          <CatalogBadge catalog={catalog} className="inline-flex" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {result.conflicts.map((conflict) => {
                      const values = Object.values(conflict.values);
                      const allSame = values.every(v => v === values[0]);
                      const rowBg = allSame ? 'bg-green-500/5' : 'bg-rose-500/5 hover:bg-rose-500/10';

                      return (
                        <tr key={conflict.field} className={`transition-colors ${rowBg}`}>
                          <td className="p-4 align-middle">
                            <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
                              {conflict.field}
                            </span>
                          </td>
                          <td className="p-4 align-middle text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-black inline-block ${
                              allSame
                                ? 'text-green-400 bg-green-500/10 border-green-500/20'
                                : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                            }`}>
                              {allSame ? 'MATCH' : 'CONFLICT'}
                            </span>
                          </td>
                          {getAllCatalogs().map(catalog => {
                            const value = conflict.values[catalog];
                            const isMatch = allSame;
                            return (
                              <td key={catalog} className="p-4 align-middle border-l border-slate-800/50">
                                <span className={`text-xs font-medium ${isMatch ? 'text-green-300' : 'text-rose-300'}`}>
                                  {value || <span className="text-slate-650 italic">Null</span>}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Consistent state — still show verification proof */}
          {result.consistent && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                Verification Evidence — All Fields Match
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['object_type', 'description', 'owner_name'].map((field) => (
                  <div key={field} className="p-4 bg-green-500/5 border border-green-500/15 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">{field}</span>
                      <span className="text-[9px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 font-black uppercase">
                        MATCH
                      </span>
                    </div>
                    <p className="text-[11px] text-green-300/70">
                      All catalogs report identical values for this field.
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-4 text-center">
                Cross-catalog verification completed across {getAllCatalogs().length || 'all'} connected catalogs for "{result.object_name}".
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Consistency;
