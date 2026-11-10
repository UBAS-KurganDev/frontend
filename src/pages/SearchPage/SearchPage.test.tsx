// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, describe, expect, it } from 'vitest';
import { api } from '../../api/api';
import { queryId, queryResult, queryStatus } from '../../api/__tests__/fixtures';
import { SearchPage } from './SearchPage';

const mock = new MockAdapter(api);
const statusPath = `/queries/${queryId}`;

afterEach(() => {
  cleanup();
  mock.reset();
});

function selectCity(label: string, query: string, cityName: string) {
  const input = screen.getByRole('combobox', { name: label });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: query } });
  fireEvent.click(screen.getByRole('option', { name: new RegExp(cityName) }));
}

function selectCities() {
  render(<SearchPage />);
  selectCity('Откуда', 'Москва', 'Москва');
  selectCity('Куда', 'Токио', 'Токио');
}

function startSearch() {
  selectCities();
  fireEvent.click(screen.getByRole('button', { name: 'Найти билеты' }));
}

function readyResult(result = queryResult) {
  mock.onPost('/queries').reply(202, { query_id: queryId, status: 'completed', reused: true });
  mock
    .onGet(statusPath)
    .reply(200, { ...queryStatus, status: 'completed', result_available: true });
  mock.onGet(`${statusPath}/result`).reply(200, result);
}

