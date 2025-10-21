import { ChevronDown, ChevronUp, Plus, Search, CreditCard as Edit, Trash2, Eye, MapPin, Monitor, Camera } from 'lucide-react';
import { AssetWithDetails } from '../lib/supabase';

type CollapsibleCategoryProps = {
  categoryName: string;
  assets: AssetWithDetails[];
  icon: any;
  colorClass: string;
  onEditAsset: (asset: AssetWithDetails) => void;
  onViewAsset: (asset: AssetWithDetails) => void;
  onDeleteAsset: (asset: AssetWithDetails) => void;
  onAddAsset: (assetTypeId?: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  canEdit?: boolean;
};

export default function CollapsibleCategory({
  categoryName,
  assets,
  icon: Icon,
  colorClass,
  onEditAsset,
  onViewAsset,
  onDeleteAsset,
  onAddAsset,
  isExpanded = false,
  onToggleExpand,
  canEdit = true,
}: CollapsibleCategoryProps) {

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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      {/* Header de la categoría */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => onToggleExpand && onToggleExpand()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`${colorClass} border rounded-lg p-2`}>
              <Icon size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{categoryName}</h3>
              <p className="text-sm text-gray-600">{assets.length} activos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddAsset();
                }}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              >
                <Plus size={14} />
                Agregar
              </button>
            )}
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* Contenido desplegable */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {assets.length === 0 ? (
            <div className="p-6 text-left text-gray-500">
              <Icon size={48} className="mx-auto mb-2 text-gray-300" />
              <p>No hay activos en esta categoría</p>
              {canEdit && (
                <button
                  onClick={onAddAsset}
                  className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Agregar el primer activo
                </button>
              )}
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.map(asset => (
                  <div key={asset.id} className="bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {asset.brand} {asset.model}
                          </h4>
                          {asset.serial_number && (
                            <p className="text-xs text-gray-600 mb-1">
                              S/N: {asset.serial_number}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[asset.status]}`}>
                          {statusLabels[asset.status]}
                        </span>
                      </div>

                      {asset.locations && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                          <MapPin size={14} />
                          <span>{asset.locations.name}</span>
                        </div>
                      )}

                      <div className="flex gap-2 mb-3">
                        {asset.anydesk_id && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            <Monitor size={14} />
                            <span>AnyDesk</span>
                          </div>
                        )}
                        {asset.camera_url && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                            <Camera size={14} />
                            <span>Cámara</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t">
                        <button
                          onClick={() => onViewAsset(asset)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          <Eye size={16} />
                          Ver
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => onEditAsset(asset)}
                              className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => onDeleteAsset(asset)}
                              className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
