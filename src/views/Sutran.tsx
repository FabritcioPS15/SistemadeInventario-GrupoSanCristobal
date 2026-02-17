import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Building2, Calendar, FileText, User, MapPin, Clock, Info, CheckCircle, AlertTriangle, Trash2, Edit, X, Download, Star, Eye, Send } from 'lucide-react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import { api } from '../lib/api';
import { supabase, type SutranVisit } from '../lib/supabase';
import SutranVisitForm from '../components/forms/SutranVisitForm';
import { useAuth } from '../contexts/AuthContext';

export default function Sutran() {
  const { canEdit } = useAuth();
  const [visits, setVisits] = useState<SutranVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SutranVisit | undefined>();
  const [viewingVisit, setViewingVisit] = useState<SutranVisit | undefined>();

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    cancelled: 0,
    byType: {} as Record<string, number>,
    recentlyAdded: 0
  });

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    console.log('🔄 Cargando visitas de Sutran...');
    try {
      const { data, error } = await supabase
        .from('sutran_visits')
        .select('*, locations(*)')
        .order('visit_date', { ascending: false });

      console.log('📋 Resultado de fetchVisits:', { data, error });

      if (error) {
        console.error('❌ Error al cargar visitas:', error);
        alert(`Error al cargar visitas: ${error.message}`);
        return;
      }

      if (data) {
        console.log(`✅ ${data.length} visitas cargadas`);
        setVisits(data);
        calculateStats(data);
      } else {
        console.log('⚠️ No se recibieron datos de visitas');
        setVisits([]);
        calculateStats([]);
      }
    } catch (err) {
      console.error('❌ Error inesperado al cargar visitas:', err);
      alert('Error inesperado al cargar visitas: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (visitsData: SutranVisit[]) => {
    const byType: Record<string, number> = {};
    let completed = 0;
    let pending = 0;
    let inProgress = 0;
    let cancelled = 0;
    let recentlyAdded = 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    visitsData.forEach(visit => {
      // Contar por estado
      switch (visit.status) {
        case 'completed': completed++; break;
        case 'pending': pending++; break;
        case 'in_progress': inProgress++; break;
        case 'cancelled': cancelled++; break;
      }

      // Contar por tipo
      byType[visit.visit_type] = (byType[visit.visit_type] || 0) + 1;

      // Contar recientes
      const visitDate = new Date(visit.created_at);
      if (visitDate >= oneWeekAgo) {
        recentlyAdded++;
      }
    });

    setStats({
      total: visitsData.length,
      completed,
      pending,
      inProgress,
      cancelled,
      byType,
      recentlyAdded
    });
  };

  const filteredVisits = visits.filter(visit => {
    const matchesSearch =
      visit.inspector_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (visit.observations && visit.observations.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (visit.findings && visit.findings.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = !statusFilter || visit.status === statusFilter;
    const matchesType = !visitTypeFilter || visit.visit_type === visitTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const statusColors: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  };

  const statusLabels: Record<string, string> = {
    completed: 'Completada',
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    cancelled: 'Cancelada',
  };

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'programada': return 'Programada';
      case 'no_programada': return 'No programada';
      case 'de_gabinete': return 'De gabinete';
      default: return 'Desconocido';
    }
  };

  const formatLocalDate = (dateStr: string) => {
    if (!dateStr) return '---';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${day} ${months[parseInt(month) - 1]} ${year}`;
  };

  const typeColors: Record<string, string> = {
    programada: 'bg-blue-50 text-blue-800 border-blue-200',
    no_programada: 'bg-rose-50 text-rose-800 border-rose-200',
    de_gabinete: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  const handleEditVisit = (visit: SutranVisit) => {
    console.log('✏️ Editando visita:', visit);
    setEditingVisit(visit);
    setShowForm(true);
  };

  const handleViewVisit = (visit: SutranVisit) => {
    console.log('👁️ Viendo visita:', visit);
    setViewingVisit(visit);
  };

  const handleDeleteVisit = async (id: string) => {
    console.log('🗑️ Iniciando eliminación de visita:', id);

    if (window.confirm('¿Está seguro de eliminar esta visita? Esta acción no se puede deshacer.')) {
      try {
        const { data, error } = await supabase
          .from('sutran_visits')
          .delete()
          .eq('id', id)
          .select();

        console.log('📋 Resultado de eliminación:', { data, error });

        if (error) {
          console.error('❌ Error al eliminar visita:', error);
          alert(`Error al eliminar la visita: ${error.message}\n\nCódigo: ${error.code}\nDetalles: ${error.details}`);
        } else {
          console.log('✅ Visita eliminada correctamente');
          // Pequeño delay para asegurar que la base de datos se actualice
          setTimeout(async () => {
            await fetchVisits();
          }, 100);
          alert('Visita eliminada correctamente');
        }
      } catch (err) {
        console.error('❌ Error inesperado al eliminar visita:', err);
        alert('Error inesperado al eliminar la visita: ' + err);
      }
    }
  };

  const handleSaveVisit = async () => {
    console.log('💾 Guardando visita...');
    setShowForm(false);
    setEditingVisit(undefined);
    // Pequeño delay para asegurar que la base de datos se actualice
    setTimeout(async () => {
      await fetchVisits();
    }, 100);
    console.log('✅ Visita guardada y datos actualizados');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVisit(undefined);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setVisitTypeFilter('');
  };

  const hasActiveFilters = searchTerm || statusFilter || visitTypeFilter;

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Title / Tab Bar - Minimalist Executive Style */}
      {/* Standard Application Header (h-14) */}
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <Building2 size={20} />
          </div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Normativa Sutran</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
              <span>Cumplimiento Regulatorio</span>
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>{visits.length} Visitas</span>
            </div>
          </div>
        </div>

        {/* Integrated Stats in Header */}
        <div className="hidden xl:flex items-center gap-4 mx-6 border-l border-r border-slate-100 px-6">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Total</span>
            <span className="text-sm font-black text-gray-900 leading-none mt-0.5">{stats.total}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Completas</span>
            <span className="text-sm font-black text-emerald-600 leading-none mt-0.5">{stats.completed}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Pendientes</span>
            <span className="text-sm font-black text-yellow-600 leading-none mt-0.5">{stats.pending}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Recientes</span>
            <span className="text-sm font-black text-blue-600 leading-none mt-0.5">{stats.recentlyAdded}</span>
          </div>
        </div>

        {/* Integrated Search Bar in Header */}
        <div className="flex-1 max-w-md px-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#002855] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Buscar inspectores, sedes u observaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit() && (
            <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
              <button
                onClick={() => {
                  setEditingVisit(undefined);
                  setShowForm(true);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors"
                title="Nueva Visita"
              >
                <Plus size={22} />
              </button>
            </div>
          )}

          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
            <Star size={18} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Stats Grid */}


        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8">
          <div className="flex flex-col lg:flex-row justify-end gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                className="block w-full pl-3 pr-10 py-2 border border-slate-300 rounded-md bg-white text-xs font-bold text-slate-700 outline-none cursor-pointer uppercase tracking-wider"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">TODOS LOS ESTADOS</option>
                <option value="pending">PENDIENTE</option>
                <option value="in_progress">EN PROGRESO</option>
                <option value="completed">COMPLETADA</option>
                <option value="cancelled">CANCELADA</option>
              </select>

              <select
                className="block w-full pl-3 pr-10 py-2 border border-slate-300 rounded-md bg-white text-xs font-bold text-slate-700 outline-none cursor-pointer uppercase tracking-wider"
                value={visitTypeFilter}
                onChange={(e) => setVisitTypeFilter(e.target.value)}
              >
                <option value="">TODOS LOS TIPOS</option>
                <option value="programada">PROGRAMADA</option>
                <option value="no_programada">NO PROGRAMADA</option>
                <option value="de_gabinete">DE GABINETE</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">
                    "{searchTerm}"
                  </span>
                )}
                {statusFilter && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold border border-amber-100">
                    {statusLabels[statusFilter]}
                  </span>
                )}
                {visitTypeFilter && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold border border-purple-100">
                    {getVisitTypeLabel(visitTypeFilter)}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-gray-400 hover:text-rose-600 transition-colors"
              >
                <X size={14} /> Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {
          loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando visitas...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVisits.map((visit) => (
                <div key={visit.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-lg hover:border-blue-300 overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                          <div className="flex items-center gap-1.5 p-2 px-3 bg-slate-50 border border-slate-100 rounded-lg w-fit">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="font-bold text-slate-900 text-[11px] uppercase">
                              {formatLocalDate(visit.visit_date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold uppercase tracking-tight">
                            <User size={14} className="text-slate-400" />
                            <span>Inspector:</span>
                            <span className="text-slate-900">{visit.inspector_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold uppercase tracking-tight sm:border-l sm:border-slate-200 sm:pl-4">
                            <MapPin size={14} className="text-rose-400" />
                            <span className="text-slate-900">{visit.location_name}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm border ${statusColors[visit.status]}`}>
                            {statusLabels[visit.status]}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm border ${typeColors[visit.visit_type]}`}>
                            {getVisitTypeLabel(visit.visit_type)}
                          </span>
                        </div>

                        {visit.observations && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Observaciones</label>
                            <p className="text-sm text-gray-700 leading-relaxed">{visit.observations}</p>
                          </div>
                        )}

                        {visit.findings && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-3">
                            <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Hallazgos</label>
                            <p className="text-sm text-amber-900 leading-relaxed font-medium">{visit.findings}</p>
                          </div>
                        )}

                        {visit.documents && visit.documents.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {visit.documents.map((doc, index) => (
                              <span key={index} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider">
                                <FileText size={12} className="text-blue-500" />
                                {doc}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-50">
                        <button
                          onClick={() => handleViewVisit(visit)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-bold text-[10px] uppercase tracking-widest border border-slate-100"
                        >
                          <Eye size={16} /> Ver detalles
                        </button>
                        {canEdit() && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditVisit(visit)}
                              className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg transition-colors border border-slate-100"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteVisit(visit.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 bg-red-50 rounded-lg transition-colors border border-red-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }

        {
          !loading && filteredVisits.length === 0 && (
            <div className="text-center py-12">
              <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg mb-2">No se encontraron visitas</p>
              <p className="text-gray-400">
                {hasActiveFilters ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando una nueva visita'}
              </p>
            </div>
          )
        }

        {
          viewingVisit && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Detalles de la Visita</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Reporte de Inspección SUTRAN</p>
                  </div>
                  <button
                    onClick={() => setViewingVisit(undefined)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Calendar size={14} className="text-blue-600" />
                          Información de la Visita
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <span className="text-sm text-gray-500">Fecha de Inspección</span>
                            <p className="text-sm font-bold text-gray-900">{formatLocalDate(viewingVisit.visit_date)}</p>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <span className="text-sm text-gray-500">Tipo de Visita</span>
                            <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm border ${typeColors[viewingVisit.visit_type]}`}>
                              {getVisitTypeLabel(viewingVisit.visit_type)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Estado Actual</span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm border ${statusColors[viewingVisit.status]}`}>
                              {statusLabels[viewingVisit.status]}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-rose-50 rounded-xl p-5 border border-rose-100 shadow-sm">
                        <h3 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <MapPin size={14} className="text-rose-600" />
                          Ubicación de la Sede
                        </h3>
                        <div>
                          <p className="text-lg font-bold text-rose-900">{viewingVisit.location_name}</p>
                          <p className="text-xs text-rose-600 mt-1 uppercase tracking-wider font-semibold">Grupo San Cristóbal</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 shadow-sm">
                        <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <User size={14} className="text-emerald-600" />
                          Datos del Inspector
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-lg font-bold text-emerald-900 leading-tight">{viewingVisit.inspector_name}</p>
                            <p className="text-xs text-emerald-600 mt-1">SUTRAN - Inspector Tecnológico</p>
                          </div>
                          <div className="grid grid-cols-1 gap-2 pt-2">
                            {viewingVisit.inspector_email && (
                              <div className="flex items-center gap-2 text-sm text-emerald-800">
                                <Send size={14} />
                                {viewingVisit.inspector_email}
                              </div>
                            )}
                            {viewingVisit.inspector_phone && (
                              <div className="flex items-center gap-2 text-sm text-emerald-800">
                                <Clock size={14} />
                                {viewingVisit.inspector_phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {viewingVisit.documents && viewingVisit.documents.length > 0 && (
                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 shadow-sm">
                          <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FileText size={14} className="text-blue-600" />
                            Documentación Adjunta
                          </h3>
                          <div className="space-y-2">
                            {viewingVisit.documents.map((doc, index) => (
                              <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-100 shadow-sm group hover:border-blue-400 transition-colors">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                  <FileText size={16} />
                                </div>
                                <span className="text-sm font-bold text-blue-800 truncate">{doc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {viewingVisit.observations && (
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Observaciones Generales</h3>
                        <p className="text-gray-700 leading-relaxed italic text-sm">"{viewingVisit.observations}"</p>
                      </div>
                    )}

                    {viewingVisit.findings && (
                      <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                        <h3 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <AlertTriangle size={14} />
                          Hallazgos Identificados
                        </h3>
                        <p className="text-gray-800 font-medium leading-relaxed text-sm">{viewingVisit.findings}</p>
                      </div>
                    )}

                    {viewingVisit.recommendations && (
                      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                        <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">Recomendaciones del Inspector</h3>
                        <p className="text-gray-800 leading-relaxed text-sm">{viewingVisit.recommendations}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => setViewingVisit(undefined)}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Cerrar
                  </button>
                  {canEdit() && (
                    <button
                      onClick={() => {
                        const v = viewingVisit; // Changed from viewingVisit! to viewingVisit
                        setViewingVisit(undefined);
                        handleEditVisit(v);
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      <Edit size={16} />
                      Editar Visita
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        }

        {
          showForm && (
            <SutranVisitForm
              visit={editingVisit}
              onSave={handleSaveVisit}
              onClose={handleCloseForm}
            />
          )
        }
      </div>
    </div>
  );
}


