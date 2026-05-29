import { useEffect, useState } from 'react';
import './styles/app.css';
import { UI_STRINGS } from './constants/strings';
import { AssetTable } from './components/AssetTable';
import { useProducts } from './hooks/useProducts';
import { useGamePasses } from './hooks/useGamePasses';
import { getActiveTabUrl } from './api/roblox';
import { CreateAssetModal } from './components/CreateAssetModal';
import { BulkCreateModal } from './components/BulkCreateModal';
import { exportAssetsToJson, downloadJson } from './utils/json';
import { LogoIcon } from './components/LogoIcon';
import { PlusIcon, BoxIcon, DownloadIcon, MaximizeIcon } from './components/Icons';

type ViewMode = 'products' | 'gamepasses';

export function App() {
  const { products, status: productStatus, error: productError, fetchProducts } = useProducts();
  const { gamePasses, status: gamePassStatus, error: gamePassError, fetchPasses } = useGamePasses();
  
  const [universeId, setUniverseId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('universeId');
  });
  
  const [viewMode, setViewMode] = useState<ViewMode>('products');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkCreateModalOpen, setIsBulkCreateModalOpen] = useState(false);

  useEffect(() => {
    if (universeId) {
      if (viewMode === 'products') {
        fetchProducts(universeId);
      } else {
        fetchPasses(universeId);
      }
    } else {
      getActiveTabUrl().then(url => {
        const pathMatch = url.match(/\/experiences\/(\d+)/);
        const id = pathMatch ? pathMatch[1] : null;
        
        if (id) {
          setUniverseId(id);
        }
      });
    }
  }, [universeId, viewMode, fetchProducts, fetchPasses]);

  const handleOpenFullScreen = () => {
    if (universeId) {
      const url = chrome.runtime.getURL(`index.html?universeId=${universeId}`);
      window.open(url, '_blank');
    }
  };

  const handleCreateSuccess = () => {
    if (universeId) {
      if (viewMode === 'products') {
        fetchProducts(universeId);
      } else {
        fetchPasses(universeId);
      }
    }
  };

  const handleExportJson = () => {
    if (viewMode === 'products' && products.length > 0) {
      const jsonContent = exportAssetsToJson(products);
      downloadJson(jsonContent, `products_${universeId || 'export'}.json`);
    } else if (viewMode === 'gamepasses' && gamePasses.length > 0) {
      const jsonContent = exportAssetsToJson(gamePasses);
      downloadJson(jsonContent, `gamepasses_${universeId || 'export'}.json`);
    }
  };

  const status = viewMode === 'products' ? productStatus : gamePassStatus;
  const error = viewMode === 'products' ? productError : gamePassError;

  return (
    <div className="app">
      <div className="app-header">
        <h2 className="app-title">
          <LogoIcon className="logo-icon" />
          {UI_STRINGS.APP_TITLE}
        </h2>
        
        {universeId && (
          <div className="view-switcher">
            <button 
              className={`btn-switch ${viewMode === 'products' ? 'active' : ''}`}
              onClick={() => setViewMode('products')}
            >
              Products
            </button>
            <button 
              className={`btn-switch ${viewMode === 'gamepasses' ? 'active' : ''}`}
              onClick={() => setViewMode('gamepasses')}
            >
              Game Passes
            </button>
          </div>
        )}

        <div className="app-header-actions">
          {universeId && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
              title={viewMode === 'products' ? UI_STRINGS.TOOLTIPS.CREATE_PRODUCT : "Create Game Pass"}
            >
              <PlusIcon /> {UI_STRINGS.BUTTONS.CREATE}
            </button>
          )}
          {universeId && window.location.search.includes('universeId') && (
            <button
              onClick={() => setIsBulkCreateModalOpen(true)}
              className="btn btn-secondary"
              title={UI_STRINGS.TOOLTIPS.BULK_CREATE}
            >
              <BoxIcon /> {UI_STRINGS.BUTTONS.BULK_CREATE}
            </button>
          )}
          {universeId && ((viewMode === 'products' && products.length > 0) || (viewMode === 'gamepasses' && gamePasses.length > 0)) && (
            <button
              onClick={handleExportJson}
              className="btn btn-secondary"
              title="Export to JSON"
            >
              <DownloadIcon /> Export JSON
            </button>
          )}
          {universeId && !window.location.search.includes('universeId') && (
            <button 
              onClick={handleOpenFullScreen} 
              className="btn btn-secondary" 
              title={UI_STRINGS.TOOLTIPS.FULL_SCREEN}
              aria-label={UI_STRINGS.TOOLTIPS.FULL_SCREEN}
            >
              <MaximizeIcon /> {UI_STRINGS.BUTTONS.FULL_SCREEN}
            </button>
          )}
        </div>
      </div>

      {status === 'error' && error && (
        <div className="status error">{error}</div>
      )}

      {status === 'loading' && (
        <div className="status loading">{UI_STRINGS.STATUS.LOADING}</div>
      )}

      {status === 'idle' && (
        <div className="status">{UI_STRINGS.STATUS.IDLE}</div>
      )}

      {viewMode === 'products' && products.length > 0 && (
        <AssetTable 
          assets={products} 
          onRefresh={() => universeId && fetchProducts(universeId)} 
          assetType="product"
          universeId={universeId ?? undefined}
        />
      )}

      {viewMode === 'gamepasses' && gamePasses.length > 0 && universeId && (
        <AssetTable 
          assets={gamePasses} 
          onRefresh={() => fetchPasses(universeId)} 
          universeId={universeId} 
          assetType="gamepass"
        />
      )}
      
      {viewMode === 'gamepasses' && gamePasses.length === 0 && status === 'success' && (
          <div className="empty-state">No Game Passes found.</div>
      )}

      {universeId && (
        <CreateAssetModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          universeId={universeId}
          onSuccess={handleCreateSuccess}
          assetType={viewMode === 'products' ? 'product' : 'gamepass'}
        />
      )}

      {universeId && (
        <BulkCreateModal
          isOpen={isBulkCreateModalOpen}
          onClose={() => setIsBulkCreateModalOpen(false)}
          universeId={universeId}
          onSuccess={handleCreateSuccess}
          assetType={viewMode === 'products' ? 'product' : 'gamepass'}
        />
      )}

    </div>
  );
}
