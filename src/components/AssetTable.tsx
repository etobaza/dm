import { useState, useCallback } from 'react';
import type { UnifiedAsset, DeveloperProduct, GamePass } from '../types';
import { 
  getAssetId, 
  getAssetPrice, 
  isAssetRegionalPricingEnabled, 
  getAssetName 
} from '../types';
import { AssetCard } from './AssetCard';
import { ProductSearch } from './ProductSearch';
import { SortControls } from './SortControls';
import { BulkOperationsModal } from './BulkOperationsModal';
import { useThumbnails, useClipboard, useAssetTable, useSelection } from '../hooks';
import { updateDeveloperProductPrice, updateGamePass } from '../api/roblox';
import { UI_STRINGS } from '../constants/strings';
import { CopyIcon } from './CopyIcon';

interface AssetTableProps {
  assets: UnifiedAsset[];
  onRefresh?: () => void;
  universeId?: string;
  assetType: 'product' | 'gamepass';
}

export function AssetTable({ assets: initialAssets, onRefresh, universeId, assetType }: AssetTableProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [prevInitialAssets, setPrevInitialAssets] = useState(initialAssets);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isBulkOperationsModalOpen, setIsBulkOperationsModalOpen] = useState(false);
  
  const thumbnailAssets = assets.map(a => {
    if ('productId' in a) return a; 
    return { 
      ...a, 
      productId: a.gamePassId, 
      iconImageAssetId: a.iconAssetId 
    };
  });
  
  const { thumbnails } = useThumbnails(thumbnailAssets);
  const { copiedValue, copy } = useClipboard();
  
  const {
    searchTerm,
    setSearchTerm,
    sortField,
    sortDirection,
    handleSort,
    assets: displayAssets
  } = useAssetTable(assets);

  const {
    selectedIds,
    handleToggleSelection,
    handleSelectAll,
    handleClearSelection,
    selectedAssets,
    allSelected,
    someSelected
  } = useSelection(displayAssets);

  if (initialAssets !== prevInitialAssets) {
    const prevIds = prevInitialAssets.map(getAssetId).join(',');
    const currentIds = initialAssets.map(getAssetId).join(',');
    
    if (prevIds !== currentIds) {
      setAssets(initialAssets);
      handleClearSelection();
    } else {
      const hasChanges = initialAssets.some((asset, index) => {
        const prevAsset = prevInitialAssets[index];
        return !prevAsset || 
          getAssetPrice(prevAsset) !== getAssetPrice(asset) ||
          getAssetName(asset) !== getAssetName(prevAsset);
      });
      
      if (hasChanges) {
        setAssets(initialAssets);
      }
    }
    setPrevInitialAssets(initialAssets);
  }

  const handlePriceUpdate = async (id: number, newPrice: number | null) => {
    const asset = assets.find(a => getAssetId(a) === id);
    if (!asset) return;

    try {
      if (assetType === 'product') {
        const product = asset as DeveloperProduct;
        await updateDeveloperProductPrice(
          product.universeId.toString(),
          id.toString(),
          {
            name: product.name,
            description: product.description,
            priceInRobux: newPrice,
            storePageEnabled: product.storePageEnabled,
            isRegionalPricingEnabled: isAssetRegionalPricingEnabled(product),
          }
        );
      } else {
        const gamePass = asset as GamePass;
        if (!universeId) throw new Error('Universe ID is required');
        await updateGamePass({
          gamePassId: id,
          universeId,
          isForSale: newPrice !== null,
          price: newPrice ?? undefined,
          isRegionalPricingEnabled: isAssetRegionalPricingEnabled(gamePass)
        });
      }

      setAssets(prev => prev.map(a => {
        if (getAssetId(a) !== id) return a;
        
        const updatedAsset = { ...a };
        if ('priceInformation' in updatedAsset) {
            if (newPrice === null) {
                updatedAsset.isForSale = false;
                if (updatedAsset.priceInformation) {
                    updatedAsset.priceInformation.defaultPriceInRobux = 0; 
                }
            } else {
                updatedAsset.isForSale = true;
                if (!updatedAsset.priceInformation) {
                    updatedAsset.priceInformation = { defaultPriceInRobux: newPrice, enabledFeatures: [] };
                } else {
                    updatedAsset.priceInformation.defaultPriceInRobux = newPrice;
                }
            }
        }
        return updatedAsset;
      }));
    } catch (error) {
      console.error('Failed to update price', error);
      throw error instanceof Error ? error : new Error(UI_STRINGS.ERRORS.UPDATE_PRICE_FAILED);
    }
  };

  const handleRegionalPricingToggle = async (id: number, enabled: boolean) => {
    const asset = assets.find(a => getAssetId(a) === id);
    if (!asset) return;

    try {
      if (assetType === 'product') {
        const product = asset as DeveloperProduct;
        await updateDeveloperProductPrice(
          product.universeId.toString(),
          id.toString(),
          {
            name: product.name,
            description: product.description,
            priceInRobux: getAssetPrice(product),
            storePageEnabled: product.storePageEnabled,
            isRegionalPricingEnabled: enabled,
          }
        );
      } else {
        const gamePass = asset as GamePass;
        if (!universeId) throw new Error('Universe ID is required');
        await updateGamePass({
          gamePassId: id,
          universeId,
          isForSale: gamePass.isForSale,
          price: getAssetPrice(gamePass) ?? undefined,
          isRegionalPricingEnabled: enabled
        });
      }

      setAssets(prev => prev.map(a => {
        if (getAssetId(a) !== id) return a;
        
        const updatedAsset = { ...a };
        const currentFeatures = updatedAsset.priceInformation?.enabledFeatures ?? [];
        const newFeatures = enabled
            ? [...currentFeatures.filter(f => f !== 'RegionalPricing'), 'RegionalPricing']
            : currentFeatures.filter(f => f !== 'RegionalPricing');
        
        if (!updatedAsset.priceInformation) {
            updatedAsset.priceInformation = { defaultPriceInRobux: 0, enabledFeatures: newFeatures };
        } else {
            updatedAsset.priceInformation.enabledFeatures = newFeatures;
        }
        
        return updatedAsset;
      }));
    } catch (error) {
      console.error('Failed to toggle regional pricing', error);
      throw error instanceof Error ? error : new Error('Failed to update regional pricing');
    }
  };

  const handleNameUpdate = async (id: number, newName: string) => {
    const asset = assets.find(a => getAssetId(a) === id);
    if (!asset) return;

    try {
      if (assetType === 'product') {
        const product = asset as DeveloperProduct;
        await updateDeveloperProductPrice(
          product.universeId.toString(),
          id.toString(),
          {
            name: newName,
            description: product.description,
            priceInRobux: getAssetPrice(product),
            storePageEnabled: product.storePageEnabled,
            isRegionalPricingEnabled: isAssetRegionalPricingEnabled(product),
          }
        );
      } else {
        const gamePass = asset as GamePass;
        if (!universeId) throw new Error('Universe ID is required');
        await updateGamePass({
          gamePassId: id,
          universeId,
          isForSale: gamePass.isForSale,
          price: getAssetPrice(gamePass) ?? undefined,
          isRegionalPricingEnabled: isAssetRegionalPricingEnabled(gamePass),
          name: newName
        });
      }

      setAssets(prev => prev.map(a => {
        if (getAssetId(a) !== id) return a;
        return { ...a, name: newName };
      }));
    } catch (error) {
      console.error('Failed to update name', error);
      throw error instanceof Error ? error : new Error(UI_STRINGS.ERRORS.UPDATE_NAME_FAILED);
    }
  };

  const handleBulkOperationsSuccess = () => {
    handleClearSelection();
    onRefresh?.();
  };

  const [plainTextCopied, setPlainTextCopied] = useState(false);

  const handleCopyPlainText = useCallback(() => {
    const plainText = selectedAssets
      .map(p => `${p.name} ${getAssetId(p)}`)
      .join('\n');
    
    navigator.clipboard.writeText(plainText).then(() => {
      setPlainTextCopied(true);
      setTimeout(() => setPlainTextCopied(false), 2000);
    });
  }, [selectedAssets]);

  if (assets.length === 0) {
    return (
      <div className="empty-state">
        {assetType === 'product' ? UI_STRINGS.EMPTY_STATES.NO_PRODUCTS : 'No Game Passes found.'}
      </div>
    );
  }

  return (
    <div className="product-container">
      <div className="controls">
        <ProductSearch value={searchTerm} onChange={setSearchTerm} />
        <SortControls 
          sortField={sortField} 
          sortDirection={sortDirection} 
          onSort={handleSort} 
        />
      </div>

      {displayAssets.length > 0 && (
        <>
          <div className="product-list-header">
            <label className="select-all-checkbox header-checkbox">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = someSelected;
                  }
                }}
                onChange={handleSelectAll}
              />
              <span className="header-label">{assetType === 'product' ? 'Developer Products' : 'Game Passes'}</span>
            </label>
          </div>

          {selectedIds.size > 0 && (
            <div className="bulk-actions">
              <div className="bulk-actions-content">
                <span className="selection-info">{selectedIds.size} selected</span>
                <div className="bulk-actions-buttons">
                  <button
                    className="btn btn-primary btn-bulk-operations"
                    onClick={() => setIsBulkOperationsModalOpen(true)}
                  >
                    Bulk Operations
                  </button>
                  <button
                    className={`btn btn-copy-plain ${plainTextCopied ? 'copied' : ''}`}
                    onClick={handleCopyPlainText}
                    title="Copy as plain text"
                  >
                    {plainTextCopied ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-secondary btn-clear-selection"
                    onClick={handleClearSelection}
                    title="Clear Selection"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="product-list">
        {displayAssets.length > 0 ? (
          displayAssets.map((asset) => {
            const id = getAssetId(asset);
            const iconId = 'productId' in asset ? asset.iconImageAssetId : asset.iconAssetId;
            return (
              <AssetCard
                key={id}
                asset={asset}
                thumbnail={iconId ? thumbnails[iconId] : undefined}
                onCopyId={copy}
                copiedId={copiedValue}
                onPriceUpdate={handlePriceUpdate}
                onNameUpdate={handleNameUpdate}
                onRegionalPricingToggle={handleRegionalPricingToggle}
                isEditing={editingId === id}
                onEditStart={() => setEditingId(id)}
                onEditEnd={() => setEditingId(null)}
                isSelected={selectedIds.has(id)}
                onToggleSelection={handleToggleSelection}
                universeId={universeId}
              />
            );
          })
        ) : (
          <div className="no-results">{UI_STRINGS.EMPTY_STATES.NO_RESULTS}</div>
        )}
      </div>

      <BulkOperationsModal
        isOpen={isBulkOperationsModalOpen}
        onClose={() => setIsBulkOperationsModalOpen(false)}
        selectedAssets={selectedAssets}
        onSuccess={handleBulkOperationsSuccess}
        assetType={assetType}
        universeId={universeId}
      />
    </div>
  );
}
