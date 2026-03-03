import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Package, Star, X, Download, FileText, LayoutGrid, List as ListIcon, AlertTriangle } from 'lucide-react';
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
  notes: string;
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

  useEffect(() => {
    fetchData();
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

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Standard Application Header (h-14) */}
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <Package size={20} />
          </div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Gestión de Repuestos</h2>
          </div>
        </div>



        <div className="flex items-center gap-2">
          {canEdit() && (
            <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
              <button
                onClick={() => {
                  setEditingPart(undefined);
                  setShowForm(true);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors"
                title="Nuevo Repuesto"
              >
                <Plus size={22} />
              </button>
            </div>
          )}
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
            <Star size={18} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Ítems</p>
              <h3 className="text-xl font-bold text-slate-900">{stats.total}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Bajo</p>
              <h3 className="text-xl font-bold text-amber-600">{stats.lowStock}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categorías</p>
              <h3 className="text-xl font-bold text-emerald-600">{stats.categories}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md">
            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
              <Download size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Total</p>
              <h3 className="text-xl font-bold text-slate-800">${stats.totalValue.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f1f5f9] border border-slate-200 rounded-lg">
                <FileText size={14} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Categoría:</span>
                <select
                  className="bg-transparent text-[11px] font-bold text-[#002855] outline-none cursor-pointer"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">TODAS LAS CATEGORÍAS</option>
                  {categories.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f1f5f9] border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="low-stock"
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                  checked={lowStockOnly}
                  onChange={(e) => setLowStockOnly(e.target.checked)}
                />
                <label htmlFor="low-stock" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer">
                  Solo Stock Bajo
                </label>
              </div>

              {(searchTerm || categoryFilter !== 'all' || lowStockOnly) && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 transition-colors"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-[#f1f5f9] p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <ListIcon size={16} />
                </button>
              </div>
            </div>
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
