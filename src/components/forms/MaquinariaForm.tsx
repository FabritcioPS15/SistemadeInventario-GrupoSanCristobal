import { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full h-[95vh] sm:h-auto sm:max-w-4xl sm:max-h-[90vh] rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 rounded-xl p-2.5">
              <Plus size={24} className="text-slate-800" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 uppercase">
                {editingMaquinaria ? 'Editar Maquinaria' : 'Nueva Maquinaria'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">
                {editingMaquinaria ? 'Modifica la información de la maquinaria' : 'Completa los datos para registrar un equipo'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
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
          </div>

          <div className="sticky bottom-0 bg-gray-50 border-t p-4 sm:p-6 flex flex-col gap-4 z-10">
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm font-medium">{errors.submit}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row-reverse gap-3">
              {canEdit() && (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-8 py-3 bg-slate-800 text-white text-[10px] font-bold rounded-lg hover:bg-slate-900 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save size={16} />
                  )}
                  {editingMaquinaria ? 'Actualizar Registro' : 'Guardar Maquinaria'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-200 text-slate-600 rounded-lg hover:bg-gray-100 transition-all font-bold text-[10px] uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
