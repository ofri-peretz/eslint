/**
 * VULNERABLE - The worker path is taken straight off the URL bar. A crafted link
 * installs an attacker's worker.
 */
const params = new URLSearchParams(location.search);

navigator.serviceWorker.register(params.get('sw'));
