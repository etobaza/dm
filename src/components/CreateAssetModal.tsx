import { useState, useEffect } from 'react';
import { createDeveloperProduct, createGamePass } from '../api/roblox';
import { MAX_PRICE_ROBUX } from '../constants';


interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  universeId: string;
  onSuccess: () => void;
  assetType: 'product' | 'gamepass';
}

export function CreateAssetModal({ isOpen, onClose, universeId, onSuccess, assetType }: CreateAssetModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isRegionalPricingEnabled, setIsRegionalPricingEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGamePass = assetType === 'gamepass';
  const title = isGamePass ? 'Create Game Pass' : 'Create Developer Product';
  const nameLabel = isGamePass ? 'Game Pass Name' : 'Product Name';
  const descriptionPlaceholder = 'Description (optional)'; 
  const submitButtonText = isSubmitting ? 'Creating...' : (isGamePass ? 'Create Game Pass' : 'Create Product');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setPrice('');
      setIsRegionalPricingEnabled(true);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!name.trim()) {
        throw new Error(`${isGamePass ? 'Game Pass' : 'Product'} name is required`);
      }

      const trimmedPrice = price.trim();
      let priceValue: number | null = null;

      if (trimmedPrice !== '') {
        const priceNum = parseInt(trimmedPrice, 10);
        if (isNaN(priceNum) || priceNum < 0) {
          throw new Error(
            isGamePass
              ? 'Please enter a valid price (or leave empty for offsale)'
              : 'Please enter a valid price'
          );
        }
        if (priceNum > MAX_PRICE_ROBUX) {
          throw new Error('Price cannot exceed 1,000,000,000 Robux');
        }
        priceValue = priceNum;
      }

      // Developer products cannot be offsale — they must have a price.
      if (!isGamePass && priceValue === null) {
        throw new Error('Developer products require a price (they cannot be offsale).');
      }

      if (isGamePass) {
        await createGamePass(universeId, {
          name,
          description,
          universeId,
          price: priceValue ?? undefined,
          isRegionalPricingEnabled
        });
      } else {
        await createDeveloperProduct(universeId, {
          name,
          description,
          priceInRobux: priceValue,
          isRegionalPricingEnabled,
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to create ${isGamePass ? 'game pass' : 'product'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="asset-name">Name</label>
            <input
              id="asset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={nameLabel}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="asset-description">Description</label>
            <textarea
              id="asset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={descriptionPlaceholder}
            />
          </div>

          <div className="form-group">
            <label htmlFor="asset-price">Price (Robux){isGamePass ? '' : ' *'}</label>
            <input
              id="asset-price"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={isGamePass ? 'Empty = Offsale' : 'Required'}
            />
          </div>

          <div className="form-group checkbox-group">
            <input
              id="asset-regional-pricing"
              type="checkbox"
              checked={isRegionalPricingEnabled}
              onChange={(e) => setIsRegionalPricingEnabled(e.target.checked)}
            />
            <label htmlFor="asset-regional-pricing">Enable Regional Pricing</label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
