import { FileText, MapPin, Calendar, AlertTriangle, FileArchive, Info } from 'lucide-react';
import DetailModal, { DetailModalBody, StandardModalHeader, StandardModalBanner, StandardModalFooter } from '../../../shared/components/ui/DetailModal';

// Type definitions (duplicating to avoid circular imports or exporting from page, ideally this should be in a shared types file)
type Location = {
  id: string;
  name: string;
  type?: string;
};

type TituloHabilitante = {
  id: string;
  titulo: string;
  tipo: string;
  numero: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  vigencia_del?: string;
  vigencia_al?: string;
  vigencia_documento?: string;
  dias_para_vencer?: number;
  ubicacion_id: string;
  estado: 'vigente' | 'por_vencer' | 'vencido';
  notas?: string;
  created_at: string;
  updated_at: string;
  locations?: Location;
};

type TituloHabilitanteDetailsProps = {
  titulo: TituloHabilitante;
  onClose: () => void;
  onEdit?: () => void;
};

export default function TituloHabilitanteDetails({ titulo, onClose, onEdit }: TituloHabilitanteDetailsProps) {
  const getDaysUntil = (dateString: string) => {
    if (!dateString) return 0;
    const target = new Date(dateString);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderStatusBanner = () => {
    const targetDate = titulo.vigencia_al || titulo.fecha_vencimiento;
    if (!targetDate) return (
      <span className="text-[14px] font-semibold bg-slate-100 text-slate-600">
        SIN VENCIMIENTO
      </span>
    );

    const daysLeft = getDaysUntil(targetDate);

    if (daysLeft <= 0) {
      return (
        <span className="text-[14px] font-semibold bg-rose-100 text-rose-700">
          VENCIDO ({Math.abs(daysLeft)}D)
        </span>
      );
    }

    if (daysLeft <= 30) {
      return (
        <span className="text-[14px] font-semibold bg-amber-100 text-amber-700">
          POR VENCER ({daysLeft}D)
        </span>
      );
    }

    return (
      <span className="text-[14px] font-semibold bg-emerald-100 text-emerald-700">
        VIGENTE ({daysLeft}D)
      </span>
    );
  };

  const getStatusAlert = () => {
    const targetDate = titulo.vigencia_al || titulo.fecha_vencimiento;
    if (!targetDate) return null;
    const daysLeft = getDaysUntil(targetDate);

    if (daysLeft <= 0) {
      return (
        <div className="bg-rose-50 border border-rose-200 p-4 shadow-sm flex items-start gap-3 min-w-0 mb-6">
          <div className="mt-0.5">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <h3 className="text-[12px] font-semibold text-rose-800 uppercase tracking-widest">Documento Vencido</h3>
            <p className="mt-1 text-[11px] font-medium text-rose-700">Este título habilitante ha expirado. Se requiere renovación inmediata.</p>
          </div>
        </div>
      );
    }
    
    if (daysLeft <= 30) {
      return (
        <div className="bg-amber-50 border border-amber-200 p-4 shadow-sm flex items-start gap-3 min-w-0 mb-6">
          <div className="mt-0.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-[12px] font-semibold text-amber-800 uppercase tracking-widest">Documento por Vencer</h3>
            <p className="mt-1 text-[11px] font-medium text-amber-700">Este título habilitante vencerá en menos de 30 días. Por favor iniciar proceso de renovación.</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const startDateStr = (titulo.vigencia_del || titulo.fecha_emision) ? new Date((titulo.vigencia_del || titulo.fecha_emision) as string).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '—';
  const endDateStr = (titulo.vigencia_al || titulo.fecha_vencimiento) ? new Date((titulo.vigencia_al || titulo.fecha_vencimiento) as string).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '—';

  return (
    <DetailModal maxWidth="7xl" onClose={onClose}>
      <StandardModalHeader
        title="Vista Previa del Título"
        subtitle="TÍTULO HABILITANTE"
        icon={FileArchive}
        onClose={onClose}
      />

      <DetailModalBody className="bg-gray-50/50">
        <div className="space-y-6 sm:space-y-8">
          <StandardModalBanner
            title={titulo.titulo}
            icon={FileArchive}
            badges={renderStatusBanner()}
            rightLabel="Número de Doc."
            rightValue={titulo.numero || 'S/N'}
          />

          {getStatusAlert()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 min-w-0">
            {/* Columna 1: Identificación y Notas */}
            <div className="space-y-6 sm:space-y-8 min-w-0">
              <section>
                <div className="flex items-center gap-2 mb-4 text-blue-600 border-b border-blue-100 pb-2">
                  <FileText size={16} strokeWidth={3} />
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest">Detalles del Documento</h3>
                </div>
                <div className="bg-white p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Tipo de Título</label>
                      <p className="text-[13px] font-semibold text-slate-700 uppercase">{titulo.tipo || 'Sin tipo'}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Vigencia del Documento (Tiempo)</label>
                    <p className="text-[14px] font-semibold text-slate-800 uppercase">{titulo.vigencia_documento || 'No especificada'}</p>
                  </div>
                </div>
              </section>

              {titulo.notas && (
                <section>
                  <div className="flex items-center gap-2 mb-4 text-slate-400 border-b border-slate-100 pb-2">
                    <Info size={16} strokeWidth={3} />
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest">Observaciones</h3>
                  </div>
                  <div className="bg-white p-6 border border-slate-200 shadow-sm italic text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    "{titulo.notas}"
                  </div>
                </section>
              )}
            </div>

            {/* Columna 2: Fechas y Vigencia */}
            <div className="space-y-6 sm:space-y-8 min-w-0">
              <section>
                <div className="flex items-center gap-2 mb-4 text-emerald-600 border-b border-emerald-100 pb-2">
                  <Calendar size={16} strokeWidth={3} />
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest">Control de Fechas</h3>
                </div>
                <div className="bg-white p-6 border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Fecha de Emisión / Vigencia Del</label>
                    <p className="text-[13px] font-semibold text-slate-700">{startDateStr}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Fecha de Vencimiento / Vigencia Al</label>
                    <p className="text-[13px] font-semibold text-slate-700">{endDateStr}</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Columna 3: Sidebar / Ubicación */}
            <div className="space-y-8">
              <section>
                <div className="flex items-center gap-2 mb-4 text-rose-500 border-b border-rose-100 pb-2">
                  <MapPin size={16} strokeWidth={3} />
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest">Ubicación Asignada</h3>
                </div>
                <div className="bg-white p-6 border border-slate-200 shadow-sm">
                  <p className="text-[13px] font-semibold text-[#002855] uppercase mb-1">{titulo.locations?.name || 'Sede N/A'}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Sede principal / CITV</p>
                </div>
              </section>
            </div>

          </div>
        </div>
      </DetailModalBody>

      <StandardModalFooter
        onClose={onClose}
        onEdit={onEdit}
        editLabel="Editar Título"
      />
    </DetailModal>
  );
}
