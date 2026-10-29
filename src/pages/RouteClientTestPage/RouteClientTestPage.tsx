
import { useEffect, useState } from 'react';
import {
  createRoute,
  getRouteStatus,
  getRouteResult,
  waitForRouteResult,
  type RouteRequest,
  type QueryStatus,
  type QueryResult,
  type GetQueryResponse,
} from '../../api/route';
import { getApiErrorMessage as getErrorMessage } from '../../api/errors';

const initialRequest: RouteRequest = {
  origin: 'COK',
  destination: 'SAB',
  date_from: '2026-10-15',
  date_to: '2026-10-15',
  citizenship: 'RU',
  passengers: 1,
  currency: 'RUB',
  budget: 1,
  limit: 10,
  excluded_cities: [],
  checked_baggage_required: false,
};

const statusLabels: Record<QueryStatus, string> = {
  queued: 'В очереди',
  running: 'Выполняется',
  completed: 'Завершено',
  failed: 'Ошибка выполнения',
};

export default function RouteClientTestPage() {
  const [request, setRequest] =
    useState<RouteRequest>(initialRequest);

  const [queryId, setQueryId] = useState('');
  const [queryState, setQueryState] = useState<GetQueryResponse | null>(null);
  const status = queryState?.status ?? null;
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoPoll, setAutoPoll] = useState(false);
  const [pollInterval, setPollInterval] = useState(2000);

  function clearError() {
    setError(null);
  }

  async function handleCreate() {
    setLoading(true);
    clearError();
    setQueryId('');
    setQueryState(null);
    setResult(null);
    setAutoPoll(false);

    try {
      const response = await createRoute(request);
      setQueryId(response.query_id);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckStatus() {
    if (!queryId) return;

    setLoading(true);
    clearError();

    try {
      const response = await getRouteStatus(queryId);
      setQueryState(response);

      if (
        response.status === 'completed' ||
        response.status === 'failed'
      ) {
        setAutoPoll(false);
      }
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGetResult() {
    if (!queryId) return;

    setLoading(true);
    clearError();

    try {
      const response = await getRouteResult(queryId);
      setResult(response);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoPoll || !queryId) return;
    const controller = new AbortController();
    const { signal } = controller;

    void waitForRouteResult(queryId, {
      signal,
      pollInterval,
      onStatus: setQueryState,
    }).then((response) => {
      if (!signal.aborted) {
        setResult(response);
        setAutoPoll(false);
      }
    }).catch((error: unknown) => {
      if (!signal.aborted) {
        setError(getErrorMessage(error));
        setAutoPoll(false);
      }
    });

    return () => controller.abort();
  }, [autoPoll, queryId, pollInterval]);

  function updateField<K extends keyof RouteRequest>(
    key: K,
    value: RouteRequest[K],
  ) {
    setRequest((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  const buttonClass =
    'rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 text-gray-900">
      <header>
        <h1 className="text-2xl font-bold">
          Тест API клиента маршрутов
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Проверка создания задачи, статуса выполнения и получения
          результата через API клиента.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold">
          1. Параметры запроса
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Откуда</span>
            <input
              className={inputClass}
              value={request.origin}
              onChange={(e) =>
                updateField('origin', e.target.value.toUpperCase())
              }
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Куда</span>
            <input
              className={inputClass}
              value={request.destination}
              onChange={(e) =>
                updateField(
                  'destination',
                  e.target.value.toUpperCase(),
                )
              }
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Дата начала</span>
            <input
              className={inputClass}
              type="date"
              value={request.date_from}
              onChange={(e) =>
                updateField('date_from', e.target.value)
              }
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Дата окончания</span>
            <input
              className={inputClass}
              type="date"
              value={request.date_to}
              onChange={(e) =>
                updateField('date_to', e.target.value)
              }
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Гражданство</span>
            <input
              className={inputClass}
              value={request.citizenship ?? 'RU'}
              onChange={(e) =>
                updateField('citizenship', e.target.value.toUpperCase())
              }
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Пассажиры</span>
            <input
              className={inputClass}
              type="number"
              min={1}
              max={9}
              value={request.passengers ?? 1}
              onChange={(e) =>
                updateField('passengers', Number(e.target.value))
              }
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Валюта</span>
            <input
              className={inputClass}
              value={request.currency ?? 'RUB'}
              onChange={(e) =>
                updateField('currency', e.target.value.toUpperCase())
              }
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Бюджет</span>
            <input
              className={inputClass}
              type="number"
              min="0.01"
              step="any"
              value={request.budget ?? ''}
              onChange={(e) =>
                updateField(
                  'budget',
                  e.target.value === '' ? null : e.target.value,
                )
              }
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Лимит результатов</span>
            <input
              className={inputClass}
              type="number"
              min={1}
              max={50}
              value={request.limit ?? 10}
              onChange={(e) =>
                updateField('limit', Number(e.target.value))
              }
            />
          </label>

          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={request.checked_baggage_required ?? false}
              onChange={(e) =>
                updateField(
                  'checked_baggage_required',
                  e.target.checked,
                )
              }
            />
            Требуется багаж
          </label>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium">
            Исключённые города (коды через запятую)
          </span>
          <input
            className={inputClass}
            value={(request.excluded_cities ?? []).join(', ')}
            onChange={(e) =>
              updateField(
                'excluded_cities',
                e.target.value
                  .split(',')
                  .map((city) => city.trim().toUpperCase())
                  .filter(Boolean),
              )
            }
            placeholder="Например, DXB, IST"
          />
        </div>

        <details>
          <summary className="cursor-pointer text-sm text-blue-700">
            Посмотреть JSON запроса
          </summary>
          <pre className="mt-3 overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
            {JSON.stringify(request, null, 2)}
          </pre>
        </details>

        <button
          className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
          disabled={loading}
          onClick={handleCreate}
        >
          {loading ? 'Выполняется...' : 'Создать запрос'}
        </button>
      </section>

      <section className="space-y-4 rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold">
          2. Состояние задачи
        </h2>

        <label className="block space-y-1 text-sm">
          <span>Query ID</span>
          <input
            className={inputClass}
            value={queryId}
            onChange={(e) => setQueryId(e.target.value)}
            placeholder="Появится после создания запроса"
          />
        </label>

        {status && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <span className="text-gray-500">Статус: </span>
            <strong>{statusLabels[status]}</strong>
            <span className="ml-2 text-gray-500">({status})</span>
          </div>
        )}

        {queryState?.failure && <p role="alert">{queryState.failure.message}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            className={`${buttonClass} bg-gray-900 text-white hover:bg-gray-700`}
            disabled={loading || !queryId.trim()}
            onClick={handleCheckStatus}
          >
            Проверить статус
          </button>

          <button
            className={`${buttonClass} bg-gray-100 text-gray-900 hover:bg-gray-200`}
            disabled={
              loading ||
              !queryId.trim() ||
              status === 'failed'
            }
            onClick={handleGetResult}
          >
            Получить результат
          </button>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoPoll}
              disabled={!queryId.trim() || status === 'completed' || status === 'failed'}
              onChange={(e) => setAutoPoll(e.target.checked)}
            />
            Автоматически проверять статус
          </label>

          <label className="flex items-center gap-3 text-sm">
            <span>Интервал проверки</span>
            <select
              className={inputClass}
              value={pollInterval}
              onChange={(e) => setPollInterval(Number(e.target.value))}
            >
              <option value={1000}>1 секунда</option>
              <option value={2000}>2 секунды</option>
              <option value={5000}>5 секунд</option>
              <option value={10000}>10 секунд</option>
            </select>
          </label>
        </div>
      </section>

      {error && (
        <section className="rounded-xl border border-red-300 bg-red-50 p-5">
          <h2 className="font-semibold text-red-800">
            Ошибка API
          </h2>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap text-sm text-red-700">
            {error}
          </pre>
          <button
            className={`${buttonClass} mt-3 bg-red-100 text-red-800`}
            onClick={clearError}
          >
            Скрыть ошибку
          </button>
        </section>
      )}

      {result !== null && (
        <section className="space-y-3 rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold">
            3. Результат API
          </h2>
          <pre className="max-h-[600px] overflow-auto rounded-lg bg-gray-50 p-4 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
