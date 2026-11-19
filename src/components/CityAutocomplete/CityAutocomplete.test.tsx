// @vitest-environment jsdom
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CityOption, CityRepository } from '../../types/city';
import { CityAutocomplete } from './CityAutocomplete';

const moscow: CityOption = { cityCode: 'MOW', cityName: 'Москва', countryName: 'Россия' };
const tokyo: CityOption = { cityCode: 'TYO', cityName: 'Токио', countryName: 'Япония' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function Harness({ repository }: { repository: CityRepository }) {
  const [city, setCity] = useState<CityOption | null>(null);
  return (
    <>
      <CityAutocomplete label="Город" value={city} onChange={setCity} repository={repository} />
      <output aria-label="Выбранный город">{city?.cityCode}</output>
    </>
  );
}

afterEach(cleanup);

describe('CityAutocomplete repository boundary', () => {
  it('can use a different provider without knowing its data format', async () => {
    const user = userEvent.setup();
    const option = { cityCode: 'ZZZ', cityName: 'Тестовый город', countryName: 'Тестовая страна' };
    const repository: CityRepository = {
      search: vi.fn(async () => [option]),
      getByCodes: vi.fn(async () => []),
    };
    render(<Harness repository={repository} />);
    await user.type(screen.getByRole('combobox', { name: 'Город' }), 'тест');
    await user.click(await screen.findByRole('option', { name: /Тестовый город/ }));
    expect(screen.getByRole('combobox', { name: 'Город' })).toHaveValue('Тестовый город (ZZZ)');
    expect(screen.getByLabelText('Выбранный город')).toHaveTextContent('ZZZ');
    expect(repository.search).toHaveBeenLastCalledWith(
      'тест',
      expect.objectContaining({ limit: 20, signal: expect.any(AbortSignal) }),
    );
  });

  it('cancels the previous query and ignores its late result even if a provider ignores abort', async () => {
    const first = deferred<CityOption[]>();
    const second = deferred<CityOption[]>();
    const search = vi.fn<CityRepository['search']>((query) => {
      if (query === 'Мос') return first.promise;
      if (query === 'Ток') return second.promise;
      return Promise.resolve([]);
    });
    render(<Harness repository={{ search, getByCodes: async () => [] }} />);
    const input = screen.getByRole('combobox', { name: 'Город' });
    fireEvent.change(input, { target: { value: 'Мос' } });
    const previousSignal = search.mock.calls.find(([query]) => query === 'Мос')?.[1]?.signal;
    expect(screen.getByText('Ищем города...')).toBeVisible();
    fireEvent.change(input, { target: { value: 'Ток' } });
    expect(previousSignal?.aborted).toBe(true);
    await act(async () => second.resolve([tokyo]));
    expect(await screen.findByRole('option', { name: /Токио/ })).toBeVisible();
    await act(async () => first.resolve([moscow]));
    expect(screen.queryByRole('option', { name: /Москва/ })).toBeNull();
    expect(screen.getByRole('option', { name: /Токио/ })).toBeVisible();
  });

  it('shows a recoverable provider error instead of a false empty result', async () => {
    const search = vi
      .fn<CityRepository['search']>()
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValue([moscow]);
    render(<Harness repository={{ search, getByCodes: async () => [] }} />);
    fireEvent.focus(screen.getByRole('combobox', { name: 'Город' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить города.');
    expect(screen.queryByText('Города не найдены.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(await screen.findByRole('option', { name: /Москва/ })).toBeVisible();
  });

  it('removes previously loaded options while a different query is pending', async () => {
    const pending = deferred<CityOption[]>();
    const search = vi.fn<CityRepository['search']>((query) =>
      query === 'Ток' ? pending.promise : Promise.resolve([moscow]),
    );
    render(<Harness repository={{ search, getByCodes: async () => [] }} />);
    const input = screen.getByRole('combobox', { name: 'Город' });
    fireEvent.change(input, { target: { value: 'Мос' } });
    await screen.findByRole('option', { name: /Москва/ });
    fireEvent.change(input, { target: { value: 'Ток' } });
    expect(screen.queryByRole('option', { name: /Москва/ })).toBeNull();
    expect(screen.getByText('Ищем города...')).toBeVisible();
    await act(async () => pending.resolve([tokyo]));
    expect(await screen.findByRole('option', { name: /Токио/ })).toBeVisible();
  });

  it('aborts a pending lookup on unmount without selecting its late result', async () => {
    const pending = deferred<CityOption[]>();
    const search = vi.fn<CityRepository['search']>(() => pending.promise);
    const onChange = vi.fn();
    const { unmount } = render(
      <CityAutocomplete
        label="Город"
        value={null}
        onChange={onChange}
        repository={{ search, getByCodes: async () => [] }}
      />,
    );
    fireEvent.focus(screen.getByRole('combobox', { name: 'Город' }));
    const signal = search.mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => pending.resolve([moscow]));
    expect(onChange).not.toHaveBeenCalled();
  });
});
