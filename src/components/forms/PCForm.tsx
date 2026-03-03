import { useState, useEffect } from 'react';
import { Monitor, Loader2 } from 'lucide-react';
import { supabase, Location } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

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
  // Campos del Excel
  item: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: string;
  condicion: string;
  color: string;
  gama: string;
  fecha_adquisicion: string;
  valor_estimado: string;
  estado_uso: string;
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
    notes: '',
    item: '',
    descripcion: '',
    unidad_medida: '',
    cantidad: '1',
    condicion: '',
    color: '',
    gama: '',
    fecha_adquisicion: '',
    valor_estimado: '',
    estado_uso: ''
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchLocations();
    if (!editPC) generateRandomCode();
    else setFormData(editPC);
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
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        asset_type_id: formData.pc_laptop === 'pc' ? 'pc-id' : 'laptop-id', // Use real IDs in prod
        status: 'active',
        updated_at: new Date().toISOString()
      };
      if (editPC) {
        const { error } = await supabase.from('assets').update(dataToSave).eq('id', editPC.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('assets').insert([dataToSave]);
        if (error) throw error;
      }
      onSave();
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm
      title={editPC ? 'Editar PC / Laptop' : 'Nueva PC / Laptop'}
      subtitle="Hardware y Sistemas"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      maxWidth="5xl"
      icon={<Monitor size={24} className="text-blue-600" />}
    >
      {/* SECTION 1: IDENTIFICACIÓN BÁSICA */}
      <FormSection title="Identificación Básica" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Código ID">
            <div className="flex gap-2">
              <FormInput 
                type="text" 
                name="code" 
                value={formData.code} 
                readOnly 
                className="bg-gray-100"
                error={errors.code}
              />
              <button 
                type="button" 
                onClick={generateRandomCode} 
                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 shadow-sm"
              >
                <Loader2 size={18} />
              </button>
            </div>
          </FormField>
          
          <FormField label="Lugar / Sede" required error={errors.location_id}>
            <FormSelect 
              name="location_id" 
              value={formData.location_id} 
              onChange={handleChange} 
              required
              error={errors.location_id}
            >
              <option value="">Seleccionar...</option>
              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </FormSelect>
          </FormField>
          
          <FormField label="Área / Departamento">
            <FormInput 
              type="text" 
              name="area" 
              value={formData.area} 
              onChange={handleChange} 
              placeholder="Ej: Contabilidad"
              error={errors.area}
            />
          </FormField>
          
          <FormField label="Tipo de Equipo">
            <FormSelect 
              name="pc_laptop" 
              value={formData.pc_laptop} 
              onChange={handleChange}
              error={errors.pc_laptop}
            >
              <option value="pc">PC de Escritorio</option>
              <option value="laptop">Laptop / Portátil</option>
            </FormSelect>
          </FormField>
        </div>
      </FormSection>

      {/* SECTION 2: ESPECIFICACIONES TÉCNICAS */}
      <FormSection title="Especificaciones de Hardware" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Placa (Activo Fijo)">
            <FormInput 
              type="text" 
              name="placa" 
              value={formData.placa} 
              onChange={handleChange} 
              placeholder="Ej: ABC-123"
              error={errors.placa}
            />
          </FormField>
          
          <FormField label="Modo BIOS">
            <FormSelect 
              name="bios_mode" 
              value={formData.bios_mode} 
              onChange={handleChange}
              error={errors.bios_mode}
            >
              <option value="">Seleccionar...</option>
              <option value="legacy">Legacy</option>
              <option value="uefi">UEFI</option>
            </FormSelect>
          </FormField>
          
          <FormField label="Sistema Operativo">
            <FormInput 
              type="text" 
              name="operating_system" 
              value={formData.operating_system} 
              onChange={handleChange} 
              placeholder="Ej: Windows 11 Pro"
              error={errors.operating_system}
            />
          </FormField>
          
          <FormField label="Memoria RAM">
            <FormInput 
              type="text" 
              name="ram" 
              value={formData.ram} 
              onChange={handleChange} 
              placeholder="8GB / 16GB"
              error={errors.ram}
            />
          </FormField>
          
          <FormField label="Procesador">
            <FormInput 
              type="text" 
              name="processor" 
              value={formData.processor} 
              onChange={handleChange} 
              placeholder="Intel Core i5"
              error={errors.processor}
            />
          </FormField>
          
          <FormField label="Dirección IP">
            <FormInput 
              type="text" 
              name="ip_address" 
              value={formData.ip_address} 
              onChange={handleChange} 
              placeholder="192.168.1.100"
              error={errors.ip_address}
            />
          </FormField>
          
          <FormField label="AnyDesk ID">
            <FormInput 
              type="text" 
              name="anydesk" 
              value={formData.anydesk} 
              onChange={handleChange} 
              placeholder="123 456 789"
              error={errors.anydesk}
            />
          </FormField>
          
          <FormField label="Marca">
            <FormInput 
              type="text" 
              name="brand" 
              value={formData.brand} 
              onChange={handleChange}
              error={errors.brand}
            />
          </FormField>
          
          <FormField label="Modelo">
            <FormInput 
              type="text" 
              name="model" 
              value={formData.model} 
              onChange={handleChange}
              error={errors.model}
            />
          </FormField>
        </div>
      </FormSection>

      {/* SECTION 3: DATOS DE INVENTARIO */}
      <FormSection title="Información de Inventario" color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="ITEM">
            <FormInput 
              type="text" 
              name="item" 
              value={formData.item} 
              onChange={handleChange}
              error={errors.item}
            />
          </FormField>
          
          <FormField label="Descripción" className="md:col-span-2">
            <FormInput 
              type="text" 
              name="descripcion" 
              value={formData.descripcion} 
              onChange={handleChange}
              error={errors.descripcion}
            />
          </FormField>
          
          <FormField label="U. Medida">
            <FormInput 
              type="text" 
              name="unidad_medida" 
              value={formData.unidad_medida} 
              onChange={handleChange} 
              placeholder="UNID"
              error={errors.unidad_medida}
            />
          </FormField>
          
          <FormField label="Cantidad">
            <FormInput 
              type="number" 
              name="cantidad" 
              value={formData.cantidad} 
              onChange={handleChange}
              error={errors.cantidad}
            />
          </FormField>
          
          <FormField label="Condición">
            <FormSelect 
              name="condicion" 
              value={formData.condicion} 
              onChange={handleChange}
              error={errors.condicion}
            >
              <option value="">Seleccionar...</option>
              <option value="Nuevo">Nuevo</option>
              <option value="Usado - Excelente">Usado - Excelente</option>
              <option value="Malo">Malo</option>
            </FormSelect>
          </FormField>
          
          <FormField label="Gama">
            <FormInput 
              type="text" 
              name="gama" 
              value={formData.gama} 
              onChange={handleChange}
              error={errors.gama}
            />
          </FormField>
        </div>
      </FormSection>

      {/* SECTION 4: ADQUISICIÓN Y VALOR */}
      <FormSection title="Adquisición y Valor" color="purple">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Fecha Adquisición">
            <FormInput 
              type="date" 
              name="fecha_adquisicion" 
              value={formData.fecha_adquisicion} 
              onChange={handleChange}
              error={errors.fecha_adquisicion}
            />
          </FormField>
          
          <FormField label="Valor Estimado ($)">
            <FormInput 
              type="number" 
              name="valor_estimado" 
              value={formData.valor_estimado} 
              onChange={handleChange} 
              step="0.01" 
              placeholder="0.00"
              error={errors.valor_estimado}
            />
          </FormField>
          
          <FormField label="Estado uso">
            <FormSelect 
              name="estado_uso" 
              value={formData.estado_uso} 
              onChange={handleChange}
              error={errors.estado_uso}
            >
              <option value="">Seleccionar...</option>
              <option value="Operativo">Operativo</option>
              <option value="Fuera de Servicio">Fuera de Servicio</option>
            </FormSelect>
          </FormField>
        </div>
      </FormSection>

      {/* SECTION 5: NOTAS */}
      <FormSection title="Notas Adicionales" color="blue">
        <FormField label="">
          <FormTextarea 
            name="notes" 
            value={formData.notes} 
            onChange={handleChange} 
            rows={3} 
            placeholder="Observaciones generales..."
            error={errors.notes}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
