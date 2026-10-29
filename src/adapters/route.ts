import type { Airport, RankedRoute } from '../api/models';
import type { FlightRoute } from '../types/route';

function formatDate(isoString: string, timeZone: string): string {
  try {
    return new Date(isoString).toLocaleString('ru-RU', {
      timeZone,
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    // Keep the explicit ISO offset if the browser does not support this timezone.
    return isoString;
  }
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;
}

export function mapRankedRouteToFlightRoute(rankedRoute: RankedRoute): FlightRoute {
  const { route } = rankedRoute;
  const cityName = (airport: Airport) => airport.city_code === route.stopover.city_code
    ? route.stopover.name : airport.city_code;
  const segments = route.tickets.flatMap((ticket) => ticket.segments.map((segment) => ({
    departureCity: cityName(segment.origin),
    departureCode: segment.origin.code,
    departureTime: segment.departure_at,
    departureTimeFormatted: formatDate(segment.departure_at, segment.origin.timezone),
    arrivalCity: cityName(segment.destination),
    arrivalCode: segment.destination.code,
    arrivalTime: segment.arrival_at,
    arrivalTimeFormatted: formatDate(segment.arrival_at, segment.destination.timezone),
    duration: formatMinutes(Math.max(0, Math.round(
      (Date.parse(segment.arrival_at) - Date.parse(segment.departure_at)) / 60000,
    ))),
  })));

  return {
    id: route.id,
    segments,
    totalPrice: Number(route.total_cost.amount),
    currency: route.total_cost.currency ?? 'RUB',
    totalDuration: formatMinutes(Math.round(route.metrics.total_trip_hours * 60)),
    transfersCount: Math.max(0, segments.length - 1),
    // Keep ticket boundaries, costs, visa data, warnings and ranking available to the UI.
    rankedRoute,
  };
}
