import { describe, expect, it } from 'vitest';
import snapshot from '../../scraper-airports-2026-11-10.json';
import { createLocalCityRepository } from './local-city-repository';

const repository = createLocalCityRepository();

describe('local city repository', () => {
  it('covers every snapshot city once, with a Russian label and country', async () => {
    const codes = snapshot.cities.map((city) => city.code);
    const cities = await repository.getByCodes(codes);
    expect(cities).toHaveLength(codes.length);
    expect(new Set(cities.map((city) => city.cityCode))).toEqual(new Set(codes));
    expect(cities.length).toBeGreaterThan(snapshot.covered_cities.length);
    for (const city of cities) {
      expect(city.cityName).toMatch(/[А-Яа-яЁё]/);
      expect(city.countryName).toMatch(/[А-Яа-яЁё]/);
    }
  });

  it('retains every original English city name as a search alias', async () => {
    for (const city of snapshot.cities) {
      const matches = await repository.search(city.name, { limit: snapshot.cities.length });
      expect(
        matches.some((match) => match.cityCode === city.code),
        city.code,
      ).toBe(true);
    }
  });

  it.each([
    ['  мОсКвА  ', 'MOW', 'Москва'],
    ['Tokyo', 'TYO', 'Токио'],
    ['tyo', 'TYO', 'Токио'],
    ['Нижний Новгород', 'GOJ', 'Нижний Новгород'],
    ['Санкт Петербург', 'LED', 'Санкт-Петербург'],
    ['New York', 'NYC', 'Нью-Йорк'],
    ['Дох', 'DOH', 'Доха'],
    ['Лондон', 'LON', 'Лондон'],
    ['Париж', 'PAR', 'Париж'],
  ])('finds %s and prioritizes its city code', async (query, cityCode, cityName) => {
    expect((await repository.search(query))[0]).toMatchObject({ cityCode, cityName });
  });

  it('never treats individual airports as extra cities', async () => {
    for (const code of ['SVO', 'DME', 'VKO', 'ZIA', 'NRT', 'HND', 'LHR', 'LGW', 'CDG']) {
      expect(await repository.search(code)).toEqual([]);
    }
    expect(await repository.getByCodes(['mow', ' MOW ', 'TYO', 'SVO', 'ZZZ'])).toEqual([
      { cityCode: 'MOW', cityName: 'Москва', countryName: 'Россия' },
      { cityCode: 'TYO', cityName: 'Токио', countryName: 'Япония' },
    ]);
  });

  it('limits initial suggestions without limiting code lookup', async () => {
    expect(await repository.search('')).toHaveLength(20);
    expect(await repository.search('', { limit: 3 })).toHaveLength(3);
    const cities = await repository.getByCodes(snapshot.cities.map((city) => city.code));
    expect(cities).toHaveLength(snapshot.cities.length);
    expect(await repository.getByCodes([])).toEqual([]);
  });

  it('rejects aborted operations and invalid limits', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(repository.search('Москва', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    await expect(
      repository.getByCodes(['MOW'], { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(repository.search('Москва', { limit: 0 })).rejects.toBeInstanceOf(RangeError);
  });

  it('does not allow a returned option to mutate the private catalog', async () => {
    const [city] = await repository.search('Москва');
    city.cityName = 'Изменено';
    expect((await repository.getByCodes(['MOW']))[0].cityName).toBe('Москва');
  });
});
