import type { CityOption } from '../types/city';

// Local catalog until the backend provides city autocomplete.
export const cities: readonly CityOption[] = [
  { cityName: 'Екатеринбург', countryName: 'Россия', cityCode: 'SVX' },
  { cityName: 'Москва', countryName: 'Россия', cityCode: 'MOW' },
  { cityName: 'Санкт-Петербург', countryName: 'Россия', cityCode: 'LED' },
  { cityName: 'Анталья', countryName: 'Турция', cityCode: 'AYT' },
  { cityName: 'Стамбул', countryName: 'Турция', cityCode: 'IST' },
  { cityName: 'Токио', countryName: 'Япония', cityCode: 'TYO' },
];
