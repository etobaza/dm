import type { UnifiedAsset } from '../types';
import { getAssetPrice, getAssetName } from '../types';

export type SortField = 'price' | 'name' | 'created' | 'updated';
export type SortDirection = 'asc' | 'desc';

export function sortAssets<T extends UnifiedAsset>(
  assets: T[],
  field: SortField,
  direction: SortDirection
): T[] {
  return [...assets].sort((a, b) => {
    const modifier = direction === 'asc' ? 1 : -1;
    
    switch (field) {
      case 'price': {
        const priceA = getAssetPrice(a) ?? -1;
        const priceB = getAssetPrice(b) ?? -1;
        return (priceA - priceB) * modifier;
      }
      case 'created':
        return (new Date(a.createdTimestamp).getTime() - new Date(b.createdTimestamp).getTime()) * modifier;
      case 'updated':
        return (new Date(a.updatedTimestamp).getTime() - new Date(b.updatedTimestamp).getTime()) * modifier;
      default:
        return getAssetName(a).localeCompare(getAssetName(b)) * modifier;
    }
  });
}



