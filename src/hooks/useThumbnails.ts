import { useState, useEffect, useMemo } from 'react';
import { fetchAssetThumbnails } from '../api/roblox';

export function useThumbnails(products: { iconImageAssetId: number | null }[]) {
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const assetIds = useMemo(() => 
    products
      .map(p => p.iconImageAssetId)
      .filter((id): id is number => id !== null),
    [products]
  );

  const assetIdsKey = useMemo(() => assetIds.join(','), [assetIds]);

  useEffect(() => {
    let cancelled = false;

    const loadThumbnails = async () => {
      if (assetIds.length === 0) {
        if (!cancelled) {
          setThumbnails({});
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsLoading(true);
      }

      const urls = await fetchAssetThumbnails(assetIds);
      
      if (!cancelled) {
        setThumbnails(urls);
        setIsLoading(false);
      }
    };

    loadThumbnails();

    return () => {
      cancelled = true;
    };
  }, [assetIdsKey, assetIds]);

  return { thumbnails, isLoading };
}
