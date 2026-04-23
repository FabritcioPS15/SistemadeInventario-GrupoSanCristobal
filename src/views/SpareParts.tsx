import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Edit, Trash2, Package, Star, X, Download, FileText, LayoutGrid, List as ListIcon, AlertTriangle, Search, MapPin, ChevronDown } from 'lucide-react';
import { RiFileExcel2Fill } from "react-icons/ri";
import { FaFilePdf } from "react-icons/fa6";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import { supabase } from '../lib/supabase';
import SparePartForm from '../components/forms/SparePartForm';
import { useAuth } from '../contexts/AuthContext';

type SparePart = {
  id: string;
  name: string;
  description: string;
  part_number: string;
  manufacturer: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  min_quantity: number;
  location: string;
  supplier: string;
  created_at: string;
  updated_at: string;
};

export default function SpareParts() {
  const { canEdit } = useAuth();
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .order('name');

      if (error) throw error;
      if (data) setSpareParts(data);
    } catch (error) {
      console.error('Error fetching spare parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) throw error;
      if (data) setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchLocations();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredParts = useMemo(() => {
    let result = [...spareParts];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(part =>
        part.name.toLowerCase().includes(q) ||
        part.part_number.toLowerCase().includes(q) ||
        part.description?.toLowerCase().includes(q) ||
        part.manufacturer?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(part => part.category === categoryFilter);
    }

    if (lowStockOnly) {
      result = result.filter(part => part.quantity <= part.min_quantity);
    }

    if (selectedLocations.length > 0) {
      result = result.filter(part => part.location && selectedLocations.includes(part.location));
    }

    if (sortConfig) {
      result.sort((a: any, b: any) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal === bVal) return 0;
        const res = aVal < bVal ? -1 : 1;
        return sortConfig.direction === 'asc' ? res : -res;
      });
    }

    return result;
  }, [spareParts, searchTerm, categoryFilter, lowStockOnly, sortConfig]);

  const stats = useMemo(() => {
    const total = spareParts.length;
    const lowStock = spareParts.filter(p => p.quantity <= p.min_quantity).length;
    const totalValue = spareParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
    const categories = new Set(spareParts.map(p => p.category)).size;
    return { total, lowStock, totalValue, categories };
  }, [spareParts]);

  const categories = ['all', ...new Set(spareParts.map(part => part.category).filter(Boolean))];

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este repuesto?')) return;
    try {
      const { error } = await supabase.from('spare_parts').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error al eliminar');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setLowStockOnly(false);
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Repuestos');

      worksheet.columns = [
        { header: 'Nombre', key: 'name', width: 30 },
        { header: 'Código', key: 'part_number', width: 20 },
        { header: 'Categoría', key: 'category', width: 15 },
        { header: 'Marca', key: 'manufacturer', width: 20 },
        { header: 'Cantidad', key: 'quantity', width: 12 },
        { header: 'Unidad', key: 'unit', width: 10 },
        { header: 'Precio Unit.', key: 'unit_price', width: 15 },
        { header: 'Stock Mínimo', key: 'min_quantity', width: 12 },
        { header: 'Ubicación', key: 'location', width: 20 },
        { header: 'Proveedor', key: 'supplier', width: 20 }
      ];

      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      filteredParts.forEach(part => {
        worksheet.addRow({
          name: part.name || '',
          part_number: part.part_number || '',
          category: part.category || '',
          manufacturer: part.manufacturer || '',
          quantity: part.quantity || 0,
          unit: part.unit || '',
          unit_price: part.unit_price || 0,
          min_quantity: part.min_quantity || 0,
          location: part.location || '',
          supplier: part.supplier || ''
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `repuestos_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando Excel:', error);
      alert('Error al exportar a Excel');
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const tableData = filteredParts.map(part => [
        part.name || '',
        part.part_number || '',
        part.category || '',
        part.manufacturer || '',
        part.quantity || 0,
        part.unit || '',
        `$${(part.unit_price || 0).toFixed(2)}`,
        part.location || ''
      ]);

      autoTable(doc, {
        head: [['Nombre', 'Código', 'Categoría', 'Marca', 'Cantidad', 'Unidad', 'Precio', 'Ubicación']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 40, 85] }
      });

      doc.save(`repuestos_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exportando PDF:', error);
      alert('Error al exportar a PDF');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
          <div className="absolute -top-3 -left-3">
            <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
              {filteredParts.length} Repuestos
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Buscar repuesto por nombre, código, marca..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); }}
              className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 tracking-[0.1em]"
            />
          </div>

          {/* Filters + Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest min-w-[220px]">
              <FileText size={14} className="text-rose-500" />
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); }}
                className="bg-transparent outline-none cursor-pointer flex-1"
              >
                <option value="all">TODAS LAS CATEGORÍAS</option>
                {categories.filter(c => c !== 'all').map(c => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest flex items-center gap-3 transition-all min-w-[220px]"
              >
                <MapPin size={14} className="text-rose-500" />
                <span className="truncate">{selectedLocations.length === 0 || selectedLocations.length === locations.length ? 'Todas las sedes' : `${selectedLocations.length} Sedes`}</span>
                <ChevronDown size={14} className={`text-slate-300 ml-auto transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLocationDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedLocations(locations.map(loc => loc.id));
                        setShowLocationDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      Seleccionar todas las sedes
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLocations([]);
                        setShowLocationDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    >
                      Limpiar selección
                    </button>
                  </div>
                  {locations.map(location => (
                    <label key={location.id} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(location.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLocations([...selectedLocations, location.id]);
                          } else {
                            setSelectedLocations(selectedLocations.filter(id => id !== location.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mr-3"
                      />
                      <span className="text-xs font-medium text-slate-700">{location.name.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30">
              <span className="text-[10px] font-black text-[#002855] uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle size={12} />
                Stock Bajo:
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={lowStockOnly}
                  onChange={(e) => { setLowStockOnly(e.target.checked); }}
                />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 transition-all ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`}
                title="Vista Tabla"
              >
                <ListIcon size={16} />
              </button>
            </div>

            {canEdit() && (
              <button
                onClick={() => {
                  setEditingPart(undefined);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-4 py-3 bg-[#002855] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-sm"
              >
                <Plus size={14} />
                Agregar Repuesto
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
              title="Exportar a Excel"
            >
              <RiFileExcel2Fill size={20} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </button>

            <button
              onClick={handleExportPDF}
              className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
              title="Exportar a PDF"
            >
              <FaFilePdf size={20} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-blue-600 mb-4"></div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Cargando catálogo...</p>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-100 rounded-3xl p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package size={40} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No se encontraron repuestos</h3>
            <p className="text-slate-400 max-w-xs mx-auto mt-2 text-sm">Prueba ajustando los filtros o realiza un nuevo registro.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredParts.map((part) => (
              <div key={part.id} className={`bg-white rounded-3xl border ${part.quantity <= part.min_quantity ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100'} hover:shadow-xl transition-all group p-6`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-slate-50 p-3 rounded-2xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <Package size={24} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingPart(part); setShowForm(true); }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(part.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <h3 className="font-black text-slate-900 uppercase tracking-tight line-clamp-1">{part.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{part.category}</span>
                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{part.part_number}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-50 mb-4">
                  <div className="bg-slate-50/50 p-2.5 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Actual</p>
                    <p className={`text-sm font-black ${part.quantity <= part.min_quantity ? 'text-amber-600' : 'text-slate-700'}`}>
                      {part.quantity} <span className="text-[9px] uppercase">{part.unit}</span>
                    </p>
                  </div>
                  <div className="bg-slate-50/50 p-2.5 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Precio Unit.</p>
                    <p className="text-sm font-black text-slate-700">${part.unit_price.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-400 uppercase tracking-wider">{part.manufacturer || "Genérico"}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{part.location || "N/A"}</span>
                </div>

                {part.quantity <= part.min_quantity && (
                  <div className="mt-4 flex items-center gap-2 p-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
                    <AlertTriangle size={14} />
                    <span className="text-[10px] font-black uppercase tracking-tight">Abastecimiento Requerido</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('name')}>Producto</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('category')}>Categoría</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('quantity')}>Stock</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer" onClick={() => handleSort('unit_price')}>Precio</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredParts.map((part) => (
                    <tr key={part.id} className={`hover:bg-blue-50/30 transition-colors group ${part.quantity <= part.min_quantity ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-50 p-2 rounded-lg text-slate-400">
                            <Package size={16} />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{part.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{part.part_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{part.category}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex flex-col items-end">
                          <span className={`text-sm font-black ${part.quantity <= part.min_quantity ? 'text-amber-600' : 'text-slate-700'}`}>
                            {part.quantity} {part.unit}
                          </span>
                          {part.quantity <= part.min_quantity && (
                            <span className="text-[8px] font-black text-amber-500 uppercase">Mín: {part.min_quantity}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-sm text-slate-700">
                        ${part.unit_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase">{part.location || "—"}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingPart(part); setShowForm(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(part.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <SparePartForm
          onClose={() => {
            setShowForm(false);
            setEditingPart(undefined);
          }}
          onSave={() => {
            setShowForm(false);
            setEditingPart(undefined);
            fetchData();
          }}
          editRecord={editingPart}
        />
      )}
    </div>
  );
}
