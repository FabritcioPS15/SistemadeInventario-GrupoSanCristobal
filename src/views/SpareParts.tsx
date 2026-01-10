import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SparePartForm from '../components/forms/SparePartForm';

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

type SortConfig = {
  key: keyof SparePart;
  direction: 'asc' | 'desc';
};

export default function SpareParts() {
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [filteredParts, setFilteredParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Fetch spare parts
  const fetchSpareParts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data) {
        setSpareParts(data);
        setFilteredParts(data);
      }
    } catch (error) {
      console.error('Error fetching spare parts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSpareParts();
  }, []);

  // Filter and sort spare parts
  useEffect(() => {
    let result = [...spareParts];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(part => 
        part.name.toLowerCase().includes(searchLower) ||
        part.part_number.toLowerCase().includes(searchLower) ||
        (part.description && part.description.toLowerCase().includes(searchLower)) ||
        (part.manufacturer && part.manufacturer.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(part => part.category === categoryFilter);
    }

    // Apply low stock filter
    if (lowStockOnly) {
      result = result.filter(part => part.quantity <= part.min_quantity);
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredParts(result);
  }, [spareParts, searchTerm, sortConfig, categoryFilter, lowStockOnly]);

  // Handle sort request
  const requestSort = (key: keyof SparePart) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get all unique categories
  const categories = ['all', ...new Set(spareParts.map(part => part.category).filter(Boolean))];

  // Handle delete part
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este repuesto?')) return;
    
    try {
      const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh the list
      fetchSpareParts();
    } catch (error) {
      console.error('Error deleting spare part:', error);
      alert('Error al eliminar el repuesto');
    }
  };

  // Handle form success
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPart(undefined);
    fetchSpareParts();
  };

  // Get sort indicator
  const getSortIndicator = (key: string) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    }
    return null;
  };

  // Calculate total inventory value
  const totalValue = spareParts.reduce((sum, part) => sum + (part.quantity * part.unit_price), 0);
  const lowStockCount = spareParts.filter(part => part.quantity <= part.min_quantity).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Repuestos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {spareParts.length} repuestos • Valor total: ${totalValue.toFixed(2)} • 
            <span className={lowStockCount > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
              {lowStockCount} en stock bajo
            </span>
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPart(undefined);
            setShowForm(true);
          }}
          className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" />
          Nuevo Repuesto
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="Buscar por nombre, número de parte..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              id="category"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              {categories
                .filter(cat => cat !== 'all')
                .map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <div className="flex items-center">
              <input
                id="low-stock"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
              />
              <label htmlFor="low-stock" className="ml-2 block text-sm text-gray-700">
                Mostrar solo stock bajo
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Spare Parts Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('name')}
                >
                  <div className="flex items-center">
                    Nombre
                    {getSortIndicator('name')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('part_number')}
                >
                  <div className="flex items-center">
                    N° Parte
                    {getSortIndicator('part_number')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('category')}
                >
                  <div className="flex items-center">
                    Categoría
                    {getSortIndicator('category')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('quantity')}
                >
                  <div className="flex items-center justify-end">
                    Stock
                    {getSortIndicator('quantity')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('unit_price')}
                >
                  <div className="flex items-center justify-end">
                    Precio
                    {getSortIndicator('unit_price')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('location')}
                >
                  <div className="flex items-center justify-end">
                    Ubicación
                    {getSortIndicator('location')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No se encontraron repuestos que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                filteredParts.map((part) => (
                  <tr 
                    key={part.id} 
                    className={part.quantity <= part.min_quantity ? 'bg-red-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-md text-blue-600">
                          <Package className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{part.name}</div>
                          <div className="text-sm text-gray-500">{part.manufacturer}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{part.part_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {part.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {part.quantity} {part.unit}
                        {part.quantity <= part.min_quantity && (
                          <span className="ml-2 text-xs text-red-600">
                            (Mín: {part.min_quantity})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ${part.unit_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {part.location || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setEditingPart(part);
                          setShowForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(part.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spare Part Form Modal */}
      {showForm && (
        <SparePartForm
          onClose={() => {
            setShowForm(false);
            setEditingPart(undefined);
          }}
          onSave={handleFormSuccess}
          editRecord={editingPart}
        />
      )}
    </div>
  );
}
