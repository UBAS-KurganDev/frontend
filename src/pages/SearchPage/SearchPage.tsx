import React, { useState, useEffect, useRef, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { readQueryCookie, saveQueryCookie, clearQueryCookie } from '../../lib/query-cookie';
import { CityAutocomplete } from '../../components/CityAutocomplete/CityAutocomplete';
import type { CityOption } from '../../types/city';
import { RouteCard } from '../../components/RouteCard/RouteCard';
import { WarningList } from '../../components/WarningList/WarningList';
import { createRoute, waitForRouteResult } from '../../api/route';
import type { PlanResult } from '../../api/models';
import type { FlightRoute } from '../../types/route';
import { getApiErrorMessage } from '../../api/errors';
import { mapRankedRouteToFlightRoute } from '../../adapters/route';
import { cityRepository } from '../../services/city-repository';
import { ArrowLeftRight, LoaderCircle, PlaneTakeoff, Search, SearchX } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { WaitingGame } from '../../components/WaitingGame/WaitingGame';
import { DatePicker } from '../../components/DatePicker/DatePicker';
import { RouteDetails } from '../../components/RouteDetails/RouteDetails';

export const SearchPage: React.FC = () => {
  const [initialQueryId] = useState(readQueryCookie);
  const [queryId, setQueryId] = useState<string | null>(initialQueryId);
  const [origin, setOrigin] = useState<CityOption | null>(null);
  const [destination, setDestination] = useState<CityOption | null>(null);
  const [dateFrom, setDateFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(!!initialQueryId);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<PlanResult | null>(null);
  const [cityNames, setCityNames] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<FlightRoute | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const selectionTriggerRef = useRef<HTMLElement | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const routes = result?.routes.map((route) => mapRankedRouteToFlightRoute(route, cityNames)) ?? [];

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const loadQuery = useCallback(async (id: string, signal: AbortSignal) => {
    try {
      const response = await waitForRouteResult(id, {
        signal,
        onStatus: ({ status }) => {
          if (signal.aborted) return;
          setStatusText(
            {
              queued: 'Запрос в очереди на обработку...',
              running: 'Запрос в обработке. Идёт поиск предложений...',
              completed: 'Загрузка результатов...',
              failed: 'Поиск завершился ошибкой.',
            }[status],
          );
        },
      });
      if (signal.aborted) return;
      const cityCodes = response.result.routes.flatMap(({ route }) =>
        route.tickets.flatMap((ticket) =>
          ticket.segments.flatMap((segment) => [
            segment.origin.city_code,
            segment.destination.city_code,
          ]),
        ),
      );
      // City labels are optional enrichment: a directory failure must not hide valid flights.
      const cities = cityCodes.length
        ? await cityRepository.getByCodes([...new Set(cityCodes)], { signal }).catch(() => [])
        : [];
      if (!signal.aborted) {
        setCityNames(new Map(cities.map((city) => [city.cityCode, city.cityName])));
        setResult(response.result);
      }
    } catch (err: unknown) {
      if (!signal.aborted) {
        setError(
          isAxiosError(err) && [404, 410].includes(err.response?.status ?? 0)
            ? 'Сохранённый запрос больше недоступен. Начните новый поиск.'
            : getApiErrorMessage(err),
        );
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQueryId) {
      const controller = new AbortController();
      requestRef.current = controller;
      setStatusText('Восстанавливаем сохранённый запрос...');
      void loadQuery(initialQueryId, controller.signal);
    }
    return () => requestRef.current?.abort();
  }, [initialQueryId, loadQuery]);

  const handleNewSearch = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    clearQueryCookie();
    setQueryId(null);
    setLoading(false);
    setResult(null);
    setCityNames(new Map());
    setError(null);
    setStatusText('');
    setSelectedRoute(null);
    selectionTriggerRef.current = null;
  };

  const handleRetry = () => {
    if (!queryId) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError(null);
    setStatusText('Проверяем статус запроса...');
    void loadQuery(queryId, controller.signal);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || queryId) return;
    if (!origin || !destination) {
      setError('Пожалуйста, выберите город отправления и назначения из списка.');
      return;
    }
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      setError('Дата начала поиска должна быть не позже даты окончания.');
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const { signal } = controller;
    setLoading(true);
    setError(null);
    setResult(null);
    setStatusText('Создание задачи поиска...');

    try {
      const { query_id } = await createRoute(
        {
          origin: origin.cityCode,
          destination: destination.cityCode,
          date_from: dateFrom,
          date_to: dateTo,
        },
        { signal },
      );
      if (signal.aborted) return;
      saveQueryCookie(query_id);
      setQueryId(query_id);
      await loadQuery(query_id, signal);
    } catch (err: unknown) {
      if (!signal.aborted) setError(getApiErrorMessage(err));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-5">
        <div className="flex items-center gap-2.5 text-sm font-semibold tracking-wide text-primary">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <PlaneTakeoff className="size-5" aria-hidden="true" />
          </span>
          UBAS
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Поиск авиабилетов</h1>
          <p className="text-muted-foreground">Подберите перелёт с удобной пересадкой.</p>
        </div>
      </header>

      {(queryId || loading) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {queryId && <p className="break-all text-sm text-muted-foreground">Запрос № {queryId}</p>}
          <Button type="button" variant="outline" onClick={handleNewSearch}>
            Новый поиск
          </Button>
        </div>
      )}

      <Card className="py-0">
        <CardContent className="p-5 sm:p-7">
          <form className="space-y-6" onSubmit={handleSearch}>
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <CityAutocomplete
                label="Откуда"
                value={origin}
                onChange={setOrigin}
                placeholder="Город или код города (например, MOW)"
                disabled={loading || !!queryId}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 justify-self-center md:mb-0"
                onClick={handleSwap}
                title="Поменять местами"
                aria-label="Поменять местами"
                disabled={loading || !!queryId}
              >
                <ArrowLeftRight className="rotate-90 md:rotate-0" aria-hidden="true" />
              </Button>
              <CityAutocomplete
                label="Куда"
                value={destination}
                onChange={setDestination}
                placeholder="Город или код города (например, TYO)"
                disabled={loading || !!queryId}
              />
            </div>

            <div className="space-y-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <DatePicker
                  label="Дата с"
                  value={dateFrom}
                  onChange={(date) => {
                    setDateFrom(date);
                    if (date > dateTo) setDateTo(date);
                  }}
                  disabled={loading || !!queryId}
                />
                <DatePicker
                  label="Дата по"
                  value={dateTo}
                  onChange={setDateTo}
                  minDate={dateFrom}
                  disabled={loading || !!queryId}
                />
              </div>
              <p className="text-xs text-muted-foreground">Диапазон дат вылета</p>
            </div>

            <Button type="submit" size="lg" className="h-11 w-full" disabled={loading || !!queryId}>
              {loading ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Search aria-hidden="true" />
              )}
              {loading ? 'Поиск...' : 'Найти билеты'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <section className="space-y-4" aria-label="Поиск маршрутов" aria-busy="true">
          <Alert role="status">
            <LoaderCircle className="size-4 animate-spin" />
            <AlertTitle>Ищем подходящие маршруты</AlertTitle>
            <AlertDescription>{statusText}</AlertDescription>
          </Alert>
        </section>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Не удалось выполнить поиск</AlertTitle>
          <AlertDescription>
            {error.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
            {queryId && (
              <Button type="button" variant="outline" onClick={handleRetry}>
                Повторить загрузку
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <WaitingGame
        status={loading ? 'loading' : error ? 'error' : result ? 'ready' : 'idle'}
        onViewResults={() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          resultsRef.current?.focus({ preventScroll: true });
        }}
      />

      <div
        ref={resultsRef}
        tabIndex={-1}
        className="space-y-4 outline-none"
        aria-label="Результаты поиска"
      >
        {!loading && result && !error && (
          <div className="space-y-4">
            {!result.complete && (
              <Alert role="status">
                <AlertDescription>Получены частичные результаты поиска.</AlertDescription>
              </Alert>
            )}
            <WarningList warnings={result.warnings} />
          </div>
        )}

        {!loading && routes.length > 0 && (
          <section className="space-y-4" aria-labelledby="results-title">
            <h2 id="results-title" className="text-xl font-semibold tracking-tight">
              Найденные маршруты ({routes.length})
            </h2>
            <div className="space-y-4">
              {routes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onSelect={() => {
                    selectionTriggerRef.current = document.activeElement as HTMLElement;
                    setSelectedRoute(route);
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && result && routes.length === 0 && !error && (
          <Card role="status" className="py-0">
            <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">Маршруты по заданным параметрам не найдены.</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Попробуйте изменить города или расширить период вылета.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <RouteDetails
        route={selectedRoute}
        onClose={() => setSelectedRoute(null)}
        returnFocus={selectionTriggerRef.current}
      />
    </main>
  );
};
