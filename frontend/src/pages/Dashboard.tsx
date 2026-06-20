import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import {
  Activity,
  CheckCircle,
  Database,
  Heart,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import api from '../services/api';

interface DashboardStats {
  connected_catalogs: number;
  metadata_count: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  cache_miss_rate: number;
  consistency_score: number;
  consistent_objects: number;
  inconsistent_objects: number;
  natural_search_requests: number;
  catalog_discovery_requests: number;
  consistency_checks: number;
  reconciliations: number;
  client_reconciliations: number;
  smart_client_requests: number;
  federation_score: number;
  federation_status: string;
  consistency_component: number;
  cache_component: number;
  catalog_component: number;
  search_component: number;
  smart_client_enabled: boolean;
  abstraction_layer: string;
  client_creates?: number;
  client_reads?: number;
  client_updates?: number;
  client_deletes?: number;
}

interface DetailedHealth {
  api: string;
  database: string;
  redis: string;
  catalogs_connected: number;
  smart_client: string;
  federation_layer: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<DetailedHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, healthRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/health/detailed'),
      ]);
      setStats(statsRes.data);
      setHealth(healthRes.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to retrieve dashboard stats. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 animate-pulse">
        <div className="h-10 bg-slate-800 w-1/4 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-800 rounded-xl"></div>
          <div className="h-96 bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Heart className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <p className="text-lg font-medium">{error || 'Failed to load dashboard'}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchDashboardData();
          }}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg hover:bg-slate-700 transition"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // Prepare chart data for Activity Breakdown
  const activityData = [
    { name: 'Natural Searches', value: stats.natural_search_requests },
    { name: 'Discoveries', value: stats.catalog_discovery_requests },
    { name: 'Consistency Checks', value: stats.consistency_checks },
    { name: 'Reconciliations', value: stats.reconciliations + stats.client_reconciliations },
  ];
  const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#10b981'];

  // Prepare chart data for System Health Breakdown
  const healthChartData = [
    {
      name: 'Score Breakdown',
      Consistency: stats.consistency_component,
      Cache: stats.cache_component,
      Catalog: stats.catalog_component,
      Search: stats.search_component,
    },
  ];

  // Helper to render health dot
  const renderHealthIndicator = (status: string) => {
    if (status === 'healthy' || status === 'ok' || status === 'enabled') {
      return (
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
          <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">ONLINE</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse"></span>
        <span className="text-xs font-semibold text-rose-400 uppercase tracking-wide">OFFLINE</span>
      </div>
    );
  };

  const getScoreStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy':
        return 'text-green-400 border-green-500/20 bg-green-500/5';
      case 'Warning':
        return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      case 'Critical':
        return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-800/20';
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            System Operations Dashboard
          </h2>
          <p className="text-sm text-slate-500">Live orchestration metrics and platform health indicators.</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchDashboardData();
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 rounded-lg hover:text-slate-200 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> REFRESH
        </button>
      </div>

      {/* Hero / Hero KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Federation Score */}
        <div className={`p-6 border rounded-2xl relative overflow-hidden flex flex-col justify-between ${getScoreStatusColor(stats.federation_status)}`}>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Federation Score
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight">{stats.federation_score}</span>
              <span className="text-sm font-semibold">/100</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">STATUS</span>
            <span className="text-xs font-black uppercase tracking-wider">{stats.federation_status}</span>
          </div>
        </div>

        {/* Consistency Score */}
        <div className="p-6 border border-slate-800 bg-slate-900/50 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Consistency Score
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-200">{stats.consistency_score}%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats.consistent_objects} consistent / {stats.inconsistent_objects} conflicts
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-slate-400 font-medium">Automatic Detection</span>
          </div>
        </div>

        {/* Metadata Registry Count */}
        <div className="p-6 border border-slate-800 bg-slate-900/50 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Federated Metadata
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-200">{stats.metadata_count}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Unified Catalog Elements</p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-400 font-medium">Connected Catalogs: {stats.connected_catalogs}</span>
          </div>
        </div>

        {/* Cache Hit Rate */}
        <div className="p-6 border border-slate-800 bg-slate-900/50 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Cache Hit Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-200">{stats.cache_hit_rate}%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats.cache_hits} hits / {stats.cache_misses} misses
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400 font-medium">Redis Auto-Invalidated</span>
          </div>
        </div>
      </div>

      {/* Charts & System health status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health Breakdown Bar Chart */}
        <div className="lg:col-span-2 p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            Federation Intelligence Breakdown
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={healthChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Consistency" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cache" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Catalog" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Search" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Breakdown Pie Chart */}
        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            Operations Breakdown
          </h3>
          <div className="h-56 relative">
            {activityData.every((d) => d.value === 0) ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-650">
                No telemetry recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activityData.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {activityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Legend list */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {activityData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[idx] }}
                ></span>
                <span className="text-[11px] font-medium text-slate-400 truncate">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Analytics Aggregates & System Health Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health Status Panel */}
        {health && (
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                <Heart className="w-4 h-4 text-emerald-400" />
                Connectivity Core Health
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-xs font-semibold text-slate-400">Database (Postgres)</span>
                  {renderHealthIndicator(health.database)}
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-xs font-semibold text-slate-400">Cache Registry (Redis)</span>
                  {renderHealthIndicator(health.redis)}
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-xs font-semibold text-slate-400">Smart Metadata Client</span>
                  {renderHealthIndicator(health.smart_client)}
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-xs font-semibold text-slate-400">Federation Engine</span>
                  {renderHealthIndicator(health.federation_layer)}
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between">
              <span className="text-xs text-slate-500">Live health monitoring active</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-black border border-emerald-500/20">
                100% UP
              </span>
            </div>
          </div>
        )}

        {/* Telemetry Counter Aggregations */}
        <div className="lg:col-span-2 p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Telemetry Logs Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
              <span className="text-[10px] font-bold text-slate-550 block uppercase tracking-wider mb-1">
                Client Creates
              </span>
              <span className="text-2xl font-black text-slate-300">{stats.client_creates || 0}</span>
            </div>
            <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
              <span className="text-[10px] font-bold text-slate-550 block uppercase tracking-wider mb-1">
                Client Reads
              </span>
              <span className="text-2xl font-black text-slate-300">{stats.client_reads || 0}</span>
            </div>
            <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
              <span className="text-[10px] font-bold text-slate-550 block uppercase tracking-wider mb-1">
                Client Updates
              </span>
              <span className="text-2xl font-black text-slate-300">{stats.client_updates || 0}</span>
            </div>
            <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
              <span className="text-[10px] font-bold text-slate-550 block uppercase tracking-wider mb-1">
                Client Deletes
              </span>
              <span className="text-2xl font-black text-slate-300">{stats.client_deletes || 0}</span>
            </div>
            <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
              <span className="text-[10px] font-bold text-slate-550 block uppercase tracking-wider mb-1">
                Client Reconciles
              </span>
              <span className="text-2xl font-black text-slate-300">{stats.client_reconciliations || 0}</span>
            </div>
            <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
              <span className="text-[10px] font-bold text-slate-550 block uppercase tracking-wider mb-1">
                Federation Reconciles
              </span>
              <span className="text-2xl font-black text-slate-300">{stats.reconciliations || 0}</span>
            </div>
            <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
              <span className="text-[10px] font-bold text-slate-550 block uppercase tracking-wider mb-1">
                Consistency Checks
              </span>
              <span className="text-2xl font-black text-slate-300">{stats.consistency_checks || 0}</span>
            </div>
            <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
              <span className="text-[10px] font-bold text-slate-550 block uppercase tracking-wider mb-1">
                Total Client Requests
              </span>
              <span className="text-2xl font-black text-violet-400">{stats.smart_client_requests || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
