import type { RankedRoute } from '../api/models';

export interface RouteSegment {
  departureCity: string;
  departureCode: string;
  departureTime: string; // ISO формат, напр.: "2026-10-18T06:00:00"
  departureTimeFormatted: string; // Для отображения: "18 окт, 06:00"

  arrivalCity: string;
  arrivalCode: string;
  arrivalTime: string;   // ISO формат, напр.: "2026-10-18T06:45:00"
  arrivalTimeFormatted: string; // Для отображения: "18 окт, 06:45"

  duration: string;      // Длительность перелёта, напр.: "2ч 45м"
}

export interface FlightRoute {
  id: string;
  segments: RouteSegment[];
  totalPrice: number;
  currency: string;
  totalDuration: string;
  transfersCount: number;
  rankedRoute: RankedRoute;
}
