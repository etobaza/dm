import { useState } from 'react';
import { UnifiedAsset } from '../types';
import { 
  getAssetId, 
  getAssetName, 
  getAssetPrice, 
  isAssetOffsale, 
  isAssetRegionalPricingEnabled 
} from '../types';
import { RobuxIcon } from './RobuxIcon';
import { ExternalLinkIcon } from './ExternalLinkIcon';
import { CopyIcon } from './CopyIcon';
import { GlobeIcon } from './Icons';
import { ImagePlaceholderIcon } from './ImagePlaceholderIcon';
import { EditablePrice } from './EditablePrice';
import { EditableName } from './EditableName';
import { formatDate } from '../utils/formatters';
import { config } from '../config';

export interface AssetCardProps {
  asset: UnifiedAsset;
  thumbnail?: string;
  onCopyId: (id: string) => void;
  copiedId: string | null;
  onPriceUpdate?: (id: number, newPrice: number | null) => Promise<void>;
  onNameUpdate?: (id: number, newName: string) => Promise<void>;
  onRegionalPricingToggle?: (id: number, enabled: boolean) => Promise<void>;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  isSelected: boolean;
  onToggleSelection: (id: number) => void;
  universeId?: string; // required for passes, optional for devproducts 
}

export function AssetCard({ 
  asset, 
  thumbnail, 
  onCopyId, 
  copiedId, 
  onPriceUpdate, 
  onNameUpdate, 
  onRegionalPricingToggle, 
  isEditing, 
  onEditStart, 
  onEditEnd, 
  isSelected, 
  onToggleSelection,
  universeId
}: AssetCardProps) {
  const [isRegionalToggling, setIsRegionalToggling] = useState(false);
  
  const assetId = getAssetId(asset);
  const assetName = getAssetName(asset);
  const currentPrice = getAssetPrice(asset);
  const offsale = isAssetOffsale(asset);
  const regionalPricingEnabled = isAssetRegionalPricingEnabled(asset);
  const isCopied = copiedId === assetId.toString();

  let productUrl = '#';
  if ('productId' in asset) {
    productUrl = `${config.ROBLOX_DASHBOARD_URL}/${asset.universeId}/developer-products/${assetId}/configure`;
  } else if (universeId) {
    productUrl = `${config.ROBLOX_DASHBOARD_URL}/${universeId}/passes/${assetId}/configure`;
  }

  return (
    <div className="product-card-wrapper">
      <div className={`product-card ${isSelected ? 'selected' : ''}`}>
        <div className="product-selection">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(assetId)}
            className="product-checkbox"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <a href={productUrl} target="_blank" rel="noopener noreferrer" className="product-icon-link" title="Open in Roblox Dashboard">
          <div className="product-icon-wrapper">
            {thumbnail ? (
              <img 
                src={thumbnail} 
                alt={assetName}
                className="product-icon"
              />
            ) : (
              <ImagePlaceholderIcon className="product-icon-placeholder" />
            )}
            <div className="product-icon-overlay">
              <ExternalLinkIcon className="external-link-icon" />
            </div>
          </div>
        </a>

        <div className="product-info">
          <h3 className="product-name">
            {onNameUpdate ? (
              <EditableName
                currentName={assetName}
                onNameChange={async (newName) => {
                  await onNameUpdate(assetId, newName);
                }}
                isEditing={isEditing}
                onEditStart={onEditStart}
                onEditEnd={onEditEnd}
              />
            ) : (
              assetName
            )}
          </h3>
          
          <div className="product-meta">
            <button 
              className="product-id-btn" 
              onClick={() => onCopyId(assetId.toString())}
              title="Click to copy ID"
            >
              <span className="id-label">ID:</span> 
              <span className="id-value">{assetId}</span>
              <CopyIcon className="copy-icon" />
              {isCopied && (
                <span className="copy-tooltip">Copied!</span>
              )}
            </button>
          </div>

          <div className="product-dates">
            <span title={new Date(asset.createdTimestamp).toLocaleString()}>
              Created: {formatDate(asset.createdTimestamp)}
            </span>
            <span className="date-divider" aria-hidden="true">•</span>
            <span title={new Date(asset.updatedTimestamp).toLocaleString()}>
              Updated: {formatDate(asset.updatedTimestamp)}
            </span>
          </div>
        </div>
        
        <div className="product-price-section">
          {onPriceUpdate ? (
            <EditablePrice
              currentPrice={currentPrice}
              isOffsale={offsale}
              onPriceChange={async (newPrice) => {
                await onPriceUpdate(assetId, newPrice);
              }}
              isEditing={isEditing}
              onEditStart={onEditStart}
              onEditEnd={onEditEnd}
            />
          ) : offsale ? (
            <div className="product-price offsale">
              <span>Offsale</span>
            </div>
          ) : (
            <div className="product-price">
              <RobuxIcon className="robux-icon" />
              <span>{currentPrice!.toLocaleString()}</span>
            </div>
          )}
          
          <div className="regional-pricing-toggle">
            <label 
              className={`toggle-switch ${isRegionalToggling ? 'toggling' : ''} ${offsale ? 'disabled' : ''}`}
              title={offsale ? 'Regional pricing not available for offsale items' : (regionalPricingEnabled ? 'Regional pricing enabled' : 'Regional pricing disabled')}
            >
              <input
                type="checkbox"
                checked={regionalPricingEnabled}
                disabled={isRegionalToggling || !onRegionalPricingToggle || offsale}
                onChange={async (e) => {
                  if (!onRegionalPricingToggle) return;
                  setIsRegionalToggling(true);
                  try {
                    await onRegionalPricingToggle(assetId, e.target.checked);
                  } finally {
                    setIsRegionalToggling(false);
                  }
                }}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="regional-label">
              <GlobeIcon className="globe-icon" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
