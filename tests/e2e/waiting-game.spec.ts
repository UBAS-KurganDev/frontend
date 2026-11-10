import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { queryId, queryResult, queryStatus } from '../../src/api/__tests__/fixtures';

async function startSearch(page: Page) {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Откуда', exact: true }).fill('MOW');
  await page.getByRole('option', { name: /Москва/ }).click();
  await page.getByRole('combobox', { name: 'Куда', exact: true }).fill('TYO');
  await page.getByRole('option', { name: /Токио/ }).click();
  await page.getByRole('button', { name: 'Найти билеты', exact: true }).click();
}

async function swipeUp(page: Page, board: Locator) {
  await board.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const box = await board.boundingBox();
  if (!box) throw new Error('Game board is not visible.');
  const session = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const startY = box.y + box.height * 0.75;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: startY, id: 0 }],
  });
  for (let step = 1; step <= 5; step++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: startY - (box.height * 0.5 * step) / 5, id: 0 }],
    });
    await page.waitForTimeout(25);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  await session.detach();
}

test('plays while polling and keeps the party when results arrive', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let complete = false;
  let polls = 0;
  let gameRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/2048.html')) gameRequests++;
  });
  await page.route('**/api/v1/queries', (route) =>
    route.fulfill({
      status: 202,
      json: { query_id: queryId, status: 'queued', reused: false },
    }),
  );
  await page.route(`**/api/v1/queries/${queryId}`, (route) => {
    polls++;
    return route.fulfill({
      json: {
        ...queryStatus,
        status: complete ? 'completed' : 'running',
        result_available: complete,
      },
    });
  });
  await page.route(`**/api/v1/queries/${queryId}/result`, (route) =>
    route.fulfill({ json: queryResult }),
  );
  await startSearch(page);
  await expect(page.getByText('Идёт поиск предложений...')).toBeVisible();
  expect(gameRequests).toBe(0);
  await page.getByRole('button', { name: 'Сыграть в 2048' }).click();
  const game = page.frameLocator('iframe[title="Игра 2048"]');
  await game.getByRole('button', { name: 'Начать игру', exact: true }).click();
  const board = game.locator('[class*="_board_"]');
  const focusArea = game.getByRole('group', { name: 'Поле 2048' });
  if (info.project.name === 'mobile') {
    await swipeUp(page, board);
  } else {
    await focusArea.focus();
    await page.keyboard.press('ArrowUp');
  }
  const score = game.locator('[class*="_score_"] > div');
  await expect(score).toHaveText('4');
  await expect(game.locator('[class*="_tile_"]').filter({ hasText: /^4$/ })).toBeVisible();
  await expect.poll(() => polls).toBeGreaterThan(1);
  const tilesBefore = await game
    .locator('[class*="_tile_"]')
    .evaluateAll((tiles) =>
      tiles.map((tile) => ({ text: tile.textContent, style: tile.getAttribute('style') })),
    );
  await page.getByRole('button', { name: 'Скрыть игру' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(score).toHaveText('4');
  expect(
    await game
      .locator('[class*="_tile_"]')
      .evaluateAll((tiles) =>
        tiles.map((tile) => ({ text: tile.textContent, style: tile.getAttribute('style') })),
      ),
  ).toEqual(tilesBefore);
  await focusArea.focus();
  await page.keyboard.press('Tab');
  await expect(game.getByRole('button', { name: 'Новая игра', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('IFRAME');
  complete = true;
  await expect(page.getByRole('heading', { name: 'Найденные маршруты (1)' })).toBeVisible();
  await expect(page.getByText('Поиск завершён. Ваша партия сохранена.')).toBeVisible();
  await expect(score).toHaveText('4');
  await page.getByRole('button', { name: 'Посмотреть результаты' }).click();
  await expect(page.locator('iframe[title="Игра 2048"]')).toBeHidden();
  await expect(page.locator('[aria-label="Результаты поиска"]')).toBeFocused();
  await page.getByRole('button', { name: 'Продолжить 2048' }).click();
  await expect(score).toHaveText('4');
  expect(gameRequests).toBe(1);
  if (info.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 740 });
    await expect(score).toHaveText('4');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(
    await game.locator('html').evaluate((element) => element.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.locator('iframe[title="Игра 2048"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('waiting-2048.png'), fullPage: true });
  await focusArea.focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('iframe[title="Игра 2048"]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Продолжить 2048' })).toBeFocused();
  expect(errors).toEqual([]);
});

test('search failure does not remove the game or prevent another search', async ({ page }) => {
  let failed = false;
  await page.route('**/api/v1/queries', (route) =>
    route.fulfill({
      status: 202,
      json: { query_id: queryId, status: 'queued', reused: false },
    }),
  );
  await page.route(`**/api/v1/queries/${queryId}`, (route) =>
    route.fulfill({
      json: {
        ...queryStatus,
        status: failed ? 'failed' : 'running',
        failure: failed
          ? { code: 'provider_error', message: 'Источник временно недоступен.' }
          : null,
      },
    }),
  );
  await startSearch(page);
  await page.getByRole('button', { name: 'Сыграть в 2048' }).click();
  const game = page.frameLocator('iframe[title="Игра 2048"]');
  await game.getByRole('button', { name: 'Начать игру', exact: true }).click();
  failed = true;
  await expect(page.getByText('Источник временно недоступен.')).toBeVisible();
  await expect(page.getByText(/Можно продолжить игру или повторить поиск/)).toBeVisible();
  await expect(page.locator('iframe[title="Игра 2048"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Найти билеты', exact: true })).toBeEnabled();
});

test('keeps the board alive when the next move arrives before delayed animation cleanup', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Math.random = () => 0;
    const schedule = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) =>
      schedule(handler, delay === 100 ? 700 : delay, ...args)) as typeof window.setTimeout;
  });
  await page.goto('/2048.html');
  await page.getByRole('button', { name: 'Начать игру', exact: true }).click();
  const focusArea = page.getByRole('group', { name: 'Поле 2048' });
  await focusArea.focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[class*="_score_"] > div')).toHaveText('4');
  // The library's old 105ms throttle allowed this move before its 700ms cleanup.
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(800);
  await expect(page.locator('[class*="_board_"]')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('[class*="_tile_"]')).toHaveCount(2);
  // A no-op must release the guard as well, rather than freezing all later input.
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(800);
  }
  await expect(page.locator('[class*="_board_"]')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.locator('[class*="_tile_"]').count()).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Новая игра', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Начать игру', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
