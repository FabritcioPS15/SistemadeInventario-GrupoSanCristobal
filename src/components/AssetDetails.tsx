import { X, Monitor, MapPin, Camera, ExternalLink } from 'lucide-react';
import { AssetWithDetails } from '../lib/supabase';

type AssetDetailsProps = {
  asset: AssetWithDetails;
  onClose: () => void;
};

export default function AssetDetails({ asset, onClose }: AssetDetailsProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    extracted: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    active: 'Activo',
    inactive: 'Inactivo',
    maintenance: 'Mantenimiento',
    extracted: 'Extraído',
  };

  const typeLabels: Record<string, string> = {
    revision: 'Revisión',
    policlinico: 'Policlínico',
    escuela_conductores: 'Escuela de Conductores',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{asset.asset_types.name}</h2>
            <p className="text-sm text-gray-500">
              {asset.brand} {asset.model}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[asset.status]}`}>
              {statusLabels[asset.status]}
            </span>
            {asset.locations && (
              <span className="flex items-center gap-1 text-sm text-gray-600">
                <MapPin size={16} />
                {asset.locations.name} ({typeLabels[asset.locations.type]})
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {asset.brand && (
              <div>
                <label className="text-sm font-medium text-gray-500">Marca</label>
                <p className="text-gray-900">{asset.brand}</p>
              </div>
            )}
            {asset.model && (
              <div>
                <label className="text-sm font-medium text-gray-500">Modelo</label>
                <p className="text-gray-900">{asset.model}</p>
              </div>
            )}
            {asset.serial_number && (
              <div>
                <label className="text-sm font-medium text-gray-500">Número de Serie</label>
                <p className="text-gray-900">{asset.serial_number}</p>
              </div>
            )}
            {asset.capacity && (
              <div>
                <label className="text-sm font-medium text-gray-500">Capacidad</label>
                <p className="text-gray-900">{asset.capacity}</p>
              </div>
            )}
            {asset.ip_address && (
              <div>
                <label className="text-sm font-medium text-gray-500">Dirección IP</label>
                <p className="text-gray-900">{asset.ip_address}</p>
              </div>
            )}
            {asset.phone_number && (
              <div>
                <label className="text-sm font-medium text-gray-500">Número de Teléfono</label>
                <p className="text-gray-900">{asset.phone_number}</p>
              </div>
            )}
          </div>

          {asset.anydesk_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Monitor size={20} className="text-blue-600" />
                <label className="text-sm font-medium text-blue-900">AnyDesk ID</label>
              </div>
              <p className="text-lg font-mono text-blue-900">{asset.anydesk_id}</p>
            </div>
          )}

          {asset.camera_url && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Camera size={20} className="text-green-600" />
                <label className="text-sm font-medium text-green-900">Acceso a Cámara</label>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-green-700">URL</label>
                  <a
                    href={asset.camera_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-green-900 hover:text-green-700 font-mono text-sm"
                  >
                    {asset.camera_url}
                    <ExternalLink size={14} />
                  </a>
                </div>
                {asset.camera_username && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-green-700">Usuario</label>
                      <p className="text-green-900 font-mono text-sm">{asset.camera_username}</p>
                    </div>
                    {asset.camera_password && (
                      <div>
                        <label className="text-xs font-medium text-green-700">Contraseña</label>
                        <p className="text-green-900 font-mono text-sm">{asset.camera_password}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {asset.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-1">Notas</label>
              <p className="text-gray-900 whitespace-pre-wrap">{asset.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t text-xs text-gray-500">
            <div>
              <label className="font-medium">Creado</label>
              <p>{new Date(asset.created_at).toLocaleDateString('es-ES')}</p>
            </div>
            <div>
              <label className="font-medium">Actualizado</label>
              <p>{new Date(asset.updated_at).toLocaleDateString('es-ES')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
