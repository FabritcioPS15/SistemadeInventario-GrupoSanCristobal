import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

interface PhoneFormProps {
  editPhone?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function PhoneForm({ editPhone, onClose, onSave }: PhoneFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    code: editPhone?.code || '',
    sede: editPhone?.sede || '',
    area: editPhone?.area || '',
    marca: editPhone?.marca || '',
    modelo: editPhone?.modelo || '',
    numero_serie: editPhone?.numero_serie || '',
    imei: editPhone?.imei || '',
    numero_telefono: editPhone?.numero_telefono || '',
    operador: editPhone?.operador || '',
    plan_datos: editPhone?.plan_datos || '',
    estado_fisico: editPhone?.estado_fisico || '',
    sistema_operativo: editPhone?.sistema_operativo || '',
    version_so: editPhone?.version_so || '',
    almacenamiento: editPhone?.almacenamiento || '',
    ram: editPhone?.ram || '',
    bateria_estado: editPhone?.bateria_estado || '',
    accesorios: editPhone?.accesorios || '',
    notas: editPhone?.notas || ''
  });

  const operators = [
    { value: 'claro', label: 'Claro' },
    { value: 'movistar', label: 'Movistar' },
    { value: 'entel', label: 'Entel' },
    { value: 'bitel', label: 'Bitel' },
    { value: 'wom', label: 'WOM' },
    { value: 'other', label: 'Otro' },
  ];

  const dataPlans = [
    { value: 'basico', label: 'Básico (1-5GB)' },
    { value: 'medio', label: 'Medio (6-15GB)' },
    { value: 'premium', label: 'Premium (16-50GB)' },
    { value: 'ilimitado', label: 'Ilimitado' },
    { value: 'corporativo', label: 'Corporativo' },
    { value: 'sin_plan', label: 'Sin Plan' },
  ];

  const physicalStates = [
    { value: 'excelente', label: 'Excelente' },
    { value: 'bueno', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'malo', label: 'Malo' },
    { value: 'danado', label: 'Dañado' },
  ];

  const operatingSystems = [
    { value: 'android', label: 'Android' },
    { value: 'ios', label: 'iOS' },
    { value: 'windows', label: 'Windows Phone' },
    { value: 'other', label: 'Otro' },
  ];

  const batteryStates = [
    { value: 'excelente', label: 'Excelente (>80%)' },
    { value: 'bueno', label: 'Bueno (50-80%)' },
    { value: 'regular', label: 'Regular (20-50%)' },
    { value: 'malo', label: 'Malo (<20%)' },
    { value: 'reemplazada', label: 'Reemplazada' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'El código es requerido';
    }

    if (!formData.sede.trim()) {
      newErrors.sede = 'La sede es requerida';
    }

    if (!formData.marca.trim()) {
      newErrors.marca = 'La marca es requerida';
    }

    if (!formData.modelo.trim()) {
      newErrors.modelo = 'El modelo es requerido';
    }

    if (!formData.numero_telefono.trim()) {
      newErrors.numero_telefono = 'El número de teléfono es requerido';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    const dataToSave = {
      code: formData.code.trim(),
      sede: formData.sede.trim() || null,
      area: formData.area.trim() || null,
      marca: formData.marca.trim(),
      modelo: formData.modelo.trim(),
      numero_serie: formData.numero_serie.trim() || null,
      imei: formData.imei.trim() || null,
      numero_telefono: formData.numero_telefono.trim(),
      operador: formData.operador.trim() || null,
      plan_datos: formData.plan_datos.trim() || null,
      estado_fisico: formData.estado_fisico.trim() || null,
      sistema_operativo: formData.sistema_operativo.trim() || null,
      version_so: formData.version_so.trim() || null,
      almacenamiento: formData.almacenamiento.trim() || null,
      ram: formData.ram.trim() || null,
      bateria_estado: formData.bateria_estado.trim() || null,
      accesorios: formData.accesorios.trim() || null,
      notas: formData.notas.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editPhone?.id) {
        const { error } = await supabase
          .from('phones')
          .update(dataToSave)
          .eq('id', editPhone.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar el teléfono: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('phones')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear el teléfono: ' + error.message });
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
      title={editPhone ? 'Editar Teléfono' : 'Nuevo Teléfono'}
      subtitle="Módulo de Gestión de Teléfonos"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Smartphone size={24} className="text-blue-600" />}
    >
      {/* Section: Información Básica */}
      <FormSection title="Información Básica" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Código" required error={errors.code}>
            <FormInput
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Ej: TEL-001"
              required
              error={errors.code}
            />
          </FormField>

          <FormField label="Sede" required error={errors.sede}>
            <FormInput
              type="text"
              name="sede"
              value={formData.sede}
              onChange={handleChange}
              placeholder="Ej: Lima, Arequipa"
              required
              error={errors.sede}
            />
          </FormField>

          <FormField label="Área" error={errors.area}>
            <FormInput
              type="text"
              name="area"
              value={formData.area}
              onChange={handleChange}
              placeholder="Ej: Administración, Operaciones"
              error={errors.area}
            />
          </FormField>

          <FormField label="Número de Teléfono" required error={errors.numero_telefono}>
            <FormInput
              type="tel"
              name="numero_telefono"
              value={formData.numero_telefono}
              onChange={handleChange}
              placeholder="Ej: 987654321"
              required
              error={errors.numero_telefono}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Especificaciones del Dispositivo */}
      <FormSection title="Especificaciones del Dispositivo" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Marca" required error={errors.marca}>
            <FormInput
              type="text"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
              placeholder="Ej: Samsung, Apple, Xiaomi"
              required
              error={errors.marca}
            />
          </FormField>

          <FormField label="Modelo" required error={errors.modelo}>
            <FormInput
              type="text"
              name="modelo"
              value={formData.modelo}
              onChange={handleChange}
              placeholder="Ej: Galaxy S23, iPhone 14"
              required
              error={errors.modelo}
            />
          </FormField>

          <FormField label="Número de Serie" error={errors.numero_serie}>
            <FormInput
              type="text"
              name="numero_serie"
              value={formData.numero_serie}
              onChange={handleChange}
              placeholder="Ej: A1B2C3D4E5F6"
              error={errors.numero_serie}
            />
          </FormField>

          <FormField label="IMEI" error={errors.imei}>
            <FormInput
              type="text"
              name="imei"
              value={formData.imei}
              onChange={handleChange}
              placeholder="Ej: 123456789012345"
              error={errors.imei}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Sistema Operativo */}
      <FormSection title="Sistema Operativo y Hardware" color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Sistema Operativo" error={errors.sistema_operativo}>
            <FormSelect
              name="sistema_operativo"
              value={formData.sistema_operativo}
              onChange={handleChange}
              error={errors.sistema_operativo}
            >
              <option value="">Seleccionar SO</option>
              {operatingSystems.map((os) => (
                <option key={os.value} value={os.value}>
                  {os.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Versión del SO" error={errors.version_so}>
            <FormInput
              type="text"
              name="version_so"
              value={formData.version_so}
              onChange={handleChange}
              placeholder="Ej: 14.0, 13.1"
              error={errors.version_so}
            />
          </FormField>

          <FormField label="Almacenamiento" error={errors.almacenamiento}>
            <FormInput
              type="text"
              name="almacenamiento"
              value={formData.almacenamiento}
              onChange={handleChange}
              placeholder="Ej: 128GB, 256GB"
              error={errors.almacenamiento}
            />
          </FormField>

          <FormField label="RAM" error={errors.ram}>
            <FormInput
              type="text"
              name="ram"
              value={formData.ram}
              onChange={handleChange}
              placeholder="Ej: 4GB, 8GB"
              error={errors.ram}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Operador y Plan */}
      <FormSection title="Operador y Plan de Datos" color="purple">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Operador" error={errors.operador}>
            <FormSelect
              name="operador"
              value={formData.operador}
              onChange={handleChange}
              error={errors.operador}
            >
              <option value="">Seleccionar operador</option>
              {operators.map((operator) => (
                <option key={operator.value} value={operator.value}>
                  {operator.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Plan de Datos" error={errors.plan_datos}>
            <FormSelect
              name="plan_datos"
              value={formData.plan_datos}
              onChange={handleChange}
              error={errors.plan_datos}
            >
              <option value="">Seleccionar plan</option>
              {dataPlans.map((plan) => (
                <option key={plan.value} value={plan.value}>
                  {plan.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Estado Físico" error={errors.estado_fisico}>
            <FormSelect
              name="estado_fisico"
              value={formData.estado_fisico}
              onChange={handleChange}
              error={errors.estado_fisico}
            >
              <option value="">Seleccionar estado</option>
              {physicalStates.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Estado de Batería" error={errors.bateria_estado}>
            <FormSelect
              name="bateria_estado"
              value={formData.bateria_estado}
              onChange={handleChange}
              error={errors.bateria_estado}
            >
              <option value="">Seleccionar estado</option>
              {batteryStates.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>
      </FormSection>

      {/* Section: Accesorios y Notas */}
      <FormSection title="Accesorios y Notas" color="rose">
        <FormField label="Accesorios" error={errors.accesorios}>
          <FormTextarea
            name="accesorios"
            value={formData.accesorios}
            onChange={handleChange}
            placeholder="Cargador, audífonos, funda, cable USB, etc..."
            rows={3}
            error={errors.accesorios}
          />
        </FormField>

        <FormField label="Notas y Observaciones" error={errors.notas}>
          <FormTextarea
            name="notas"
            value={formData.notas}
            onChange={handleChange}
            placeholder="Notas adicionales sobre el teléfono, historial de reparaciones, problemas conocidos, etc..."
            rows={4}
            error={errors.notas}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
