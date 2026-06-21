import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GitMerge, Check, AlertCircle, RefreshCw, Info, ArrowRight, ArrowDown, CheckCircle, Database, Search as SearchIcon, Zap, Shield, Clock, AlertTriangle } from 'lucide-react';
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

interface ReconciliationResponse {
  object_name: string;
  source_of_truth: string;
  updated_catalogs: string[];
  status: string;
}

const Reconciliation: React.FC = () => {
  const location = useLocation();
  const initialObjectName = location.state?.objectName || 'customer';
  const [objectName, setObjectName] = useState(initialObjectName);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<ReconciliationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Before/After state
  const [beforeState, setBeforeState] = useState<ConsistencyResponse | null>(null);
  const [afterState, setAfterState] = useState<ConsistencyResponse | null>(null);

  // Flow animation
  const [flowStep, setFlowStep] = useState(0);

  useEffect(() => {
    if (location.state?.objectName) {
      runReconciliationFlow(location.state.objectName);
    }
  }, [location.state?.objectName]);

  const runReconciliationFlow = async (name: string) => {
    setLoading(true);
    setError(null);
    setSearched(true);
    setResult(null);
    setBeforeState(null);
    setAfterState(null);
    setFlowStep(0);

    try {
      // Step 1: Capture before state
      setFlowStep(1);
      try {
        const beforeRes = await api.get(`/client/consistency/${encodeURIComponent(name)}`);
        setBeforeState(beforeRes.data);
      } catch (err: any) {
        // If not found, the object doesn't exist in enough catalogs
        if (err.response?.status === 404) {
          setError(`Object "${name}" was not found or exists in only one catalog.`);
          setLoading(false);
          return;
        }
      }

      // Step 2: Run reconciliation
      setFlowStep(2);
      const reconcileRes = await api.post(`/client/reconcile/${encodeURIComponent(name)}`);
      setResult(reconcileRes.data);

      // Step 3: Capture after state
      setFlowStep(3);
      try {
        const afterRes = await api.get(`/client/consistency/${encodeURIComponent(name)}`);
        setAfterState(afterRes.data);
      } catch {
        // After state fetch is optional
      }

      // Step 4: Complete
      setFlowStep(4);
    } catch (err: any) {
      console.error('Reconciliation failed:', err);
      if (err.response && err.response.status === 404) {
        setError(`Failed to reconcile. Object "${name}" was not found or is already consistent across all catalogs.`);
      } else {
        setError('An error occurred during metadata reconciliation execution.');
      }
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectName.trim()) return;
    runReconciliationFlow(objectName);
  };

  const getCatalogLogo = (catalog: string) => {
    const lower = catalog.toLowerCase();
    if (lower.includes('spark')) return '/spark.png';
    if (lower.includes('postgres')) return '/postgres.png';
    if (lower.includes('opensearch')) return '/opensearch.png';
    return null;
  };

  const getCatalogBadgeStyle = (catalog: string): string => {
    const lower = catalog.toLowerCase();
    if (lower.includes('spark')) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    if (lower.includes('postgres')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (lower.includes('opensearch')) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
  };

  const CatalogBadge = ({ catalog, className = '' }: { catalog: string, className?: string }) => {
    const logo = getCatalogLogo(catalog);
    return (
      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${getCatalogBadgeStyle(catalog)} ${className}`}>
        {logo && <img src={logo} alt={catalog} className="w-3.5 h-3.5 object-contain" />}
        <span className="text-[9px] font-black uppercase tracking-wider">{catalog}</span>
      </span>
    );
  };

  // Reconciliation flow steps
  const reconcileFlowSteps = [
    { label: 'Detect Conflicts', icon: AlertTriangle, color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/25' },
    { label: 'Select Canonical Source', icon: Database, color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/25' },
    { label: 'Update Target Catalogs', icon: GitMerge, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/25' },
    { label: 'Rebuild Cache', icon: Zap, color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/25' },
    { label: 'Write Audit Log', icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/25' },
    { label: 'Log Event', icon: Clock, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/25' },
  ];

  // Source of truth priority
  const priorityOrder = [
    { name: 'Spark', priority: 1, logo: '/spark.png', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/25' },
    { name: 'PostgreSQL', priority: 2, logo: '/postgres.png', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/25' },
    { name: 'OpenSearch', priority: 3, logo: '/opensearch.png', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/25' },
  ];

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
        <div className="max-w-3xl space-y-4">
          {/* Animated flow progress */}
          <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">
              Reconciliation in Progress...
            </h4>
            <div className="flex items-center gap-3">
              {['Capturing Before State', 'Reconciling', 'Capturing After State', 'Complete'].map((step, idx) => (
                <React.Fragment key={step}>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                    flowStep > idx
                      ? 'bg-emerald-500/10 border-emerald-500/25'
                      : flowStep === idx + 1
                      ? 'bg-violet-500/10 border-violet-500/25 animate-pulse'
                      : 'bg-slate-900/30 border-slate-800'
                  }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      flowStep > idx ? 'text-emerald-400' : flowStep === idx + 1 ? 'text-violet-400' : 'text-slate-600'
                    }`}>{step}</span>
                    {flowStep > idx && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                  </div>
                  {idx < 3 && <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && searched && result && (
        <div className="space-y-6">
          {/* Reconciliation Flow Diagram */}
          <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <GitMerge className="w-3.5 h-3.5 text-violet-400" />
              Reconciliation Pipeline — Execution Complete
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {reconcileFlowSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.label}>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${step.bgColor} ${step.borderColor}`}>
                      <Icon className={`w-3.5 h-3.5 ${step.color}`} />
                      <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">{step.label}</span>
                      <CheckCircle className={`w-3 h-3 ${step.color}`} />
                    </div>
                    {idx < reconcileFlowSteps.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

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

          {/* Before vs After Comparison */}
          {beforeState && beforeState.conflicts.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-violet-400" />
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Before vs After Reconciliation — Schema Diff
                </h4>
              </div>

              <div className="divide-y divide-slate-850">
                {beforeState.conflicts.map((conflict) => {
                  const beforeValues = conflict.values;
                  return (
                    <div key={conflict.field} className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-violet-400">{conflict.field}</span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Before */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> BEFORE (Conflicting)
                          </span>
                          <div className="space-y-1.5">
                            {Object.entries(beforeValues).map(([catalog, value]) => (
                              <div key={catalog} className="flex items-center justify-between p-2.5 bg-rose-500/5 border border-rose-500/15 rounded-lg">
                                <CatalogBadge catalog={catalog} />
                                <span className="text-xs text-rose-300 font-medium truncate">{value || <span className="italic text-slate-600">Null</span>}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* After */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3" /> AFTER (Reconciled)
                          </span>
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
                            <span className="text-[9px] font-black text-violet-400 uppercase tracking-wider block mb-1">
                              Canonical Value (from {result.source_of_truth})
                            </span>
                            <span className="text-xs text-emerald-300 font-medium">
                              {beforeValues[result.source_of_truth] || Object.values(beforeValues).find(v => v) || 'Null'}
                            </span>
                            <p className="text-[10px] text-emerald-500/60 mt-1">
                              Applied to all {Object.keys(beforeValues).length} catalogs
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                    <CatalogBadge key={catalog} catalog={catalog} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Source-of-Truth Priority Visualization */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Database className="w-4 h-4 text-violet-400" />
              Source-of-Truth Priority Hierarchy
            </h4>
            <div className="flex items-center gap-3 justify-center flex-wrap">
              {priorityOrder.map((catalog, idx) => (
                <React.Fragment key={catalog.name}>
                  <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${catalog.bgColor} ${catalog.borderColor} ${
                    result.source_of_truth.toLowerCase().includes(catalog.name.toLowerCase())
                      ? 'ring-2 ring-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.2)] scale-105'
                      : 'opacity-50'
                  }`}>
                    <img src={catalog.logo} alt={catalog.name} className="w-10 h-10 object-contain drop-shadow-md" />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${catalog.color}`}>{catalog.name}</span>
                    <span className="text-[9px] font-black text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded">PRIORITY {catalog.priority}</span>
                    {result.source_of_truth.toLowerCase().includes(catalog.name.toLowerCase()) && (
                      <span className="text-[8px] font-black text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded uppercase">
                        ★ CANONICAL
                      </span>
                    )}
                  </div>
                  {idx < priorityOrder.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-slate-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-4">
              When conflicts are detected, the highest-priority catalog's values override all others.
            </p>
          </div>
        </div>
      )}

      {/* Info card on reconciliation priority logic */}
      {!searched && (
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
      )}
    </div>
  );
};

export default Reconciliation;
