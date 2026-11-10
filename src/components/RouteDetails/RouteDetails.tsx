import { ExternalLink } from 'lucide-react';
import type { FlightRoute } from '../../types/route';
import { formatMoney } from '../../lib/format';
import { RouteCost, RouteCostBreakdown } from '../RouteCost/RouteCost';
import { WarningList } from '../WarningList/WarningList';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

interface Props {
  route: FlightRoute | null;
  onClose: () => void;
  returnFocus?: HTMLElement | null;
}

function bookingLink(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function RouteDetails({ route, onClose, returnFocus }: Props) {
  if (!route) return null;

  const candidate = route.rankedRoute.route;
  const { tickets, metrics } = candidate;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-h-[85svh] overflow-y-auto sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Детали маршрута</DialogTitle>
          <DialogDescription>
            {tickets.length > 1
              ? 'Маршрут состоит из отдельных билетов. Каждый билет приобретается отдельно.'
              : 'Все перелёты входят в один билет.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {tickets.map((ticket, index) => {
            const url = bookingLink(ticket.booking_url);
            return (
              <Card key={`${ticket.provider}-${ticket.offer_id}`} className="py-0">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">Билет {index + 1}</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {ticket.total_price
                        ? formatMoney(ticket.total_price.amount, ticket.total_price.currency)
                        : 'Стоимость неизвестна'}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ticket.segments
                      .map((segment) => segment.origin.code)
                      .concat(ticket.segments.at(-1)?.destination.code ?? [])
                      .join(' → ')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{ticket.passengers} пасс.</Badge>
                    {ticket.checked_baggage_included != null && (
                      <Badge variant="outline">
                        {ticket.checked_baggage_included ? 'Багаж включён' : 'Багаж не включён'}
                      </Badge>
                    )}
                  </div>
                  {!!ticket.unknown_costs?.length && (
                    <WarningList warnings={ticket.unknown_costs} />
                  )}
                  {url ? (
                    <Button asChild variant="outline" className="w-full">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        Перейти к покупке
                        <ExternalLink className="size-4" aria-hidden="true" />
                      </a>
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ссылка на покупку пока недоступна.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="space-y-3 border-t pt-4">
          {(metrics?.self_transfer ||
            candidate.stopovers?.some((stopover) => stopover.self_transfer)) && (
            <p className="text-sm text-muted-foreground">Самостоятельная пересадка</p>
          )}
          <RouteCostBreakdown route={candidate} />
          <RouteCost route={candidate} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
