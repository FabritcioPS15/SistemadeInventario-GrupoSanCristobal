import { useState, useEffect } from 'react';
import { Building } from 'lucide-react';
import { supabase, Company } from '../../../shared/services/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect } from '../../../shared/components/forms/BaseForm';
import { useNotify } from '../../../shared/hooks/useNotify';

const BUSINESS_TYPE_OPTIONS = [
  { value: 'revisiones_tecnicas', label: 'Revisiones Técnicas' },
  { value: 'policlinico', label: 'Policlínico' },
  { value: 'escuela_conductores', label: 'Escuela de Conductores' },
  { value: 'oficinas_administrativas', label: 'Oficinas Administrativas' },
];

type CompanyFormProps = {
  onClose: () => void;
  onSave: () => void;
  editCompany?: Company;
};

export default function CompanyForm({ onClose, onSave, editCompany }: CompanyFormProps) {
  const { success: notifySuccess, error: notifyError } = useNotify();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: editCompany?.name || '',
    business_type: editCompany?.business_type || 'oficinas_administrativas',
    ruc: editCompany?.ruc || '',
    address: editCompany?.address || '',
    phone: editCompany?.phone || '',
    email: editCompany?.email || '',
    is_active: editCompany?.is_active ?? true,
  });

  useEffect(() => {
    if (formData.name) {
      validateCompanyName(formData.name);
    }
  }, [formData.name]);

  const validateCompanyName = async (name: string) => {
    if (!name) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .eq('name', name);

      if (error) throw error;

      const isDuplicate = data && data.length > 0 && (!editCompany || data[0].id !== editCompany.id);

      if (isDuplicate) {
        setErrors(prev => ({ ...prev, name: 'Esta unidad de negocio ya existe' }));
      } else {
        setErrors(prev => ({ ...prev, name: '' }));
      }
    } catch (err) {
      console.error('Error validando nombre:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.business_type) {
      newErrors.business_type = 'El rubro es requerido';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0 || errors.name) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const dataToSave: any = {
      name: formData.name.trim(),
      business_type: formData.business_type,
      ruc: formData.ruc.trim() || null,
      address: formData.address.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      is_active: formData.is_active,
    };

    try {
      if (editCompany) {
        const { error } = await supabase
          .from('companies')
          .update(dataToSave)
          .eq('id', editCompany.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([dataToSave]);

        if (error) throw error;
      }

      setLoading(false);
      notifySuccess(editCompany ? 'Unidad de negocio actualizada correctamente' : 'Unidad de negocio creada correctamente', editCompany ? 'Actualizada' : 'Creada');
      onSave();
    } catch (err: any) {
      console.error('Error saving company:', err);
      notifyError(err.message || 'Error al procesar la unidad de negocio', 'Error');
      setErrors({ submit: err.message || 'Error al procesar la unidad de negocio' });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      title={editCompany ? 'Editar Unidad de Negocio' : 'Nueva Unidad de Negocio'}
      subtitle="Módulo de Gestión de Unidades de Negocio"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      maxWidth="4xl"
      icon={<Building size={24} className="text-blue-600" />}
    >
      <FormSection title="Información Principal" color="blue" columns={2}>
        <FormField label="Nombre" required error={errors.name}>
          <FormInput
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ej. San Cristobal Vip"
            required
            error={errors.name}
          />
        </FormField>

        <FormField label="Rubro" required error={errors.business_type}>
          <FormSelect
            name="business_type"
            value={formData.business_type}
            onChange={handleChange}
            required
            error={errors.business_type}
          >
            <option value="">Seleccionar rubro...</option>
            {BUSINESS_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </FormSelect>
        </FormField>

        <FormField label="RUC" error={errors.ruc}>
          <FormInput
            type="text"
            name="ruc"
            value={formData.ruc}
            onChange={handleChange}
            placeholder="20123456789"
            error={errors.ruc}
          />
        </FormField>

        <FormField label="Teléfono" error={errors.phone}>
          <FormInput
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="(01) 555-1234"
            error={errors.phone}
          />
        </FormField>

        <FormField label="Email" error={errors.email}>
          <FormInput
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="contacto@empresa.com"
            error={errors.email}
          />
        </FormField>

        <FormField label="Estado">
          <div className="flex items-center h-10 px-3 bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-[11px] font-normal text-[#002855] tracking-wide cursor-pointer">
              Activa
            </label>
          </div>
        </FormField>
      </FormSection>

      <FormSection title="Contacto" color="emerald">
        <FormField label="Dirección" error={errors.address}>
          <FormInput
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Av. Principal 123, Lima, Perú"
            error={errors.address}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
