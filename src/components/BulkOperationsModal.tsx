import { useState } from 'react';
import type { UnifiedAsset, DeveloperProduct, GamePass } from '../types';
import { getAssetPrice, isAssetOffsale, getAssetId, getAssetName, isAssetRegionalPricingEnabled } from '../types';
import { updateDeveloperProductPrice, updateGamePass } from '../api/roblox';
import { RobuxIcon } from './RobuxIcon';
import { CustomDropdown } from './CustomDropdown';
import { MAX_PRICE_ROBUX } from '../constants';
import { sleep } from '../utils';
import '../styles/components/bulk-operations-modal.css';

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAssets: UnifiedAsset[];
  onSuccess: () => void;
  assetType: 'product' | 'gamepass';
  universeId?: string;
}


type OperationType = 'multiply' | 'add' | 'set' | 'prefix' | 'suffix' | 'remove-prefix' | 'remove-suffix';

interface OperationResult {
  productId: number;
  productName: string;
  success: boolean;
  error?: string;
}

export function BulkOperationsModal({
  isOpen,
  onClose,
  selectedAssets,
  onSuccess,
  assetType,
  universeId,
}: BulkOperationsModalProps) {

  const [operationType, setOperationType] = useState<OperationType>('multiply');
  const [priceValue, setPriceValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<OperationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!isProcessing) {
      setOperationType('multiply');
      setPriceValue('');
      setTextValue('');
      setResults([]);
      setShowResults(false);
      setError(null);
      onClose();
    }
  };

  const calculateNewPrice = (currentPrice: number | null): number | null => {
    if (currentPrice === null) {
      if (operationType === 'set') {
        const value = parseFloat(priceValue);
        return isNaN(value) ? null : Math.max(0, Math.round(value));
      }
      return null;
    }

    const value = parseFloat(priceValue);
    if (isNaN(value)) return currentPrice;

    switch (operationType) {
      case 'multiply':
        return Math.max(0, Math.round(currentPrice * value));
      case 'add':
        return Math.max(0, Math.round(currentPrice + value));
      case 'set':
        return Math.max(0, Math.round(value));
      default:
        return currentPrice;
    }
  };

  const calculateNewName = (currentName: string): string => {
    switch (operationType) {
      case 'prefix':
        return textValue + currentName;
      case 'suffix':
        return currentName + textValue;
      case 'remove-prefix': {
        const trimmedText = textValue.trim();
        if (currentName.startsWith(textValue)) {
          return currentName.slice(textValue.length);
        }
        if (currentName.startsWith(trimmedText + ' ')) {
          return currentName.slice(trimmedText.length + 1);
        }
        if (currentName.startsWith(trimmedText)) {
          return currentName.slice(trimmedText.length);
        }
        return currentName;
      }
      case 'remove-suffix': {
        const trimmedText = textValue.trim();
        if (currentName.endsWith(textValue)) {
          return currentName.slice(0, -textValue.length);
        }
        if (currentName.endsWith(' ' + trimmedText)) {
          return currentName.slice(0, -(trimmedText.length + 1));
        }
        if (currentName.endsWith(trimmedText)) {
          return currentName.slice(0, -trimmedText.length);
        }
        return currentName;
      }
      default:
        return currentName;
    }
  };

  const validateOperation = (): string | null => {
    if (['multiply', 'add', 'set'].includes(operationType)) {
      if (!priceValue || priceValue.trim() === '') {
        return 'Please enter a value';
      }
      const value = parseFloat(priceValue);
      if (isNaN(value)) {
        return 'Please enter a valid number';
      }
      if (operationType === 'multiply' && value <= 0) {
        return 'Multiplier must be greater than 0';
      }
      if (operationType === 'set' && value < 0) {
        return 'Price cannot be negative';
      }
      if (operationType === 'set' && value > MAX_PRICE_ROBUX) {
        return 'Price cannot exceed 1,000,000,000 Robux';
      }
      const offsaleCount = selectedAssets.filter(p => isAssetOffsale(p)).length;
      if (offsaleCount === selectedAssets.length) {
        return 'All selected items are offsale. Price operations are skipped for offsale items.';
      }

    } else if (['prefix', 'suffix'].includes(operationType)) {
      if (!textValue || textValue.trim() === '') {
        return 'Please enter text to add';
      }

      for (const asset of selectedAssets) {
        const newName = calculateNewName(getAssetName(asset));
        if (newName.length > 50) {
          return `Name "${getAssetName(asset)}" would exceed 50 characters`;
        }
        if (newName.length < 3) {
          return `Name "${getAssetName(asset)}" would be too short (min 3 characters)`;
        }
      }

    } else if (['remove-prefix', 'remove-suffix'].includes(operationType)) {
      if (!textValue || textValue.trim() === '') {
        return 'Please enter text to remove';
      }

      const trimmedText = textValue.trim();
      let matchCount = 0;

      for (const asset of selectedAssets) {
        const name = getAssetName(asset);
        let hasMatch = false;

        if (operationType === 'remove-prefix') {
          hasMatch = name.startsWith(textValue) || 
                     name.startsWith(trimmedText + ' ') || 
                     name.startsWith(trimmedText);
        } else {
          hasMatch = name.endsWith(textValue) || 
                     name.endsWith(' ' + trimmedText) || 
                     name.endsWith(trimmedText);
        }

        if (hasMatch) {
          matchCount++;
          const newName = calculateNewName(name);
          if (newName.length < 3) {
            return `Name "${name}" would be too short after removal (min 3 characters)`;
          }
        }
      }

      if (matchCount === 0) {
        return `No items have "${trimmedText}" as a ${operationType === 'remove-prefix' ? 'prefix' : 'suffix'}`;
      }

    }
    return null;
  };

  const handleApply = async () => {
    const validationError = validateOperation();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgress({ current: 0, total: selectedAssets.length });
    const operationResults: (OperationResult | undefined)[] = new Array(selectedAssets.length);

    const concurrency = 3;
    const delayBetweenBatches = 500;
    const batches: Array<Array<{ asset: UnifiedAsset; index: number }>> = [];
    
    for (let i = 0; i < selectedAssets.length; i += concurrency) {
      const batch = selectedAssets.slice(i, i + concurrency).map((asset, batchIndex) => ({
        asset,
        index: i + batchIndex,
      }));
      batches.push(batch);
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const promises = batch.map(async ({ asset, index }) => {
        try {
          const currentPrice = getAssetPrice(asset);
          const offsale = isAssetOffsale(asset);
          const isPriceOperation = ['multiply', 'add', 'set'].includes(operationType);
          const isNameOperation = ['prefix', 'suffix', 'remove-prefix', 'remove-suffix'].includes(operationType);

          if (isPriceOperation && offsale) {
            return {
              index,
              result: {
                productId: getAssetId(asset),
                productName: getAssetName(asset),
                success: false,
                error: 'Skipped: item is offsale',
              } as OperationResult,
            };
          }

          const newPrice = isPriceOperation
            ? calculateNewPrice(currentPrice)
            : (offsale ? null : currentPrice);
          const newName = isNameOperation
            ? calculateNewName(getAssetName(asset))
            : getAssetName(asset);

          if (assetType === 'product') {
            const product = asset as DeveloperProduct;
            await updateDeveloperProductPrice(
              product.universeId.toString(),
              product.productId.toString(),
              {
                name: newName,
                description: product.description,
                priceInRobux: newPrice,
                storePageEnabled: product.storePageEnabled,
                isRegionalPricingEnabled: isAssetRegionalPricingEnabled(asset),
              }
            );
          } else {
            const gamePass = asset as GamePass;
            if (!universeId) throw new Error('Universe ID is required');

            await updateGamePass({
                gamePassId: gamePass.gamePassId,
                universeId,
                isForSale: newPrice !== null,
                price: newPrice ?? undefined,
                isRegionalPricingEnabled: isAssetRegionalPricingEnabled(asset),
                name: newName
            });
          }

          return {
            index,
            result: {
              productId: getAssetId(asset),
              productName: getAssetName(asset),
              success: true,
            } as OperationResult,
          };

        } catch (error) {
          return {
            index,
            result: {
              productId: getAssetId(asset),
              productName: getAssetName(asset),
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            } as OperationResult,

          };
        }
      });

      const batchResults = await Promise.allSettled(promises);
      batchResults.forEach((settled) => {
        if (settled.status === 'fulfilled') {
          operationResults[settled.value.index] = settled.value.result;
          const completed = operationResults.filter(r => r !== undefined).length;
          setProgress({ current: completed, total: selectedAssets.length });

        }
      });

      if (batchIndex < batches.length - 1) {
        await sleep(delayBetweenBatches);
      }
    }

    const sortedResults = operationResults.filter((r): r is OperationResult => r !== undefined);
    setResults(sortedResults);
    setShowResults(true);
    setIsProcessing(false);
  };

  const getOperationPreview = (): string => {
    if (selectedAssets.length === 0) return 'No items selected';


    const isPriceOperation = ['multiply', 'add', 'set'].includes(operationType);

    if (isPriceOperation) {
      const forSaleAsset = selectedAssets.find(p => !isAssetOffsale(p));
      if (!forSaleAsset) {
        return 'All selected items are offsale (will be skipped)';
      }
      const currentPrice = getAssetPrice(forSaleAsset);

      const newPrice = calculateNewPrice(currentPrice);
      const currentDisplay = currentPrice === null ? 'Offsale' : currentPrice.toString();
      const newDisplay = newPrice === null ? 'Offsale' : newPrice.toString();
      return `Example: ${currentDisplay} → ${newDisplay}`;
    } else {
      const asset = selectedAssets[0];
      let previewAsset = asset;
      if (['remove-prefix', 'remove-suffix'].includes(operationType) && textValue.trim()) {
        const trimmedText = textValue.trim();
        const matchingAsset = selectedAssets.find((p) => {
          const name = getAssetName(p);
          if (operationType === 'remove-prefix') {
            return name.startsWith(textValue) || 
                   name.startsWith(trimmedText + ' ') || 
                   name.startsWith(trimmedText);
          } else {
            return name.endsWith(textValue) || 
                   name.endsWith(' ' + trimmedText) || 
                   name.endsWith(trimmedText);
          }
        });
        if (matchingAsset) previewAsset = matchingAsset;
      }
      
      const currentName = getAssetName(previewAsset);

      const newName = calculateNewName(currentName);
      
      if (currentName === newName && ['remove-prefix', 'remove-suffix'].includes(operationType)) {
        return `No match found in "${currentName}"`;
      }
      
      return `Example: "${currentName}" → "${newName}"`;
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content bulk-operations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bulk Operations</h2>
          <button className="modal-close-btn" onClick={handleClose} disabled={isProcessing}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {isProcessing && (
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <span className="progress-text">
              {progress.current} / {progress.total}
            </span>
          </div>
        )}

        <div className="modal-body">
          {!showResults ? (
            <>

              <div className="operation-selector">
                <label>Operation Type:</label>
                <CustomDropdown
                  value={operationType}
                  onChange={(value) => setOperationType(value as OperationType)}
                  options={[
                    {
                      label: 'Price Operations',
                      options: [
                        { value: 'multiply', label: 'Multiply Price' },
                        { value: 'add', label: 'Add to Price' },
                        { value: 'set', label: 'Set Price' },
                      ],
                    },
                    {
                      label: 'Name Operations',
                      options: [
                        { value: 'prefix', label: 'Add Prefix to Name' },
                        { value: 'suffix', label: 'Add Suffix to Name' },
                        { value: 'remove-prefix', label: 'Remove Prefix from Name' },
                        { value: 'remove-suffix', label: 'Remove Suffix from Name' },
                      ],
                    },
                  ]}
                />
              </div>

              <div className="operation-input">
                {['multiply', 'add', 'set'].includes(operationType) ? (
                  <div className="input-group">
                    <label>
                      {operationType === 'multiply' && 'Multiply by:'}
                      {operationType === 'add' && 'Add amount:'}
                      {operationType === 'set' && 'New price:'}
                    </label>
                    <input
                      type="number"
                      value={priceValue}
                      onChange={(e) => {
                        setPriceValue(e.target.value);
                        setError(null);
                      }}
                      placeholder={
                        operationType === 'multiply'
                          ? '2'
                          : operationType === 'add'
                          ? '100'
                          : '500'
                      }
                      step={operationType === 'multiply' ? '0.1' : '1'}
                      min={operationType === 'multiply' ? '0.01' : '0'}
                      className="bulk-input"
                    />
                  </div>
                ) : (
                  <div className="input-group">
                    <label>
                      {operationType === 'prefix' && 'Prefix text:'}
                      {operationType === 'suffix' && 'Suffix text:'}
                      {operationType === 'remove-prefix' && 'Prefix to remove:'}
                      {operationType === 'remove-suffix' && 'Suffix to remove:'}
                    </label>
                    <input
                      type="text"
                      value={textValue}
                      onChange={(e) => {
                        setTextValue(e.target.value);
                        setError(null);
                      }}
                      placeholder={
                        operationType === 'prefix' ? '[SALE] ' : 
                        operationType === 'suffix' ? ' (Limited)' :
                        operationType === 'remove-prefix' ? '[SALE] ' : ' (Limited)'
                      }
                      maxLength={30}
                      className="bulk-input"
                    />
                  </div>
                )}
              </div>

              <div className="operation-preview">
                <strong>Preview</strong>
                <div className="preview-text">
                  {getOperationPreview()}
                  {['multiply', 'add', 'set'].includes(operationType) && <RobuxIcon className="robux-icon-preview" />}
                </div>
                {['multiply', 'add', 'set'].includes(operationType) && (
                  <div className="preview-match-count">
                    {(() => {
                      const offsaleCount = selectedAssets.filter(p => isAssetOffsale(p)).length;
                      const forSaleCount = selectedAssets.length - offsaleCount;
                      if (offsaleCount > 0) {
                        return `${forSaleCount} of ${selectedAssets.length} items will be affected (${offsaleCount} offsale skipped)`;
                      }
                      return `${forSaleCount} items will be affected`;
                    })()}
                  </div>

                )}
                {['remove-prefix', 'remove-suffix'].includes(operationType) && textValue.trim() && (
                  <div className="preview-match-count">
                    {(() => {
                      const trimmedText = textValue.trim();
                      const matchCount = selectedAssets.filter((p) => {
                        const name = getAssetName(p);
                        if (operationType === 'remove-prefix') {
                          return name.startsWith(textValue) || 
                                 name.startsWith(trimmedText + ' ') || 
                                 name.startsWith(trimmedText);
                        } else {
                          return name.endsWith(textValue) || 
                                 name.endsWith(' ' + trimmedText) || 
                                 name.endsWith(trimmedText);
                        }
                      }).length;
                      return `${matchCount} of ${selectedAssets.length} items will be affected`;
                    })()}
                  </div>

                )}
              </div>

              <div className="selected-products-list">
                <div className="list-header">
                  <strong>Selected Items</strong>
                  <span className="list-count">{selectedAssets.length} selected</span>
                </div>

                <div className="products-scroll">
                  {selectedAssets.map((asset) => {
                    const price = getAssetPrice(asset);
                    const offsale = isAssetOffsale(asset);
                    return (
                      <div key={getAssetId(asset)} className="selected-product-item">
                        <span className="product-name">{getAssetName(asset)}</span>
                        <span className="product-price">
                          {offsale ? (
                            <span className="offsale-text">Offsale</span>
                          ) : (
                            <>
                              {price}
                              <RobuxIcon className="robux-icon-list" />
                            </>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
            </>
          ) : (
            <div className="results-container">
              <div className="results-summary">
                <h3>Operation Results</h3>
                <p>
                  {successCount > 0 && (
                    <span className="success-text">✓ {successCount} succeeded</span>
                  )}
                  {successCount > 0 && failCount > 0 && <span> • </span>}
                  {failCount > 0 && (
                    <span className="error-text">✗ {failCount} failed</span>
                  )}
                </p>
              </div>
              <div className="results-list">
                {results.map((result) => (
                  <div
                    key={result.productId}
                    className={`result-item ${result.success ? 'success' : 'error'}`}
                  >
                    <span className="result-icon">{result.success ? '✓' : '✗'}</span>
                    <span className="result-name">{result.productName}</span>
                    {result.error && (
                      <span className="result-error">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!showResults ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleApply}
                disabled={isProcessing || selectedAssets.length === 0}
              >
                {isProcessing ? 'Processing...' : 'Apply to All'}
              </button>

            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => {
                onSuccess();
                handleClose();
              }}
              disabled={isProcessing}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

