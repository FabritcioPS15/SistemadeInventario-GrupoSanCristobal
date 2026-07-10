import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase, AssetWithDetails, Category, Subcategory, Location, Area } from '../../../shared/services/supabase';

export interface UseInventoryProps {
  categoryFilter?: string;
  subcategoryFilter?: string;
}

export interface UseInventoryReturn {
  // Data
  inventory: AssetWithDetails[];
  categories: Category[];
  subcategories: Subcategory[];
  locations: Location[];
  areas: Area[];
  loading: boolean;
  totalCount: number;
  
  // Filters
  searchTerm: string;
  filterCategory: string;
  selectedLocations: string[];
  showLocationDropdown: boolean;
  filterStatus: string;
  filterRubro: string;
  dropdownRef: React.RefObject<HTMLDivElement>;
  
  // Pagination
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  
  // Sort
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  
  // Setters
  setSearchTerm: (value: string) => void;
  setFilterCategory: (value: string) => void;
  setSelectedLocations: (value: string[]) => void;
  setShowLocationDropdown: (value: boolean) => void;
  setFilterStatus: (value: string) => void;
  setFilterRubro: (value: string) => void;
  setCurrentPage: (value: number) => void;
  setItemsPerPage: (value: number) => void;
  setSortConfig: (value: { key: string; direction: 'asc' | 'desc' } | null) => void;
  
  // Actions
  fetchInventory: () => Promise<void>;
  refresh: () => Promise<void>;
  handleSort: (key: string) => void;
}

const pathCategoryMap: Record<string, string> = {
  'tecnologia': 'Tecnología',
  'seguridad-control': 'Seguridad y Control',
  'equipos-operativos': 'Equipos Operativos',
  'mobiliario': 'Mobiliario',
  'utiles-suministros': 'Útiles y Suministros',
  'disco-extraido': 'EXTRAIDO'
};

