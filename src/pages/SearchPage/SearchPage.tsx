import React, { useState, useEffect, useRef } from 'react';
import { CityAutocomplete } from '../../components/CityAutocomplete/CityAutocomplete';
import type { CityOption } from '../../types/city';
import { RouteCard } from '../../components/RouteCard/RouteCard';
import { WarningList } from '../../components/WarningList/WarningList';
import { createRoute, waitForRouteResult } from '../../api/route';
import type { PlanResult } from '../../api/models';
import type { FlightRoute } from '../../types/route';
import { getApiErrorMessage } from '../../api/errors';
import { mapRankedRouteToFlightRoute } from '../../adapters/route';
import { ArrowLeftRight, LoaderCircle, PlaneTakeoff, Search, SearchX } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { DatePicker } from '../../components/DatePicker/DatePicker';
import { RouteDetails } from '../../components/RouteDetails/RouteDetails';

export const SearchPage: React.FC = () => {
  const [origin, setOrigin] = useState<CityOption | null>(null);
  const [destination, setDestination] = useState<CityOption | null>(null);
  const [dateFrom, setDateFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<FlightRoute | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const selectionTriggerRef = useRef<HTMLElement | null>(null);
  const routes = result?.routes.map(mapRankedRouteToFlightRoute) ?? [];

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  useEffect(() => () => requestRef.current?.abort(), []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
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
          currency: 'RUB',
          passengers: 1,
        },
        { signal },
      );
      const response = await waitForRouteResult(query_id, {
        signal,
        onStatus: ({ status }) =>
          setStatusText(
            {
              queued: 'В очереди...',
              running: 'Идёт поиск предложений...',
              completed: 'Загрузка результатов...',
              failed: 'Поиск завершился ошибкой.',
            }[status],
          ),
      });
      if (!signal.aborted) setResult(response.result);
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

      <Card className="py-0">
        <CardContent className="p-5 sm:p-7">
          <form className="space-y-6" onSubmit={handleSearch}>
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <CityAutocomplete
                label="Откуда"
                value={origin}
                onChange={setOrigin}
                placeholder="Город или код города (например, MOW)"
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 justify-self-center md:mb-0"
                onClick={handleSwap}
                title="Поменять местами"
                aria-label="Поменять местами"
                disabled={loading}
              >
                <ArrowLeftRight className="rotate-90 md:rotate-0" aria-hidden="true" />
              </Button>
              <CityAutocomplete
                label="Куда"
                value={destination}
                onChange={setDestination}
                placeholder="Город или код города (например, TYO)"
                disabled={loading}
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
                  disabled={loading}
                />
                <DatePicker
                  label="Дата по"
                  value={dateTo}
                  onChange={setDateTo}
                  minDate={dateFrom}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">Диапазон дат вылета</p>
            </div>

            <Button type="submit" size="lg" className="h-11 w-full" disabled={loading}>
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
          <Card aria-hidden="true" className="py-0">
            <CardContent className="space-y-4 p-6">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-40" />
            </CardContent>
          </Card>
        </section>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Не удалось выполнить поиск</AlertTitle>
          <AlertDescription>
            {error.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

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

      <RouteDetails
        route={selectedRoute}
        onClose={() => setSelectedRoute(null)}
        returnFocus={selectionTriggerRef.current}
      />
    </main>
  );
};
