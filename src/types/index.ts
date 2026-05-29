export interface DeveloperProduct {
  developerProductId: number;
  productId: number;
  name: string;
  description: string;
  iconImageAssetId: number | null;
  universeId: number;
  isForSale: boolean;
  storePageEnabled: boolean;
  priceInformation: {
    defaultPriceInRobux: number;
    enabledFeatures: string[];
  } | null;
  isImmutable: boolean;
  createdTimestamp: string;
  updatedTimestamp: string;
}

export function isRegionalPricingEnabled(product: DeveloperProduct): boolean {
  return product.priceInformation?.enabledFeatures.includes('RegionalPricing') ?? false;
}

export function getProductPrice(product: DeveloperProduct): number | null {
  return product.priceInformation?.defaultPriceInRobux ?? null;
}

export function isProductOffsale(product: DeveloperProduct): boolean {
  return !product.isForSale;
}

export interface DeveloperProductsResponse {
  developerProducts: DeveloperProduct[];
  nextPageToken?: string | null;
}

export interface FetchError {
  message: string;
  status?: number;
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UpdateDeveloperProductResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  status?: number;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  priceInRobux: number | null;
  isRegionalPricingEnabled: boolean;
}

export interface BulkProductRow {
  id: string;
  name: string;
  description: string;
  price: string;
  isForSale: boolean;
  isRegionalPricingEnabled: boolean;
  validationErrors: ValidationErrors;
  status: 'pending' | 'creating' | 'success' | 'error';
  errorMessage?: string;
}

export interface ValidationErrors {
  name?: string;
  price?: string;
}

export interface BulkCreateResult {
  total: number;
  successful: number;
  failed: number;
  results: ProductCreationResult[];
}

export interface ProductCreationResult {
  rowId: string;
  success: boolean;
  product?: DeveloperProduct;
  error?: string;
}

export interface GamePass {
  gamePassId: number;
  name: string;
  description: string;
  isForSale: boolean;
  iconAssetId: number;
  placeId?: number;
  createdTimestamp: string;
  updatedTimestamp: string;
  priceInformation: {
    defaultPriceInRobux: number | null;
    enabledFeatures: string[];
  } | null;
}

export interface GamePassesResponse {
  gamePasses: GamePass[];
  nextPageToken?: string | null;
}

export interface CreateGamePassRequest {
  name: string;
  description: string;
  universeId: string;
  price?: number;
  isRegionalPricingEnabled?: boolean;
}

export interface UpdateGamePassRequest {
  gamePassId: number;
  universeId: string;
  isForSale?: boolean;
  price?: number;
  isRegionalPricingEnabled?: boolean;
  name?: string;
}

export function isGamePassRegionalPricingEnabled(gamePass: GamePass): boolean {
  return gamePass.priceInformation?.enabledFeatures.includes('RegionalPricing') ?? false;
}

export function getGamePassPrice(gamePass: GamePass): number | null {
  return gamePass.priceInformation?.defaultPriceInRobux ?? null;
}

export type UnifiedAsset = DeveloperProduct | GamePass;

export function getAssetId(asset: UnifiedAsset): number {
  return 'productId' in asset ? asset.productId : asset.gamePassId;
}

export function getAssetName(asset: UnifiedAsset): string {
  return asset.name;
}

export function getAssetPrice(asset: UnifiedAsset): number | null {
  return 'productId' in asset ? getProductPrice(asset) : getGamePassPrice(asset);
}

export function isAssetOffsale(asset: UnifiedAsset): boolean {
  return 'productId' in asset ? isProductOffsale(asset) : isGamePassOffsale(asset);
}

export function isAssetRegionalPricingEnabled(asset: UnifiedAsset): boolean {
  return 'productId' in asset ? isRegionalPricingEnabled(asset) : isGamePassRegionalPricingEnabled(asset);
}

export function isGamePassOffsale(gamePass: GamePass): boolean {
  return !gamePass.isForSale;
}

