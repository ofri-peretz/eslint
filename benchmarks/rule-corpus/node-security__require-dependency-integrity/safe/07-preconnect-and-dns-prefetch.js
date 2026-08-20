/**
 * SAFE (adversarial) - resource HINTS. `preconnect` and `dns-prefetch` open a
 * connection and resolve a name; they fetch no bytes, so there is nothing for
 * a hash to describe and the SRI spec does not apply to them. There is no
 * remediation a reader could apply to this file, which is what makes a report
 * here a pure false positive - and these two lines are in every performance
 * guide ever written.
 */
export function preconnectHead() {
  return `
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
    <link rel="preconnect" href="https://unpkg.com">
  `;
}
