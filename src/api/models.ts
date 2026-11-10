// UBAS Backend 0.1.0 (OpenAPI 3.1).
// Dates remain ISO strings; formats and numeric limits are validated by the backend.
/** Three uppercase letters: ^[A-Z]{3}$. */
export type Code = string;
/** Two uppercase letters: ^[A-Z]{2}$. */
export type CountryCode = string;
/** Number in [0, 1]. */
export type UnitScore = number;
/** Number >= 0. */
export type NonNegative = number;
/** Number > 0. */
export type PositiveHours = number;

export type QueryStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface RouteRequest {
  /** IATA departure city code, e.g. MOW. */
  origin: Code;
  /** IATA destination city code, e.g. TYO. */
  destination: Code;
  date_from: string;
  date_to: string;
}

export interface SubmitQueryResponse {
  query_id: string;
  status: QueryStatus;
  reused: boolean;
}

export interface QueryFailure {
  code: string;
  message: string;
  retryable?: boolean;
}

export interface GetQueryResponse {
  query_id: string;
  status: QueryStatus;
  created_at: string;
  updated_at: string;
  attempt: number;
  result_available: boolean;
  failure?: QueryFailure | null;
}

export interface Money {
  amount: string;
  /** Defaults to RUB when omitted. */
  currency?: Code;
}

export interface Airport {
  code: Code;
  city_code: Code;
  timezone: string;
}

export interface FlightSegment {
  origin: Airport;
  destination: Airport;
  departure_at: string;
  arrival_at: string;
  marketing_carrier: string;
  operating_carrier: string;
  flight_number: string;
}

/** Independently purchasable offer; total_price covers all passengers. */
export interface TicketOffer {
  provider: string;
  offer_id: string;
  /** One to four flight segments. */
  segments: FlightSegment[];
  total_price: Money | null;
  unknown_costs?: string[];
  passengers: number;
  cabin?: 'economy' | 'premium_economy' | 'business' | 'first';
  checked_baggage_included?: boolean | null;
  protected_connection?: boolean;
  booking_url?: string | null;
  fetched_at: string;
  expires_at?: string | null;
}

/** Entry permission for sightseeing, not merely airside transit. */
export interface VisaPolicy {
  citizenship?: CountryCode;
  status: 'allowed' | 'unavailable' | 'unknown';
  kind: 'visa_free' | 'on_arrival' | 'evisa' | 'advance' | 'unknown';
  fee_per_person?: Money | null;
  ease: UnitScore;
  processing_days: number;
  max_stay_hours: PositiveHours;
  verified_at: string;
  valid_until: string;
  source: string;
}

export interface CityProfile {
  city_code: Code;
  name: string;
  country_code: CountryCode;
  timezone: string;
  tourism_score: UnitScore;
  minimum_visit_hours?: PositiveHours;
  rewarding_visit_hours?: PositiveHours;
  hotel_per_night?: Money | null;
  visas: VisaPolicy[];
}

export interface VisitMetrics {
  stopover_hours: NonNegative;
  available_hours: NonNegative;
  daytime_hours: NonNegative;
  nighttime_hours: NonNegative;
  daytime_fraction: UnitScore;
  total_trip_hours: NonNegative;
  airport_change: boolean;
  self_transfer: boolean;
}

export interface CostComponent {
  key: string;
  kind: 'ticket' | 'visa';
  original?: Money | null;
  rub_amount?: string | null;
  unknown_reason?: string | null;
}

export interface Stopover {
  city_code: Code;
  arrival_airport: Airport;
  departure_airport: Airport;
  arrival_at: string;
  departure_at: string;
  duration_hours: PositiveHours;
  tourism_score: number;
  airport_change: boolean;
  self_transfer: boolean;
}

export interface RouteCandidate {
  id: string;
  kind?: 'stopover' | 'direct';
  tickets: TicketOffer[];
  stopovers?: Stopover[];
  costs?: CostComponent[];
  full_cost_known?: boolean;
  unknown_costs?: string[];
  total_trip_hours?: NonNegative;
  stopover?: CityProfile | null;
  visa?: VisaPolicy | null;
  ticket_cost: Money;
  visa_cost: Money;
  total_cost: Money;
  metrics?: VisitMetrics | null;
  warnings?: string[];
}

export interface ScoreComponent {
  name: string;
  value: UnitScore;
  weight: NonNegative;
  contribution: NonNegative;
}

export interface RouteScore {
  /** Number in [0, 100]. */
  total: number;
  components: ScoreComponent[];
}

export interface RankedRoute {
  route: RouteCandidate;
  score?: RouteScore | null;
}

export interface PlanResult {
  routes: RankedRoute[];
  searched_cities: string[];
  evaluated_candidates: number;
  rejected: Record<string, number>;
  complete: boolean;
  warnings: string[];
  generated_at: string;
}

export interface QueryResult {
  query_id: string;
  result: PlanResult;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface HTTPValidationError {
  detail?: ValidationError[];
}

export type CreateQueryResponse = SubmitQueryResponse;
export type QueryStatusResponse = GetQueryResponse;
