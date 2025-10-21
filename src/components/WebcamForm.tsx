import { useState, useEffect } from 'react';
import { X, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WebcamFormProps {
  editWebcam?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function WebcamForm({ editWebcam, onClose, onSave }: WebcamFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    sede: '',
    area: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    resolucion: '',
    tipo_conexion: '',
    interfaz: '',
    compatibilidad: '',
    sistema_operativo: '',
    software_incluido: '',
    caracteristicas: '',
    estado_fisico: '',
    accesorios: '',
    notas: ''
  });

  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchLocations();
    if (editWebcam) {
      setFormData({
        code: editWebcam.code || '',
        sede: editWebcam.location_id || '',
        area: editWebcam.area || '',
        marca: editWebcam.brand || '',
        modelo: editWebcam.model || '',
        numero_serie: editWebcam.serial_number || '',
        resolucion: editWebcam.resolution || '',
        tipo_conexion: editWebcam.connection_type || '',
        interfaz: editWebcam.interface || '',
        compatibilidad: editWebcam.compatibility || '',
        sistema_operativo: editWebcam.operating_system || '',
        software_incluido: editWebcam.included_software || '',
        caracteristicas: editWebcam.features || '',
        estado_fisico: editWebcam.physical_condition || '',
        accesorios: editWebcam.accessories || '',
        notas: editWebcam.notes || ''
      });
    } else {
      generateRandomCode();
    }
  }, [editWebcam]);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (data) setLocations(data);
  };

  const generateRandomCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setFormData(prev => ({ ...prev, code }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        code: formData.code,
        location_id: formData.sede,
        area: formData.area,
        brand: formData.marca,
        model: formData.modelo,
        serial_number: formData.numero_serie,
        resolution: formData.resolucion,
        connection_type: formData.tipo_conexion,
        interface: formData.interfaz,
        compatibility: formData.compatibilidad,
        operating_system: formData.sistema_operativo,
        included_software: formData.software_incluido,
        features: formData.caracteristicas,
        physical_condition: formData.estado_fisico,
        accessories: formData.accesorios,
        notes: formData.notas,
        status: 'active',
        asset_type_id: await getAssetTypeId('Cámara')
      };

      if (editWebcam) {
        const { error } = await supabase
          .from('assets')
          .update(dataToSave)
          .eq('id', editWebcam.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assets')
          .insert([dataToSave]);
        
        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving webcam:', error);
      alert('Error al guardar la cámara web');
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
    return data?.id;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="text-green-600" size={24} />
            <h2 className="text-lg font-semibold text-gray-800">
              {editWebcam ? 'Editar Cámara Web' : 'Nueva Cámara Web'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Generar
                </button>
              </div>
            </div>

            {/* Sede */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sede *
              </label>
              <select
                value={formData.sede}
                onChange={(e) => setFormData(prev => ({ ...prev, sede: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar sede</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Área */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Área
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Sala de reuniones, Oficina"
              />
            </div>

            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca *
              </label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Logitech, Microsoft, Creative"
                required
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo *
              </label>
              <input
                type="text"
                value={formData.modelo}
                onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: C920, LifeCam Studio"
                required
              />
            </div>

            {/* Número de Serie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Serie
              </label>
              <input
                type="text"
                value={formData.numero_serie}
                onChange={(e) => setFormData(prev => ({ ...prev, numero_serie: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Resolución */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolución
              </label>
              <select
                value={formData.resolucion}
                onChange={(e) => setFormData(prev => ({ ...prev, resolucion: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar resolución</option>
                <option value="720p">720p HD</option>
                <option value="1080p">1080p Full HD</option>
                <option value="4K">4K Ultra HD</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Tipo de Conexión */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Conexión
              </label>
              <select
                value={formData.tipo_conexion}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo_conexion: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar tipo</option>
                <option value="USB">USB</option>
                <option value="USB-C">USB-C</option>
                <option value="Inalámbrica">Inalámbrica</option>
                <option value="Bluetooth">Bluetooth</option>
                <option value="WiFi">WiFi</option>
              </select>
            </div>

            {/* Interfaz */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interfaz
              </label>
              <select
                value={formData.interfaz}
                onChange={(e) => setFormData(prev => ({ ...prev, interfaz: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar interfaz</option>
                <option value="USB 2.0">USB 2.0</option>
                <option value="USB 3.0">USB 3.0</option>
                <option value="USB 3.1">USB 3.1</option>
                <option value="USB-C">USB-C</option>
                <option value="Thunderbolt">Thunderbolt</option>
              </select>
            </div>

            {/* Compatibilidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compatibilidad
              </label>
              <select
                value={formData.compatibilidad}
                onChange={(e) => setFormData(prev => ({ ...prev, compatibilidad: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar compatibilidad</option>
                <option value="Windows">Windows</option>
                <option value="macOS">macOS</option>
                <option value="Linux">Linux</option>
                <option value="Multiplataforma">Multiplataforma</option>
                <option value="Android">Android</option>
                <option value="iOS">iOS</option>
              </select>
            </div>

            {/* Sistema Operativo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sistema Operativo
              </label>
              <input
                type="text"
                value={formData.sistema_operativo}
                onChange={(e) => setFormData(prev => ({ ...prev, sistema_operativo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Windows 10, macOS 12"
              />
            </div>

            {/* Software Incluido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Software Incluido
              </label>
              <input
                type="text"
                value={formData.software_incluido}
                onChange={(e) => setFormData(prev => ({ ...prev, software_incluido: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Logitech Capture, Microsoft Camera"
              />
            </div>

            {/* Características */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Características
              </label>
              <input
                type="text"
                value={formData.caracteristicas}
                onChange={(e) => setFormData(prev => ({ ...prev, caracteristicas: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Autofocus, Zoom digital, Micrófono"
              />
            </div>

            {/* Estado Físico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado Físico
              </label>
              <select
                value={formData.estado_fisico}
                onChange={(e) => setFormData(prev => ({ ...prev, estado_fisico: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar estado</option>
                <option value="Excelente">Excelente</option>
                <option value="Bueno">Bueno</option>
                <option value="Regular">Regular</option>
                <option value="Malo">Malo</option>
                <option value="Dañado">Dañado</option>
              </select>
            </div>

            {/* Accesorios */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accesorios
              </label>
              <input
                type="text"
                value={formData.accesorios}
                onChange={(e) => setFormData(prev => ({ ...prev, accesorios: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Cable USB, Soporte, Funda protectora"
              />
            </div>

            {/* Notas */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Información adicional..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : editWebcam ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


