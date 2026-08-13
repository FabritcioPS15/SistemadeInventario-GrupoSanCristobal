import { useState, useEffect } from 'react';

import { Server as ServerIcon } from 'lucide-react';

import { supabase, Location, Server } from '../../../shared/services/supabase';

import BaseForm, { FormSection, FormField, FormInput, FormSelect } from '../../../shared/components/forms/BaseForm';

import { useNotify } from '../../../shared/hooks/useNotify';



interface ServerFormProps {

  editServer?: Server;

  onClose: () => void;

  onSave: () => void;

}



export default function ServerForm({ editServer, onClose, onSave }: ServerFormProps) {

  const { success: notifySuccess } = useNotify();

  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [locations, setLocations] = useState<Location[]>([]);



  const [formData, setFormData] = useState<{

    name: string;

    location_id: string;

    ip_address: string;

    anydesk_id: string;

    anydesk_password: string;

    username: string;

    password: string;

    backup_scanner_password: string;

  }>({

    name: editServer?.name || '',

    location_id: editServer?.location_id || '',

    ip_address: editServer?.ip_address || '',

    anydesk_id: editServer?.anydesk_id || '',

    anydesk_password: editServer?.anydesk_password || '',

    username: editServer?.username || '',

    password: editServer?.password || '',

    backup_scanner_password: editServer?.backup_scanner_password || ''

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

      anydesk_password: formData.anydesk_password.trim() || null,

      username: formData.username.trim() || null,

      password: formData.password.trim() || null,

      backup_scanner_password: formData.backup_scanner_password.trim() || null,

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

      notifySuccess(editServer ? 'Servidor actualizado correctamente' : 'Servidor creado correctamente', editServer ? 'Actualizado' : 'Creado');

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
      title={editServer ? 'Editar Servidor' : 'Nuevo Servidor'}
      subtitle="Módulo de Gestión de Servidores"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<ServerIcon size={24} className="text-blue-600" />}
    >

      {/* Section: Información Básica */}
      <FormSection title="Información Básica" color="blue" columns={4}>
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



        <FormField label="Clave de Anydesk">

          <FormInput

            type="password"

            name="anydesk_password"

            value={formData.anydesk_password}

            onChange={handleChange}

            placeholder="Contraseña de Anydesk"

          />


        </FormField>

      </FormSection>





      {/* Section: Credenciales de Acceso */}

      <FormSection title="Credenciales de Acceso Administrador de Windows" color="emerald" columns={4}>

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



        <FormField label="Contraseña Backup Scanner">

          <FormInput

            type="password"

            name="backup_scanner_password"

            value={formData.backup_scanner_password}

            onChange={handleChange}

            placeholder="Contraseña del backup scanner"

          />

        </FormField>
      </FormSection>







    </BaseForm>

  );

}

