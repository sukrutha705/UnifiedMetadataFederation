import React, { useState } from 'react';
import { Search as SearchIcon, Cpu, Compass, Server, AlertCircle, HelpCircle } from 'lucide-react';
import api from '../services/api';

interface FederatedResult {
  catalog: string;
  object_name: string;
}

interface CatalogSuggestion {
  catalog: string;
  score: number;
  ranking_reason: string;
  consistency_bonus: number;
  catalog_bonus: number;
}

const Search: React.FC = () => {
  const [query, setQuery] = useState('customer');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [federationResults, setFederationResults] = useState<FederatedResult[]>([]);
  const [discoveryResults, setDiscoveryResults] = useState<CatalogSuggestion[]>([]);
  const [naturalResults, setNaturalResults] = useState<CatalogSuggestion[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

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

  return (
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
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
                      className="p-4 bg-slate-900/50 border border-slate-850 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded border border-violet-500/20">
                          {item.catalog}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500">Intelligent Score</span>
                          <span className="text-xs font-extrabold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                            {item.score}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 italic">"{item.ranking_reason}"</p>

                      <div className="flex items-center gap-4 text-[10px] text-slate-500 border-t border-slate-850/60 pt-2">
                        <span>Consistency Bonus: +{item.consistency_bonus}</span>
                        <span>Catalog Bonus: +{item.catalog_bonus}</span>
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
                      className="p-4 bg-slate-900/50 border border-slate-850 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                          {item.catalog}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500">Ranking Score</span>
                          <span className="text-xs font-extrabold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                            {item.score}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 italic">"{item.ranking_reason}"</p>

                      <div className="flex items-center gap-4 text-[10px] text-slate-500 border-t border-slate-850/60 pt-2">
                        <span>Consistency Bonus: +{item.consistency_bonus}</span>
                        <span>Catalog Bonus: +{item.catalog_bonus}</span>
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
                      className="p-3.5 bg-slate-900/50 border border-slate-850 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-300">{item.object_name}</span>
                        <span className="text-[9px] text-slate-550 uppercase tracking-widest mt-0.5">
                          Metadata Object
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {item.catalog}
                      </span>
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
      )}

      {!searched && !loading && (
        <div className="max-w-2xl p-6 bg-slate-900/20 border border-slate-850 rounded-2xl flex items-start gap-4">
          <HelpCircle className="w-6 h-6 text-violet-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider">How to Demo</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter any query inside the search bar. The client orchestrates three separate backend API calls in parallel. You can observe the NLP keyword parser mapping your search to catalog recommendations, the scoring engine evaluating catalog priorities with consistency/catalog bonuses, and the core federated client scanning catalogs for matching schemas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
