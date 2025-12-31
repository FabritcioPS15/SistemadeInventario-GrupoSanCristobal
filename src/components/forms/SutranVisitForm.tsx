import { useState, useEffect } from 'react';
import { Calendar, User, MapPin, FileText, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SutranVisit, Location } from '../../lib/supabase';

interface SutranVisitFormProps {
  visit?: SutranVisit;
  onSave: () => void;
  onClose: () => void;
}

export default function SutranVisitForm({ visit, onSave, onClose }: SutranVisitFormProps) {
  const [formData, setFormData] = useState({
    visit_date: '',
    inspector_name: '',
    inspector_email: '',
    inspector_phone: '',
    location_id: '',
    location_name: '',
    visit_type: 'routine' as const,
    status: 'pending' as const,
    observations: '',
    findings: '',
    recommendations: '',
    documents: [] as string[]
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDocument, setNewDocument] = useState('');

  useEffect(() => {
    fetchLocations();
    if (visit) {
      setFormData({
        visit_date: visit.visit_date,
        inspector_name: visit.inspector_name,
        inspector_email: visit.inspector_email || '',
        inspector_phone: visit.inspector_phone || '',
        location_id: visit.location_id || '',
        location_name: visit.location_name,
        visit_type: visit.visit_type,
        status: visit.status,
        observations: visit.observations || '',
        findings: visit.findings || '',
        recommendations: visit.recommendations || '',
        documents: visit.documents || []
      });
    } else {
      // Resetear formulario para nueva visita
      setFormData({
        visit_date: '',
        inspector_name: '',
        inspector_email: '',
        inspector_phone: '',
        location_id: '',
        location_name: '',
        visit_type: 'programada',
        status: 'pending',
        observations: '',
        findings: '',
        recommendations: '',
        documents: []
      });
    }
  }, [visit]);

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const visitData = {
        ...formData,
        documents: formData.documents,
        // Convertir cadena vacía a null para campos UUID
        location_id: formData.location_id || null
      };

      console.log('💾 Guardando visita:', { visit, visitData });

      if (visit) {
        console.log('✏️ Actualizando visita existente:', visit.id);
        const { data, error } = await supabase
          .from('sutran_visits')
          .update(visitData)
          .eq('id', visit.id)
          .select('*');
        
        console.log('📋 Resultado de actualización:', { data, error });
        
        if (error) {
          console.error('❌ Error al actualizar visita:', error);
          throw error;
        }
        
        console.log('✅ Visita actualizada correctamente');
      } else {
        console.log('➕ Creando nueva visita');
        const { data, error } = await supabase
          .from('sutran_visits')
          .insert([visitData])
          .select('*');
        
        console.log('📋 Resultado de inserción:', { data, error });
        
        if (error) {
          console.error('❌ Error al crear visita:', error);
          throw error;
        }
        
        console.log('✅ Visita creada correctamente');
      }

      onSave();
    } catch (error: any) {
      console.error('❌ Error inesperado al guardar visita:', error);
      
      let errorMessage = 'Error al guardar la visita';
      if (error?.message) {
        errorMessage += `: ${error.message}`;
      }
      if (error?.code) {
        errorMessage += `\n\nCódigo: ${error.code}`;
      }
      if (error?.details) {
        errorMessage += `\nDetalles: ${error.details}`;
      }
      if (error?.hint) {
        errorMessage += `\nSugerencia: ${error.hint}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addDocument = () => {
    if (newDocument.trim()) {
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, newDocument.trim()]
      }));
      setNewDocument('');
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {visit ? 'Editar Visita' : 'Nueva Visita de Sutran'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-blue-600" />
                Información Básica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Visita *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.visit_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, visit_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="completed">Completada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Visita *
                  </label>
                  <select
                    required
                    value={formData.visit_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, visit_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="programada">Programada</option>
                    <option value="no_programada">No programada</option>
                    <option value="de_gabinete">De gabinete</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Información del Inspector */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User size={20} className="text-green-600" />
                Información del Inspector
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Inspector *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.inspector_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, inspector_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email del Inspector
                  </label>
                  <input
                    type="email"
                    value={formData.inspector_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, inspector_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="inspector@sutran.gob.pe"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono del Inspector
                  </label>
                  <input
                    type="tel"
                    value={formData.inspector_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, inspector_phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+51 999 999 999"
                  />
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-red-600" />
                Ubicación
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sede (Opcional)
                  </label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => {
                      const selectedLocation = locations.find(loc => loc.id === e.target.value);
                      setFormData(prev => ({ 
                        ...prev, 
                        location_id: e.target.value || '',
                        location_name: selectedLocation?.name || ''
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin sede específica</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de Ubicación *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Oficina Principal - Lima"
                  />
                </div>
              </div>
            </div>

            {/* Observaciones y Hallazgos */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-purple-600" />
                Observaciones y Hallazgos
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={formData.observations}
                    onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe las observaciones generales de la visita..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hallazgos
                  </label>
                  <textarea
                    value={formData.findings}
                    onChange={(e) => setFormData(prev => ({ ...prev, findings: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe los hallazgos específicos encontrados..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recomendaciones
                  </label>
                  <textarea
                    value={formData.recommendations}
                    onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe las recomendaciones y acciones a tomar..."
                  />
                </div>
              </div>
            </div>

            {/* Documentos */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-orange-600" />
                Documentos
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDocument}
                    onChange={(e) => setNewDocument(e.target.value)}
                    placeholder="Nombre del documento..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addDocument}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Agregar
                  </button>
                </div>

                {formData.documents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Documentos adjuntos:</h4>
                    {formData.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                        <span className="text-sm text-gray-700">{doc}</span>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Guardando...' : (visit ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
