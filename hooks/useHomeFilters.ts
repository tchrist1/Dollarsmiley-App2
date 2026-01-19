import { useState, useCallback, useMemo } from 'react';
import { FilterOptions, defaultFilters } from '@/components/FilterModal';

interface UseHomeFiltersOptions {
  initialListingType?: 'all' | 'Job' | 'Service' | 'CustomService';
}

export function useHomeFilters(options: UseHomeFiltersOptions = {}) {
  const [filters, setFilters] = useState<FilterOptions>({
    ...defaultFilters,
    listingType: options.initialListingType || 'all',
  });
  const [showFilterModal, setShowFilterModal] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.listingType !== 'all') count++;
    if (filters.categories.length > 0) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.distance !== undefined && filters.distance !== 25) count++;
    if (filters.minRating > 0) count++;
    if (filters.sortBy !== 'relevance') count++;
    if (filters.verified) count++;
    if (filters.location) count++;

    return count;
  }, [filters]);

  const updateFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      ...defaultFilters,
      listingType: options.initialListingType || 'all',
    });
  }, [options.initialListingType]);

  const openFilterModal = useCallback(() => {
    setShowFilterModal(true);
  }, []);

  const closeFilterModal = useCallback(() => {
    setShowFilterModal(false);
  }, []);

  const applyFilters = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    setShowFilterModal(false);
  }, []);

  return {
    filters,
    activeFilterCount,
    showFilterModal,
    updateFilters,
    resetFilters,
    openFilterModal,
    closeFilterModal,
    applyFilters,
  };
}
