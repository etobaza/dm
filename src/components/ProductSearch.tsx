interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
}
import { SearchIcon } from './SearchIcon';

export function ProductSearch({ value, onChange }: ProductSearchProps) {
  return (
    <div className="search-wrapper">
      <SearchIcon className="search-icon" />
      <input
        type="text"
        placeholder="Search products..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input"
      />
    </div>
  );
}
