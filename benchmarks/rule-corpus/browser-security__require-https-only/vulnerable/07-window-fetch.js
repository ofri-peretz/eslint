/**
 * VULNERABLE - `window.fetch` is the same function reached through the global
 * object, which is how polyfilled and instrumented code spells it.
 */
export function track(event) {
  return window.fetch('http://metrics.acme-corp.io/collect', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}
