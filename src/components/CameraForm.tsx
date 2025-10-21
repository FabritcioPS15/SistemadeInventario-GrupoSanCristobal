import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase, Location, CameraDisk } from '../lib/supabase';
import CameraDiskManager from './CameraDiskManager';

type Camera = {
  id: string;
  name: string;
  location_id?: string;
  url?: string; // Hacer nullable para IVMS y ESVIZ
  username?: string;
  password?: string;
  ip_address?: string;
  port?: string;
  brand?: string;
  model?: string;
  status: 'active' | 'inactive' | 'maintenance';
  notes?: string;
  access_type?: 'url' | 'ivms' | 'esviz'; // Tipo de acceso
  auth_code?: string; // Código de autenticación para IVMS y ESVIZ
  created_at: string;
  updated_at: string;
};

type CameraFormProps = {
  onClose: () => void;
  onSave: () => void;
  editCamera?: Camera;
};

export default function CameraForm({ onClose, onSave, editCamera }: CameraFormProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking' | null>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [cameraDisks, setCameraDisks] = useState<CameraDisk[]>([]);
  const [showDiskManager, setShowDiskManager] = useState(false);

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
    // Nuevos campos para tipos de acceso
    access_type: editCamera?.access_type || 'url', // 'url', 'ivms', 'esviz'
    auth_code: editCamera?.auth_code || '', // Código de autenticación para IVMS y ESVIZ
    display_count: (editCamera as any)?.display_count ?? '',
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  // Detectar cambios en el formulario
  useEffect(() => {
    if (editCamera) {
      const originalData = {
        name: editCamera.name,
        location_id: editCamera.location_id || '',
        url: editCamera.url || '',
        username: editCamera.username || '',
        password: editCamera.password || '',
        ip_address: editCamera.ip_address || '',
        port: editCamera.port || '',
        brand: editCamera.brand || '',
        model: editCamera.model || '',
        status: editCamera.status,
        notes: editCamera.notes || '',
        access_type: editCamera.access_type || 'url',
        auth_code: editCamera.auth_code || '',
      };
      
      const hasFormChanges = JSON.stringify(originalData) !== JSON.stringify(formData);
      setHasChanges(hasFormChanges);
    }
  }, [formData, editCamera]);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (data) setLocations(data);
  };

  // Funciones de validación
  const validateIPAddress = (ip: string): boolean => {
    if (!ip) return true; // Campo opcional
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  const validateURL = (url: string): boolean => {
    if (!url) return false; // Campo requerido
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validatePort = (port: string): boolean => {
    if (!port) return true; // Campo opcional
    const portNum = parseInt(port);
    return portNum >= 1 && portNum <= 65535;
  };

  const checkDuplicateCameraName = async (name: string, currentCameraId?: string): Promise<boolean> => {
    if (!name) return false; // Campo requerido
    
    const { data, error } = await supabase
      .from('cameras')
      .select('id')
      .eq('name', name);
    
    if (error) {
      console.error('Error checking duplicate camera name:', error);
      return false;
    }
    
    // Si estamos editando, excluir la cámara actual
    if (currentCameraId && data) {
      // Retornar true si no hay duplicados (excluyendo la cámara actual)
      return !data.some(camera => camera.id !== currentCameraId);
    }
    
    // Retornar true si no hay duplicados
    return data?.length === 0;
  };

  const validateField = async (fieldName: string, value: string) => {
    setValidationStatus(prev => ({ ...prev, [fieldName]: 'checking' }));
    
    let isValid = true;
    let errorMessage = '';

    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          isValid = false;
          errorMessage = 'El nombre es requerido';
        } else {
          const isUnique = await checkDuplicateCameraName(value, editCamera?.id);
          if (!isUnique) {
            isValid = false;
            errorMessage = 'Este nombre de cámara ya está en uso';
          }
        }
        break;
      
      case 'url':
        if (!value.trim()) {
          isValid = false;
          errorMessage = 'La URL es requerida';
        } else if (!validateURL(value)) {
          isValid = false;
          errorMessage = 'URL inválida (debe incluir http:// o https://)';
        }
        break;
      
      
      case 'auth_code':
        if (!value.trim()) {
          isValid = false;
          errorMessage = 'El código de autenticación es requerido';
        }
        break;
      
      case 'ip_address':
        if (value && !validateIPAddress(value)) {
          isValid = false;
          errorMessage = 'Formato de IP inválido (ej: 192.168.1.1)';
        }
        break;
      
      case 'port':
        if (value && !validatePort(value)) {
          isValid = false;
          errorMessage = 'Puerto inválido (1-65535)';
        }
        break;
    }

    setValidationStatus(prev => ({ ...prev, [fieldName]: isValid ? 'valid' : 'invalid' }));
    setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 Iniciando envío del formulario de cámara...');
    console.log('📋 Datos del formulario:', formData);
    console.log('✏️ Editando cámara:', editCamera ? 'Sí' : 'No');
    
    // Validar campos requeridos
    const requiredFields = ['name', 'status'];
    const newErrors: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = 'Este campo es requerido';
      }
    });

    // Validar según el tipo de acceso seleccionado
    if (formData.access_type === 'url' && !formData.url) {
      newErrors.url = 'La URL es requerida';
    }

    // Validar código de autenticación para IVMS y ESVIZ
    if ((formData.access_type === 'ivms' || formData.access_type === 'esviz') && !formData.auth_code) {
      newErrors.auth_code = 'El código de autenticación es requerido';
    }

    // Validar campos con formato específico
    if (formData.url && !validateURL(formData.url)) {
      newErrors.url = 'URL inválida';
    }
    
    if (formData.ip_address && !validateIPAddress(formData.ip_address)) {
      newErrors.ip_address = 'Formato de IP inválido';
    }
    
    if (formData.port && !validatePort(formData.port)) {
      newErrors.port = 'Puerto inválido';
    }

    // Validar display_count numérico no negativo
    if (formData.display_count !== '' && Number.isNaN(Number(formData.display_count))) {
      newErrors.display_count = 'Debe ser un número';
    } else if (formData.display_count !== '' && Number(formData.display_count) < 0) {
      newErrors.display_count = 'No puede ser negativo';
    }

    // Verificar también errores de validación en tiempo real
    const currentErrors = { ...errors, ...newErrors };
    console.log('🔍 Errores de validación:', currentErrors);
    
    // Filtrar errores vacíos o nulos
    const validErrors = Object.entries(currentErrors).filter(([key, value]) => 
      value && value.trim() !== ''
    );
    
    console.log('🔍 Errores válidos:', validErrors);
    setErrors(currentErrors);

    if (validErrors.length > 0) {
      console.log('❌ Validación falló, no se puede guardar');
      console.log('❌ Errores encontrados:', validErrors);
      return;
    }

    // Verificar nombre duplicado antes de guardar
    if (formData.name) {
      console.log('🔍 Verificando nombre duplicado...');
      const isNameUnique = await checkDuplicateCameraName(formData.name, editCamera?.id);
      if (!isNameUnique) {
        console.log('❌ Nombre duplicado encontrado');
        setErrors({ name: 'Este nombre de cámara ya está en uso' });
        return;
      }
      console.log('✅ Nombre único confirmado');
    }

    // Confirmar cambios si estamos editando
    if (editCamera && hasChanges) {
      const confirmed = window.confirm(
        '¿Estás seguro de que quieres guardar los cambios realizados?'
      );
      if (!confirmed) {
        console.log('❌ Usuario canceló la operación');
        return;
      }
    }

    setLoading(true);
    console.log('⏳ Iniciando operación de guardado...');

    // Preparar datos según el tipo de acceso
    let dataToSave: any = {
      name: formData.name,
      location_id: formData.location_id || null,
      username: formData.username || null,
      password: formData.password || null,
      brand: formData.brand || null,
      model: formData.model || null,
      status: formData.status,
      notes: formData.notes || null,
      access_type: formData.access_type, // Incluir tipo de acceso
      auth_code: formData.auth_code || null, // Incluir código de autenticación
      display_count: formData.display_count === '' ? null : Number(formData.display_count),
      updated_at: new Date().toISOString(),
    };

    // Asignar URL según el tipo de acceso
    switch (formData.access_type) {
      case 'url':
        dataToSave.url = formData.url;
        dataToSave.ip_address = formData.ip_address || null;
        dataToSave.port = formData.port || null;
        break;
      case 'ivms':
        dataToSave.url = null; // IVMS no usa URL
        dataToSave.ip_address = null; // IVMS no usa IP
        dataToSave.port = null; // IVMS no usa puerto
        break;
      case 'esviz':
        dataToSave.url = null; // ESVIZ no usa URL
        dataToSave.ip_address = null; // ESVIZ no usa IP
        dataToSave.port = null; // ESVIZ no usa puerto
        break;
    }

    console.log('💾 Datos a guardar:', dataToSave);
    console.log('🔍 Tipo de acceso seleccionado:', formData.access_type);
    console.log('🔍 Código de autenticación:', formData.auth_code);

    try {
      const isUndefinedColumnError = (err: any) => {
        const msg = (err?.message || '').toLowerCase();
        const code = err?.code || err?.details || '';
        return msg.includes('display_count') || code === '42703';
      };

      const saveWith = async (includeDisplayCount: boolean) => {
        const payload = { ...dataToSave };
        if (!includeDisplayCount) {
          delete (payload as any).display_count;
        }

        if (editCamera) {
          console.log('🔄 Actualizando cámara existente...');
          console.log('🆔 ID de la cámara a actualizar:', editCamera.id);
          console.log('📋 Datos originales:', editCamera);

          // Verificar que la cámara existe antes de actualizar
          const { data: existingCamera, error: checkError } = await supabase
            .from('cameras')
            .select('id, name')
            .eq('id', editCamera.id)
            .single();

          console.log('🔍 Verificación de existencia:', { existingCamera, checkError });

          if (checkError || !existingCamera) {
            throw new Error('La cámara no existe en la base de datos. Recarga la página e intenta nuevamente.');
          }

          const { data: result, error } = await supabase
            .from('cameras')
            .update(payload)
            .eq('id', editCamera.id)
            .select();

          if (error) throw error;
          if (!result || result.length === 0) throw new Error('No se encontró la cámara para actualizar.');
          return result[0];
        } else {
          console.log('➕ Creando nueva cámara...');
          console.log('📋 Datos a insertar:', payload);

          const { data: result, error } = await supabase
            .from('cameras')
            .insert([payload])
            .select();

          if (error) throw error;
          if (!result || result.length === 0) throw new Error('No se insertó ninguna cámara');
          return result[0];
        }
      };

      let saved;
      try {
        saved = await saveWith(true);
      } catch (err: any) {
        if (isUndefinedColumnError(err)) {
          console.warn('⚠️ Column display_count no existe aún, reintentando sin ese campo...');
          saved = await saveWith(false);
        } else {
          throw err;
        }
      }

      console.log('✅ Cámara guardada exitosamente:', saved);

      setLoading(false);
      console.log('🎉 Operación completada, cerrando formulario...');
      onSave();
    } catch (err) {
      console.error('❌ Error inesperado:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrors({ submit: 'Error al guardar la cámara: ' + msg });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Validar campos específicos en tiempo real (con debounce)
    const fieldsToValidate = ['name', 'url', 'ip_address', 'port', 'auth_code'];
    if (fieldsToValidate.includes(name)) {
      // Debounce para evitar muchas validaciones
      setTimeout(() => {
        validateField(name, value);
      }, 500);
    }
  };

  // Función helper para renderizar el estado de validación
  const renderValidationIcon = (fieldName: string) => {
    const status = validationStatus[fieldName];
    if (status === 'checking') {
      return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    } else if (status === 'valid') {
      return <CheckCircle size={16} className="text-green-500" />;
    } else if (status === 'invalid') {
      return <AlertCircle size={16} className="text-red-500" />;
    }
    return null;
  };

  // Función helper para obtener clases CSS del campo
  const getFieldClasses = (fieldName: string) => {
    const baseClasses = "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2";
    const status = validationStatus[fieldName];
    
    if (status === 'invalid' || errors[fieldName]) {
      return `${baseClasses} border-red-300 focus:ring-red-500`;
    } else if (status === 'valid') {
      return `${baseClasses} border-green-300 focus:ring-green-500`;
    }
    
    return `${baseClasses} border-gray-300 focus:ring-blue-500`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {editCamera ? 'Editar Cámara' : 'Nueva Cámara'}
            </h2>
            {editCamera && hasChanges && (
              <p className="text-sm text-orange-600 mt-1">
                ⚠️ Tienes cambios sin guardar
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mensaje de error general */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle size={20} className="text-red-500 mr-2" />
                <p className="text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={getFieldClasses('name')}
                  placeholder="Ej: Cámara Principal"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {renderValidationIcon('name')}
                </div>
              </div>
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ubicación
            </label>
            <select
              name="location_id"
              value={formData.location_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin ubicación específica</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Acceso *
            </label>
            <select
              name="access_type"
              value={formData.access_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="url">URL Directa</option>
              <option value="ivms">IVMS (Hikvision)</option>
              <option value="esviz">ESVIZ (Dahua)</option>
            </select>
          </div>

          {/* Campos de acceso según el tipo seleccionado */}
          {formData.access_type === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL *
              </label>
              <div className="relative">
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleChange}
                  required
                  className={getFieldClasses('url')}
                  placeholder="http://192.168.1.100:8080"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {renderValidationIcon('url')}
                </div>
              </div>
              {errors.url && (
                <p className="text-red-500 text-sm mt-1">{errors.url}</p>
              )}
            </div>
          )}


          {/* Campos adicionales de IP y Puerto solo para URL Directa */}
          {formData.access_type === 'url' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IP Address (Opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="ip_address"
                    value={formData.ip_address}
                    onChange={handleChange}
                    className={getFieldClasses('ip_address')}
                    placeholder="192.168.1.100"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {renderValidationIcon('ip_address')}
                  </div>
                </div>
                {errors.ip_address && (
                  <p className="text-red-500 text-sm mt-1">{errors.ip_address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Puerto (Opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="port"
                    value={formData.port}
                    onChange={handleChange}
                    className={getFieldClasses('port')}
                    placeholder="8080"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {renderValidationIcon('port')}
                  </div>
                </div>
                {errors.port && (
                  <p className="text-red-500 text-sm mt-1">{errors.port}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Campo de código de autenticación para IVMS y ESVIZ */}
          {(formData.access_type === 'ivms' || formData.access_type === 'esviz') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de Autenticación *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="auth_code"
                  value={formData.auth_code}
                  onChange={handleChange}
                  required
                  className={getFieldClasses('auth_code')}
                  placeholder="Código de autenticación"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {renderValidationIcon('auth_code')}
                </div>
              </div>
              {errors.auth_code && (
                <p className="text-red-500 text-sm mt-1">{errors.auth_code}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nº de vistas a visualizar
              </label>
              <input
                type="number"
                name="display_count"
                value={formData.display_count}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 4"
                min={0}
              />
              {errors.display_count && (
                <p className="text-red-500 text-sm mt-1">{errors.display_count}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hikvision"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modelo
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="DS-2CD2142FWD-I"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Información adicional..."
            />
          </div>

          {/* Botón para gestionar discos */}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDiskManager(!showDiskManager);
              }}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              {showDiskManager ? 'Ocultar' : 'Gestionar'} Discos de Almacenamiento
            </button>
            
            {showDiskManager && (
              <div className="mt-4">
                {editCamera ? (
                  <CameraDiskManager 
                    cameraId={editCamera.id} 
                    onDisksChange={setCameraDisks}
                  />
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Información</span>
                    </div>
                    <p className="text-yellow-700 text-sm mt-2">
                      Para gestionar discos de almacenamiento, primero debes crear la cámara y luego editarla.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || Object.keys(errors).some(key => key !== 'submit' && errors[key])}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  {editCamera ? 'Actualizar' : 'Crear'} Cámara
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}