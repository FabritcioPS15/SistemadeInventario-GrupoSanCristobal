import { useState } from 'react';
import { DollarSign, Plus, X, Mail } from 'lucide-react';
import { supabase } from '../../../shared/services/supabase';
import { emailService } from '../../../shared/services/emailService';
import MultiStepForm from '../../../shared/components/forms/MultiStepForm';
import { FormField, FormInput, FormSelect, FormTextarea } from '../../../shared/components/forms/BaseForm';
import { useAuth } from '../../../app/providers/AuthContext';
import { useNotify } from '../../../shared/hooks/useNotify';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface QuotationFormData {
  number: string;
  title: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  currency: string;
  items: QuotationItem[];
  discount: number;
  tax_rate: number;
  notes: string;
  terms: string;
  valid_until: string;
  status: string;
}

type QuotationFormProps = {
  onClose: () => void;
  onSave: () => void;
  editRecord?: any;
};

const CURRENCY_OPTIONS = [
  { value: 'PEN', label: 'S/. (Soles)' },
  { value: 'USD', label: '$ (Dólares)' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviada' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
];

const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'hora', label: 'Hora' },
  { value: 'dia', label: 'Día' },
  { value: 'mes', label: 'Mes' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'metro', label: 'Metro' },
  { value: 'kg', label: 'Kg' },
  { value: 'global', label: 'Global' },
];

function createEmptyItem(): QuotationItem {
  return { id: crypto.randomUUID(), description: '', quantity: 1, unit: 'unidad', unit_price: 0, total: 0 };
}

