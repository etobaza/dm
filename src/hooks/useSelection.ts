import { useState, useCallback } from 'react';
import type { UnifiedAsset } from '../types';
import { getAssetId } from '../types';

export function useSelection<T extends UnifiedAsset>(assets: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleToggleSelection = useCallback((id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assets.map(a => getAssetId(a))));
    }
  }, [assets, selectedIds.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedAssets = assets.filter(a => selectedIds.has(getAssetId(a)));
  const allSelected = assets.length > 0 && selectedIds.size === assets.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < assets.length;

  return {
    selectedIds,
    setSelectedIds,
    handleToggleSelection,
    handleSelectAll,
    handleClearSelection,
    selectedAssets,
    allSelected,
    someSelected
  };
}
