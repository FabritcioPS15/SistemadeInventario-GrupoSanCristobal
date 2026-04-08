import { X, Monitor, MapPin, Package, Calendar, Tag, Info, ShoppingCart, Edit } from 'lucide-react';
import { AssetWithDetails } from '../lib/supabase';

type AssetDetailsProps = {
  asset: AssetWithDetails;
  onClose: () => void;
  onEdit?: () => void;
};

export default function AssetDetails({ asset, onClose, onEdit }: AssetDetailsProps) {
  const statusMap: Record<string, { label: string, color: string }> = {
    active: { label: 'Activo', color: 'emerald' },
    inactive: { label: 'Inactivo', color: 'slate' },
    maintenance: { label: 'Mantenimiento', color: 'amber' },
    extracted: { label: 'Extraído', color: 'rose' }
  };

  const status = statusMap[asset.status] || { label: asset.status, color: 'slate' };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="relative h-32 bg-slate-100 flex-shrink-0">
          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
            <Package size={60} strokeWidth={1} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all"
          >
            <X size={20} />
          </button>

          <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1">
                {asset.categories?.name} / {asset.subcategories?.name}
              </p>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                {asset.brand} {asset.model}
              </h2>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-current bg-${status.color}-500/20 text-white backdrop-blur-md`}>
              {status.label}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="md:col-span-2 space-y-8">
              <section>
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                  <Tag size={18} strokeWidth={3} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Identificación</h3>
                </div>
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Código Único</label>
                    <p className="text-sm font-mono font-bold text-blue-700">{asset.codigo_unico || 'S/C'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nº de Serie</label>
                    <p className="text-sm font-mono font-bold text-slate-700">{asset.serial_number || 'S/N'}</p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4 text-emerald-600">
                  <Monitor size={18} strokeWidth={3} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Especificaciones</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  {asset.processor && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Procesador</label>
                      <p className="text-xs font-bold text-slate-700">{asset.processor}</p>
                    </div>
                  )}
                  {asset.ram && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">RAM</label>
                      <p className="text-xs font-bold text-slate-700">{asset.ram}</p>
                    </div>
                  )}
                  {asset.capacity && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Capacidad</label>
                      <p className="text-xs font-bold text-slate-700">{asset.capacity}</p>
                    </div>
                  )}
                  {asset.ip_address && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">IP Address</label>
                      <p className="text-xs font-bold text-slate-700 font-mono">{asset.ip_address}</p>
                    </div>
                  )}
                  {asset.anydesk_id && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">AnyDesk</label>
                      <p className="text-xs font-bold text-blue-600 font-mono">{asset.anydesk_id}</p>
                    </div>
                  )}
                  {asset.operating_system && (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">S.O.</label>
                      <p className="text-xs font-bold text-slate-700">{asset.operating_system}</p>
                    </div>
                  )}
                </div>
              </section>

              {asset.notes && (
                <section>
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <Info size={18} strokeWidth={3} />
                    <h3 className="text-xs font-black uppercase tracking-widest">Observaciones</h3>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 italic text-slate-600 text-sm leading-relaxed">
                    "{asset.notes}"
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar Details */}
            <div className="space-y-8 h-full border-l border-slate-100 pl-8">
              <section>
                <div className="flex items-center gap-2 mb-4 text-blue-500">
                  <MapPin size={18} strokeWidth={3} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Ubocación</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-black text-slate-700">{asset.locations?.name || 'No asignada'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{asset.areas?.name || 'Área General'}</p>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4 text-purple-500">
                  <ShoppingCart size={18} strokeWidth={3} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Adquisición</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor Estimado</label>
                    <p className="text-sm font-black text-slate-700">${asset.valor_estimado?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fecha</label>
                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-300" />
                      {asset.fecha_adquisicion ? new Date(asset.fecha_adquisicion).toLocaleDateString('es-ES') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Condición</label>
                    <p className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block ${asset.condicion === 'Nuevo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {asset.condicion || 'No especificada'}
                    </p>
                  </div>
                </div>
              </section>

              <div className="pt-8 mt-auto border-t border-slate-100 grid grid-cols-2 gap-4">
                <button
                  onClick={onEdit}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Edit size={14} /> Editar
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
