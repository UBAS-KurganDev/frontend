import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { CityOption } from '../../types/city';
import { cities } from '../../data/cities';
import styles from './CityAutocomplete.module.scss';

interface Props {
  label: string;
  value: CityOption | null;
  onChange: (city: CityOption | null) => void;
  placeholder?: string;
}

export function CityAutocomplete({
  label,
  value,
  onChange,
  placeholder = 'Город или код города (например, MOW)',
}: Props) {
  const inputId = useId();
  const listId = `${inputId}-cities`;
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const search = (value?.cityName ?? query).trim().toLowerCase();
  const suggestions = cities.filter((city) =>
    city.cityName.toLowerCase().includes(search) || city.cityCode.toLowerCase().includes(search),
  );
  const expanded = isOpen && suggestions.length > 0;
  const highlightedCity = suggestions[highlightedIndex];

  const handleSelect = (city: CityOption) => {
    setQuery('');
    onChange(city);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (suggestions.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((previous) => event.key === 'ArrowDown'
        ? (previous + 1) % suggestions.length
        : previous <= 0 ? suggestions.length - 1 : previous - 1);
    } else if (expanded && event.key === 'Enter' && suggestions[highlightedIndex]) {
      event.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    }
  };

  return (
    <div className={styles.autocomplete}>
      <label className={styles.label} htmlFor={inputId}>{label}</label>
      <div className={styles.inputWrapper}>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && highlightedCity
            ? `${listId}-${highlightedCity.cityCode}` : undefined}
          className={styles.input}
          value={value ? `${value.cityName} (${value.cityCode})` : query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            // Editing a selected city must clear its code without erasing the typed text.
            onChange(null);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setIsOpen(false);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>

      {expanded && (
        <ul className={styles.dropdown} id={listId} role="listbox" aria-label={label}>
          {suggestions.map((city, index) => (
            <li
              id={`${listId}-${city.cityCode}`}
              key={city.cityCode}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`${styles.option} ${index === highlightedIndex ? styles.highlighted : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(city)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className={styles.cityInfo}>
                <span className={styles.cityName}>{city.cityName}</span>
                <span className={styles.countryName}>{city.countryName}</span>
              </div>
              <span className={styles.codeBadge}>{city.cityCode}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
