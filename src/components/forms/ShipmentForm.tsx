import { useState, useEffect } from 'react';
import { Truck, Search } from 'lucide-react';
import { supabase, AssetWithDetails, Location } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

type ShipmentType = {
  id: string;
  asset_id: string;
  from_location_id?: string;
  to_location_id: string;
  shipment_date: string;
  shipped_by?: string;
  received_by?: string;
  tracking_number?: string;
  carrier?: string;
  status: 'shipped' | 'in_transit' | 'delivered' | 'returned';
  notes?: string;
  created_at: string;
  updated_at: string;
};

type ShipmentFormProps = {
  onClose: () => void;
  onSave: () => void;
  editShipment?: ShipmentType;
};

export default function ShipmentForm({ onClose, onSave, editShipment }: ShipmentFormProps) {
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetWithDetails[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assetSearch, setAssetSearch] = useState('');

  const [formData, setFormData] = useState({
    asset_id: editShipment?.asset_id || '',
    from_location_id: editShipment?.from_location_id || '',
    to_location_id: editShipment?.to_location_id || '',
    shipment_date: editShipment?.shipment_date || new Date().toISOString().split('T')[0],
    shipped_by: editShipment?.shipped_by || '',
    received_by: editShipment?.received_by || '',
    tracking_number: editShipment?.tracking_number || '',
    carrier: editShipment?.carrier || '',
    status: editShipment?.status || 'shipped',
    notes: editShipment?.notes || '',
  });

  const statuses = [
    { value: 'shipped', label: 'Enviado' },
    { value: 'in_transit', label: 'En Tránsito' },
    { value: 'delivered', label: 'Entregado' },
    { value: 'returned', label: 'Devuelto' },
  ];

  const carriers = [
    { value: 'serpost', label: 'Serpost' },
    { value: 'olva', label: 'Olva Courier' },
    { value: 'shippo', label: 'Shippo Express' },
    { value: 'dhl', label: 'DHL' },
    { value: 'fedex', label: 'FedEx' },
    { value: 'ups', label: 'UPS' },
    { value: 'local', label: 'Transporte Local' },
    { value: 'other', label: 'Otro' },
  ];

  useEffect(() => {
    fetchAssets();
    fetchLocations();
  }, []);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          location:location_id(name),
          category:category_id(name)
        `)
        .eq('status', 'active');

      if (!error && data) {
        setAssets(data);
        setFilteredAssets(data);
      }
    } catch (error) {
      console.error('Error al cargar activos:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (!error && data) {
        setLocations(data);
      }
    } catch (error) {
      console.error('Error al cargar ubicaciones:', error);
    }
  };

  useEffect(() => {
    if (assetSearch) {
      const filtered = assets.filter(asset =>
        (asset.name?.toLowerCase() || '').includes(assetSearch.toLowerCase()) ||
        (asset.serial_number?.toLowerCase() || '').includes(assetSearch.toLowerCase())
      );
      setFilteredAssets(filtered);
    } else {
      setFilteredAssets(assets);
    }
  }, [assetSearch, assets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.asset_id) {
      newErrors.asset_id = 'El activo es requerido';
    }

    if (!formData.to_location_id) {
      newErrors.to_location_id = 'La ubicación de destino es requerida';
    }

    if (!formData.shipment_date) {
      newErrors.shipment_date = 'La fecha de envío es requerida';
    }

    if (!formData.status) {
      newErrors.status = 'El estado es requerido';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    const dataToSave = {
      asset_id: formData.asset_id,
      from_location_id: formData.from_location_id || null,
      to_location_id: formData.to_location_id,
      shipment_date: formData.shipment_date,
      shipped_by: formData.shipped_by.trim() || null,
      received_by: formData.received_by.trim() || null,
      tracking_number: formData.tracking_number.trim() || null,
      carrier: formData.carrier.trim() || null,
      status: formData.status,
      notes: formData.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editShipment?.id) {
        const { error } = await supabase
          .from('shipments')
          .update(dataToSave)
          .eq('id', editShipment.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar el envío: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('shipments')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear el envío: ' + error.message });
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      onSave();
    } catch (err: any) {
      setErrors({ submit: 'Error inesperado: ' + err });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAssetSelect = (assetId: string) => {
    setFormData(prev => ({ ...prev, asset_id: assetId }));
    setAssetSearch('');
    setFilteredAssets(assets);
  };

  const getSelectedAsset = () => {
    return assets.find(asset => asset.id === formData.asset_id);
  };

  return (
    <BaseForm
      title={editShipment ? 'Editar Envío' : 'Nuevo Envío'}
      subtitle="Módulo de Gestión de Envíos"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Truck size={24} className="text-blue-600" />}
    >
      {/* Section: Información del Envío */}
      <FormSection title="Información del Envío" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Activo a Enviar" required error={errors.asset_id}>
            <div className="relative">
              <div className="relative">
                <FormInput
                  type="text"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Buscar activo..."
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
              
              {assetSearch && filteredAssets.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                  {filteredAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => handleAssetSelect(asset.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{asset.name || 'Sin nombre'}</div>
                          <div className="text-sm text-gray-500">
                            {asset.serial_number || 'Sin código'}
                          </div>
                        </div>
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {(asset as any).category?.name || 'Sin categoría'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {formData.asset_id && getSelectedAsset() && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-900">{getSelectedAsset()?.name || 'Sin nombre'}</div>
                      <div className="text-sm text-blue-700">
                        {getSelectedAsset()?.serial_number || 'Sin código'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, asset_id: '' }))}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </FormField>

          <FormField label="Ubicación de Origen" error={errors.from_location_id}>
            <FormSelect
              name="from_location_id"
              value={formData.from_location_id}
              onChange={handleChange}
              error={errors.from_location_id}
            >
              <option value="">Seleccionar origen</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Ubicación de Destino" required error={errors.to_location_id}>
            <FormSelect
              name="to_location_id"
              value={formData.to_location_id}
              onChange={handleChange}
              required
              error={errors.to_location_id}
            >
              <option value="">Seleccionar destino</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Fecha de Envío" required error={errors.shipment_date}>
            <FormInput
              type="date"
              name="shipment_date"
              value={formData.shipment_date}
              onChange={handleChange}
              required
              error={errors.shipment_date}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Estado y Transportista */}
      <FormSection title="Estado y Transportista" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Estado del Envío" required error={errors.status}>
            <FormSelect
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              error={errors.status}
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Transportista" error={errors.carrier}>
            <FormSelect
              name="carrier"
              value={formData.carrier}
              onChange={handleChange}
              error={errors.carrier}
            >
              <option value="">Seleccionar transportista</option>
              {carriers.map((carrier) => (
                <option key={carrier.value} value={carrier.value}>
                  {carrier.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Número de Seguimiento" error={errors.tracking_number}>
            <FormInput
              type="text"
              name="tracking_number"
              value={formData.tracking_number}
              onChange={handleChange}
              placeholder="Ej: 1234567890"
              error={errors.tracking_number}
            />
          </FormField>

          <FormField label="Enviado por" error={errors.shipped_by}>
            <FormInput
              type="text"
              name="shipped_by"
              value={formData.shipped_by}
              onChange={handleChange}
              placeholder="Nombre del responsable del envío"
              error={errors.shipped_by}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Recepción */}
      <FormSection title="Información de Recepción" color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Recibido por" error={errors.received_by}>
            <FormInput
              type="text"
              name="received_by"
              value={formData.received_by}
              onChange={handleChange}
              placeholder="Nombre del receptor"
              error={errors.received_by}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Notas */}
      <FormSection title="Notas Adicionales" color="purple">
        <FormField label="Notas y Observaciones" error={errors.notes}>
          <FormTextarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Notas adicionales sobre el envío, instrucciones especiales, condiciones del paquete, etc..."
            rows={4}
            error={errors.notes}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
