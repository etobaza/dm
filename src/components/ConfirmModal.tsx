import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/components/confirm-modal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'info' | 'warning' | 'danger';
  showCancel?: boolean;
  confirmOnEnter?: boolean;
  children?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'info',
  showCancel = true,
  confirmOnEnter = false,
  children,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen || !confirmOnEnter) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; 
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'Escape' && showCancel) {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmOnEnter, onConfirm, onCancel, showCancel]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  return createPortal(
    <div className="confirm-modal-overlay" onClick={showCancel ? handleCancel : undefined}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h2>{title}</h2>
        </div>
        
        <div className="confirm-modal-body">
          {message && <p>{message}</p>}
          {children}
        </div>

        <div className="confirm-modal-actions">
          {showCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
