import { useState, useEffect } from 'react';
import { Server, HelpCircle } from 'lucide-react';
import { supabase, Location, WindowsCredential } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

interface ServerFormProps {
  editServer?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function ServerForm({ editServer, onClose, onSave }: ServerFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<Location[]>([]);

  const [formData, setFormData] = useState({
    name: editServer?.name || '',
    location_id: editServer?.location_id || '',
    ip_address: editServer?.ip_address || '',
    anydesk_id: editServer?.anydesk_id || '',
    username: editServer?.username || '',
    password: editServer?.password || '',
    notes: editServer?.notes || '',
    windows_credentials: editServer?.windows_credentials || []
  });

  const [newCredential, setNewCredential] = useState<WindowsCredential>({
    username: '',
    password: '',
    description: ''
  });

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

  const validateAnydesk = (anydeskId: string): boolean => {
    const anydeskRegex = /^\d{8,12}$/;
    return anydeskRegex.test(anydeskId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del servidor es requerido';
    }

    if (!formData.location_id) {
      newErrors.location_id = 'La ubicación es requerida';
    }

    if (!formData.ip_address.trim()) {
      newErrors.ip_address = 'La dirección IP es requerida';
    } else if (!validateIP(formData.ip_address)) {
      newErrors.ip_address = 'Formato de IP inválido';
    }

    if (formData.anydesk_id && !validateAnydesk(formData.anydesk_id)) {
      newErrors.anydesk_id = 'Formato de Anydesk inválido (8-12 dígitos)';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    const dataToSave = {
      name: formData.name.trim(),
      location_id: formData.location_id,
      ip_address: formData.ip_address.trim(),
      anydesk_id: formData.anydesk_id.trim() || null,
      username: formData.username.trim() || null,
      password: formData.password.trim() || null,
      notes: formData.notes.trim() || null,
      windows_credentials: formData.windows_credentials,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editServer?.id) {
        const { error } = await supabase
          .from('servers')
          .update(dataToSave)
          .eq('id', editServer.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar el servidor: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('servers')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear el servidor: ' + error.message });
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

  const addCredential = () => {
    if (newCredential.username.trim() && newCredential.password?.trim()) {
      setFormData(prev => ({
        ...prev,
        windows_credentials: [...prev.windows_credentials, { ...newCredential }]
      }));
      setNewCredential({ username: '', password: '', description: '' });
    }
  };

  const removeCredential = (index: number) => {
    setFormData(prev => ({
      ...prev,
      windows_credentials: prev.windows_credentials.filter((_, i) => i !== index)
    }));
  };

  return (
    <BaseForm
      title={editServer ? 'Editar Servidor' : 'Nuevo Servidor'}
      subtitle="Módulo de Gestión de Servidores"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Server size={24} className="text-blue-600" />}
    >
      {/* Help Section */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <HelpCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-900">Guía Rápida</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>IP válida:</strong> Formato IPv4 (ej: 192.168.1.100)</li>
              <li>• <strong>AnyDesk:</strong> 8-12 dígitos numéricos (ej: 123456789)</li>
              <li>• <strong>Credenciales:</strong> Agregue usuarios de Windows para acceso remoto</li>
              <li>• <strong>Notas:</strong> Incluya configuraciones especiales o servicios instalados</li>
            </ul>
          </div>
        </div>
      </div>
      {/* Section: Información Básica */}
      <FormSection title="Información Básica" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Nombre del Servidor" required error={errors.name}>
            <FormInput
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: SRV-DB-01, SRV-WEB-02"
              required
              error={errors.name}
            />
          </FormField>

          <FormField label="Ubicación" required error={errors.location_id}>
            <FormSelect
              name="location_id"
              value={formData.location_id}
              onChange={handleChange}
              required
              error={errors.location_id}
            >
              <option value="">Seleccionar ubicación</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Dirección IP" required error={errors.ip_address}>
            <FormInput
              type="text"
              name="ip_address"
              value={formData.ip_address}
              onChange={handleChange}
              placeholder="Ej: 192.168.1.100 (formato IPv4)"
              required
              error={errors.ip_address}
            />
            <p className="text-xs text-gray-500 mt-1">Formato: 4 números separados por puntos (0-255)</p>
          </FormField>

          <FormField label="ID de Anydesk" error={errors.anydesk_id}>
            <FormInput
              type="text"
              name="anydesk_id"
              value={formData.anydesk_id}
              onChange={handleChange}
              placeholder="Ej: 123456789 (8-12 dígitos)"
              error={errors.anydesk_id}
            />
            <p className="text-xs text-gray-500 mt-1">Opcional: 8-12 dígitos numéricos para acceso remoto</p>
          </FormField>
        </div>
      </FormSection>

      {/* Section: Credenciales de Acceso */}
      <FormSection title="Credenciales de Acceso Principal" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Usuario" error={errors.username}>
            <FormInput
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Nombre de usuario"
              error={errors.username}
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
      </FormSection>

      {/* Section: Credenciales de Windows */}
      <FormSection title="Credenciales de Windows" color="amber">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <FormField label="Usuario">
              <FormInput
                type="text"
                value={newCredential.username}
                onChange={(e) => setNewCredential(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Usuario de Windows"
              />
            </FormField>

            <FormField label="Contraseña">
              <FormInput
                type="password"
                value={newCredential.password}
                onChange={(e) => setNewCredential(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Contraseña"
              />
            </FormField>

            <FormField label="Descripción">
              <FormInput
                type="text"
                value={newCredential.description}
                onChange={(e) => setNewCredential(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: Administrador, Usuario SQL"
              />
            </FormField>

            <div className="flex items-end">
              <button
                type="button"
                onClick={addCredential}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>

          {formData.windows_credentials.length > 0 && (
            <div className="space-y-2">
              {formData.windows_credentials.map((cred, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{cred.username}</div>
                    <div className="text-sm text-gray-500">{cred.description || 'Sin descripción'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCredential(index)}
                    className="ml-4 text-red-500 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      {/* Section: Notas */}
      <FormSection title="Notas Adicionales" color="purple">
        <FormField label="Notas y Observaciones" error={errors.notes}>
          <FormTextarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Notas adicionales sobre el servidor, configuraciones especiales, servicios instalados, etc..."
            rows={4}
            error={errors.notes}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
