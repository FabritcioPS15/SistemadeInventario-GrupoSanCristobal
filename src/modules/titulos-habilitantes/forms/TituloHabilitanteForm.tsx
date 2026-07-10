import { useState, useEffect } from 'react';
import { FileText, HelpCircle, Clock } from 'lucide-react';
import { supabase, Location } from '../../../shared/services/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect } from '../../../shared/components/forms/BaseForm';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../../../shared/theme/muiTheme';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useNotify } from '../../../shared/hooks/useNotify';

dayjs.locale('es');

type TituloHabilitante = {
  id: string;
  titulo: string;
  tipo: string;
  numero: string;
  fecha_emision?: string; // Mantener por retrocompatibilidad
  fecha_vencimiento?: string; // Mantener por retrocompatibilidad
  vigencia_del?: string;
  vigencia_al?: string;
  vigencia_documento?: string;
  dias_para_vencer?: number;
  ubicacion_id: string;
  estado: 'vigente' | 'por_vencer' | 'vencido';
  notes?: string;
  notas?: string;
};

interface TituloHabilitanteFormProps {
  tituloHabilitante?: TituloHabilitante;
  locations: Location[];
  onSave: () => void;
  onClose: () => void;
}

const DOCUMENT_TYPES = [
  'Resolución de autorización (publicación)',
  'Autorización del MTC',
  'Autorización de DIRESA',
  'Certificado de control sanitario',
  'Calibración de Norklan',
  'Póliza de seguros',
  'Certificado de inspección anual',
  'Certificado de homologación',
  'Constancia de calibración de equipos',
  'Certificados de calibración de equipos',
  'Defensa civil',
  'Licencia de funcionamiento',
  'Extintores',
  'Pozo a tierra',
  'Otro'
];

const DOCUMENT_PRESETS: Record<string, { duration: string; years?: number; months?: number }> = {
  'Resolución de autorización (publicación)': { duration: '5 años', years: 5 },
  'Autorización del MTC': { duration: '' },
  'Autorización de DIRESA': { duration: '' },
  'Certificado de control sanitario': { duration: '' },
  'Calibración de Norklan': { duration: '' },
  'Póliza de seguros': { duration: '1 año', years: 1 },
  'Certificado de inspección anual': { duration: '1 año', years: 1 },
  'Certificado de homologación': { duration: '5 años', years: 5 },
  'Constancia de calibración de equipos': { duration: '6 meses', months: 6 },
  'Certificados de calibración de equipos': { duration: '6 meses', months: 6 },
  'Defensa civil': { duration: '2 años', years: 2 },
  'Licencia de funcionamiento': { duration: 'indeterminado' },
  'Extintores': { duration: '1 año', years: 1 },
  'Pozo a tierra': { duration: '1 año', years: 1 },
  'Otro': { duration: '' }
};

