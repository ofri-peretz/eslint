/**
 * VULNERABLE - The worker path comes from a config endpoint. Whoever controls
 * that response controls a script that outlives the tab and intercepts every
 * request on the origin.
 */
export async function boot() {
  const config = await (await fetch('/api/config')).json();
  await navigator.serviceWorker.register(config.swUrl);
}
