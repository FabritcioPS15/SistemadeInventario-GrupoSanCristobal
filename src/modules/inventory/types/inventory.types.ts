export type InventoryStatus = 'active' | 'inactive' | 'maintenance' | 'extracted';

export interface InventoryItem {
  id: string;
  code: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  serial: string;
  site: string;
  area: string;
  status: InventoryStatus;
  acquisitionDate: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryFilters {
  search: string;
  category: string;
  subcategory: string;
  site: string[];
  area: string;
  status: string;
}

export interface InventorySortConfig {
  key: string;
  direction: 'asc' | 'desc';
}
