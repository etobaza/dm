import { useState, useRef, useEffect } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { RobuxIcon } from './RobuxIcon';
import { MAX_PRICE_ROBUX } from '../constants';
import '../styles/components/editable-price.css';

interface EditablePriceProps {
  currentPrice: number | null;
  isOffsale: boolean;
  onPriceChange: (newPrice: number | null) => Promise<void>;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
}

export function EditablePrice({ currentPrice, isOffsale, onPriceChange, isEditing, onEditStart, onEditEnd }: EditablePriceProps) {
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [inputValue, setInputValue] = useState(isOffsale ? '' : (currentPrice?.toString() ?? ''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const priceRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (!isLoading) {
      onEditStart();
      setIsEditingLocal(true);
      setInputValue(isOffsale ? '' : (currentPrice?.toString() ?? ''));
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleSubmit = () => {
    const trimmedValue = inputValue.trim();
    
    if (trimmedValue === '') {
      if (isOffsale && currentPrice === null) {
        handleCancel();
        return;
      }
      setError(null);
      setShowConfirm(true);
      return;
    }

    const newPrice = parseInt(trimmedValue, 10);
    
    if (isNaN(newPrice) || newPrice <= 0) {
      setError('Price must be a positive number (or empty for offsale)');
      return;
    }

    if (newPrice > MAX_PRICE_ROBUX) {
      setError('Price cannot exceed 1,000,000,000 Robux');
      return;
    }

    setError(null);

    if (newPrice === currentPrice && !isOffsale) {
      handleCancel();
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (isLoading) return; 
    const trimmedValue = inputValue.trim();
    const newPrice = trimmedValue === '' ? null : parseInt(trimmedValue, 10);
    setIsLoading(true);
    setError(null);

    try {
      await onPriceChange(newPrice);
      setIsEditingLocal(false);
      setShowConfirm(false);
      onEditEnd();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update price');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditingLocal(false);
    setShowConfirm(false);
    setInputValue(isOffsale ? '' : (currentPrice?.toString() ?? ''));
    setError(null);
    onEditEnd();
  };

  useEffect(() => {
    if (!isEditing && (isEditingLocal || showConfirm)) {
      setIsEditingLocal(false);
      setShowConfirm(false);
      setInputValue(isOffsale ? '' : (currentPrice?.toString() ?? ''));
      setError(null);
    }
  }, [isEditing, isEditingLocal, showConfirm, currentPrice, isOffsale]);

  useEffect(() => {
    if (!isEditingLocal && !showConfirm) {
      setInputValue(isOffsale ? '' : (currentPrice?.toString() ?? ''));
    }
  }, [currentPrice, isOffsale, isEditingLocal, showConfirm]);

  return (
    <>
      <div ref={priceRef} style={{ position: 'relative' }}>
        {isEditingLocal ? (
          <div className="product-price editing">
            <RobuxIcon className="robux-icon" />
            <input
              type="number"
              className="price-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSubmit}
              autoFocus
              min="0"
              step="1"
              placeholder="Offsale"
            />
            {error && !showConfirm && <div className="price-error">{error}</div>}
          </div>
        ) : isOffsale ? (
          <div  
            className="product-price editable offsale" 
            onClick={handleClick}
            title="Click to set price"
          >
            <span>Offsale</span>
            <span className="edit-indicator">✎</span>
          </div>
        ) : (
          <div  
            className="product-price editable" 
            onClick={handleClick}
            title="Click to edit price"
          >
            <RobuxIcon className="robux-icon" />
            <span>{currentPrice!.toLocaleString()}</span>
            <span className="edit-indicator">✎</span>
          </div>
        )}
      </div>
      
      <ConfirmModal
        isOpen={showConfirm}
        title={inputValue.trim() === '' ? 'Put Product Offsale?' : (isOffsale ? 'Put Product For Sale?' : 'Confirm Price Change')}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText={isLoading ? 'Updating...' : 'Confirm'}
        type={inputValue.trim() === '' ? 'warning' : 'info'}
        confirmOnEnter
      >
        <div className="price-comparison">
          <div className="price-item">
            <span className="price-label">Current:</span>
            <div className="price-value">
              {isOffsale ? (
                <span className="offsale-text">Offsale</span>
              ) : (
                <>
                  <RobuxIcon className="robux-icon" />
                  <span>{currentPrice!.toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
          <div className="price-arrow">→</div>
          <div className="price-item">
            <span className="price-label">New:</span>
            <div className="price-value price-new">
              {inputValue.trim() === '' ? (
                <span className="offsale-text">Offsale</span>
              ) : (
                <>
                  <RobuxIcon className="robux-icon" />
                  <span>{parseInt(inputValue, 10).toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
      </ConfirmModal>
    </>
  );
}
