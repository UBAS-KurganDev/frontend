// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, expect, it } from 'vitest';
import { api } from '../../api/api';
import { queryId } from '../../api/__tests__/fixtures';
import RouteClientTestPage from './RouteClientTestPage';

const mock = new MockAdapter(api);
afterEach(() => {
  cleanup();
  mock.reset();
});

it('submits only the four supported fields from the API test form', async () => {
  mock.onPost('/queries').reply(202, { query_id: queryId, status: 'queued', reused: false });
  render(<RouteClientTestPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Создать запрос' }));
  await waitFor(() => expect(mock.history.post).toHaveLength(1));
  expect(JSON.parse(mock.history.post[0].data)).toEqual({
    origin: 'MOW',
    destination: 'TYO',
    date_from: expect.any(String),
    date_to: expect.any(String),
  });
  await waitFor(() =>
    expect((screen.getByLabelText('Query ID') as HTMLInputElement).value).toBe(queryId),
  );
});
