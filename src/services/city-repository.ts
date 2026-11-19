import type { CityRepository } from '../types/city';
import { createLocalCityRepository } from './local-city-repository';

// Replace this binding with an HTTP implementation when the backend contract is available.
export const cityRepository: CityRepository = createLocalCityRepository();
