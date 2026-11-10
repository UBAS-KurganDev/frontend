import type { RouteCandidate } from '../../api/models';
import { formatMoney } from '../../lib/format';
import { WarningList } from '../WarningList/WarningList';

export function RouteCost({ route }: { route: RouteCandidate }) {
  const unknownCosts = [
    ...new Set([
      ...(route.unknown_costs ?? []),
      ...route.tickets.flatMap((ticket) => ticket.unknown_costs ?? []),
      ...(route.costs ?? []).flatMap((cost) => (cost.unknown_reason ? [cost.unknown_reason] : [])),
    ]),
  ];
  const complete =
    route.full_cost_known !== false &&
    unknownCosts.length === 0 &&
    route.tickets.every((ticket) => ticket.total_price !== null) &&
    (route.costs ?? []).every((cost) => cost.rub_amount != null);

  return (
    <div className="space-y-1">
      {!complete && <p className="text-sm font-medium">Полная стоимость неизвестна</p>}
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {!complete && <span className="text-sm font-normal">Известная часть: </span>}
        {formatMoney(route.total_cost.amount, route.total_cost.currency)}
      </p>
      {unknownCosts.length > 0 && <WarningList warnings={unknownCosts} />}
    </div>
  );
}

export function RouteCostBreakdown({ route }: { route: RouteCandidate }) {
  if (route.costs?.length) {
    return (
      <ul className="space-y-1 text-xs text-muted-foreground">
        {route.costs.map((cost) => (
          <li key={cost.key}>
            {cost.kind === 'ticket' ? 'Билет' : 'Виза'}:{' '}
            {cost.rub_amount != null ? formatMoney(cost.rub_amount, 'RUB') : 'Стоимость неизвестна'}
            {cost.rub_amount == null && cost.original && (
              <> (исходная цена: {formatMoney(cost.original.amount, cost.original.currency)})</>
            )}
          </li>
        ))}
      </ul>
    );
  }

  // Legacy aggregates do not describe which part is missing for an incomplete price.
  const ticketsKnown = route.tickets.every((ticket) => ticket.total_price != null);
  const complete =
    route.full_cost_known !== false &&
    !route.unknown_costs?.length &&
    route.tickets.every((ticket) => !ticket.unknown_costs?.length) &&
    ticketsKnown;
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {complete ? (
        <>
          Билеты: {formatMoney(route.ticket_cost.amount, route.ticket_cost.currency)}
          {' · '}Виза: {formatMoney(route.visa_cost.amount, route.visa_cost.currency)}
        </>
      ) : (
        'Стоимость отдельных составляющих уточняется.'
      )}
    </p>
  );
}
