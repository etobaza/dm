import type { DeveloperProductsResponse } from '../types';
import { config } from '../config';
import { THUMBNAIL_SIZE, THUMBNAIL_FORMAT, THUMBNAIL_BATCH_SIZE } from '../constants';
import { sleep } from '../utils';

export class RobloxAPIError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'RobloxAPIError';
    this.status = status;
  }
}

export async function fetchDeveloperProducts(
  universeId: string,
  limit: number = 400
): Promise<DeveloperProductsResponse> {
  if (!universeId) {
    throw new RobloxAPIError('Universe ID is required');
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_PRODUCTS',
      universeId,
      limit
    });

    if (response.error) {
      throw new RobloxAPIError(response.error, response.status);
    }

    return response;
  } catch (error) {
    if (error instanceof RobloxAPIError) {
      throw error;
    }
    throw new RobloxAPIError(
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}

export interface ThumbnailResponse {
  data: {
    targetId: number;
    state: string;
    imageUrl: string;
  }[];
}

export async function fetchAssetThumbnails(assetIds: number[]): Promise<Record<number, string>> {
  if (assetIds.length === 0) return {};

  const chunks = [];
  for (let i = 0; i < assetIds.length; i += THUMBNAIL_BATCH_SIZE) {
    chunks.push(assetIds.slice(i, i + THUMBNAIL_BATCH_SIZE));
  }

  const results: Record<number, string> = {};

  for (const chunk of chunks) {
    try {
      const idsParam = chunk.join(',');
      const url = `${config.ROBLOX_THUMBNAILS_API_URL}?assetIds=${idsParam}&size=${THUMBNAIL_SIZE}&format=${THUMBNAIL_FORMAT}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch thumbnails: ${response.statusText}`);
        continue;
      }

      const text = await response.text();
      const data: ThumbnailResponse = text ? JSON.parse(text) : { data: [] };
      data.data.forEach(item => {
        if (item.state === 'Completed' && item.imageUrl) {
          results[item.targetId] = item.imageUrl;
        }
      });
    } catch (error) {
      console.error('Error fetching thumbnails:', error);
    }
  }

  return results;
}

export async function getActiveTabUrl(): Promise<string> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB_URL' });
    return response.url || '';
  } catch (error) {
    console.error('Failed to get active tab URL:', error);
    return '';
  }
}

export async function updateDeveloperProductPrice(
  universeId: string,
  productId: string,
  productData: {
    name: string;
    description: string;
    priceInRobux: number | null;
    storePageEnabled: boolean;
    isRegionalPricingEnabled: boolean;
  }
): Promise<void> {
  if (!universeId || !productId) {
    throw new RobloxAPIError('Universe ID and Product ID are required');
  }

  try {
    // The v2 update endpoint is a full-state multipart submission (not a partial
    // patch), so callers pass the complete desired product state. The background
    // worker maps these to the form fields. priceInRobux === null => offsale.
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_PRODUCT_PRICE',
      universeId,
      productId,
      productData,
    });

    if (response.error) {
      throw new RobloxAPIError(response.error, response.status);
    }

    return response;
  } catch (error) {
    if (error instanceof RobloxAPIError) {
      throw error;
    }
    throw new RobloxAPIError(
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}

export async function createDeveloperProduct(
  universeId: string,
  productData: {
    name: string;
    description: string;
    priceInRobux: number | null;
    isRegionalPricingEnabled: boolean;
  }
): Promise<void> {
  if (!universeId) {
    throw new RobloxAPIError('Universe ID is required');
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CREATE_PRODUCT',
      universeId,
      productData,
    });

    if (!response) {
      throw new RobloxAPIError('Failed to communicate with background script. Please reload the extension.');
    }

    if (response.error) {
      throw new RobloxAPIError(response.error, response.status);
    }

    return response;
  } catch (error) {
    if (error instanceof RobloxAPIError) {
      throw error;
    }
    throw new RobloxAPIError(
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}

async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number,
  delayBetweenBatches: number,
  onProgress?: (completed: number, total: number) => void
): Promise<Array<{ index: number; success: boolean; result?: R; error?: string }>> {
  const results: Array<{ index: number; success: boolean; result?: R; error?: string }> = [];
  let completed = 0;

  const processBatch = async (batch: Array<{ item: T; index: number }>) => {
    const promises = batch.map(async ({ item, index }) => {
      try {
        const result = await processor(item, index);
        results.push({ index, success: true, result });
        completed++;
        if (onProgress) {
          onProgress(completed, items.length);
        }
      } catch (error) {
        results.push({
          index,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
        completed++;
        if (onProgress) {
          onProgress(completed, items.length);
        }
      }
    });
    await Promise.allSettled(promises);
  };

  const batches: Array<Array<{ item: T; index: number }>> = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency).map((item, batchIndex) => ({
      item,
      index: i + batchIndex,
    }));
    batches.push(batch);
  }

  for (let i = 0; i < batches.length; i++) {
    await processBatch(batches[i]);
    if (i < batches.length - 1) {
      await sleep(delayBetweenBatches);
    }
  }

  return results.sort((a, b) => a.index - b.index);
}