// Función para calcular la fecha de vencimiento automáticamente
const calculateEndDate = (startDateStr: string, documentType: string): string => {
  if (!startDateStr) return '';
  const preset = DOCUMENT_PRESETS[documentType];
  if (!preset || (!preset.years && !preset.months)) return '';

  const [year, month, day] = startDateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);

  if (preset.years) {
    targetDate.setFullYear(targetDate.getFullYear() + preset.years);
  } else if (preset.months) {
    targetDate.setMonth(targetDate.getMonth() + preset.months);
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function TituloHabilitanteForm({
  tituloHabilitante,
  locations,
  onSave,
  onClose
}: TituloHabilitanteFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [diasCalculados, setDiasCalculados] = useState<number | null>(null);
  const { success, error: notifyError } = useNotify();

  const [formData, setFormData] = useState({
    titulo: tituloHabilitante?.titulo || '',
    tipo: tituloHabilitante?.tipo || '',
    numero: tituloHabilitante?.numero || '-',
    vigencia_del: tituloHabilitante?.vigencia_del || tituloHabilitante?.fecha_emision || '',
    vigencia_al: tituloHabilitante?.vigencia_al || tituloHabilitante?.fecha_vencimiento || '',
    vigencia_documento: tituloHabilitante?.vigencia_documento || '',
    ubicacion_id: tituloHabilitante?.ubicacion_id || ''
  });

  // Calcular días para vencer en tiempo real
  const calculateDaysLeft = (fechaVencimiento: string): number | null => {
    if (!fechaVencimiento) return null;
    const target = new Date(fechaVencimiento);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    if (formData.vigencia_al) {
      setDiasCalculados(calculateDaysLeft(formData.vigencia_al));
    } else {
      setDiasCalculados(null);
    }
  }, [formData.vigencia_al]);

  // Sincronizar formulario si cambia la prop
  useEffect(() => {
    if (tituloHabilitante) {
      setFormData({
        titulo: tituloHabilitante.titulo || '',
        tipo: tituloHabilitante.tipo || '',
        numero: tituloHabilitante.numero || '-',
        vigencia_del: tituloHabilitante.vigencia_del || tituloHabilitante.fecha_emision || '',
        vigencia_al: tituloHabilitante.vigencia_al || tituloHabilitante.fecha_vencimiento || '',
        vigencia_documento: tituloHabilitante.vigencia_documento || '',
        ubicacion_id: tituloHabilitante.ubicacion_id || ''
      });
    } else {
      setFormData({
        titulo: '',
        tipo: '',
        numero: '-',
        vigencia_del: '',
        vigencia_al: '',
        vigencia_documento: '',
        ubicacion_id: ''
      });
    }
    setErrors({});
  }, [tituloHabilitante]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.tipo) {
      newErrors.tipo = 'El tipo de documento es requerido';
    }

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El título/nombre es requerido';
    }

    if (!formData.vigencia_al && formData.vigencia_documento !== 'indeterminado') {
      newErrors.vigencia_al = 'La fecha de vencimiento (Vigencia Al) es requerida';
    }

    if (!formData.ubicacion_id) {
      newErrors.ubicacion_id = 'La sede es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateEstado = (dias: number): 'vigente' | 'por_vencer' | 'vencido' => {
    if (dias <= 0) return 'vencido';
    if (dias <= 30) return 'por_vencer';
    return 'vigente';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const isIndeterminado = formData.vigencia_documento === 'indeterminado';
      const dias = isIndeterminado ? null : calculateDaysLeft(formData.vigencia_al);
      const estado = isIndeterminado ? 'vigente' : calculateEstado(dias || 0);

      const payload = {
        titulo: formData.titulo,
        tipo: formData.tipo,
        numero: formData.numero || '-',
        // Escribir a ambas columnas para retrocompatibilidad total
        // Si fecha_vencimiento es nula (indeterminado), mandamos un fallback al futuro para evitar el error NOT NULL de la DB antigua
        fecha_emision: formData.vigencia_del || null,
        fecha_vencimiento: formData.vigencia_al || '2099-12-31',
        vigencia_del: formData.vigencia_del || null,
        vigencia_al: formData.vigencia_al || null,
        vigencia_documento: formData.vigencia_documento || null,
        dias_para_vencer: dias,
        ubicacion_id: formData.ubicacion_id,
        estado,
        updated_at: new Date().toISOString()
      };

      if (tituloHabilitante) {
        // Actualizar
        const { error } = await supabase
          .from('titulos_habilitantes')
          .update(payload)
          .eq('id', tituloHabilitante.id);

        if (error) throw error;
      } else {
        // Crear
        const { error } = await supabase
          .from('titulos_habilitantes')
          .insert([{
            ...payload,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
      }

      success(
        `El título habilitante ha sido ${tituloHabilitante ? 'actualizado' : 'creado'} correctamente.`,
        tituloHabilitante ? '¡Actualizado!' : '¡Creado!'
      );

      onSave();
    } catch (error: any) {
      console.error('Error al guardar título habilitante:', error);
      notifyError(error.message || 'Error al guardar el título habilitante');
      setErrors({ submit: error.message || 'Error al guardar el título habilitante' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'tipo') {
      setFormData(prev => {
        const update: any = { ...prev, tipo: value };

        // Auto-completar el título si está vacío o coincide con un tipo anterior
        if (value && value !== 'Otro' && (!prev.titulo.trim() || DOCUMENT_TYPES.includes(prev.titulo))) {
          update.titulo = value;
        }

        // Preset de duración según el tipo seleccionado
        const preset = DOCUMENT_PRESETS[value];
        if (preset) {
          update.vigencia_documento = preset.duration;
          if (preset.duration === 'indeterminado') {
            update.vigencia_al = '';
          } else if (prev.vigencia_del) {
            update.vigencia_al = calculateEndDate(prev.vigencia_del, value);
          }
        }

        return update;
      });
    } else if (name === 'vigencia_del') {
      setFormData(prev => {
        const update = { ...prev, vigencia_del: value };
        if (prev.tipo && value) {
          const endDate = calculateEndDate(value, prev.tipo);
          if (endDate) {
            update.vigencia_al = endDate;
          }
        }
        return update;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <BaseForm
      title={tituloHabilitante ? 'Editar Título Habilitante' : 'Nuevo Título Habilitante'}
      subtitle="Módulo de Gestión de Títulos Habilitantes (Sedes CITV, ESCON y ECSAL)"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<FileText size={24} className="text-white" />}
    >
      <ThemeProvider theme={muiTheme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <div className="space-y-6 p-1">
            {/* Guía Informativa */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5">
              <HelpCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-blue-800 leading-normal font-medium">
                <p className="font-bold text-blue-900 mb-0.5">Indicaciones:</p>
                • Seleccione el tipo de documento y el tiempo de vigencia se establecerá de forma automática.<br />
                • Indique la vigencia desde (Emisión) y se calculará automáticamente la vigencia hasta (Vencimiento).<br />
                • Los días para vencer se calculan de manera automática en tiempo real.
              </div>
            </div>

            <FormSection title="Detalles del Documento" color="blue">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Tipo de Documento" required error={errors.tipo}>
                  <FormSelect
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    required
                    error={errors.tipo}
                  >
                    <option value="">Seleccione un tipo</option>
                    {DOCUMENT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField label="Título / Nombre del Documento" required error={errors.titulo}>
                  <FormInput
                    type="text"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    placeholder="Ej. Certificado de Pozo a Tierra 2026"
                    required
                    error={errors.titulo}
                  />
                </FormField>

                <FormField label="Sede (CITV / ESCON / ECSAL)" required error={errors.ubicacion_id}>
                  <FormSelect
                    name="ubicacion_id"
                    value={formData.ubicacion_id}
                    onChange={handleChange}
                    required
                    error={errors.ubicacion_id}
                  >
                    <option value="">Seleccione una sede</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name.toUpperCase()}</option>
                    ))}
                  </FormSelect>
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Vigencia y Expiración" color="amber">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Vigencia Del (Emisión / Inicio)" error={errors.vigencia_del}>
                  <DatePicker
                    value={formData.vigencia_del ? dayjs(formData.vigencia_del) : null}
                    onChange={(newValue) => {
                      if (newValue && newValue.isValid()) {
                        handleChange({ target: { name: 'vigencia_del', value: newValue.format('YYYY-MM-DD') } } as any);
                      } else if (newValue === null) {
                        handleChange({ target: { name: 'vigencia_del', value: '' } } as any);
                      }
                    }}
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        error: !!errors.vigencia_del,
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            height: '42px',
                            borderRadius: '0.5rem',
                            backgroundColor: 'rgb(248 250 252)',
                            '& fieldset': { borderColor: 'rgb(226 232 240)' },
                            '&:hover fieldset': { borderColor: 'rgb(203 213 225)' },
                            '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '1px' }
                          },
                          '& .MuiInputBase-input': {
                            padding: '10.5px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#334155'
                          }
                        }
                      }
                    }}
                  />
                </FormField>

                <FormField label="Vigencia Al (Vencimiento / Término)" required={formData.vigencia_documento !== 'indeterminado'} error={errors.vigencia_al}>
                  <DatePicker
                    value={formData.vigencia_al ? dayjs(formData.vigencia_al) : null}
                    onChange={(newValue) => {
                      if (newValue && newValue.isValid()) {
                        handleChange({ target: { name: 'vigencia_al', value: newValue.format('YYYY-MM-DD') } } as any);
                      } else if (newValue === null) {
                        handleChange({ target: { name: 'vigencia_al', value: '' } } as any);
                      }
                    }}
                    disabled={formData.vigencia_documento === 'indeterminado'}
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        error: !!errors.vigencia_al,
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            height: '42px',
                            borderRadius: '0.5rem',
                            backgroundColor: formData.vigencia_documento === 'indeterminado' ? 'rgb(241 245 249)' : 'rgb(248 250 252)',
                            '& fieldset': { borderColor: 'rgb(226 232 240)' },
                            '&:hover fieldset': { borderColor: formData.vigencia_documento === 'indeterminado' ? 'rgb(226 232 240)' : 'rgb(203 213 225)' },
                            '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '1px' }
                          },
                          '& .MuiInputBase-input': {
                            padding: '10.5px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: formData.vigencia_documento === 'indeterminado' ? '#94a3b8' : '#334155'
                          }
                        }
                      }
                    }}
                  />
                </FormField>

                <FormField label="Vigencia del Documento" error={errors.vigencia_documento}>
                  <FormInput
                    type="text"
                    name="vigencia_documento"
                    value={formData.vigencia_documento}
                    readOnly
                    className="bg-slate-100/80 font-semibold text-slate-600 select-none cursor-not-allowed"
                    placeholder="Se calculará automáticamente"
                    error={errors.vigencia_documento}
                  />
                </FormField>

                {/* Días para vencer - Calculado en tiempo real */}
                <div className="flex flex-col justify-end pb-1.5 pl-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Días para Vencer
                  </label>
                  <div className="flex items-center gap-2 h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    <Clock size={16} className="text-slate-400 shrink-0" />
                    <span className="text-[13px] font-bold">
                      {formData.vigencia_documento === 'indeterminado' ? (
                        <span className="text-emerald-600 font-extrabold">Vigente (Indeterminado)</span>
                      ) : diasCalculados !== null ? (
                        diasCalculados <= 0 ? (
                          <span className="text-rose-600 font-extrabold">Vencido hace {Math.abs(diasCalculados)} días</span>
                        ) : diasCalculados <= 30 ? (
                          <span className="text-amber-600 font-extrabold">Por vencer (Faltan {diasCalculados} días)</span>
                        ) : (
                          <span className="text-emerald-600 font-extrabold">Vigente (Faltan {diasCalculados} días)</span>
                        )
                      ) : (
                        <span className="text-slate-400 italic">Seleccione fecha de vencimiento</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </FormSection>
          </div>
        </LocalizationProvider>
      </ThemeProvider>
    </BaseForm>
  );
}
