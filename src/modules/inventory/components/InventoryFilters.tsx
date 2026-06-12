import { useState, useEffect } from 'react';
import { Building2, MapPin, Layers, Filter, X, ChevronDown, Search } from 'lucide-react';
import { supabase } from '../../../shared/services/supabase';
import { Company, Location, Category, Subcategory, AssetStatus, InventoryFilter } from '../../../shared/types/inventory.types';
import { ASSET_STATUS_LABELS } from '../../../shared/types/inventory.types';

interface InventoryFiltersProps {
  onFilterChange: (filters: InventoryFilter) => void;
  initialFilters?: InventoryFilter;
  showCompanyFilter?: boolean;
  showLocationFilter?: boolean;
  showCategoryFilter?: boolean;
  showStatusFilter?: boolean;
}

export default function InventoryFilters({
  onFilterChange,
  initialFilters = {},
  showCompanyFilter = true,
  showLocationFilter = true,
  showCategoryFilter = true,
  showStatusFilter = true,
}: InventoryFiltersProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  
  const [filters, setFilters] = useState<InventoryFilter>(initialFilters);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(filters.search_term || '');

  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters]);

  const fetchFilterData = async () => {
    try {
      const [companiesData, locationsData, categoriesData, subcategoriesData] = await Promise.all([
        supabase.from('companies').select('*').eq('is_active', true).order('name'),
        supabase.from('locations').select('*').eq('is_active', true).order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('subcategories').select('*, categories(*)').eq('is_active', true).order('sort_order'),
      ]);

      if (companiesData.error) throw companiesData.error;
      if (locationsData.error) throw locationsData.error;
      if (categoriesData.error) throw categoriesData.error;
      if (subcategoriesData.error) throw subcategoriesData.error;

      setCompanies(companiesData.data || []);
      setLocations(locationsData.data || []);
      setCategories(categoriesData.data || []);
      setSubcategories(subcategoriesData.data || []);
    } catch (err) {
      console.error('Error fetching filter data:', err);
    }
  };

  const handleFilterChange = (key: keyof InventoryFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    handleFilterChange('search_term', value);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  );

  const getFilteredLocations = () => {
    if (!filters.company_id) return locations;
    return locations.filter(loc => loc.company_id === filters.company_id);
  };

  const getFilteredSubcategories = () => {
    if (!filters.category_id) return subcategories;
    return subcategories.filter(sub => sub.category_id === filters.category_id);
  };

  const Dropdown = ({ 
    title, 
    icon: Icon, 
    children, 
    isOpen, 
    onToggle,
    value 
  }: { 
    title: string; 
    icon: any; 
    children: React.ReactNode; 
    isOpen: boolean; 
    onToggle: () => void;
    value?: string;
  }) => (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-3 bg-slate-50 border ${
          isOpen ? 'border-[#002855]/30 bg-white' : 'border-slate-200 hover:border-[#002855]/30'
        } text-[10px] font-black text-[#002855] uppercase tracking-widest min-w-[180px] transition-all`}
      >
        <Icon size={14} className={value ? 'text-blue-600' : 'text-slate-400'} />
        <span className="truncate flex-1 text-left">
          {value || title}
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 bg-white border border-slate-200 shadow-2xl min-w-[280px] max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        {/* Search */}
        <div className="flex-1 w-full lg:w-auto relative group/search">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
          <input
            type="text"
            placeholder="Buscar por código, marca, modelo o serie..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 tracking-[0.1em] rounded-xl"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {showCompanyFilter && (
            <Dropdown
              title="Todas las Empresas"
              icon={Building2}
              isOpen={showDropdown === 'company'}
              onToggle={() => setShowDropdown(showDropdown === 'company' ? null : 'company')}
              value={companies.find(c => c.id === filters.company_id)?.name}
            >
              <div className="p-2">
                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="company"
                    checked={!filters.company_id}
                    onChange={() => handleFilterChange('company_id', undefined)}
                    className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]"
                  />
                  <span className="text-[11px] font-semibold text-slate-700">Todas las Empresas</span>
                </label>
                {companies.map(company => (
                  <label key={company.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="company"
                      checked={filters.company_id === company.id}
                      onChange={() => handleFilterChange('company_id', company.id)}
                      className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">{company.name}</span>
                  </label>
                ))}
              </div>
            </Dropdown>
          )}

          {showLocationFilter && (
            <Dropdown
              title="Todas las Sedes"
              icon={MapPin}
              isOpen={showDropdown === 'location'}
              onToggle={() => setShowDropdown(showDropdown === 'location' ? null : 'location')}
              value={locations.find(l => l.id === filters.location_id)?.name}
            >
              <div className="p-2">
                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="location"
                    checked={!filters.location_id}
                    onChange={() => handleFilterChange('location_id', undefined)}
                    className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]"
                  />
                  <span className="text-[11px] font-semibold text-slate-700">Todas las Sedes</span>
                </label>
                {getFilteredLocations().map(location => (
                  <label key={location.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="location"
                      checked={filters.location_id === location.id}
                      onChange={() => handleFilterChange('location_id', location.id)}
                      className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">{location.name}</span>
                  </label>
                ))}
              </div>
            </Dropdown>
          )}

          {showCategoryFilter && (
            <>
              <Dropdown
                title="Todas las Categorías"
                icon={Layers}
                isOpen={showDropdown === 'category'}
                onToggle={() => setShowDropdown(showDropdown === 'category' ? null : 'category')}
                value={categories.find(c => c.id === filters.category_id)?.name}
              >
                <div className="p-2">
                  <label className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={!filters.category_id}
                      onChange={() => {
                        handleFilterChange('category_id', undefined);
                        handleFilterChange('subcategory_id', undefined);
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">Todas las Categorías</span>
                  </label>
                  {categories.map(category => (
                    <label key={category.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        checked={filters.category_id === category.id}
                        onChange={() => {
                          handleFilterChange('category_id', category.id);
                          handleFilterChange('subcategory_id', undefined);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]"
                      />
                      <span className="text-[11px] font-semibold text-slate-700">{category.name}</span>
                    </label>
                  ))}
                </div>
              </Dropdown>

              {filters.category_id && (
                <Dropdown
                  title="Subcategorías"
                  icon={Layers}
                  isOpen={showDropdown === 'subcategory'}
                  onToggle={() => setShowDropdown(showDropdown === 'subcategory' ? null : 'subcategory')}
                  value={subcategories.find(s => s.id === filters.subcategory_id)?.name}
                >
                  <div className="p-2">
                    <label className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="radio"
                        name="subcategory"
                        checked={!filters.subcategory_id}
                        onChange={() => handleFilterChange('subcategory_id', undefined)}
                        className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]"
                      />
                      <span className="text-[11px] font-semibold text-slate-700">Todas las Subcategorías</span>
                    </label>
                    {getFilteredSubcategories().map(subcategory => (
                      <label key={subcategory.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="subcategory"
                          checked={filters.subcategory_id === subcategory.id}
                          onChange={() => handleFilterChange('subcategory_id', subcategory.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]"
                        />
                        <span className="text-[11px] font-semibold text-slate-700">{subcategory.name}</span>
                      </label>
                    ))}
                  </div>
                </Dropdown>
              )}
            </>
          )}

          {showStatusFilter && (
            <Dropdown
              title="Todos los Estados"
              icon={Filter}
              isOpen={showDropdown === 'status'}
              onToggle={() => setShowDropdown(showDropdown === 'status' ? null : 'status')}
              value={filters.status ? ASSET_STATUS_LABELS[filters.status] : undefined}
            >
              <div className="p-2">
                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={!filters.status}
                    onChange={() => handleFilterChange('status', undefined)}
                    className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]"
                  />
                  <span className="text-[11px] font-semibold text-slate-700">Todos los Estados</span>
                </label>
                {(Object.keys(ASSET_STATUS_LABELS) as AssetStatus[]).map(status => (
                  <label key={status} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={filters.status === status}
                      onChange={() => handleFilterChange('status', status)}
                      className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">{ASSET_STATUS_LABELS[status]}</span>
                  </label>
                ))}
              </div>
            </Dropdown>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
              title="Limpiar Filtros"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtros activos:</span>
          {filters.company_id && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-semibold">
              Empresa: {companies.find(c => c.id === filters.company_id)?.name}
              <button onClick={() => handleFilterChange('company_id', undefined)} className="hover:text-blue-900">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.location_id && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-semibold">
              Sede: {locations.find(l => l.id === filters.location_id)?.name}
              <button onClick={() => handleFilterChange('location_id', undefined)} className="hover:text-emerald-900">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.category_id && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] font-semibold">
              Categoría: {categories.find(c => c.id === filters.category_id)?.name}
              <button onClick={() => {
                handleFilterChange('category_id', undefined);
                handleFilterChange('subcategory_id', undefined);
              }} className="hover:text-purple-900">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.subcategory_id && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-semibold">
              Subcategoría: {subcategories.find(s => s.id === filters.subcategory_id)?.name}
              <button onClick={() => handleFilterChange('subcategory_id', undefined)} className="hover:text-indigo-900">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-semibold">
              Estado: {ASSET_STATUS_LABELS[filters.status]}
              <button onClick={() => handleFilterChange('status', undefined)} className="hover:text-amber-900">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.search_term && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-semibold">
              Búsqueda: "{filters.search_term}"
              <button onClick={() => {
                handleFilterChange('search_term', undefined);
                setSearchTerm('');
              }} className="hover:text-slate-900">
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
