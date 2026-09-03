/**
 * VULNERABLE - `window.open` to a cleartext origin. Not a subresource and not a
 * fetch, so this rule is the only one that sees it.
 */
export function openLegacyConsole() {
  window.open('http://console.acme-corp.io/admin', '_blank');
}
