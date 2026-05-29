type SortField = 'price' | 'name' | 'created' | 'updated';
type SortDirection = 'asc' | 'desc';

interface SortButtonProps {
  field: SortField;
  label: string;
  currentField: SortField;
  currentDirection: SortDirection;
  onClick: (field: SortField) => void;
}

export function SortButton({ 
  field, 
  label, 
  currentField, 
  currentDirection, 
  onClick 
}: SortButtonProps) {
  const isActive = currentField === field;
  
  return (
    <button 
      className={`filter-btn ${isActive ? 'active' : ''}`}
      onClick={() => onClick(field)}
    >
      {label}
      {isActive && (
        <span className="sort-arrow">{currentDirection === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );
}
