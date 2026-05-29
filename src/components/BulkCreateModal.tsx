import { useState, useRef, useEffect } from 'react';
import type { BulkProductRow } from '../types';
import { ProductRow } from './ProductRow';
import { ConfirmModal } from './ConfirmModal';
import { useBulkCreate } from '../hooks/useBulkCreate';
import { createDeveloperProductsBatch, createGamePassesBatch } from '../api/roblox';
import { parseJsonToProducts, downloadJson, generateJsonTemplate } from '../utils/json';
import { findDuplicateNames, hasValidContent, validateRow } from '../utils/validation';
import { clearBulkDraft } from '../utils/localStorage';
import { UI_STRINGS } from '../constants/strings';
import '../styles/components/bulk-create-modal.css';

interface BulkCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  universeId: string;
  onSuccess: () => void;
  assetType?: 'product' | 'gamepass';
}

export function BulkCreateModal({ isOpen, onClose, universeId, onSuccess, assetType = 'product' }: BulkCreateModalProps) {

  const {
    products,
    addRow,
    removeRow,
    removeRows,
    updateRow,
    clearAll,
    importProducts,
    updateRowStatus,
    loadDraft,
  } = useBulkCreate(universeId, assetType);

  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'info' | 'warning' | 'danger';
    showCancel?: boolean;
    confirmText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoadDraft = () => {
    const count = loadDraft();
    if (count > 0) {
      setShowDraftBanner(false);
      setError(null);
    } else {
      setError('No saved draft found');
    }
  };

  const handleClearDraft = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Draft',
      message: UI_STRINGS.MESSAGES.CONFIRM_CLEAR_DRAFT,
      type: 'warning',
      onConfirm: () => {
        clearBulkDraft(universeId, assetType);
        setShowDraftBanner(false);
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  const handleClearAll = () => {
    setConfirmModal({
      isOpen: true,
      title: `Clear All ${assetType === 'gamepass' ? 'Game Passes' : 'Products'}`,
      message: UI_STRINGS.MESSAGES.CONFIRM_CLEAR_ALL.replace('products', assetType === 'gamepass' ? 'game passes' : 'products'),
      type: 'warning',
      onConfirm: () => {
        clearAll();
        setError(null);
        setConfirmModal({ ...confirmModal, isOpen: false });
      },
    });
  };

  const handleImportJson = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedProducts = parseJsonToProducts(text);
      importProducts(importedProducts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : UI_STRINGS.ERRORS.INVALID_JSON);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  const handleDownloadTemplate = () => {
    const template = generateJsonTemplate(assetType);
    const filename = assetType === 'gamepass' ? 'gamepasses_template.json' : 'devproducts_template.json';
    downloadJson(template, filename);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nonEmptyProducts = products.filter(hasValidContent);
    
    if (nonEmptyProducts.length === 0) {
      setError(UI_STRINGS.ERRORS.EMPTY_PRODUCTS);
      return;
    }

    const validatedProducts = nonEmptyProducts.map(row => ({
      ...row,
      validationErrors: validateRow(row, assetType),
    }));

    const hasErrors = validatedProducts.some(
      row => Object.keys(row.validationErrors).length > 0
    );

    if (hasErrors) {
      const newProducts = products.map(p => {
        const validated = validatedProducts.find(vp => vp.id === p.id);
        return validated || p;
      });
      importProducts(newProducts);
      setError(UI_STRINGS.ERRORS.VALIDATION_FAILED);
      return;
    }

    const duplicates = findDuplicateNames(validatedProducts);
    if (duplicates.length > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Duplicate Names Detected',
        message: `${UI_STRINGS.ERRORS.DUPLICATE_NAMES}: ${duplicates.join(', ')}. Continue anyway?`,
        type: 'warning',
        onConfirm: () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          proceedWithCreation(validatedProducts);
        },
      });
      return;
    }

    proceedWithCreation(validatedProducts);
  };

  const proceedWithCreation = async (validatedProducts: BulkProductRow[]) => {
    setIsCreating(true);
    setProgress({ current: 0, total: validatedProducts.length });

    try {
      const productsToCreate = validatedProducts.map(p => {
        // Developer products are always for sale; only game passes can be offsale.
        const forSale = assetType === 'product' || p.isForSale;
        return {
          name: p.name.trim(),
          description: p.description.trim(),
          priceInRobux: forSale ? parseInt(p.price, 10) : null,
          isRegionalPricingEnabled: forSale && p.isRegionalPricingEnabled,
        };
      });

      validatedProducts.forEach(p => updateRowStatus(p.id, 'creating'));

      let result;
      if (assetType === 'gamepass') {
        const gamePassesToCreate = productsToCreate.map(p => ({
          name: p.name,
          description: p.description,
          price: p.priceInRobux ?? undefined,
          isRegionalPricingEnabled: p.isRegionalPricingEnabled
        }));
        
        const batchResult = await createGamePassesBatch(
          universeId,
          gamePassesToCreate,
          (current, total) => setProgress({ current, total })
        );
        
        result = {
            ...batchResult,
            results: batchResult.results.map(r => ({
                ...r,
                product: r.gamePass
            }))
        };
      } else {
        result = await createDeveloperProductsBatch(
          universeId,
          productsToCreate,
          (current, total) => setProgress({ current, total })
        );
      }

      const successfulIds: string[] = [];
      
      result.results.forEach((res) => {
        const product = validatedProducts[res.index];
        if (res.success) {
          successfulIds.push(product.id);
        } else {
          updateRowStatus(product.id, 'error', res.error);
        }
      });

      if (successfulIds.length > 0) {
        removeRows(successfulIds);
      }

      if (result.failed === 0) {
        setIsSuccess(true);
        clearAll();
        clearBulkDraft(universeId, assetType);
        setConfirmModal({
          isOpen: true,
          title: 'Success',
          message: UI_STRINGS.MESSAGES.BULK_CREATE_SUCCESS
            .replace('{count}', result.successful.toString())
            .replace('product(s)', assetType === 'gamepass' ? 'game pass(es)' : 'product(s)'),
          type: 'info',
          showCancel: false,
          confirmText: 'OK',
          onConfirm: () => {
            setConfirmModal({ ...confirmModal, isOpen: false });
            onSuccess();
            onClose();
          },
        });
      } else {
        setConfirmModal({
          isOpen: true,
          title: 'Partial Success',
          message: UI_STRINGS.MESSAGES.BULK_CREATE_PARTIAL
            .replace('{successful}', result.successful.toString())
            .replace('{failed}', result.failed.toString()),
          type: 'warning',
          onConfirm: () => {
            setConfirmModal({ ...confirmModal, isOpen: false });
          },
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create products');
    } finally {
      setIsCreating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleClose = () => {
    if (isCreating) {
      setConfirmModal({
        isOpen: true,
        title: 'Close Window',
        message: `${assetType === 'gamepass' ? 'Game Passes' : 'Products'} are being created. Are you sure you want to close?`,
        type: 'warning',
        onConfirm: () => {
          setConfirmModal({ ...confirmModal, isOpen: false });
          onClose();
        },
      });
      return;
    }
    onClose();
  };

  const validProductCount = products.filter(hasValidContent).length;
  const hasValidationErrors = products.some(p => hasValidContent(p) && Object.keys(p.validationErrors).length > 0);
  const hasEmptyRows = products.some(p => !hasValidContent(p));

  if (isSuccess && confirmModal.isOpen) {
    return (
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        showCancel={confirmModal.showCancel}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    );
  }

  return (
    <div className="modal-overlay bulk-create-overlay" onClick={handleClose}>
      <div className="modal-content bulk-create-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header bulk-create-header">
          <div>
            <h2>Bulk Create {assetType === 'gamepass' ? 'Game Passes' : 'Developer Products'}</h2>
            <p className="subtitle">{validProductCount} {assetType === 'gamepass' ? 'game pass(es)' : 'product(s)'} ready</p>
          </div>

          <button className="modal-close-btn" onClick={handleClose} disabled={isCreating}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {showDraftBanner && (
          <div className="draft-banner">
            <span>You have a saved draft.</span>
            <button type="button" onClick={handleLoadDraft} className="btn-link">
              {UI_STRINGS.BUTTONS.LOAD_DRAFT}
            </button>
            <button type="button" onClick={handleClearDraft} className="btn-link">
              {UI_STRINGS.BUTTONS.CLEAR_DRAFT}
            </button>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {isCreating && (
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

        <div className="toolbar">
          <div className="toolbar-left">
            <button
              type="button"
              onClick={handleClearAll}
              className="btn btn-secondary"
              disabled={isCreating}
            >
              {UI_STRINGS.BUTTONS.CLEAR_ALL}
            </button>
          </div>

          <div className="toolbar-right">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="btn btn-secondary"
              title="Download JSON template"
            >
              📄 {UI_STRINGS.BUTTONS.DOWNLOAD_TEMPLATE}
            </button>
            <button
              type="button"
              onClick={handleImportJson}
              className="btn btn-secondary"
              disabled={isCreating}
              title={UI_STRINGS.TOOLTIPS.IMPORT_JSON}
            >
              📥 {UI_STRINGS.BUTTONS.IMPORT_JSON}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bulk-create-form">
          <div className="table-container">
            <table className="bulk-create-table">
              <thead>
                <tr>
                  <th className="col-number">#</th>
                  <th className="col-name">Name *</th>
                  <th className="col-description">Description</th>
                  <th className="col-price">Price (Robux)</th>
                  <th className="col-forsale">For Sale</th>
                  <th className="col-regional">Regional</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((row, index) => (
                  <ProductRow
                    key={row.id}
                    row={row}
                    rowNumber={index + 1}
                    onUpdate={updateRow}
                    onRemove={removeRow}
                    assetType={assetType}
                  />
                ))}
              </tbody>
            </table>
            
            <div className="add-row-container">
              <button
                type="button"
                onClick={addRow}
                className="btn btn-dashed btn-add-row"
                disabled={isCreating}
                title={UI_STRINGS.TOOLTIPS.ADD_ROW}
              >
                + {UI_STRINGS.BUTTONS.ADD_ROW}
              </button>
            </div>
          </div>

          {products.length === 0 && (
            <div className="empty-state">
              {UI_STRINGS.EMPTY_STATES.NO_BULK_PRODUCTS.replace('products', assetType === 'gamepass' ? 'game passes' : 'products')}
            </div>
          )}

          <div className="modal-actions bulk-create-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreating || validProductCount === 0 || hasValidationErrors || hasEmptyRows}
            >
              {isCreating
                ? (assetType === 'gamepass' ? 'Creating game passes...' : UI_STRINGS.STATUS.CREATING)
                : `${UI_STRINGS.BUTTONS.CREATE_ALL} (${validProductCount})`}
            </button>
          </div>
        </form>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          showCancel={confirmModal.showCancel}
          confirmText={confirmModal.confirmText}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        />
      </div>
    </div>
  );
}
