import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Location, BUSINESS_TYPE_LABELS, BusinessType } from '../types/inventory.types';
import { FilterDef } from '../components/ui/FilterBar';
import { Filter, MapPin } from 'lucide-react';

export interface UseLocationFiltersOptions {
  allowedLocations?: string[] | null;
  rubroPlaceholder?: string;
  locationPlaceholder?: string;
  multipleLocations?: boolean;
}

export function useLocationFilters(options: UseLocationFiltersOptions = {}) {
  const {
    allowedLocations = null,
    rubroPlaceholder = 'TODOS LOS RUBROS',
    locationPlaceholder = 'TODAS LAS SEDES',
    multipleLocations = true,
  } = options;

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedRubros, setSelectedRubrosState] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocationsState] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchLocations();
  }, [allowedLocations]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('locations')
        .select('*, companies(id, name)')
        .eq('is_active', true)
        .order('name');

      if (allowedLocations !== null) {
        if (allowedLocations.length > 0) {
          query = query.in('id', allowedLocations);
        } else {
          setLocations([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (!error && data) {
        setLocations(data as Location[]);
      }
    } catch (err) {
      console.error('Error fetching locations with companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = useMemo(() => {
    if (selectedRubros.length === 0) return locations;
    return locations.filter(loc => loc.business_type && selectedRubros.includes(loc.business_type));
  }, [locations, selectedRubros]);

  const setSelectedRubros = (rubros: string[] | string) => {
    const nextRubros = Array.isArray(rubros) ? rubros : rubros ? [rubros] : [];
    setSelectedRubrosState(nextRubros);

    // Filter out locations that are no longer valid for the selected rubros
    if (nextRubros.length > 0) {
      const validLocationIds = new Set(
        locations
          .filter(loc => loc.business_type && nextRubros.includes(loc.business_type))
          .map(loc => loc.id)
      );
      setSelectedLocationsState(prev => prev.filter(id => validLocationIds.has(id)));
    }
  };

  const setSelectedLocations = (locs: string[] | string) => {
    const nextLocs = Array.isArray(locs) ? locs : locs ? [locs] : [];
    setSelectedLocationsState(nextLocs);
  };

  const clearLocationFilters = () => {
    setSelectedRubrosState([]);
    setSelectedLocationsState([]);
  };

  const formatLocationLabel = (loc: Location): string => {
    const companyName = loc.companies?.name;
    return companyName ? `${loc.name} (${companyName})` : loc.name;
  };

  const rubroAndLocationFilters: FilterDef[] = useMemo(() => [
    {
      key: 'business_type',
      placeholder: rubroPlaceholder,
      icon: Filter,
      iconClassName: 'text-blue-500',
      wrapperClassName: 'md:min-w-[220px]',
      options: Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      key: 'location',
      placeholder: locationPlaceholder,
      icon: MapPin,
      iconClassName: 'text-rose-500',
      wrapperClassName: 'md:min-w-[240px]',
      multiple: multipleLocations,
      options: filteredLocations.map(loc => ({
        value: loc.id,
        label: formatLocationLabel(loc),
      })),
    },
  ], [filteredLocations, rubroPlaceholder, locationPlaceholder, multipleLocations]);

  return {
    locations,
    filteredLocations,
    selectedRubros,
    setSelectedRubros,
    selectedLocations,
    setSelectedLocations,
    clearLocationFilters,
    rubroAndLocationFilters,
    formatLocationLabel,
    loading,
  };
}
