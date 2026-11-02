import { useId, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface Props {
  label: string;
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  disabled?: boolean;
}

export function DatePicker({ label, value, onChange, minDate, disabled }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const parsed = parseISO(value);
  const selected = isValid(parsed) ? parsed : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-11 w-full justify-start font-normal"
            aria-label={`${label}: ${selected ? format(selected, 'd MMMM yyyy', { locale: ru }) : 'выберите дату'}`}
          >
            <CalendarDays className="text-muted-foreground" aria-hidden="true" />
            {selected ? format(selected, 'd MMMM yyyy', { locale: ru }) : 'Выберите дату'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            required
            locale={ru}
            selected={selected}
            defaultMonth={selected}
            disabled={minDate ? { before: parseISO(minDate) } : undefined}
            onSelect={(date) => {
              onChange(format(date, 'yyyy-MM-dd'));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
