import { cityRecords } from '../data/cities';
import type { CityOption, CityRepository } from '../types/city';

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Build the local index once. The contract is asynchronous for a future HTTP provider. */
export function createLocalCityRepository(): CityRepository {
  const countries = new Intl.DisplayNames(['ru'], { type: 'region' });
  const collator = new Intl.Collator('ru');
  const entries = cityRecords
    .map((city) => ({
      option: {
        cityCode: city.code,
        cityName: city.name_ru,
        countryName: countries.of(city.country_code) ?? city.country_code,
      },
      names: [normalize(city.name_ru), normalize(city.name)],
      code: normalize(city.code),
    }))
    .sort((left, right) => collator.compare(left.option.cityName, right.option.cityName));
  const byCode = new Map(entries.map((entry) => [entry.option.cityCode, entry.option]));

  return {
    async search(query, { signal, limit = 20 } = {}) {
      signal?.throwIfAborted();
      if (!Number.isInteger(limit) || limit < 1) {
        throw new RangeError('City search limit must be a positive integer.');
      }
      const search = normalize(query);
      const words = search.split(' ').filter(Boolean);
      const rank = (entry: (typeof entries)[number]) => {
        if (entry.code === search) return 0;
        if (entry.names.includes(search)) return 1;
        if (entry.code.startsWith(search) || entry.names.some((name) => name.startsWith(search)))
          return 2;
        return 3;
      };
      return entries
        .filter((entry) =>
          words.every(
            (word) => entry.code.includes(word) || entry.names.some((name) => name.includes(word)),
          ),
        )
        .sort((left, right) => rank(left) - rank(right))
        .slice(0, limit)
        .map((entry) => ({ ...entry.option }));
    },

    async getByCodes(cityCodes, { signal } = {}) {
      signal?.throwIfAborted();
      const codes = new Set(cityCodes.map((code) => code.trim().toUpperCase()));
      return [...codes].flatMap((code) => {
        const city: CityOption | undefined = byCode.get(code);
        return city ? [{ ...city }] : [];
      });
    },
  };
}
