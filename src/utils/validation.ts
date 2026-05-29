import type { BulkProductRow, ValidationErrors } from '../types';
import { MAX_PRICE_ROBUX } from '../constants';

export function validateProductName(name: string): string | undefined {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return 'Product name is required';
  }
  
  if (trimmedName.length < 3) {
    return 'Name must be at least 3 characters';
  }
  
  if (trimmedName.length > 50) {
    return 'Name must not exceed 50 characters';
  }
  
  return undefined;
}

export function validateProductPrice(
  price: string,
  isForSale: boolean = true,
  assetType: 'product' | 'gamepass' = 'product'
): string | undefined {
  // Developer products can't be offsale — they always require a price.
  const requiresPrice = isForSale || assetType === 'product';
  if (!requiresPrice) {
    return undefined;
  }

  if (!price.trim()) {
    return assetType === 'product'
      ? 'Developer products require a price'
      : 'Price is required (or set as offsale)';
  }

  const priceNum = parseInt(price, 10);
  
  if (isNaN(priceNum)) {
    return 'Price must be a valid number';
  }
  
  if (priceNum < 0) {
    return 'Price cannot be negative';
  }
  
  if (priceNum > MAX_PRICE_ROBUX) {
    return 'Price cannot exceed 1,000,000,000 Robux';
  }
  
  return undefined;
}

export function validateRow(
  row: BulkProductRow,
  assetType: 'product' | 'gamepass' = 'product'
): ValidationErrors {
  const errors: ValidationErrors = {};

  const nameError = validateProductName(row.name);
  if (nameError) {
    errors.name = nameError;
  }

  const priceError = validateProductPrice(row.price, row.isForSale, assetType);
  if (priceError) {
    errors.price = priceError;
  }

  return errors;
}

export function validateAllRows(
  rows: BulkProductRow[],
  assetType: 'product' | 'gamepass' = 'product'
): boolean {
  return rows.every(row => {
    const errors = validateRow(row, assetType);
    return Object.keys(errors).length === 0;
  });
}

export function findDuplicateNames(rows: BulkProductRow[]): string[] {
  const nameCount = new Map<string, number>();
  const duplicates: string[] = [];
  
  rows.forEach(row => {
    const normalizedName = row.name.trim().toLowerCase();
    if (normalizedName) {
      const count = (nameCount.get(normalizedName) || 0) + 1;
      nameCount.set(normalizedName, count);
      
      if (count === 2) {
        duplicates.push(row.name.trim());
      }
    }
  });
  
  return duplicates;
}

export function hasValidContent(row: BulkProductRow): boolean {
  return row.name.trim() !== '' || row.description.trim() !== '' || row.price.trim() !== '';
}
