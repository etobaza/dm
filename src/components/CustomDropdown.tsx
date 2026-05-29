import { useState, useRef, useEffect } from 'react';
import '../styles/components/custom-dropdown.css';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownGroup {
  label: string;
  options: DropdownOption[];
}

interface CustomDropdownProps {
  value: string;
  options: DropdownGroup[];
  onChange: (value: string) => void;
  className?: string;
}

export function CustomDropdown({ value, options, onChange, className = '' }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options
    .flatMap(group => group.options)
    .find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`custom-dropdown ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="dropdown-value">{selectedOption?.label}</span>
        <svg
          className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1.5L6 6.5L11 1.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {options.map((group, groupIndex) => (
            <div key={groupIndex} className="dropdown-group">
              <div className="dropdown-group-label">{group.label}</div>
              {group.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`dropdown-option ${value === option.value ? 'selected' : ''}`}
                  onClick={() => handleOptionClick(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
