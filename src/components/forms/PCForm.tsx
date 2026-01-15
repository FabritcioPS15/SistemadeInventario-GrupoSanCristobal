import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase, Location } from '../../lib/supabase';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editPC ? 'Editar PC/Laptop' : 'Nueva PC/Laptop'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Gestión de activos informáticos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Código Aleatorio */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Código Aleatorio *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.code ? 'border-red-300' : 'border-gray-200'
                    }`}
                  placeholder="Código de 6 dígitos"
                  maxLength={6}
                  readOnly
                />
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors uppercase"
                >
                  Generar
                </button>
              </div>
              {errors.code && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.code}</p>
              )}
            </div>

            {/* Sede */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Sede *
              </label>
              <select
                name="location_id"
                value={formData.location_id}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.location_id ? 'border-red-300' : 'border-gray-200'
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
                <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.location_id}</p>
              )}
            </div>

            {/* Área */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Área *
              </label>
              <input
                type="text"
                name="area"
                value={formData.area}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.area ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="Ej: Administración, Contabilidad"
              />
              {errors.area && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.area}</p>
              )}
            </div>

            {/* PC/Laptop */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Tipo de Equipo *
              </label>
              <select
                name="pc_laptop"
                value={formData.pc_laptop}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="pc">PC de Escritorio</option>
                <option value="laptop">Laptop / Portátil</option>
              </select>
            </div>

            {/* Placa */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Placa (Activo Fijo) *
              </label>
              <input
                type="text"
                name="placa"
                value={formData.placa}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.placa ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="Ej: ABC-123"
              />
              {errors.placa && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.placa}</p>
              )}
            </div>

            {/* Modo de BIOS */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Modo de BIOS *
              </label>
              <select
                name="bios_mode"
                value={formData.bios_mode}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.bios_mode ? 'border-red-300' : 'border-gray-200'
                  }`}
              >
                <option value="">Seleccionar modo</option>
                <option value="legacy">Legacy</option>
                <option value="uefi">UEFI</option>
                <option value="mixed">Mixed</option>
              </select>
              {errors.bios_mode && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.bios_mode}</p>
              )}
            </div>

            {/* Sistema Operativo */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Sistema Operativo *
              </label>
              <input
                type="text"
                name="operating_system"
                value={formData.operating_system}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.operating_system ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="Ej: Windows 11 Pro"
              />
              {errors.operating_system && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.operating_system}</p>
              )}
            </div>

            {/* RAM */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Memoria RAM *
              </label>
              <input
                type="text"
                name="ram"
                value={formData.ram}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.ram ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="Ej: 16GB DDR4 3200MHz"
              />
              {errors.ram && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.ram}</p>
              )}
            </div>

            {/* Procesador */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Procesador *
              </label>
              <input
                type="text"
                name="processor"
                value={formData.processor}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.processor ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="Ej: Intel Core i5-12400"
              />
              {errors.processor && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.processor}</p>
              )}
            </div>

            {/* IP Address */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Dirección IP *
              </label>
              <input
                type="text"
                name="ip_address"
                value={formData.ip_address}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.ip_address ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="Ej: 192.168.1.xxx"
              />
              {errors.ip_address && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.ip_address}</p>
              )}
            </div>

            {/* AnyDesk */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                AnyDesk ID *
              </label>
              <input
                type="text"
                name="anydesk"
                value={formData.anydesk}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.anydesk ? 'border-red-300' : 'border-gray-200'
                  }`}
                placeholder="Ej: 123 456 789"
              />
              {errors.anydesk && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.anydesk}</p>
              )}
            </div>

            {/* Marca */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Marca
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Ej: Lenovo, Dell, HP"
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Modelo
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Ej: ThinkPad E14"
              />
            </div>

            {/* Número de Serie */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Número de Serie
              </label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="S/N del equipo"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="mt-6">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Notas Adicionales
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Observaciones o detalles adicionales..."
            />
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
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <Save size={16} />
              )}
              {editPC ? 'Guardar Cambios' : 'Registrar Equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