export function useInventory({ categoryFilter, subcategoryFilter }: UseInventoryProps = {}): UseInventoryReturn {
  // Data state
  const [rawInventory, setRawInventory] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRubro, setFilterRubro] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  // Sort state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });
  
  // Fetch dropdown data
  const fetchDropdownData = async () => {
    await Promise.all([
      fetchCategories(),
      fetchSubcategories(),
      fetchLocations(),
      fetchAreas()
    ]);
  };
  
  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };
  
  const fetchSubcategories = async () => {
    const { data } = await supabase.from('subcategories').select('*').order('name');
    if (data) setSubcategories(data);
  };
  
  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  const fetchAreas = async () => {
    const { data } = await supabase.from('areas').select('*').order('name');
    if (data) setAreas(data);
  };
  
  // Main fetch function
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Ensure categories and subcategories are loaded if URL filtering is active on mount
      let currentCategories = categories;
      if (categories.length === 0) {
        const { data } = await supabase.from('categories').select('*').order('name');
        if (data) {
          setCategories(data);
          currentCategories = data;
        }
      }
      
      let query = supabase
        .from('assets')
        .select('*, locations(name), areas(name)', { count: 'exact' });
      
      // Apply search filter
      if (searchTerm) {
        query = query.or(`codigo_unico.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%,item.ilike.%${searchTerm}%`);
      }
      
      // Apply category filter from URL
      const cleanCategoryFilter = categoryFilter?.replace('inventory-', '');
      const activePathCategory = cleanCategoryFilter ? pathCategoryMap[cleanCategoryFilter] : null;
      
      if (cleanCategoryFilter === 'disco-extraido') {
        query = query.eq('status', 'extracted');
      } else if (activePathCategory) {
        const cat = currentCategories.find(c => c.name === activePathCategory);
        if (cat) query = query.eq('category_id', cat.id);
      }
      
      // Apply category filter from dropdown
      if (filterCategory) {
        query = query.eq('category_id', filterCategory);
      }
      
      // Apply location filter
      if (selectedLocations.length > 0) {
        query = query.in('location_id', selectedLocations);
      }
      
      // Apply status filter
      if (filterStatus) {
        query = query.eq('estado_uso', filterStatus);
      }

      // Apply rubro filter (business_type de la empresa)
      if (filterRubro) {
        // Buscar empresas del rubro — sin filtro is_active para no perder datos
        const { data: rubroCompanies } = await supabase
          .from('companies')
          .select('id, name, business_type')
          .eq('business_type', filterRubro);

        if (rubroCompanies && rubroCompanies.length > 0) {
          const companyIds = rubroCompanies.map((c: any) => c.id);

          // Obtener sedes que pertenecen a esas empresas
          const { data: rubroLocations } = await supabase
            .from('locations')
            .select('id, name, company_id')
            .in('company_id', companyIds);

          const locationIds = (rubroLocations || []).map((l: any) => l.id);

          // Aplicar filtro OR: activo pertenece al rubro por company_id o por location_id
          if (locationIds.length > 0) {
            query = query.or(
              `company_id.in.(${companyIds.join(',')}),location_id.in.(${locationIds.join(',')})`
            );
          } else if (companyIds.length > 0) {
            query = query.in('company_id', companyIds);
          }
        } else {
          console.warn(`[Rubro Filter] No se encontraron empresas con business_type="${filterRubro}"`);
          setRawInventory([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
      }


      
      // Apply pagination and sort
      let sortField = sortConfig?.key || 'created_at';
      let sortAscending = sortConfig?.direction === 'asc';

      if (sortField === 'category_id' || sortField === 'location_id') {
        // These sort by UUID server-side; client mapping adds names
      } else if (sortField === 'item' || sortField === 'descripcion') {
        sortField = 'item';
      } else if (sortField === 'brand' || sortField === 'model' || sortField === 'serial_number' || sortField === 'codigo_unico' || sortField === 'fecha_adquisicion') {
        // Direct columns, sort server-side
      }

      const { data, error, count } = await query
        .order(sortField, { ascending: sortAscending, nullsFirst: false })
        .range(from, to);
      
      if (error) throw error;
      setRawInventory(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const refresh = async () => {
    await fetchInventory();
  };
  
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setCurrentPage(1);
  };
  
  // handleClickOutside for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Initial fetch
  useEffect(() => {
    fetchDropdownData();
  }, []);
  
  // Fetch inventory when dependencies change
  useEffect(() => {
    fetchInventory();
  }, [currentPage, itemsPerPage, searchTerm, filterCategory, selectedLocations, filterStatus, filterRubro, categoryFilter, subcategoryFilter, sortConfig]);

  // Compute inventory with in-memory mapping of categories and subcategories
  const inventory = useMemo(() => {
    return rawInventory.map((asset: any) => {
      const category = categories.find(c => c.id === asset.category_id);
      const subcategory = subcategories.find(s => s.id === asset.subcategory_id);

      return {
        ...asset,
        categories: category ? { id: category.id, name: category.name } : null,
        subcategories: subcategory ? { id: subcategory.id, name: subcategory.name } : null,
      } as AssetWithDetails;
    });
  }, [rawInventory, categories, subcategories]);
  
  // Computed values
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / itemsPerPage);
  }, [totalCount, itemsPerPage]);
  
  return {
    // Data
    inventory,
    categories,
    subcategories,
    locations,
    areas,
    loading,
    totalCount,
    
    // Filters
    searchTerm,
    filterCategory,
    selectedLocations,
    showLocationDropdown,
    filterStatus,
    filterRubro,
    dropdownRef,
    
    // Pagination
    currentPage,
    itemsPerPage,
    totalPages,
    
    // Sort
    sortConfig,
    
    // Setters
    setSearchTerm,
    setFilterCategory,
    setSelectedLocations,
    setShowLocationDropdown,
    setFilterStatus,
    setFilterRubro,
    setCurrentPage,
    setItemsPerPage,
    setSortConfig,
    
    // Actions
    fetchInventory,
    refresh,
    handleSort,
  };
}
