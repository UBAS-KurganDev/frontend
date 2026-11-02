# UBAS Frontend

React + TypeScript + Vite + shadcn/ui: поиск авиамаршрутов с пересадками.

## Запуск и проверки

```sh
npm ci
npm start
npm run build
npm run lint
npm test -- --run
npm run test:e2e
npm run format:check
```

## Интерфейс

Используется shadcn/ui (New York), Radix, Tailwind CSS 4 и Lucide. Оформление —
светлая тема с чёрными и серыми акцентами. Общие цвета, шрифты, радиусы и состояния
задаются в `src/styles/globals.css`; индивидуальные SCSS-модули заменены компонентами
и утилитами Tailwind.

- `src/components/ui/` — исходники общих компонентов shadcn, их MIT-лицензия лежит рядом.
- `src/components/CityAutocomplete/` — выбор города на Command/cmdk, с поиском и клавиатурой.
- `src/components/DatePicker/` — Calendar и Popover с русской локалью. В API уходят строки `YYYY-MM-DD` по местной дате.
- `src/components/RouteCard/` и `RouteDetails/` — карточка и диалог с составом билетов и доступными ссылками покупки.
- `src/components/WarningList/` — перевод предупреждений сервера и их вывод через Alert.
- `src/lib/` — объединение классов и общие форматтеры. Алиас `@/` указывает на `src/`.

Структура страниц сохранена: в App подключён SearchPage, служебная страница
RouteClientTestPage и прежний ExamScreen также оформлены через общий UI.

Новый общий компонент можно добавить командой `npm run ui:add -- tooltip`.
Конфигурация registry и путей — в `components.json`. Компоненты основаны на
[официальном реестре shadcn/ui](https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui)
и приведены к стилю проекта (2 пробела, одинарные кавычки, точки с запятой).
Для React 18 у Button сохранён forwardRef: он нужен для позиционирования Popover
и возврата фокуса. При обновлении исходников UI эту совместимость следует сохранять.

`npm run format` форматирует проект. Vitest проверяет API и интерфейс, а Playwright —
поиск, календари, диалог и отсутствие горизонтальной прокрутки на ширинах 1280 и 390 px.
В браузерных тестах ответы API подменяются: работающий бэкенд не требуется.
Используется `CHROMIUM_PATH`, системный `/usr/bin/chromium` или установленный браузер
Playwright. При отсутствии Chromium установите его командой `npx playwright install chromium`.

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
const { query_id } = await createRoute(
  {
    origin: 'MOW',
    destination: 'TYO',
    date_from: '2026-11-01',
    date_to: '2026-11-02',
  },
  {
    signal: controller.signal,
    // Необязательный ключ: сохраняйте его при повторе того же запроса.
    idempotencyKey: crypto.randomUUID(),
  },
);

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
