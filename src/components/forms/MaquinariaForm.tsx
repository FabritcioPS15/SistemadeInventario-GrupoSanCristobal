import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type MaquinariaFormProps = {
  onClose: () => void;
  onSave: () => void;
  editingMaquinaria?: any;
};

type Location = {
  id: string;
  name: string;
  [key: string]: any;
};

export default function MaquinariaForm({ onClose, onSave, editingMaquinaria }: MaquinariaFormProps) {
  const { canEdit } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // Campos básicos
    item: '',
    descripcion: '',
    unidad_medida: '',
    cantidad: 1,
    condicion: 'bueno',
    tipo_activo: 'Maquinaria',
    ubicacion_activo: '',
    color: '',
    serie: '',
    gama: '',
    modelo: '',
    marca: '',
    fecha_adquisicion: '',
    valor_estimado: '',
    estado_uso: 'activo',
    
    // Campos adicionales del sistema
    status: 'active',
    notes: '',
    location_id: '',
    created_at: '',
    updated_at: '',
  });

  useEffect(() => {
    fetchLocations();
    if (editingMaquinaria) {
      setFormData({
        ...formData,
        ...editingMaquinaria,
        fecha_adquisicion: editingMaquinaria.fecha_adquisicion || '',
        valor_estimado: editingMaquinaria.valor_estimado || '',
      });
    }
  }, [editingMaquinaria]);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (data) setLocations(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const payload = {
        ...formData,
        asset_type_id: await getAssetTypeId('Maquinaria'),
        created_at: editingMaquinaria ? formData.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (editingMaquinaria) {
        const { error } = await supabase
          .from('assets')
          .update(payload)
          .eq('id', editingMaquinaria.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assets')
          .insert([payload]);
        if (error) throw error;
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving maquinaria:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const getAssetTypeId = async (typeName: string) => {
    const { data } = await supabase
      .from('asset_types')
      .select('id')
      .eq('name', typeName)
      .single();
    return data?.id || '';
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-8 py-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Plus size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {editingMaquinaria ? 'Editar Maquinaria' : 'Nueva Maquinaria'}
                </h2>
                <p className="text-gray-300 text-sm mt-1">
                  {editingMaquinaria ? 'Modifica la información de la maquinaria' : 'Completa los datos para registrar una nueva maquinaria'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* ITEM */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ITEM <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.item}
                onChange={(e) => handleChange('item', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Código del item"
                required
              />
              {errors.item && <p className="text-red-500 text-xs mt-1">{errors.item}</p>}
            </div>

            {/* DESCRIPCIÓN */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DESCRIPCIÓN <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                rows={3}
                placeholder="Descripción detallada de la maquinaria"
                required
              />
              {errors.descripcion && <p className="text-red-500 text-xs mt-1">{errors.descripcion}</p>}
            </div>

            {/* UNIDAD DE MEDIDA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                UNIDAD DE MEDIDA <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.unidad_medida}
                onChange={(e) => handleChange('unidad_medida', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar...</option>
                <option value="unidad">Unidad</option>
                <option value="par">Par</option>
                <option value="juego">Juego</option>
                <option value="conjunto">Conjunto</option>
                <option value="kit">Kit</option>
                <option value="metro">Metro</option>
                <option value="kilogramo">Kilogramo</option>
                <option value="litro">Litro</option>
              </select>
              {errors.unidad_medida && <p className="text-red-500 text-xs mt-1">{errors.unidad_medida}</p>}
            </div>

            {/* CANTIDAD */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CANT. <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.cantidad}
                onChange={(e) => handleChange('cantidad', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                required
              />
              {errors.cantidad && <p className="text-red-500 text-xs mt-1">{errors.cantidad}</p>}
            </div>

            {/* CONDICIÓN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CONDICIÓN <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.condicion}
                onChange={(e) => handleChange('condicion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar...</option>
                <option value="excelente">Excelente</option>
                <option value="bueno">Bueno</option>
                <option value="regular">Regular</option>
                <option value="malo">Malo</option>
                <option value="danado">Dañado</option>
              </select>
              {errors.condicion && <p className="text-red-500 text-xs mt-1">{errors.condicion}</p>}
            </div>

            {/* UBICACIÓN DEL ACTIVO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                UBICACIÓN DEL ACTIVO <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.ubicacion_activo}
                onChange={(e) => handleChange('ubicacion_activo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar...</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.name}>
                    {location.name}
                  </option>
                ))}
              </select>
              {errors.ubicacion_activo && <p className="text-red-500 text-xs mt-1">{errors.ubicacion_activo}</p>}
            </div>

            {/* COLOR */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                COLOR
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Color de la maquinaria"
              />
            </div>

            {/* SERIE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SERIE <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.serie}
                onChange={(e) => handleChange('serie', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Número de serie"
                required
              />
              {errors.serie && <p className="text-red-500 text-xs mt-1">{errors.serie}</p>}
            </div>

            {/* GAMA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GAMA
              </label>
              <input
                type="text"
                value={formData.gama}
                onChange={(e) => handleChange('gama', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Gama o línea"
              />
            </div>

            {/* MODELO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MODELO <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.modelo}
                onChange={(e) => handleChange('modelo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Modelo de la maquinaria"
                required
              />
              {errors.modelo && <p className="text-red-500 text-xs mt-1">{errors.modelo}</p>}
            </div>

            {/* MARCA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MARCA <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => handleChange('marca', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Marca del fabricante"
                required
              />
              {errors.marca && <p className="text-red-500 text-xs mt-1">{errors.marca}</p>}
            </div>

            {/* FECHA ADQUISICIÓN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                FECHA ADQUISICIÓN
              </label>
              <input
                type="date"
                value={formData.fecha_adquisicion}
                onChange={(e) => handleChange('fecha_adquisicion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>

            {/* VALOR ESTIMADO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                VALOR ESTIMADO
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_estimado}
                onChange={(e) => handleChange('valor_estimado', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            {/* ESTADO USO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ESTADO USO <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.estado_uso}
                onChange={(e) => handleChange('estado_uso', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar...</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="en_mantenimiento">En Mantenimiento</option>
                <option value="en_reparacion">En Reparación</option>
                <option value="dado_de_baja">Dado de Baja</option>
              </select>
              {errors.estado_uso && <p className="text-red-500 text-xs mt-1">{errors.estado_uso}</p>}
            </div>

            {/* NOTAS */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NOTAS ADICIONALES
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                rows={3}
                placeholder="Observaciones adicionales sobre la maquinaria"
              />
            </div>
          </div>

          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            {canEdit() && (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={16} />
                )}
                {editingMaquinaria ? 'Actualizar' : 'Guardar'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
