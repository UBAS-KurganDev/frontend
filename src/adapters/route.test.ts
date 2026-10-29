import { describe, expect, it } from 'vitest';
import { queryResult } from '../api/__tests__/fixtures';
import { mapRankedRouteToFlightRoute } from './route';

describe('route presentation', () => {
  it('combines every ticket and uses the route total including visas for all passengers', () => {
    const rankedRoute = queryResult.result.routes[0];
    const route = mapRankedRouteToFlightRoute(rankedRoute);
    expect(route.id).toBe('route-via-istanbul');
    expect(route.segments.map((segment) => segment.departureCode)).toEqual(['SVX', 'IST', 'FRA']);
    expect(route.totalPrice).toBe(340);
    expect(route.currency).toBe('EUR');
    expect(route.totalDuration).toBe('34ч 0м');
    expect(route.transfersCount).toBe(2);
    expect(route.rankedRoute).toBe(rankedRoute);
  });

  it('formats airport-local dates and uses the stopover city name', () => {
    const route = mapRankedRouteToFlightRoute(queryResult.result.routes[0]);
    expect(route.segments[0].departureTimeFormatted).toContain('06:00');
    expect(route.segments[0].arrivalTimeFormatted).toContain('08:00');
    expect(route.segments[0].duration).toBe('4ч 0м');
    expect(route.segments[0].arrivalCity).toBe('Стамбул');
    expect(route.segments[2].arrivalCity).toBe('PAR');
  });

  it('uses the Money schema default when currency is omitted', () => {
    const rankedRoute = structuredClone(queryResult.result.routes[0]);
    rankedRoute.route.total_cost = { amount: '100.50' };
    expect(mapRankedRouteToFlightRoute(rankedRoute)).toMatchObject({ totalPrice: 100.5, currency: 'RUB' });
  });

  it('keeps the ISO timestamp if an airport timezone is unsupported', () => {
    const rankedRoute = structuredClone(queryResult.result.routes[0]);
    const segment = rankedRoute.route.tickets[0].segments[0];
    segment.origin.timezone = 'Unsupported/Timezone';
    expect(mapRankedRouteToFlightRoute(rankedRoute).segments[0].departureTimeFormatted).toBe(segment.departure_at);
  });
});
