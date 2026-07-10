import { useState } from 'react';
import { Layers, AlertCircle } from 'lucide-react';
import { useNotify } from '../../../shared/hooks/useNotify';
import { supabase, AssetWithDetails } from '../../../shared/services/supabase';
import BaseForm, { FormField, FormInput, FormSelect } from '../../../shared/components/forms/BaseForm';

type DecoupleItem = {
  id: string;
  codigo_unico: string;
  serial_number: string;
  condicion: string;
  estado_uso: string;
};

type DecoupleModalProps = {
  asset: AssetWithDetails;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DecoupleModal({ asset, onClose, onConfirm }: DecoupleModalProps) {
  const { success: notifySuccess, error: notifyError } = useNotify();
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<DecoupleItem[]>(() => {
    const count = parseInt(asset.cantidad?.toString() || '1');
    const arr: DecoupleItem[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        id: crypto.randomUUID(),
        codigo_unico: i === 0 ? (asset.codigo_unico || '') : 'ACT-' + Math.floor(100000 + Math.random() * 900000).toString(),
        serial_number: asset.serial_number || '',
        condicion: asset.condicion || 'Nuevo',
        estado_uso: asset.estado_uso || 'Operativo',
      });
    }
    return arr;
  });

  const handleChange = (index: number, field: keyof DecoupleItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate unique codes
      const codes = items.map(i => i.codigo_unico).filter(c => c.trim() !== '');
      if (new Set(codes).size !== codes.length) {
        throw new Error('Hay códigos únicos duplicados. Todos deben ser diferentes.');
      }

      // Base object without relations or metadata
      const { id, categories, subcategories, locations, areas, created_at, updated_at, ...baseAsset } = asset as any;
      baseAsset.cantidad = 1;

      // Item 0 is the update to the original record
      const originalUpdate = {
        ...baseAsset,
        codigo_unico: items[0].codigo_unico,
        serial_number: items[0].serial_number,
        condicion: items[0].condicion,
        estado_uso: items[0].estado_uso,
      };

      // Items 1 to N are new inserts
      const newAssets = items.slice(1).map(item => ({
        ...baseAsset,
        codigo_unico: item.codigo_unico,
        serial_number: item.serial_number,
        condicion: item.condicion,
        estado_uso: item.estado_uso,
      }));

      // Update original
      const { error: updateError } = await supabase.from('assets').update(originalUpdate).eq('id', asset.id);
      if (updateError) throw updateError;

      // Insert new ones
      if (newAssets.length > 0) {
        const { error: insertError } = await supabase.from('assets').insert(newAssets);
        if (insertError) throw insertError;
      }

      notifySuccess(`El registro se dividió en ${items.length} activos independientes.`, '¡Desacoplado exitoso!');
      onConfirm();
    } catch (err: any) {
      notifyError('Error al desacoplar: ' + err.message, 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm
      title="Desacoplar Activos"
      subtitle={`Especifica las características individuales para las ${items.length} unidades.`}
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
            Estás a punto de dividir <strong>{asset.item || asset.descripcion}</strong> (Cantidad: {items.length}) en registros individuales.
            Revisa y ajusta los números de serie, condiciones y estado operativo antes de guardar.
          </p>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-3">
              <div className="font-bold text-slate-700 text-sm flex items-center gap-2">
                <span className="bg-[#002855] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                  {index + 1}
                </span>
                Activo {index + 1}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField label="Código Único" required>
                  <FormInput
                    value={item.codigo_unico}
                    onChange={e => handleChange(index, 'codigo_unico', e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Número de Serie">
                  <FormInput
                    value={item.serial_number}
                    onChange={e => handleChange(index, 'serial_number', e.target.value)}
                    placeholder="Ej: SN-12345"
                  />
                </FormField>

                <FormField label="Condición" required>
                  <FormSelect
                    value={item.condicion}
                    onChange={e => handleChange(index, 'condicion', e.target.value)}
                  >
                    <option value="Nuevo">Nuevo</option>
                    <option value="Usado">Usado</option>
                    <option value="Malo">Malo</option>
                    <option value="Para Baja">Para Baja</option>
                  </FormSelect>
                </FormField>

                <FormField label="Estado Operativo" required>
                  <FormSelect
                    value={item.estado_uso}
                    onChange={e => handleChange(index, 'estado_uso', e.target.value)}
                  >
                    <option value="Operativo">Operativo</option>
                    <option value="Inoperativo">Inoperativo</option>
                    <option value="En Reparación">En Reparación</option>
                    <option value="Desaparecido">Desaparecido</option>
                  </FormSelect>
                </FormField>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BaseForm>
  );
}
