/**
 * SAFE - Optional chaining and a computed read on the way to an HTTPS URL. The
 * shape is the awkward one; the scheme is correct.
 */
export function loadRegion(config, key) {
  return fetch(config?.endpoints?.[key] ?? 'https://api.acme-corp.io/v1/default');
}
