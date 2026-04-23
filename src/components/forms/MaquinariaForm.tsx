import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

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
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    // Campos básicos
    item: editingMaquinaria?.item || '',
    descripcion: editingMaquinaria?.descripcion || '',
    unidad_medida: editingMaquinaria?.unidad_medida || '',
    cantidad: editingMaquinaria?.cantidad || 1,
    condicion: editingMaquinaria?.condicion || 'bueno',
    ubicacion: editingMaquinaria?.ubicacion || '',
    marca: editingMaquinaria?.marca || '',
    modelo: editingMaquinaria?.modelo || '',
    serie: editingMaquinaria?.serie || '',
    fecha_adquisicion: editingMaquinaria?.fecha_adquisicion || '',
    fecha_ultimo_mantenimiento: editingMaquinaria?.fecha_ultimo_mantenimiento || '',
    proximo_mantenimiento: editingMaquinaria?.proximo_mantenimiento || '',
    responsable: editingMaquinaria?.responsable || '',
    estado: editingMaquinaria?.estado || 'operativo',
    // Campos técnicos
    potencia: editingMaquinaria?.potencia || '',
    voltaje: editingMaquinaria?.voltaje || '',
    frecuencia: editingMaquinaria?.frecuencia || '',
    peso: editingMaquinaria?.peso || '',
    dimensiones: editingMaquinaria?.dimensiones || '',
    material: editingMaquinaria?.material || '',
    capacidad: editingMaquinaria?.capacidad || '',
    // Campos de costo
    costo_adquisicion: editingMaquinaria?.costo_adquisicion || '',
    valor_actual: editingMaquinaria?.valor_actual || '',
    vida_util: editingMaquinaria?.vida_util || '',
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (data) setLocations(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.item.trim()) {
      newErrors.item = 'El nombre del equipo es requerido';
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es requerida';
    }

    if (!formData.estado) {
      newErrors.estado = 'El estado es requerido';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    const dataToSave = {
      ...formData,
      ubicacion: formData.ubicacion || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingMaquinaria) {
        const { error } = await supabase
          .from('maquinaria')
          .update(dataToSave)
          .eq('id', editingMaquinaria.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar la maquinaria: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('maquinaria')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear la maquinaria: ' + error.message });
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      onSave();
    } catch (err: any) {
      setErrors({ submit: 'Error inesperado: ' + err });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <BaseForm
      title={editingMaquinaria ? 'Editar Maquinaria' : 'Nueva Maquinaria'}
      subtitle="Módulo de Gestión de Maquinaria"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Settings size={24} className="text-blue-600" />}
    >
      {/* Section: Información Principal */}
      <FormSection title="Información del Equipo" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Nombre del Equipo" required error={errors.item}>
            <FormInput
              type="text"
              name="item"
              value={formData.item}
              onChange={handleChange}
              placeholder="Ej: Excavadora, Compresor, Generador"
              required
              error={errors.item}
            />
          </FormField>

          <FormField label="Descripción" required error={errors.descripcion}>
            <FormInput
              type="text"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Descripción detallada del equipo"
              required
              error={errors.descripcion}
            />
          </FormField>

          <FormField label="Unidad de Medida" error={errors.unidad_medida}>
            <FormInput
              type="text"
              name="unidad_medida"
              value={formData.unidad_medida}
              onChange={handleChange}
              placeholder="Ej: Unidad, Set, Par"
              error={errors.unidad_medida}
            />
          </FormField>

          <FormField label="Cantidad" error={errors.cantidad}>
            <FormInput
              type="number"
              name="cantidad"
              value={formData.cantidad}
              onChange={handleChange}
              placeholder="1"
              error={errors.cantidad}
            />
          </FormField>

          <FormField label="Condición" error={errors.condicion}>
            <FormSelect
              name="condicion"
              value={formData.condicion}
              onChange={handleChange}
              error={errors.condicion}
            >
              <option value="nuevo">Nuevo</option>
              <option value="bueno">Bueno</option>
              <option value="regular">Regular</option>
              <option value="malo">Malo</option>
            </FormSelect>
          </FormField>

          <FormField label="Ubicación" error={errors.ubicacion}>
            <FormSelect
              name="ubicacion"
              value={formData.ubicacion}
              onChange={handleChange}
              error={errors.ubicacion}
            >
              <option value="">Seleccionar ubicación</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Estado" required error={errors.estado}>
            <FormSelect
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              required
              error={errors.estado}
            >
              <option value="operativo">Operativo</option>
              <option value="mantenimiento">En Mantenimiento</option>
              <option value="descompuesto">Descompuesto</option>
              <option value="dado_baja">Dado de Baja</option>
            </FormSelect>
          </FormField>

          <FormField label="Responsable" error={errors.responsable}>
            <FormInput
              type="text"
              name="responsable"
              value={formData.responsable}
              onChange={handleChange}
              placeholder="Nombre del responsable"
              error={errors.responsable}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Especificaciones Técnicas */}
      <FormSection title="Especificaciones Técnicas" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Marca" error={errors.marca}>
            <FormInput
              type="text"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
              placeholder="Ej: Caterpillar, Komatsu"
              error={errors.marca}
            />
          </FormField>

          <FormField label="Modelo" error={errors.modelo}>
            <FormInput
              type="text"
              name="modelo"
              value={formData.modelo}
              onChange={handleChange}
              placeholder="Ej: 320D, PC200-8"
              error={errors.modelo}
            />
          </FormField>

          <FormField label="Número de Serie" error={errors.serie}>
            <FormInput
              type="text"
              name="serie"
              value={formData.serie}
              onChange={handleChange}
              placeholder="Número de serie del equipo"
              error={errors.serie}
            />
          </FormField>

          <FormField label="Material" error={errors.material}>
            <FormInput
              type="text"
              name="material"
              value={formData.material}
              onChange={handleChange}
              placeholder="Ej: Acero, Aluminio"
              error={errors.material}
            />
          </FormField>

          <FormField label="Potencia" error={errors.potencia}>
            <FormInput
              type="text"
              name="potencia"
              value={formData.potencia}
              onChange={handleChange}
              placeholder="Ej: 200 HP, 150 kW"
              error={errors.potencia}
            />
          </FormField>

          <FormField label="Voltaje" error={errors.voltaje}>
            <FormInput
              type="text"
              name="voltaje"
              value={formData.voltaje}
              onChange={handleChange}
              placeholder="Ej: 220V, 440V"
              error={errors.voltaje}
            />
          </FormField>

          <FormField label="Frecuencia" error={errors.frecuencia}>
            <FormInput
              type="text"
              name="frecuencia"
              value={formData.frecuencia}
              onChange={handleChange}
              placeholder="Ej: 60 Hz"
              error={errors.frecuencia}
            />
          </FormField>

          <FormField label="Capacidad" error={errors.capacidad}>
            <FormInput
              type="text"
              name="capacidad"
              value={formData.capacidad}
              onChange={handleChange}
              placeholder="Ej: 20 toneladas, 5000 L"
              error={errors.capacidad}
            />
          </FormField>

          <FormField label="Peso" error={errors.peso}>
            <FormInput
              type="text"
              name="peso"
              value={formData.peso}
              onChange={handleChange}
              placeholder="Ej: 25 toneladas"
              error={errors.peso}
            />
          </FormField>

          <FormField label="Dimensiones" error={errors.dimensiones}>
            <FormInput
              type="text"
              name="dimensiones"
              value={formData.dimensiones}
              onChange={handleChange}
              placeholder="Ej: 10m x 3m x 4m"
              error={errors.dimensiones}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Fechas y Mantenimiento */}
      <FormSection title="Fechas y Mantenimiento" color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Fecha de Adquisición" error={errors.fecha_adquisicion}>
            <FormInput
              type="date"
              name="fecha_adquisicion"
              value={formData.fecha_adquisicion}
              onChange={handleChange}
              error={errors.fecha_adquisicion}
            />
          </FormField>

          <FormField label="Último Mantenimiento" error={errors.fecha_ultimo_mantenimiento}>
            <FormInput
              type="date"
              name="fecha_ultimo_mantenimiento"
              value={formData.fecha_ultimo_mantenimiento}
              onChange={handleChange}
              error={errors.fecha_ultimo_mantenimiento}
            />
          </FormField>

          <FormField label="Próximo Mantenimiento" error={errors.proximo_mantenimiento}>
            <FormInput
              type="date"
              name="proximo_mantenimiento"
              value={formData.proximo_mantenimiento}
              onChange={handleChange}
              error={errors.proximo_mantenimiento}
            />
          </FormField>

          <FormField label="Vida Útil (años)" error={errors.vida_util}>
            <FormInput
              type="number"
              name="vida_util"
              value={formData.vida_util}
              onChange={handleChange}
              placeholder="10"
              error={errors.vida_util}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Información Financiera */}
      <FormSection title="Información Financiera" color="purple">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Costo de Adquisición" error={errors.costo_adquisicion}>
            <FormInput
              type="number"
              step="0.01"
              name="costo_adquisicion"
              value={formData.costo_adquisicion}
              onChange={handleChange}
              placeholder="50000.00"
              error={errors.costo_adquisicion}
            />
          </FormField>

          <FormField label="Valor Actual" error={errors.valor_actual}>
            <FormInput
              type="number"
              step="0.01"
              name="valor_actual"
              value={formData.valor_actual}
              onChange={handleChange}
              placeholder="35000.00"
              error={errors.valor_actual}
            />
          </FormField>
        </div>
      </FormSection>

    </BaseForm>
  );
}
