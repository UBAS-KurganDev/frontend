import React, { useState, useEffect, useRef, useTransition } from 'react';
import { AirportOption } from '../../types/airport';
import styles from './AirportAutocomplete.module.scss';

interface Props {
  label: string;
  value: string;
  onChange: (airport: AirportOption | null) => void;
  placeholder?: string;
}

// Заглушка API-запроса (в реальном проекте заменить на вызов fetch/axios с debounce)
const fetchAirports = async (query: string): Promise<AirportOption[]> => {
  if (!query || query.trim().length < 1) return [];
  
  // Имитация задержки сети
  await new Promise((res) => setTimeout(res, 150));

  const mockData: AirportOption[] = [
    { id: '1', cityName: 'Екатеринбург', countryName: 'Россия', airportName: 'Кольцово', code: 'SVX' },
    { id: '2', cityName: 'Москва', countryName: 'Россия', airportName: 'Шереметьево', code: 'SVO' },
    { id: '3', cityName: 'Москва', countryName: 'Россия', airportName: 'Домодедово', code: 'DME' },
    { id: '4', cityName: 'Санкт-Петербург', countryName: 'Россия', airportName: 'Пулково', code: 'LED' },
    { id: '5', cityName: 'Стамбул', countryName: 'Турция', airportName: 'Новый аэропорт', code: 'IST' },
  ];

  const q = query.toLowerCase();
  return mockData.filter(
    (item) =>
      item.cityName.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.airportName.toLowerCase().includes(q)
  );
};

export const AirportAutocomplete: React.FC<Props> = ({
  label,
  value,
  onChange,
  placeholder = 'Город или код (например, SVX)',
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AirportOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Синхронизация внешнего значения, если оно сбросилось извне
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Закрытие дропдауна при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Обработка ввода с debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      const results = await fetchAirports(query);
      startTransition(() => {
        setSuggestions(results);
        setIsOpen(true);
        setHighlightedIndex(-1);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (airport: AirportOption) => {
    setQuery(`${airport.cityName} (${airport.code})`);
    onChange(airport);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.autocomplete} ref={containerRef}>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          className={styles.input}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            // Если пользователь начал стирать/менять текст вручную — сбрасываем выбранный объект
            if (value) onChange(null as any);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {isPending && <span className={styles.loader} />}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className={styles.dropdown}>
          {suggestions.map((item, index) => (
            <li
              key={item.id}
              className={`${styles.option} ${index === highlightedIndex ? styles.highlighted : ''}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className={styles.cityInfo}>
                <span className={styles.cityName}>{item.cityName}</span>
                <span className={styles.countryName}>{item.countryName}</span>
                <span className={styles.airportName}>{item.airportName}</span>
              </div>
              <span className={styles.codeBadge}>{item.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};