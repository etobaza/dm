import type { BulkProductRow, UnifiedAsset } from '../types';
import { getAssetPrice, isAssetRegionalPricingEnabled } from '../types';
import { nanoid } from 'nanoid';

export function exportAssetsToJson(assets: UnifiedAsset[]): string {
  const exportData = assets.map(a => ({
    name: a.name,
    description: a.description,
    price: getAssetPrice(a),
    isForSale: a.isForSale,
    regionalPricing: isAssetRegionalPricingEnabled(a)
  }));
  return JSON.stringify(exportData, null, 2);
}

export function parseJsonToProducts(jsonContent: string): BulkProductRow[] {
  try {
    const data = JSON.parse(jsonContent);
    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of products');
    }

    return data.map((item: unknown, index: number) => {
      if (!item || typeof item !== 'object') {
         throw new Error(`Item at index ${index} is not a valid object`);
      }
      
      const record = item as Record<string, unknown>;
      const isForSale = record.isForSale !== false; 
      const price = record.price;
      
      return {
        id: nanoid(),
        name: String(record.name || ''),
        description: String(record.description || ''),
        price: price != null ? String(price) : '',
        isForSale,
        isRegionalPricingEnabled: isForSale && !!record.regionalPricing,
        validationErrors: {},
        status: 'pending' as const,
      };
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw new Error('Invalid JSON format');
  }
}

export function generateJsonTemplate(assetType: 'product' | 'gamepass' = 'product'): string {
  const typeName = assetType === 'gamepass' ? 'Game Pass' : 'Product';
  const template = [
    {
      name: `Example ${typeName} 1`,
      description: "Sample description",
      price: 100,
      isForSale: true,
      regionalPricing: true
    },
    {
      name: `Example ${typeName} 2`,
      description: "Another sample",
      price: 250,
      isForSale: true,
      regionalPricing: false
    },
    {
      name: `Example Offsale ${typeName}`,
      description: `This ${assetType} is offsale`,
      price: null,
      isForSale: false,
      regionalPricing: false
    }
  ];
  return JSON.stringify(template, null, 2);
}

export function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
