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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 md:p-8 z-[100] animate-in fade-in duration-300">
      <div className="bg-white w-full h-full md:h-[90vh] max-w-4xl rounded-none shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
        {/* Header Corporativo (Basado en BaseForm) */}
        <div className="bg-[#001529] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-none flex items-center justify-center border border-blue-500/20">
              <Package size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] leading-tight">Vista Previa del Activo</h2>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">
                {asset.categories?.name} / {asset.subcategories?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-none transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="p-4 sm:p-8 space-y-8">
            {/* Banner/Resumen */}
            <div className="bg-white border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Package size={32} className="text-slate-300" strokeWidth={1} />
                </div>
                <div>
                  <h1 className="text-xl font-black text-[#002855] uppercase tracking-tight leading-none mb-2">
                    {asset.brand} {asset.model}
                  </h1>
                  <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border border-current bg-opacity-10 bg-${status.color}-500 text-${status.color}-700 border-${status.color}-200`}>
                    {status.label}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Código Único</p>
                <p className="text-lg font-black text-blue-700 font-mono">{asset.codigo_unico || 'S/C'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-4 text-blue-600 border-b border-blue-100 pb-2">
                    <Tag size={16} strokeWidth={3} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Identificación y Descripción</h3>
                  </div>
                  <div className="bg-white p-6 border border-slate-200 shadow-sm space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Descripción</label>
                        <p className="text-[13px] font-bold text-slate-700 uppercase">{asset.descripcion || 'Sin descripción'}</p>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nº de Serie</label>
                        <p className="text-[13px] font-mono font-bold text-slate-700">{asset.serial_number || 'S/N'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Color</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.color || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Gama</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.gama || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Unidad</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.unidad_medida || 'UNIDAD'}</p>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cantidad</label>
                        <p className="text-[11px] font-bold text-slate-700">{asset.cantidad || '1'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4 text-emerald-600 border-b border-emerald-100 pb-2">
                    <Monitor size={16} strokeWidth={3} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Especificaciones Técnicas</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 bg-white p-6 border border-slate-200 shadow-sm">
                    {asset.processor && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Procesador</label>
                        <p className="text-[11px] font-bold text-slate-700">{asset.processor}</p>
                      </div>
                    )}
                    {asset.ram && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">RAM</label>
                        <p className="text-[11px] font-bold text-slate-700">{asset.ram}</p>
                      </div>
                    )}
                    {asset.capacity && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Capacidad</label>
                        <p className="text-[11px] font-bold text-slate-700">{asset.capacity}</p>
                      </div>
                    )}
                    {asset.ip_address && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">IP Address</label>
                        <p className="text-[11px] font-bold text-slate-700 font-mono">{asset.ip_address}</p>
                      </div>
                    )}
                    {asset.anydesk_id && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">AnyDesk</label>
                        <p className="text-[11px] font-bold text-blue-600 font-mono">{asset.anydesk_id}</p>
                      </div>
                    )}
                    {asset.operating_system && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">S.O.</label>
                        <p className="text-[11px] font-bold text-slate-700">{asset.operating_system}</p>
                      </div>
                    )}
                  </div>
                </section>

                {asset.notes && (
                  <section>
                    <div className="flex items-center gap-2 mb-4 text-slate-400 border-b border-slate-100 pb-2">
                      <Info size={16} strokeWidth={3} />
                      <h3 className="text-[11px] font-black uppercase tracking-widest">Observaciones</h3>
                    </div>
                    <div className="bg-white p-6 border border-slate-200 shadow-sm italic text-slate-600 text-sm leading-relaxed">
                      "{asset.notes}"
                    </div>
                  </section>
                )}
              </div>

              {/* Sidebar Details */}
              <div className="space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-4 text-rose-500 border-b border-rose-100 pb-2">
                    <MapPin size={16} strokeWidth={3} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Sede</h3>
                  </div>
                  <div className="bg-white p-6 border border-slate-200 shadow-sm">
                    <p className="text-[13px] font-black text-[#002855] uppercase mb-1">{asset.locations?.name || 'No asignada'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sede Principal</p>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4 text-blue-500 border-b border-blue-100 pb-2">
                    <Info size={16} strokeWidth={3} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Ubicación del Activo</h3>
                  </div>
                  <div className="bg-white p-6 border border-slate-200 shadow-sm">
                    <p className="text-[13px] font-black text-[#002855] uppercase mb-1">{asset.areas?.name || asset.area || 'Área General'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Departamento / Área</p>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4 text-purple-500 border-b border-purple-100 pb-2">
                    <ShoppingCart size={16} strokeWidth={3} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Adquisición y Uso</h3>
                  </div>
                  <div className="bg-white p-6 border border-slate-200 shadow-sm space-y-5">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor Estimado</label>
                      <p className="text-sm font-black text-slate-700">S/.{asset.valor_estimado?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fecha</label>
                      <p className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                        <Calendar size={14} className="text-slate-300" />
                        {asset.fecha_adquisicion ? new Date(asset.fecha_adquisicion).toLocaleDateString('es-ES') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Condición</label>
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-current ${asset.condicion === 'Nuevo' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {asset.condicion || 'No especificada'}
                      </span>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estado de Uso</label>
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-current ${asset.estado_uso === 'Operativo' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}>
                        {asset.estado_uso || 'No especificado'}
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Corporativo (Botones Cuadrados) */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 z-10 shrink-0">
          <button
            onClick={onClose}
            className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 bg-white border border-slate-200 rounded-none hover:bg-slate-50 transition-all shadow-sm"
          >
            Cerrar
          </button>
          <button
            onClick={onEdit}
            className="px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-blue-600 rounded-none hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"
          >
            <Edit size={14} /> Editar Activo
          </button>
        </div>
      </div>
    </div>
  );
}
