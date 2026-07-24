import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {  Monitor, MapPin, Package, Calendar, Tag, Info, ShoppingCart, AlertTriangle, Smartphone, Printer, Wrench } from 'lucide-react';
import { supabase, AssetWithDetails } from '../../../shared/services/supabase';
import DetailModal, { DetailModalBody, StandardModalHeader, StandardModalBanner, StandardModalFooter } from '../../../shared/components/ui/DetailModal';

type AssetDetailsProps = {
  asset: AssetWithDetails;
  onClose: () => void;
  onEdit?: () => void;
};

export default function AssetDetails({ asset, onClose, onEdit }: AssetDetailsProps) {
  const navigate = useNavigate();
  const [hasMaintenance, setHasMaintenance] = useState(false);
  const [maintenanceCount, setMaintenanceCount] = useState(0);

  useEffect(() => {
    const checkMaintenance = async () => {
      const { count, error } = await supabase
        .from('maintenance_records')
        .select('*', { count: 'exact', head: true })
        .eq('asset_id', asset.id);

      if (!error && count && count > 0) {
        setHasMaintenance(true);
        setMaintenanceCount(count);
      }
    };
    checkMaintenance();
  }, [asset.id]);

  const handleMaintenanceClick = () => {
    onClose();
    navigate('/maintenance', { state: { assetFilter: asset.id } });
  };

  const statusMap: Record<string, { label: string, color: string }> = {
    active: { label: 'Activo', color: 'emerald' },
    inactive: { label: 'Inactivo', color: 'slate' },
    maintenance: { label: 'Mantenimiento', color: 'amber' },
    extracted: { label: 'Extraído', color: 'rose' }
  };

  const status = statusMap[asset.status] || { label: asset.status, color: 'slate' };

  return (
    <DetailModal maxWidth="7xl" onClose={onClose}>
      <StandardModalHeader
        title="Vista Previa del Activo"
        subtitle={`${asset.categories?.name || 'SIN CATEGORÍA'} ${asset.subcategories?.name || ''}`}
        icon={Package}
        onClose={onClose}
      />

      <DetailModalBody className="bg-gray-50/50">
        <div className="space-y-6 sm:space-y-8">
          <StandardModalBanner
            title={`${asset.brand || ''} ${asset.model || ''}`.trim() || 'SIN MARCA / MODELO'}
            icon={Package}
            badges={
              <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border border-current bg-opacity-10 bg-${status.color}-500 text-${status.color}-700 border-${status.color}-200`}>
                {status.label}
              </span>
            }
            rightLabel="Código Único"
            rightValue={asset.codigo_unico || 'S/C'}
          />

          {asset.status === 'maintenance' && (
            <div className="bg-amber-50 border border-amber-200 p-4 shadow-sm flex items-start gap-3 min-w-0">
              <div className="mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-[12px] font-black text-amber-800 uppercase tracking-widest">Activo en Mantenimiento</h3>
                <p className="mt-1 text-[11px] font-medium text-amber-700">Este equipo se encuentra actualmente en proceso de revisión o reparación.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 min-w-0">
            {/* Columna 1: Identificación y Notas */}
            <div className="space-y-6 sm:space-y-8 min-w-0">
              <section>
                <div className="flex items-center gap-2 mb-4 text-blue-600 border-b border-blue-100 pb-2">
                  <Tag size={16} strokeWidth={3} />
                  <h3 className="text-[11px] font-black uppercase tracking-widest">Identificación y Descripción</h3>
                </div>
                <div className="bg-white p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Activo</label>
                      <p className="text-[13px] font-bold text-slate-700 uppercase">{asset.item || asset.descripcion || 'Sin descripción'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nº de Serie</label>
                      <p className="text-[13px] font-mono font-bold text-slate-700">{asset.serial_number || 'S/N'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Color</label>
                      <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.color || 'N/A'}</p>
                    </div>
                    <div className="text-center">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cantidad</label>
                      <p className="text-[11px] font-bold text-slate-700">{asset.cantidad || '1'}</p>
                    </div>
                  </div>
                  {hasMaintenance && (
                    <div className="pt-4 border-t border-slate-50">
                      <div className="flex flex-col items-start justify-center bg-amber-50/30 p-3 rounded border border-amber-100">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1">
                          <Wrench size={12} className="text-amber-500" />
                          Mantenimientos Registrados
                        </label>
                        <button
                          onClick={handleMaintenanceClick}
                          className="text-[11px] font-bold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-sm hover:bg-amber-200 hover:text-amber-800 transition-colors flex items-center gap-1 shadow-sm border border-amber-200"
                        >
                          Ver {maintenanceCount} registro(s) &rarr;
                        </button>
                      </div>
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

            {/* Columna 2: Especificaciones Técnicas */}
            <div className="space-y-6 sm:space-y-8 min-w-0">
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

              {(asset.processor || asset.ram || asset.capacity || asset.ip_address || asset.anydesk_id || asset.operating_system) && (
                <section>
                  <div className="flex items-center gap-2 mb-4 text-emerald-600 border-b border-emerald-100 pb-2">
                    <Monitor size={16} strokeWidth={3} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Especificaciones Técnicas (Cómputo/Red)</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6 bg-white p-6 border border-slate-200 shadow-sm">
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
              )}

              {/* Impresoras Info */}
              {(asset.tipo_impresion || asset.tecnologia_impresion || asset.velocidad_impresion || asset.resolucion) && (
                <section>
                  <div className="flex items-center gap-2 mb-4 text-purple-600 border-b border-purple-100 pb-2">
                    <Printer size={16} strokeWidth={3} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Datos de Impresora</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6 bg-white p-6 border border-slate-200 shadow-sm">
                    {asset.tipo_impresion && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tipo</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.tipo_impresion}</p>
                      </div>
                    )}
                    {asset.tecnologia_impresion && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tecnología</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.tecnologia_impresion}</p>
                      </div>
                    )}
                    {asset.velocidad_impresion && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Velocidad</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.velocidad_impresion}</p>
                      </div>
                    )}
                    {asset.resolucion && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Resolución</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.resolucion}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Móviles Info */}
              {(asset.imei || asset.operator || asset.data_plan || asset.almacenamiento || asset.bateria_estado || asset.accesorios) && (
                <section>
                  <div className="flex items-center gap-2 mb-4 text-blue-600 border-b border-blue-100 pb-2">
                    <Smartphone size={16} strokeWidth={3} />
                    <h3 className="text-[11px] font-black uppercase tracking-widest">Datos de Equipo Móvil</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6 bg-white p-6 border border-slate-200 shadow-sm">
                    {asset.imei && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">IMEI</label>
                        <p className="text-[11px] font-bold text-slate-700 font-mono">{asset.imei}</p>
                      </div>
                    )}
                    {asset.operator && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Operador</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.operator}</p>
                      </div>
                    )}
                    {asset.data_plan && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Plan de Datos</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.data_plan}</p>
                      </div>
                    )}
                    {asset.almacenamiento && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Almacenamiento</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.almacenamiento}</p>
                      </div>
                    )}
                    {asset.bateria_estado && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Est. Batería</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.bateria_estado}</p>
                      </div>
                    )}
                    {asset.accesorios && (
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Accesorios</label>
                        <p className="text-[11px] font-bold text-slate-700 uppercase">{asset.accesorios}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

            </div>

            {/* Columna 3: Sidebar Details */}
            <div className="space-y-8">


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
                      {asset.fecha_adquisicion ? new Date(String(asset.fecha_adquisicion).includes('T') ? String(asset.fecha_adquisicion) : `${asset.fecha_adquisicion}T12:00:00`).toLocaleDateString('es-ES') : 'N/A'}
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
      </DetailModalBody>

      <StandardModalFooter
        onClose={onClose}
        onEdit={onEdit}
        editLabel="Editar Activo"
      />
    </DetailModal>
  );
}
