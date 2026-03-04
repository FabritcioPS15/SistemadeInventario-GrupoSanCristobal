import { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

type MTCAccesoType = {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  access_type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

type MTCAccesoFormProps = {
  onClose: () => void;
  onSave: () => void;
  editAcceso?: MTCAccesoType;
};

export default function MTCAccesoForm({ onClose, onSave, editAcceso }: MTCAccesoFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: editAcceso?.name || '',
    url: editAcceso?.url || '',
    username: editAcceso?.username || '',
    password: editAcceso?.password || '',
    access_type: editAcceso?.access_type || 'sistema',
    notes: editAcceso?.notes || '',
  });

  const validateURL = (url: string): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del acceso es requerido';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'La URL es requerida';
    } else if (!validateURL(formData.url)) {
      newErrors.url = 'Formato de URL inválido';
    }

    if (!formData.access_type) {
      newErrors.access_type = 'El tipo de acceso es requerido';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    const dataToSave = {
      name: formData.name.trim(),
      url: formData.url.trim(),
      username: formData.username.trim() || null,
      password: formData.password || null,
      access_type: formData.access_type,
      notes: formData.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editAcceso) {
        const { error } = await supabase
          .from('mtc_accesos')
          .update(dataToSave)
          .eq('id', editAcceso.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar el acceso MTC: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('mtc_accesos')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear el acceso MTC: ' + error.message });
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
      title={editAcceso ? 'Editar Acceso MTC' : 'Nuevo Acceso MTC'}
      subtitle="Módulo de Gestión de Accesos MTC"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Shield size={24} className="text-blue-600" />}
    >
      {/* Section: Información Principal */}
      <FormSection title="Información del Acceso" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Nombre del Acceso" required error={errors.name}>
            <FormInput
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Sistema Principal, Portal de Trámites"
              required
              error={errors.name}
            />
          </FormField>

          <FormField label="URL del Sistema" required error={errors.url}>
            <FormInput
              type="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="https://ejemplo.mtc.gob.pe"
              required
              error={errors.url}
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
              <option value="sistema">Sistema Interno</option>
              <option value="portal">Portal Web</option>
              <option value="api">API/WS</option>
              <option value="bd">Base de Datos</option>
              <option value="externo">Acceso Externo</option>
            </FormSelect>
          </FormField>

          <FormField label="Usuario" error={errors.username}>
            <FormInput
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="usuario@mtc.gob.pe"
              error={errors.username}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Credenciales */}
      <FormSection title="Credenciales de Acceso" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Contraseña" error={errors.password}>
            <div className="relative">
              <FormInput
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Contraseña del sistema"
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
        </div>
      </FormSection>

      {/* Section: Información Adicional */}
      <FormSection title="Información Adicional" color="amber">
        <FormField label="Notas y Observaciones" error={errors.notes}>
          <FormTextarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Detalles adicionales sobre el acceso, restricciones, contactos, etc..."
            rows={4}
            error={errors.notes}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