export async function createDeveloperProductsBatch(
  universeId: string,
  products: {
    name: string;
    description: string;
    priceInRobux: number | null;
    isRegionalPricingEnabled: boolean;
  }[],
  onProgress?: (completed: number, total: number) => void
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    index: number;
    success: boolean;
    product?: unknown;
    error?: string;
  }>;
}> {
  if (!universeId) {
    throw new RobloxAPIError('Universe ID is required');
  }

  const processedResults = await processWithConcurrency(
    products,
    async (product) => await createDeveloperProduct(universeId, product),
    3,
    500,
    onProgress
  );

  const results = processedResults.map((r) => ({
    index: r.index,
    success: r.success,
    product: r.result,
    error: r.error,
  }));

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: products.length,
    successful,
    failed,
    results,
  };
}


export async function fetchGamePasses(
  universeId: string,
  count: number = 400
): Promise<import('../types').GamePassesResponse> {
  if (!universeId) {
    throw new RobloxAPIError('Universe ID is required');
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_GAMEPASSES',
      universeId,
      count
    });

    if (response.error) {
      throw new RobloxAPIError(response.error, response.status);
    }

    return response;
  } catch (error) {
    if (error instanceof RobloxAPIError) {
      throw error;
    }
    throw new RobloxAPIError(
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}

export async function createGamePass(
  universeId: string,
  data: import('../types').CreateGamePassRequest
): Promise<void> {
  if (!universeId) {
    throw new RobloxAPIError('Universe ID is required');
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CREATE_GAMEPASS',
      universeId,
      name: data.name,
      description: data.description
    });

    if (response.error) {
      throw new RobloxAPIError(response.error, response.status);
    }

    if (data.price !== undefined) {
      const gamePassId = response.gamePassId || response.id;
      
      if (gamePassId) {
        await updateGamePass({
          gamePassId,
          universeId,
          isForSale: true,
          price: data.price,
          isRegionalPricingEnabled: data.isRegionalPricingEnabled ?? true
        });
      }
    }

    return response;
  } catch (error) {
    if (error instanceof RobloxAPIError) {
      throw error;
    }
    throw new RobloxAPIError(
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}

export async function updateGamePass(
  data: import('../types').UpdateGamePassRequest
): Promise<void> {
  if (!data.gamePassId) {
    throw new RobloxAPIError('Game Pass ID is required');
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_GAMEPASS',
      ...data
    });

    if (response.error) {
      throw new RobloxAPIError(response.error, response.status);
    }

    return response;
  } catch (error) {
    if (error instanceof RobloxAPIError) {
      throw error;
    }
    throw new RobloxAPIError(
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}

export async function createGamePassesBatch(
  universeId: string,
  gamePasses: {
    name: string;
    description: string;
    price?: number;
    isRegionalPricingEnabled?: boolean;
  }[],
  onProgress?: (completed: number, total: number) => void
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    index: number;
    success: boolean;
    gamePass?: unknown;
    error?: string;
  }>;
}> {
  if (!universeId) {
    throw new RobloxAPIError('Universe ID is required');
  }

  const processedResults = await processWithConcurrency(
    gamePasses,
    async (gamePass) => await createGamePass(universeId, { ...gamePass, universeId }),
    3,
    500,
    onProgress
  );

  const results = processedResults.map((r) => ({
    index: r.index,
    success: r.success,
    gamePass: r.result,
    error: r.error,
  }));

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: gamePasses.length,
    successful,
    failed,
    results,
  };
}

