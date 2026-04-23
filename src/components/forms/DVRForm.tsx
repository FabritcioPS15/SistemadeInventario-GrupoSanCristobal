import { useState, useEffect } from 'react';
import { HardDrive } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

interface DVRFormProps {
  editDVR?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function DVRForm({ editDVR, onClose, onSave }: DVRFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    code: editDVR?.code || '',
    sede: editDVR?.sede || '',
    area: editDVR?.area || '',
    marca: editDVR?.marca || '',
    modelo: editDVR?.modelo || '',
    numero_serie: editDVR?.numero_serie || '',
    canales: editDVR?.canales || '',
    resolucion_max: editDVR?.resolucion_max || '',
    almacenamiento_total: editDVR?.almacenamiento_total || '',
    discos_instalados: editDVR?.discos_instalados || '',
    ip: editDVR?.ip || '',
    puerto: editDVR?.puerto || '',
    usuario: editDVR?.usuario || '',
    password: editDVR?.password || '',
    url_acceso: editDVR?.url_acceso || '',
    estado_fisico: editDVR?.estado_fisico || '',
    notas: editDVR?.notas || ''
  });

  const channelOptions = [
    { value: '4', label: '4 Canales' },
    { value: '8', label: '8 Canales' },
    { value: '16', label: '16 Canales' },
    { value: '32', label: '32 Canales' },
    { value: '64', label: '64 Canales' },
    { value: '128', label: '128 Canales' },
    { value: 'other', label: 'Otro' },
  ];

  const resolutions = [
    { value: '720p', label: '720p HD' },
    { value: '1080p', label: '1080p Full HD' },
    { value: '1440p', label: '1440p QHD' },
    { value: '2160p', label: '2160p 4K' },
    { value: '4320p', label: '4320p 8K' },
    { value: 'other', label: 'Otra' },
  ];

  const storageOptions = [
    { value: '500gb', label: '500 GB' },
    { value: '1tb', label: '1 TB' },
    { value: '2tb', label: '2 TB' },
    { value: '4tb', label: '4 TB' },
    { value: '8tb', label: '8 TB' },
    { value: '16tb', label: '16 TB' },
    { value: '32tb', label: '32 TB' },
    { value: 'other', label: 'Otro' },
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

  const validateIP = (ip: string): boolean => {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  const validatePort = (port: string): boolean => {
    const portNum = parseInt(port);
    return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
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

    if (formData.ip && !validateIP(formData.ip)) {
      newErrors.ip = 'Formato de IP inválido';
    }

    if (formData.puerto && !validatePort(formData.puerto)) {
      newErrors.puerto = 'El puerto debe estar entre 1 y 65535';
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
      canales: formData.canales.trim() || null,
      resolucion_max: formData.resolucion_max.trim() || null,
      almacenamiento_total: formData.almacenamiento_total.trim() || null,
      discos_instalados: formData.discos_instalados.trim() || null,
      ip: formData.ip.trim() || null,
      puerto: formData.puerto.trim() || null,
      usuario: formData.usuario.trim() || null,
      password: formData.password.trim() || null,
      url_acceso: formData.url_acceso.trim() || null,
      estado_fisico: formData.estado_fisico.trim() || null,
      notas: formData.notas.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editDVR?.id) {
        const { error } = await supabase
          .from('dvrs')
          .update(dataToSave)
          .eq('id', editDVR.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar el DVR: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('dvrs')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear el DVR: ' + error.message });
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
      title={editDVR ? 'Editar DVR' : 'Nuevo DVR'}
      subtitle="Módulo de Gestión de DVR"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<HardDrive size={24} className="text-blue-600" />}
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
              placeholder="Ej: DVR-001"
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
              placeholder="Ej: Seguridad, Operaciones"
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

      {/* Section: Especificaciones del DVR */}
      <FormSection title="Especificaciones del DVR" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Marca" required error={errors.marca}>
            <FormInput
              type="text"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
              placeholder="Ej: Hikvision, Dahua, Axis"
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
              placeholder="Ej: DS-7608NI-K2, NVR4216-16P-4KS2"
              required
              error={errors.modelo}
            />
          </FormField>

          <FormField label="Canales" error={errors.canales}>
            <FormSelect
              name="canales"
              value={formData.canales}
              onChange={handleChange}
              error={errors.canales}
            >
              <option value="">Seleccionar canales</option>
              {channelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Resolución Máxima" error={errors.resolucion_max}>
            <FormSelect
              name="resolucion_max"
              value={formData.resolucion_max}
              onChange={handleChange}
              error={errors.resolucion_max}
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
          <FormField label="Almacenamiento Total" error={errors.almacenamiento_total}>
            <FormSelect
              name="almacenamiento_total"
              value={formData.almacenamiento_total}
              onChange={handleChange}
              error={errors.almacenamiento_total}
            >
              <option value="">Seleccionar capacidad</option>
              {storageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Discos Instalados" error={errors.discos_instalados}>
            <FormInput
              type="text"
              name="discos_instalados"
              value={formData.discos_instalados}
              onChange={handleChange}
              placeholder="Ej: 2x 2TB Seagate Barracuda"
              error={errors.discos_instalados}
            />
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

      {/* Section: Configuración de Red */}
      <FormSection title="Configuración de Red y Acceso" color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Dirección IP" error={errors.ip}>
            <FormInput
              type="text"
              name="ip"
              value={formData.ip}
              onChange={handleChange}
              placeholder="Ej: 192.168.1.100"
              error={errors.ip}
            />
          </FormField>

          <FormField label="Puerto" error={errors.puerto}>
            <FormInput
              type="text"
              name="puerto"
              value={formData.puerto}
              onChange={handleChange}
              placeholder="Ej: 80, 554, 8000"
              error={errors.puerto}
            />
          </FormField>

          <FormField label="Usuario" error={errors.usuario}>
            <FormInput
              type="text"
              name="usuario"
              value={formData.usuario}
              onChange={handleChange}
              placeholder="Usuario de acceso"
              error={errors.usuario}
            />
          </FormField>

          <FormField label="Contraseña" error={errors.password}>
            <FormInput
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Contraseña de acceso"
              error={errors.password}
            />
          </FormField>
        </div>

        <FormField label="URL de Acceso" error={errors.url_acceso}>
          <FormInput
            type="url"
            name="url_acceso"
            value={formData.url_acceso}
            onChange={handleChange}
            placeholder="Ej: http://192.168.1.100:80"
            error={errors.url_acceso}
          />
        </FormField>
      </FormSection>

      {/* Section: Notas */}
      <FormSection title="Notas Adicionales" color="purple">
        <FormField label="Notas y Observaciones" error={errors.notas}>
          <FormTextarea
            name="notas"
            value={formData.notas}
            onChange={handleChange}
            placeholder="Notas adicionales sobre el DVR, configuraciones especiales, problemas conocidos, mantenimientos realizados, etc..."
            rows={4}
            error={errors.notas}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