export default function QuotationForm({ onClose, onSave, editRecord }: QuotationFormProps) {
  const { user } = useAuth();
  const { notify } = useNotify();
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendEmail, setSendEmail] = useState(false);

  const [formData, setFormData] = useState<QuotationFormData>({
    number: editRecord?.number || `COT-${Date.now().toString(36).toUpperCase()}`,
    title: editRecord?.title || '',
    client_name: editRecord?.client_name || '',
    client_email: editRecord?.client_email || '',
    client_phone: editRecord?.client_phone || '',
    currency: editRecord?.currency || 'PEN',
    items: editRecord?.items?.length ? editRecord.items : [createEmptyItem()],
    discount: editRecord?.discount || 0,
    tax_rate: editRecord?.tax_rate || 18,
    notes: editRecord?.notes || '',
    terms: editRecord?.terms || 'Pago contra entrega. Válido por 15 días.',
    valid_until: editRecord?.valid_until || '',
    status: editRecord?.status || 'draft',
  });

  const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (formData.discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (formData.tax_rate / 100);
  const total = taxableAmount + taxAmount;

  const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
    setFormData(prev => {
      const items = prev.items.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = (field === 'quantity' ? value : item.quantity) * (field === 'unit_price' ? value : item.unit_price);
        }
        return updated;
      });
      return { ...prev, items };
    });
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter(i => i.id !== id) : prev.items,
    }));
  };

  const addItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'El título es requerido';
    if (!formData.client_name.trim()) newErrors.client_name = 'El cliente es requerido';
    if (!formData.client_email.trim()) newErrors.client_email = 'El email del cliente es requerido';
    if (!formData.valid_until) newErrors.valid_until = 'La fecha de validez es requerida';

    const hasInvalidItem = formData.items.some(i => !i.description.trim() || i.quantity <= 0 || i.unit_price <= 0);
    if (hasInvalidItem) newErrors.items = 'Completa todos los items (descripción, cantidad > 0, precio > 0)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const renderQuotationHTML = () => {
    const currencySymbol = formData.currency === 'PEN' ? 'S/' : '$';
    const itemsRows = formData.items.map(item => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eef2f6; font-size: 13px; color: #1e293b;">${item.description}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eef2f6; font-size: 13px; color: #475569; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eef2f6; font-size: 13px; color: #475569; text-align: right;">${currencySymbol} ${item.unit_price.toFixed(2)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #eef2f6; font-size: 13px; color: #1e293b; text-align: right; font-weight: 600;">${currencySymbol} ${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #eef2f6;">
        <div style="background: #002855; padding: 24px 28px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">COTIZACIÓN</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">${formData.number}</p>
        </div>

        <div style="padding: 28px 24px;">
          <h2 style="color: #1e293b; font-size: 18px; margin: 0 0 4px;">${formData.title}</h2>
          <p style="color: #64748b; font-size: 12px; margin: 0 0 20px;">Válido hasta: ${new Date(formData.valid_until).toLocaleDateString('es-PE')}</p>

          <div style="background: #f8fafc; border: 1px solid #eef2f6; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="color: #002855; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Cliente</h3>
            <p style="margin: 2px 0; font-size: 14px; color: #1e293b; font-weight: 600;">${formData.client_name}</p>
            <p style="margin: 2px 0; font-size: 13px; color: #475569;">${formData.client_email}</p>
            ${formData.client_phone ? `<p style="margin: 2px 0; font-size: 13px; color: #475569;">${formData.client_phone}</p>` : ''}
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #002855; color: #ffffff;">
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; text-align: left;">Descripción</th>
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Cant.</th>
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">P. Unit.</th>
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-left: auto; width: 280px;">
            <tr><td style="padding: 6px 12px; font-size: 13px; color: #64748b;">Subtotal</td><td style="padding: 6px 12px; font-size: 13px; text-align: right;">${currencySymbol} ${subtotal.toFixed(2)}</td></tr>
            ${formData.discount > 0 ? `<tr><td style="padding: 6px 12px; font-size: 13px; color: #64748b;">Descuento (${formData.discount}%)</td><td style="padding: 6px 12px; font-size: 13px; text-align: right; color: #ef4444;">-${currencySymbol} ${discountAmount.toFixed(2)}</td></tr>` : ''}
            <tr><td style="padding: 6px 12px; font-size: 13px; color: #64748b;">IGV (${formData.tax_rate}%)</td><td style="padding: 6px 12px; font-size: 13px; text-align: right;">${currencySymbol} ${taxAmount.toFixed(2)}</td></tr>
            <tr style="border-top: 2px solid #002855;"><td style="padding: 8px 12px; font-size: 16px; font-weight: 700; color: #002855;">Total</td><td style="padding: 8px 12px; font-size: 16px; font-weight: 700; text-align: right; color: #002855;">${currencySymbol} ${total.toFixed(2)}</td></tr>
          </table>

          ${formData.notes ? `<div style="margin-top: 20px; padding: 14px; background: #f8fafc; border-left: 4px solid #002855; border-radius: 6px;"><p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">${formData.notes}</p></div>` : ''}
          ${formData.terms ? `<div style="margin-top: 12px;"><h4 style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px;">Términos</h4><p style="margin: 0; font-size: 13px; color: #475569;">${formData.terms}</p></div>` : ''}
        </div>

        <div style="background: #002855; padding: 16px 24px; text-align: center;">
          <p style="color: #cbd5e1; margin: 0; font-size: 11px;">Sistema GSC — Área de TI y Soporte</p>
        </div>
      </div>
    `;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const dataToSave = {
        number: formData.number,
        title: formData.title,
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_phone: formData.client_phone,
        currency: formData.currency,
        items: formData.items,
        discount: formData.discount,
        tax_rate: formData.tax_rate,
        notes: formData.notes,
        terms: formData.terms,
        valid_until: formData.valid_until,
        status: formData.status,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total,
        created_by: user?.id,
      };

      if (editRecord?.id) {
        const { error } = await supabase.from('quotations').update(dataToSave).eq('id', editRecord.id);
        if (error) throw error;
        notify('Cotización actualizada', { type: 'success' });
      } else {
        const { error } = await supabase.from('quotations').insert([dataToSave]);
        if (error) throw error;
        notify('Cotización creada', { type: 'success' });
      }

      if (sendEmail) {
        setSendingEmail(true);
        const result = await emailService.sendEmail({
          to: [formData.client_email],
          subject: `Cotización ${formData.number} - ${formData.title}`,
          html: renderQuotationHTML(),
        });
        if (!result.success) notify('Error al enviar correo: ' + result.error, { type: 'error' });
        else notify('Cotización enviada por correo', { type: 'success' });
        setSendingEmail(false);
      }

      onSave();
    } catch (err: any) {
      setErrors(prev => ({ ...prev, submit: err.message }));
      notify('Error al guardar: ' + err.message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MultiStepForm
      title={editRecord ? 'Editar Cotización' : 'Nueva Cotización'}
      subtitle="Módulo de Cotizaciones"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<DollarSign size={20} />}
      steps={[
        { title: 'Datos Cliente', description: 'Cliente y configuración' },
        { title: 'Items', description: 'Productos y servicios' },
        { title: 'Totales', description: 'Descuentos, notas y envío' },
      ]}
    >
      {/* Step 1: Datos del Cliente y Configuración */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Información General</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField label="N° Cotización" required>
            <FormInput type="text" name="number" value={formData.number} onChange={handleChange} readOnly />
          </FormField>
          <FormField label="Título" required error={errors.title}>
            <FormInput type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Ej: Instalación de cámaras de seguridad" required />
          </FormField>
          <FormField label="Moneda" required>
            <FormSelect name="currency" value={formData.currency} onChange={handleChange}>
              {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Estado">
            <FormSelect name="status" value={formData.status} onChange={handleChange}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FormSelect>
          </FormField>
        </div>

        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Datos del Cliente</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField label="Nombre del Cliente" required error={errors.client_name}>
            <FormInput type="text" name="client_name" value={formData.client_name} onChange={handleChange} placeholder="Nombre o razón social" required />
          </FormField>
          <FormField label="Correo Electrónico" required error={errors.client_email}>
            <FormInput type="email" name="client_email" value={formData.client_email} onChange={handleChange} placeholder="cliente@ejemplo.com" required />
          </FormField>
          <FormField label="Teléfono">
            <FormInput type="text" name="client_phone" value={formData.client_phone} onChange={handleChange} placeholder="+51 999 999 999" />
          </FormField>
          <FormField label="Válido Hasta" required error={errors.valid_until}>
            <FormInput type="date" name="valid_until" value={formData.valid_until} onChange={handleChange} required />
          </FormField>
        </div>
      </div>

      {/* Step 2: Items de la Cotización */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Items de la Cotización</h3>
        </div>
        <div className="space-y-2">
          {formData.items.map((item, idx) => (
            <div key={item.id} className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200">
              <div className="flex-1 grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <label className="text-[9px] font-normal text-slate-400 uppercase tracking-widest block mb-1">Descripción</label>
                  <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                    className="w-full px-3 py-2 text-[12px] font-normal bg-white border border-slate-200 outline-none focus:border-[#002855]/30"
                    placeholder="Descripción del producto/servicio" />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-normal text-slate-400 uppercase tracking-widest block mb-1">Unidad</label>
                  <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}
                    className="w-full px-2 py-2 text-[12px] font-normal bg-white border border-slate-200 outline-none">
                    {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-normal text-slate-400 uppercase tracking-widest block mb-1">Cant.</label>
                  <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-2 text-[12px] font-normal bg-white border border-slate-200 outline-none text-center" />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-normal text-slate-400 uppercase tracking-widest block mb-1">P. Unit.</label>
                  <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-2 text-[12px] font-normal bg-white border border-slate-200 outline-none text-right" />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-normal text-slate-400 uppercase tracking-widest block mb-1">Total</label>
                  <div className="px-2 py-2 text-[12px] font-normal text-[#002855] bg-slate-100 border border-slate-200 text-right">
                    {formData.currency === 'PEN' ? 'S/' : '$'} {item.total.toFixed(2)}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => removeItem(item.id)}
                className="mt-5 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 bg-white transition-all">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addItem}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-[10px] font-normal text-[#002855] bg-slate-50 border border-slate-200 hover:bg-[#002855] hover:text-white transition-all uppercase tracking-widest">
          <Plus size={14} /> Agregar Item
        </button>
        {errors.items && <p className="text-[11px] font-normal text-rose-600 mt-2">{errors.items}</p>}
      </div>

      {/* Step 3: Totales, Notas y Envío */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Totales</h3>
        </div>
        <div className="p-4 bg-white border border-slate-200">
          <div className="flex justify-end">
            <table className="w-full max-w-xs">
              <tbody>
                <tr><td className="py-1.5 text-[12px] font-normal text-slate-500">Subtotal</td><td className="py-1.5 text-[12px] font-normal text-right">{formData.currency === 'PEN' ? 'S/' : '$'} {subtotal.toFixed(2)}</td></tr>
                <tr>
                  <td className="py-1.5 text-[12px] font-normal text-slate-500">Descuento (%)</td>
                  <td className="py-1.5 text-right">
                    <input type="number" min="0" max="100" step="1" name="discount" value={formData.discount}
                      onChange={handleChange} className="w-20 px-2 py-1 text-[12px] font-normal bg-white border border-slate-200 outline-none text-right" />
                  </td>
                </tr>
                {formData.discount > 0 && (
                  <tr><td className="py-1 text-[11px] text-rose-500">— Descuento</td><td className="py-1 text-[11px] text-rose-500 text-right">-{formData.currency === 'PEN' ? 'S/' : '$'} {discountAmount.toFixed(2)}</td></tr>
                )}
                <tr>
                  <td className="py-1.5 text-[12px] font-normal text-slate-500">IGV (%)</td>
                  <td className="py-1.5 text-right">
                    <input type="number" min="0" max="100" step="0.5" name="tax_rate" value={formData.tax_rate}
                      onChange={handleChange} className="w-20 px-2 py-1 text-[12px] font-normal bg-white border border-slate-200 outline-none text-right" />
                  </td>
                </tr>
                <tr><td className="py-1 text-[11px] text-slate-500">IGV ({formData.tax_rate}%)</td><td className="py-1 text-[11px] text-slate-500 text-right">{formData.currency === 'PEN' ? 'S/' : '$'} {taxAmount.toFixed(2)}</td></tr>
                <tr className="border-t-2 border-[#002855]">
                  <td className="py-2 text-[16px] font-normal text-[#002855]">TOTAL</td>
                  <td className="py-2 text-[16px] font-normal text-[#002855] text-right">{formData.currency === 'PEN' ? 'S/' : '$'} {total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Notas y Términos</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Notas">
            <FormTextarea name="notes" value={formData.notes} onChange={handleChange}
              placeholder="Notas adicionales para el cliente..." rows={3} />
          </FormField>
          <FormField label="Términos y Condiciones">
            <FormTextarea name="terms" value={formData.terms} onChange={handleChange} rows={3} />
          </FormField>
        </div>

        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Enviar por Correo</h3>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
              className="w-4 h-4 text-[#002855] border-slate-300 rounded focus:ring-[#002855]" />
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-blue-500" />
              <span className="text-[12px] font-normal text-slate-700">Enviar cotización al cliente después de guardar</span>
            </div>
          </label>
          {sendingEmail && <span className="text-[11px] font-normal text-blue-600 animate-pulse">Enviando correo...</span>}
        </div>
      </div>
    </MultiStepForm>
  );
}
