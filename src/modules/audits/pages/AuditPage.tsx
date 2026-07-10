import { useState, useEffect } from 'react';
import { Trash2, Edit, List, ClipboardCheck, LayoutGrid, X, User, Calendar, Plus } from 'lucide-react';
import { useHeaderVisible } from '../../../shared/hooks/useHeaderVisible';
import { supabase, BranchAudit } from '../../../shared/services/supabase';
import { useAuth } from '../../../app/providers/AuthContext';
import AuditForm from '../forms/AuditForm';
import HeaderSearch from '../../../app/layouts/HeaderSearch';
import FilterBar from '../../../shared/components/ui/FilterBar';
import { useNotify } from '../../../shared/hooks/useNotify';

type ViewType = 'history' | 'form';

export default function Audit() {
  const { canEdit } = useAuth();
  const { confirm, error: notifyError } = useNotify();
  const [view, setView] = useState<ViewType>('history');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [audits, setAudits] = useState<BranchAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingAudit, setEditingAudit] = useState<BranchAudit | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = (auditsToSelect: BranchAudit[]) => {
    if (selectedIds.length === auditsToSelect.length && auditsToSelect.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(auditsToSelect.map(a => a.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirm(`¿Eliminar ${selectedIds.length} auditorías seleccionadas?`, 'Eliminación por Lote');
    if (!confirmed) return;
    const { error } = await supabase.from('branch_audits').delete().in('id', selectedIds);
    if (error) return notifyError('Error al eliminar: ' + error.message);
    await fetchAudits();
    setSelectedIds([]);
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('branch_audits').select('*, locations(*)').order('audit_date', { ascending: false });
    if (!error && data) setAudits(data as BranchAudit[]);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('¿Estás seguro de eliminar este registro?', 'Eliminar Registro');
    if (!confirmed) return;
    const { error } = await supabase.from('branch_audits').delete().eq('id', id);
    if (error) return notifyError('Error al eliminar: ' + error.message);
    await fetchAudits();
  };

  const handleEdit = (audit: BranchAudit) => { setEditingAudit(audit); setView('form'); };

  const filteredAudits = audits.filter(audit => {
    const locName = audit.locations?.name || '';
    const mSearch = locName.toLowerCase().includes(searchTerm.toLowerCase()) || audit.auditor_name.toLowerCase().includes(searchTerm.toLowerCase());
    const mStatus = !filterStatus || audit.status === filterStatus;
    return mSearch && mStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'excellent': return { label: 'EXCELENTE', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'good': return { label: 'BUENO', color: 'bg-blue-50 text-blue-800 border-blue-100' };
      case 'regular': return { label: 'REGULAR', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'critical': return { label: 'CRÍTICO', color: 'bg-rose-50 text-rose-800 border-rose-200' };
      default: return { label: status.toUpperCase(), color: 'bg-slate-50 text-slate-800 border-slate-200' };
    }
  };

  const formatDate = (ds: string) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(ds));

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc] font-sans">
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#002855] p-2 text-white shadow-lg">
            <ClipboardCheck size={18} />
          </div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-[0.15em] leading-none">Auditoría Operativa</h2>
            <div className="flex items-center gap-2 text-[9px] font-bold text-[#64748b] uppercase tracking-widest mt-1">
              <span>Evaluación de Sedes</span>
              <div className="w-1 h-1 bg-gray-300 rounded-none" />
              <span className="text-blue-600 font-black">{filteredAudits.length} EVALUACIONES</span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-xl mx-8 gap-4">
          <HeaderSearch
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            placeholder="Buscar auditoría..."
            variant="light"
          />

          <FilterBar
            filters={[
              { key: 'status', placeholder: 'TODOS LOS ESTADOS', wrapperClassName: 'md:min-w-[200px]', options: [
                { value: 'excellent', label: 'EXCELENTE' },
                { value: 'good', label: 'BUENO' },
                { value: 'regular', label: 'REGULAR' },
                { value: 'critical', label: 'CRÍTICO' },
              ]},
            ]}
            values={{ status: filterStatus }}
            onChange={(key, value) => setFilterStatus(value as string)}
            hideClearButton
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-50 p-1 border border-slate-200">
            <button
              onClick={() => { setView('history'); setViewMode('grid'); }}
              className={`p-1.5 transition-all ${view === 'history' && viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => { setView('history'); setViewMode('list'); }}
              className={`p-1.5 transition-all ${view === 'history' && viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}
            >
              <List size={16} />
            </button>
          </div>

          {canEdit() && selectedIds.length > 0 && view === 'history' && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-all shadow-sm flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <Trash2 size={14} />
              Eliminar ({selectedIds.length})
            </button>
          )}

          {canEdit() && (
            <button
              onClick={() => setView('form')}
              className={`px-5 py-2 bg-[#002855] text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all border border-blue-900 shadow-md flex items-center gap-2 group ${view === 'form' ? 'ring-2 ring-blue-500' : ''}`}
            >
              <Plus size={14} className="group-hover:rotate-90 transition-transform" />
              NUEVO REPORTE
            </button>
          )}
        </div>
      </div>

      <div className="p-8 space-y-8 flex-1 overflow-y-auto max-w-[1600px] mx-auto w-full">
        {view === 'form' ? (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="bg-white border border-slate-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#002855]" />
              <div className="p-8">
                <div className="mb-8 border-b border-slate-100 pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[18px] font-black text-[#002855] uppercase tracking-tight">{editingAudit ? 'MODIFICAR EVALUACIÓN' : 'REGISTRAR EVALUACIÓN'}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">DOCUMENTACIÓN TÉCNICA Y HALLAZGOS POR SEDE</p>
                    </div>
                    <button onClick={() => setView('history')} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                </div>
                <AuditForm editAudit={editingAudit} onClose={() => { setView('history'); setEditingAudit(undefined); }} onSave={async () => { setView('history'); setEditingAudit(undefined); await fetchAudits(); }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-[#002855] animate-spin mb-4"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Archivos...</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredAudits.map(audit => {
                  const statusCfg = getStatusConfig(audit.status);
                  return (
                    <div key={audit.id} className={`bg-white border hover:shadow-xl transition-all duration-300 relative group overflow-hidden flex flex-col ${selectedIds.includes(audit.id) ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-slate-200 hover:border-blue-200 shadow-sm'}`}>
                      {canEdit() && (
                        <div className="absolute top-4 right-4 z-20">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(audit.id)}
                            onChange={() => toggleSelect(audit.id)}
                            onClick={e => e.stopPropagation()}
                            className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]/30 cursor-pointer shadow-sm"
                          />
                        </div>
                      )}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rotate-45 -mr-16 -mt-16 group-hover:bg-blue-50 transition-colors" />
                      <div className="p-7 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-8 relative z-10">
                          <span className={`px-3 py-1 border text-[9px] font-black uppercase tracking-widest ${statusCfg.color}`}>{statusCfg.label}</span>
                        </div>

                        <div className="mb-8">
                          <h3 className="text-[16px] font-black text-[#002855] uppercase tracking-tight mb-2 leading-tight group-hover:text-blue-600 transition-colors">{audit.locations?.name || 'SEDE N/A'}</h3>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <User size={12} className="text-slate-300" /> Auditor: <span className="text-[#002855]">{audit.auditor_name}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-5 border border-slate-100 flex items-center justify-between mb-8">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">SCORE DE CALIDAD</span>
                            <div className="flex items-center gap-1">
                              <Calendar size={10} className="text-slate-400" />
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{formatDate(audit.audit_date)}</span>
                            </div>
                          </div>
                          <span className={`text-4xl font-black ${audit.score >= 90 ? 'text-emerald-600' : audit.score >= 70 ? 'text-[#002855]' : 'text-rose-600'}`}>{audit.score}<span className="text-sm ml-0.5">%</span></span>
                        </div>

                        <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-end gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(audit); }} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#002855] hover:bg-slate-100 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"><Edit size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(audit.id); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      {canEdit() && (
                        <th className="px-4 py-4 text-center w-12">
                          <input
                            type="checkbox"
                            checked={filteredAudits.length > 0 && selectedIds.length === filteredAudits.length}
                            onChange={() => toggleSelectAll(filteredAudits)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#002855] focus:ring-[#002855]/30 transition-all cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-4 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Auditoría / Auditor</th>
                      <th className="px-4 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Ubicación</th>
                      <th className="px-4 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha</th>
                      <th className="px-4 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Score</th>
                      <th className="px-4 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Estado</th>
                      <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAudits.map(audit => {
                      const statusCfg = getStatusConfig(audit.status);
                      return (
                        <tr key={audit.id} className={`cursor-pointer transition-all duration-200 group border-b border-slate-50 last:border-0 ${selectedIds.includes(audit.id) ? 'bg-blue-50/40' : 'hover:bg-blue-50/30'}`} onClick={() => handleEdit(audit)}>
                          {canEdit() && (
                            <td className="px-4 py-4 text-center w-12">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(audit.id)}
                                onChange={() => toggleSelect(audit.id)}
                                onClick={e => e.stopPropagation()}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-[#002855] focus:ring-[#002855]/30 transition-all cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-black text-[#002855] uppercase tracking-tight group-hover:text-blue-600 transition-colors uppercase">{audit.id.slice(0, 8)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{audit.auditor_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-black text-[11px] text-[#002855] uppercase tracking-widest">
                            {audit.locations?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            {formatDate(audit.audit_date)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`text-[16px] font-black ${audit.score >= 90 ? 'text-emerald-600' : audit.score >= 70 ? 'text-[#002855]' : 'text-rose-600'}`}>{audit.score}%</span>
                              <div className="w-16 h-1 bg-slate-100 mt-1">
                                <div className={`h-full bg-blue-500`} style={{ width: `${audit.score}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border ${statusCfg.color}`}>{statusCfg.label}</span>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={(e) => { e.stopPropagation(); handleEdit(audit); }} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#002855] hover:bg-slate-100 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"><Edit size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(audit.id); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

