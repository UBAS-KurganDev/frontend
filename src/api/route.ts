import { CanceledError } from 'axios';
import { api } from './api';
import { QueryFailedError } from './errors';
import type {
  GetQueryResponse,
  QueryResult,
  RouteRequest,
  SubmitQueryResponse,
} from './models';

export type * from './models';

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface CreateQueryOptions extends RequestOptions {
  /** Reuse the same key when retrying the same submission; 1–255 characters. */
  idempotencyKey?: string;
}

export async function createRoute(
  request: RouteRequest,
  options: CreateQueryOptions = {},
): Promise<SubmitQueryResponse> {
  const { idempotencyKey, signal } = options;
  const { data } = await api.post<SubmitQueryResponse>('/queries', request, {
    signal,
    headers: idempotencyKey === undefined ? undefined : {
      'Idempotency-Key': idempotencyKey,
    },
  });
  return data;
}

export async function getRouteStatus(
  queryId: string,
  options: RequestOptions = {},
): Promise<GetQueryResponse> {
  const { data } = await api.get<GetQueryResponse>(
    `/queries/${encodeURIComponent(queryId)}`, options,
  );
  return data;
}

export async function getRouteResult(
  queryId: string,
  options: RequestOptions = {},
): Promise<QueryResult> {
  const { data } = await api.get<QueryResult>(
    `/queries/${encodeURIComponent(queryId)}/result`, options,
  );
  return data;
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CanceledError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new CanceledError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export interface PollOptions extends RequestOptions {
  pollInterval?: number;
  onStatus?: (status: GetQueryResponse) => void;
}

/** Poll sequentially so slow requests cannot overlap. Abort also cancels the wait. */
export async function waitForRouteResult(
  queryId: string,
  { signal, pollInterval = 2000, onStatus }: PollOptions = {},
): Promise<QueryResult> {
  for (;;) {
    const status = await getRouteStatus(queryId, { signal });
    if (signal?.aborted) throw new CanceledError();
    onStatus?.(status);
    if (status.status === 'failed') throw new QueryFailedError(status.failure);
    if (status.result_available) return getRouteResult(queryId, { signal });
    if (status.status === 'completed') {
      throw new Error('Поиск завершён, но результат недоступен. Повторите поиск.');
    }
    await delay(pollInterval, signal);
  }
}
