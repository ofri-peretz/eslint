/**
 * SAFE - A same-origin relative URL inherits the page's scheme, so it cannot
 * choose cleartext. This is the other correct remediation.
 */
export function loadOrders() {
  return fetch('/api/v1/orders');
}
