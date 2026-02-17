import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, Plus, X } from 'lucide-react';
import { supabase, ResourceCredential } from '../../lib/supabase';

type MTCAccesoFormProps = {
  onClose: () => void;
  onSave: () => void;
  editAcceso?: any;
};

export default function MTCAccesoForm({ onClose, onSave, editAcceso }: MTCAccesoFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking' | null>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState({
    name: editAcceso?.name || '',
    url: editAcceso?.url || '',
    username: editAcceso?.username || '',
    password: editAcceso?.password || '',
    access_type: editAcceso?.access_type || 'web',
    notes: editAcceso?.notes || '',
    resource_credentials: (editAcceso?.resource_credentials || []) as Partial<ResourceCredential>[],
  });

  useEffect(() => {
    if (editAcceso) {
      const originalData = {
        name: editAcceso.name,
        url: editAcceso.url,
        username: editAcceso.username || '',
        password: editAcceso.password || '',
        access_type: editAcceso.access_type,
        notes: editAcceso.notes || '',
        resource_credentials: editAcceso.resource_credentials || [],
      };
      const hasFormChanges = JSON.stringify(originalData) !== JSON.stringify(formData);
      setHasChanges(hasFormChanges);
    }
  }, [formData, editAcceso]);

  const validateURL = (url: string): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const checkDuplicateAccessName = async (name: string, currentAccessId?: string): Promise<boolean> => {
    if (!name) return false;
    const { data, error } = await supabase
      .from('mtc_accesos')
      .select('id')
      .eq('name', name);
    if (error) return false;
    if (currentAccessId && data) {
      return !data.some(access => access.id !== currentAccessId);
    }
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
        } else if (value.trim().length < 2) {
          isValid = false;
          errorMessage = 'El nombre debe tener al menos 2 caracteres';
        } else {
          const isUnique = await checkDuplicateAccessName(value, editAcceso?.id);
          if (!isUnique) {
            isValid = false;
            errorMessage = 'Este nombre de acceso ya está en uso';
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
    }
    setValidationStatus(prev => ({ ...prev, [fieldName]: isValid ? 'valid' : 'invalid' }));
    setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = ['name', 'url', 'access_type'];
    const newErrors: Record<string, string> = {};
    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = 'Este campo es requerido';
      }
    });
    if (formData.url && !validateURL(formData.url)) {
      newErrors.url = 'URL inválida';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (editAcceso && hasChanges) {
      if (!window.confirm('¿Estás seguro de que quieres guardar los cambios?')) return;
    }

    setLoading(true);
    const { resource_credentials, ...submitData } = formData;
    const dataToSave = { ...submitData, updated_at: new Date().toISOString() };

    try {
      let resource_id = editAcceso?.id;
      if (editAcceso) {
        const { error } = await supabase.from('mtc_accesos').update(dataToSave).eq('id', editAcceso.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('mtc_accesos').insert([dataToSave]).select();
        if (error) throw error;
        if (data) resource_id = data[0].id;
      }

      if (resource_id) {
        await supabase.from('resource_credentials').delete().eq('resource_id', resource_id).eq('resource_type', 'mtc_acceso');
        if (resource_credentials.length > 0) {
          await supabase.from('resource_credentials').insert(
            resource_credentials.map(c => ({
              resource_id,
              resource_type: 'mtc_acceso',
              label: c.label || 'Accesos',
              username: c.username,
              password: c.password,
              notes: c.notes
            }))
          );
        }
      }
      setLoading(false);
      onSave();
    } catch (err: any) {
      console.error('Error saving:', err);
      setErrors({ submit: 'Error al guardar: ' + (err.message || err) });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (['name', 'url'].includes(name)) {
      setTimeout(() => validateField(name, value), 500);
    }
  };

  const getFieldClasses = (fieldName: string) => {
    const baseClasses = "w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all text-sm";
    const status = validationStatus[fieldName];
    if (status === 'invalid' || errors[fieldName]) return `${baseClasses} border-rose-300 focus:ring-rose-500 bg-rose-50/30`;
    if (status === 'valid') return `${baseClasses} border-emerald-300 focus:ring-emerald-500 bg-emerald-50/30`;
    return `${baseClasses} border-slate-200 focus:ring-blue-500 bg-white`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-lg font-black text-[#002855] uppercase tracking-tight">
            {editAcceso ? 'Editar Acceso MTC' : 'Nuevo Acceso MTC'}
          </h2>
          {editAcceso && hasChanges && (
            <p className="text-[10px] text-orange-600 mt-1 font-bold uppercase tracking-widest flex items-center gap-1">
              <AlertCircle size={12} /> Cambios sin guardar
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {errors.submit && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs font-bold text-rose-700 flex items-center gap-3">
            <AlertCircle size={18} /> <p>{errors.submit}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Nombre del Acceso *</label>
            <input name="name" value={formData.name} onChange={handleChange} required className={getFieldClasses('name')} placeholder="Ej: Portal MTC Principal" />
            {errors.name && <p className="text-rose-500 text-[10px] mt-1.5 font-bold uppercase">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Tipo de Acceso *</label>
            <select name="access_type" value={formData.access_type} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white font-bold text-slate-700">
              <option value="web">Web Service / Portal</option>
              <option value="api">API Endpoint</option>
              <option value="ftp">Servidor FTP</option>
              <option value="ssh">Acceso SSH</option>
              <option value="database">Base de Datos</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">URL de Destino *</label>
            <input type="url" name="url" value={formData.url} onChange={handleChange} required className={getFieldClasses('url')} placeholder="https://portal.mtc.gob.pe" />
            {errors.url && <p className="text-rose-500 text-[10px] mt-1.5 font-bold uppercase">{errors.url}</p>}
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span> Credenciales Principales
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Usuario / ID</label>
                <input name="username" value={formData.username} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono shadow-sm" placeholder="usuario@mtc.gob.pe" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contraseña / Token</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono shadow-sm" placeholder="••••••••" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-purple-600 rounded-full"></span> Cuentas Adicionales
              </h3>
              <button type="button" onClick={() => setFormData(p => ({ ...p, resource_credentials: [...p.resource_credentials, { label: '', username: '', password: '' }] }))} className="text-[10px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase tracking-widest px-2 py-1 bg-blue-50 rounded-lg border border-blue-100">
                <Plus size={12} /> Agregar Cuenta
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {formData.resource_credentials.map((cred, idx) => (
                <div key={idx} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 relative group animate-in zoom-in-95 duration-200">
                  <button type="button" onClick={() => setFormData(p => ({ ...p, resource_credentials: p.resource_credentials.filter((_, i) => i !== idx) }))} className="absolute -top-2 -right-2 p-1.5 bg-white border border-rose-200 rounded-full text-rose-500 shadow-md hover:bg-rose-500 hover:text-white transition-all">
                    <X size={12} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Etiqueta / Rol</label>
                      <input placeholder="Ej: Administrador" value={cred.label} onChange={e => {
                        const nc = [...formData.resource_credentials]; nc[idx].label = e.target.value;
                        setFormData(p => ({ ...p, resource_credentials: nc }));
                      }} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Usuario</label>
                      <input placeholder="Usuario" value={cred.username} onChange={e => {
                        const nc = [...formData.resource_credentials]; nc[idx].username = e.target.value;
                        setFormData(p => ({ ...p, resource_credentials: nc }));
                      }} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contraseña</label>
                      <input type="password" placeholder="••••••••" value={cred.password} onChange={e => {
                        const nc = [...formData.resource_credentials]; nc[idx].password = e.target.value;
                        setFormData(p => ({ ...p, resource_credentials: nc }));
                      }} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono" />
                    </div>
                  </div>
                </div>
              ))}
              {formData.resource_credentials.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No hay cuentas adicionales</p>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 pt-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Notas y Observaciones</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white resize-none" placeholder="Detalles técnicos u observaciones importantes..." />
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex gap-4 justify-end">
          <button type="button" onClick={onClose} disabled={loading} className="px-8 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all active:scale-95 shadow-sm">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-8 py-3 bg-[#002855] text-white text-[10px] font-black rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg flex items-center gap-3 uppercase tracking-[0.2em]">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><CheckCircle size={16} /> {editAcceso ? 'Actualizar' : 'Crear'} Acceso</>}
          </button>
        </div>
      </form>
    </div>
  );
}
