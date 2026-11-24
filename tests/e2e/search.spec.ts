import { expect, test } from '@playwright/test';
import { queryId, queryResult, queryStatus } from '../../src/api/__tests__/fixtures';

test('finds new catalog cities by English aliases and submits their city codes', async ({
  page,
}) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/v1/queries', async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: { query_id: queryId, status: 'queued', reused: false } });
  });
  await page.route(`**/api/v1/queries/${queryId}`, (route) =>
    route.fulfill({
      json: { ...queryStatus, status: 'completed', result_available: true },
    }),
  );
  await page.route(`**/api/v1/queries/${queryId}/result`, (route) =>
    route.fulfill({
      json: {
        ...queryResult,
        result: { ...queryResult.result, routes: [], warnings: [], complete: true },
      },
    }),
  );
  await page.goto('/');
  const origin = page.getByRole('combobox', { name: 'Откуда', exact: true });
  await origin.fill('Doha');
  await page.getByRole('option', { name: /Доха.*DOH/ }).click();
  const destination = page.getByRole('combobox', { name: 'Куда', exact: true });
  await destination.fill('London');
  await page.getByRole('option', { name: /Лондон.*LON/ }).click();
  await expect(origin).toHaveValue('Доха (DOH)');
  await expect(destination).toHaveValue('Лондон (LON)');
  await page.getByRole('button', { name: 'Найти билеты', exact: true }).click();
  await expect(page.getByText('Маршруты по заданным параметрам не найдены.')).toBeVisible();
  expect(submitted).toMatchObject({ origin: 'DOH', destination: 'LON' });
});

test('searches by cities, uses Russian calendars, and opens route details', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let submitted: Record<string, unknown> | undefined;
  const response = structuredClone(queryResult);
  response.result.complete = true;
  response.result.warnings = ['synthetic_demo_data'];
  response.result.routes[0].route.warnings = [
    'hotel_and_ground_transport_not_included',
    'unprotected_connection',
  ];

  await page.route('**/api/v1/queries', async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: { query_id: queryId, status: 'queued', reused: false } });
  });
  await page.route(`**/api/v1/queries/${queryId}`, (route) =>
    route.fulfill({
      json: { ...queryStatus, status: 'completed', result_available: true },
    }),
  );
  await page.route(`**/api/v1/queries/${queryId}/result`, (route) =>
    route.fulfill({ json: response }),
  );

  await page.clock.setFixedTime(new Date('2026-11-01T21:30:00Z'));
  await page.goto('/');
  await expect(page).toHaveTitle('UBAS — поиск авиабилетов');
  await expect(page.getByRole('button', { name: /^Дата с:/ })).toHaveAccessibleName(
    'Дата с: 2 ноября 2026',
  );
  await page.getByRole('combobox', { name: 'Откуда', exact: true }).fill('Москва');
  await page.getByRole('option', { name: /Москва/ }).click();
  const destination = page.getByRole('combobox', { name: 'Куда', exact: true });
  await destination.fill('TYO');
  await destination.press('ArrowDown');
  await destination.press('Enter');
  await expect(destination).toHaveValue('Токио (TYO)');

  await page.getByRole('button', { name: /^Дата с:/ }).click();
  await page
    .locator('[data-slot="popover-content"][data-state="open"]')
    .getByRole('button', { name: /, 6 ноября/ })
    .click();
  await page.getByRole('button', { name: /^Дата по:/ }).click();
  await page
    .locator('[data-slot="popover-content"][data-state="open"]')
    .getByRole('button', { name: /, 9 ноября/ })
    .click();
  await page.getByRole('button', { name: 'Найти билеты', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Найденные маршруты (1)' })).toBeVisible();
  expect(submitted).toMatchObject({
    origin: 'MOW',
    destination: 'TYO',
    date_from: '2026-11-06',
    date_to: '2026-11-09',
  });
  await expect(page.getByText('Пересадка не защищена перевозчиком.')).toBeVisible();
  await expect(page.getByText('synthetic_demo_data')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const itinerary = page.getByRole('region', { name: 'Перелёты и пересадки' });
  const flights = itinerary.getByRole('listitem', { name: /^Перелёт / });
  const transfers = itinerary.getByRole('listitem', { name: /^Пересадка / });
  const flightBoxes = await flights.evaluateAll((items) =>
    items.map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  const transferWidths = await transfers.evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().width),
  );
  expect(flightBoxes).toHaveLength(3);
  expect(flightBoxes[0].x).toBeLessThan(flightBoxes[1].x);
  expect(flightBoxes[1].x).toBeLessThan(flightBoxes[2].x);
  for (const box of flightBoxes) {
    expect(box.y).toBe(flightBoxes[0].y);
    expect(box.width).toBeCloseTo(flightBoxes[0].width, 1);
    expect(box.height).toBe(flightBoxes[0].height);
  }
  expect(transferWidths).toEqual([90, 90]);
  const scrollable = await itinerary.evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  expect(scrollable).toBe(info.project.name === 'mobile');

  await page.screenshot({ path: `/tmp/ubas-shadcn-${info.project.name}.png`, fullPage: true });
  if (scrollable) {
    await itinerary.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    const end = await flights.last().boundingBox();
    expect(end!.x + end!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  await page.getByRole('button', { name: 'Выбрать', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Детали маршрута' })).toBeVisible();
  await expect(page.getByText('Билет 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Билет 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Выбрать', exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});

test('shows validation errors and an empty result', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-01T21:30:00Z'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Найти билеты' }).click();
  await expect(page.getByRole('alert')).toContainText('выберите город');
  await page.route('**/api/v1/queries', (route) =>
    route.fulfill({ json: { query_id: queryId, status: 'queued', reused: false } }),
  );
  await page.route(`**/api/v1/queries/${queryId}`, (route) =>
    route.fulfill({ json: { ...queryStatus, status: 'completed', result_available: true } }),
  );
  await page.route(`**/api/v1/queries/${queryId}/result`, (route) =>
    route.fulfill({
      json: {
        ...queryResult,
        result: { ...queryResult.result, routes: [], warnings: [], complete: true },
      },
    }),
  );
  await page.getByRole('combobox', { name: 'Откуда', exact: true }).fill('MOW');
  await page.getByRole('option', { name: /Москва/ }).click();
  await page.getByRole('combobox', { name: 'Куда', exact: true }).fill('TYO');
  await page.getByRole('option', { name: /Токио/ }).click();
  await page.getByRole('button', { name: 'Найти билеты' }).click();
  await expect(page.getByText('Маршруты по заданным параметрам не найдены.')).toBeVisible();
});
