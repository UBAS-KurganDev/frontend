import { Fragment } from 'react';
import { ArrowRight, Clock3, Plane, ShieldAlert } from 'lucide-react';
import type { FlightRoute } from '../../types/route';
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

export function RouteCard({ route, onSelect }: Props) {
  const candidate = route.rankedRoute.route;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="space-y-4 p-5 sm:p-6">
        {route.segments.map((segment, index) => {
          const nextSegment = route.segments[index + 1];
          const airportChange = nextSegment && segment.arrivalCode !== nextSegment.departureCode;
          return (
            <Fragment key={`${segment.departureCode}-${segment.departureTime}-${index}`}>
              <div className="grid grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] sm:gap-5">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold tabular-nums sm:text-base">
                    {segment.departureTimeFormatted}
                  </p>
                  <p className="text-xs leading-relaxed break-words text-muted-foreground sm:text-sm">
                    {segment.departureCity} ({segment.departureCode})
                  </p>
                </div>
                <div className="space-y-2 text-center text-muted-foreground">
                  <p className="text-xs tabular-nums">{segment.duration}</p>
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-px flex-1 bg-border" />
                    <Plane className="size-3.5 -rotate-45" />
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </div>
                <div className="min-w-0 space-y-1 text-right">
                  <p className="text-sm font-semibold tabular-nums sm:text-base">
                    {segment.arrivalTimeFormatted}
                  </p>
                  <p className="text-xs leading-relaxed break-words text-muted-foreground sm:text-sm">
                    {segment.arrivalCity} ({segment.arrivalCode})
                  </p>
                </div>
              </div>
              {nextSegment && (
                <div className="space-y-2 rounded-lg bg-muted/70 px-3 py-2.5 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>
                      Пересадка в г.{' '}
                      <strong className="font-medium text-foreground">{segment.arrivalCity}</strong>{' '}
                      —{' '}
                      <span className="font-medium text-foreground">
                        {calculateLayover(segment.arrivalTime, nextSegment.departureTime)}
                      </span>
                    </p>
                  </div>
                  {airportChange && (
                    <Badge variant="outline" className="gap-1.5 whitespace-normal">
                      Смена аэропорта: {segment.arrivalCode}{' '}
                      <ArrowRight className="size-3" aria-hidden="true" />{' '}
                      {nextSegment.departureCode}
                    </Badge>
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
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
