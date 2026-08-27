import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase, AssetWithDetails, Category, Subcategory, Location, Area } from '../../../shared/services/supabase';
import { PATH_CATEGORY_MAP } from '../constants/inventory.constants';
import { useAuth } from '../../../app/providers/AuthContext';
import { useAllowedLocations } from '../../../shared/hooks/useAllowedLocations';

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
  filterStatus: string[];
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
  setFilterStatus: (value: string[]) => void;
  setFilterRubro: (value: string) => void;
  setCurrentPage: (value: number) => void;
  setItemsPerPage: (value: number) => void;
  setSortConfig: (value: { key: string; direction: 'asc' | 'desc' } | null) => void;

  // Actions
  fetchInventory: () => Promise<void>;
  refresh: () => Promise<void>;
  handleSort: (key: string) => void;
  fetchAllFilteredIds: () => Promise<string[]>;
  fetchAllFilteredData: () => Promise<AssetWithDetails[]>;
}

export function useInventory({ categoryFilter, subcategoryFilter }: UseInventoryProps = {}): UseInventoryReturn {
  const { user } = useAuth();
  const allowedLocations = useAllowedLocations(); // null = acceso total, [] = sin acceso, [...] = sedes permitidas

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
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
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
    let query = supabase.from('locations').select('*').eq('is_active', true).order('name');
    if (allowedLocations !== null) {
      // Usuario restringido: si tiene sedes asignadas, filtrar; si no, no retornar ninguna
      if (allowedLocations.length > 0) {
        query = query.in('id', allowedLocations);
      } else {
        // Sin sedes asignadas → no mostrar nada
        setLocations([]);
        return;
      }
    }
    const { data } = await query;
    if (data) setLocations(data);
  };

  const fetchAreas = async () => {
    const { data } = await supabase.from('areas').select('*').order('name');
    if (data) setAreas(data);
  };

  const ensureCategoriesLoaded = async (): Promise<Category[]> => {
    if (categories.length > 0) return categories;
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) {
      setCategories(data);
      return data;
    }
    return categories;
  };

  // Resolve the rubro filter (business_type de la empresa) into the set of
  // company/location ids that must be matched. Returns null when the filter is
  // inactive and { companyIds: [], locationIds: [] } when no company matches.
  const resolveRubroFilter = async (): Promise<{ locationIds: string[] } | null> => {
    if (!filterRubro) return null;

    const { data: rubroLocations } = await supabase
      .from('locations')
      .select('id')
      .eq('business_type', filterRubro);

    if (!rubroLocations || rubroLocations.length === 0) {
      console.warn(`[Rubro Filter] No se encontraron sedes con business_type="${filterRubro}"`);
      return { locationIds: [] };
    }

    return {
      locationIds: rubroLocations.map((l: any) => l.id),
    };
  };

  // Build the base query with all active filters applied.
  // Returns null when a filter resolves to an empty result set.
  const buildQuery = (select: string, currentCategories: Category[], rubro: { locationIds: string[] } | null) => {
    let query = supabase
      .from('assets')
      .select(select, { count: 'exact' });

    // Apply search filter
    if (searchTerm) {
      query = query.or(`codigo_unico.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%,item.ilike.%${searchTerm}%`);
    }

    // Apply access control location filter
    if (allowedLocations !== null) {
      // Usuario restringido: filtrar por sus sedes
      if (allowedLocations.length > 0) {
        query = query.in('location_id', allowedLocations);
      } else {
        // Sin sedes asignadas → retornar null para indicar que no hay resultados
        return null;
      }
    }

    // Apply category filter from URL
    const cleanCategoryFilter = categoryFilter?.replace('inventory-', '');
    const activePathCategory = cleanCategoryFilter ? PATH_CATEGORY_MAP[cleanCategoryFilter] : null;

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
    if (filterStatus.length > 0) {
      query = query.in('estado_uso', filterStatus);
    }

    // Apply rubro filter
    if (rubro) {
      if (rubro.locationIds.length === 0) return null;

      query = query.in('location_id', rubro.locationIds);
    }

    return query;
  };

  // Main fetch function
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Ensure categories and subcategories are loaded if URL filtering is active on mount
      const currentCategories = await ensureCategoriesLoaded();
      const rubro = await resolveRubroFilter();

      const query = buildQuery('*, locations(name), areas(name)', currentCategories, rubro);

      if (!query) {
        setRawInventory([]);
        setTotalCount(0);
        setLoading(false);
        return;
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

  // Fetch the IDs of every asset matching the current filters (across all pages)
  const fetchAllFilteredIds = async (): Promise<string[]> => {
    try {
      const currentCategories = await ensureCategoriesLoaded();
      const rubro = await resolveRubroFilter();

      const query = buildQuery('id', currentCategories, rubro);
      if (!query) return [];

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((a) => (a as unknown as { id: string }).id);
    } catch (error) {
      console.error('Error fetching filtered ids:', error);
      return [];
    }
  };

  const fetchAllFilteredData = async (): Promise<AssetWithDetails[]> => {
    try {
      const currentCategories = await ensureCategoriesLoaded();
      const rubro = await resolveRubroFilter();

      const query = buildQuery('*, locations(name), areas(name)', currentCategories, rubro);
      if (!query) return [];

      let sortField = sortConfig?.key || 'created_at';
      let sortAscending = sortConfig?.direction === 'asc';

      if (sortField === 'item' || sortField === 'descripcion') {
        sortField = 'item';
      }

      const { data, error } = await query.order(sortField, { ascending: sortAscending, nullsFirst: false });
      if (error) throw error;

      return (data || []).map((asset: any) => {
        const category = currentCategories.find(c => c.id === asset.category_id);
        const subcategory = subcategories.find(s => s.id === asset.subcategory_id);

        return {
          ...asset,
          categories: category ? { id: category.id, name: category.name } : null,
          subcategories: subcategory ? { id: subcategory.id, name: subcategory.name } : null,
        } as AssetWithDetails;
      });
    } catch (error) {
      console.error('Error fetching all filtered inventory data:', error);
      return [];
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

  // Initial fetch — re-run when allowedLocations changes (location data loads async from AuthContext)
  useEffect(() => {
    fetchDropdownData();
  }, [JSON.stringify(allowedLocations)]);

  // Fetch inventory when dependencies change (incluido allowedLocations para react a carga async)
  useEffect(() => {
    fetchInventory();
  }, [currentPage, itemsPerPage, searchTerm, filterCategory, selectedLocations, filterStatus, filterRubro, categoryFilter, subcategoryFilter, sortConfig, JSON.stringify(allowedLocations)]);

  // Realtime subscription for assets table
  useEffect(() => {
    const channel = supabase
      .channel('inventory-assets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    fetchAllFilteredIds,
    fetchAllFilteredData,
  };
}
