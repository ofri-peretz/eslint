/** VULNERABLE - a service worker registration whose policy allows eval inside
 *  the worker. worker-src 'unsafe-eval' is the same CWE-95 exposure moved off
 *  the main thread, where it is easier to miss. */
export const swPolicy =
  "default-src 'self'; worker-src 'self' 'unsafe-eval'; script-src 'self'";

navigator.serviceWorker.register('/sw.js', { scope: '/' });
