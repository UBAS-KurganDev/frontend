import axios from 'axios';
import type { HTTPValidationError, QueryFailure } from './models';

export class QueryFailedError extends Error {
  readonly failure: QueryFailure | null;

  constructor(failure?: QueryFailure | null) {
    super(failure?.message || 'Ошибка при выполнении поиска на сервере.');
    this.name = 'QueryFailedError';
    this.failure = failure ?? null;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<HTTPValidationError | { detail: string }>(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const messages = detail.map((item) => {
        const field = item.loc.filter((part) => part !== 'body').join('.');
        return field ? `${field}: ${item.msg}` : item.msg;
      });
      if (messages.length) return messages.join('\n');
    }
  }
  return error instanceof Error ? error.message : 'Не удалось выполнить запрос.';
}
