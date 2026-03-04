import { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

interface WebcamFormProps {
  editWebcam?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function WebcamForm({ editWebcam, onClose, onSave }: WebcamFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    code: editWebcam?.code || '',
    sede: editWebcam?.sede || '',
    area: editWebcam?.area || '',
    marca: editWebcam?.marca || '',
    modelo: editWebcam?.modelo || '',
    numero_serie: editWebcam?.numero_serie || '',
    resolucion: editWebcam?.resolucion || '',
    tipo_conexion: editWebcam?.tipo_conexion || '',
    interfaz: editWebcam?.interfaz || '',
    compatibilidad: editWebcam?.compatibilidad || '',
    sistema_operativo: editWebcam?.sistema_operativo || '',
    software_incluido: editWebcam?.software_incluido || '',
    caracteristicas: editWebcam?.caracteristicas || '',
    estado_fisico: editWebcam?.estado_fisico || '',
    accesorios: editWebcam?.accesorios || '',
    notas: editWebcam?.notas || ''
  });

  const resolutions = [
    { value: '480p', label: '480p SD (640x480)' },
    { value: '720p', label: '720p HD (1280x720)' },
    { value: '1080p', label: '1080p Full HD (1920x1080)' },
    { value: '1440p', label: '1440p QHD (2560x1440)' },
    { value: '2160p', label: '2160p 4K (3840x2160)' },
    { value: '4320p', label: '4320p 8K (7680x4320)' },
    { value: 'other', label: 'Otra' },
  ];

  const connectionTypes = [
    { value: 'usb', label: 'USB' },
    { value: 'wireless', label: 'Inalámbrica' },
    { value: 'network', label: 'Red/IP' },
    { value: 'thunderbolt', label: 'Thunderbolt' },
    { value: 'other', label: 'Otra' },
  ];

  const interfaces = [
    { value: 'usb-2.0', label: 'USB 2.0' },
    { value: 'usb-3.0', label: 'USB 3.0' },
    { value: 'usb-c', label: 'USB-C' },
    { value: 'wifi', label: 'WiFi' },
    { value: 'bluetooth', label: 'Bluetooth' },
    { value: 'ethernet', label: 'Ethernet' },
    { value: 'other', label: 'Otra' },
  ];

  const operatingSystems = [
    { value: 'windows', label: 'Windows' },
    { value: 'macos', label: 'macOS' },
    { value: 'linux', label: 'Linux' },
    { value: 'chromeos', label: 'Chrome OS' },
    { value: 'all', label: 'Todos' },
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
      sede: formData.sede.trim(),
      area: formData.area.trim() || null,
      marca: formData.marca.trim(),
      modelo: formData.modelo.trim(),
      numero_serie: formData.numero_serie.trim() || null,
      resolucion: formData.resolucion.trim() || null,
      tipo_conexion: formData.tipo_conexion.trim() || null,
      interfaz: formData.interfaz.trim() || null,
      compatibilidad: formData.compatibilidad.trim() || null,
      sistema_operativo: formData.sistema_operativo.trim() || null,
      software_incluido: formData.software_incluido.trim() || null,
      caracteristicas: formData.caracteristicas.trim() || null,
      estado_fisico: formData.estado_fisico.trim() || null,
      accesorios: formData.accesorios.trim() || null,
      notas: formData.notas.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editWebcam?.id) {
        const { error } = await supabase
          .from('webcams')
          .update(dataToSave)
          .eq('id', editWebcam.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar la webcam: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('webcams')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear la webcam: ' + error.message });
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
      title={editWebcam ? 'Editar Webcam' : 'Nueva Webcam'}
      subtitle="Módulo de Gestión de Webcams"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Camera size={24} className="text-blue-600" />}
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
              placeholder="Ej: CAM-001"
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
              placeholder="Ej: Reuniones, Operaciones"
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

      {/* Section: Especificaciones de la Webcam */}
      <FormSection title="Especificaciones de la Webcam" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Marca" required error={errors.marca}>
            <FormInput
              type="text"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
              placeholder="Ej: Logitech, Microsoft, Razer"
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
              placeholder="Ej: C920, LifeCam HD-3000, Kiyo Pro"
              required
              error={errors.modelo}
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

          <FormField label="Tipo de Conexión" error={errors.tipo_conexion}>
            <FormSelect
              name="tipo_conexion"
              value={formData.tipo_conexion}
              onChange={handleChange}
              error={errors.tipo_conexion}
            >
              <option value="">Seleccionar tipo</option>
              {connectionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <FormField label="Interfaz" error={errors.interfaz}>
            <FormSelect
              name="interfaz"
              value={formData.interfaz}
              onChange={handleChange}
              error={errors.interfaz}
            >
              <option value="">Seleccionar interfaz</option>
              {interfaces.map((iface) => (
                <option key={iface.value} value={iface.value}>
                  {iface.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

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

      {/* Section: Características y Software */}
      <FormSection title="Características y Software" color="amber">
        <FormField label="Características Especiales" error={errors.caracteristicas}>
          <FormTextarea
            name="caracteristicas"
            value={formData.caracteristicas}
            onChange={handleChange}
            placeholder="Ej: Autoenfoque, Reducción de ruido, Corrección de luz, Zoom digital, Micrófono integrado, etc..."
            rows={3}
            error={errors.caracteristicas}
          />
        </FormField>

        <FormField label="Software Incluido" error={errors.software_incluido}>
          <FormTextarea
            name="software_incluido"
            value={formData.software_incluido}
            onChange={handleChange}
            placeholder="Software de control, drivers, aplicaciones de configuración, etc..."
            rows={3}
            error={errors.software_incluido}
          />
        </FormField>

        <FormField label="Compatibilidad" error={errors.compatibilidad}>
          <FormTextarea
            name="compatibilidad"
            value={formData.compatibilidad}
            onChange={handleChange}
            placeholder="Programas compatibles: Zoom, Teams, Skype, OBS, etc..."
            rows={3}
            error={errors.compatibilidad}
          />
        </FormField>
      </FormSection>

      {/* Section: Accesorios y Notas */}
      <FormSection title="Accesorios y Notas" color="purple">
        <FormField label="Accesorios" error={errors.accesorios}>
          <FormTextarea
            name="accesorios"
            value={formData.accesorios}
            onChange={handleChange}
            placeholder="Soporte, cable USB, manual, caja original, etc..."
            rows={3}
            error={errors.accesorios}
          />
        </FormField>

        <FormField label="Notas y Observaciones" error={errors.notas}>
          <FormTextarea
            name="notas"
            value={formData.notas}
            onChange={handleChange}
            placeholder="Notas adicionales sobre la webcam, problemas conocidos, historial de uso, etc..."
            rows={4}
            error={errors.notas}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
