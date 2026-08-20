/**
 * VULNERABLE - A precache manifest that includes an authenticated endpoint. The
 * response is written to disk and served to whoever opens the browser next.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('app-v1').then((cache) =>
      cache.addAll(['/shell.html', '/app.js', '/api/me/ssn']),
    ),
  );
});
