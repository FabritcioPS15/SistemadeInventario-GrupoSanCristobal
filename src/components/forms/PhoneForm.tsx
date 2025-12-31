import { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PhoneFormProps {
  editPhone?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function PhoneForm({ editPhone, onClose, onSave }: PhoneFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    sede: '',
    area: '',
    marca: '',
    modelo: '',
    numero_serie: '',
    imei: '',
    numero_telefono: '',
    operador: '',
    plan_datos: '',
    estado_fisico: '',
    sistema_operativo: '',
    version_so: '',
    almacenamiento: '',
    ram: '',
    bateria_estado: '',
    accesorios: '',
    notas: ''
  });

  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchLocations();
    if (editPhone) {
      setFormData({
        code: editPhone.code || '',
        sede: editPhone.location_id || '',
        area: editPhone.area || '',
        marca: editPhone.brand || '',
        modelo: editPhone.model || '',
        numero_serie: editPhone.serial_number || '',
        imei: editPhone.imei || '',
        numero_telefono: editPhone.phone_number || '',
        operador: editPhone.operator || '',
        plan_datos: editPhone.data_plan || '',
        estado_fisico: editPhone.physical_condition || '',
        sistema_operativo: editPhone.operating_system || '',
        version_so: editPhone.os_version || '',
        almacenamiento: editPhone.storage || '',
        ram: editPhone.ram || '',
        bateria_estado: editPhone.battery_condition || '',
        accesorios: editPhone.accessories || '',
        notas: editPhone.notes || ''
      });
    } else {
      generateRandomCode();
    }
  }, [editPhone]);

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
        imei: formData.imei,
        phone_number: formData.numero_telefono,
        operator: formData.operador,
        data_plan: formData.plan_datos,
        physical_condition: formData.estado_fisico,
        operating_system: formData.sistema_operativo,
        os_version: formData.version_so,
        storage: formData.almacenamiento,
        ram: formData.ram,
        battery_condition: formData.bateria_estado,
        accessories: formData.accesorios,
        notes: formData.notas,
        status: 'active',
        asset_type_id: await getAssetTypeId('Celular')
      };

      if (editPhone) {
        const { error } = await supabase
          .from('assets')
          .update(dataToSave)
          .eq('id', editPhone.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assets')
          .insert([dataToSave]);
        
        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving phone:', error);
      alert('Error al guardar el celular');
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
            <Smartphone className="text-blue-600" size={24} />
            <h2 className="text-lg font-semibold text-gray-800">
              {editPhone ? 'Editar Celular' : 'Nuevo Celular'}
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
                placeholder="Ej: Administración, Ventas"
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
                placeholder="Ej: Samsung, iPhone, Xiaomi"
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
                placeholder="Ej: Galaxy S21, iPhone 13"
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

            {/* IMEI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IMEI *
              </label>
              <input
                type="text"
                value={formData.imei}
                onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="15 dígitos"
                required
              />
            </div>

            {/* Número de Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Teléfono
              </label>
              <input
                type="text"
                value={formData.numero_telefono}
                onChange={(e) => setFormData(prev => ({ ...prev, numero_telefono: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+51 999 999 999"
              />
            </div>

            {/* Operador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operador
              </label>
              <select
                value={formData.operador}
                onChange={(e) => setFormData(prev => ({ ...prev, operador: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar operador</option>
                <option value="Movistar">Movistar</option>
                <option value="Claro">Claro</option>
                <option value="Entel">Entel</option>
                <option value="Bitel">Bitel</option>
                <option value="Virgin Mobile">Virgin Mobile</option>
              </select>
            </div>

            {/* Plan de Datos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan de Datos
              </label>
              <input
                type="text"
                value={formData.plan_datos}
                onChange={(e) => setFormData(prev => ({ ...prev, plan_datos: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 5GB, Ilimitado"
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

            {/* Sistema Operativo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sistema Operativo
              </label>
              <select
                value={formData.sistema_operativo}
                onChange={(e) => setFormData(prev => ({ ...prev, sistema_operativo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar SO</option>
                <option value="Android">Android</option>
                <option value="iOS">iOS</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {/* Versión SO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Versión SO
              </label>
              <input
                type="text"
                value={formData.version_so}
                onChange={(e) => setFormData(prev => ({ ...prev, version_so: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Android 12, iOS 16"
              />
            </div>

            {/* Almacenamiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Almacenamiento
              </label>
              <input
                type="text"
                value={formData.almacenamiento}
                onChange={(e) => setFormData(prev => ({ ...prev, almacenamiento: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 128GB, 256GB"
              />
            </div>

            {/* RAM */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RAM
              </label>
              <input
                type="text"
                value={formData.ram}
                onChange={(e) => setFormData(prev => ({ ...prev, ram: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 6GB, 8GB"
              />
            </div>

            {/* Estado de Batería */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado de Batería
              </label>
              <select
                value={formData.bateria_estado}
                onChange={(e) => setFormData(prev => ({ ...prev, bateria_estado: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar estado</option>
                <option value="Excelente">Excelente</option>
                <option value="Bueno">Bueno</option>
                <option value="Regular">Regular</option>
                <option value="Malo">Malo</option>
                <option value="Requiere cambio">Requiere cambio</option>
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
                placeholder="Ej: Cargador, Audífonos, Funda"
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : editPhone ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


