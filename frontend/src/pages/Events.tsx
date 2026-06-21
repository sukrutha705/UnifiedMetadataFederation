import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, AlertCircle, PlusCircle, CheckSquare, Edit, Trash, HelpCircle } from 'lucide-react';
import api from '../services/api';

interface EventResponse {
  event_id: number;
  metadata_id: number;
  event_type: string;
  timestamp: string;
}

const Events: React.FC = () => {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/dashboard/events');
      setEvents(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      setError('Unable to retrieve event timeline records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 8000); // refresh every 8s
    return () => clearInterval(interval);
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CREATED':
        return <PlusCircle className="w-5 h-5 text-emerald-400" />;
      case 'UPDATED':
        return <Edit className="w-5 h-5 text-blue-400" />;
      case 'DELETED':
        return <Trash className="w-5 h-5 text-rose-400" />;
      case 'RECONCILED':
        return <CheckSquare className="w-5 h-5 text-violet-400" />;
      case 'CONSISTENCY_CHECKED':
        return <HelpCircle className="w-5 h-5 text-indigo-400" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case 'CREATED':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'UPDATED':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'DELETED':
        return 'bg-rose-500/10 border-rose-500/20';
      case 'RECONCILED':
        return 'bg-violet-500/10 border-violet-500/20';
      case 'CONSISTENCY_CHECKED':
        return 'bg-indigo-500/10 border-indigo-500/20';
      default:
        return 'bg-slate-800 border-slate-700/50';
    }
  };

  const getEventTextColor = (type: string) => {
    switch (type) {
      case 'CREATED':
        return 'text-emerald-400';
      case 'UPDATED':
        return 'text-blue-400';
      case 'DELETED':
        return 'text-rose-400';
      case 'RECONCILED':
        return 'text-violet-400';
      case 'CONSISTENCY_CHECKED':
        return 'text-indigo-400';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            System Event Timeline
          </h2>
          <p className="text-sm text-slate-500">
            Chronological audit trailing of metadata schema alterations and consistency checks.
          </p>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            fetchEvents();
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

      {/* Timeline Component */}
      {loading ? (
        <div className="space-y-4 animate-pulse max-w-xl">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-800 w-1/3 rounded"></div>
                <div className="h-3 bg-slate-800 w-1/2 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-xl relative pl-6 border-l border-slate-800 space-y-8 py-2">
          {events.length === 0 ? (
            <p className="text-slate-550 text-xs py-4 pl-2">No metadata timeline events have been logged yet.</p>
          ) : (
            events.map((event) => (
              <div key={event.event_id} className="relative group">
                {/* Timeline node icon */}
                <div className={`absolute -left-[37px] top-0 p-1.5 rounded-full border bg-slate-950 z-10 transition-transform group-hover:scale-110 ${getEventBg(event.event_type)}`}>
                  {getEventIcon(event.event_type)}
                </div>

                {/* Event info block */}
                <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-1.5 transition-colors hover:border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      {event.event_type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-snug">
                    <span className={`font-semibold ${getEventTextColor(event.event_type)}`}>
                      {event.event_type.replace('_', ' ')}
                    </span>
                    {' '}executed on metadata record{' '}
                    <strong className="text-violet-400 font-semibold font-mono">
                      #{event.metadata_id}
                    </strong>
                    .
                  </p>

                  <div className="text-[9px] text-slate-600 uppercase tracking-widest pt-1 border-t border-slate-850/60 flex items-center justify-between">
                    <span>EVENT ID: #{event.event_id}</span>
                    <span>{new Date(event.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Events;
