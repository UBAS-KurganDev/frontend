import type { GetQueryResponse, QueryResult, RouteRequest, VisaPolicy } from '../models';

export const queryId = '123e4567-e89b-42d3-a456-426614174000';
export const request: RouteRequest = {
  origin: 'SVX', destination: 'PAR', date_from: '2026-11-01', date_to: '2026-11-02',
  passengers: 2, currency: 'EUR', budget: '500.50',
};

export const queryStatus: GetQueryResponse = {
  query_id: queryId, status: 'queued',
  created_at: '2026-10-23T12:00:00Z', updated_at: '2026-10-23T12:00:00Z',
  attempt: 0, result_available: false,
};

const visa: VisaPolicy = {
  status: 'allowed', kind: 'evisa', ease: 0.8, processing_days: 1,
  max_stay_hours: 72, verified_at: '2026-10-01', valid_until: '2026-12-31',
  source: 'test fixture',
};

const svx = { code: 'SVX', city_code: 'SVX', timezone: 'Asia/Yekaterinburg' };
const ist = { code: 'IST', city_code: 'IST', timezone: 'Europe/Istanbul' };
const fra = { code: 'FRA', city_code: 'FRA', timezone: 'Europe/Berlin' };
const cdg = { code: 'CDG', city_code: 'PAR', timezone: 'Europe/Paris' };

// Optional/defaulted fields are deliberately omitted, as permitted by OpenAPI.
export const queryResult: QueryResult = {
  query_id: queryId,
  result: {
    routes: [{
      route: {
        id: 'route-via-istanbul',
        tickets: [{
          provider: 'provider-a', offer_id: 'ticket-a', passengers: 2,
          total_price: { amount: '100', currency: 'EUR' },
          fetched_at: '2026-10-23T12:00:00Z', expires_at: '2026-10-23T13:00:00Z',
          segments: [{
            origin: svx, destination: ist,
            departure_at: '2026-11-01T06:00:00+05:00', arrival_at: '2026-11-01T08:00:00+03:00',
            marketing_carrier: 'TK', operating_carrier: 'TK', flight_number: '101',
          }],
        }, {
          provider: 'provider-b', offer_id: 'ticket-b', passengers: 2,
          total_price: { amount: '200', currency: 'EUR' },
          checked_baggage_included: null, booking_url: null,
          fetched_at: '2026-10-23T12:00:00Z', expires_at: '2026-10-23T13:00:00Z',
          segments: [{
            origin: ist, destination: fra,
            departure_at: '2026-11-02T10:00:00+03:00', arrival_at: '2026-11-02T11:00:00+01:00',
            marketing_carrier: 'LH', operating_carrier: 'LH', flight_number: '102',
          }, {
            origin: fra, destination: cdg,
            departure_at: '2026-11-02T11:30:00+01:00', arrival_at: '2026-11-02T12:00:00+01:00',
            marketing_carrier: 'LH', operating_carrier: 'LH', flight_number: '103',
          }],
        }],
        stopover: {
          city_code: 'IST', name: 'Стамбул', country_code: 'TR',
          timezone: 'Europe/Istanbul', tourism_score: 0.9, visas: [visa],
        },
        visa,
        ticket_cost: { amount: '300', currency: 'EUR' },
        visa_cost: { amount: '40', currency: 'EUR' },
        total_cost: { amount: '340', currency: 'EUR' },
        metrics: {
          stopover_hours: 26, available_hours: 22, daytime_hours: 14, nighttime_hours: 8,
          daytime_fraction: 14 / 22, total_trip_hours: 34,
          airport_change: false, self_transfer: true,
        },
      },
      score: { total: 87.5, components: [{ name: 'cost', value: 0.9, weight: 1, contribution: 0.9 }] },
    }],
    searched_cities: ['IST'], evaluated_candidates: 2, rejected: { visa: 1 },
    complete: false, warnings: ['Часть поставщиков недоступна.'],
    generated_at: '2026-10-23T12:05:00Z',
  },
};
