import { useState, useEffect } from 'react';
import { Building2, Calendar, MapPin, User, Clock, Search, Plus, Edit, Trash2, Eye, Filter, X, Copy, Check, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'cancelled': return 'Cancelada';
      default: return 'Desconocido';
    }
  };

  const getVisitTypeIcon = (type: string) => {
    switch (type) {
      case 'programada': return <CheckCircle size={16} className="text-green-600" />;
      case 'no_programada': return <AlertTriangle size={16} className="text-orange-600" />;
      case 'de_gabinete': return <FileText size={16} className="text-blue-600" />;
      default: return <FileText size={16} className="text-gray-600" />;
    }
  };

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'programada': return 'Programada';
      case 'no_programada': return 'No programada';
      case 'de_gabinete': return 'De gabinete';
      default: return 'Desconocido';
    }
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
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 border border-orange-200 rounded-lg p-2">
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Visitas de Sutran</h1>
            <p className="text-gray-600">Gestión y seguimiento de inspecciones</p>
          </div>
        </div>

        {/* Dashboard de Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Visitas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Building2 size={24} className="text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock size={24} className="text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recientes</p>
                <p className="text-2xl font-bold text-blue-600">{stats.recentlyAdded}</p>
              </div>
              <Calendar size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Filtros Avanzados */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filtros Avanzados</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por inspector, ubicación, observaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los Estados</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>

            <select
              value={visitTypeFilter}
              onChange={(e) => setVisitTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los Tipos</option>
              <option value="programada">Programada</option>
              <option value="no_programada">No programada</option>
              <option value="de_gabinete">De gabinete</option>
            </select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Filtros activos:</span>
                {searchTerm && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    Búsqueda: "{searchTerm}"
                  </span>
                )}
                {statusFilter && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                    Estado: {getStatusLabel(statusFilter)}
                  </span>
                )}
                {visitTypeFilter && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                    Tipo: {getVisitTypeLabel(visitTypeFilter)}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X size={16} />
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-between items-center mb-6">
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
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Nueva Visita
            </button>
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
            <div key={visit.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-gray-500" />
                      <span className="font-medium text-gray-900">{visit.visit_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={18} className="text-gray-500" />
                      <span className="text-gray-700">{visit.inspector_name}</span>
                      <button
                        onClick={() => copyToClipboard(visit.inspector_name, `inspector-${visit.id}`)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copiar inspector"
                      >
                        {copiedItems[`inspector-${visit.id}`] ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-gray-500" />
                      <span className="text-gray-700">{visit.location_name}</span>
                      <button
                        onClick={() => copyToClipboard(visit.location_name, `location-${visit.id}`)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copiar ubicación"
                      >
                        {copiedItems[`location-${visit.id}`] ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {getVisitTypeIcon(visit.visit_type)}
                      <span className="text-sm text-gray-600">{getVisitTypeLabel(visit.visit_type)}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(visit.status)}`}>
                      {getStatusLabel(visit.status)}
                    </span>
                  </div>

                  {visit.observations && (
                    <div className="mb-3">
                      <h3 className="font-medium text-gray-900 mb-1">Observaciones:</h3>
                      <p className="text-gray-600">{visit.observations}</p>
                    </div>
                  )}

                  {visit.findings && (
                    <div className="mb-3">
                      <h3 className="font-medium text-gray-900 mb-1">Hallazgos:</h3>
                      <p className="text-gray-600">{visit.findings}</p>
                    </div>
                  )}

                  {visit.documents && visit.documents.length > 0 && (
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900 mb-2">Documentos:</h4>
                      <div className="flex flex-wrap gap-2">
                        {visit.documents.map((doc, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleViewVisit(visit)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Ver detalles"
                  >
                    <Eye size={18} />
                  </button>
                  {canEdit() && (
                    <>
                      <button
                        onClick={() => handleEditVisit(visit)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteVisit(visit.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
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

      {/* Modal de Vista Detallada */}
      {viewingVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Detalles de la Visita</h2>
                <button
                  onClick={() => setViewingVisit(undefined)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información Básica */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-blue-600" />
                    Información Básica
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Fecha:</span>
                      <p className="text-gray-900">{viewingVisit.visit_date}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tipo:</span>
                      <div className="flex items-center gap-2">
                        {getVisitTypeIcon(viewingVisit.visit_type)}
                        <span className="text-gray-900">{getVisitTypeLabel(viewingVisit.visit_type)}</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Estado:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingVisit.status)}`}>
                        {getStatusLabel(viewingVisit.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Información del Inspector */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User size={20} className="text-green-600" />
                    Inspector
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Nombre:</span>
                      <p className="text-gray-900">{viewingVisit.inspector_name}</p>
                    </div>
                    {viewingVisit.inspector_email && (
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <p className="text-gray-900">{viewingVisit.inspector_email}</p>
                      </div>
                    )}
                    {viewingVisit.inspector_phone && (
                      <div>
                        <span className="font-medium text-gray-700">Teléfono:</span>
                        <p className="text-gray-900">{viewingVisit.inspector_phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ubicación */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin size={20} className="text-red-600" />
                    Ubicación
                  </h3>
                  <div>
                    <span className="font-medium text-gray-700">Lugar:</span>
                    <p className="text-gray-900">{viewingVisit.location_name}</p>
                  </div>
                </div>

                {/* Documentos */}
                {viewingVisit.documents && viewingVisit.documents.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText size={20} className="text-orange-600" />
                      Documentos
                    </h3>
                    <div className="space-y-2">
                      {viewingVisit.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                          <span className="text-sm text-gray-700">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Observaciones y Hallazgos */}
              <div className="mt-6 space-y-4">
                {viewingVisit.observations && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Observaciones</h3>
                    <p className="text-gray-700">{viewingVisit.observations}</p>
                  </div>
                )}

                {viewingVisit.findings && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Hallazgos</h3>
                    <p className="text-gray-700">{viewingVisit.findings}</p>
                  </div>
                )}

                {viewingVisit.recommendations && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Recomendaciones</h3>
                    <p className="text-gray-700">{viewingVisit.recommendations}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                {canEdit() && (
                  <button
                    onClick={() => {
                      setViewingVisit(undefined);
                      handleEditVisit(viewingVisit);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Editar Visita
                  </button>
                )}
                <button
                  onClick={() => setViewingVisit(undefined)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
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