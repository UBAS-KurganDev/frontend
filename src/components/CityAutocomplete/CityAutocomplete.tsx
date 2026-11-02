import { useId, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { CityOption } from '../../types/city';
import { cities } from '../../data/cities';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';

interface Props {
  label: string;
  value: CityOption | null;
  onChange: (city: CityOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CityAutocomplete({
  label,
  value,
  onChange,
  placeholder = 'Город или код города',
  disabled = false,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const search = (value?.cityName ?? query).trim().toLowerCase();
  const suggestions = cities.filter(
    (city) =>
      city.cityName.toLowerCase().includes(search) || city.cityCode.toLowerCase().includes(search),
  );

  return (
    <div className="min-w-0 space-y-2">
      <Label id={inputId} onClick={() => inputRef.current?.focus()}>
        {label}
      </Label>
      <Command
        label={label}
        shouldFilter={false}
        className={cn(
          'relative overflow-visible rounded-md border border-input bg-background shadow-xs',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20',
          '[&_[data-slot=command-input-wrapper]]:border-0',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <CommandInput
          asChild
          value={value ? `${value.cityName} (${value.cityCode})` : query}
          onValueChange={(text) => {
            setQuery(text);
            onChange(null);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="h-11"
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsOpen(false);
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') setIsOpen(true);
          }}
        >
          {/* cmdk owns the input id and uses it to restore focus after filtering. */}
          <input ref={inputRef} aria-labelledby={inputId} aria-expanded={isOpen} />
        </CommandInput>
        {isOpen && !disabled && (
          <CommandList
            aria-label={label}
            className="absolute inset-x-0 top-full z-50 mt-2 max-h-64 rounded-md border bg-popover p-1 shadow-md"
            onMouseDown={(event) => event.preventDefault()}
          >
            <CommandEmpty>Города не найдены.</CommandEmpty>
            {suggestions.map((city) => (
              <CommandItem
                key={city.cityCode}
                value={city.cityCode}
                onSelect={() => {
                  setQuery('');
                  onChange(city);
                  setIsOpen(false);
                }}
                className="gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <span className="block font-medium">{city.cityName}</span>
                  <span className="text-xs text-muted-foreground">{city.countryName}</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{city.cityCode}</span>
                {value?.cityCode === city.cityCode && <Check className="size-4 text-primary" />}
              </CommandItem>
            ))}
          </CommandList>
        )}
      </Command>
    </div>
  );
}
