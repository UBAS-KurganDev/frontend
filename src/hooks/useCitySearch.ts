import { useCallback, useEffect, useState } from 'react';
import type { CityOption, CityRepository } from '../types/city';

interface SearchState {
  query: string;
  items: CityOption[];
  loading: boolean;
  failed: boolean;
}

export function useCitySearch(query: string, active: boolean, repository: CityRepository) {
  const [state, setState] = useState<SearchState>({
    query,
    items: [],
    loading: false,
    failed: false,
  });
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let cancelled = false;
    setState({ query, items: [], loading: true, failed: false });

    void (async () => {
      try {
        const items = await repository.search(query, { signal: controller.signal, limit: 20 });
        if (!cancelled && !controller.signal.aborted) {
          setState({ query, items, loading: false, failed: false });
        }
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setState({ query, items: [], loading: false, failed: true });
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [query, active, repository, revision]);

  // Do not leave old options selectable while their replacement is loading.
  const current = state.query === query;
  return {
    items: current ? state.items : [],
    loading: active && (!current || state.loading),
    failed: current && state.failed,
    retry,
  };
}
