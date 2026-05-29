import { useState, useEffect } from 'react';
import { ConfirmModal } from './ConfirmModal';
import '../styles/components/editable-name.css';

interface EditableNameProps {
  currentName: string;
  onNameChange: (newName: string) => Promise<void>;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
}

export function EditableName({ currentName, onNameChange, isEditing, onEditStart, onEditEnd }: EditableNameProps) {
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [inputValue, setInputValue] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = () => {
    if (!isLoading) {
      onEditStart();
      setIsEditingLocal(true);
      setInputValue(currentName);
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
    const newName = inputValue.trim();
    
    if (!newName) {
      setError('Name cannot be empty');
      return;
    }

    if (newName.length > 50) {
      setError('Name cannot be longer than 50 characters');
      return;
    }

    setError(null);

    if (newName === currentName) {
      handleCancel();
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    const newName = inputValue.trim();
    setIsLoading(true);
    setError(null);

    try {
      await onNameChange(newName);
      setIsEditingLocal(false);
      setShowConfirm(false);
      onEditEnd();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditingLocal(false);
    setShowConfirm(false);
    setInputValue(currentName);
    setError(null);
    onEditEnd();
  };

  useEffect(() => {
    if (!isEditing && (isEditingLocal || showConfirm)) {
      setIsEditingLocal(false);
      setShowConfirm(false);
      setInputValue(currentName);
      setError(null);
    }
  }, [isEditing, isEditingLocal, showConfirm, currentName]);

  return (
    <>
      {isEditingLocal ? (
        <input
          type="text"
          className="product-name-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            handleSubmit();
          }}
          autoFocus
          maxLength={50}
        />
      ) : (
        <span className="product-name-text editable" onClick={handleClick} title="Click to edit name">
          {currentName}
          <span className="edit-indicator-name">✎</span>
        </span>
      )}
      {error && !showConfirm && <span className="name-error-inline">{error}</span>}
      
      <ConfirmModal
        isOpen={showConfirm}
        title="Confirm Name Change"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText={isLoading ? 'Updating...' : 'Confirm'}
        type="info"
      >
        <div className="name-comparison">
          <div className="name-item">
            <span className="name-label">Current:</span>
            <div className="name-value">{currentName}</div>
          </div>
          <div className="name-arrow">→</div>
          <div className="name-item">
            <span className="name-label">New:</span>
            <div className="name-value name-new">{inputValue.trim()}</div>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
      </ConfirmModal>
    </>
  );
}
