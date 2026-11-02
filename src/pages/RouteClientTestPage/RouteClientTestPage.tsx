import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  createRoute,
  getRouteStatus,
  getRouteResult,
  waitForRouteResult,
  type RouteRequest,
  type QueryStatus,
  type QueryResult,
  type GetQueryResponse,
} from '../../api/route';
import { getApiErrorMessage as getErrorMessage } from '../../api/errors';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { DatePicker } from '../../components/DatePicker/DatePicker';

const initialRequest: RouteRequest = {
  origin: 'MOW',
  destination: 'TYO',
  date_from: format(new Date(), 'yyyy-MM-dd'),
  date_to: format(new Date(), 'yyyy-MM-dd'),
  citizenship: 'RU',
  passengers: 1,
  currency: 'RUB',
  budget: null,
  limit: 10,
  excluded_cities: [],
  checked_baggage_required: false,
};

const statusLabels: Record<QueryStatus, string> = {
  queued: 'В очереди',
  running: 'Выполняется',
  completed: 'Завершено',
  failed: 'Ошибка выполнения',
};

export default function RouteClientTestPage() {
  const [request, setRequest] = useState<RouteRequest>(initialRequest);

  const [queryId, setQueryId] = useState('');
  const [queryState, setQueryState] = useState<GetQueryResponse | null>(null);
  const status = queryState?.status ?? null;
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoPoll, setAutoPoll] = useState(false);
  const [pollInterval, setPollInterval] = useState(2000);

  function clearError() {
    setError(null);
  }

  async function handleCreate() {
    setLoading(true);
    clearError();
    setQueryId('');
    setQueryState(null);
    setResult(null);
    setAutoPoll(false);

    try {
      const response = await createRoute(request);
      setQueryId(response.query_id);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckStatus() {
    if (!queryId) return;

    setLoading(true);
    clearError();

    try {
      const response = await getRouteStatus(queryId);
      setQueryState(response);

      if (response.status === 'completed' || response.status === 'failed') {
        setAutoPoll(false);
      }
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGetResult() {
    if (!queryId) return;

    setLoading(true);
    clearError();

    try {
      const response = await getRouteResult(queryId);
      setResult(response);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoPoll || !queryId) return;
    const controller = new AbortController();
    const { signal } = controller;

    void waitForRouteResult(queryId, {
      signal,
      pollInterval,
      onStatus: setQueryState,
    })
      .then((response) => {
        if (!signal.aborted) {
          setResult(response);
          setAutoPoll(false);
        }
      })
      .catch((error: unknown) => {
        if (!signal.aborted) {
          setError(getErrorMessage(error));
          setAutoPoll(false);
        }
      });

    return () => controller.abort();
  }, [autoPoll, queryId, pollInterval]);

  function updateField<K extends keyof RouteRequest>(key: K, value: RouteRequest[K]) {
    setRequest((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-2">
        <Badge variant="secondary">Инструменты разработчика</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Тест API клиента маршрутов</h1>
        <p className="text-sm text-muted-foreground">
          Создание задачи, проверка статуса и просмотр ответа сервера.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Параметры запроса</CardTitle>
          <CardDescription>Для направлений указываются коды городов.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="api-origin">Откуда</Label>
                <Input
                  id="api-origin"
                  value={request.origin}
                  onChange={(event) => updateField('origin', event.target.value.toUpperCase())}
                  placeholder="MOW"
                  maxLength={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-destination">Куда</Label>
                <Input
                  id="api-destination"
                  value={request.destination}
                  onChange={(event) => updateField('destination', event.target.value.toUpperCase())}
                  placeholder="TYO"
                  maxLength={3}
                  required
                />
              </div>
              <DatePicker
                label="Дата начала"
                value={request.date_from}
                onChange={(value) => updateField('date_from', value)}
              />
              <DatePicker
                label="Дата окончания"
                value={request.date_to}
                minDate={request.date_from}
                onChange={(value) => updateField('date_to', value)}
              />
              <div className="space-y-2">
                <Label htmlFor="api-citizenship">Гражданство</Label>
                <Input
                  id="api-citizenship"
                  value={request.citizenship ?? 'RU'}
                  maxLength={2}
                  onChange={(event) => updateField('citizenship', event.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-passengers">Пассажиры</Label>
                <Input
                  id="api-passengers"
                  type="number"
                  min={1}
                  max={9}
                  value={request.passengers ?? 1}
                  onChange={(event) => updateField('passengers', Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-currency">Валюта</Label>
                <Input
                  id="api-currency"
                  value={request.currency ?? 'RUB'}
                  maxLength={3}
                  onChange={(event) => updateField('currency', event.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-budget">Бюджет</Label>
                <Input
                  id="api-budget"
                  type="number"
                  min="0.01"
                  step="any"
                  value={request.budget ?? ''}
                  onChange={(event) =>
                    updateField('budget', event.target.value === '' ? null : event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-limit">Лимит результатов</Label>
                <Input
                  id="api-limit"
                  type="number"
                  min={1}
                  max={50}
                  value={request.limit ?? 10}
                  onChange={(event) => updateField('limit', Number(event.target.value))}
                />
              </div>
              <div className="flex items-center gap-2 self-end pb-2">
                <Checkbox
                  id="api-baggage"
                  checked={request.checked_baggage_required ?? false}
                  onCheckedChange={(checked) =>
                    updateField('checked_baggage_required', checked === true)
                  }
                />
                <Label htmlFor="api-baggage">Требуется багаж</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-excluded">Исключённые города</Label>
              <Input
                id="api-excluded"
                value={(request.excluded_cities ?? []).join(', ')}
                onChange={(event) =>
                  updateField(
                    'excluded_cities',
                    event.target.value
                      .split(',')
                      .map((city) => city.trim().toUpperCase())
                      .filter(Boolean),
                  )
                }
                placeholder="Например, DXB, IST"
              />
              <p className="text-xs text-muted-foreground">Коды городов через запятую</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Выполняется...' : 'Создать запрос'}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    JSON запроса
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>JSON запроса</DialogTitle>
                    <DialogDescription>Параметры, отправляемые в API.</DialogDescription>
                  </DialogHeader>
                  <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
                    {JSON.stringify(request, null, 2)}
                  </pre>
                </DialogContent>
              </Dialog>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Состояние задачи</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="api-query-id">Query ID</Label>
            <Input
              id="api-query-id"
              value={queryId}
              onChange={(event) => setQueryId(event.target.value)}
              placeholder="Появится после создания запроса"
            />
          </div>
          {status && <Badge variant="secondary">{statusLabels[status]}</Badge>}
          {queryState?.failure && (
            <Alert variant="destructive">
              <AlertDescription>{queryState.failure.message}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading || !queryId.trim() || autoPoll}
              onClick={handleCheckStatus}
            >
              Проверить статус
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading || !queryId.trim() || status === 'failed'}
              onClick={handleGetResult}
            >
              Получить результат
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="api-autopoll"
              checked={autoPoll}
              disabled={!queryId.trim() || status === 'completed' || status === 'failed'}
              onCheckedChange={(checked) => setAutoPoll(checked === true)}
            />
            <Label htmlFor="api-autopoll">Автоматически проверять статус</Label>
          </div>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="api-interval">Интервал проверки</Label>
            <Select
              value={String(pollInterval)}
              onValueChange={(value) => setPollInterval(Number(value))}
            >
              <SelectTrigger id="api-interval" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1000, 2000, 5000, 10000].map((interval) => (
                  <SelectItem key={interval} value={String(interval)}>
                    {interval / 1000} сек.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Ошибка API</AlertTitle>
          <AlertDescription className="space-y-3">
            <pre className="overflow-auto whitespace-pre-wrap text-sm">{error}</pre>
            <Button type="button" variant="outline" onClick={clearError}>
              Скрыть ошибку
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Результат API</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[600px] overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
