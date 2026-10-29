# UBAS Frontend

React + TypeScript + Vite: поиск авиамаршрутов с пересадками.

## Запуск и проверки

```sh
npm ci
npm start
npm run build
npm run lint
npm test -- --run
```

## Адрес бэкенда

В `.env.development` задаётся адрес сервера:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

Клиент добавляет `/api/v1`. Также допустим адрес, уже заканчивающийся на
`/api` или `/api/v1`: префикс не дублируется. Без переменной запросы идут на
`/api/v1` текущего origin. При таком размещении сервер или reverse proxy должен
направлять этот путь к бэкенду. При разных origin бэкенд должен разрешать CORS
для адреса фронтенда и заголовка `Idempotency-Key`, если он используется.

## API-клиент

Типы в `src/api/models.ts` соответствуют предоставленной схеме UBAS Backend 0.1.0.
Даты передаются ISO-строками, денежные суммы остаются десятичными строками.
Необязательные и nullable-поля отражены отдельно. Ограничения форматов и диапазонов
проверяет сервер; TypeScript-типы не выполняют runtime-валидацию JSON.

`src/api/route.ts` предоставляет `createRoute`, `getRouteStatus`, `getRouteResult`
и последовательный опрос `waitForRouteResult`:

```ts
import { createRoute, waitForRouteResult } from './src/api/route';

const controller = new AbortController();
const { query_id } = await createRoute({
  origin: 'MOW',
  destination: 'TYO',
  date_from: '2026-11-01',
  date_to: '2026-11-02',
}, {
  signal: controller.signal,
  // Необязательный ключ: сохраняйте его при повторе того же запроса.
  idempotencyKey: crypto.randomUUID(),
});

const { result } = await waitForRouteResult(query_id, {
  signal: controller.signal,
  pollInterval: 2000,
});
// result.routes содержит RankedRoute[], а не отдельные TicketOffer.
// controller.abort() отменяет HTTP-запрос и ожидание следующего опроса.
```

Ответ статуса сохраняет метаданные задачи и `failure`. Результат запрашивается
при `result_available`; ошибка задачи выбрасывается как `QueryFailedError`,
сохраняющий `failure.code`, `failure.message` и `failure.retryable`.
`getApiErrorMessage` форматирует сообщения HTTP 422 с путями проблемных полей.

Адаптер в `src/adapters/route.ts` сохраняет исходный RankedRoute, объединяет
сегменты всех его билетов для отображения, использует `total_cost` (включая визу),
валюту и `metrics.total_trip_hours`. Время показывается в часовом поясе аэропорта.
Интерфейс отображает пустые и частичные результаты и предупреждения сервера.

Тесты используют Axios Mock Adapter и примеры ответов по схеме, включая несколько
билетов, пропущенные optional-поля, ошибки и отмену. Они не требуют запущенного
бэкенда. В форме выбираются города из локального списка `src/data/cities.ts`:
Москва — `MOW`, Токио — `TYO`. В запрос передаются коды городов, а не отдельных
аэропортов. В предоставленной схеме нет метода поиска городов. Аэропорты в
найденных маршрутах по-прежнему показываются с их собственными кодами.
