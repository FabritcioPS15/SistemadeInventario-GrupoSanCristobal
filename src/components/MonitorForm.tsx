import { useEffect, useState } from 'react';
import { X, Monitor } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MonitorFormProps {
  editMonitor?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function MonitorForm({ editMonitor, onClose, onSave }: MonitorFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    sede: '',
    area: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    tamano_pulg: '',
    resolucion: '',
    tipo_panel: '',
    tasa_refresco: '',
    puertos: '',
    estado_fisico: '',
    notas: ''
  });

  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchLocations();
    if (editMonitor) {
      setFormData({
        code: editMonitor.code || '',
        sede: editMonitor.location_id || '',
        area: editMonitor.area || '',
        marca: editMonitor.brand || '',
        modelo: editMonitor.model || '',
        numero_serie: editMonitor.serial_number || '',
        tamano_pulg: editMonitor.size_inches || '',
        resolucion: editMonitor.resolution || '',
        tipo_panel: editMonitor.panel_type || '',
        tasa_refresco: editMonitor.refresh_rate || '',
        puertos: editMonitor.ports || '',
        estado_fisico: editMonitor.physical_condition || '',
        notas: editMonitor.notes || ''
      });
    } else {
      generateRandomCode();
    }
  }, [editMonitor]);

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
        size_inches: formData.tamano_pulg,
        resolution: formData.resolucion,
        panel_type: formData.tipo_panel,
        refresh_rate: formData.tasa_refresco,
        ports: formData.puertos,
        physical_condition: formData.estado_fisico,
        notes: formData.notas,
        status: 'active',
        asset_type_id: await getAssetTypeId('Monitor')
      };

      if (editMonitor) {
        const { error } = await supabase.from('assets').update(dataToSave).eq('id', editMonitor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('assets').insert([dataToSave]);
        if (error) throw error;
      }
      onSave();
    } catch (error) {
      console.error('Error saving monitor:', error);
      alert('Error al guardar el monitor');
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
            <Monitor className="text-indigo-600" size={24} />
            <h2 className="text-lg font-semibold text-gray-800">{editMonitor ? 'Editar Monitor' : 'Nuevo Monitor'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Código *</label>
              <div className="flex gap-2">
                <input type="text" value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                <button type="button" onClick={generateRandomCode} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Generar</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sede *</label>
              <select value={formData.sede} onChange={(e) => setFormData(prev => ({ ...prev, sede: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Seleccionar sede</option>
                {locations.map(location => (<option key={location.id} value={location.id}>{location.name}</option>))}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Tamaño (pulgadas)</label>
              <input type="number" min={0} value={formData.tamano_pulg} onChange={(e) => setFormData(prev => ({ ...prev, tamano_pulg: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 24" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resolución</label>
              <select value={formData.resolucion} onChange={(e) => setFormData(prev => ({ ...prev, resolucion: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar</option>
                <option value="HD">HD (1366x768)</option>
                <option value="FHD">FHD (1920x1080)</option>
                <option value="QHD">QHD (2560x1440)</option>
                <option value="4K">4K (3840x2160)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Panel</label>
              <select value={formData.tipo_panel} onChange={(e) => setFormData(prev => ({ ...prev, tipo_panel: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar</option>
                <option value="TN">TN</option>
                <option value="VA">VA</option>
                <option value="IPS">IPS</option>
                <option value="OLED">OLED</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tasa de Refresco (Hz)</label>
              <input type="number" min={0} value={formData.tasa_refresco} onChange={(e) => setFormData(prev => ({ ...prev, tasa_refresco: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="60, 75, 144..." />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Puertos</label>
              <input type="text" value={formData.puertos} onChange={(e) => setFormData(prev => ({ ...prev, puertos: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="HDMI, DisplayPort, VGA, USB" />
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
            <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">{loading ? 'Guardando...' : editMonitor ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}



