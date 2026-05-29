import type { BulkProductRow } from '../types';
import '../styles/components/product-row.css';

interface ProductRowProps {
  row: BulkProductRow;
  rowNumber: number;
  onUpdate: (id: string, updates: Partial<BulkProductRow>) => void;
  onRemove: (id: string) => void;
  assetType?: 'product' | 'gamepass';
}

export function ProductRow({ row, rowNumber, onUpdate, onRemove, assetType = 'product' }: ProductRowProps) {
  const hasErrors = Object.keys(row.validationErrors).length > 0;
  // Developer products can't be offsale — treat them as always for sale.
  const isProduct = assetType === 'product';
  const effectiveForSale = isProduct ? true : row.isForSale;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const form = e.currentTarget.closest('form');
      if (!form) return;
      
      const inputs = Array.from(form.querySelectorAll('input, textarea'));
      const currentIndex = inputs.indexOf(e.currentTarget as HTMLElement);
      
      if (currentIndex < inputs.length - 1) {
        (inputs[currentIndex + 1] as HTMLElement).focus();
      }
    }
  };

  return (
    <tr 
      className={`product-row ${row.status !== 'pending' ? `status-${row.status}` : ''} ${hasErrors ? 'has-errors' : ''}`}
      data-row-id={row.id}
    >
      <td className="row-number">{rowNumber}</td>
      
      <td className="field-cell">
        <input
          type="text"
          value={row.name}
          onChange={(e) => onUpdate(row.id, { name: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder={assetType === 'gamepass' ? "Game Pass Name" : "Product Name"}

          className={row.validationErrors.name ? 'error' : ''}
          disabled={row.status === 'creating' || row.status === 'success'}
        />
        {row.validationErrors.name && (
          <span className="error-text">{row.validationErrors.name}</span>
        )}
        {row.errorMessage && (
          <span className="error-text" title={row.errorMessage}>
            Error: {row.errorMessage}
          </span>
        )}
      </td>
      
      <td className="field-cell">
        <textarea
          value={row.description}
          onChange={(e) => onUpdate(row.id, { description: e.target.value })}
          placeholder="Description (optional)"
          rows={1}
          disabled={row.status === 'creating' || row.status === 'success'}
        />
      </td>
      
      <td className="field-cell">
        <input
          type="number"
          value={row.price}
          onChange={(e) => onUpdate(row.id, { price: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder={effectiveForSale ? "0" : "—"}
          min="0"
          className={row.validationErrors.price ? 'error' : ''}
          disabled={row.status === 'creating' || row.status === 'success' || !effectiveForSale}
        />
        {row.validationErrors.price && (
          <span className="error-text">{row.validationErrors.price}</span>
        )}
      </td>
      
      <td className="field-cell toggle-cell">
        <label
          className="toggle-switch-row"
          title={isProduct ? "Always on sale" : (row.isForSale ? "On sale" : "Offsale")}
        >
          <input
            type="checkbox"
            checked={effectiveForSale}
            onChange={(e) => onUpdate(row.id, {
              isForSale: e.target.checked,
              isRegionalPricingEnabled: e.target.checked ? row.isRegionalPricingEnabled : false
            })}
            disabled={row.status === 'creating' || row.status === 'success' || isProduct}
          />
          <span className="toggle-slider-row"></span>
        </label>
      </td>

      <td className="field-cell toggle-cell">
        <label className="toggle-switch-row">
          <input
            type="checkbox"
            checked={row.isRegionalPricingEnabled}
            onChange={(e) => onUpdate(row.id, { isRegionalPricingEnabled: e.target.checked })}
            disabled={row.status === 'creating' || row.status === 'success' || !effectiveForSale}
          />
          <span className="toggle-slider-row"></span>
        </label>
      </td>
      
      <td className="actions-cell">
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="icon-button btn-remove-row"
          disabled={row.status === 'creating' || row.status === 'success'}
          aria-label="Remove row"
          title="Remove row"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </td>
    </tr>
  );
}
