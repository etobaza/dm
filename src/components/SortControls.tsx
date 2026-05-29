import { SortField, SortDirection } from '../utils/sorting';

interface SortControlsProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}
import { SortButton } from './SortButton';

export function SortControls({ sortField, sortDirection, onSort }: SortControlsProps) {
  return (
    <div className="filter-group">
      <SortButton 
        field="name" 
        label="Name" 
        currentField={sortField} 
        currentDirection={sortDirection} 
        onClick={onSort} 
      />
      <SortButton 
        field="price" 
        label="Price" 
        currentField={sortField} 
        currentDirection={sortDirection} 
        onClick={onSort} 
      />
      <SortButton 
        field="created" 
        label="Created" 
        currentField={sortField} 
        currentDirection={sortDirection} 
        onClick={onSort} 
      />
      <SortButton 
        field="updated" 
        label="Updated" 
        currentField={sortField} 
        currentDirection={sortDirection} 
        onClick={onSort} 
      />
    </div>
  );
}
