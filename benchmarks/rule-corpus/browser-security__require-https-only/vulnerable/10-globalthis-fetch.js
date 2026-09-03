/**
 * VULNERABLE - ADVERSARIAL. `globalThis.fetch` is the standard spelling and the
 * one instrumented / polyfilled code uses. Same function, same cleartext request.
 */
export function collect(payload) {
  return globalThis.fetch('http://metrics.acme-corp.io/collect', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
