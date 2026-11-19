export interface CityOption {
  cityName: string;
  countryName: string;
  /** IATA city/metropolitan code, e.g. MOW or TYO, rather than an airport code. */
  cityCode: string;
}

export interface CityRequestOptions {
  signal?: AbortSignal;
}

export interface CitySearchOptions extends CityRequestOptions {
  /** Maximum number of suggestions; defaults to 20. */
  limit?: number;
}

/** The UI depends on this contract, not on a particular catalog or transport. */
export interface CityRepository {
  search(query: string, options?: CitySearchOptions): Promise<CityOption[]>;
  getByCodes(cityCodes: readonly string[], options?: CityRequestOptions): Promise<CityOption[]>;
}
