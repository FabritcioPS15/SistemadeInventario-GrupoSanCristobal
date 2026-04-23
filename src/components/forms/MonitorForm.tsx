import { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

interface MonitorFormProps {
  editMonitor?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function MonitorForm({ editMonitor, onClose, onSave }: MonitorFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    code: editMonitor?.code || '',
    sede: editMonitor?.sede || '',
    area: editMonitor?.area || '',
    marca: editMonitor?.marca || '',
    modelo: editMonitor?.modelo || '',
    numero_serie: editMonitor?.numero_serie || '',
    tamano_pulg: editMonitor?.tamano_pulg || '',
    resolucion: editMonitor?.resolucion || '',
    tipo_panel: editMonitor?.tipo_panel || '',
    tasa_refresco: editMonitor?.tasa_refresco || '',
    puertos: editMonitor?.puertos || '',
    estado_fisico: editMonitor?.estado_fisico || ''
  });

  const panelTypes = [
    { value: 'ips', label: 'IPS' },
    { value: 'tn', label: 'TN' },
    { value: 'va', label: 'VA' },
    { value: 'oled', label: 'OLED' },
    { value: 'amoled', label: 'AMOLED' },
    { value: 'other', label: 'Otro' },
  ];

  const refreshRates = [
    { value: '60', label: '60 Hz' },
    { value: '75', label: '75 Hz' },
    { value: '120', label: '120 Hz' },
    { value: '144', label: '144 Hz' },
    { value: '165', label: '165 Hz' },
    { value: '240', label: '240 Hz' },
    { value: '360', label: '360 Hz' },
    { value: 'other', label: 'Otro' },
  ];

  const resolutions = [
    { value: '1366x768', label: 'HD (1366x768)' },
    { value: '1920x1080', label: 'Full HD (1920x1080)' },
    { value: '2560x1440', label: 'QHD (2560x1440)' },
    { value: '3840x2160', label: '4K UHD (3840x2160)' },
    { value: '5120x2880', label: '5K (5120x2880)' },
    { value: '7680x4320', label: '8K UHD (7680x4320)' },
    { value: 'other', label: 'Otra' },
  ];

  const physicalStates = [
    { value: 'excelente', label: 'Excelente' },
    { value: 'bueno', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'malo', label: 'Malo' },
    { value: 'danado', label: 'Dañado' },
  ];

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (!error && data) {
        setLocations(data);
      }
    } catch (error) {
      console.error('Error al cargar ubicaciones:', error);
    }
  };

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
      tamano_pulg: formData.tamano_pulg.trim() || null,
      resolucion: formData.resolucion.trim() || null,
      tipo_panel: formData.tipo_panel.trim() || null,
      tasa_refresco: formData.tasa_refresco.trim() || null,
      puertos: formData.puertos.trim() || null,
      estado_fisico: formData.estado_fisico.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editMonitor?.id) {
        const { error } = await supabase
          .from('monitors')
          .update(dataToSave)
          .eq('id', editMonitor.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar el monitor: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('monitors')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear el monitor: ' + error.message });
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
      title={editMonitor ? 'Editar Monitor' : 'Nuevo Monitor'}
      subtitle="Módulo de Gestión de Monitores"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Monitor size={24} className="text-blue-600" />}
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
              placeholder="Ej: MON-001"
              required
              error={errors.code}
            />
          </FormField>

          <FormField label="Sede" required error={errors.sede}>
            <FormSelect
              name="sede"
              value={formData.sede}
              onChange={handleChange}
              required
              error={errors.sede}
            >
              <option value="">Seleccionar sede</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </FormSelect>
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
        </div>
      </FormSection>

      {/* Section: Especificaciones del Monitor */}
      <FormSection title="Especificaciones del Monitor" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Marca" required error={errors.marca}>
            <FormInput
              type="text"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
              placeholder="Ej: Samsung, LG, Dell"
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
              placeholder="Ej: Odyssey G7, UltraSharp U2720Q"
              required
              error={errors.modelo}
            />
          </FormField>

          <FormField label="Tamaño (pulgadas)" error={errors.tamano_pulg}>
            <FormInput
              type="text"
              name="tamano_pulg"
              value={formData.tamano_pulg}
              onChange={handleChange}
              placeholder="Ej: 24, 27, 32"
              error={errors.tamano_pulg}
            />
          </FormField>

          <FormField label="Resolución" error={errors.resolucion}>
            <FormSelect
              name="resolucion"
              value={formData.resolucion}
              onChange={handleChange}
              error={errors.resolucion}
            >
              <option value="">Seleccionar resolución</option>
              {resolutions.map((res) => (
                <option key={res.value} value={res.value}>
                  {res.label}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <FormField label="Tipo de Panel" error={errors.tipo_panel}>
            <FormSelect
              name="tipo_panel"
              value={formData.tipo_panel}
              onChange={handleChange}
              error={errors.tipo_panel}
            >
              <option value="">Seleccionar tipo</option>
              {panelTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Tasa de Refresco" error={errors.tasa_refresco}>
            <FormSelect
              name="tasa_refresco"
              value={formData.tasa_refresco}
              onChange={handleChange}
              error={errors.tasa_refresco}
            >
              <option value="">Seleccionar tasa</option>
              {refreshRates.map((rate) => (
                <option key={rate.value} value={rate.value}>
                  {rate.label}
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
        </div>
      </FormSection>

      {/* Section: Puertos y Conectividad */}
      <FormSection title="Puertos y Conectividad" color="amber">
        <FormField label="Puertos Disponibles" error={errors.puertos}>
          <FormTextarea
            name="puertos"
            value={formData.puertos}
            onChange={handleChange}
            placeholder="Ej: 1x HDMI, 1x DisplayPort, 1x USB-C, 2x USB 3.0"
            rows={3}
            error={errors.puertos}
          />
        </FormField>
      </FormSection>


    </BaseForm>
  );
}
