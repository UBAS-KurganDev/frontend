import React, { useState, useEffect, useRef } from 'react';
import { CityAutocomplete } from '../../components/CityAutocomplete/CityAutocomplete';
import type { CityOption } from '../../types/city';
import styles from './SearchPage.module.scss';
import { RouteCard } from '../../components/RouteCard/RouteCard';
import { WarningList } from '../../components/WarningList/WarningList';
import { createRoute, waitForRouteResult } from '../../api/route';
import type { PlanResult } from '../../api/models';
import { getApiErrorMessage } from '../../api/errors';
import { mapRankedRouteToFlightRoute } from '../../adapters/route';

export const SearchPage: React.FC = () => {
  const [origin, setOrigin] = useState<CityOption | null>(null);
  const [destination, setDestination] = useState<CityOption | null>(null);
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
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
    if (dateFrom > dateTo) {
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
      const { query_id } = await createRoute({
        origin: origin.cityCode,
        destination: destination.cityCode,
        date_from: dateFrom,
        date_to: dateTo,
        currency: 'RUB',
        passengers: 1,
      }, { signal });
      const response = await waitForRouteResult(query_id, {
        signal,
        onStatus: ({ status }) => setStatusText({
          queued: 'В очереди...',
          running: 'Идёт поиск предложений...',
          completed: 'Загрузка результатов...',
          failed: 'Поиск завершился ошибкой.',
        }[status]),
      });
      if (!signal.aborted) setResult(response.result);
    } catch (err: unknown) {
      if (!signal.aborted) setError(getApiErrorMessage(err));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  return (
    <main className={styles.searchPage}>
      <div className={styles.container}>
        <h1 className={styles.title}>Поиск авиабилетов</h1>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <div className={styles.fieldsRow}>
            <CityAutocomplete
              label="Откуда"
              value={origin}
              onChange={setOrigin}
              placeholder="Город или код города (например, MOW)"
            />

            <button
              type="button"
              className={styles.swapButton}
              onClick={handleSwap}
              title="Поменять местами"
              aria-label="Поменять местами"
            >
              ⇄
            </button>

            <CityAutocomplete
              label="Куда"
              value={destination}
              onChange={setDestination}
              placeholder="Город или код города (например, TYO)"
            />
          </div>

          {/* Блок выбора дат */}
          <div className={styles.fieldsRow} style={{ alignItems: 'center' }}>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>
              Дата с
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '16px', outline: 'none' }}
                required
              />
            </label>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>
              Дата по
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '16px', outline: 'none' }}
                required
              />
            </label>
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Поиск...' : 'Найти билеты'}
          </button>
        </form>

        {/* Спиннер и статус загрузки */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '30px 0', gap: '12px' }}>
            <div className="loader" style={{
              width: '36px', height: '36px',
              border: '3px solid #cbd5e0', borderTopColor: '#3182ce',
              borderRadius: '50%', animation: 'spin 0.6s linear infinite'
            }} />
            <span style={{ color: '#4a5568', fontSize: '15px', fontWeight: 500 }}>{statusText}</span>
          </div>
        )}

        {/* Ошибки */}
        {error && (
          <div style={{ marginTop: '20px', padding: '12px', background: '#fff5f5', color: '#c53030', borderRadius: '8px', border: '1px solid #feb2b2' }}>
            {error.split('\n').map((line, index) => <div key={index}>{line}</div>)}
          </div>
        )}

        {/* Список найденных маршрутов */}
        {!loading && routes.length > 0 && (
          <section className={styles.previewSection} style={{ marginTop: '30px' }}>
            <h2 className={styles.previewTitle} style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 600 }}>
              Найденные маршруты ({routes.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {routes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onSelect={() => alert(`Выбран маршрут с ID: ${route.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {!loading && result && !error && (
          <div style={{ marginTop: '16px' }}>
            {!result.complete && <p role="status">Получены частичные результаты поиска.</p>}
            <WarningList warnings={result.warnings} />
            {routes.length === 0 && <p role="status">Маршруты по заданным параметрам не найдены.</p>}
          </div>
        )}
      </div>
    </main>
  );
};
