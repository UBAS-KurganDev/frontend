import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { getPushKey, subscribeToQuery } from '../../api/push';
import { Button } from '../ui/button';

function supportsPush() {
  return (
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

async function preparePush() {
  const key = await getPushKey();
  if (!key) return null;
  await navigator.serviceWorker.register('/route-push.js');
  const { pushManager } = await navigator.serviceWorker.ready;
  const subscription =
    Notification.permission === 'granted' ? await pushManager.getSubscription() : null;
  const currentKey = subscription?.options.applicationServerKey;
  const applicationServerKey = Uint8Array.from(
    atob(key.replace(/-/g, '+').replace(/_/g, '/')),
    (char) => char.charCodeAt(0),
  );
  const sameKey =
    currentKey &&
    new Uint8Array(currentKey).length === applicationServerKey.length &&
    new Uint8Array(currentKey).every((value, index) => value === applicationServerKey[index]);
  return { pushManager, applicationServerKey, subscription, sameKey };
}

type Setup = NonNullable<Awaited<ReturnType<typeof preparePush>>>;
type State = 'checking' | 'offer' | 'busy' | 'blocked' | 'error' | 'hidden';

export function RouteNotifications({
  queryId,
  searching,
}: {
  queryId: string | null;
  searching: boolean;
}) {
  const [state, setState] = useState<State>('checking');
  const [message, setMessage] = useState('');
  const setup = useRef<Setup | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!supportsPush()) return;
    let active = true;
    async function check() {
      try {
        const prepared = await preparePush();
        if (!active) return;
        setup.current = prepared;
        if (!prepared) {
          setState('hidden');
          return;
        }
        if (Notification.permission === 'granted' && prepared.subscription && prepared.sameKey) {
          setSubscription(prepared.subscription);
        } else {
          setState(Notification.permission === 'denied' ? 'blocked' : 'offer');
        }
      } catch {
        if (active) setState('error');
      }
    }
    void check();
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!queryId || !subscription) return;
    const controller = new AbortController();
    subscribeToQuery(queryId, subscription, controller.signal).then(
      () => {
        if (!controller.signal.aborted) setState('hidden');
      },
      () => {
        if (controller.signal.aborted) return;
        setSubscription(null);
        setState('error');
      },
    );
    return () => controller.abort();
  }, [queryId, subscription]);

  useEffect(() => {
    if (state !== 'blocked') return;
    const checkPermission = () => {
      if (Notification.permission !== 'denied') setRefresh((value) => value + 1);
    };
    window.addEventListener('focus', checkPermission);
    return () => window.removeEventListener('focus', checkPermission);
  }, [state]);

  async function enable() {
    setMessage('');
    if (Notification.permission === 'denied') {
      setState('blocked');
      setMessage(
        'Разрешите уведомления в настройках сайта рядом с адресной строкой, затем вернитесь к поиску.',
      );
      return;
    }
    setState('busy');
    try {
      const permission =
        Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'offer');
        setMessage(
          permission === 'denied'
            ? 'Разрешение можно изменить в настройках сайта рядом с адресной строкой.'
            : 'Чтобы получить уведомление, разрешите его в браузере.',
        );
        return;
      }
      const prepared = setup.current ?? (await preparePush());
      if (!prepared) {
        setState('hidden');
        return;
      }
      setup.current = prepared;
      const { pushManager, applicationServerKey, subscription, sameKey } = prepared;
      if (subscription && !sameKey) await subscription.unsubscribe();
      const current =
        sameKey && subscription
          ? subscription
          : await pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      setup.current = { ...prepared, subscription: current, sameKey: true };
      setSubscription(current);
    } catch {
      setState('error');
    }
  }

  if (!searching || state === 'checking' || state === 'hidden') return null;
  return (
    <section
      aria-label="Уведомления о маршрутах"
      className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-card-foreground"
    >
      <Bell aria-hidden="true" className="size-5 shrink-0" />
      <div className="min-w-48 flex-1">
        <p className="text-sm font-medium">Сообщить, когда найдём маршруты?</p>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {state === 'error'
            ? 'Не удалось подключить уведомления. Попробуйте ещё раз.'
            : message ||
              (state === 'blocked'
                ? 'Браузер блокирует уведомления для этого сайта.'
                : 'Уведомление придёт, даже если закрыть вкладку.')}
        </p>
      </div>
      <Button type="button" variant="outline" disabled={state === 'busy'} onClick={enable}>
        {state === 'busy' ? 'Включаем…' : 'Включить'}
      </Button>
    </section>
  );
}
