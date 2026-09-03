/**
 * VULNERABLE (wave 2) - A namespaced key built with a template literal, which
 * is how multi-tenant front ends actually key storage.
 */
export function persist(tenantId, token) {
  localStorage.setItem(`${tenantId}:access_token`, token);
}
