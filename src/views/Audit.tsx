import { useState, useEffect } from 'react';
import { Search, Trash2, Edit, List, ClipboardCheck, AlertCircle, CheckCircle2, Star, X } from 'lucide-react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
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
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    setLoading(true);
    const { data, error } = await api.from('branch_audits').select('*, locations(*)').order('audit_date', { ascending: false });
    if (!error && data) setAudits(data as BranchAudit[]);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
    await api.from('branch_audits').delete().eq('id', id);
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
      case 'excellent': return { label: 'Excelente', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle2 size={14} /> };
      case 'good': return { label: 'Bueno', color: 'bg-slate-50 text-slate-800 border-slate-200', icon: <CheckCircle2 size={14} /> };
      case 'regular': return { label: 'Regular', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: <AlertCircle size={14} /> };
      case 'critical': return { label: 'Crítico', color: 'bg-red-50 text-red-800 border-red-200', icon: <AlertCircle size={14} /> };
      default: return { label: status, color: 'bg-gray-50 text-gray-800 border-gray-200', icon: null };
    }
  };

  const formatDate = (ds: string) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(ds));

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc] font-sans">
      {/* Standard Application Header (h-14) */}
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <ClipboardCheck size={20} />
          </div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Auditoría</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
              <span>Control de Sedes</span>
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>{audits.length} Reportes</span>
            </div>
          </div>
        </div>

        {/* Integrated Search Bar */}
        <div className="flex-1 max-w-md px-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#002855] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Buscar por sede o auditor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#f1f5f9] p-1 rounded-lg border border-[#e2e8f0]">
            <button onClick={() => { setView('history'); setEditingAudit(undefined); }} className={`p-1.5 rounded-md transition-all ${view === 'history' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500'}`}><List size={16} /></button>
            {canEdit() && (
              <button onClick={() => setView('form')} className={`p-1.5 rounded-md transition-all ${view === 'form' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500'}`}><ClipboardCheck size={16} /></button>
            )}
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors"><Star size={18} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors"><X size={18} /></button>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {view === 'form' ? (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-8">
              <div className="mb-8 border-b border-gray-100 pb-6"><h3 className="text-xl font-black text-[#002855] uppercase tracking-tight">{editingAudit ? 'Editar Evaluación' : 'Nueva Evaluación'}</h3><p className="text-xs font-bold text-gray-500 mt-1 uppercase">Documente los hallazgos y el estado de la unidad.</p></div>
              <AuditForm editAudit={editingAudit} onClose={() => { setView('history'); setEditingAudit(undefined); }} onSave={async () => { setView('history'); setEditingAudit(undefined); await fetchAudits(); }} />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex flex-col gap-1 w-full sm:w-64">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado de Auditoría</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs sm:text-[10px] uppercase tracking-widest text-[#64748b] outline-none">
                  <option value="">TODOS LOS ESTADOS</option>
                  <option value="excellent">EXCELENTE</option>
                  <option value="good">BUENO</option>
                  <option value="regular">REGULAR</option>
                  <option value="critical">CRÍTICO</option>
                </select>
              </div>
              <div className="text-[10px] font-black text-[#64748b] uppercase tracking-widest px-2">{filteredAudits.length} EVALUACIONES</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#002855]"></div></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAudits.map(audit => {
                  const statusCfg = getStatusConfig(audit.status);
                  return (
                    <div key={audit.id} className="bg-white rounded-2xl border border-[#e2e8f0] p-6 hover:shadow-xl transition-all duration-300 flex flex-col group overflow-hidden">
                      <div className="flex items-start justify-between mb-6">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${statusCfg.color}`}>{statusCfg.label}</span>
                        <span className="text-[8px] font-mono text-slate-300 font-bold uppercase">ID: {audit.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-sm font-black text-[#002855] uppercase tracking-tight mb-1">{audit.locations?.name || 'Sede N/A'}</h3>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Auditor: <span className="text-[#002855]">{audit.auditor_name}</span></p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calificación</span>
                          <span className={`text-2xl font-black ${audit.score >= 90 ? 'text-emerald-600' : audit.score >= 70 ? 'text-[#002855]' : 'text-rose-600'}`}>{audit.score}%</span>
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{formatDate(audit.audit_date)}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEdit(audit)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(audit.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



