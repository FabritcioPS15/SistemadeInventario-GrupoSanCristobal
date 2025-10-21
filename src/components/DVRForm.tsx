import { useEffect, useState } from 'react';
import { X, HardDrive } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DVRFormProps {
  editDVR?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function DVRForm({ editDVR, onClose, onSave }: DVRFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    sede: '',
    area: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    canales: '',
    resolucion_max: '',
    almacenamiento_total: '',
    discos_instalados: '',
    ip: '',
    puerto: '',
    usuario: '',
    password: '',
    url_acceso: '',
    estado_fisico: '',
    notas: ''
  });

  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchLocations();
    if (editDVR) {
      setFormData({
        code: editDVR.code || '',
        sede: editDVR.location_id || '',
        area: editDVR.area || '',
        marca: editDVR.brand || '',
        modelo: editDVR.model || '',
        numero_serie: editDVR.serial_number || '',
        canales: editDVR.channels || '',
        resolucion_max: editDVR.max_resolution || '',
        almacenamiento_total: editDVR.total_storage || '',
        discos_instalados: editDVR.installed_disks || '',
        ip: editDVR.ip_address || '',
        puerto: editDVR.port || '',
        usuario: editDVR.username || '',
        password: editDVR.password || '',
        url_acceso: editDVR.url || '',
        estado_fisico: editDVR.physical_condition || '',
        notas: editDVR.notes || ''
      });
    } else {
      generateRandomCode();
    }
  }, [editDVR]);

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
      const dataToSave: any = {
        code: formData.code,
        location_id: formData.sede,
        area: formData.area,
        brand: formData.marca,
        model: formData.modelo,
        serial_number: formData.numero_serie,
        channels: formData.canales,
        max_resolution: formData.resolucion_max,
        total_storage: formData.almacenamiento_total,
        installed_disks: formData.discos_instalados,
        ip_address: formData.ip,
        port: formData.puerto,
        username: formData.usuario,
        password: formData.password,
        url: formData.url_acceso,
        physical_condition: formData.estado_fisico,
        notes: formData.notas,
        status: 'active',
        asset_type_id: await getAssetTypeId('DVR')
      };

      if (editDVR) {
        const { error } = await supabase.from('assets').update(dataToSave).eq('id', editDVR.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('assets').insert([dataToSave]);
        if (error) throw error;
      }
      onSave();
    } catch (error) {
      console.error('Error saving DVR:', error);
      alert('Error al guardar el DVR');
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
            <HardDrive className="text-orange-600" size={24} />
            <h2 className="text-lg font-semibold text-gray-800">
              {editDVR ? 'Editar DVR' : 'Nuevo DVR'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Código *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button type="button" onClick={generateRandomCode} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Generar
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sede *</label>
              <select
                value={formData.sede}
                onChange={(e) => setFormData(prev => ({ ...prev, sede: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar sede</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Área</label>
              <input type="text" value={formData.area} onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marca *</label>
              <input type="text" value={formData.marca} onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modelo *</label>
              <input type="text" value={formData.modelo} onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Número de Serie</label>
              <input type="text" value={formData.numero_serie} onChange={(e) => setFormData(prev => ({ ...prev, numero_serie: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Canales</label>
              <input type="number" min={0} value={formData.canales} onChange={(e) => setFormData(prev => ({ ...prev, canales: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resolución Máxima</label>
              <select value={formData.resolucion_max} onChange={(e) => setFormData(prev => ({ ...prev, resolucion_max: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="4MP">4MP</option>
                <option value="5MP">5MP</option>
                <option value="4K">4K</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Almacenamiento Total (GB)</label>
              <input type="number" min={0} value={formData.almacenamiento_total} onChange={(e) => setFormData(prev => ({ ...prev, almacenamiento_total: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discos Instalados</label>
              <input type="number" min={0} value={formData.discos_instalados} onChange={(e) => setFormData(prev => ({ ...prev, discos_instalados: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text sm font-medium text-gray-700 mb-2">IP</label>
              <input type="text" value={formData.ip} onChange={(e) => setFormData(prev => ({ ...prev, ip: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 192.168.1.10" />
            </div>

            <div>
              <label className="block text sm font-medium text-gray-700 mb-2">Puerto</label>
              <input type="text" value={formData.puerto} onChange={(e) => setFormData(prev => ({ ...prev, puerto: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 8000" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
              <input type="text" value={formData.usuario} onChange={(e) => setFormData(prev => ({ ...prev, usuario: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <input type="text" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">URL de Acceso</label>
              <input type="text" value={formData.url_acceso} onChange={(e) => setFormData(prev => ({ ...prev, url_acceso: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="http://ip:puerto o https://dominio" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado Físico</label>
              <select value={formData.estado_fisico} onChange={(e) => setFormData(prev => ({ ...prev, estado_fisico: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar estado</option>
                <option value="Excelente">Excelente</option>
                <option value="Bueno">Bueno</option>
                <option value="Regular">Regular</option>
                <option value="Malo">Malo</option>
                <option value="Dañado">Dañado</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
              <textarea rows={3} value={formData.notas} onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Información adicional..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button type="button" onClick={onClose} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors">{loading ? 'Guardando...' : editDVR ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}



