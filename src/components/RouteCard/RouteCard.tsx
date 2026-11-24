import { Fragment } from 'react';
import { ArrowRight, Clock3, ShieldAlert } from 'lucide-react';
import type { FlightRoute, LocalFlightTime } from '../../types/route';
import { RouteCost, RouteCostBreakdown } from '../RouteCost/RouteCost';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Separator } from '../ui/separator';
import { WarningList } from '../WarningList/WarningList';

interface Props {
  route: FlightRoute;
  onSelect?: () => void;
}

const calculateLayover = (arrivalIso: string, departureIso: string): string => {
  const minutes = Math.max(
    0,
    Math.floor((Date.parse(departureIso) - Date.parse(arrivalIso)) / 60000),
  );
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes / 60) % 24;
  const remainder = minutes % 60;
  return [days > 0 ? `${days}д` : '', `${hours}ч`, remainder > 0 ? `${remainder}м` : '']
    .filter(Boolean)
    .join(' ');
};

function FlightTime({ timestamp, localTime }: { timestamp: string; localTime: LocalFlightTime }) {
  return (
    <time dateTime={timestamp} className="block min-w-0">
      {localTime.date && (
        <span className="block text-sm text-muted-foreground">{localTime.date}</span>
      )}
      <span className="block text-2xl leading-tight font-semibold tracking-tight wrap-anywhere tabular-nums">
        {localTime.time}
      </span>
    </time>
  );
}

function FlightCity({ city, airportCode }: { city: string; airportCode: string }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-sm leading-tight font-medium wrap-anywhere">{city}</p>
      <p className="text-xs text-muted-foreground">{airportCode}</p>
    </div>
  );
}

export function RouteCard({ route, onSelect }: Props) {
  const candidate = route.rankedRoute.route;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent
        className="overflow-x-auto px-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        role="region"
        aria-label="Перелёты и пересадки"
        tabIndex={0}
      >
        <ol className="flex list-none" role="list">
          {route.segments.map((segment, index) => {
            const nextSegment = route.segments[index + 1];
            const airportChange = nextSegment && segment.arrivalCode !== nextSegment.departureCode;
            return (
              <Fragment key={`${segment.departureCode}-${segment.departureTime}-${index}`}>
                <li
                  aria-label={`Перелёт ${segment.departureCity} — ${segment.arrivalCity}`}
                  className="min-h-38 min-w-0 shrink-0 grow basis-60 space-y-[11.5px] px-3.5 py-7"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(3.25rem,0.72fr)_minmax(0,1fr)] items-start gap-2.5">
                    <FlightTime
                      timestamp={segment.departureTime}
                      localTime={segment.departureLocalTime}
                    />
                    <div className="space-y-0.5 self-end text-center text-muted-foreground">
                      <p className="text-xs whitespace-nowrap tabular-nums">{segment.duration}</p>
                      <div className="flex items-center" aria-hidden="true">
                        <span className="h-px flex-1 bg-border" />
                        <ArrowRight className="-ml-1 size-4 shrink-0" />
                      </div>
                    </div>
                    <div className="min-w-0 text-right">
                      <FlightTime
                        timestamp={segment.arrivalTime}
                        localTime={segment.arrivalLocalTime}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 [&>:last-child]:text-right">
                    <FlightCity city={segment.departureCity} airportCode={segment.departureCode} />
                    <FlightCity city={segment.arrivalCity} airportCode={segment.arrivalCode} />
                  </div>
                </li>
                {nextSegment && (
                  <li
                    aria-label={`Пересадка в г. ${segment.arrivalCity}`}
                    className="flex w-22.5 shrink-0 flex-col items-center gap-1.5 border-x bg-muted/70 px-2 py-7 text-center"
                  >
                    <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
                    <p className="text-xs text-muted-foreground">Пересадка</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {calculateLayover(segment.arrivalTime, nextSegment.departureTime)}
                    </p>
                    {airportChange && (
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <p>Смена аэропорта</p>
                        <p className="font-medium text-foreground">
                          {segment.arrivalCode} → {nextSegment.departureCode}
                        </p>
                      </div>
                    )}
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-col items-stretch gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">Общее время: {route.totalDuration}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {route.transfersCount === 0 ? 'Прямой рейс' : `Пересадок: ${route.transfersCount}`}
            </Badge>
            {route.rankedRoute.score && (
              <Badge variant="outline">
                Оценка маршрута:{' '}
                {route.rankedRoute.score.total.toLocaleString('ru-RU', {
                  maximumFractionDigits: 1,
                })}{' '}
                / 100
              </Badge>
            )}
            {(candidate.metrics?.self_transfer ||
              candidate.stopovers?.some((stopover) => stopover.self_transfer)) && (
              <Badge variant="outline" className="gap-1">
                <ShieldAlert className="size-3" aria-hidden="true" />
                Самостоятельная пересадка
              </Badge>
            )}
          </div>
          <RouteCostBreakdown route={candidate} />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-3">
          <RouteCost route={candidate} />
          <Button type="button" onClick={onSelect}>
            Выбрать
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </CardFooter>
      {candidate.warnings?.length ? (
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <WarningList warnings={candidate.warnings} />
        </div>
      ) : null}
    </Card>
  );
}
