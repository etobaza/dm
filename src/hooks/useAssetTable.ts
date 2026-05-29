import { useState, useMemo } from 'react';
import type { UnifiedAsset } from '../types';
import { searchAssets, sortAssets, type SortField, type SortDirection } from '../utils';

export function useAssetTable<T extends UnifiedAsset>(initialAssets: T[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('price');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredAndSortedAssets = useMemo(() => {
    const filtered = searchAssets(initialAssets, searchTerm);
    return sortAssets(filtered, sortField, sortDirection);
  }, [initialAssets, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    handleSort,
    assets: filteredAndSortedAssets
  };
}
