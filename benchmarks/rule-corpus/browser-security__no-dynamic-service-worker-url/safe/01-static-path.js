/**
 * SAFE - The correct remediation: a hardcoded, same-origin path.
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}
