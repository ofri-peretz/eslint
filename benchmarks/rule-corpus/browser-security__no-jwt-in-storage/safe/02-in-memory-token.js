/**
 * SAFE - The token lives in a module-scoped variable for the lifetime of the
 * tab. Nothing is persisted, so nothing survives for an XSS to read later.
 */
let accessToken = null;

export function setAccessToken(next) {
  accessToken = next;
}

export function authHeader() {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}
