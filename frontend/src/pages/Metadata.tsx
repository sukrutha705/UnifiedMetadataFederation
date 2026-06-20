import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Search,
  Database,
  Lock,
} from 'lucide-react';
import api from '../services/api';

interface MetadataResponse {
  id: number;
  catalog_name: string;
  object_name: string;
  object_type: string;
  description: string | null;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
}

interface MetadataProps {
  userRole: string;
}

const Metadata: React.FC<MetadataProps> = ({ userRole }) => {
  const location = useLocation();
  const highlightId = location.state?.highlightId || null;
  const [metadataList, setMetadataList] = useState<MetadataResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Form State
  const [catalogName, setCatalogName] = useState('spark');
  const [objectName, setObjectName] = useState('');
  const [objectType, setObjectType] = useState('table');
  const [description, setDescription] = useState('');
  const [ownerName, setOwnerName] = useState('');

  const fetchMetadata = async () => {
    try {
      const response = await api.get('/client/metadata');
      setMetadataList(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch metadata:', err);
      setError('Unable to retrieve metadata records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleOpenCreate = () => {
    if (userRole === 'Viewer') return;
    setDialogMode('create');
    setCatalogName('spark');
    setObjectName('');
    setObjectType('table');
    setDescription('');
    setOwnerName('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (meta: MetadataResponse) => {
    if (userRole === 'Viewer') return;
    setDialogMode('edit');
    setSelectedId(meta.id);
    setCatalogName(meta.catalog_name);
    setObjectName(meta.object_name);
    setObjectType(meta.object_type);
    setDescription(meta.description || '');
    setOwnerName(meta.owner_name || '');
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (userRole !== 'Admin') return;
    if (!window.confirm('Are you sure you want to delete this metadata record?')) return;

    try {
      await api.delete(`/client/metadata/${id}`);
      fetchMetadata();
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert('Delete operation failed. Please check permissions.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (dialogMode === 'create') {
        const payload = {
          catalog_name: catalogName,
          object_name: objectName,
          object_type: objectType,
          description: description || null,
          owner_name: ownerName || null,
        };
        await api.post('/client/metadata', payload);
      } else if (dialogMode === 'edit' && selectedId !== null) {
        const payload = {
          description: description || null,
          owner_name: ownerName || null,
          object_type: objectType || null,
        };
        await api.put(`/client/metadata/${selectedId}`, payload);
      }
      setDialogOpen(false);
      fetchMetadata();
    } catch (err: any) {
      console.error('Submit failed:', err);
      alert('Failed to save metadata. Please verify fields and permissions.');
    }
  };

  const isWriteAllowed = userRole === 'Admin' || userRole === 'Engineer';
  const isDeleteAllowed = userRole === 'Admin';

  const filteredMetadata = metadataList.filter(
    (meta) =>
      meta.object_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meta.catalog_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meta.description && meta.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen relative">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Metadata Catalog Registry
          </h2>
          <p className="text-sm text-slate-500">
            View, index, and organize unified cross-catalog metadata definitions.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          disabled={!isWriteAllowed}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all shadow-md ${
            isWriteAllowed
              ? 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
          }`}
        >
          {isWriteAllowed ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          REGISTER METADATA
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm max-w-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between max-w-lg bg-slate-900 border border-slate-850 rounded-xl px-3.5 py-1.5">
        <Search className="w-4 h-4 text-slate-500 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by object name, catalog, or description..."
          className="w-full bg-transparent border-none text-xs text-slate-350 focus:outline-none pl-3"
        />
      </div>

      {/* Main Table */}
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
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Catalog</th>
                  <th className="px-6 py-4">Object Name</th>
                  <th className="px-6 py-4">Object Type</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredMetadata.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-550 text-xs">
                      No metadata records found matching query
                    </td>
                  </tr>
                ) : (
                  filteredMetadata.map((meta) => (
                    <tr key={meta.id} className={`hover:bg-slate-900/30 transition-colors ${meta.id === highlightId ? 'bg-violet-600/15 border-l-2 border-l-violet-500 shadow-[inset_4px_0_0_rgba(139,92,246,0.3)]' : ''}`}>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">#{meta.id}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {meta.catalog_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-200">
                        {meta.object_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded uppercase">
                          {meta.object_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {meta.owner_name || <span className="text-slate-650 italic">None</span>}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-450 max-w-xs truncate">
                        {meta.description || <span className="text-slate-650 italic">No description</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(meta)}
                            disabled={!isWriteAllowed}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isWriteAllowed
                                ? 'text-slate-400 hover:text-slate-200 bg-slate-800 border-slate-700/50 hover:bg-slate-750 cursor-pointer'
                                : 'text-slate-600 bg-slate-900 border-slate-850 cursor-not-allowed'
                            }`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(meta.id)}
                            disabled={!isDeleteAllowed}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isDeleteAllowed
                                ? 'text-rose-400 hover:text-rose-300 bg-rose-500/10 border-rose-500/25 hover:bg-rose-500/20 cursor-pointer'
                                : 'text-slate-600 bg-slate-900 border-slate-850 cursor-not-allowed'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog Overlay */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2.5">
              <Database className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                {dialogMode === 'create' ? 'Register New Metadata' : 'Edit Metadata Definition'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {dialogMode === 'create' && (
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
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-slate-200 placeholder-slate-650 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                      placeholder="e.g. customers_prod"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Object Type
                </label>
                <input
                  type="text"
                  value={objectType}
                  onChange={(e) => setObjectType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-slate-200 placeholder-slate-650 text-xs focus:outline-none focus:border-violet-500 transition-colors"
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
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-slate-200 placeholder-slate-650 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="e.g. finance-ops, admin"
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
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-3 text-slate-200 placeholder-slate-650 text-xs focus:outline-none focus:border-violet-500 transition-colors resize-none"
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
                  {dialogMode === 'create' ? 'REGISTER' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Metadata;
