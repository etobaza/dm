import type { BulkProductRow } from '../types';

const DRAFT_KEY_PREFIX = 'bulk_create_draft_';
const DRAFT_EXPIRATION_DAYS = 7;

interface DraftData {
  products: BulkProductRow[];
  timestamp: number;
}

export function saveBulkDraft(universeId: string, products: BulkProductRow[], assetType: 'product' | 'gamepass' = 'product'): void {
  try {
    const key = `${DRAFT_KEY_PREFIX}${universeId}_${assetType}`;
    const data: DraftData = {
      products,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
}

export function loadBulkDraft(universeId: string, assetType: 'product' | 'gamepass' = 'product'): BulkProductRow[] | null {
  try {
    const key = `${DRAFT_KEY_PREFIX}${universeId}_${assetType}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return null;
    }
    
    const data: DraftData = JSON.parse(stored);
    
    const expirationTime = DRAFT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - data.timestamp > expirationTime;
    
    if (isExpired) {
      clearBulkDraft(universeId, assetType);
      return null;
    }
    
    return data.products;
  } catch (error) {
    console.error('Failed to load draft:', error);
    return null;
  }
}

export function clearBulkDraft(universeId: string, assetType: 'product' | 'gamepass' = 'product'): void {
  try {
    const key = `${DRAFT_KEY_PREFIX}${universeId}_${assetType}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear draft:', error);
  }
}

export function hasBulkDraft(universeId: string, assetType: 'product' | 'gamepass' = 'product'): boolean {
  const draft = loadBulkDraft(universeId, assetType);
  return draft !== null && draft.length > 0;
}
