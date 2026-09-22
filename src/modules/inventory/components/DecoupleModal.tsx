import { useState } from 'react';
import { Layers, AlertCircle, Plus, Trash2, RefreshCw, Copy, Package } from 'lucide-react';
import { useNotify } from '../../../shared/hooks/useNotify';
import { supabase, AssetWithDetails } from '../../../shared/services/supabase';
import BaseForm, { FormField, FormInput, FormSelect } from '../../../shared/components/forms/BaseForm';

type DecoupleItem = {
  id: string;
  item: string;
  codigo_unico: string;
  serial_number: string;
  brand: string;
  model: string;
  color: string;
  unidad_medida: string;
  cantidad: number;
  valor_estimado: string;
  condicion: string;
  estado_uso: string;
};

type DecoupleModalProps = {
  asset: AssetWithDetails;
  onClose: () => void;
  onConfirm: () => void;
};

const generarCodigo = () => 'ACT-' + Math.floor(100000 + Math.random() * 900000).toString();

const CONDICIONES = ['Nuevo', 'Usado', 'Malo', 'Para Baja'];
const ESTADOS = ['Operativo', 'Inoperativo', 'En Reparación', 'Desaparecido'];

export default function DecoupleModal({ asset, onClose, onConfirm }: DecoupleModalProps) {
  const { success: notifySuccess, error: notifyError } = useNotify();
  const [loading, setLoading] = useState(false);

  // Por defecto, los artículos sin marca/modelo/serie se tratan como lote genérico
  // (folders, tijeras, suministros, etc.) y no exigen datos técnicos por unidad.
  const [esLoteGenerico, setEsLoteGenerico] = useState<boolean>(() =>
    !(asset.brand || asset.model || asset.serial_number)
  );

  const crearItem = (index: number): DecoupleItem => ({
    id: crypto.randomUUID(),
    item: asset.item || asset.descripcion || '',
    codigo_unico: index === 0 ? (asset.codigo_unico || generarCodigo()) : generarCodigo(),
    serial_number: asset.serial_number || '',
    brand: asset.brand || '',
    model: asset.model || '',
    color: asset.color || '',
    unidad_medida: asset.unidad_medida || 'UNIDAD(ES)',
    cantidad: 1,
    valor_estimado: asset.valor_estimado != null ? String(asset.valor_estimado) : '',
    condicion: asset.condicion || 'Nuevo',
    estado_uso: asset.estado_uso || 'Operativo',
  });

  const [items, setItems] = useState<DecoupleItem[]>(() => {
    const count = Math.max(1, parseInt(asset.cantidad?.toString() || '1', 10));
    return Array.from({ length: count }, (_, i) => crearItem(i));
  });

  const handleChange = (index: number, field: keyof DecoupleItem, value: string | number) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const agregarItem = () => {
    setItems(prev => [...prev, crearItem(prev.length)]);
  };

  const eliminarItem = (index: number) => {
    setItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  // Copia los valores no individuales de la primera fila hacia todas las demás
  // (útil para artículos idénticos en cantidad).
  const aplicarATodos = () => {
    setItems(prev => {
      const ref = prev[0];
      return prev.map(item => ({
        ...item,
        item: ref.item,
        brand: ref.brand,
        model: ref.model,
        color: ref.color,
        unidad_medida: ref.unidad_medida,
        valor_estimado: ref.valor_estimado,
        condicion: ref.condicion,
        estado_uso: ref.estado_uso,
      }));
    });
    notifySuccess('Se copiaron los valores de la primera fila a todos los activos.', 'Valores replicados');
  };

  const regenerarCodigos = () => {
    setItems(prev => prev.map(item => ({ ...item, codigo_unico: generarCodigo() })));
    notifySuccess('Se generaron nuevos códigos únicos para cada activo.', 'Códigos regenerados');
  };

  const totalUnidades = items.reduce((sum, item) => sum + (item.cantidad || 1), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const codigos = items.map(i => i.codigo_unico.trim());
      if (codigos.some(c => c === '')) {
        throw new Error('Todos los activos deben tener un código único.');
      }
      if (new Set(codigos).size !== codigos.length) {
        throw new Error('Hay códigos únicos duplicados. Todos deben ser diferentes.');
      }
      if (items.some(i => !i.cantidad || i.cantidad < 1)) {
        throw new Error('La cantidad de cada activo debe ser mayor o igual a 1.');
      }

      // Base object sin relaciones ni metadatos
      const { id: _id, categories: _c, subcategories: _s, locations: _l, areas: _a, created_at: _created, updated_at: _updated, ...baseAsset } = asset;

      const armarItem = (item: DecoupleItem) => ({
        ...baseAsset,
        item: item.item,
        cantidad: item.cantidad,
        codigo_unico: item.codigo_unico,
        serial_number: esLoteGenerico ? null : (item.serial_number || null),
        brand: esLoteGenerico ? null : (item.brand || null),
        model: esLoteGenerico ? null : (item.model || null),
        color: item.color || null,
        unidad_medida: item.unidad_medida || null,
        valor_estimado: item.valor_estimado !== '' ? parseFloat(item.valor_estimado) : null,
        condicion: item.condicion,
        estado_uso: item.estado_uso,
      });

      // Item 0 actualiza el registro original
      const originalUpdate = {
        ...armarItem(items[0]),
        updated_at: new Date().toISOString(),
      };

      // Items 1 a N son nuevos registros
      const newAssets = items.slice(1).map(armarItem);

      const { error: updateError } = await supabase.from('assets').update(originalUpdate).eq('id', asset.id);
      if (updateError) throw updateError;

      if (newAssets.length > 0) {
        const { error: insertError } = await supabase.from('assets').insert(newAssets);
        if (insertError) throw insertError;
      }

      notifySuccess(
        `El registro se dividió en ${items.length} registros (${totalUnidades} unidades en total).`,
        '¡Desacoplado exitoso!'
      );
      onConfirm();
    } catch (err: any) {
      notifyError('Error al desacoplar: ' + err.message, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const esIdentificable = !esLoteGenerico;

  return (
    <BaseForm
      title="Desacoplar Activos"
      subtitle={`Se dividirá "${asset.item || asset.descripcion}" en ${items.length} registro${items.length !== 1 ? 's' : ''} independientes (${totalUnidades} unidades).`}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      maxWidth="5xl"
      icon={<Layers size={18} className="text-white" />}
    >
      <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[70vh]">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>
            Estás a punto de dividir <strong>{asset.item || asset.descripcion}</strong> (Cantidad: {asset.cantidad || 1}) en
            registros independientes. Puedes editar cada campo libremente, incluso <strong>Nombre</strong>, <strong>Marca</strong> y{' '}
            <strong>Modelo</strong>, o agrupar unidades editando la <strong>cantidad</strong> de cada fila.
          </p>
        </div>

        {/* Modo Lote genérico */}
        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${esLoteGenerico
          ? 'bg-emerald-50 border-emerald-300'
          : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
          <input
            type="checkbox"
            checked={esLoteGenerico}
            onChange={(e) => setEsLoteGenerico(e.target.checked)}
            className="w-4 h-4 mt-0.5 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500"
          />
          <div>
            <p className="text-[12px] font-semibold text-[#002855] tracking-wide">
              Lote genérico / materiales de consumo
            </p>
            <p className="text-[11px] font-normal text-slate-500 leading-relaxed mt-0.5">
              Para artículos en cantidad que no necesitan marca, modelo ni número de serie (ej: paquete de folders, tijeras,
              suministros). Si el activo requiere identificación individual (ej: un mouse, una laptop), déjalo desactivado.
            </p>
          </div>
        </label>

        {/* Barra de acciones rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Package size={14} className="text-blue-500" />
            {items.length} registro{items.length !== 1 ? 's' : ''} · {totalUnidades} unidades
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={aplicarATodos}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-normal uppercase tracking-wider text-slate-700 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
            >
              <Copy size={13} /> Aplicar a todos
            </button>
            <button
              type="button"
              onClick={regenerarCodigos}
              className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-normal uppercase tracking-wider text-slate-700 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
            >
              <RefreshCw size={13} /> Regenerar códigos
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-normal text-slate-700 text-sm flex items-center gap-2">
                  <span className="bg-[#002855] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                  Activo {index + 1}
                </div>
                <button
                  type="button"
                  onClick={() => eliminarItem(index)}
                  disabled={items.length <= 1}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title={items.length <= 1 ? 'Debe quedar al menos un registro' : 'Eliminar este registro'}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Nombre del Activo" required>
                  <FormInput
                    value={item.item}
                    onChange={e => handleChange(index, 'item', e.target.value)}
                    placeholder="Ej. Mouse inalámbrico"
                    required
                  />
                </FormField>

                <FormField label="Código Único" required>
                  <div className="flex gap-1.5">
                    <FormInput
                      value={item.codigo_unico}
                      onChange={e => handleChange(index, 'codigo_unico', e.target.value)}
                      required
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleChange(index, 'codigo_unico', generarCodigo())}
                      className="shrink-0 w-10 h-10 flex items-center justify-center text-slate-400 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all"
                      title="Regenerar código de este activo"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </FormField>

                <FormField label="Cantidad">
                  <FormInput
                    type="number"
                    min={1}
                    step={1}
                    value={item.cantidad}
                    onChange={e => handleChange(index, 'cantidad', parseInt(e.target.value || '1', 10))}
                  />
                </FormField>

                {esIdentificable && (
                  <>
                    <FormField label="Marca">
                      <FormInput
                        value={item.brand}
                        onChange={e => handleChange(index, 'brand', e.target.value)}
                        placeholder="Ej: Dell, HP, Logitech"
                      />
                    </FormField>

                    <FormField label="Modelo">
                      <FormInput
                        value={item.model}
                        onChange={e => handleChange(index, 'model', e.target.value)}
                        placeholder="Ej: M185"
                      />
                    </FormField>

                    <FormField label="Número de Serie">
                      <FormInput
                        value={item.serial_number}
                        onChange={e => handleChange(index, 'serial_number', e.target.value)}
                        placeholder="Ej: SN-12345"
                      />
                    </FormField>
                  </>
                )}

                <FormField label="Unidad de Medida">
                  <FormInput
                    value={item.unidad_medida}
                    onChange={e => handleChange(index, 'unidad_medida', e.target.value)}
                    placeholder="Ej: UNIDAD(ES), CAJA, PAQUETE"
                  />
                </FormField>

                <FormField label="Color">
                  <FormInput
                    value={item.color}
                    onChange={e => handleChange(index, 'color', e.target.value)}
                    placeholder="Ej: Negro"
                  />
                </FormField>

                <FormField label="Valor de Adquisición (S/.)">
                  <FormInput
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.valor_estimado}
                    onChange={e => handleChange(index, 'valor_estimado', e.target.value)}
                    placeholder="0.00"
                  />
                </FormField>

                <FormField label="Condición" required>
                  <FormSelect
                    value={item.condicion}
                    onChange={e => handleChange(index, 'condicion', e.target.value)}
                  >
                    {CONDICIONES.map(cond => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField label="Estado Operativo" required>
                  <FormSelect
                    value={item.estado_uso}
                    onChange={e => handleChange(index, 'estado_uso', e.target.value)}
                  >
                    {ESTADOS.map(est => (
                      <option key={est} value={est}>{est}</option>
                    ))}
                  </FormSelect>
                </FormField>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={agregarItem}
          className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-widest hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={15} /> Agregar otro registro
        </button>
      </div>
    </BaseForm>
  );
}