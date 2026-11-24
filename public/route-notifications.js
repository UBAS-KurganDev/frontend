/* eslint-env serviceworker */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const searchPage = windows.find((client) => new URL(client.url).pathname === '/');
      return searchPage?.focus();
    }),
  );
});
