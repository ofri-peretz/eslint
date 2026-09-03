/**
 * VULNERABLE - A per-tenant worker path built by interpolation. The tenant slug
 * is user-supplied, so the path escapes the intended directory.
 */
export function registerForTenant(tenant) {
  return navigator.serviceWorker.register(`/workers/${tenant}/sw.js`);
}
