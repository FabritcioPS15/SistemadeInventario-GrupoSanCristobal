import { useState, useEffect } from 'react';
import { Plus, Building2, Calendar, FileText, User, MapPin, Clock, AlertTriangle, Edit, X, Star, Send, Activity, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { SutranVisit } from '../lib/supabase';
import SutranVisitForm from '../components/forms/SutranVisitForm';
import { useAuth } from '../contexts/AuthContext';

export default function Sutran() {
  const { canEdit } = useAuth();
  const [visits, setVisits] = useState<SutranVisit[]>([]);
  const [loading, setLoading] = useState(true);
  // isHeaderVisible no longer needed if not used in the UI
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SutranVisit | undefined>();
  const [viewingVisit, setViewingVisit] = useState<SutranVisit | undefined>();

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    try {
      const { data, error } = await supabase
        .from('sutran_visits')
        .select('*, locations(*)')
        .order('visit_date', { ascending: false });


      if (error) {
        console.error('❌ Error al cargar visitas:', error);
        alert(`Error al cargar visitas: ${error.message}`);
        return;
      }

      if (data) {
        setVisits(data);
      } else {
        setVisits([]);
      }
    } catch (err) {
      console.error('❌ Error inesperado al cargar visitas:', err);
      alert('Error inesperado al cargar visitas: ' + err);
    } finally {
      setLoading(false);
    }
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

  const typeColors: Record<string, string> = {
    programada: 'bg-blue-50 text-blue-800 border-blue-200',
    no_programada: 'bg-rose-50 text-rose-800 border-rose-200',
    de_gabinete: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  const handleEditVisit = (visit: SutranVisit) => {
    setEditingVisit(visit);
    setShowForm(true);
  };

  const handleViewVisit = (visit: SutranVisit) => {
    setViewingVisit(visit);
  };

  const handleDeleteVisit = async (id: string) => {

    if (window.confirm('¿Está seguro de eliminar esta visita? Esta acción no se puede deshacer.')) {
      try {
        const { data, error } = await supabase
          .from('sutran_visits')
          .delete()
          .eq('id', id)
          .select();


        if (error) {
          console.error('❌ Error al eliminar visita:', error);
          alert(`Error al eliminar la visita: ${error.message}\n\nCódigo: ${error.code}\nDetalles: ${error.details}`);
        } else {
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
    setShowForm(false);
    setEditingVisit(undefined);
    // Pequeño delay para asegurar que la base de datos se actualice
    setTimeout(async () => {
      await fetchVisits();
    }, 100);
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
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out translate-y-0`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <Building2 size={20} />
          </div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Normativa Sutran</h2>
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

      <div className="w-full px-4 md:px-8 xl:px-12 py-8 space-y-8">
          {/* Bloque Unificado: Filtros Compactos */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] px-8 py-8 relative group shadow-sm transition-all hover:shadow-md">
            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-3 shrink-0 py-1 pr-4 border-r border-slate-100 hidden md:flex">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Activity size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#002855] uppercase">Operaciones</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Sutran</p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-4">
                <div className="md:col-span-2 lg:col-span-5 relative">
                  <div className="relative group/search">
                    <input
                      type="text"
                      placeholder="Búsqueda global..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500/50 transition-all placeholder:text-slate-400 font-medium"
                    />
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  </div>
                </div>

                <div className="md:col-span-1 lg:col-span-3">
                  <select
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-blue-500/30 text-left flex items-center justify-between transition-all font-medium"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Todos los estados</option>
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="completed">Completada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>

                <div className="md:col-span-1 lg:col-span-4">
                  <select
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:border-blue-500/30 text-left flex items-center justify-between transition-all font-medium"
                    value={visitTypeFilter}
                    onChange={(e) => setVisitTypeFilter(e.target.value)}
                  >
                    <option value="">Todos los tipos</option>
                    <option value="programada">Programada</option>
                    <option value="no_programada">No Programada</option>
                    <option value="de_gabinete">De Gabinete</option>
                  </select>
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
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
                  className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <X size={14} /> Limpiar filtros
                </button>
              </div>
            )}
          </div>

          </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando visitas...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVisits.map((visit) => (
                <div key={visit.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-sm font-medium">
                          {new Date(visit.visit_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <span className="text-sm">{visit.inspector_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="text-sm">{visit.location_name}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[visit.status]}`}>
                        {statusLabels[visit.status]}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[visit.visit_type]}`}>
                        {getVisitTypeLabel(visit.visit_type)}
                      </span>
                    </div>
                  </div>

                  {(visit.observations || visit.findings) && (
                    <div className="text-sm text-gray-600 mb-3">
                      {visit.observations && <p className="mb-1">{visit.observations}</p>}
                      {visit.findings && <p className="text-amber-700">{visit.findings}</p>}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewVisit(visit)}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      >
                        Ver detalles
                      </button>
                      {canEdit() && (
                        <>
                          <button
                            onClick={() => handleEditVisit(visit)}
                            className="px-3 py-1 text-sm bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteVisit(visit.id)}
                            className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                    {visit.documents && visit.documents.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <FileText size={12} />
                        <span>{visit.documents.length} documento(s)</span>
                      </div>
                    )}
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

        {viewingVisit && (
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
                            <p className="text-sm font-bold text-gray-900">{viewingVisit.visit_date}</p>
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

        {showForm && (
          <SutranVisitForm
            visit={editingVisit}
            onSave={handleSaveVisit}
            onClose={handleCloseForm}
          />
        )}
      </div>
    </div>
  );
}
