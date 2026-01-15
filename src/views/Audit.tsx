import { useState, useEffect } from 'react';
import { Search, Trash2, Edit, List, ClipboardCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, BranchAudit } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AuditForm from '../components/forms/AuditForm';

type ViewType = 'history' | 'form';

export default function Audit() {
  const { canEdit } = useAuth();
  const [view, setView] = useState<ViewType>('history');
  const [audits, setAudits] = useState<BranchAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingAudit, setEditingAudit] = useState<BranchAudit | undefined>();

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('branch_audits')
      .select('*, locations(*)')
      .order('audit_date', { ascending: false });

    if (!error && data) {
      setAudits(data as BranchAudit[]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro de auditoría?')) return;

    const { error } = await supabase
      .from('branch_audits')
      .delete()
      .eq('id', id);

    if (!error) {
      await fetchAudits();
    }
  };

  const handleEdit = (audit: BranchAudit) => {
    setEditingAudit(audit);
    setView('form');
  };

  const filteredAudits = audits.filter(audit => {
    const locationName = audit.locations?.name || '';
    const matchesSearch =
      locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.auditor_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filterStatus || audit.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'excellent':
        return { label: 'Excelente', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle2 size={14} /> };
      case 'good':
        return { label: 'Bueno', color: 'bg-slate-50 text-slate-800 border-slate-200', icon: <CheckCircle2 size={14} /> };
      case 'regular':
        return { label: 'Regular', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: <AlertCircle size={14} /> };
      case 'critical':
        return { label: 'Crítico', color: 'bg-red-50 text-red-800 border-red-200', icon: <AlertCircle size={14} /> };
      default:
        return { label: status, color: 'bg-gray-50 text-gray-800 border-gray-200', icon: null };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
    }).format(date);
  };

  return (
    <div className="w-full px-4 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 uppercase">Gestión de Auditoría</h2>
          <p className="text-slate-500 text-sm font-medium">Registro y control institucional de cumplimiento por sede</p>
        </div>

        <div className="flex w-full lg:w-auto bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => { setView('history'); setEditingAudit(undefined); }}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-md transition-all font-bold text-[11px] uppercase tracking-wider ${view === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <List size={16} />
            <span className="hidden sm:inline">Historial</span>
            <span className="sm:hidden">Historial</span>
          </button>
          {canEdit() && (
            <button
              onClick={() => { setView('form'); }}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-md transition-all font-bold text-[11px] uppercase tracking-wider ${view === 'form' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ClipboardCheck size={16} />
              <span className="hidden sm:inline">Formulario de Sede</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {view === 'form' ? (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-8">
            <div className="mb-8 border-b border-gray-100 pb-6">
              <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                {editingAudit ? 'Actualización de Auditoría' : 'Registro de Nueva Auditoría'}
              </h3>
              <p className="text-sm text-slate-500 mt-1 font-medium italic">Documente los hallazgos y el estado de operatividad de la unidad.</p>
            </div>

            <div className="relative">
              {/* AuditForm is already styled with its own internal logic, we might need to adjust it too for formality */}
              <AuditForm
                editAudit={editingAudit}
                onClose={() => { setView('history'); setEditingAudit(undefined); }}
                onSave={async () => { setView('history'); setEditingAudit(undefined); await fetchAudits(); }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="bg-slate-50/50 rounded-lg border border-slate-200 p-3 mb-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Filtrar por sede o responsable..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-sm"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all font-bold text-[10px] uppercase tracking-widest text-slate-600 cursor-pointer"
              >
                <option value="">Estados: Todos</option>
                <option value="excellent">Excelente</option>
                <option value="good">Bueno</option>
                <option value="regular">Regular</option>
                <option value="critical">Crítico</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-800"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recuperando información...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredAudits.length > 0 ? (
                filteredAudits.map(audit => {
                  const statusCfg = getStatusConfig(audit.status);
                  return (
                    <div key={audit.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:border-slate-400 transition-all duration-200 shadow-sm">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none">REF: {audit.id.slice(0, 8)}</span>
                          </div>

                          <div className="flex flex-col gap-1 mb-3">
                            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                              {audit.locations?.name || 'Sede no especificada'}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              Responsable de Auditoría: <span className="text-slate-900 font-bold uppercase">{audit.auditor_name}</span>
                            </p>
                            {audit.administrator_name && (
                              <p className="text-xs text-slate-500 font-medium">
                                Evaluado (Admin): <span className="text-slate-900 font-bold uppercase">{audit.administrator_name}</span>
                              </p>
                            )}
                          </div>

                          {audit.observations && (
                            <div className="mt-3 p-3 bg-slate-50 rounded border-l-2 border-slate-300">
                              <p className="text-xs text-slate-600 leading-relaxed font-medium">"{audit.observations}"</p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 lg:flex lg:flex-row items-center gap-4 lg:gap-6 lg:pl-8 lg:border-l border-gray-100 pt-4 lg:py-0">
                          <div className="text-left lg:text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Calificación</p>
                            <div className={`text-xl lg:text-2xl font-bold ${audit.score >= 90 ? 'text-emerald-700' : audit.score >= 70 ? 'text-slate-900' : audit.score >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                              {audit.score}%
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">F. Registro</p>
                            <p className="text-xs font-bold text-slate-800 uppercase">
                              {formatDate(audit.audit_date)}
                            </p>
                          </div>

                          {canEdit() && (
                            <div className="flex items-center justify-end gap-1 col-span-2 lg:col-span-1 border-t lg:border-t-0 pt-3 lg:pt-0">
                              <button
                                onClick={() => handleEdit(audit)}
                                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-all"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(audit.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-slate-50 rounded-lg border border-dashed border-slate-200 py-16 flex flex-col items-center justify-center text-center">
                  <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[11px]">Búsqueda sin resultados</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
