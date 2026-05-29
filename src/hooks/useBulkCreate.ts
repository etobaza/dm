import { useState, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import type { BulkProductRow } from '../types';
import { validateRow, hasValidContent } from '../utils/validation';
import { saveBulkDraft, loadBulkDraft } from '../utils/localStorage';

const EMPTY_ROW_COUNT = 1;
const AUTO_SAVE_DELAY = 2000;

export function useBulkCreate(universeId: string, assetType: 'product' | 'gamepass' = 'product') {
  const [products, setProducts] = useState<BulkProductRow[]>(() => 
    createEmptyRows(EMPTY_ROW_COUNT)
  );
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  useEffect(() => {
    if (!hasLoadedDraft) return;

    const timer = setTimeout(() => {
      const validProducts = products.filter(hasValidContent);
      if (validProducts.length > 0) {
        saveBulkDraft(universeId, products, assetType);
      }
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [products, universeId, hasLoadedDraft, assetType]);

  const loadDraft = useCallback(() => {
    const draft = loadBulkDraft(universeId, assetType);
    if (draft && draft.length > 0) {
      setProducts(draft);
      setHasLoadedDraft(true);
      return draft.length;
    }
    return 0;
  }, [universeId, assetType]);

  const addRow = useCallback(() => {
    setProducts(prev => [...prev, createEmptyRow()]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setProducts(prev => prev.filter(row => row.id !== id));
  }, []);

  const removeRows = useCallback((ids: string[]) => {
    const idsToRemove = new Set(ids);
    setProducts(prev => prev.filter(row => !idsToRemove.has(row.id)));
  }, []);

  const updateRow = useCallback((id: string, updates: Partial<BulkProductRow>) => {
    setProducts(prev => prev.map(row => {
      if (row.id !== id) return row;
      
      const updated = { ...row, ...updates };
      
      if (updated.status === 'error') {
        updated.status = 'pending';
        updated.errorMessage = undefined;
      }
      
      if ('name' in updates || 'price' in updates || 'isForSale' in updates) {
        updated.validationErrors = validateRow(updated, assetType);
      }

      return updated;
    }));
  }, [assetType]);

  const clearAll = useCallback(() => {
    setProducts(createEmptyRows(EMPTY_ROW_COUNT));
  }, []);

  const importProducts = useCallback((importedProducts: BulkProductRow[]) => {
    setProducts(importedProducts.map(p => ({
      ...p,
      validationErrors: validateRow(p, assetType),
    })));
    setHasLoadedDraft(true);
  }, [assetType]);

  const validateAll = useCallback(() => {
    const validatedProducts = products.map(row => ({
      ...row,
      validationErrors: validateRow(row, assetType),
    }));

    setProducts(validatedProducts);

    const validProducts = validatedProducts.filter(hasValidContent);
    const hasErrors = validProducts.some(
      row => Object.keys(row.validationErrors).length > 0
    );

    return !hasErrors && validProducts.length > 0;
  }, [products, assetType]);

  const getValidProducts = useCallback(() => {
    return products.filter(row => {
      if (!hasValidContent(row)) return false;
      const errors = validateRow(row, assetType);
      return Object.keys(errors).length === 0;
    });
  }, [products, assetType]);

  const updateRowStatus = useCallback((
    id: string,
    status: BulkProductRow['status'],
    errorMessage?: string
  ) => {
    setProducts(prev => prev.map(row =>
      row.id === id ? { ...row, status, errorMessage } : row
    ));
  }, []);

  return {
    products,
    addRow,
    removeRow,
    removeRows,
    updateRow,
    clearAll,
    importProducts,
    validateAll,
    getValidProducts,
    updateRowStatus,
    loadDraft,
    hasLoadedDraft: hasLoadedDraft || products.some(hasValidContent),
  };
}

function createEmptyRow(): BulkProductRow {
  return {
    id: nanoid(),
    name: '',
    description: '',
    price: '',
    isForSale: true,
    isRegionalPricingEnabled: true,
    validationErrors: {},
    status: 'pending',
  };
}

function createEmptyRows(count: number): BulkProductRow[] {
  return Array.from({ length: count }, createEmptyRow);
}
