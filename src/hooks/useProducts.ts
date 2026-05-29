import { useState, useCallback } from 'react';
import { fetchDeveloperProducts } from '../api/roblox';
import type { DeveloperProduct, FetchStatus } from '../types';
import { getErrorMessage } from '../utils';

export function useProducts() {
  const [products, setProducts] = useState<DeveloperProduct[]>([]);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (universeId: string) => {
    setStatus('loading');
    setError(null);
    setProducts([]);

    try {
      const data = await fetchDeveloperProducts(universeId);
      setProducts(data.developerProducts);
      setStatus('success');
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('error');
    }
  }, []);

  return {
    products,
    status,
    error,
    fetchProducts,
  };
}

