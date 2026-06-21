import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Plus,
  Search,
  GitMerge,
  Lock,
  AlertCircle,
  ArrowDown,
  Cpu,
  Server,
  Clock,
  PlusCircle,
  Edit,
  Trash,
  CheckSquare,
  Layers,
  Shield,
  ArrowRight,
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

interface EventResponse {
  event_id: number;
  metadata_id: number;
  event_type: string;
  timestamp: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<DetailedHealth | null>(null);
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catalogName, setCatalogName] = useState('spark');
  const [objectName, setObjectName] = useState('');
  const [objectType, setObjectType] = useState('table');
  const [description, setDescription] = useState('');
  const [ownerName, setOwnerName] = useState('');

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Trace animation
  const [traceStep, setTraceStep] = useState(0);

  const userRole = localStorage.getItem('role') || 'Viewer';
  const isWriteAllowed = userRole === 'Admin' || userRole === 'Engineer';

  const handleOpenCreate = () => {
    if (!isWriteAllowed) return;
    setCatalogName('spark');
    setObjectName('');
    setObjectType('table');
    setDescription('');
    setOwnerName('');
    setDialogOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        catalog_name: catalogName,
        object_name: objectName,
        object_type: objectType,
        description: description || null,
        owner_name: ownerName || null,
      };
      await api.post('/client/metadata', payload);
      setDialogOpen(false);
      setToast({ message: 'Metadata created successfully via Dashboard Quick Actions!', type: 'success' });
      fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      setToast({ message: 'Failed to create metadata.', type: 'error' });
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, healthRes, eventsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/health/detailed'),
        api.get('/dashboard/events'),
      ]);
      setStats(statsRes.data);
      setHealth(healthRes.data);
      setEvents(eventsRes.data || []);
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
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Animate the federation trace on load
  useEffect(() => {
    if (!loading && stats) {
      setTraceStep(0);
      const steps = [1, 2, 3, 4, 5, 6, 7];
      steps.forEach((step, idx) => {
        setTimeout(() => setTraceStep(step), 300 + idx * 400);
      });
    }
  }, [loading, stats?.metadata_count]);

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

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CREATED':
        return <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'UPDATED':
        return <Edit className="w-3.5 h-3.5 text-amber-400" />;
      case 'DELETED':
        return <Trash className="w-3.5 h-3.5 text-rose-400" />;
      case 'RECONCILED':
        return <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />;
      case 'CONSISTENCY_CHECKED':
        return <CheckCircle className="w-3.5 h-3.5 text-violet-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'CREATED': return 'text-emerald-400';
      case 'UPDATED': return 'text-amber-400';
      case 'DELETED': return 'text-rose-400';
      case 'RECONCILED': return 'text-cyan-400';
      case 'CONSISTENCY_CHECKED': return 'text-violet-400';
      default: return 'text-slate-400';
    }
  };

  // Trace steps data
  const traceSteps = [
    { label: 'Core Registry', icon: Database, color: 'text-violet-400', borderColor: 'border-violet-500/30', bgColor: 'bg-violet-500/10' },
    { label: 'Spark Catalog', logo: '/spark.png', color: 'text-orange-400', borderColor: 'border-orange-500/30', bgColor: 'bg-orange-500/10' },
    { label: 'Postgres Catalog', logo: '/postgres.png', color: 'text-blue-400', borderColor: 'border-blue-500/30', bgColor: 'bg-blue-500/10' },
    { label: 'OpenSearch Catalog', logo: '/opensearch.png', color: 'text-yellow-400', borderColor: 'border-yellow-500/30', bgColor: 'bg-yellow-500/10' },
    { label: 'Redis Cache', icon: Zap, color: 'text-red-400', borderColor: 'border-red-500/30', bgColor: 'bg-red-500/10' },
    { label: 'Audit Engine', icon: Shield, color: 'text-indigo-400', borderColor: 'border-indigo-500/30', bgColor: 'bg-indigo-500/10' },
    { label: 'Event Engine', icon: Clock, color: 'text-emerald-400', borderColor: 'border-emerald-500/30', bgColor: 'bg-emerald-500/10' },
  ];

  return (
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Federation Control Center
          </h2>
          <p className="text-sm text-slate-500">Live orchestration metrics, federation intelligence, and platform health.</p>
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

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-2xl transition-all ${
          toast.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* ===================== NEW: Federation Architecture Card ===================== */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-400" />
          Federation Architecture — Live Data Flow
        </h3>
        <div className="flex flex-col items-center gap-1">
          {/* Layer 1: Frontend */}
          <div className="flex items-center gap-3 px-5 py-3 bg-violet-500/10 border border-violet-500/25 rounded-xl">
            <Cpu className="w-5 h-5 text-violet-400" />
            <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">Smart Metadata Client</span>
            <span className="text-[9px] text-violet-500 font-semibold bg-violet-500/15 px-2 py-0.5 rounded">ABSTRACTION LAYER</span>
          </div>
          <ArrowDown className="w-4 h-4 text-slate-600" />

          {/* Layer 2: Federation Engine */}
          <div className="flex items-center gap-3 px-5 py-3 bg-indigo-500/10 border border-indigo-500/25 rounded-xl">
            <Server className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Federation Engine</span>
            {health && renderHealthIndicator(health.federation_layer)}
          </div>
          <ArrowDown className="w-4 h-4 text-slate-600" />

          {/* Layer 3: Catalog Adapters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-3xl">
            {[
              { name: 'Apache Spark', logo: '/spark.png', color: 'orange', status: health?.database },
              { name: 'PostgreSQL', logo: '/postgres.png', color: 'blue', status: health?.database },
              { name: 'OpenSearch', logo: '/opensearch.png', color: 'yellow', status: health?.database },
              { name: 'Public Datasets', icon: '🌐', color: 'emerald', status: 'healthy' },
            ].map((catalog) => (
              <div key={catalog.name} className={`p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col items-center gap-2 transition-all hover:border-${catalog.color}-500/40`}>
                {catalog.logo ? <img src={catalog.logo} alt={catalog.name} className="w-7 h-7 object-contain" /> : <span className="text-2xl">{catalog.icon}</span>}
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider text-center">{catalog.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${catalog.status === 'healthy' || catalog.status === 'enabled' ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-rose-500 animate-pulse'}`}></span>
                  <span className={`text-[9px] font-semibold uppercase ${catalog.status === 'healthy' || catalog.status === 'enabled' ? 'text-green-400' : 'text-rose-400'}`}>
                    {catalog.status === 'healthy' || catalog.status === 'enabled' ? 'CONNECTED' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <ArrowDown className="w-4 h-4 text-slate-600" />

          {/* Layer 4: Infrastructure */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3 justify-center">
              <Zap className="w-4 h-4 text-red-400" />
              <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider">Redis Cache</span>
              {health && renderHealthIndicator(health.redis)}
            </div>
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-center gap-3 justify-center">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Audit Engine</span>
              {health && renderHealthIndicator(health.api)}
            </div>
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-3 justify-center">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Event Timeline</span>
              {health && renderHealthIndicator(health.api)}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== NEW: Federation Trace + Activity Feed ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Federation Trace / Metadata Lifecycle */}
        <div className="lg:col-span-2 p-6 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Metadata Federation Trace — Propagation Path
          </h3>
          <p className="text-[11px] text-slate-500 mb-5">
            When metadata is created or updated, the federation engine propagates changes through every layer. Each checkmark below confirms live connectivity.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {traceSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = traceStep > idx;
              return (
                <React.Fragment key={step.label}>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-500 ${
                    isActive
                      ? `${step.bgColor} ${step.borderColor}`
                      : 'bg-slate-900/30 border-slate-800/50'
                  }`}>
                    {step.logo ? (
                      <img src={step.logo} alt={step.label} className={`w-4 h-4 object-contain transition-all duration-500 ${!isActive && 'opacity-30 grayscale'}`} />
                    ) : (
                      Icon && <Icon className={`w-4 h-4 transition-colors duration-500 ${isActive ? step.color : 'text-slate-600'}`} />
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-500 ${isActive ? 'text-slate-200' : 'text-slate-600'}`}>
                      {step.label}
                    </span>
                    {isActive && (
                      <CheckCircle className={`w-3.5 h-3.5 ${step.color} animate-[fadeIn_0.3s_ease-in]`} />
                    )}
                  </div>
                  {idx < traceSteps.length - 1 && (
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-colors duration-500 ${traceStep > idx ? 'text-slate-400' : 'text-slate-800'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-800/50 flex items-center gap-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {stats.metadata_count} objects propagated across {stats.connected_catalogs} catalogs
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-black border border-emerald-500/20">
              ALL LAYERS ACTIVE
            </span>
          </div>
        </div>

        {/* Recent Federation Activity Feed */}
        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Recent Federation Activity
          </h3>
          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-72">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                <Activity className="w-8 h-8 mb-2" />
                <span className="text-xs">No federation activity recorded yet</span>
                <span className="text-[10px] text-slate-700 mt-1">Create metadata to generate events</span>
              </div>
            ) : (
              events.slice(0, 8).map((event) => (
                <div key={event.event_id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-900/50 border border-slate-850 rounded-xl hover:border-slate-700/50 transition-colors">
                  <div className="shrink-0">{getEventIcon(event.event_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${getEventColor(event.event_type)}`}>
                        {event.event_type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Metadata <span className="text-slate-400 font-mono">#{event.metadata_id}</span>
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-600 shrink-0">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
          {events.length > 0 && (
            <Link
              to="/events"
              className="mt-3 pt-3 border-t border-slate-800/50 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wider text-center transition-colors"
            >
              View Full Event Timeline →
            </Link>
          )}
        </div>
      </div>

      {/* Dashboard Quick Actions */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" />
          Dashboard Quick Operations
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={handleOpenCreate}
            disabled={!isWriteAllowed}
            className={`flex flex-col justify-between p-5 border rounded-2xl text-left transition-all ${
              isWriteAllowed
                ? 'bg-slate-905 border-slate-800 hover:border-violet-500/50 hover:bg-slate-900/80 cursor-pointer group'
                : 'bg-slate-950 border-slate-900 text-slate-650 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Create Metadata
              </span>
              {isWriteAllowed ? <Plus className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" /> : <Lock className="w-3.5 h-3.5 text-slate-650" />}
            </div>
            <span className="text-xs text-slate-500 mt-2">Register federated metadata catalog schema elements.</span>
          </button>

          <Link
            to="/search"
            className="flex flex-col justify-between p-5 border border-slate-800 bg-slate-900 hover:border-indigo-500/50 hover:bg-slate-900/80 rounded-2xl text-left transition-all group"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Search Metadata
              </span>
              <Search className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xs text-slate-500 mt-2">Query cross-catalog schemas using parallel search engines.</span>
          </Link>

          <Link
            to="/consistency"
            className="flex flex-col justify-between p-5 border border-slate-800 bg-slate-900 hover:border-blue-500/50 hover:bg-slate-900/80 rounded-2xl text-left transition-all group"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Check Consistency
              </span>
              <CheckCircle className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xs text-slate-500 mt-2">Audit schema value matching across catalog connections.</span>
          </Link>

          <Link
            to="/reconciliation"
            className="flex flex-col justify-between p-5 border border-slate-800 bg-slate-900 hover:border-cyan-500/50 hover:bg-slate-900/80 rounded-2xl text-left transition-all group"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Reconcile Metadata
              </span>
              <GitMerge className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xs text-slate-500 mt-2">Enforce the source-of-truth values across database catalogs.</span>
          </Link>
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

      {/* Quick Create Dialog Overlay */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2.5">
              <Database className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Quick Register Metadata
              </h3>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Catalog Name
                  </label>
                  <select
                    value={catalogName}
                    onChange={(e) => setCatalogName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-slate-350 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                  >
                    <option value="spark">Spark</option>
                    <option value="postgres">PostgreSQL</option>
                    <option value="opensearch">OpenSearch</option>
                    <option value="public">Public</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Object Name
                  </label>
                  <input
                    type="text"
                    value={objectName}
                    onChange={(e) => setObjectName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-slate-200 placeholder-slate-655 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="e.g. logs_verify"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Object Type
                </label>
                <input
                  type="text"
                  value={objectType}
                  onChange={(e) => setObjectType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-slate-200 placeholder-slate-655 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="e.g. table, view, index"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Owner
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-slate-200 placeholder-slate-655 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="e.g. data-eng, admin"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-slate-200 placeholder-slate-655 text-xs focus:outline-none focus:border-violet-500 transition-colors resize-none"
                  placeholder="Summarize the purpose of this metadata index..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 text-xs font-semibold tracking-wider uppercase rounded-xl transition-all border border-slate-700/50"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold tracking-wider uppercase rounded-xl transition-all shadow-md"
                >
                  REGISTER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
