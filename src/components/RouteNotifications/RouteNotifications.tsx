import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '../ui/button';

function supportsNotifications() {
  return window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator;
}

export function RouteNotifications({
  searching,
  completedQueryId,
}: {
  searching: boolean;
  completedQueryId: string | null;
}) {
  const [permission, setPermission] = useState<NotificationPermission | null>(() =>
    supportsNotifications() ? Notification.permission : null,
  );
  const [requesting, setRequesting] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const notifiedQueryId = useRef<string | null>(null);

  useEffect(() => {
    if (!supportsNotifications()) return;
    const refreshPermission = () => setPermission(Notification.permission);
    window.addEventListener('focus', refreshPermission);
    return () => window.removeEventListener('focus', refreshPermission);
  }, []);

  useEffect(() => {
    if (permission !== 'granted' || !completedQueryId) return;
    let active = true;

    async function notify(queryId: string) {
      try {
        await navigator.serviceWorker.register('/route-notifications.js');
        const registration = await navigator.serviceWorker.ready;
        if (!active || Notification.permission !== 'granted' || notifiedQueryId.current === queryId)
          return;

        notifiedQueryId.current = queryId;
        await registration.showNotification('Маршруты найдены', {
          body: 'Результаты поиска готовы. Нажмите, чтобы вернуться на сайт.',
          icon: '/favicon.svg',
          tag: `ubas-route-${queryId}`,
        });
      } catch {
        // Notification availability must not affect the completed search.
      }
    }

    void notify(completedQueryId);
    return () => {
      active = false;
    };
  }, [completedQueryId, permission]);

  async function enable() {
    setRequesting(true);
    setRequestFailed(false);
    try {
      setPermission(await Notification.requestPermission());
    } catch {
      setRequestFailed(true);
    } finally {
      setRequesting(false);
    }
  }

  if (!searching || permission === null || permission === 'granted') return null;
  return (
    <section
      aria-label="Уведомления о маршрутах"
      className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-card-foreground"
    >
      <Bell aria-hidden="true" className="size-5 shrink-0" />
      <div className="min-w-48 flex-1">
        <p className="text-sm font-medium">Сообщить, когда найдём маршруты?</p>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {permission === 'denied'
            ? 'Разрешите уведомления в настройках сайта рядом с адресной строкой.'
            : requestFailed
              ? 'Не удалось запросить разрешение. Попробуйте ещё раз.'
              : 'Оставьте вкладку открытой, чтобы получить уведомление.'}
        </p>
      </div>
      {permission === 'default' && (
        <Button type="button" variant="outline" disabled={requesting} onClick={enable}>
          {requesting ? 'Включаем…' : 'Включить'}
        </Button>
      )}
    </section>
  );
}
