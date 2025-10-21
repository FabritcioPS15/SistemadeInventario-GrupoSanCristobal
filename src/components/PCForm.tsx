import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase, Location } from '../lib/supabase';

type PCFormProps = {
  editPC?: any;
  onClose: () => void;
  onSave: () => void;
};

type PCFormData = {
  code: string;
  location_id: string;
  area: string;
  pc_laptop: 'pc' | 'laptop';
  placa: string;
  bios_mode: string;
  operating_system: string;
  ram: string;
  processor: string;
  ip_address: string;
  anydesk: string;
  brand: string;
  model: string;
  serial_number: string;
  notes: string;
};

export default function PCForm({ editPC, onClose, onSave }: PCFormProps) {
  const [formData, setFormData] = useState<PCFormData>({
    code: '',
    location_id: '',
    area: '',
    pc_laptop: 'pc',
    placa: '',
    bios_mode: '',
    operating_system: '',
    ram: '',
    processor: '',
    ip_address: '',
    anydesk: '',
    brand: '',
    model: '',
    serial_number: '',
    notes: ''
  });
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchLocations();
    generateRandomCode();
    
    if (editPC) {
      setFormData({
        code: editPC.code || '',
        location_id: editPC.location_id || '',
        area: editPC.area || '',
        pc_laptop: editPC.pc_laptop || 'pc',
        placa: editPC.placa || '',
        bios_mode: editPC.bios_mode || '',
        operating_system: editPC.operating_system || '',
        ram: editPC.ram || '',
        processor: editPC.processor || '',
        ip_address: editPC.ip_address || '',
        anydesk: editPC.anydesk || '',
        brand: editPC.brand || '',
        model: editPC.model || '',
        serial_number: editPC.serial_number || '',
        notes: editPC.notes || ''
      });
    }
  }, [editPC]);

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  const generateRandomCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setFormData(prev => ({ ...prev, code }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) newErrors.code = 'El código es requerido';
    if (!formData.location_id) newErrors.location_id = 'La sede es requerida';
    if (!formData.area.trim()) newErrors.area = 'El área es requerida';
    if (!formData.placa.trim()) newErrors.placa = 'La placa es requerida';
    if (!formData.bios_mode.trim()) newErrors.bios_mode = 'El modo de BIOS es requerido';
    if (!formData.operating_system.trim()) newErrors.operating_system = 'El sistema operativo es requerido';
    if (!formData.ram.trim()) newErrors.ram = 'La RAM es requerida';
    if (!formData.processor.trim()) newErrors.processor = 'El procesador es requerido';
    if (!formData.ip_address.trim()) newErrors.ip_address = 'La IP es requerida';
    if (!formData.anydesk.trim()) newErrors.anydesk = 'El AnyDesk es requerido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        asset_type_id: 'pc', // Asumiendo que existe este tipo en asset_types
        status: 'active',
        created_at: editPC ? editPC.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (editPC) {
        const { error } = await supabase
          .from('assets')
          .update(dataToSave)
          .eq('id', editPC.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assets')
          .insert([dataToSave]);
        
        if (error) throw error;
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving PC:', error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {editPC ? 'Editar PC/Laptop' : 'Nueva PC/Laptop'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Código Aleatorio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código Aleatorio *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.code ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Código de 6 dígitos"
                  maxLength={6}
                  readOnly
                />
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Generar
                </button>
              </div>
              {errors.code && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.code}
                </p>
              )}
            </div>

            {/* Sede */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sede *
              </label>
              <select
                name="location_id"
                value={formData.location_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.location_id ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar sede</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              {errors.location_id && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.location_id}
                </p>
              )}
            </div>

            {/* Área */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Área *
              </label>
              <input
                type="text"
                name="area"
                value={formData.area}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.area ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: Administración, Contabilidad, etc."
              />
              {errors.area && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.area}
                </p>
              )}
            </div>

            {/* PC/Laptop */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PC/Laptop *
              </label>
              <select
                name="pc_laptop"
                value={formData.pc_laptop}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pc">PC</option>
                <option value="laptop">Laptop</option>
              </select>
            </div>

            {/* Placa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placa *
              </label>
              <input
                type="text"
                name="placa"
                value={formData.placa}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.placa ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: ABC-123"
              />
              {errors.placa && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.placa}
                </p>
              )}
            </div>

            {/* Modo de BIOS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modo de BIOS *
              </label>
              <select
                name="bios_mode"
                value={formData.bios_mode}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.bios_mode ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar modo</option>
                <option value="legacy">Legacy</option>
                <option value="uefi">UEFI</option>
                <option value="mixed">Mixed</option>
              </select>
              {errors.bios_mode && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.bios_mode}
                </p>
              )}
            </div>

            {/* Sistema Operativo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sistema Operativo *
              </label>
              <input
                type="text"
                name="operating_system"
                value={formData.operating_system}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.operating_system ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: Windows 11 Pro, Ubuntu 22.04"
              />
              {errors.operating_system && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.operating_system}
                </p>
              )}
            </div>

            {/* RAM */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RAM *
              </label>
              <input
                type="text"
                name="ram"
                value={formData.ram}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.ram ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: 16GB DDR4"
              />
              {errors.ram && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.ram}
                </p>
              )}
            </div>

            {/* Procesador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Procesador *
              </label>
              <input
                type="text"
                name="processor"
                value={formData.processor}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.processor ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: Intel Core i7-12700K"
              />
              {errors.processor && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.processor}
                </p>
              )}
            </div>

            {/* IP Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección IP *
              </label>
              <input
                type="text"
                name="ip_address"
                value={formData.ip_address}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.ip_address ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: 192.168.1.100"
              />
              {errors.ip_address && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.ip_address}
                </p>
              )}
            </div>

            {/* AnyDesk */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AnyDesk *
              </label>
              <input
                type="text"
                name="anydesk"
                value={formData.anydesk}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.anydesk ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
                placeholder="Ej: 123456789"
              />
              {errors.anydesk && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.anydesk}
                </p>
              )}
            </div>

            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Dell, HP, Lenovo"
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modelo
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: OptiPlex 7090"
              />
            </div>

            {/* Número de Serie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Serie
              </label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Número de serie del equipo"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notas adicionales sobre el equipo..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <Save size={16} />
              )}
              {editPC ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

