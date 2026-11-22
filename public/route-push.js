/* eslint-env serviceworker */
const queryIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

self.addEventListener('push', (event) => {
  const id = event.data?.json()?.queryId;
  if (!queryIdPattern.test(id)) return;
  event.waitUntil(
    self.registration.showNotification('Маршруты найдены', {
      body: 'Нажмите, чтобы посмотреть результаты поиска.',
      tag: 'ubas-route-' + id,
      icon: '/favicon.svg',
      data: { queryId: id },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const id = event.notification.data?.queryId;
  if (queryIdPattern.test(id)) {
    event.waitUntil(self.clients.openWindow('/?query=' + encodeURIComponent(id)));
  }
});
