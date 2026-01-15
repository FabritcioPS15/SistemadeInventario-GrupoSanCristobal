import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Monitor, Smartphone, HardDrive, Printer, Scan, Laptop, Projector, Network, CreditCard, Droplets, Zap, MemoryStick, Database, HardDriveIcon, Edit, Trash2, Eye, MapPin, Download, Upload } from 'lucide-react';
import { GiCctvCamera } from 'react-icons/gi';
import ExcelJS from 'exceljs';
import { supabase, AssetWithDetails, Location, AssetType } from '../lib/supabase';
import AssetForm from '../components/forms/AssetForm';
import AssetDetails from '../components/AssetDetails';
import PCForm from '../components/forms/PCForm';
import ExcelImportModal from '../components/ExcelImportModal';
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
  const [exporting, setExporting] = useState(false);

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showPCForm, setShowPCForm] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithDetails | undefined>();
  const [editingAsset, setEditingAsset] = useState<AssetWithDetails | undefined>();
  const [editingPC, setEditingPC] = useState<AssetWithDetails | undefined>();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalAssets = assets.length;
    const activeCount = assets.filter(asset => asset.status === 'active').length;
    const maintenanceCount = assets.filter(asset => asset.status === 'maintenance').length;
    const withoutLocationCount = assets.filter(asset => !asset.location_id).length;

    return { totalAssets, activeCount, maintenanceCount, withoutLocationCount };
  }, [assets]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAssets(), fetchLocations(), fetchAssetTypes()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAsset = (asset: AssetWithDetails) => {
    if (asset.asset_types?.name === 'PC' || asset.asset_types?.name === 'Laptop' || categoryFilter === 'inventory-pc') {
      setEditingPC(asset);
      setShowPCForm(true);
    } else {
      setEditingAsset(asset);
      setShowAssetForm(true);
    }
  };

  const handleToggleSelectConnect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredAssets.map(a => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (window.confirm(`¿Estás seguro de que quieres eliminar ${selectedIds.size} activos seleccionados? Esta acción no se puede deshacer.`)) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('assets')
          .delete()
          .in('id', Array.from(selectedIds));

        if (error) throw error;

        setSelectedIds(new Set());
        await fetchAssets();
      } catch (error: any) {
        console.error('Error deleting assets:', error);
        alert('Error al eliminar activos: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteAsset = async (asset: AssetWithDetails) => {
    // Check for related records first
    try {
      const [maintenanceResult, shipmentsResult] = await Promise.all([
        supabase
          .from('maintenance_records')
          .select('id')
          .eq('asset_id', asset.id),
        supabase
          .from('shipments')
          .select('id')
          .eq('asset_id', asset.id)
      ]);

      const hasMaintenanceRecords = maintenanceResult.data && maintenanceResult.data.length > 0;
      const hasShipments = shipmentsResult.data && shipmentsResult.data.length > 0;

      let confirmMessage = `¿Estás seguro de que quieres eliminar el activo "${asset.brand} ${asset.model}"?`;

      if (hasMaintenanceRecords || hasShipments) {
        confirmMessage += '\n\nEste activo tiene registros relacionados:';
        if (hasMaintenanceRecords) {
          confirmMessage += `\n- ${maintenanceResult.data!.length} registro(s) de mantenimiento`;
        }
        if (hasShipments) {
          confirmMessage += `\n- ${shipmentsResult.data!.length} registro(s) de envío`;
        }
        confirmMessage += '\n\nEstos registros también serán eliminados.';
      }

      if (window.confirm(confirmMessage)) {
        try {
          // Delete the asset (related records will be deleted automatically due to CASCADE)
          const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', asset.id);

          if (error) {
            console.error('Error al eliminar activo:', error);
            alert('Error al eliminar el activo: ' + error.message);
          } else {
            await fetchAssets(); // Recargar datos
          }
        } catch (err: any) {
          console.error('Error al eliminar activo:', err);
          alert('Error al eliminar el activo: ' + err.message);
        }
      }
    } catch (err: any) {
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
            await fetchAssets();
          }
        } catch (deleteErr: any) {
          console.error('Error al eliminar activo:', deleteErr);
          alert('Error al eliminar el activo: ' + deleteErr.message);
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
    const { data, error } = await supabase
      .from('assets')
      .select('*, asset_types(*), locations(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }

    if (data) setAssets(data as AssetWithDetails[]);
  };

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }

    if (data) setLocations(data);
  };

  const fetchAssetTypes = async () => {
    const { data, error } = await supabase
      .from('asset_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching asset types:', error);
      throw error;
    }

    if (data) setAssetTypes(data);
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

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch =
        asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.asset_types?.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Aplicar filtro de categoría desde el menú
      const categoryFromFilter = getCategoryFromFilter(categoryFilter);
      const matchesCategoryFilter = !categoryFromFilter || asset.asset_types?.name === categoryFromFilter;
      // Excluir cámaras de la vista general de inventario
      const isCamera = asset.asset_types?.name === 'Cámara';

      const matchesLocation = !filterLocation || asset.location_id === filterLocation;
      const matchesStatus = !filterStatus || asset.status === filterStatus;

      return !isCamera && matchesSearch && matchesCategoryFilter && matchesLocation && matchesStatus;
    });
  }, [assets, searchTerm, categoryFilter, filterLocation, filterStatus]);

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

  const statusColors = {
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-800 border-slate-200',
    maintenance: 'bg-amber-100 text-amber-800 border-amber-200',
    extracted: 'bg-rose-100 text-rose-800 border-rose-200',
  };

  const statusLabels = {
    active: 'Activo',
    inactive: 'Inactivo',
    maintenance: 'Mantenimiento',
    extracted: 'Extraído',
  };

  const categoryFromFilter = getCategoryFromFilter(categoryFilter);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventario');

      // Set default row height
      worksheet.properties.defaultRowHeight = 15;

      let currentRow = 1;

      // Try to load logo, but continue if it fails
      try {
        const logoResponse = await fetch('/src/assets/logo.png');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
          });

          const imageId = workbook.addImage({
            base64: logoBase64,
            extension: 'png',
          });

          // Add logo to worksheet
          worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 290, height: 172 }
          });
        }
      } catch (error) {
        console.warn('Logo not found, continuing without it');
      }

      // Company contact information (right side of header) - moved to column C
      // Row 1: Email
      worksheet.mergeCells('C1:G1');
      const emailCell = worksheet.getCell('C1');
      emailCell.value = 'E-mail: contacto@gruposancristobal.com';
      emailCell.font = { size: 10, color: { argb: 'FF374151' } };
      emailCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Row 2: Phone and Website
      worksheet.mergeCells('C2:G2');
      const phoneCell = worksheet.getCell('C2');
      phoneCell.value = 'Teléfono: +51 123-456-789 | Sitio web: www.gruposancristobal.com';
      phoneCell.font = { size: 10, color: { argb: 'FF374151' } };
      phoneCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Row 3: Address
      worksheet.mergeCells('C3:G3');
      const addressCell = worksheet.getCell('C3');
      addressCell.value = 'Dirección: Lima, Perú';
      addressCell.font = { size: 10, color: { argb: 'FF374151' } };
      addressCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Row 4: Total assets
      worksheet.mergeCells('C4:G4');
      const totalHeaderCell = worksheet.getCell('C4');
      totalHeaderCell.value = `Total de activos: ${filteredAssets.length}`;
      totalHeaderCell.font = { size: 10, bold: true, color: { argb: 'FF374151' } };
      totalHeaderCell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Set row heights for header
      worksheet.getRow(1).height = 20;
      worksheet.getRow(2).height = 20;
      worksheet.getRow(3).height = 20;
      worksheet.getRow(4).height = 20;

      // Add white/invisible borders to entire header area (A1:G4)
      for (let row = 1; row <= 4; row++) {
        for (let col = 1; col <= 7; col++) {
          const cell = worksheet.getCell(row, col);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
          };
        }
      }

      currentRow = 4;

      // Empty row for spacing
      currentRow++;

      // Creation date (row 5)
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      const dateCell = worksheet.getCell(`A${currentRow}`);
      dateCell.value = `Fecha de creación: ${new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })}`;
      dateCell.font = { size: 10, bold: true };
      dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
      currentRow++;

      // Applied filters (row 6)
      const appliedFilters = [];
      if (categoryFromFilter) appliedFilters.push(`Categoría: ${categoryFromFilter}`);
      if (filterLocation) {
        const loc = locations.find(l => l.id === filterLocation);
        if (loc) appliedFilters.push(`Sede: ${loc.name}`);
      }
      if (filterStatus) {
        appliedFilters.push(`Estado: ${statusLabels[filterStatus as keyof typeof statusLabels]}`);
      }
      if (searchTerm) appliedFilters.push(`Búsqueda: "${searchTerm}"`);

      if (appliedFilters.length > 0) {
        worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
        const filterCell = worksheet.getCell(`A${currentRow}`);
        filterCell.value = `Filtros aplicados: ${appliedFilters.join(' | ')}`;
        filterCell.font = { size: 9, italic: true, color: { argb: 'FF6B7280' } };
        filterCell.alignment = { vertical: 'middle', horizontal: 'center' };
        currentRow++;
      }

      // Total assets (row 7 or 8 depending on filters)
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      const totalCell = worksheet.getCell(`A${currentRow}`);
      totalCell.value = `Total de activos: ${filteredAssets.length}`;
      totalCell.font = { bold: true, size: 11 };
      totalCell.alignment = { vertical: 'middle', horizontal: 'center' };
      currentRow++;

      // Empty row for spacing (row 8)
      currentRow++;

      // Column headers - MUST be at row 9
      const headerRow = currentRow;
      currentRow = headerRow;
      worksheet.columns = [
        { header: 'TIPO DE ACTIVO', key: 'type', width: 22 },
        { header: 'MARCA', key: 'brand', width: 18 },
        { header: 'MODELO', key: 'model', width: 22 },
        { header: 'N° DE SERIE', key: 'serial', width: 28 },
        { header: 'UBICACIÓN', key: 'location', width: 28 },
        { header: 'ESTADO', key: 'status', width: 16 },
        { header: 'FECHA DE CREACIÓN', key: 'created', width: 20 }
      ];

      // Add header row
      const headerRowObj = worksheet.getRow(headerRow);
      headerRowObj.values = ['TIPO DE ACTIVO', 'MARCA', 'MODELO', 'N° DE SERIE', 'UBICACIÓN', 'ESTADO', 'FECHA DE CREACIÓN'];

      // Style header row
      headerRowObj.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerRowObj.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }
      };
      headerRowObj.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRowObj.height = 30;
      headerRowObj.eachCell((cell) => {
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
          left: { style: 'thin', color: { argb: 'FF1E3A8A' } },
          bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
          right: { style: 'thin', color: { argb: 'FF1E3A8A' } }
        };
      });

      // Add data rows
      filteredAssets.forEach((asset, index) => {
        const row = worksheet.addRow({
          type: asset.asset_types?.name || '',
          brand: asset.brand || '',
          model: asset.model || '',
          serial: asset.serial_number || '',
          location: asset.locations?.name || 'Sin ubicación',
          status: statusLabels[asset.status as keyof typeof statusLabels] || asset.status,
          created: new Date(asset.created_at).toLocaleDateString('es-ES')
        });

        // Alternating row colors
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' }
          };
        }

        // Add borders
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
      });

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Download
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Inventario_${categoryFromFilter ? categoryFromFilter.replace(/\s+/g, '_') : 'General'}_${dateStr}.xlsx`;

      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar el archivo Excel. Por favor, intente nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full px-4 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 uppercase">
            Inventario{categoryFromFilter ? ` - ${categoryFromFilter}` : ''}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {categoryFromFilter ? `Gestión de activos ${categoryFromFilter.toLowerCase()}` : 'Gestión integral de activos tecnológicos'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {selectedIds.size > 0 && canEdit() && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
              title="Eliminar seleccionados"
            >
              <Trash2 size={14} />
              Eliminar ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
            title="Descargar inventario en Excel"
          >
            <Download size={14} />
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>

          {canEdit() && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
              title="Importar inventario desde Excel"
            >
              <Upload size={14} />
              Importar
            </button>
          )}

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
              className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
            >
              <Plus size={14} />
              {categoryFilter === 'inventory-pc' ? 'Nueva PC/Laptop' : 'Nuevo Activo'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total de activos</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalAssets}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Activos activos</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-emerald-600">{stats.activeCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">En mantenimiento</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-amber-600">{stats.maintenanceCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sin ubicación</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-slate-700">{stats.withoutLocationCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por marca, modelo, serie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white sm:min-w-[180px] text-sm font-medium"
            >
              <option value="">Todas las sedes</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white sm:min-w-[150px] text-sm font-medium"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="extracted">Extraído</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-800"></div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 w-4">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-2 border-slate-300 cursor-pointer text-blue-600 focus:ring-blue-500"
                        onChange={handleSelectAll}
                        checked={filteredAssets.length > 0 && selectedIds.size === filteredAssets.length}
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispositivo</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalles</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ubicación</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAssets.length > 0 ? (
                    filteredAssets.map((asset) => {
                      const Icon = getIconForType(asset.asset_types?.name || '');
                      const isSelected = selectedIds.has(asset.id);
                      return (
                        <tr
                          key={asset.id}
                          onClick={() => handleToggleSelectConnect(asset.id)}
                          className={`
                            transition-colors group cursor-pointer
                            ${isSelected ? 'bg-blue-50/80 hover:bg-blue-100/80 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}
                          `}
                        >
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                className={`
                                    w-5 h-5 rounded border-2 transition-colors cursor-pointer
                                    ${isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 bg-white'}
                                    focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                                  `}
                                checked={isSelected}
                                onChange={() => handleToggleSelectConnect(asset.id)}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`p-2 rounded-lg w-fit transition-colors ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                              <Icon size={20} />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">{asset.asset_types?.name}</span>
                              <span className="text-sm text-slate-500">{asset.brand}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-900 font-medium">{asset.model}</span>
                              {asset.serial_number && (
                                <span className="text-xs text-slate-500 font-mono">S/N: {asset.serial_number}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {asset.locations ? (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <MapPin size={16} className="text-slate-400" />
                                {asset.locations.name}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400 italic">Sin ubicación</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[asset.status as keyof typeof statusColors]}`}>
                              {statusLabels[asset.status as keyof typeof statusLabels]}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleViewAsset(asset)}
                                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Ver detalles"
                              >
                                <Eye size={18} />
                              </button>
                              {canEdit() && (
                                <>
                                  <button
                                    onClick={() => handleEditAsset(asset)}
                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Editar"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAsset(asset)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => {
                  const Icon = getIconForType(asset.asset_types?.name || '');
                  return (
                    <div key={asset.id} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 p-2.5 rounded-lg text-slate-600">
                            <Icon size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 uppercase tracking-tight">{asset.asset_types?.name}</h4>
                            <p className="text-xs text-slate-500 font-medium">{asset.brand} - {asset.model}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border whitespace-nowrap ${statusColors[asset.status as keyof typeof statusColors]}`}>
                          {statusLabels[asset.status as keyof typeof statusLabels]}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
                        <div>
                          <p className="text-slate-400 font-bold uppercase tracking-widest mb-1 text-[9px]">Serie</p>
                          <p className="font-mono text-slate-700">{asset.serial_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 font-bold uppercase tracking-widest mb-1 text-[9px]">Ubicación</p>
                          <p className="text-slate-700">{asset.locations?.name || 'Sede no especificada'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                        <button
                          onClick={() => handleViewAsset(asset)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-md hover:bg-slate-100 transition-all font-bold text-[10px] uppercase tracking-widest"
                        >
                          <Eye size={14} /> Detalle
                        </button>
                        {canEdit() && (
                          <>
                            <button
                              onClick={() => handleEditAsset(asset)}
                              className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-md transition-all"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset)}
                              className="p-2 text-slate-400 hover:text-red-600 bg-red-50 rounded-md transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : null}
            </div>

            {/* Empty State */}
            {filteredAssets.length === 0 && (
              <div className="px-6 py-16 text-center">
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <div className="bg-slate-50 p-6 rounded-full mb-4">
                    <Search size={40} className="opacity-50" />
                  </div>
                  <p className="text-lg font-bold text-slate-700 uppercase tracking-tight">Sin resultados</p>
                  <p className="text-sm mt-1">Intenta ajustar los filtros de búsqueda</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Forms and Modals */}
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
      {/* Modal de Importación Excel */}
      <ExcelImportModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          fetchAssets();
          alert('Importación completada exitosamente');
        }}
        assetTypes={assetTypes}
        locations={locations}
      />
    </div>
  );
}