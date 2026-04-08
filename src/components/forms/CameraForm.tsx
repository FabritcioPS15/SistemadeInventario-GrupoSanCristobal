import { useState, useEffect } from 'react';
import { Camera, Eye, EyeOff } from 'lucide-react';
import { supabase, Location } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';
import CameraDiskManager from '../CameraDiskManager';

type CameraType = {
  id: string;
  name: string;
  location_id?: string;
  url?: string;
  username?: string;
  password?: string;
  ip_address?: string;
  port?: string;
  brand?: string;
  model?: string;
  status: 'active' | 'inactive' | 'maintenance';
  notes?: string;
  access_type?: 'url' | 'ivms' | 'esviz';
  auth_code?: string;
  created_at: string;
  updated_at: string;
};

type CameraFormProps = {
  onClose: () => void;
  onSave: () => void;
  editCamera?: CameraType;
};

export default function CameraForm({ onClose, onSave, editCamera }: CameraFormProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showAuthCode, setShowAuthCode] = useState(false);

  const [formData, setFormData] = useState({
    name: editCamera?.name || '',
    location_id: editCamera?.location_id || '',
    url: editCamera?.url || '',
    username: editCamera?.username || '',
    password: editCamera?.password || '',
    ip_address: editCamera?.ip_address || '',
    port: editCamera?.port || '',
    brand: editCamera?.brand || '',
    model: editCamera?.model || '',
    status: editCamera?.status || 'active',
    notes: editCamera?.notes || '',
    access_type: editCamera?.access_type || 'url',
    auth_code: editCamera?.auth_code || '',
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

  const validateIP = (ip: string): boolean => {
    if (!ip) return true; // Campo opcional
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  const validatePort = (port: string): boolean => {
    if (!port) return true; // Campo opcional
    const portNum = parseInt(port);
    return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la cámara es requerido';
    }

    if (formData.ip_address && !validateIP(formData.ip_address)) {
      newErrors.ip_address = 'Formato de IP inválido';
    }

    if (formData.port && !validatePort(formData.port)) {
      newErrors.port = 'El puerto debe estar entre 1 y 65535';
    }

    if (formData.access_type !== 'url' && !formData.auth_code) {
      newErrors.auth_code = 'El código de autenticación es requerido para IVMS/ESVIZ';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    const dataToSave = {
      name: formData.name.trim(),
      location_id: formData.location_id || null,
      url: formData.url.trim() || null,
      username: formData.username.trim() || null,
      password: formData.password || null,
      ip_address: formData.ip_address.trim() || null,
      port: formData.port || null,
      brand: formData.brand.trim() || null,
      model: formData.model.trim() || null,
      status: formData.status,
      notes: formData.notes.trim() || null,
      access_type: formData.access_type,
      auth_code: formData.auth_code.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editCamera) {
        const { error } = await supabase
          .from('cameras')
          .update(dataToSave)
          .eq('id', editCamera.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar la cámara: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('cameras')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear la cámara: ' + error.message });
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
      title={editCamera ? 'Editar Cámara' : 'Nueva Cámara'}
      subtitle="Módulo de Gestión de Cámaras"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Camera size={24} className="text-blue-600" />}
    >
      {/* Section: Información Principal */}
      <FormSection title="Información de la Cámara" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Nombre de la Cámara" required error={errors.name}>
            <FormInput
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Cámara Principal, Entrada 1"
              required
              error={errors.name}
            />
          </FormField>

          <FormField label="Ubicación" error={errors.location_id}>
            <FormSelect
              name="location_id"
              value={formData.location_id}
              onChange={handleChange}
              error={errors.location_id}
            >
              <option value="">Sin ubicación específica</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Estado" required error={errors.status}>
            <FormSelect
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              error={errors.status}
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
              <option value="maintenance">En Mantenimiento</option>
            </FormSelect>
          </FormField>

          <FormField label="Marca" error={errors.brand}>
            <FormInput
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="Ej: Hikvision, Dahua, Axis"
              error={errors.brand}
            />
          </FormField>

          <FormField label="Modelo" error={errors.model}>
            <FormInput
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="Ej: DS-2CD2043G0-I, IPC-HFW4431R-Z"
              error={errors.model}
            />
          </FormField>

          <FormField label="Tipo de Acceso" required error={errors.access_type}>
            <FormSelect
              name="access_type"
              value={formData.access_type}
              onChange={handleChange}
              required
              error={errors.access_type}
            >
              <option value="url">URL Directa</option>
              <option value="ivms">IVMS 4200</option>
              <option value="esviz">ESVIZ</option>
            </FormSelect>
          </FormField>
        </div>
      </FormSection>

      {/* Section: Configuración de Red */}
      <FormSection title="Configuración de Red" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField label="Dirección IP" error={errors.ip_address}>
            <FormInput
              type="text"
              name="ip_address"
              value={formData.ip_address}
              onChange={handleChange}
              placeholder="192.168.1.100"
              error={errors.ip_address}
            />
          </FormField>

          <FormField label="Puerto" error={errors.port}>
            <FormInput
              type="number"
              name="port"
              value={formData.port}
              onChange={handleChange}
              placeholder="554"
              error={errors.port}
            />
          </FormField>

          <FormField label="URL de Acceso" error={errors.url}>
            <FormInput
              type="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="rtsp://192.168.1.100:554/stream"
              error={errors.url}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Credenciales */}
      <FormSection title="Credenciales de Acceso" color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Usuario" error={errors.username}>
            <FormInput
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="admin"
              error={errors.username}
            />
          </FormField>

          <FormField label="Contraseña" error={errors.password}>
            <div className="relative">
              <FormInput
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Contraseña de la cámara"
                error={errors.password}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </FormField>

          {formData.access_type !== 'url' && (
            <FormField label="Código de Autenticación" required error={errors.auth_code}>
              <div className="relative">
                <FormInput
                  type={showAuthCode ? 'text' : 'password'}
                  name="auth_code"
                  value={formData.auth_code}
                  onChange={handleChange}
                  placeholder="Código para IVMS/ESVIZ"
                  required
                  error={errors.auth_code}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthCode(!showAuthCode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showAuthCode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FormField>
          )}
        </div>
      </FormSection>

      {/* Section: Información Adicional */}
      <FormSection title="Información Adicional" color="purple">
        <FormField label="Notas y Observaciones" error={errors.notes}>
          <FormTextarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Detalles adicionales sobre la cámara, configuraciones especiales, etc..."
            rows={4}
            error={errors.notes}
          />
        </FormField>
      </FormSection>

      {/* Section: Discos de Almacenamiento (Solo si ya existe en la DB) */}
      {editCamera?.id && (
        <FormSection title="Discos Duros (DVR/NVR)" color="indigo">
          <div className="bg-white p-4 border border-slate-200 rounded-lg">
            <CameraDiskManager cameraId={editCamera.id} />
          </div>
        </FormSection>
      )}
    </BaseForm>
  );
}
