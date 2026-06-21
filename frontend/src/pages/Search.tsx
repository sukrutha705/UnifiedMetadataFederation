import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Cpu, Compass, Server, AlertCircle, HelpCircle, X, CheckCircle, GitMerge, Database, ShieldAlert, Lock, ArrowRight, ArrowDown, Layers, Zap } from 'lucide-react';
import api from '../services/api';

interface FederatedResult {
  catalog: string;
  object_name: string;
}

interface CatalogSuggestion {
  catalog: string;
  object_name: string;
  score: number;
  ranking_reason: string | string[];
  consistency_bonus: number;
  catalog_bonus: number;
}
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

// Helper for mocked extended metadata visualization
const getMockExtendedData = (name: string) => {
  const hash = name.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  const types = ['Table', 'View', 'Stream', 'Index'];
  const owners = ['DataEng_Team', 'Analytics_Core', 'Marketing_Ops', 'System_Auto'];
  return {
    type: types[Math.abs(hash) % types.length],
    owner: owners[Math.abs(hash) % owners.length],
    lastUpdated: `${Math.abs(hash) % 24 + 1}h ago`,
    consistency: `${Math.max(80, 100 - (Math.abs(hash) % 20))}%`
  };
};

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('customer');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [federationResults, setFederationResults] = useState<FederatedResult[]>([]);
  const [discoveryResults, setDiscoveryResults] = useState<CatalogSuggestion[]>([]);
  const [naturalResults, setNaturalResults] = useState<CatalogSuggestion[]>([]);

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMetadata, setActiveMetadata] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // User role for authorization checks
  const userRole = localStorage.getItem('role') || 'Viewer';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    setDrawerOpen(false); // Close drawer on new search

    try {
      const [fedRes, discRes, natRes] = await Promise.allSettled([
        api.get(`/client/search?q=${encodeURIComponent(query)}`),
        api.get(`/catalogs/suggest?q=${encodeURIComponent(query)}`),
        api.get(`/search/natural?q=${encodeURIComponent(query)}`),
      ]);

      if (fedRes.status === 'fulfilled') {
        setFederationResults(fedRes.value.data.results || []);
      } else {
        console.error('Federation search failed:', fedRes.reason);
        setFederationResults([]);
      }

      if (discRes.status === 'fulfilled') {
        setDiscoveryResults(discRes.value.data || []);
      } else {
        console.error('Catalog discovery failed:', discRes.reason);
        setDiscoveryResults([]);
      }

      if (natRes.status === 'fulfilled') {
        setNaturalResults(natRes.value.data || []);
      } else {
        console.error('Natural search failed:', natRes.reason);
        setNaturalResults([]);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError('An error occurred while executing queries.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (objectName: string, catalog: string) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    setActiveMetadata(null);

    try {
      // Step 1: List metadata to find the database ID
      const listRes = await api.get('/client/metadata');
      const matched = listRes.data.find(
        (m: any) =>
          m.object_name.toLowerCase() === objectName.toLowerCase() &&
          m.catalog_name.toLowerCase() === catalog.toLowerCase()
      );

      if (matched) {
        // Step 2: Fetch detailed metadata record by ID using /client/metadata/{metadata_id}
        const detailRes = await api.get(`/client/metadata/${matched.id}`);
        setActiveMetadata(detailRes.data);
      } else {
        // Fallback for objects that are discovered in backend catalogs but not registered in the unified DB
        setActiveMetadata({
          id: null,
          object_name: objectName,
          catalog_name: catalog,
          object_type: 'Unregistered Table',
          description: 'This metadata object was discovered dynamically on the catalog but is not registered in the Unified Metadata Platform.',
          owner_name: 'N/A',
        });
      }
    } catch (err) {
      console.error('Error fetching metadata details:', err);
      // Fallback display
      setActiveMetadata({
        id: null,
        object_name: objectName,
        catalog_name: catalog,
        object_type: 'Unknown / Discovered',
        description: 'Unable to query registry data from server, but the object was detected in active catalogs.',
        owner_name: 'Unknown',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen relative overflow-x-hidden">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Federated Intelligent Search
        </h2>
        <p className="text-sm text-slate-500">
          Query cross-catalog metadata via Federated, Discovery, and Natural Language abstraction engines.
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="max-w-2xl">
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-28 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all shadow-lg text-sm"
            placeholder='Try typing "customer", "spark", "logs", or natural expressions like "show me employee"'
          />
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
            <SearchIcon className="w-5 h-5" />
          </span>
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'SEARCH'}
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-sm max-w-2xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 bg-slate-900/20 border border-slate-850 rounded-2xl animate-pulse space-y-4">
              <div className="h-5 bg-slate-800 w-1/3 rounded"></div>
              <div className="space-y-2">
                <div className="h-20 bg-slate-800 rounded"></div>
                <div className="h-20 bg-slate-800 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && searched && (
        <>
        {/* Search Execution Pipeline Visualization */}
        <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-violet-400" />
            Search Execution Pipeline — Parallel Multi-Engine Query
          </h4>
          <div className="flex flex-col gap-3">
            {/* Input */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/10 border border-violet-500/25 rounded-xl">
                <SearchIcon className="w-4 h-4 text-violet-400" />
                <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">Query: "{query}"</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <span className="text-[10px] text-slate-500 font-semibold">PARALLEL DISPATCH</span>
            </div>
            {/* Three engines */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-violet-500/10 border border-violet-500/25 rounded-xl">
                <Cpu className="w-4 h-4 text-violet-400" />
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider block">NLP Engine</span>
                  <span className="text-[9px] text-violet-500">/search/natural</span>
                </div>
                <span className="text-[10px] font-black text-slate-200 bg-slate-800 px-2 py-0.5 rounded">{naturalResults.length}</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl">
                <Compass className="w-4 h-4 text-indigo-400" />
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Discovery Engine</span>
                  <span className="text-[9px] text-indigo-500">/catalogs/suggest</span>
                </div>
                <span className="text-[10px] font-black text-slate-200 bg-slate-800 px-2 py-0.5 rounded">{discoveryResults.length}</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
                <Server className="w-4 h-4 text-emerald-400" />
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Federation Engine</span>
                  <span className="text-[9px] text-emerald-500">/client/search</span>
                </div>
                <span className="text-[10px] font-black text-slate-200 bg-slate-800 px-2 py-0.5 rounded">{federationResults.length}</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
            {/* Total */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50">
              <span className="text-[10px] text-slate-500">Total results aggregated:</span>
              <span className="text-xs font-black text-slate-200">{naturalResults.length + discoveryResults.length + federationResults.length}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">• All engines responded</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 1. Natural Language Search Results */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-800/60">
                <Cpu className="w-5 h-5 text-violet-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Natural Language Results
                </h3>
              </div>

              {naturalResults.length === 0 ? (
                <div className="text-center py-12 text-slate-650 text-xs">
                  No matching metadata found via NLP parsing
                </div>
              ) : (
                <div className="space-y-4">
                  {naturalResults.map((item, idx) => (
                    <div
                      key={`${item.catalog}-${idx}`}
                      onClick={() => handleCardClick(item.object_name, item.catalog)}
                      className="p-4 bg-slate-900/50 border border-slate-850 hover:border-violet-500/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] rounded-xl space-y-3 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between">
                        <CatalogBadge catalog={item.catalog} />
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500">Score</span>
                          <span className="text-xs font-extrabold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                            {item.score}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-0.5 border-b border-slate-800/50 pb-3">
                        <span className="text-sm font-semibold text-slate-200 block">{item.object_name}</span>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><Database className="w-3 h-3 text-violet-400" /> {getMockExtendedData(item.object_name).type}</span>
                          <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-indigo-400" /> {getMockExtendedData(item.object_name).owner}</span>
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-emerald-400" /> {getMockExtendedData(item.object_name).consistency} Match</span>
                          <span className="text-slate-600">Updated {getMockExtendedData(item.object_name).lastUpdated}</span>
                        </div>
                      </div>

                      {/* Display Ranking Reasons */}
                      {Array.isArray(item.ranking_reason) ? (
                        <div className="space-y-1 mt-2 text-[10px]">
                          <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block mb-1">Why matched:</span>
                          {item.ranking_reason.map((reason, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-1.5 text-emerald-400">
                              <span className="text-emerald-500">✓</span>
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      ) : item.ranking_reason ? (
                        <p className="text-[11px] text-slate-400 italic">"{item.ranking_reason}"</p>
                      ) : null}

                      {/* Score Breakdown Bars */}
                      <div className="space-y-1.5 border-t border-slate-850/60 pt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 w-20 shrink-0">Base Score</span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${Math.min(((item.score - item.consistency_bonus - item.catalog_bonus) / Math.max(item.score, 1)) * 100, 100)}%` }}></div>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono w-8 text-right">{item.score - item.consistency_bonus - item.catalog_bonus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 w-20 shrink-0">Consistency</span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min((item.consistency_bonus / Math.max(item.score, 1)) * 100, 100)}%` }}></div>
                          </div>
                          <span className="text-[9px] text-emerald-400 font-mono w-8 text-right">+{item.consistency_bonus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 w-20 shrink-0">Catalog</span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min((item.catalog_bonus / Math.max(item.score, 1)) * 100, 100)}%` }}></div>
                          </div>
                          <span className="text-[9px] text-blue-400 font-mono w-8 text-right">+{item.catalog_bonus}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-[10px] text-slate-600 mt-6 uppercase tracking-wider text-right">
              Engine: /search/natural
            </div>
          </div>

          {/* 2. Catalog Discovery Suggestions */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-800/60">
                <Compass className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Catalog Discovery Rankings
                </h3>
              </div>

              {discoveryResults.length === 0 ? (
                <div className="text-center py-12 text-slate-650 text-xs">
                  No catalog suggestions available
                </div>
              ) : (
                <div className="space-y-4">
                  {discoveryResults.map((item, idx) => (
                    <div
                      key={`${item.catalog}-${idx}`}
                      onClick={() => handleCardClick(item.object_name, item.catalog)}
                      className="p-4 bg-slate-900/50 border border-slate-850 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] rounded-xl space-y-3 cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between">
                        <CatalogBadge catalog={item.catalog} />
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500">Score</span>
                          <span className="text-xs font-extrabold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                            {item.score}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-0.5 border-b border-slate-800/50 pb-3">
                        <span className="text-sm font-semibold text-slate-200 block">{item.object_name}</span>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><Database className="w-3 h-3 text-violet-400" /> {getMockExtendedData(item.object_name).type}</span>
                          <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-indigo-400" /> {getMockExtendedData(item.object_name).owner}</span>
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-emerald-400" /> {getMockExtendedData(item.object_name).consistency} Match</span>
                          <span className="text-slate-600">Updated {getMockExtendedData(item.object_name).lastUpdated}</span>
                        </div>
                      </div>

                      {/* Display Ranking Reasons */}
                      {Array.isArray(item.ranking_reason) ? (
                        <div className="space-y-1 mt-2 text-[10px]">
                          <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block mb-1">Why matched:</span>
                          {item.ranking_reason.map((reason, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-1.5 text-emerald-400">
                              <span className="text-emerald-500">✓</span>
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      ) : item.ranking_reason ? (
                        <p className="text-[11px] text-slate-400 italic">"{item.ranking_reason}"</p>
                      ) : null}

                      {/* Score Breakdown Bars */}
                      <div className="space-y-1.5 border-t border-slate-850/60 pt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 w-20 shrink-0">Base Score</span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(((item.score - item.consistency_bonus - item.catalog_bonus) / Math.max(item.score, 1)) * 100, 100)}%` }}></div>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono w-8 text-right">{item.score - item.consistency_bonus - item.catalog_bonus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 w-20 shrink-0">Consistency</span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min((item.consistency_bonus / Math.max(item.score, 1)) * 100, 100)}%` }}></div>
                          </div>
                          <span className="text-[9px] text-emerald-400 font-mono w-8 text-right">+{item.consistency_bonus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 w-20 shrink-0">Catalog</span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min((item.catalog_bonus / Math.max(item.score, 1)) * 100, 100)}%` }}></div>
                          </div>
                          <span className="text-[9px] text-blue-400 font-mono w-8 text-right">+{item.catalog_bonus}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-[10px] text-slate-600 mt-6 uppercase tracking-wider text-right">
              Engine: /catalogs/suggest
            </div>
          </div>

          {/* 3. Federated Search Results */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-800/60">
                <Server className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Federated Metadata Matches
                </h3>
              </div>

              {federationResults.length === 0 ? (
                <div className="text-center py-12 text-slate-650 text-xs">
                  No direct metadata matches in federated catalogs
                </div>
              ) : (
                <div className="space-y-3">
                  {federationResults.map((item, idx) => (
                    <div
                      key={`${item.catalog}-${item.object_name}-${idx}`}
                      onClick={() => handleCardClick(item.object_name, item.catalog)}
                      className="p-4 bg-slate-900/50 border border-slate-850 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] rounded-xl flex items-center justify-between cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-semibold text-slate-200 mb-2">{item.object_name}</span>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><Database className="w-3 h-3 text-violet-400" /> {getMockExtendedData(item.object_name).type}</span>
                          <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-indigo-400" /> {getMockExtendedData(item.object_name).owner}</span>
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-emerald-400" /> {getMockExtendedData(item.object_name).consistency} Match</span>
                        </div>
                      </div>
                      <CatalogBadge catalog={item.catalog} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-[10px] text-slate-600 mt-6 uppercase tracking-wider text-right">
              Engine: /client/search
            </div>
          </div>
        </div>
        </>
      )}

      {!searched && !loading && (
        <div className="max-w-2xl p-6 bg-slate-900/20 border border-slate-850 rounded-2xl flex items-start gap-4">
          <HelpCircle className="w-6 h-6 text-violet-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider">How to Demo</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter any query inside the search bar. The client orchestrates three separate backend API calls in parallel. You can click on any card to slide open the metadata details panel to inspect registry data and invoke quick actions like consistency auditing, reconciliation overrides, and metadata editing.
            </p>
          </div>
        </div>
      )}

      {/* Sliding Drawer Container */}
      <div className={`fixed inset-0 z-50 ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          onClick={() => setDrawerOpen(false)}
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
        
        {/* Panel */}
        <div
          className={`fixed top-0 right-0 h-full w-[420px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Metadata Details
              </h3>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700/50 hover:bg-slate-750 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {detailLoading ? (
              <div className="space-y-4 animate-pulse pt-4">
                <div className="h-6 bg-slate-800 rounded w-2/3"></div>
                <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                <div className="h-24 bg-slate-800 rounded"></div>
                <div className="h-10 bg-slate-800 rounded w-3/4"></div>
              </div>
            ) : activeMetadata ? (
              <div className="space-y-6">
                {/* Object Title & Catalog */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Metadata Object
                  </span>
                  <h2 className="text-xl font-bold text-slate-100 tracking-tight">
                    {activeMetadata.object_name}
                  </h2>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <span className="text-xs font-black uppercase text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded border border-violet-500/20">
                      {activeMetadata.catalog_name}
                    </span>
                    <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded uppercase">
                      {activeMetadata.object_type}
                    </span>
                  </div>
                </div>

                {/* Main Metadata Details */}
                <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-4 space-y-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Metadata ID
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      {activeMetadata.id !== null ? `#${activeMetadata.id}` : 'Unregistered Object'}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Owner
                    </span>
                    <span className="text-xs text-slate-300">
                      {activeMetadata.owner_name || <span className="text-slate-650 italic">None</span>}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Description
                    </span>
                    <p className="text-xs text-slate-350 leading-relaxed">
                      {activeMetadata.description || <span className="text-slate-650 italic">No description provided</span>}
                    </p>
                  </div>
                </div>

                {activeMetadata.id === null && (
                  <div className="flex gap-2.5 p-3.5 bg-amber-500/5 border border-amber-500/15 rounded-xl text-amber-400 text-xs leading-relaxed">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500" />
                    <div>
                      <span className="font-semibold block mb-0.5">Unregistered in Catalog Registry</span>
                      This object was located via direct federated search but has no unified catalog metadata. You can still audit consistency or reconcile it.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-600 text-xs">
                No metadata details loaded.
              </div>
            )}
          </div>

          {/* Footer Quick Actions */}
          <div className="p-6 border-t border-slate-800 bg-slate-900/30 space-y-3">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Quick Actions
            </span>
            
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => {
                  if (activeMetadata) {
                    setDrawerOpen(false);
                    navigate('/consistency', { state: { objectName: activeMetadata.object_name } });
                  }
                }}
                disabled={!activeMetadata}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-semibold tracking-wider uppercase transition-all border border-slate-700/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Check Consistency
                </span>
                <span>→</span>
              </button>

              <button
                onClick={() => {
                  if (activeMetadata) {
                    setDrawerOpen(false);
                    navigate('/reconciliation', { state: { objectName: activeMetadata.object_name } });
                  }
                }}
                disabled={!activeMetadata || userRole === 'Viewer'}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-semibold tracking-wider uppercase transition-all border border-slate-700/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-indigo-400" />
                  Reconcile Schema
                </span>
                <span>{userRole === 'Viewer' ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : '→'}</span>
              </button>

              <button
                onClick={() => {
                  if (activeMetadata && activeMetadata.id !== null) {
                    setDrawerOpen(false);
                    navigate('/metadata', { state: { highlightId: activeMetadata.id } });
                  }
                }}
                disabled={!activeMetadata || activeMetadata.id === null}
                className="w-full flex items-center justify-between px-4 py-3 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 hover:text-violet-200 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all border border-violet-500/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-violet-400" />
                  View in Catalog Registry
                </span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;
