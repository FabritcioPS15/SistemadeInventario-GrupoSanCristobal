import { useState, useEffect } from 'react';
import { Plus, Search, Monitor, Smartphone, Camera, HardDrive, Printer, Scan, Laptop, Projector, Network, CreditCard, Droplets, Zap, MemoryStick, Database, HardDriveIcon, ChevronDown, ChevronUp, Edit, Trash2, Eye, Package } from 'lucide-react';
import { GiCctvCamera } from 'react-icons/gi';
import { supabase, AssetWithDetails, Location, AssetType } from '../lib/supabase';
import AssetForm from '../components/forms/AssetForm';
import AssetDetails from '../components/AssetDetails';
import CollapsibleCategory from '../components/CollapsibleCategory';
import PCForm from '../components/forms/PCForm';
import { useAuth } from '../contexts/AuthContext';

type InventoryProps = {
  categoryFilter?: string;
};

export default function Inventory({ categoryFilter }: InventoryProps) {
  const { canEdit } = useAuth();
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showPCForm, setShowPCForm] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithDetails | undefined>();
  const [editingAsset, setEditingAsset] = useState<AssetWithDetails | undefined>();
  const [editingPC, setEditingPC] = useState<any | undefined>();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchAssets(), fetchLocations(), fetchAssetTypes()]);
    setLoading(false);
  };

  const handleEditAsset = (asset: AssetWithDetails) => {
    console.log('Editando activo:', asset);
    if (asset.asset_types?.name === 'PC' || asset.asset_types?.name === 'Laptop' || categoryFilter === 'inventory-pc') {
      setEditingPC(asset);
      setShowPCForm(true);
    } else {
      setEditingAsset(asset);
      setShowAssetForm(true);
    }
  };

  const handleEditPC = (pc: any) => {
    console.log('Editando PC:', pc);
    setEditingPC(pc);
    setShowPCForm(true);
  };

  const handleDeleteAsset = async (asset: AssetWithDetails) => {
    console.log('Eliminando activo:', asset);

    // Check for related records first
    try {
      const { data: maintenanceRecords, error: maintenanceError } = await supabase
        .from('maintenance_records')
        .select('id')
        .eq('asset_id', asset.id);

      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select('id')
        .eq('asset_id', asset.id);

      if (maintenanceError || shipmentsError) {
        console.error('Error checking related records:', maintenanceError || shipmentsError);
      }

      const hasMaintenanceRecords = maintenanceRecords && maintenanceRecords.length > 0;
      const hasShipments = shipments && shipments.length > 0;

      let confirmMessage = `¿Estás seguro de que quieres eliminar el activo "${asset.brand} ${asset.model}"?`;

      if (hasMaintenanceRecords || hasShipments) {
        confirmMessage += '\n\nEste activo tiene registros relacionados:';
        if (hasMaintenanceRecords) {
          confirmMessage += `\n- ${maintenanceRecords.length} registro(s) de mantenimiento`;
        }
        if (hasShipments) {
          confirmMessage += `\n- ${shipments.length} registro(s) de envío`;
        }
        confirmMessage += '\n\nEstos registros también serán eliminados.';
      }

      if (window.confirm(confirmMessage)) {
        try {
          console.log('Iniciando eliminación...');

          // Delete the asset (related records will be deleted automatically due to CASCADE)
          const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', asset.id);

          if (error) {
            console.error('Error al eliminar activo:', error);
            alert('Error al eliminar el activo: ' + error.message);
          } else {
            console.log('Activo eliminado correctamente');
            await fetchAssets(); // Recargar datos
            alert('Activo eliminado correctamente');
          }
        } catch (err) {
          console.error('Error al eliminar activo:', err);
          alert('Error al eliminar el activo: ' + err);
        }
      }
    } catch (err) {
      console.error('Error verificando registros relacionados:', err);
      // Fallback to simple deletion if we can't check related records
      if (window.confirm(`¿Estás seguro de que quieres eliminar el activo "${asset.brand} ${asset.model}"?`)) {
        try {
          const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', asset.id);

          if (error) {
            console.error('Error al eliminar activo:', error);
            alert('Error al eliminar el activo: ' + error.message);
          } else {
            console.log('Activo eliminado correctamente');
            await fetchAssets();
            alert('Activo eliminado correctamente');
          }
        } catch (deleteErr) {
          console.error('Error al eliminar activo:', deleteErr);
          alert('Error al eliminar el activo: ' + deleteErr);
        }
      }
    }
  };

  const handleViewAsset = (asset: AssetWithDetails) => {
    setSelectedAsset(asset);
    setShowAssetDetails(true);
  };

  const handleSaveAsset = async () => {
    setShowAssetForm(false);
    setEditingAsset(undefined);
    await fetchAssets(); // Recargar datos
  };

  const handleSavePC = async () => {
    setShowPCForm(false);
    setEditingPC(undefined);
    await fetchAssets(); // Recargar datos
  };

  const handleCloseForm = () => {
    setShowAssetForm(false);
    setEditingAsset(undefined);
  };

  const handleClosePCForm = () => {
    setShowPCForm(false);
    setEditingPC(undefined);
  };

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('assets')
      .select('*, asset_types(*), locations(*)')
      .order('created_at', { ascending: false });
    if (data) setAssets(data as AssetWithDetails[]);
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (data) setLocations(data);
  };

  const fetchAssetTypes = async () => {
    const { data } = await supabase
      .from('asset_types')
      .select('*')
      .order('name');
    if (data) setAssetTypes(data);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAllCategories = () => {
    const allCategoryIds = new Set(assetTypes.map(type => type.id));
    setExpandedCategories(allCategoryIds);
  };

  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  // Mapear filtro de categoría a tipo de activo
  const getCategoryFromFilter = (filter?: string) => {
    if (!filter) return '';

    const categoryMap: Record<string, string> = {
      'inventory-pc': 'PC',
      'inventory-celular': 'Celular',
      'inventory-camara': 'Cámara',
      'inventory-dvr': 'DVR',
      'inventory-impresora': 'Impresora',
      'inventory-escaner': 'Escáner',
      'inventory-monitor': 'Monitor',
      'inventory-laptop': 'Laptop',
      'inventory-proyector': 'Proyector',
      'inventory-switch': 'Switch',
      'inventory-chip': 'Chip de Celular',
      'inventory-tinte': 'Tinte',
      'inventory-fuente': 'Fuente de Poder',
      'inventory-ram': 'Memoria RAM',
      'inventory-disco': 'Disco de Almacenamiento',
      'inventory-disco-extraido': 'Disco Extraído',
    };

    return categoryMap[filter] || '';
  };

  // Obtener el ID del tipo de activo basado en el filtro
  const getAssetTypeIdFromFilter = (filter?: string) => {
    if (!filter) return '';
    const categoryName = getCategoryFromFilter(filter);
    const assetType = assetTypes.find(type => type.name === categoryName);
    return assetType?.id || '';
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch =
      asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_types.name.toLowerCase().includes(searchTerm.toLowerCase());

    // Aplicar filtro de categoría desde el menú
    const categoryFromFilter = getCategoryFromFilter(categoryFilter);
    const matchesCategoryFilter = !categoryFromFilter || asset.asset_types.name === categoryFromFilter;
    // Excluir cámaras de la vista general de inventario
    const isCamera = asset.asset_types.name === 'Cámara';

    const matchesLocation = !filterLocation || asset.location_id === filterLocation;
    const matchesStatus = !filterStatus || asset.status === filterStatus;

    return !isCamera && matchesSearch && matchesCategoryFilter && matchesLocation && matchesStatus;
  });

  // Mapeo de iconos para cada tipo de activo
  const getIconForType = (typeName: string) => {
    const iconMap: Record<string, any> = {
      'PC': Monitor,
      'Celular': Smartphone,
      'Cámara': GiCctvCamera,
      'DVR': HardDrive,
      'Impresora': Printer,
      'Escáner': Scan,
      'Monitor': Monitor,
      'Laptop': Laptop,
      'Proyector': Projector,
      'Switch': Network,
      'Chip de Celular': CreditCard,
      'Tinte': Droplets,
      'Fuente de Poder': Zap,
      'Memoria RAM': MemoryStick,
      'Disco de Almacenamiento': Database,
      'Disco Extraído': HardDriveIcon,
    };

    return iconMap[typeName] || Monitor;
  };

  // Colores para cada categoría
  const getColorForType = (typeName: string) => {
    const colorMap: Record<string, string> = {
      'PC': 'bg-blue-50 text-blue-700 border-blue-200',
      'Celular': 'bg-purple-50 text-purple-700 border-purple-200',
      'Cámara': 'bg-green-50 text-green-700 border-green-200',
      'DVR': 'bg-orange-50 text-orange-700 border-orange-200',
      'Impresora': 'bg-red-50 text-red-700 border-red-200',
      'Escáner': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Monitor': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Laptop': 'bg-pink-50 text-pink-700 border-pink-200',
      'Proyector': 'bg-teal-50 text-teal-700 border-teal-200',
      'Switch': 'bg-gray-50 text-gray-700 border-gray-200',
      'Chip de Celular': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'Tinte': 'bg-amber-50 text-amber-700 border-amber-200',
      'Fuente de Poder': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Memoria RAM': 'bg-violet-50 text-violet-700 border-violet-200',
      'Disco de Almacenamiento': 'bg-rose-50 text-rose-700 border-rose-200',
      'Disco Extraído': 'bg-slate-50 text-slate-700 border-slate-200',
    };

    return colorMap[typeName] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Agrupar activos por categoría
  const categoryFromFilter = getCategoryFromFilter(categoryFilter);
  const assetsByCategory = assetTypes
    // Excluir la categoría de cámaras del listado de categorías
    .filter(type => (type.name !== 'Cámara') && (!categoryFromFilter || type.name === categoryFromFilter))
    .map(type => ({
      type,
      assets: filteredAssets.filter(asset => asset.asset_type_id === type.id),
      icon: getIconForType(type.name),
      colorClass: getColorForType(type.name),
    }));

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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 border border-orange-200 rounded-lg p-2">
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Inventario
              {categoryFromFilter && (
                <span className="ml-2 text-sm font-normal text-orange-600">({categoryFromFilter})</span>
              )}
            </h2>
            <p className="text-gray-600">
              {categoryFromFilter ? `Gestión de activos ${categoryFromFilter.toLowerCase()}` : 'Gestión de activos tecnológicos'}
            </p>
          </div>
        </div>
        {canEdit() && (
          <button
            onClick={() => {
              setSelectedAsset(undefined);
              if (categoryFilter === 'inventory-pc') {
                setEditingPC(undefined);
                setShowPCForm(true);
              } else {
                setShowAssetForm(true);
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Plus size={20} />
            {categoryFilter === 'inventory-pc' ? 'Nueva PC/Laptop' : 'Nuevo Activo'}
          </button>
        )}
      </div>

      {/* Controles de filtrado */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar activos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las sedes</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="extracted">Extraído</option>
          </select>
        </div>

        {/* Controles de expansión */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAllCategories}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
          >
            <ChevronDown size={14} />
            Expandir Todo
          </button>
          <button
            onClick={collapseAllCategories}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors"
          >
            <ChevronUp size={14} />
            Contraer Todo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {assetsByCategory.map(({ type, assets: categoryAssets, icon, colorClass }) => (
            <CollapsibleCategory
              key={type.id}
              categoryName={type.name}
              assets={categoryAssets}
              icon={icon}
              colorClass={colorClass}
              onEditAsset={handleEditAsset}
              onViewAsset={handleViewAsset}
              onDeleteAsset={handleDeleteAsset}
              onAddAsset={() => {
                setEditingAsset(undefined);
                if (categoryFilter === 'inventory-pc') {
                  setEditingPC(undefined);
                  setShowPCForm(true);
                } else {
                  setShowAssetForm(true);
                }
              }}
              isExpanded={expandedCategories.has(type.id)}
              onToggleExpand={() => toggleCategory(type.id)}
              canEdit={canEdit()}
            />
          ))}
        </div>
      )}

      {!loading && filteredAssets.length === 0 && (
        <div className="text-left py-12">
          <p className="text-gray-500">No se encontraron activos</p>
        </div>
      )}

      {showAssetForm && (
        <AssetForm
          onClose={handleCloseForm}
          onSave={handleSaveAsset}
          editAsset={editingAsset}
          preselectedAssetTypeId={getAssetTypeIdFromFilter(categoryFilter)}
        />
      )}

      {showPCForm && (
        <PCForm
          editPC={editingPC}
          onClose={handleClosePCForm}
          onSave={handleSavePC}
        />
      )}

      {showAssetDetails && selectedAsset && (
        <AssetDetails
          asset={selectedAsset}
          onClose={() => {
            setShowAssetDetails(false);
            setSelectedAsset(undefined);
          }}
        />
      )}
    </div>
  );
}
