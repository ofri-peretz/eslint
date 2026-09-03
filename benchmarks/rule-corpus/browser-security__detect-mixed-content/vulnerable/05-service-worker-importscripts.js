/**
 * VULNERABLE - A service worker pulling its own helper over cleartext. Worse
 * than a page subresource: the fetched code runs with the worker's scope over
 * every request the site makes.
 */
importScripts('http://cdn.acme-corp.io/workbox/workbox-sw.js');

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request));
});