describe('SearchPage backend integration', () => {
  it.each([null, undefined])(
    'renders and opens a direct route with %s optional fields',
    async (value) => {
      const response = structuredClone(queryResult);
      const ranked = response.result.routes[0];
      const candidate = ranked.route;
      Object.assign(candidate, {
        kind: 'direct',
        stopover: value,
        metrics: value,
        visa: value,
        total_trip_hours: 4,
      });
      candidate.tickets = [candidate.tickets[0]];
      ranked.score = value;
      readyResult(response);
      startSearch();
      expect(await screen.findByText('Прямой рейс')).toBeTruthy();
      expect(screen.getByText('Общее время: 4ч 0м')).toBeTruthy();
      expect(screen.queryByText(/Оценка маршрута:/)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Выбрать' }));
      expect(await screen.findByRole('dialog')).toBeTruthy();
      expect(screen.getByText('Все перелёты входят в один билет.')).toBeTruthy();
      const body = JSON.parse(mock.history.post[0].data);
      expect(body).toEqual({
        origin: 'MOW',
        destination: 'TYO',
        date_from: expect.any(String),
        date_to: expect.any(String),
      });
    },
  );

  it('renders unknown ticket prices and incomplete totals in the card and details', async () => {
    const response = structuredClone(queryResult);
    const candidate = response.result.routes[0].route;
    candidate.full_cost_known = false;
    candidate.unknown_costs = ['Цена визы уточняется'];
    candidate.tickets[0].total_price = null;
    candidate.tickets[0].unknown_costs = ['Цена билета уточняется'];
    candidate.tickets[0].expires_at = null;
    candidate.costs = [
      {
        key: 'ticket-a',
        kind: 'ticket',
        original: null,
        rub_amount: null,
        unknown_reason: 'Нет котировки',
      },
      { key: 'visa', kind: 'visa', rub_amount: '1000' },
    ];
    readyResult(response);
    startSearch();
    expect(await screen.findByText('Полная стоимость неизвестна')).toBeTruthy();
    expect(screen.getByText('Известная часть:')).toBeTruthy();
    expect(screen.getByText('Цена визы уточняется')).toBeTruthy();
    expect(screen.getByText('Цена билета уточняется')).toBeTruthy();
    expect(screen.getByText('Нет котировки')).toBeTruthy();
    expect(screen.getByText('Билет: Стоимость неизвестна')).toBeTruthy();
    expect(screen.getByText(/Виза:.*1.*000/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Стоимость неизвестна')).toBeTruthy();
    expect(screen.getAllByText('Полная стоимость неизвестна')).toHaveLength(2);
  });

  it.each(['ticket', 'route', 'component'] as const)(
    'does not show a full price when only %s signals unknown costs',
    async (source) => {
      const response = structuredClone(queryResult);
      const candidate = response.result.routes[0].route;
      if (source === 'ticket') candidate.tickets[0].total_price = null;
      if (source === 'route') candidate.unknown_costs = ['Неполная цена'];
      if (source === 'component')
        candidate.costs = [{ key: 'visa', kind: 'visa', rub_amount: null }];
      readyResult(response);
      startSearch();
      expect(await screen.findByText('Полная стоимость неизвестна')).toBeTruthy();
      expect(screen.getByText('Известная часть:')).toBeTruthy();
    },
  );

  it('renders a ranked route from multiple tickets, its currency and partial-result warnings', async () => {
    readyResult();
    startSearch();
    expect(await screen.findByText('Найденные маршруты (1)')).toBeTruthy();
    expect(screen.getByText('Общее время: 34ч 0м')).toBeTruthy();
    expect(screen.getByText('Пересадок: 2')).toBeTruthy();
    expect(screen.getByText(/340.*€/)).toBeTruthy();
    expect(screen.getByText('Получены частичные результаты поиска.')).toBeTruthy();
    expect(screen.getByText(queryResult.result.warnings[0])).toBeTruthy();
  });

  it('shows an empty result without a map error', async () => {
    readyResult({ ...queryResult, result: { ...queryResult.result, routes: [], complete: true } });
    startSearch();
    expect(await screen.findByText('Маршруты по заданным параметрам не найдены.')).toBeTruthy();
    expect(screen.queryByText('Получены частичные результаты поиска.')).toBeNull();
  });

  it('translates backend warning codes in both the route card and search result', async () => {
    const response = structuredClone(queryResult);
    const codes = [
      'hotel_and_ground_transport_not_included',
      'recheck_fares_and_entry',
      'unprotected_connection',
    ];
    response.result.routes[0].route.warnings = codes;
    response.result.warnings = ['synthetic_demo_data'];
    readyResult(response);
    startSearch();
    await screen.findByText('Найденные маршруты (1)');
    expect(screen.getByText('Отель и наземный транспорт не включены в стоимость.')).toBeTruthy();
    expect(
      screen.getByText('Перед покупкой уточните стоимость билетов и условия въезда.'),
    ).toBeTruthy();
    expect(screen.getByText('Пересадка не защищена перевозчиком.')).toBeTruthy();
    expect(
      screen.getByText('Показаны демонстрационные данные, а не реальные предложения авиакомпаний.'),
    ).toBeTruthy();
    for (const code of [...codes, 'synthetic_demo_data']) {
      expect(screen.queryByText(code)).toBeNull();
    }
    // Only warnings change: the route score and cost breakdown are still visible.
    expect(screen.getByText(/Оценка маршрута:/)).toBeTruthy();
    expect(screen.getByText(/Билеты:.*Виза:/)).toBeTruthy();
  });

  it('shows the safe failure message from the backend', async () => {
    mock.onPost('/queries').reply(202, { query_id: queryId, status: 'queued', reused: false });
    mock.onGet(statusPath).reply(200, {
      ...queryStatus,
      status: 'failed',
      failure: { code: 'provider_error', message: 'Нет доступных поставщиков.' },
    });
    startSearch();
    expect(await screen.findByText('Нет доступных поставщиков.')).toBeTruthy();
  });

  it('shows validation details and allows a new submission', async () => {
    mock.onPost('/queries').reply(422, {
      detail: [{ loc: ['body', 'date_from'], msg: 'Invalid departure date', type: 'value_error' }],
    });
    startSearch();
    expect(await screen.findByText('date_from: Invalid departure date')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Найти билеты' }).hasAttribute('disabled')).toBe(
      false,
    );
  });

  it('aborts a pending request when unmounted', async () => {
    let finishRequest!: (reply: [number, object]) => void;
    mock.onPost('/queries').reply(
      () =>
        new Promise<[number, object]>((resolve) => {
          finishRequest = resolve;
        }),
    );
    startSearch();
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    const signal = mock.history.post[0].signal;
    cleanup();
    expect(signal?.aborted).toBe(true);
    finishRequest([202, { query_id: queryId, status: 'queued', reused: false }]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mock.history.get).toHaveLength(0);
  });

  it('submits city codes MOW and TYO, rather than individual airport codes', async () => {
    const user = userEvent.setup();
    readyResult();
    render(<SearchPage />);
    await user.click(screen.getByRole('combobox', { name: 'Откуда' }));
    await user.keyboard('Москва');
    await user.click(screen.getByRole('option', { name: /Москва/ }));
    await user.click(screen.getByRole('combobox', { name: 'Куда' }));
    await user.keyboard('Токио');
    await user.click(screen.getByRole('option', { name: /Токио/ }));
    await user.click(screen.getByRole('button', { name: 'Найти билеты' }));
    await screen.findByText('Найденные маршруты (1)');
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
      origin: 'MOW',
      destination: 'TYO',
    });
    expect((screen.getByRole('combobox', { name: 'Откуда' }) as HTMLInputElement).value).toBe(
      'Москва (MOW)',
    );
    expect((screen.getByRole('combobox', { name: 'Куда' }) as HTMLInputElement).value).toBe(
      'Токио (TYO)',
    );
  });

  it('offers one option per city and no airport-specific options', () => {
    render(<SearchPage />);
    const input = screen.getByRole('combobox', { name: 'Откуда' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Москва' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /Москва.*MOW/ })).toBeTruthy();
    expect(screen.queryByText(/Шереметьево|Домодедово|SVO|DME/)).toBeNull();
    fireEvent.change(input, { target: { value: 'Токио' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /Токио.*TYO/ })).toBeTruthy();
    expect(screen.queryByText(/Ханэда|Нарита|HND|NRT/)).toBeNull();
    fireEvent.change(input, { target: { value: 'SVO' } });
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('selects cities by their codes using the keyboard', async () => {
    readyResult();
    render(<SearchPage />);
    const origin = screen.getByRole('combobox', { name: 'Откуда' });
    fireEvent.change(origin, { target: { value: 'mow' } });
    fireEvent.keyDown(origin, { key: 'ArrowDown' });
    fireEvent.keyDown(origin, { key: 'Enter' });
    const destination = screen.getByRole('combobox', { name: 'Куда' });
    fireEvent.change(destination, { target: { value: 'tyo' } });
    fireEvent.keyDown(destination, { key: 'ArrowUp' });
    fireEvent.keyDown(destination, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Найти билеты' }));
    await screen.findByText('Найденные маршруты (1)');
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
      origin: 'MOW',
      destination: 'TYO',
    });
  });

  it('swaps the selected city names and their submitted codes together', async () => {
    readyResult();
    selectCities();
    fireEvent.click(screen.getByRole('button', { name: 'Поменять местами' }));
    expect((screen.getByRole('combobox', { name: 'Откуда' }) as HTMLInputElement).value).toBe(
      'Токио (TYO)',
    );
    expect((screen.getByRole('combobox', { name: 'Куда' }) as HTMLInputElement).value).toBe(
      'Москва (MOW)',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Найти билеты' }));
    await screen.findByText('Найденные маршруты (1)');
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
      origin: 'TYO',
      destination: 'MOW',
    });
  });

  it('keeps edited text and prevents submission with a stale selected city code', async () => {
    const user = userEvent.setup();
    readyResult();
    selectCities();
    const origin = screen.getByRole('combobox', { name: 'Откуда' }) as HTMLInputElement;
    await user.clear(origin);
    await user.type(origin, 'Екат');
    expect(origin.value).toBe('Екат');
    await user.click(screen.getByRole('button', { name: 'Найти билеты' }));
    expect(
      screen.getByText('Пожалуйста, выберите город отправления и назначения из списка.'),
    ).toBeTruthy();
    expect(mock.history.post).toHaveLength(0);
    await user.click(origin);
    await user.click(screen.getByRole('option', { name: /Екатеринбург/ }));
    await user.click(screen.getByRole('button', { name: 'Найти билеты' }));
    await screen.findByText('Найденные маршруты (1)');
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
      origin: 'SVX',
      destination: 'TYO',
    });
  });
});
