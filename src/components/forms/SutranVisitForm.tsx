import { useState, useEffect } from 'react';
import { Calendar, User, MapPin, FileText, X } from 'lucide-react';
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
    visit_type: 'programada' as SutranVisit['visit_type'],
    status: 'pending' as SutranVisit['status'],
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


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {visit ? 'Editar Visita' : 'Nueva Visita de Sutran'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Gestión de fiscalizaciones y visitas</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información Básica */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" />
              Información Básica
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Fecha de Visita *
                </label>
                <input
                  type="date"
                  required
                  value={formData.visit_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, visit_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Estado *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Tipo de Visita *
                </label>
                <select
                  required
                  value={formData.visit_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, visit_type: e.target.value as any }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
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
            <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={16} className="text-green-600" />
              Información del Inspector
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Nombre del Inspector *
                </label>
                <input
                  type="text"
                  required
                  value={formData.inspector_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, inspector_name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Email del Inspector
                </label>
                <input
                  type="email"
                  value={formData.inspector_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, inspector_email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="inspector@sutran.gob.pe"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Teléfono del Inspector
                </label>
                <input
                  type="tel"
                  value={formData.inspector_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, inspector_phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="+51 999 999 999"
                />
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-slate-600" />
              Ubicación
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
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
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Nombre de Ubicación *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Ej: Oficina Principal - Lima"
                />
              </div>
            </div>
          </div>

          {/* Observaciones y Hallazgos */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={16} className="text-purple-600" />
              Observaciones y Hallazgos
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formData.observations}
                  onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Describe las observaciones generales de la visita..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Hallazgos
                </label>
                <textarea
                  value={formData.findings}
                  onChange={(e) => setFormData(prev => ({ ...prev, findings: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Describe los hallazgos específicos encontrados..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Recomendaciones
                </label>
                <textarea
                  value={formData.recommendations}
                  onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Describe las recomendaciones y acciones a tomar..."
                />
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={16} className="text-orange-600" />
              Documentos
            </h3>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDocument}
                  onChange={(e) => setNewDocument(e.target.value)}
                  placeholder="Nombre del documento..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={addDocument}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition-colors uppercase tracking-wider"
                >
                  Agregar
                </button>
              </div>

              {formData.documents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase">Documentos adjuntos:</h4>
                  {formData.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                      <span className="text-sm text-gray-700">{doc}</span>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-rose-500 hover:text-rose-700 transition-colors"
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
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm order-2 sm:order-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 sm:py-2.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg hover:bg-slate-900 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest order-1 sm:order-2 flex-1 sm:flex-none"
            >
              {loading ? 'Guardando...' : (visit ? 'Actualizar' : 'Crear Registro')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
