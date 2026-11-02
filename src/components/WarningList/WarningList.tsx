import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

const warningMessages: Readonly<Record<string, string>> = {
  hotel_and_ground_transport_not_included: 'Отель и наземный транспорт не включены в стоимость.',
  recheck_fares_and_entry: 'Перед покупкой уточните стоимость билетов и условия въезда.',
  unprotected_connection: 'Пересадка не защищена перевозчиком.',
  synthetic_demo_data: 'Показаны демонстрационные данные, а не реальные предложения авиакомпаний.',
};

interface Props {
  warnings?: readonly string[];
}

export function WarningList({ warnings = [] }: Props) {
  const messages = [
    ...new Set(
      warnings
        .map((warning) => {
          const text = warning.trim();
          if (Object.hasOwn(warningMessages, text)) return warningMessages[text];
          // Keep readable backend messages, but do not expose unknown internal codes.
          return /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(text)
            ? 'Для результата поиска есть дополнительные примечания.'
            : text;
        })
        .filter(Boolean),
    ),
  ];

  if (messages.length === 0) return null;

  return (
    <Alert role="status" className="border-warning-border bg-warning text-warning-foreground">
      <Info className="size-4" aria-hidden="true" />
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed" aria-label="Примечания">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
