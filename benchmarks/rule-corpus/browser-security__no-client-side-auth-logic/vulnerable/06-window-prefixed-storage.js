/**
 * VULNERABLE - `window.localStorage` is `localStorage`. Every lint rule about
 * implicit globals asks you to write it this way.
 */
if (window.localStorage.getItem('isAdmin')) {
  enableDangerZone();
}
