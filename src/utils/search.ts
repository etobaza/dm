import type { UnifiedAsset } from '../types';
import { getAssetPrice, isAssetOffsale, getAssetId, getAssetName } from '../types';

export function searchAssets<T extends UnifiedAsset>(assets: T[], searchTerm: string): T[] {
  if (!searchTerm) return assets;
  
  const term = searchTerm.toLowerCase();
  return assets.filter((asset) => {
    const matchesName = getAssetName(asset).toLowerCase().includes(term);
    const price = getAssetPrice(asset);
    const matchesPrice = price !== null && price.toString().includes(term);
    const matchesOffsale = term === 'offsale' && isAssetOffsale(asset);
    const matchesId = getAssetId(asset).toString().includes(term);
    return matchesName || matchesPrice || matchesOffsale || matchesId;
  });
}



