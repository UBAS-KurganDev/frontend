import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, resolveApiUrl } from './api';
import { getApiErrorMessage, QueryFailedError } from './errors';
import { createRoute, getRouteResult, getRouteStatus, waitForRouteResult } from './route';
import type { GetQueryResponse } from './models';
import { queryId, queryResult, queryStatus, request } from './__tests__/fixtures';

const mock = new MockAdapter(api);
const statusPath = `/queries/${queryId}`;
const resultPath = `${statusPath}/result`;

afterEach(() => {
  mock.reset();
  vi.useRealTimers();
});

describe('API contract', () => {
  it.each([
    [undefined, '/api/v1'], ['', '/api/v1'], [' / ', '/api/v1'],
    ['/api', '/api/v1'], ['/api/v1/', '/api/v1'],
    ['http://127.0.0.1:8000/', 'http://127.0.0.1:8000/api/v1'],
    ['https://example.com/api/', 'https://example.com/api/v1'],
    ['https://example.com/api/v1/', 'https://example.com/api/v1'],
  ])('resolves base URL %s', (configured, expected) => {
    expect(resolveApiUrl(configured)).toBe(expected);
  });

  it('submits the request with an idempotency key and preserves the full 202 response', async () => {
    const response = { query_id: queryId, status: 'running', reused: true };
    mock.onPost('/queries', request).reply(202, response);
    expect(await createRoute(request, { idempotencyKey: 'retry-123' })).toEqual(response);
    expect(mock.history.post[0].headers?.['Idempotency-Key']).toBe('retry-123');
  });

  it('does not add an idempotency key unless supplied', async () => {
    mock.onPost('/queries').reply(202, { query_id: queryId, status: 'queued', reused: false });
    await createRoute(request);
    expect(mock.history.post[0].headers?.['Idempotency-Key']).toBeUndefined();
  });

  it('preserves status metadata and nested results with omitted optional fields', async () => {
    mock.onGet(statusPath).reply(200, queryStatus);
    mock.onGet(resultPath).reply(200, queryResult);
    expect(await getRouteStatus(queryId)).toEqual(queryStatus);
    expect(await getRouteResult(queryId)).toEqual(queryResult);
  });

  it('waits through queued/running and fetches a ready result', async () => {
    mock.onGet(statusPath).replyOnce(200, queryStatus);
    mock.onGet(statusPath).replyOnce(200, { ...queryStatus, status: 'running' });
    mock.onGet(statusPath).reply(200, { ...queryStatus, status: 'completed', result_available: true });
    mock.onGet(resultPath).reply(200, queryResult);
    const onStatus = vi.fn();
    expect(await waitForRouteResult(queryId, { pollInterval: 1, onStatus })).toEqual(queryResult);
    expect(onStatus.mock.calls.map(([state]) => state.status)).toEqual(['queued', 'running', 'completed']);
    expect(mock.history.get.filter((call) => call.url === resultPath)).toHaveLength(1);
  });

  it('exposes backend failure details and stops polling without fetching results', async () => {
    const failure = { code: 'provider_timeout', message: 'Поставщик недоступен.', retryable: true };
    mock.onGet(statusPath).reply(200, { ...queryStatus, status: 'failed', failure });
    const error = await waitForRouteResult(queryId).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(QueryFailedError);
    expect(error).toMatchObject({ message: failure.message, failure });
    expect(mock.history.get).toHaveLength(1);
  });

  it('does not overlap status requests when the backend responds slowly', async () => {
    vi.useFakeTimers();
    let finishStatus!: (reply: [number, GetQueryResponse]) => void;
    mock.onGet(statusPath).reply(() => new Promise<[number, GetQueryResponse]>((resolve) => {
      finishStatus = resolve;
    }));
    mock.onGet(resultPath).reply(200, queryResult);
    const pending = waitForRouteResult(queryId, { pollInterval: 100 });
    await vi.advanceTimersByTimeAsync(10000);
    expect(mock.history.get).toHaveLength(1);
    finishStatus([200, { ...queryStatus, status: 'completed', result_available: true }]);
    expect(await pending).toEqual(queryResult);
  });

  it('does not fetch an unavailable result', async () => {
    mock.onGet(statusPath).reply(200, { ...queryStatus, status: 'completed' });
    await expect(waitForRouteResult(queryId)).rejects.toThrow('результат недоступен');
    expect(mock.history.get).toHaveLength(1);
  });

  it('cancels the interval wait and does not issue further requests', async () => {
    vi.useFakeTimers();
    mock.onGet(statusPath).reply(200, queryStatus);
    const controller = new AbortController();
    let observed = false;
    const pending = waitForRouteResult(queryId, {
      signal: controller.signal, onStatus: () => { observed = true; },
    }).catch((caught: unknown) => caught);
    await vi.waitFor(() => expect(observed).toBe(true));
    controller.abort();
    expect(axios.isCancel(await pending)).toBe(true);
    await vi.runAllTimersAsync();
    expect(mock.history.get).toHaveLength(1);
  });

  it('does not submit an already aborted request', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(createRoute(request, { signal: controller.signal })).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(mock.history.post).toHaveLength(0);
  });

  it('shows field-specific errors from a 422 response', async () => {
    mock.onPost('/queries').reply(422, { detail: [
      { loc: ['body', 'passengers'], msg: 'Input should be less than or equal to 9', type: 'less_than_equal' },
      { loc: ['body', 'excluded_cities', 0], msg: 'Invalid code', type: 'string_pattern_mismatch' },
    ] });
    const error = await createRoute(request).catch((caught: unknown) => caught);
    expect(getApiErrorMessage(error)).toBe('passengers: Input should be less than or equal to 9\nexcluded_cities.0: Invalid code');
  });

  it('handles text HTTP errors and network failures', async () => {
    mock.onGet(resultPath).replyOnce(404, { detail: 'Query not found' });
    expect(getApiErrorMessage(await getRouteResult(queryId).catch((error: unknown) => error))).toBe('Query not found');
    mock.onGet(resultPath).networkError();
    expect(getApiErrorMessage(await getRouteResult(queryId).catch((error: unknown) => error))).toBe('Network Error');
  });
});
