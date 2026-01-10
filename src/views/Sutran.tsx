import { useState, useEffect } from 'react';
import { Building2, Calendar, MapPin, User, Clock, Search, Plus, Edit, Trash2, Eye, X, Copy, Check, AlertTriangle, CheckCircle, FileText, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { SutranVisit } from '../lib/supabase';
import SutranVisitForm from '../components/forms/SutranVisitForm';
import { useAuth } from '../contexts/AuthContext';

export default function Sutran() {
  const { canEdit } = useAuth();
  const [visits, setVisits] = useState<SutranVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<SutranVisit | undefined>();
  const [viewingVisit, setViewingVisit] = useState<SutranVisit | undefined>();
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
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

  const typeColors: Record<string, string> = {
    programada: 'bg-blue-50 text-blue-800 border-blue-200',
    no_programada: 'bg-rose-50 text-rose-800 border-rose-200',
    de_gabinete: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    } catch (err) {
      // Fallback para navegadores más antiguos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedItems(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    }
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
    <div className="p-8 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Visitas de Sutran</h2>
          <p className="text-gray-600">Gestión y seguimiento de inspecciones</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              console.log('🔍 Probando conexión con Supabase...');
              try {
                const { data, error } = await supabase
                  .from('sutran_visits')
                  .select('id, inspector_name, status')
                  .limit(1);

                if (error) {
                  console.error('❌ Error de conexión:', error);
                  alert(`Error de conexión: ${error.message}`);
                } else {
                  console.log('✅ Conexión exitosa:', data);
                  alert('Conexión con Supabase exitosa');
                }
              } catch (err) {
                console.error('❌ Error inesperado:', err);
                alert('Error inesperado: ' + err);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <Building2 size={20} />
            Probar Conexión
          </button>

          {canEdit() && (
            <button
              onClick={() => {
                setEditingVisit(undefined);
                setShowForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Nueva Visita
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Visitas</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <Building2 size={20} className="text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Completadas</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
            <CheckCircle size={20} className="text-emerald-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pendientes</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <Clock size={20} className="text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recientes (7d)</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-blue-600">{stats.recentlyAdded}</div>
            <Calendar size={20} className="text-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Buscar inspector, sede, observaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro Estado */}
            <div>
              <select
                className="block w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los Estados</option>
                <option value="pending">Pendiente</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            {/* Filtro Tipo */}
            <div>
              <select
                className="block w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={visitTypeFilter}
                onChange={(e) => setVisitTypeFilter(e.target.value)}
              >
                <option value="">Todos los Tipos</option>
                <option value="programada">Programada</option>
                <option value="no_programada">No programada</option>
                <option value="de_gabinete">De gabinete</option>
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
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando visitas...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVisits.map((visit) => (
            <div key={visit.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-lg hover:border-blue-300 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4 flex-wrap">
                      <div className="flex items-center gap-1.5 p-2 px-3 bg-gray-50 border border-gray-100 rounded-lg">
                        <Calendar size={16} className="text-blue-500" />
                        <span className="font-bold text-gray-900 text-sm">
                          {new Date(visit.visit_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                        <User size={16} className="text-gray-400" />
                        <span className="text-gray-400">Inspector:</span>
                        <span className="text-gray-900">{visit.inspector_name}</span>
                        <button
                          onClick={() => copyToClipboard(visit.inspector_name, `inspector-${visit.id}`)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copiar inspector"
                        >
                          {copiedItems[`inspector-${visit.id}`] ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium border-l border-gray-200 pl-4">
                        <MapPin size={16} className="text-rose-500" />
                        <span className="text-gray-900">{visit.location_name}</span>
                        <button
                          onClick={() => copyToClipboard(visit.location_name, `location-${visit.id}`)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copiar ubicación"
                        >
                          {copiedItems[`location-${visit.id}`] ? <Check size={14} /> : <Copy size={14} />}
                        </button>
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

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleViewVisit(visit)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                      title="Ver detalles"
                    >
                      <Eye size={20} />
                    </button>
                    {canEdit() && (
                      <>
                        <button
                          onClick={() => handleEditVisit(visit)}
                          className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100"
                          title="Editar"
                        >
                          <Edit size={20} />
                        </button>
                        <button
                          onClick={() => handleDeleteVisit(visit.id)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                          title="Eliminar"
                        >
                          <Trash2 size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredVisits.length === 0 && (
        <div className="text-center py-12">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg mb-2">No se encontraron visitas</p>
          <p className="text-gray-400">
            {hasActiveFilters ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando una nueva visita'}
          </p>
        </div>
      )}

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
                {/* Información Básica */}
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

                {/* Inspector & Documentos */}
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

              {/* Observaciones y Hallazgos */}
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
                    setViewingVisit(undefined);
                    handleEditVisit(viewingVisit);
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
      )}
      {showForm && (
        <SutranVisitForm
          visit={editingVisit}
          onSave={handleSaveVisit}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}